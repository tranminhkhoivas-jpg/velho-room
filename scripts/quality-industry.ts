import assert from "node:assert/strict";
import {industrySourceWindow,evidencePeriod,currentEvidencePeriod} from "../lib/industry";
process.env.VELHO_DB="audit/quality-industry.db";process.env.VELHO_AUDIT_ID="quality-industry-"+Date.now();process.env.OPENROUTER_API_KEY="offline-not-a-key";process.env.FASTINO_API_KEY="offline-not-a-key";
const {POST}=await import("../app/api/aiindex/route");
assert.equal(industrySourceWindow("No relevant evidence here.","Example"),"");
assert.equal(evidencePeriod("2025-02-30"),null);assert.equal(evidencePeriod("2025-13"),null);assert.equal(evidencePeriod("winter 2025"),null);
assert.deepEqual(evidencePeriod("autumn 2025"),{start:Date.UTC(2025,8,1),end:Date.UTC(2025,11,0)});
assert(currentEvidencePeriod("autumn 2025",Date.UTC(2026,9,24)));assert(!currentEvidencePeriod("2026",Date.UTC(2026,9,24)),"Do not pretend a whole partially future year is established");
const window=industrySourceWindow("Earlier context.\n\nExample Oy uses artificial intelligence for sorting.\n\nLater context.","Example Oy");assert(window.includes("Example Oy"));assert(window.indexOf("Earlier")<window.indexOf("Later"));assert(window.length<=6000);
const date=new Date(Date.now()-7*864e5).toISOString().slice(0,10);let calls=0;
globalThis.fetch=async(input,init)=>{
 calls++;const u=String(input);
 if(u.includes("openrouter.ai"))return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({tol:"49",examples:[{company:"Actual Oy",what:"Uses AI to sort logistics shipments",url:"https://example.test/actual",date},{company:"Planned Oy",what:"Already uses AI to sort shipments",url:"https://example.test/plan",date},{company:"Offline Oy",what:"Uses AI",url:"https://example.test/offline",date},{company:"Future Oy",what:"Uses AI",url:"https://example.test/future",date:"2099-01-01"}]})}}]});
 if(u.includes("r.jina.ai")){if(u.endsWith("offline"))return new Response("Unavailable",{status:503});return new Response(u.endsWith("actual")?`${date}: Actual Oy is a Finnish logistics company.\n\nActual Oy already uses artificial intelligence to sort shipments.`:`${date}: Planned Oy is a Finnish logistics company.\n\nPlanned Oy plans to introduce artificial intelligence in the future; it is not deployed.`);}
 if(u.includes("fastino.ai")){const body=JSON.parse(String(init?.body));return Response.json({usage:{input_tokens:10},answers:{claim_0:{noul:body.state.source.includes("Actual Oy")?0.99:0.01}}});}
 if(u.includes("avoindata.prh.fi"))return Response.json({totalResults:100});
 throw new Error("Unexpected URL");
};
const run=(industry:unknown)=>POST(new Request("http://localhost/api/aiindex",{method:"POST",body:JSON.stringify({industry,fresh:true})}));
const r=await run("quality-industry");assert.equal(r.status,200);const j=await r.json();assert.equal(j.score,null);assert.deepEqual(j.coverage,{candidates:4,readable:2,supported:1});assert.deepEqual(j.examples.map((e:{status:string})=>e.status),["supported","unsupported","unavailable","unsupported"]);assert(j.examples[0].sourceExcerpt.includes("Actual Oy"));assert.equal(j.registry.companies,100);
const before=calls;assert.equal((await run(123)).status,400);assert.equal(calls,before,"Invalid input must not call providers");
console.log("PASS industry evidence: bounded ordered source windows, no invented adoption score, support/plans/unreadable/future-date separation, coverage and pre-provider validation");
