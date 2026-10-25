import { existsSync,readFileSync,appendFileSync,mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { DatabaseSync,backup } from "node:sqlite";

if (!existsSync(".env.local") || !/^VELHO_STAFF_PASSWORD=.+/m.test(readFileSync(".env.local","utf8"))) {
  appendFileSync(".env.local", "\nVELHO_STAFF_PASSWORD="+randomBytes(24).toString("base64url")+"\n");
  console.log("Created a staff password in .env.local. Its value is not printed.");
}
mkdirSync("audit",{recursive:true});
if (!existsSync("audit/audit.db") && existsSync("velho-room.db")) {
  const original=new DatabaseSync("velho-room.db",{readOnly:true});
  try{await backup(original,"audit/audit.db");}finally{original.close();}
}
const child=spawn(process.execPath,["node_modules/next/dist/bin/next",process.argv.includes("--dev")?"dev":"start","-p","3015","--hostname","127.0.0.1"],{
  stdio:"inherit",windowsHide:true,
  env:{...process.env,MODEL_FAST:"anthropic/claude-haiku-5.5",MODEL_WRITE:"anthropic/claude-haiku-5.5",VELHO_DB:"audit/audit.db",VELHO_AUDIT_ID:"velho-employee-20261024",VELHO_AUDIT_LIMIT:process.env.VELHO_AUDIT_LIMIT||"4"}
});
child.on("exit",code=>{process.exitCode=code||0;});
process.on("SIGINT",()=>child.kill("SIGINT"));
