import {cacheGet,cacheSet} from "@/lib/db";
import {llmJson,readUrl} from "@/lib/llm";
import {checkClaim,extractEvidence} from "@/lib/fastino";
import {textInput,webUrl} from "@/lib/validation";
import {industrySourceWindow,evidencePeriod,currentEvidencePeriod,type IndustryIndex,type IndustryExample} from "@/lib/industry";
import {prh} from "@/lib/dossier";
export const maxDuration=300;
export async function POST(req:Request){
 try{
  const input=await req.json(),industry=textInput(input.industry,"Industry",120),key="aiindex:quality-v3:"+industry.toLocaleLowerCase();
  const hit=cacheGet<IndustryIndex>(key);if(hit&&!input.fresh)return Response.json(hit);
  const legacy=cacheGet<IndustryIndex>("aiindex:"+industry.toLocaleLowerCase());
  if(legacy&&!legacy.examples.length&&!input.fresh)return Response.json({...legacy,score:null,summary:"No documented examples in this saved search. AI adoption is unknown, not zero.",coverage:{candidates:0,readable:0,supported:0}});
  const prior=cacheGet<IndustryIndex>("aiindex:quality-v1:"+industry.toLocaleLowerCase());
  const research=prior&&!input.fresh?{examples:prior.examples,tol:prior.tol}:await llmJson<{examples:IndustryExample[];tol?:string}>({purpose:"industry:research",model:"fast",web:8,maxTokens:7000,messages:[
   {role:"system",content:"Research Finnish company examples using web search. Cite specific original pages, not search pages or generic homepages. Return valid JSON only. Do not estimate national adoption or invent company problems."},
   {role:"user",content:`Industry: ${industry}. Today: ${new Date().toISOString().slice(0,10)}. Find up to FOUR different Finnish companies with public, dated evidence of AI or automation already used in this industry in the last 18 months. A plan, AI job ad or vendor product offering alone is not evidence of adoption. Prefer company announcements or attributed project case studies. Include an empty list if none found. Shape: {"examples":[{"company":"Full company name","what":"A short factual claim of actual use","url":"https://specific-original-page","date":"YYYY-MM-DD if explicitly known"}],"tol":"two-digit TOL 2008 industry division if known"}.`} ]});
  if(!Array.isArray(research.examples)||research.examples.length>4)throw new Error("Industry research was incomplete. Please retry.");
  const seen=new Set<string>();
  const examples=research.examples.filter(e=>{
   if(!e||typeof e.company!=="string"||!e.company.trim()||e.company.length>200||typeof e.what!=="string"||!e.what.trim()||e.what.length>700||!webUrl(e.url))throw new Error("Industry research contained an invalid source.");
   if(typeof e.date!=="string"||!evidencePeriod(e.date))e.date=undefined;
   const k=e.company.toLocaleLowerCase().trim();if(seen.has(k))return false;seen.add(k);return true;
  }).map(e=>({company:e.company,what:e.what,url:webUrl(e.url)!,date:e.date}));
  let readable=0;
  const checked=await Promise.all(examples.map(async(e):Promise<IndustryExample>=>{
   const period=e.date?evidencePeriod(e.date):null;
   if(period&&(period.start>Date.now()||period.end<Date.now()-548*864e5))return {...e,status:"unsupported",checkNote:"The research-supplied date is outside the requested last-18-month window. Do not use this as a current example."};
   const page=await readUrl(e.url,160000),source=industrySourceWindow(page,e.company);
   if(!source)return {...e,status:"unavailable",checkNote:"No readable AI/automation evidence window found. Open the original before using this example."};
   readable++;
   try{
    const identity=await prh(e.company.replace(/\b(oyj|oy|abp|ab|ltd|plc|inc)\b/gi,"").trim()).catch(()=>undefined);
    const registered=identity?{name:identity.name,businessId:identity.businessId,url:`https://tietopalvelu.ytj.fi/yritys/${identity.businessId}`}:undefined;
    if(!e.date){const dates=(await extractEvidence(source)).filter(x=>x.label==="date"&&currentEvidencePeriod(x.text)).sort((a,b)=>evidencePeriod(b.text)!.end-evidencePeriod(a.text)!.end);if(dates[0])e.date=dates[0].text;}
    const context=(registered?`FINNISH TRADE REGISTER: ${registered.name}, business ID ${registered.businessId}, matched to research name ${e.company}; ${registered.url}\n\nORIGINAL CASE PASSAGE:\n`:"")+source;
    const decision=await checkClaim(context.slice(0,6000),`${registered?.name||e.company} is a Finnish company with documented completed AI/automation work or a completed pilot in ${industry}: ${e.what}.${e.date?` The evidence is dated ${e.date}.`:""} This is completed work or testing, not only a future plan, hiring advertisement or untested product offering.`);
    const current=e.date&&currentEvidencePeriod(e.date);
    return {...e,company:registered?.name||e.company,identity:registered,supportProbability:decision.probability,status:decision.verdict==="supported"&&!current?"review":decision.verdict,sourceExcerpt:source,checkNote:current?"GLiDE checked original passage, date/period and register context when available. Inspect the matched identity and full original before use. Completed pilots are examples, not proof of production rollout.":"A sufficiently recent date/period was not established; this remains for review even if the use claim is supported."};
   }catch{return {...e,status:"review",sourceExcerpt:source,checkNote:"Automated support check unavailable. Do not treat this as a verified adoption example."};}
  }));
  const supported=checked.filter(e=>e.status==="supported").length;
  const result:IndustryIndex={industry,score:null,asOf:new Date().toISOString().slice(0,10),examples:checked,laggingSignals:[],coverage:{candidates:checked.length,readable,supported},summary:`${supported} of ${checked.length} candidate examples machine-supported in readable sources. This is a discovery index, not a national adoption survey; missing evidence means unknown.`};
  const tol=typeof research.tol==="string"&&/^\d{2}$/.test(research.tol.trim())?research.tol.trim():undefined;
  if(tol){
   result.tol=tol;const base="https://avoindata.prh.fi/opendata-ytj-api/v3/companies?mainBusinessLine="+tol;
   const count=async(url:string)=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)return null;const j=await r.json();return Number.isSafeInteger(j.totalResults)&&j.totalResults>=0?j.totalResults:null;}catch{return null;}};
   const [companies,newLast12m]=await Promise.all([count(base),count(base+"&registrationDateStart="+new Date(Date.now()-365*864e5).toISOString().slice(0,10))]);
   if(companies!==null&&newLast12m!==null)result.registry={companies,newLast12m,url:base};
  }
  cacheSet(key,result);return Response.json(result);
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
