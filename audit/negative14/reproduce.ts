import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.env.VELHO_DB="audit/negative14/isolated-"+Date.now()+".db";
process.env.VELHO_AUDIT_ID="negative-offline-"+Date.now();
process.env.OPENROUTER_API_KEY=process.env.FASTINO_API_KEY="offline-not-a-key";
process.env.MODEL_FAST=process.env.MODEL_WRITE="anthropic/claude-haiku-5.5";
const {POST:leadPost,GET:leadGet}=await import("../../app/api/lead/route");
const {db,cacheSet}=await import("../../lib/db");
const {runSeed}=await import("../../lib/seeds");
const {talkInsights}=await import("../../lib/talks");
const {buildProof,searchProof}=await import("../../lib/proof");
const {scopeGaps}=await import("../../lib/staff-input");
const {readiness}=await import("../../lib/quiz");
const results:Record<string,unknown>[]=[];
function record(id:string,description:string,evidence:unknown){results.push({id,description,evidence});writeFileSync("audit/negative14/reproduced.json",JSON.stringify({at:new Date().toISOString(),mode:"controlled provider failures/replies; no live inference; isolated DB",results},null,2));console.log("REPRODUCED",id,description);}
const source="Our balcony glazing has fully retractable panels that protect a balcony from rain and wind.";
const proof=buildProof("Fictional",[{url:"https://example.test/products",text:source}]);
const matches=searchProof(proof,"glazing not balcony");assert(matches.length);record("N01","Keyword evidence retrieval does not enforce an explicit exclusion",{query:"glazing not balcony",returned:matches[0].excerpt});

let mode="outage";let asked:string[]=[];
const paragraph="Host Other Person: Close all offices next year. CEO Aino Example: I disagree. "+"This fictional transcript contains multiple speakers and their different views. ".repeat(8);
globalThis.fetch=async(input,init)=>{
 const url=String(input),body=JSON.parse(String(init?.body||"{}"));
 if(url.includes("r.jina.ai"))return new Response(paragraph);
 if(url.includes("fastino.ai")&&body.questions){asked.push(...Object.values(body.questions).map(v=>(v as {instructions:string}).instructions));return Response.json({usage:{input_tokens:10},answers:Object.fromEntries(Object.entries(body.questions).map(([k,v])=>[k,{noul:(v as {instructions:string}).instructions.includes("480")?0.01:0.99}]))});}
 if(url.includes("fastino.ai")){const phrase="Close all offices next year",start=paragraph.indexOf(phrase);return Response.json({usage:{input_tokens:10},choices:[{message:{content:JSON.stringify({entities:{priority:[{text:phrase,start,end:start+phrase.length,confidence:0.99}]}})}}]});}
 if(mode==="outage")return Response.json({error:{message:"Controlled writing-provider outage"},usage:{cost:0}},{status:503});
 const content=mode==="note"||mode==="draft"?{title:"Fictional source review",blocks:[{t:mode,text:"Measured savings were 480 hours per week.",...(mode==="draft"?{label:"Post"}:{})},{t:"p",text:"Baseline was 12 hours/week and pilot result 8 hours/week."}]}:mode==="talk"?{talks:[{title:"Old multi-speaker interview",url:"https://example.test/transcript",speaker:"Aino Example, CEO",date:"2010-01-01",kind:"interview"}]}:{headline:"Fictional result",ideas:[1,2,3].map(n=>({title:"Idea "+n,how:"Inspect a fictional sample",hoursBack:"unknown"})),firstStep:"Inspect approved samples",meetingDraft:"Unsent fictional draft"};
 return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify(content)}}]});
};
const lead={talk:"negative-capture",name:"Fictional visitor",company:"Fictional",email:"fictional@example.test",answers:[0,1,0,2,0,1],consent:true};
const request=()=>new Request("http://localhost/api/lead",{method:"POST",headers:{"Idempotency-Key":crypto.randomUUID()},body:JSON.stringify(lead)});
const fail=await leadPost(request());assert.equal(fail.status,500);const lost=(db.prepare("SELECT count(*) AS n FROM leads WHERE talk=?").get(lead.talk) as {n:number}).n;assert.equal(lost,0);record("N02","Writing-provider failure loses the visitor's submitted lead before persistence",{status:fail.status,savedLeads:lost});
mode="success";assert.equal((await leadPost(request())).status,200);assert.equal((await leadPost(request())).status,200);const repeat=(db.prepare("SELECT count(*) AS n FROM leads WHERE talk=?").get(lead.talk) as {n:number}).n;assert.equal(repeat,2);record("N03","Same visitor submitted twice with distinct browser request IDs creates separate ungrouped leads",{identicalContactRecords:repeat});
for(let i=0;i<201;i++)db.prepare("INSERT INTO leads(talk,name,company,role,email,answers,result,created) VALUES(?,?,?,?,?,?,?,?)").run("negative-large","Fictional "+i,"Fictional","COO","fictional@example.test","[]","{}",i);
const get=async(q:string)=>(await leadGet(new Request("http://localhost/api/lead?talk=negative-large"+q))).json();
const page=await get(""),next=await get("&offset=200&cursor=1");assert.equal(page.total,201);assert.equal(page.leads.length,200);assert.deepEqual(page.leads.map((l:{id:number})=>l.id),next.leads.map((l:{id:number})=>l.id));record("N04","Lead window reports older records but supplies no working pagination",{total:page.total,returned:page.leads.length,offsetHasEffect:false});

const staff={kind:"synthetic",company:"Fictional Case",notes:"Fictional approved test: measured baseline 12 hours/week, after pilot 8 hours/week. No other savings measured.",owner:"",dataAccess:"",constraints:"",success:"",contact:"",lastContact:"",objection:"",approved:true};
mode="note";asked=[];const note=await runSeed("caseStudy",{staffInput:JSON.stringify(staff),fresh:"1"});assert(note.blocks.some(b=>b.t==="note"&&b.text.includes("480")));assert(!asked.some(q=>q.includes("480")));record("N05","Unsupported numeric result in a note block bypasses source checking",{surviving:note.blocks.find(b=>b.t==="note"&&b.text.includes("480")),checked:false,review:note.reviewNotice});
mode="draft";asked=[];const draft=await runSeed("caseStudy",{staffInput:JSON.stringify(staff),fresh:"1"});assert(!draft.blocks.some(b=>b.t==="draft"&&b.text.includes("480")));record("C01","Control: identical false result in a draft IS checked and withheld",{withheld:true,checked:asked.some(q=>q.includes("480"))});

function dossier(name:string,signals:unknown[],changes:unknown[]=[]){cacheSet("dossier:"+name.toLowerCase(),{query:name,name,oneLiner:"Fictional company",leadership:[],signals,goals:[],manualWorkClues:[],tenders:[],siteText:"",builtAt:new Date().toISOString(),tenderMatchVersion:2,registry:{name,businessId:"fictional",changes}});}
const tomorrow=new Date(Date.now()+864e5).toISOString().slice(0,10),today=new Date().toISOString().slice(0,10);
dossier("FutureOnly",[{text:"Confirmed public results presentation tomorrow",date:tomorrow,url:"https://example.test/invitation",type:"results"}]);const future=await runSeed("signals",{company:"FutureOnly",fresh:"1"});assert(!future.blocks.some(b=>b.t==="draft"));record("N06","Upcoming dated results event is excluded from timely signals",{eventDate:tomorrow,status:future.publicEvidence?.[0].status,note:future.publicEvidence?.[0].note});
dossier("CappedSignals",Array.from({length:8},(_,i)=>({text:"Old item "+i,date:"2020-01-01",url:"https://example.test/old"+i,type:"news"})),[{text:"New current register change",date:today,url:"https://example.test/register"}]);const capped=await runSeed("signals",{company:"CappedSignals",fresh:"1"});assert.equal(capped.publicEvidence?.length,8);assert(!capped.publicEvidence?.some(e=>e.url.includes("register")));record("N07","Eight weak news candidates crowd out a current register change before evaluation",{evaluated:capped.publicEvidence?.length,registerEvaluated:false});
mode="talk";const talks=await talkInsights({name:"Fictional Corp",leadership:[{name:"Aino Example",role:"CEO"}]} as Parameters<typeof talkInsights>[0]);assert.equal(talks[0].date,"2010-01-01");assert.equal(talks[0].speaker,"Aino Example, CEO");assert.equal(talks[0].spans[0].text,"Close all offices next year");record("N08","Talk mining retains out-of-window interview and assigns host's exact span to searched CEO",{date:talks[0].date,labelledSpeaker:talks[0].speaker,actualSource:paragraph.slice(0,76),span:talks[0].spans[0]});
const unknown=scopeGaps({...staff,owner:"Unknown",dataAccess:"Unknown",constraints:"Unknown",success:"Unknown"} as Parameters<typeof scopeGaps>[0]);assert.equal(unknown.length,0);record("N09","Unknown text satisfies every required scoping field",{missingFieldsReported:unknown});
record("N10","Opportunity indicator ignores the optional actual workload and constraints",{sameAnswers:lead.answers,score:readiness(lead.answers),zeroHourOrManyHourContext:"No context argument exists in readiness(); both produce the same indicator"});
console.log("Controlled audit complete; product source was not modified and no live provider was called.");
