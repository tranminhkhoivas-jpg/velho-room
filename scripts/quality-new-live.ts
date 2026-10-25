import assert from "node:assert/strict";
import {writeFileSync,copyFileSync,existsSync} from "node:fs";
process.loadEnvFile(".env.local");
const base="http://127.0.0.1:3015";let cookie="";
async function call(path:string,body?:unknown,method=body===undefined?"GET":"POST",extra={}){const r=await fetch(base+path,{method,headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie,...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(240000)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));if(path==="/api/session")cookie=r.headers.get("set-cookie")!.split(";")[0];return j;}
await call("/api/session",{password:process.env.VELHO_STAFF_PASSWORD});
const results=[];
for(const id of (process.argv.includes("--buyer-only")?[]:process.argv.includes("--words-only")?["words"]:process.argv.includes("--campaign-only")?["campaign"]:["signals","words","radar","campaign"])){
 const started=Date.now(),j=await call("/api/seed/"+id,{company:"Kesko"}),a=j.artifact;writeFileSync(`audit/quality-new-live-${id}.json`,JSON.stringify(a,null,2));
 assert(a.blocks.length>0);if(id==="campaign"){assert.equal(a.angles.length,24);assert.equal(new Set(a.angles.map((x:{theme:string})=>x.theme)).size,4);assert(a.angles.every((x:{review:string})=>x.review));}
 else{assert(Array.isArray(a.publicEvidence));if(!a.publicEvidence.some((e:{status:string})=>e.status==="supported"))assert(!a.blocks.some((b:{t:string})=>b.t==="draft"));}
 results.push({id,ms:Date.now()-started,candidates:a.publicEvidence?.length,supported:a.publicEvidence?.filter((e:{status:string})=>e.status==="supported").length,angles:a.angles?.length,withheld:a.angles?.filter((x:{review:string})=>x.review.startsWith("Withheld")).length});writeFileSync("audit/quality-new-live-results.json",JSON.stringify(results,null,2));console.log("CHECK live",id,JSON.stringify(results.at(-1)));
}
if(!process.argv.includes("--words-only")&&!process.argv.includes("--campaign-only")){
if(!process.argv.includes("--buyer-only")){
const talk="quality-new-"+crypto.randomUUID(),input={talk,answers:[0,1,0,2,0,1],consent:true,name:"Fictional employee test",company:"Fictional Example",email:"fictional@example.test",context:{task:"Copy a fictional invoice CSV into a second spreadsheet",constraints:"Only the fictional sample; no production access or outbound messages",people:2,weeklyHours:5,intent:"explore",contactPermission:true}},requestId=crypto.randomUUID();
const quiz=await call("/api/lead",input,"POST",{"Idempotency-Key":requestId});assert(quiz.explanation);assert.equal(quiz.context.intent,"explore");assert(!quiz.meetingDraft);assert(quiz.ideas.every((x:{hoursBack:string})=>x.hoursBack.startsWith("Not measured")));assert.deepEqual(await call("/api/lead",input,"POST",{"Idempotency-Key":requestId}),quiz);
let leads=await call("/api/lead?talk="+talk);assert.equal(leads.leads.length,1);const lead=leads.leads[0];
await call("/api/lead",{id:lead.id,expectedUpdated:0,work:{owner:"Fictional staff tester",status:"reviewing",nextAction:"Review only the approved fictional CSV; no message sent",due:"2026-10-26"}},"PATCH");leads=await call("/api/lead?talk="+talk);assert.equal(leads.leads[0].work.status,"reviewing");writeFileSync("audit/quality-leads-live.json",JSON.stringify({talk,quiz,leads},null,2));console.log("PASS live quiz-to-staff action queue",talk);
}
const messages:{role:string;content:string}[]=[{role:"user",content:"I noticed your public focus on operational efficiency. Could we first ask your process owner where duplicate entry occurs, using only an approved fictional sample and no production access?"}];
let reply=await call("/api/chat",{mode:"cfo",company:"Kesko",messages});messages.push({role:"assistant",content:reply.reply},{role:"user",content:"We cannot promise savings yet. With your process owner, we could compare manual handling time and omissions on 20 approved sample records. No production integration or purchase is assumed. Who would review data access and ongoing ownership before any next step?"});reply=await call("/api/chat",{mode:"cfo",company:"Kesko",messages});messages.push({role:"assistant",content:reply.reply});const coaching=await call("/api/chat",{mode:"score",company:"Kesko",messages});assert.equal(coaching.score.rubric.length,5);assert.equal(coaching.score.score,coaching.score.rubric.reduce((n:number,c:{points:number})=>n+c.points,0)*5);assert(coaching.score.rubric.every((c:{quote:string;points:number})=>!c.points||messages.some(m=>m.role==="user"&&m.content.includes(c.quote))));writeFileSync("audit/quality-buyer-live.json",JSON.stringify({messages,coaching},null,2));console.log("PASS live transcript-grounded coaching",coaching.score.score);
if(existsSync("audit/quality-staff-live-caseStudy.json"))copyFileSync("audit/quality-staff-live-caseStudy.json","audit/first-quality-staff-live-caseStudy.json");
console.log("Production checks complete; real source counts are research coverage, not business outcomes.");
}
