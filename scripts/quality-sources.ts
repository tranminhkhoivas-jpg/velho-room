import assert from "node:assert/strict";
import {BUYER_RUBRIC,buyerScore} from "../lib/buyer";
process.env.VELHO_DB="audit/quality-sources.db";process.env.VELHO_AUDIT_ID="quality-sources-"+Date.now();process.env.OPENROUTER_API_KEY=process.env.FASTINO_API_KEY="offline-not-a-key";
process.env.MODEL_FAST=process.env.MODEL_WRITE="anthropic/claude-haiku-5.5";
const {sourceWindow,inDateWindow,verifyPublicEvidence,appearanceLabel}=await import("../lib/public-evidence");
assert(appearanceLabel("target","Target attendance not confirmed").startsWith("Company event"));assert(!appearanceLabel("industry","Unknown").includes("Source-supported"));
const {runSeed}=await import("../lib/seeds"),{cacheSet}=await import("../lib/db");
const {validateArtifact}=await import("../lib/validation");
const literal="Original <cite>literal source markup</cite> must stay unchanged";
const retained=validateArtifact({title:"Test",blocks:[{t:"p",text:"Generated <cite>annotation</cite>"}],publicEvidence:[{subject:"Example",claim:"A claim",url:"https://example.test",date:"",status:"review",excerpt:literal,note:"Review"}]},true);assert.equal(retained.publicEvidence![0].excerpt,literal);assert.equal((retained.blocks[0] as {text:string}).text,"Generated annotation");
const today=new Date().toISOString().slice(0,10),now=Date.parse(today),future=new Date(now+10*864e5).toISOString().slice(0,10);
const pitch="Could we inspect 20 approved fictional invoices, with no production access, and measure omissions before proposing any change?";
const score=buyerScore({rubric:BUYER_RUBRIC.map(c=>({id:c.id,points:2,quote:pitch,reason:"Bounded proposal"})),strengths:["Small test"],fixes:["Name owner"],bestLine:"Who owns the process?"},[pitch]);assert.equal(score.score,50);
assert.throws(()=>buyerScore({...score,rubric:score.rubric.map(c=>({...c,quote:"Invented transcript text"}))},[pitch]));
assert.throws(()=>buyerScore({...score,rubric:score.rubric.map(c=>({...c,points:5}))},[pitch]));
const lower=buyerScore({...score,rubric:score.rubric.map(c=>({...c,quote:pitch.toLowerCase()}))},[pitch]);assert(lower.rubric.every(c=>c.quote===pitch),"Case-only changes must resolve to the original literal pitch instead of failing the whole grade");
assert(!inDateWindow("2026-02-30",now-864e5,now));assert(sourceWindow("Intro\n\nExact Aino quote\n\nContext","Aino quote").includes("Context"));
cacheSet("dossier:sourcetest",{query:"SourceTest",name:"SourceTest Oy",oneLiner:"Fictional",leadership:[],signals:[{type:"news",text:"SourceTest announced a fictional test pilot",date:today,url:"https://example.test/good"},{type:"news",text:"Stale event",date:"2020-01-01",url:"https://example.test/stale"},{type:"news",text:"Unsupported claim",date:today,url:"https://example.test/bad"}],goals:[],manualWorkClues:[],tenders:[],siteText:"",builtAt:new Date().toISOString(),tenderMatchVersion:2});
globalThis.fetch=async(input,init)=>{
 const url=String(input),body=JSON.parse(String(init?.body||"{}"));
 if(url.includes("r.jina.ai"))return new Response(url.includes("bad")?"Unrelated page. Wrong speaker attribution.":`SourceTest Oy announced a fictional test pilot on ${today}.\n\nAino Example, CEO of SourceTest Oy, said on ${today}: We test before making promises.\n\nSourceTest Forum takes place on ${future}. Registration required. Target attendance is not claimed.`);
 if(url.includes("fastino.ai"))return Response.json({usage:{input_tokens:10},answers:Object.fromEntries(Object.keys(body.questions).map(k=>[k,{noul:body.state.source.includes("Unrelated")?0.01:0.99}]))});
 const text=JSON.stringify(body.messages),content=text.includes("public event candidates")?{events:[{name:"SourceTest Forum",date:future,url:"https://example.test/good",kind:"industry",attendance:"Target attendance not confirmed",access:"Registration required"},{name:"Old forum",date:"2020-01-01",url:"https://example.test/stale",kind:"target",attendance:"Aino speaks",access:"Unknown"}]}:text.includes("exact original-language")?{quotes:[{original:"We test before making promises.",speaker:"Aino Example, CEO",url:"https://example.test/good",date:today},{original:"Invented translated quote",speaker:"Aino",url:"https://example.test/good",date:today},{original:"We test before making promises.",speaker:"Wrong person",url:"https://example.test/bad",date:today}]}:{title:"Fictional reviewed artifact",blocks:[{t:"p",text:"Use only supplied supported candidates."}]};
 return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify(content)}}]});
};
const missing=await verifyPublicEvidence({subject:"SourceTest",claim:"Invented quote",quote:"Not in page",date:today,url:"https://example.test/good"});assert.equal(missing.status,"unsupported");
for(const id of ["signals","words","radar"]){const a=await runSeed(id,{company:"SourceTest",fresh:"1"});assert(a.publicEvidence!.some(e=>e.status==="supported"));assert(a.publicEvidence!.some(e=>e.status!=="supported"));if(id==="words")assert.equal(a.publicEvidence!.filter(e=>e.status==="supported").length,1);if(id==="radar"){const table=a.blocks.find(b=>b.t==="table");assert(table?.t==="table");assert.equal(table.rows.length,1);assert(table.rows[0][2].includes("NOT confirmed"));}}
console.log("PASS source windows/date bounds, exact quote/speaker checks, stale/unsupported signal exclusion, industry-event separation and transcript-grounded five-part scoring");
