import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base='http://127.0.0.1:3015';
const password=readFileSync('.env.local','utf8').match(/^VELHO_STAFF_PASSWORD=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g,'');
const session=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(10000)});
assert.equal(session.status,200);
const cookie=session.headers.get('set-cookie').split(';')[0],results=[];
for(const path of ['/check',...['signals','proof','buyer','ghost','luotsi','tradefair','words','radar','hackathon','campaign','deadDeal','caseStudy','pipeline'].map(id=>'/s/'+id)]){
 const r=await fetch(base+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(10000)});
 assert.equal(r.status,200,path);assert(!r.url.includes('/login'),path);results.push({path,status:r.status});
}
assert.equal((await fetch(base+'/api/lead')).status,401);
const leads=await fetch(base+'/api/lead?talk=quality-browser-20261025',{headers:{Cookie:cookie}});assert.equal(leads.status,200);const j=await leads.json();assert(j.leads.length);assert(j.leads.every(l=>Number.isInteger(l.contactCount)));assert('nextCursor' in j);
writeFileSync('audit/repairs14/runtime-results.json',JSON.stringify({at:new Date().toISOString(),mode:'built production server; authenticated page/lead reads; no live inference',results,privateLeadsDeniedWithoutSession:true,savedLeadAndPaginationMetadata:true},null,2));
console.log('PASS 14 active pages, staff authentication, private lead access and cursor/contact metadata');
