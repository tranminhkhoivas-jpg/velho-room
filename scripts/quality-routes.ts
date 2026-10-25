import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.loadEnvFile(".env.local");
const base=process.env.AUDIT_URL||"http://127.0.0.1:3015";let cookie="";
async function call(path:string,body?:unknown,staff=true){const r=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{Origin:base,"Content-Type":"application/json",...(staff?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(path==="/api/aiindex"?180000:15000)});const j=await r.json();if(path==="/api/session"&&r.ok)cookie=r.headers.get("set-cookie")!.split(";")[0];return{r,j};}
assert.equal((await call("/api/experiments?prefix=quality-http-",undefined,false)).r.status,401);
assert.equal((await call("/api/evidence",{action:"extract",source:"fictional"},false)).r.status,401);
assert.equal((await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD},false)).r.status,200);
assert.equal((await call("/api/evidence",{action:"extract",source:""})).r.status,400);
assert.equal((await call("/api/evidence",{action:"check",source:"Original",claim:""})).r.status,400);
const e={angle:"quality-http-"+crypto.randomUUID(),creative:"Synthetic API trial. Not published.",channel:"email",cohort:"quality-routes",mode:"synthetic",exposures:100,replies:20,meetings:3,evidence:"Fictional end-to-end test, no actual buyers."};
const a=await call("/api/experiments",e);assert.equal(a.r.status,200,JSON.stringify(a.j));
const b=await call("/api/experiments",e);assert.deepEqual(a.j,b.j);
const list=await call("/api/experiments?prefix="+e.angle);assert.equal(list.j.experiments.length,1);assert.equal(list.j.experiments[0].creative,e.creative);
assert.equal((await call("/api/experiments",{...e,replies:101})).r.status,400);
assert.equal((await call("/api/experiments",{...e,creative:"Changed content",expectedUpdated:a.j.experiment.updated})).r.status,409);
writeFileSync("audit/quality-routes-results.json",JSON.stringify({at:new Date().toISOString(),passed:true,checks:["private experiment/evidence endpoints", "staff login", "invalid evidence refused before inference", "experiment save/retry/read", "creative retention", "invalid funnel refusal", "changed creative requires a new cohort"]},null,2));
console.log("PASS protected production routes, source input guards and persistent content-specific experiment snapshots");
if(process.argv.includes("--industry")){
 const {r,j}=await call("/api/aiindex",{industry:"logistics",fresh:true});writeFileSync("audit/quality-index-live.json",JSON.stringify(j,null,2));assert.equal(r.status,200);assert.equal(j.score,null);assert(j.coverage.candidates>0,"No useful industry candidates found");assert(j.coverage.supported>0,"No source-supported example; inspect the saved candidates before claiming this tool is sufficient");assert(j.examples.every((e:{status:string})=>["supported","unsupported","review","unavailable"].includes(e.status)));console.log("PASS live industry index",JSON.stringify(j.coverage));
}
