import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { searchProof, proofCsv, type ProofData } from "../lib/proof";
process.loadEnvFile(".env.local");
const base=process.env.AUDIT_URL||"http://127.0.0.1:3015";
const company=process.argv[2]||"Kesko",suffix=company==="Kesko"?"":"-"+company.toLowerCase().replace(/[^a-z0-9]+/g,"-");
let cookie="";
async function call(path:string,body:unknown){const r=await fetch(base+path,{method:"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));if(path==="/api/session")cookie=r.headers.get("set-cookie")!.split(";")[0];return j;}
await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD});
const results=[];
for(const id of ["proof","ghost"]){
 const started=Date.now();const j=await call("/api/seed/"+id,{company});
 if(id==="proof"){
  const p=j.artifact.proof as ProofData;assert(p.pages.length>0);assert(p.records.length>0);
  assert(p.records.every(r=>p.pages.some(s=>s.url===r.source&&s.text.includes(r.excerpt))));
  assert(searchProof(p,"XQZ829173 nonexistent internal password").length===0);
  assert(searchProof(p,p.records[0].excerpt.slice(0,250)).length>0,"A literal source passage must be retrievable; do not choose a stopword such as Please as the entire test query");
  assert(proofCsv(p.records).startsWith("\ufeff"));
  results.push({tool:id,passed:true,ms:Date.now()-started,pages:p.pages.length,records:p.records.length,inputCharacters:p.inputCharacters});
 }else{
  assert(j.artifact.workload.length>=1);assert(j.artifact.workload.every((t:{hoursPerWeek:number})=>Number.isFinite(t.hoursPerWeek)&&t.hoursPerWeek>=0));
  results.push({tool:id,passed:true,ms:Date.now()-started,tasks:j.artifact.workload.length});
 }
 writeFileSync(`audit/quality-${id}${suffix}.json`,JSON.stringify(j.artifact,null,2));
 console.log("PASS",id);
}
writeFileSync(`audit/quality-http-results${suffix}.json`,JSON.stringify({company,results},null,2));
