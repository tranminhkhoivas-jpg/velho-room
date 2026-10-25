import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { NextRequest } from "next/server";
process.env.VELHO_DB = "audit/regression.db";
process.env.VELHO_STAFF_PASSWORD = "regression-only-not-a-real-password";
process.env.OPENROUTER_API_KEY = "offline-test-not-a-key";
process.env.MODEL_FAST = process.env.MODEL_WRITE = "anthropic/claude-haiku-5.5";
mkdirSync("audit", {recursive:true});
const { validateArtifact, webUrl } = await import("../lib/validation");
const { validAnswers, readiness } = await import("../lib/quiz");
const { sessionToken, validSession } = await import("../lib/auth");
const { proxy } = await import("../proxy");
const { db } = await import("../lib/db");
const { llm, llmJson } = await import("../lib/llm");
const rows: {name:string;passed:boolean;error?:string}[]=[];
async function test(name:string, fn:()=>unknown|Promise<unknown>) {try{await fn();rows.push({name,passed:true});}catch(e){rows.push({name,passed:false,error:(e as Error).message});}}
await test("valid staff token and expiry/tamper checks",()=>{const t=sessionToken();assert(validSession(t));assert(!validSession(t+"0"));assert(!validSession(t,Date.now()+13*3600000));});
await test("private leads denied without session",()=>assert.equal(proxy(new NextRequest("http://localhost/api/lead")).status,401));
await test("private pages redirect and public quiz stays open",()=>{assert.equal(proxy(new NextRequest("http://localhost/s/signals")).status,307);assert.equal(proxy(new NextRequest("http://localhost/check")).status,200);});
await test("cross-site mutations rejected",()=>assert.equal(proxy(new NextRequest("http://localhost/api/lead",{method:"POST",headers:{host:"localhost",origin:"https://elsewhere.test"}})).status,403));
await test("valid answers and invalid ranges",()=>{assert(validAnswers([0,0,0,0,0,0]));assert(!validAnswers([0,0,0,99,0,0]));assert(!validAnswers([0,0,0,-1,0,0]));assert(!validAnswers([0,0,0,0.5,0,0]));assert(!validAnswers(Array(6)));assert(readiness([0,3,0,3,3,0])<=100);});
await test("malformed blocks and unsafe URLs rejected",()=>{assert.throws(()=>validateArtifact({title:"Bad",blocks:[{t:"table",cols:["A"],rows:[["a","b"]]}]}));assert.throws(()=>validateArtifact({title:"Bad",blocks:[{t:"score",label:"x",value:101,max:100}]}));assert.equal(webUrl("javascript:alert(1)"),undefined);assert.throws(()=>validateArtifact({title:"Bad",blocks:[{t:"svg",svg:"<svg/>"}]}));});
await test("citation markup removed, Finnish text preserved",()=>{const a=validateArtifact({title:"Äänekoski",blocks:[{t:"p",text:'<cite index="7">Hyvää päivää</cite>'}]});assert.equal((a.blocks[0] as {text:string}).text,"Hyvää päivää");});
const original=globalThis.fetch;
await test("truncated provider output detected and charged",async()=>{globalThis.fetch=async()=>Response.json({usage:{cost:0.001},choices:[{finish_reason:"length",message:{content:"{"}}]});await assert.rejects(llm({messages:[{role:"user",content:"test"}]}),/cut short/);});
await test("malformed model JSON gives a recoverable error",async()=>{globalThis.fetch=async()=>Response.json({usage:{cost:0.001},choices:[{finish_reason:"stop",message:{content:'{"title","blocks":[]}'}}]});await assert.rejects(llmJson({messages:[{role:"user",content:"test"}]}),/invalid format.*regenerate/);});
await test("audit refuses non-Haiku, unknown costs and over-budget requests",async()=>{
 process.env.VELHO_AUDIT_ID="regression-"+Date.now();process.env.VELHO_AUDIT_LIMIT="0.1";
 await assert.rejects(llm({messages:[{role:"user",content:"test"}]}),/allowance/);
 process.env.VELHO_AUDIT_LIMIT="4";
 globalThis.fetch=async()=>Response.json({choices:[{finish_reason:"stop",message:{content:"ok"}}]});
 await assert.rejects(llm({messages:[{role:"user",content:"test"}]}),/cost was not reported/);
 await assert.rejects(llm({messages:[{role:"user",content:"test"}]}),/unconfirmed cost/);
 delete process.env.VELHO_AUDIT_ID;
});
globalThis.fetch=original;
const { POST: lead }=await import("../app/api/lead/route");
await test("invalid quiz rejected before AI",async()=>{const r=await lead(new Request("http://localhost/api/lead",{method:"POST",body:JSON.stringify({answers:[0,0,0,40,0,0],consent:true})}));assert.equal(r.status,400);});
await test("quiz acknowledgement required before AI",async()=>{const r=await lead(new Request("http://localhost/api/lead",{method:"POST",body:JSON.stringify({answers:[0,0,0,0,0,0]})}));assert.equal(r.status,400);});
await test("concurrent duplicate quiz saves one lead and hides staff draft",async()=>{
 const id=crypto.randomUUID(); const body=JSON.stringify({talk:"regression",company:"Example",answers:[0,1,2,3,1,2],consent:true});
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({headline:"Result",ideas:Array.from({length:3},(_,i)=>({title:"Idea "+i,how:"Ask the process owner",hoursBack:"estimate: unknown"})),firstStep:"Measure",meetingDraft:"PRIVATE STAFF DRAFT"})}}]});};
 const req=()=>new Request("http://localhost/api/lead",{method:"POST",headers:{"idempotency-key":id},body});
 const before=(db.prepare("SELECT COUNT(*) n FROM leads").get() as {n:number}).n;
 const [a,b]=await Promise.all([lead(req()),lead(req())]);assert.equal(a.status,200);assert.equal(b.status,200);assert(!JSON.stringify(await a.json()).includes("PRIVATE"));
 assert.equal((db.prepare("SELECT COUNT(*) n FROM leads").get() as {n:number}).n,before+1);assert.equal(calls,1);
 assert.equal((await lead(req())).status,200);assert.equal(calls,1);
});
globalThis.fetch=original;
const { SEEDS,runSeed }=await import("../lib/seeds");
await test("all 16 tools declared; blank campaigns rejected before provider call",async()=>{assert.equal(SEEDS.length,16);await assert.rejects(runSeed("campaign",{company:" "}),/Company/);});
const { cacheSet,cacheGet }=await import("../lib/db");
const { getDossier }=await import("../lib/dossier");
await test("ambiguous register prefix requires disambiguation",async()=>{
 globalThis.fetch=async(input)=>String(input).includes("avoindata.prh.fi")?Response.json({companies:["Atlas Alpha Oy","Atlas Beta Oy"].map(name=>({businessId:{value:"1234567-8"},names:[{name}]}))}):Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({name:"Atlas",website:"https://example.test",leadership:[],signals:[],goals:[],manualWorkClues:[]})}}]});
 await assert.rejects(getDossier("Atlas",true),/Several companies match/);
});
await test("fresh research invalidates only that company's artifacts",async()=>{
 cacheSet("seed:signals:audit company:",{old:true});cacheSet("seed:signals:other company:",{untouched:true});
 globalThis.fetch=async(input)=>{
  const u=String(input);
  if(u.includes("avoindata.prh.fi"))return Response.json({companies:[]});
  if(u.includes("api.ted.europa.eu"))return Response.json({notices:[]});
  if(u.includes("r.jina.ai"))return new Response("Official company information");
  return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({name:"Audit Company",website:"https://example.test",oneLiner:"A fictional test",leadership:[],signals:[],goals:[],manualWorkClues:[]})}}]});
 };
 await getDossier("Audit Company",true);assert.equal(cacheGet("seed:signals:audit company:"),null);assert(cacheGet("seed:signals:other company:"));
});
await test("ghost staffing and cost calculated in code",async()=>{
 cacheSet("dossier:arithmetic test",{tenderMatchVersion:2,query:"Arithmetic Test",name:"Arithmetic Test",oneLiner:"Synthetic",website:"https://example.test",leadership:[],signals:[],goals:[],manualWorkClues:[],tenders:[],siteText:"",builtAt:new Date().toISOString()});
 globalThis.fetch=async()=>Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({ghostName:"Excel Test",title:"Clerk",tagline:"Testing",tasks:[{task:"A",evidence:"fictional",hoursPerWeek:10},{task:"B",evidence:"fictional",hoursPerWeek:"5"}],fte:999,eurPerYear:999,assumption:"Test assumption",draft:"Draft"})}}]});
 const a=await runSeed("ghost",{company:"Arithmetic Test",fresh:"1"});assert(JSON.stringify(a).includes("0.4 FTE"));assert(JSON.stringify(a).includes("22k"));
});
await test("empty index evidence is unknown rather than zero",async()=>{
 cacheSet("aiindex:offline-empty",{industry:"offline-empty",score:0,summary:"Nothing found",examples:[],laggingSignals:[],asOf:"2026-10-24"});
 const {POST}=await import("../app/api/aiindex/route");const r=await POST(new Request("http://localhost/api/aiindex",{method:"POST",body:JSON.stringify({industry:"offline-empty"})}));assert.equal((await r.json()).score,null);
});
globalThis.fetch=original;
await test("unavailable sources remain unknown with explicit limits",async()=>{
 globalThis.fetch=async(input)=>{
  const u=String(input);if(u.includes("avoindata.prh.fi"))throw new Error("offline");if(u.includes("api.ted.europa.eu"))return new Response("offline",{status:503});if(u.includes("r.jina.ai"))throw new Error("offline");
  return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({name:"Unavailable Sources",website:"https://example.test",oneLiner:"Synthetic",leadership:[],signals:[],goals:[],manualWorkClues:[]})}}]});
 };
 const d=await getDossier("Unavailable Sources",true);assert.equal(d.sourceLimits?.length,3);assert(d.sourceLimits?.some(s=>s.includes("unknown, not zero")));
});
await test("conflicting source sample counts block case-study metric",async()=>{
 globalThis.fetch=async()=>Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({title:"Synthetic",blocks:[{t:"table",cols:["Metric","Before","After"],rows:[["Accuracy","not measured","78% of 50, 15 partial, 5 failed"]]}]})}}]});
 const a=await runSeed("caseStudy",{noteId:"P3",fresh:"1"});assert(JSON.stringify(a).includes("Source inconsistency"));assert(JSON.stringify(a).includes("Unverified: conflicting sample counts"));
});
await test("campaign batches produce 24 separately identified angles",async()=>{
 let batch=0;globalThis.fetch=async()=>Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({angles:Array.from({length:6},(_,i)=>({format:"post",hook:`Hook ${batch}-${i}`,body:`Body ${batch}-${i}`,visual:"Text",panel:{cfo:5,coo:6,ceo:7,comment:"Simulated"}}))})}}],...(batch++,{})});
 const a=await runSeed("campaign",{company:"Arithmetic Test",fresh:"1"}) as unknown as {angles:{id:string}[]};assert.equal(a.angles.length,24);assert.equal(new Set(a.angles.map(x=>x.id)).size,24);assert.equal(batch,4);
});
await test("website assistant receives the public pages used by its demo",async()=>{
 cacheSet("proof-pages:arithmetic test",[{url:"https://example.test/services",text:"PUBLIC_PAGE_TEST_VALUE"}]);
 globalThis.fetch=async(_input,init)=>{const body=JSON.parse(String(init?.body));assert(body.messages[0].content.includes("PUBLIC_PAGE_TEST_VALUE"));return Response.json({usage:{cost:0},choices:[{message:{content:"Sourced answer"}}]});};
 const {POST}=await import("../app/api/chat/route");const r=await POST(new Request("http://localhost/api/chat",{method:"POST",body:JSON.stringify({mode:"website",company:"Arithmetic Test",messages:[{role:"user",content:"Question"}]})}));assert.equal(r.status,200);assert.equal((await r.json()).reply,"Sourced answer");
});
globalThis.fetch=original;
await test("TED keeps legal identity and shows the matched winner",async()=>{
 globalThis.fetch=async(input)=>{
  const u=String(input);if(u.includes("avoindata.prh.fi"))return Response.json({companies:[]});
  if(u.includes("api.ted.europa.eu"))return Response.json({notices:["Audit Oyj", "Audit Oyj Procurement", "Audit AB", "Other Audit Oyj"].map((name,i)=>({"publication-number":String(i),"notice-title":{"eng":["Award"]},"buyer-name":{"eng":["City"]},"winner-name":{"eng":[name]},"publication-date":"2026-10-01"}))});
  if(u.includes("r.jina.ai"))return new Response("Public page");
  return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify({name:"Audit Oyj",website:"https://example.test",leadership:[],signals:[],goals:[],manualWorkClues:[]})}}]});
 };
 const d=await getDossier("Audit Oyj",true);assert.equal(d.tenders.length,2);assert(d.tenders.every(t=>t.text.includes("matched winner: Audit Oyj")));assert(d.tenders.every(t=>!t.text.includes("Audit AB")));
});
globalThis.fetch=original;
writeFileSync("audit/regression-results.json",JSON.stringify({at:new Date().toISOString(),checks:rows},null,2));
for(const r of rows)console.log(`${r.passed?"PASS":"FAIL"} ${r.name}${r.error?": "+r.error:""}`);
process.exitCode=rows.some(r=>!r.passed)?1:0;
