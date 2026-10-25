import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.env.VELHO_DB="audit/repairs14/test-"+Date.now()+".db";
process.env.VELHO_AUDIT_ID="repair-offline-"+Date.now();
process.env.OPENROUTER_API_KEY=process.env.FASTINO_API_KEY="offline-not-a-key";
process.env.MODEL_FAST=process.env.MODEL_WRITE="anthropic/claude-haiku-5.5";
const {POST,GET}=await import("../../app/api/lead/route");
const {db,cacheSet}=await import("../../lib/db");
const {runSeed}=await import("../../lib/seeds");
const {talkInsights,speakerTurn}=await import("../../lib/talks");
const {buildProof,searchProof}=await import("../../lib/proof");
const {scopeGaps}=await import("../../lib/staff-input");
const {readiness}=await import("../../lib/quiz");
const results:{test:string;passed:boolean}[]=[];
function pass(test:string){results.push({test,passed:true});console.log("PASS",test);}
let mode="outage",surface="note",source="Host Other Person: Close all offices next year. CEO Aino Example: I disagree. "+"Fictional interview context with multiple speakers and their different views. ".repeat(8);
const phrase="Close all offices next year",today=new Date().toISOString().slice(0,10);
const checked:string[]=[];
globalThis.fetch=async(input,init)=>{
 const url=String(input),body=JSON.parse(String(init?.body||"{}"));
 if(url.includes("r.jina.ai"))return new Response(source);
 if(url.includes("fastino.ai")&&body.questions){return Response.json({usage:{input_tokens:10},answers:Object.fromEntries(Object.entries(body.questions).map(([k,v])=>{const q=(v as {instructions:string}).instructions;checked.push(q);return[k,{noul:q.includes("480")||q.includes("personally states")&&/I disagree/.test(body.state.source)?0.01:0.99}];}))});}
 if(url.includes("fastino.ai")){const start=Array.from(source.slice(0,source.indexOf(phrase))).length;return Response.json({usage:{input_tokens:10},choices:[{message:{content:JSON.stringify({entities:{priority:[{text:phrase,start,end:start+phrase.length,confidence:0.99}]}})}}]});}
 if(mode==="outage")return Response.json({error:{message:"Controlled outage"},usage:{cost:0}},{status:503});
 let content:unknown;
 if(mode==="case"){
  const falseText="Measured savings were 480 hours per week.";
  const b=surface==="list"?{t:surface,items:[{text:falseText}]}:surface==="table"?{t:surface,cols:["Metric","Result"],rows:[["Savings",falseText]]}:{t:surface,text:falseText,...(surface==="draft"?{label:"Post"}:{})};
  content={title:surface==="title"?falseText:"Fictional source review",blocks:surface==="title"?[{t:"p",text:"Baseline 12 hours/week; pilot 8 hours/week."}]:[b]};
 }else if(mode.startsWith("talk"))content={talks:[{title:"Fictional interview",url:"https://example.test/transcript",speaker:"Aino Example, CEO",date:mode==="talk-old"?"2010-01-01":today,kind:"interview"}]};
 else if(mode==="luotsi")content={destination:"An agreed sample test",rocks:[{label:"Does duplicate entry occur?",evidence:"Measured savings were 480 hours per week.",basis:"staff",url:"https://example.test/unrelated"}],lighthouses:[{label:"Inspect sample",why:"Hypothesis",owner:"Owner",firstStep:"Review one sample",acceptance:"Agree a measured baseline"}],currents:["Timing uncertain"],captainsNote:"Could we agree a small sample?"};
 else if(mode==="deadDeal")content=JSON.stringify(body).includes("Select a genuinely relevant")?{signalIndex:0,relation:"indirect",reason:"A new programme may change the earlier timing concern; no budget is known.",question:"Has ownership changed?"}:{title:"Fictional deal",blocks:[{t:"draft",label:"Stale draft",text:"Q1 is behind us; shall we speak?"}]};
 else if(mode==="signals"||mode==="radar")content=mode==="radar"?{events:[{name:"Fictional shareholder meeting",date:today,url:"https://example.test/event",kind:"target",attendance:"Target attendance not confirmed",access:"Restricted to shareholders on the record date",location:"Helsinki"}]}:{title:"Fictional signals",blocks:[{t:"p",text:"A milestone to ask about, not a completed result."}]};
 else content={headline:"Fictional result",ideas:[1,2,3].map(n=>({title:"Idea "+n,how:"Inspect approved fictional samples",hoursBack:"unknown"})),firstStep:"Inspect samples",meetingDraft:"Unsent fictional draft"};
 return Response.json({usage:{cost:0},choices:[{message:{content:JSON.stringify(content)}}]});
};
const answers=[0,1,0,2,0,1],lead={talk:"repair-capture",name:"Fictional visitor",company:"Fictional",email:"fictional@example.test",answers,consent:true};
const key=crypto.randomUUID();
const request=(id=key)=>new Request("http://localhost/api/lead",{method:"POST",headers:{"Idempotency-Key":id},body:JSON.stringify(lead)});
const count=()=>Number((db.prepare("SELECT count(*) AS n FROM leads WHERE talk=?").get(lead.talk) as {n:number}).n);
const failure=await POST(request());assert.equal(failure.status,202);assert.equal((await failure.json()).pending,true);assert.equal(count(),1);pass("Provider outage retains one saved enquiry with retryable pending result");
assert.equal((await POST(request())).status,202);assert.equal(count(),1);pass("Repeated outage retry does not duplicate saved enquiry");
mode="success";const recovered=await POST(request());assert.equal(recovered.status,200);assert.equal((await recovered.json()).pending,false);assert.equal(count(),1);await POST(request());assert.equal(count(),1);pass("Retry recovers the original row and completed retries remain idempotent");
await POST(request(crypto.randomUUID()));const history=await (await GET(new Request("http://localhost/api/lead?search=fictional%40example.test"))).json();assert.equal(history.leads.length,2);assert(history.leads.every((l:{contactCount:number})=>l.contactCount===2));pass("Repeat-contact submissions remain discoverable together without deleting history");
for(let i=0;i<201;i++)db.prepare("INSERT INTO leads(talk,name,company,role,email,answers,result,created) VALUES(?,?,?,?,?,?,?,?)").run("repair-large","Fictional "+i,"Fictional","COO","other@example.test","[]","{}",i);
const page=await (await GET(new Request("http://localhost/api/lead?talk=repair-large"))).json();const next=await (await GET(new Request("http://localhost/api/lead?talk=repair-large&before="+page.nextCursor))).json();assert.equal(page.leads.length,200);assert.equal(next.leads.length,1);assert(!page.leads.some((l:{id:number})=>l.id===next.leads[0].id));pass("Cursor reaches the older 201st record without repetition");
const staff={kind:"synthetic",company:"Fictional Case",notes:"Fictional approved sample: baseline 12 hours/week, pilot 8 hours/week. No other measured savings.",owner:"",dataAccess:"",constraints:"",success:"",contact:"",lastContact:"",objection:"",approved:true};
mode="case";for(surface of ["note","p","h","draft","list","table","title"]){checked.length=0;const a=await runSeed("caseStudy",{staffInput:JSON.stringify(staff),fresh:"1"});assert(!JSON.stringify({title:a.title,blocks:a.blocks}).includes("480"),surface);assert(checked.some(q=>q.includes("480")),surface);}pass("False result is checked and withheld in all seven allowed factual surfaces");
function dossier(name:string,signals:unknown[]=[],changes:unknown[]=[]){cacheSet("dossier:"+name.toLowerCase(),{query:name,name,oneLiner:"Fictional company",leadership:[],signals,goals:[],manualWorkClues:[],tenders:[],siteText:"",builtAt:new Date().toISOString(),tenderMatchVersion:2,registry:{name,businessId:"fictional",changes}});}
mode="signals";const tomorrow=new Date(Date.now()+864e5).toISOString().slice(0,10);
dossier("FutureOnly",[{text:"Public results presentation tomorrow",date:tomorrow,url:"https://example.test/invitation",type:"results"}]);const future=await runSeed("signals",{company:"FutureOnly",fresh:"1"});assert.equal(future.publicEvidence?.[0].status,"supported");assert(JSON.stringify(future.blocks).includes("upcoming milestone; not completed"));pass("Future milestone is checked and explicitly labelled upcoming");
dossier("CappedSignals",Array.from({length:8},(_,i)=>({text:"Old item "+i,date:"2020-01-01",url:"https://example.test/old"+i,type:"news"})),[{text:"Current registry change",date:today,url:"https://example.test/register"}]);const capped=await runSeed("signals",{company:"CappedSignals",fresh:"1"});assert(capped.publicEvidence?.some(e=>e.url.includes("register")));pass("Stale news cannot crowd out a current registry change");
const d={name:"Fictional Corp",leadership:[{name:"Aino Example",role:"CEO"}]} as Parameters<typeof talkInsights>[0];
mode="talk-old";assert.equal((await talkInsights(d))[0].spans.length,0);pass("Stale recording never supplies executive spans");
mode="talk-recent";let t=await talkInsights(d);assert(t[0].spans.length);assert(t[0].spans.every(s=>!s.verified));assert.equal(speakerTurn(source,source.indexOf(phrase),"Aino Example"),null);pass("Host words remain unverified rather than attributed to the CEO");
source="CEO Aino Example: "+phrase+". "+"Fictional single speaker context describing company priorities. ".repeat(9);t=await talkInsights(d);assert(t[0].spans.some(s=>s.verified));pass("Correctly labelled executive turn passes its stance check");
source="CEO Aino Example: I disagree with the proposal: "+phrase+". "+"Fictional executive disagreement with the proposed plan. ".repeat(9);t=await talkInsights(d);assert(t[0].spans.every(s=>!s.verified));pass("Executive disagreement does not become an endorsed priority");
assert.equal(scopeGaps({...staff,owner:"Unknown",dataAccess:"TBD",constraints:"not confirmed",success:"?"} as Parameters<typeof scopeGaps>[0]).length,4);pass("Unknown scope fields remain open");
const proof=buildProof("Fictional",[{url:"https://example.test",text:"Our balcony glazing protects the balcony from rain and wind.\n\nOur terrace glazing provides a comfortable space throughout the year."}]);assert.equal(searchProof(proof,"terrace glazing, not balcony glazing").length,1);assert(!searchProof(proof,"glazing","balcony").some(r=>/balcony/.test(r.excerpt)));pass("Explicit and typed keyword exclusions remove excluded passages");
assert.equal(readiness(answers,{weeklyHours:0}),0);assert(readiness(answers,{weeklyHours:1})<readiness(answers,{weeklyHours:20}));pass("Supplied actual workload affects the answer-based indicator");
dossier("RestrictedEvent");mode="radar";const radar=await runSeed("radar",{company:"RestrictedEvent",fresh:"1"});assert(!radar.blocks.some(b=>b.t==="draft"));assert(JSON.stringify(radar.blocks).includes("No actionable event found"));pass("Restricted event remains research-only and produces no pre-event draft");
mode="luotsi";dossier("Fictional Chart");const chart=await runSeed("luotsi",{company:"Fictional Chart",staffInput:JSON.stringify({...staff,company:"Fictional Chart"}),fresh:"1"});const rocks=chart.blocks.filter(b=>b.t==="list").flatMap(b=>b.t==="list"?b.items:[]);assert(!rocks.some(r=>r.url==="https://example.test/unrelated"));assert(!rocks.some(r=>r.text.includes("480")));pass("Staff chart claims cannot inherit an unrelated public citation or unchecked result");
mode="deadDeal";dossier("Fictional Deal",[{text:"New transformation programme announced",date:today,url:"https://example.test/new-programme",type:"change"}]);const deal=await runSeed("deadDeal",{staffInput:JSON.stringify({...staff,company:"Fictional Deal",lastContact:"2025-01-01",objection:"No owner for the proposed programme"}),fresh:"1"});const messages=deal.blocks.filter(b=>b.t==="draft");assert.equal(messages.length,1);assert(JSON.stringify(messages).includes("new-programme"));assert(!JSON.stringify(messages).includes("Q1"));assert(deal.sourceRecord);pass("Deal check-in includes its selected new trigger and preserves original history");
writeFileSync("audit/repairs14/regression-results.json",JSON.stringify({at:new Date().toISOString(),mode:"controlled providers; isolated DB; no live inference",results},null,2));
console.log(results.length,"repair checks passed");
