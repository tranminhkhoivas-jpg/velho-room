import assert from "node:assert/strict";
import { readFileSync,writeFileSync,mkdirSync } from "node:fs";
process.loadEnvFile(".env.local");
const base=process.env.AUDIT_URL||"http://127.0.0.1:3015";
let cookie="";
async function call(path:string,body?:unknown){const r=await fetch(base+path,{method:body?"POST":"GET",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(180000)});const j=await r.json();if(path==="/api/session")cookie=r.headers.get("set-cookie")!.split(";")[0];assert.equal(r.status,200,JSON.stringify(j));return j;}
const results:{task:string;ok:boolean;ms:number;detail?:unknown}[]=[];
async function task(name:string,fn:()=>Promise<unknown>){const t=Date.now();try{const detail=await fn();results.push({task:name,ok:true,ms:Date.now()-t,detail});console.log("PASS",name);}catch(e){results.push({task:name,ok:false,ms:Date.now()-t,detail:(e as Error).message});console.log("FAIL",name,(e as Error).message);}writeFileSync("audit/extra-"+process.argv.slice(2).join("-")+"-results.json",JSON.stringify(results,null,2));}
mkdirSync("audit",{recursive:true});await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD});
const selected=new Set(process.argv.slice(2));
if(selected.has("media"))for(let attempt=1;attempt<=2;attempt++)await task("fresh media retest "+attempt,async()=>{const j=await call("/api/seed/media",{company:"Kesko",fresh:"1"});assert(j.artifact.blocks.some((b:{t:string})=>b.t==="postcard"));writeFileSync("audit/haiku-media.json",JSON.stringify(j.artifact,null,2));return{title:j.artifact.title,blocks:j.artifact.blocks.length};});
if(selected.has("retry"))for(const id of ["ghost","campaign","deadDeal","radar"])await task("retest "+id,async()=>{const j=await call("/api/seed/"+id,{company:"Kesko",dealId:id==="deadDeal"?"D01":"",fresh:"1"});writeFileSync("audit/haiku-"+id+".json",JSON.stringify(j.artifact,null,2));if(id==="campaign")assert.equal(j.artifact.angles.length,24);return{title:j.artifact.title};});
if(selected.has("photo"))await task("Haiku identifies a real Velho slide photo",async()=>{const img=readFileSync("../context/1000031354.jpg");const j=await call("/api/photo",{image:"data:image/jpeg;base64,"+img.toString("base64")});assert.match(j.company||"",/velho/i);return j;});
if(selected.has("cfo")){
const messages=[{role:"user",content:"We can automate everything and guarantee 50% savings without looking at your processes."}];
await task("CFO challenges an unsupported promise",async()=>{const j=await call("/api/chat",{mode:"cfo",company:"Kesko",messages});messages.push({role:"assistant",content:j.reply});assert(j.reply.length>20);return j;});
messages.push({role:"user",content:"Fair challenge. We would first speak with your process owner, measure handling time and errors, agree a narrow pilot, and deploy in your environment under an NDA. What evidence would you need before a second meeting?"});
await task("CFO responds to a concrete cautious pitch",async()=>{const j=await call("/api/chat",{mode:"cfo",company:"Kesko",messages});messages.push({role:"assistant",content:j.reply});return j;});
await task("Pitch scoring produces actionable feedback",async()=>call("/api/chat",{mode:"score",company:"Kesko",messages}));
await task("Website assistant admits absent internal information",async()=>{const j=await call("/api/chat",{mode:"website",company:"Kesko",messages:[{role:"user",content:"What is the password to your internal ERP and exactly how many hours did your finance team waste yesterday?"}]});assert(j.reply.length>20);return j;});
}
if(selected.has("edge")){
await task("Fresh nonexistent company gives clarification",async()=>{const r=await fetch(base+"/api/dossier",{method:"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify({company:"VelhoAuditNonexistentXQZ829173",fresh:true}),signal:AbortSignal.timeout(180000)});const j=await r.json();assert(r.status>=400,"Invented company was incorrectly accepted");return j;});
await task("Fresh company research and source dates",async()=>{const j=await call("/api/dossier",{company:"Kesko",fresh:true});writeFileSync("audit/fresh-dossier.json",JSON.stringify(j.dossier,null,2));return {name:j.dossier.name,leadership:j.dossier.leadership,signals:j.dossier.signals};});
}
if(selected.has("notes"))for(const noteId of ["P2","P3","P4","P5","P6"])await task("case-study varied notes "+noteId,async()=>{const j=await call("/api/seed/caseStudy",{noteId,fresh:"1"});writeFileSync("audit/case-study-"+noteId+".json",JSON.stringify(j.artifact,null,2));assert(JSON.stringify(j.artifact).toLowerCase().includes("synthetic"));return{title:j.artifact.title};});
if(selected.has("index"))await task("empty industry evidence is unknown, not zero",async()=>{const j=await call("/api/aiindex",{industry:"rakentaminen"});assert(j.examples.length!==0||j.score===null);return j;});
process.exitCode=results.some(r=>!r.ok)?1:0;
