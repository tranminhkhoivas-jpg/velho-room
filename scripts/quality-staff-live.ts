import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.loadEnvFile(".env.local");
const base="http://127.0.0.1:3015";let cookie="";
async function call(path:string,body:unknown){const r=await fetch(base+path,{method:"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));if(path==="/api/session")cookie=r.headers.get("set-cookie")!.split(";")[0];return j;}
await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD});
const input={kind:"synthetic",company:"Kesko",notes:"Fictional employee test, not an actual Kesko project or meeting. A small invoice sample took 12 staff hours per week before a pilot and 8 afterwards, measured for one week only. No financial savings or production deployment were measured. Staff want to explore removing duplicate spreadsheet entry. No buyer has agreed to a purchase.",contact:"Fictional buyer",lastContact:"2026-10-25",objection:"No approved data access",owner:"Fictional process owner",dataAccess:"Approved fictional CSV of 20 invoices only",constraints:"No production system access, no outbound messages, two-hour exploration",success:"Correctly copy all 20 fictional records with no omissions; employee reviews every row",approved:true};
const results=[];
for(const id of ["caseStudy","deadDeal","hackathon","luotsi","tradefair"]){
 const started=Date.now(),j=await call("/api/seed/"+id,{company:"Kesko",staffInput:JSON.stringify(input)}),a=j.artifact;
 writeFileSync(`audit/quality-staff-live-${id}.json`,JSON.stringify(a,null,2));
 assert(a.blocks.length>0);assert(a.blocks.some((b:{t:string;text?:string})=>b.t==="note"&&/synthetic/i.test(b.text||"")));
 if(id==="caseStudy"){assert(a.sourceRecord.text.includes(input.notes));assert(a.sourceChecks.length>0);assert(a.reviewNotice);}
 if(id==="deadDeal"){assert(!a.blocks.some((b:{t:string})=>b.t==="draft"));assert(a.blocks.some((b:{t:string;value?:number})=>b.t==="score"&&b.value===0));}
 results.push({id,passed:true,ms:Date.now()-started,review:a.reviewNotice,checks:a.sourceChecks?.length});console.log("PASS live staff workflow",id);
 writeFileSync("audit/quality-staff-live-results.json",JSON.stringify({at:new Date().toISOString(),results},null,2));
}
