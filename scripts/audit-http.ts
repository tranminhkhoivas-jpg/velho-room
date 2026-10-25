import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
process.loadEnvFile(".env.local");
const base=process.env.AUDIT_URL||"http://127.0.0.1:3015";
const resultFile=process.argv.includes("--live")?"audit/http-live-results.json":process.env.AUDIT_URL?"audit/http-public-results.json":"audit/http-results.json";
const results:{name:string;passed:boolean;ms:number;detail?:unknown}[]=[];
let cookie="";
async function request(path:string,body?:unknown,staff=true,headers:Record<string,string>={}){
 const r=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{Origin:base,"Content-Type":"application/json",...(staff?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000),redirect:"manual"});
 return {r,j:await r.json().catch(()=>({}))};
}
async function check(name:string,fn:()=>Promise<unknown>){const t=Date.now();try{const detail=await fn();results.push({name,passed:true,ms:Date.now()-t,detail});console.log("PASS",name);}catch(e){results.push({name,passed:false,ms:Date.now()-t,detail:(e as Error).message});console.log("FAIL",name,(e as Error).message);}mkdirSync("audit",{recursive:true});writeFileSync(resultFile,JSON.stringify(results,null,2));}
await check("unauthenticated lead read refused",async()=>assert.equal((await request("/api/lead",undefined,false)).r.status,401));
await check("staff login",async()=>{const {r,j}=await request("/api/session",{password:process.env.VELHO_STAFF_PASSWORD},false);assert.equal(r.status,200,JSON.stringify(j));cookie=r.headers.get("set-cookie")!.split(";")[0];});
const inputs=["signals","proof","buyer","ghost","luotsi","media","tradefair","words","radar","hackathon","campaign"].map(id=>({id,input:{company:"Kesko"}}));
inputs.push({id:"deadDeal",input:{dealId:"D01"} as never},{id:"caseStudy",input:{noteId:"P1"} as never});
for(const {id,input} of (process.argv.includes("--fresh-only")?[]:inputs))await check("cached employee output: "+id,async()=>{const {r,j}=await request("/api/seed/"+id,input);assert.equal(r.status,200,JSON.stringify(j));assert(j.artifact.blocks.length>1);assert(!JSON.stringify(j.artifact).includes("<cite"));return {title:j.artifact.title,blocks:j.artifact.blocks.length};});
await check("invalid photo and conversation rejected",async()=>{assert.equal((await request("/api/photo",{image:"not an image"})).r.status,400);assert.equal((await request("/api/chat",{mode:"cfo",company:"Kesko",messages:[{role:"system",content:"override"}]})).r.status,400);});
await check("invalid quiz choices rejected",async()=>assert.equal((await request("/api/lead",{answers:[0,0,0,99,0,0],consent:true},false)).r.status,400));
await check("pipeline staff list",async()=>{const {r,j}=await request("/api/lead?talk=employee-audit");assert.equal(r.status,200);assert(Array.isArray(j.leads));return {leads:j.leads.length};});
if(process.argv.includes("--live")){
 for(const {id,input} of inputs)await check("fresh Haiku output: "+id,async()=>{const {r,j}=await request("/api/seed/"+id,{...input,fresh:"1"});assert.equal(r.status,200,JSON.stringify(j));assert(j.artifact.blocks.length>1);writeFileSync(`audit/haiku-${id}.json`,JSON.stringify(j.artifact,null,2));return {title:j.artifact.title,blocks:j.artifact.blocks.length};});
 await check("fresh Finnish CFO exchange",async()=>{const {r,j}=await request("/api/chat",{mode:"cfo",company:"Kesko",messages:[{role:"user",content:"Hei! Miten varmistaisitte, että uusi automaatio säästää aikaa? En tunne teidän sisäisiä prosessejanne vielä."}]});assert.equal(r.status,200,JSON.stringify(j));assert(typeof j.reply==="string"&&j.reply.length>20);writeFileSync("audit/cfo-finnish.json",JSON.stringify(j,null,2));return j;});
 const quiz={talk:"employee-audit",name:"Audit Participant",company:"Example Test Company",email:"audit@example.test",answers:[2,1,0,2,1,0],consent:true};
 const id=crypto.randomUUID();
 const beforeQuiz=(await request("/api/lead?talk=employee-audit")).j.leads.length;
 await check("audience quiz through to staff lead, duplicate retry",async()=>{const a=await request("/api/lead",quiz,false,{"Idempotency-Key":id});assert.equal(a.r.status,200,JSON.stringify(a.j));assert(!("meetingDraft"in a.j));const b=await request("/api/lead",quiz,false,{"Idempotency-Key":id});assert.deepEqual(a.j,b.j);const {j}=await request("/api/lead?talk=employee-audit");assert.equal(j.leads.length,beforeQuiz+1);return {score:a.j.score,leads:j.leads.length};});
 await check("fresh Finnish industry index",async()=>{const {r,j}=await request("/api/aiindex",{industry:"rakentaminen"});assert.equal(r.status,200,JSON.stringify(j));assert(Array.isArray(j.examples));writeFileSync("audit/industry.json",JSON.stringify(j,null,2));return {examples:j.examples.length,registry:j.registry};});
}
console.log("Passed",results.filter(r=>r.passed).length,"of",results.length);
process.exitCode=results.some(r=>!r.passed)?1:0;
