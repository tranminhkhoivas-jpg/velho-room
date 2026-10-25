import { db } from "@/lib/db";

// Campaign engine thumbs: stored per angle id, used client-side to re-rank (Beta-mean bandit)
export async function POST(req: Request) {
  let input;try{input=await req.json();}catch{return Response.json({error:"Invalid feedback."},{status:400});}
  const {angle,up}=input||{};
  if(typeof angle!=="string"||!/^[-a-z0-9]{1,200}$/.test(angle)||typeof up!=="boolean")return Response.json({error:"Choose a valid angle and a thumbs-up/down preference."},{status:400});
  db.prepare("INSERT INTO feedback (angle, up, down) VALUES (?, ?, ?) ON CONFLICT(angle) DO UPDATE SET up = up + excluded.up, down = down + excluded.down").run(angle, up ? 1 : 0, up ? 0 : 1);
  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const prefix = new URL(req.url).searchParams.get("prefix") || "";
  const rows = db.prepare("SELECT angle, up, down FROM feedback WHERE angle LIKE ?").all(prefix + "%") as { angle: string; up: number; down: number }[];
  return Response.json({ feedback: Object.fromEntries(rows.map((r) => [r.angle, { up: r.up, down: r.down }])) });
}
