import {readUrl} from "./llm";
import {checkClaims} from "./fastino";
export type PublicEvidence={subject:string;claim:string;url:string;date:string;quote?:string;attribution?:string;status:"supported"|"unsupported"|"review"|"unavailable";excerpt:string;note:string};
export function sourceWindow(text:string,needle:string,max=10000):string{
 const terms=needle.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[];
 const paragraphs=text.split(/\n\s*\n/),ranked=paragraphs.map((s,i)=>({i,score:terms.reduce((n,t)=>n+(s.toLocaleLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score),picked=new Set<number>();let length=0;
 for(const p of ranked)for(const i of [p.i-1,p.i,p.i+1])if(i>=0&&i<paragraphs.length&&!picked.has(i)&&length+paragraphs[i].length+2<=max){picked.add(i);length+=paragraphs[i].length+2;}
 return [...picked].sort((a,b)=>a-b).map(i=>paragraphs[i]).join("\n\n")||text.slice(0,max);
}
export function validDay(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function inDateWindow(day:string,from:number,to:number){return validDay(day)&&Date.parse(day)>=from&&Date.parse(day)<=to;}
export function appearanceLabel(kind:string,attendance:string){return kind==="industry"?"Industry event — target attendance NOT confirmed":/not confirmed|unconfirmed|unknown|not identified|not specified|not announced|will not attend|not attending/i.test(attendance)?"Company event — individual target attendance NOT confirmed":"Source-supported target appearance: "+attendance;}
const quoteText=(s:string)=>s.normalize("NFKC").replace(/\s+/g," ").trim();
export async function verifyPublicEvidence(input:Omit<PublicEvidence,"status"|"excerpt"|"note">):Promise<PublicEvidence>{
 const row:PublicEvidence={...input,status:"unavailable",excerpt:"",note:"Original source could not be read or checked."};
 try{
  if(!/^https?:\/\//.test(input.url)||input.claim.length>1500)return row;
  const page=await readUrl(input.url,180000);if(!page)return row;
  row.excerpt=sourceWindow(page,input.quote||input.claim);
  if(input.quote&&!quoteText(page).includes(quoteText(input.quote))){row.status="unsupported";row.note="The original-language quote could not be text-matched in the source.";return row;}
  const statement=`${input.subject}: ${input.claim}${input.date?". Date: "+input.date:""}${input.attribution?". Speaker attribution: "+input.attribution:""}`;
  if(statement.length>1000){row.status="review";row.note="Claim exceeds the bounded source-check length; it was not silently truncated.";return row;}
  const result=(await checkClaims(row.excerpt,[statement]))[0];row.status=result.verdict;row.note=`Machine check of entity, claim, date${input.attribution?" and speaker":""}; review the original source. It does not verify source truth.`;
  return row;
 }catch{return row;}
}
