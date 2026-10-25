import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
process.loadEnvFile(".env.local");
const base=process.env.AUDIT_URL||"http://127.0.0.1:3015";
const login=await fetch(base+"/api/session",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({password:process.env.VELHO_STAFF_PASSWORD})});
assert.equal(login.status,200);const cookie=login.headers.get("set-cookie")!.split(";")[0];
const headers={Origin:base,"Content-Type":"application/json",Cookie:cookie};
const r=await fetch(base+"/api/video/props?company=Kesko",{headers,signal:AbortSignal.timeout(150000)});const p=await r.json();assert.equal(r.status,200,JSON.stringify(p));assert.equal(p.props.findings.length,3);
writeFileSync("audit/video-props.json",JSON.stringify(p.props));
const start=Date.now();
const submitted=await Promise.all(Array.from({length:3},async()=>{const r=await fetch(base+"/api/video",{method:"POST",headers,body:JSON.stringify({props:p.props})});assert([200,202].includes(r.status));return r.json();}));
assert.equal(new Set(submitted.map(j=>j.id)).size,1);
let status;
while(Date.now()-start<300000){const r=await fetch(base+"/api/video?status=1&id="+submitted[0].id,{headers});status=await r.json();if(status.status==="ready"||status.status==="failed")break;await new Promise(r=>setTimeout(r,2000));}
writeFileSync("audit/render-results.json",JSON.stringify({submitted,status,ms:Date.now()-start},null,2));
assert.equal(status?.status,"ready",JSON.stringify(status));
const download=await fetch(base+status.url,{headers});assert.equal(download.headers.get("content-type"),"video/mp4");const bytes=Buffer.from(await download.arrayBuffer());assert(bytes.length>100000);writeFileSync("audit/employee-film.mp4",bytes);
console.log("PASS three render requests share one job; MP4 downloaded",bytes.length,"bytes",Math.round((Date.now()-start)/1000),"s");
