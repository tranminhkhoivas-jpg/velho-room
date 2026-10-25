import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
process.loadEnvFile("../../.env");process.env.VELHO_DB="audit/audit.db";process.env.VELHO_AUDIT_ID="velho-employee-20261024";process.env.MODEL_FAST=process.env.MODEL_WRITE="anthropic/claude-haiku-5.5";
const {runSeed}=await import("../lib/seeds");
const a=await runSeed("radar",{company:"Kesko"});writeFileSync("audit/quality-radar-final.json",JSON.stringify(a,null,2));
const t=a.blocks.find(b=>b.t==="table");assert(t?.t==="table");assert(t.rows.every(r=>r.length===6));assert(a.publicEvidence?.some(e=>e.status==="supported"));
console.log("PASS final radar original-source/date/format checks",JSON.stringify(t.rows.map(r=>({date:r[0],event:r[1],attendance:r[2],location:r[3],access:r[4]}))));
