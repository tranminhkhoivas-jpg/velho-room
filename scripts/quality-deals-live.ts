import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.loadEnvFile(".env.local");const base="http://127.0.0.1:3015";
const login=await fetch(base+"/api/session",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({password:process.env.VELHO_STAFF_PASSWORD})});assert.equal(login.status,200);const cookie=login.headers.get("set-cookie")!.split(";")[0],results=[];
for(const dealId of ["D01","D02"]){const r=await fetch(base+"/api/seed/deadDeal",{method:"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify({dealId}),signal:AbortSignal.timeout(180000)}),j=await r.json();assert.equal(r.status,200,JSON.stringify(j));const a=j.artifact;writeFileSync(`audit/quality-deal-${dealId}.json`,JSON.stringify(a,null,2));assert(a.blocks.some((b:{t:string;text?:string})=>b.t==="note"&&/synthetic/i.test(b.text||"")));results.push({dealId,drafts:a.blocks.filter((b:{t:string})=>b.t==="draft").length});console.log("PASS existing synthetic deal workflow",dealId);}
writeFileSync("audit/quality-deal-results.json",JSON.stringify(results,null,2));
