import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

export const maxDuration = 300;
const DIR = join(process.cwd(), "videos");
const CLI = join(process.cwd(), "node_modules", "@remotion", "cli", "remotion-cli.js");
const run = promisify(execFile);
let queue: Promise<void> = Promise.resolve();

// POST {props} renders the CompanyVideo composition to MP4 once per props (cached on disk).
export async function POST(req: Request) {
  const { props } = await req.json();
  if (!props?.company || !Array.isArray(props.findings)) return Response.json({ error: "props.company and props.findings required" }, { status: 400 });
  // "v4": bump when the composition changes so old renders are not reused
  const id = createHash("sha1").update("v4" + JSON.stringify(props)).digest("hex").slice(0, 16);
  const out = join(DIR, id + ".mp4");
  // Renders run one at a time: they share port 3123, and a second click for the same company reuses the first file.
  const job = (queue = queue.catch(() => {}).then(async () => {
    if (existsSync(out)) return;
    mkdirSync(DIR, { recursive: true });
    const propsFile = join(DIR, id + ".json");
    writeFileSync(propsFile, JSON.stringify(props));
    await run(process.execPath, [CLI, "render", "video/index.tsx", "CompanyVideo", out, `--props=${propsFile}`, "--port=3123"], { timeout: 280000, maxBuffer: 1 << 26 });
  }));
  try {
    await job;
  } catch (e) {
    return Response.json({ error: "Render failed: " + String((e as { stderr?: string }).stderr || e).slice(-500) }, { status: 500 });
  }
  return Response.json({ url: "/api/video?id=" + id });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  const f = join(DIR, id + ".mp4");
  if (!/^[0-9a-f]{16}$/.test(id) || !existsSync(f)) return new Response("not found", { status: 404 });
  return new Response(readFileSync(f), { headers: { "Content-Type": "video/mp4", "Content-Disposition": `attachment; filename="velho-${id}.mp4"` } });
}
