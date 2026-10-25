import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runSeed } from "@/lib/seeds";
import { makeSong, SONG_DIR } from "@/lib/song";

export const maxDuration = 300;
let queue: Promise<unknown> = Promise.resolve();
const jobs = new Map<string, { status: "queued" | "making" | "ready" | "failed"; error?: string }>();
const valid = (id: string) => /^[0-9a-f]{16}$/.test(id);

// POST {company}: sing the cached song plan with Lyria (one song at a time; same plan reuses the file).
export async function POST(req: Request) {
  const { company } = await req.json();
  const a = await runSeed("song", { company });
  if (!a.song) return Response.json({ error: "Make the song plan first." }, { status: 400 });
  const { id, plan } = a.song;
  if (existsSync(join(SONG_DIR, id + ".json")) && !jobs.has(id)) return Response.json({ id, status: "ready" });
  if (jobs.has(id) && jobs.get(id)!.status !== "failed") return Response.json({ id, ...jobs.get(id) });
  jobs.set(id, { status: "queued" });
  const job = (queue = queue.catch(() => {}).then(async () => { jobs.set(id, { status: "making" }); await makeSong(plan); jobs.set(id, { status: "ready" }); }));
  void job.catch((e) => jobs.set(id, { status: "failed", error: (e as Error).message || "Song generation failed. Try again." }));
  return Response.json({ id, status: "queued" }, { status: 202 });
}

// GET ?id&status | ?id&meta | ?id (the mp3)
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, id = q.get("id") || "";
  if (!valid(id)) return Response.json({ error: "Invalid song id" }, { status: 400 });
  const meta = join(SONG_DIR, id + ".json"), mp3 = join(SONG_DIR, id + ".mp3");
  if (q.has("status")) return Response.json(jobs.get(id) ? { id, ...jobs.get(id) } : existsSync(meta) ? { id, status: "ready" } : { id, status: "failed", error: "The server restarted. Make the song again." });
  if (q.has("meta")) return existsSync(meta) ? new Response(readFileSync(meta), { headers: { "Content-Type": "application/json" } }) : new Response("not found", { status: 404 });
  if (!existsSync(mp3)) return new Response("not found", { status: 404 });
  return new Response(readFileSync(mp3), { headers: { "Content-Type": "audio/mpeg", "Content-Disposition": `inline; filename="velho-song-${id}.mp3"` } });
}
