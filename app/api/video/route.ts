import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, renameSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { SONG_DIR } from "@/lib/song";

export const maxDuration = 300;
const DIR = join(process.cwd(), "videos");
const CLI = join(process.cwd(), "node_modules", "@remotion", "cli", "remotion-cli.js");
const run = promisify(execFile);
let queue: Promise<void> = Promise.resolve();
const jobs = new Map<string, {status:"queued"|"rendering"|"ready"|"failed";error?:string}>();

// POST {props} renders the CompanyVideo composition to MP4 once per props (cached on disk).
export async function POST(req: Request) {
  const { props, composition } = await req.json();
  if (composition === "LyricVideo") return lyric(props);
  if (!props?.company || !Array.isArray(props.findings) || !Array.isArray(props.signals) || !props.quote || !/^#[a-fA-F0-9]{6}$/.test(props.accent || "") || typeof props.shot !== "string" || (props.shot && !/^data:image\/(jpeg|png|webp);base64,/.test(props.shot))) return Response.json({ error: "Valid film props required. Reopen the media preview." }, { status: 400 });
  // "v6": bump when the composition changes so old renders are not reused
  return render("v6", "CompanyVideo", props, [], props);
}

function render(version: string, composition: string, props: unknown, flags: string[], renderProps: unknown) {
  const id = createHash("sha1").update(version + JSON.stringify(props)).digest("hex").slice(0, 16);
  const out = join(DIR, id + ".mp4");
  const partial = join(DIR, id + ".partial.mp4");
  if (existsSync(out) && !jobs.has(id)) return Response.json({url:"/api/video?id="+id,id,status:"ready"});
  if (jobs.has(id) && jobs.get(id)!.status !== "failed") return Response.json({id,...jobs.get(id),...(jobs.get(id)!.status === "ready" ? {url:"/api/video?id="+id}:{})});
  jobs.set(id,{status:"queued"});
  // Renders run one at a time: they share port 3123, and a second click for the same company reuses the first file.
  const job = (queue = queue.catch(() => {}).then(async () => {
    jobs.set(id,{status:"rendering"});
    mkdirSync(DIR, { recursive: true });
    const propsFile = join(DIR, id + ".json");
    writeFileSync(propsFile, JSON.stringify(renderProps));
    await run(process.execPath, [CLI, "render", "video/index.tsx", composition, partial, `--props=${propsFile}`, "--port=3123", ...flags], { timeout: 280000, maxBuffer: 1 << 26 });
    renameSync(partial,out);
    jobs.set(id,{status:"ready"});
  }));
  void job.catch(() => {
    if (existsSync(partial)) unlinkSync(partial);
    jobs.set(id,{status:"failed",error:"Rendering failed. Retry once; if it repeats, use the report and postcard while checking the server log."});
  });
  return Response.json({id,status:"queued"},{status:202});
}

// Lyric music video: the song file is inlined as a data URL because the renderer cannot pass staff sign-in.
function lyric(props: Record<string, unknown>) {
  const song = typeof props?.audio === "string" ? props.audio.match(/^\/api\/song\?id=([0-9a-f]{16})$/)?.[1] : undefined;
  const mp3 = song && join(SONG_DIR, song + ".mp3");
  if (!mp3 || !existsSync(mp3) || typeof props.company !== "string" || typeof props.title !== "string" || !Array.isArray(props.lines) || !(Number(props.duration) > 0) || !/^#[a-fA-F0-9]{6}$/.test(String(props.accent)) || typeof props.shot !== "string" || (props.shot && !/^data:image\/(jpeg|png|webp);base64,/.test(props.shot))) return Response.json({ error: "Make the song first, then render its video." }, { status: 400 });
  return render("lyric-v3", "LyricVideo", props, ["--crf=26"], { ...props, audio: "data:audio/mpeg;base64," + readFileSync(mp3).toString("base64") });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (new URL(req.url).searchParams.has("status")) {
    if (!/^[0-9a-f]{16}$/.test(id)) return Response.json({error:"Invalid render id"},{status:400});
    const job = jobs.get(id);
    if (job) return Response.json({id,...job,...(job.status === "ready" ? {url:"/api/video?id="+id}:{})});
    return Response.json(existsSync(join(DIR,id+".mp4")) ? {id,status:"ready",url:"/api/video?id="+id}:{id,status:"failed",error:"The server restarted. Render the film again."});
  }
  const f = join(DIR, id + ".mp4");
  if (!/^[0-9a-f]{16}$/.test(id) || !existsSync(f)) return new Response("not found", { status: 404 });
  return new Response(readFileSync(f), { headers: { "Content-Type": "video/mp4", "Content-Disposition": `attachment; filename="velho-${id}.mp4"` } });
}
