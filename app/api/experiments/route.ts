import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { validateExperiment } from "@/lib/experiments";

export async function GET(req:Request) {
  const prefix=new URL(req.url).searchParams.get("prefix")||"";
  if(!/^[-a-z0-9]{1,200}$/.test(prefix))return Response.json({error:"Choose a campaign first."},{status:400});
  const rows=db.prepare("SELECT json,updated FROM campaign_experiments WHERE angle LIKE ? ORDER BY updated DESC LIMIT 500").all(prefix+"%") as {json:string;updated:number}[];
  const total=(db.prepare("SELECT COUNT(*) AS n FROM campaign_experiments WHERE angle LIKE ?").get(prefix+"%") as {n:number}).n;
  return Response.json({total,limit:500,experiments:rows.map(r=>({...JSON.parse(r.json),updated:r.updated}))});
}
export async function POST(req:Request) {
  try {
    const body=await req.text();if(body.length>12000)throw new Error("Experiment result is too large.");
    const input=JSON.parse(body),e=validateExperiment(input);
    const id=createHash("sha256").update(JSON.stringify([e.angle,e.channel,e.cohort,e.mode])).digest("hex");
    db.exec("BEGIN IMMEDIATE");
    try {
      const previous=db.prepare("SELECT json,updated FROM campaign_experiments WHERE id=?").get(id) as {json:string;updated:number}|undefined;
      const json=JSON.stringify(e);
      if(previous&&JSON.parse(previous.json).creative&&JSON.parse(previous.json).creative!==e.creative){db.exec("ROLLBACK");return Response.json({error:"Content changed. Use a new cohort/test name to keep the previous experiment traceable."},{status:409});}
      if(previous?.json===json){db.exec("COMMIT");return Response.json({experiment:{...e,updated:previous.updated}});}
      if(previous&&input.expectedUpdated!==previous.updated){db.exec("ROLLBACK");return Response.json({error:"This result changed. Reload the campaign results before editing the same cohort."},{status:409});}
      const updated=Math.max(Date.now(),(previous?.updated||0)+1);
      db.prepare("INSERT INTO campaign_experiments(id,angle,json,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated=excluded.updated").run(id,e.angle,json,updated);
      db.exec("COMMIT");return Response.json({experiment:{...e,updated}});
    }catch(error){db.exec("ROLLBACK");throw error;}
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
