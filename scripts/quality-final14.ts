import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
import {duplicateAngles} from "../lib/campaign-quality";
process.loadEnvFile(".env.local");const base="http://127.0.0.1:3015";let cookie="";
async function call(path:string,body?:unknown,staff=true){const r=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{Origin:base,"Content-Type":"application/json",...(staff?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});const j=await r.json();if(path==="/api/session"&&r.ok)cookie=r.headers.get("set-cookie")!.split(";")[0];return{r,j};}
await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD},false);const results:Record<string,unknown>[]=[];
for(const id of ["signals","proof","buyer","ghost","luotsi","tradefair","words","radar","hackathon","campaign","deadDeal","caseStudy"]){
 try{const {r,j}=await call("/api/seed/"+id,id==="deadDeal"?{dealId:"D02"}:id==="caseStudy"?{noteId:"P3"}:{company:"Kesko"});assert.equal(r.status,200,JSON.stringify(j));const a=j.artifact;assert(a.blocks.length);writeFileSync(`audit/quality-final14-${id}.json`,JSON.stringify(a,null,2));
 if(id==="proof"){assert(a.proof.records.length>0);assert(a.proof.records.every((r:{source:string;excerpt:string})=>a.proof.pages.some((p:{url:string;text:string})=>p.url===r.source&&p.text.includes(r.excerpt))));}
 if(id==="buyer")assert(a.blocks.some((b:{t:string;items?:{url:string}[]})=>b.t==="sources"&&b.items?.some(s=>/\.pdf(?:[?#]|$)/i.test(s.url))),"Current buyer setup must cite the actual report document");
 if(id==="ghost")assert(a.workload.length>0);
 if(id==="luotsi")assert(a.blocks.some((b:{t:string;cols?:string[]})=>b.t==="table"&&b.cols?.includes("Acceptance test to agree")));
 if(id==="tradefair")assert(!a.blocks.some((b:{t:string;text?:string})=>b.t==="draft"&&/nice meeting|great meeting|thanks for (the|our) (chat|conversation)/i.test(b.text||"")),"A booth/company alone does not establish a conversation");
 if(["signals","words","radar"].includes(id))assert(Array.isArray(a.publicEvidence));
 if(id==="radar")for(const b of a.blocks)if(b.t==="table")assert(b.rows.every((r:string[])=>!(/Source-supported target appearance/.test(r[2])&&/not confirmed|unconfirmed/i.test(r[2]))));
 if(id==="hackathon")assert(a.blocks.some((b:{t:string;text?:string})=>b.t==="note"&&/Scoping draft only/i.test(b.text||"")));
 if(id==="campaign"){assert.equal(a.angles.length,24);assert.equal(new Set(a.angles.map((a:{theme:string})=>a.theme)).size,4);assert.equal(duplicateAngles(a.angles).length,0,"Final campaign still contains substantial duplicates");}
 if(id==="deadDeal")assert(a.blocks.some((b:{t:string;text?:string})=>b.t==="note"&&/synthetic/i.test(b.text||"")));
 if(id==="caseStudy"){assert(a.sourceRecord.kind==="synthetic");assert(!JSON.stringify(a.blocks.filter((b:{t:string})=>b.t!=="note"&&b.t!=="sources")).includes("78%"));}
 results.push({id,passed:true});console.log("PASS final current generator",id);
 }catch(e){results.push({id,passed:false,error:String(e)});console.log("FAIL final current generator",id,String(e));}
 writeFileSync("audit/quality-final14-results.json",JSON.stringify(results,null,2));
}
const pub=await fetch(base+"/check");assert.equal(pub.status,200);const index=await call("/api/aiindex",{industry:"logistics"});assert.equal(index.r.status,200);assert.equal(index.j.score,null);assert(index.j.coverage.supported>0);results.push({id:"check",passed:true,coverage:index.j.coverage});
assert.equal((await call("/api/lead",undefined,false)).r.status,401);const leads=await call("/api/lead?talk=quality-browser-20261025");assert.equal(leads.r.status,200);assert(leads.j.leads.some((l:{work?:{status:string};result:{context?:{contactPermission:boolean}}})=>l.work?.status==="reviewing"&&l.result.context?.contactPermission===false));results.push({id:"pipeline",passed:true});
writeFileSync("audit/quality-final14-results.json",JSON.stringify(results,null,2));assert.equal(results.length,14);assert(results.every(r=>r.passed),"Inspect failed acceptance checks before scoring completion");console.log("PASS final 14-method production checks; media/video was not requested or evaluated");
