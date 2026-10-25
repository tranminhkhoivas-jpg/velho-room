import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addSpend, db } from "./db";
import { llmJson } from "./llm";
import { dossierBrief } from "./dossier";
import type { Dossier } from "./types";

export type SongPlan = {
  title: string;
  genre: string;
  bpm: number;
  mood: string;
  vocal: string;
  why: string;
  taste: { found: boolean; text: string; url?: string };
  sections: { label: string; start: number; end: number; lines: string[] }[];
  facts: { text: string; url?: string }[];
};
export type SongLine = { text: string; section: string; start: number; end: number };
export type SongMeta = { id: string; duration: number; lines: SongLine[]; sung: string; timing: "listened" | "planned"; cost: number };

export const SONG_DIR = join(process.cwd(), "songs");
const LYRIA = process.env.MODEL_SONG || "google/lyria-3-pro-preview";
const TIMER = process.env.MODEL_LISTEN || "google/gemini-3.8-flash";
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// Research (taste or company vibe) + a source-grounded 60-second song plan. Nothing is generated or sent yet.
export async function planSong(d: Dossier, velho: string, rules: string): Promise<SongPlan> {
  const ceo = d.leadership.find((l) => /CEO|chief executive|toimitusjohtaja|managing director|president/i.test(l.role)) || d.leadership[0];
  const taste = await llmJson<{ found: boolean; text: string; url?: string; vibe: string }>({ purpose: "song:taste", model: "fast", web: 6, maxTokens: 1500, messages: [
    { role: "system", content: "Research public, professional statements only. Never use family, home address, birthplace, health, religion or politics. Return JSON only." },
    { role: "user", content: `Company: ${d.name} (${d.industry || "industry unknown"}, HQ ${d.hq || "unknown"}). ${ceo ? `Executive: ${ceo.name}, ${ceo.role}.` : ""} 1) Has this executive said anything public about music they like (interview, podcast, LinkedIn post)? Only count an explicit statement with a source URL. 2) Describe the company's brand and culture vibe in 15 words from its own website/tone. JSON {"found":true|false,"text":"what they said about music, or empty","url":"source or empty","vibe":"15 words"}` },
  ] });
  const plan = await llmJson<SongPlan>({ purpose: "song:plan", model: "write", maxTokens: 4000, messages: [
    { role: "system", content: `${velho}\n\n${rules}\n\nYou write a 60-second song from Velho to one company. Return JSON only.` },
    { role: "user", content: `DOSSIER:\n${dossierBrief(d)}\n\nMUSIC TASTE RESEARCH: ${JSON.stringify(taste)}\n\nWrite a catchy, warm, slightly playful 60-second song addressed to ${d.name}${ceo ? ` and its ${ceo.role}` : ""}.
- Genre: if a sourced music taste was found, use it and cite it; otherwise pick a genre matching the company vibe ("${taste.vibe}") and industry, and say so plainly in "why".
- Lyrics: 2-4 concrete public facts from the dossier (their stated goals, recent moves) and what Velho could help them explore (finding manual work, building the fix, helping people use it). Facts as the dossier states them; Velho's part as an invitation or question, never a promise, result, price or free offer. No invented problems. Name the company in the chorus. English.
- Structure with exact seconds: Intro 0-6 (no lyrics), Verse 6-22, Chorus 22-34, Verse 34-46, Chorus 46-56, Outro 56-60 (one short line or none). Each lyric line max 9 words; 2-4 lines per section.
- facts: each fact used in the lyrics with its source url.
JSON {"title":"song title","genre":"...","bpm":110,"mood":"3 words","vocal":"e.g. warm female vocals","why":"one sentence why this genre","taste":{"found":${taste.found ? "true" : "false"},"text":${JSON.stringify(taste.text || "")},"url":${JSON.stringify(taste.url || "")}},"sections":[{"label":"Intro","start":0,"end":6,"lines":[]}],"facts":[{"text":"...","url":"..."}]}` },
  ] });
  if (!plan?.title || !Array.isArray(plan.sections) || !plan.sections.some((s) => Array.isArray(s.lines) && s.lines.length)) throw new Error("The song plan was incomplete. Please regenerate.");
  plan.sections = plan.sections.filter((s) => Array.isArray(s.lines) && Number.isFinite(s.start) && Number.isFinite(s.end)).map((s) => ({ ...s, lines: s.lines.filter((l) => typeof l === "string" && l.trim()).slice(0, 4) }));
  plan.facts = (Array.isArray(plan.facts) ? plan.facts : []).filter((f) => typeof f?.text === "string");
  return plan;
}

export const lyriaPrompt = (p: SongPlan) =>
  `${p.genre}, ${p.bpm} BPM, ${p.mood}, ${p.vocal}. A 60-second song titled "${p.title}".\n` +
  p.sections.map((s) => `[${mmss(s.start)} - ${mmss(s.end)}] ${s.label}${s.lines.length ? "\n" + s.lines.join("\n") : " (instrumental)"}`).join("\n");

export const songId = (p: SongPlan) => createHash("sha1").update("song-v1" + JSON.stringify(p)).digest("hex").slice(0, 16);

function ledger(model: string, purpose: string, cost: number | null) {
  db.prepare("INSERT INTO ai_calls (audit, model, purpose, status, cost, created) VALUES (?, ?, ?, ?, ?, ?)").run(process.env.VELHO_AUDIT_ID || "normal", model, purpose, cost === null ? "unknown" : "reported", cost, Date.now());
  if (cost) addSpend(cost);
}

// Lyria via OpenRouter: audio only comes back on a stream, as base64 chunks in delta.audio.data.
async function lyria(prompt: string): Promise<{ mp3: Buffer; sung: string; cost: number | null }> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "Velho Room" },
    body: JSON.stringify({ model: LYRIA, stream: true, modalities: ["text", "audio"], audio: { format: "mp3" }, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(280000),
  });
  if (!res.ok || !res.body) throw new Error(`Song generation failed (${res.status}). Try again later.`);
  const parts: string[] = [];
  let sung = "", cost: number | null = null, buf = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data: {")) continue;
      const j = JSON.parse(line.slice(6));
      if (j.error) throw new Error(`Song generation failed: ${j.error.message}`);
      const delta = j.choices?.[0]?.delta || {};
      if (delta.audio?.data) parts.push(delta.audio.data);
      if (typeof delta.content === "string") sung += delta.content;
      if (typeof j.usage?.cost === "number") cost = j.usage.cost;
    }
  }
  ledger(LYRIA, "song:lyria", cost);
  const mp3 = Buffer.from(parts.join(""), "base64");
  if (mp3.length < 10000) throw new Error("The song came back empty. Try again.");
  return { mp3, sung, cost };
}

// Lyria returns no timings, so a listening model marks when each line is sung. Falls back to the planned seconds.
async function listen(mp3: Buffer, lines: SongLine[]): Promise<{ lines: SongLine[]; duration?: number; cost: number | null; ok: boolean }> {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "Velho Room" },
      body: JSON.stringify({ model: TIMER, messages: [{ role: "user", content: [{ type: "text", text: `Listen to this song. For each numbered lyric line, give the second it starts being sung and when it ends. Lines may be sung slightly differently. Lines in order: ${JSON.stringify(lines.map((l) => l.text))}. Also the total song duration. JSON only: {"lines":[{"i":0,"start":0.0,"end":0.0}],"duration":0}` }, { type: "input_audio", input_audio: { data: mp3.toString("base64"), format: "mp3" } }] }] }),
      signal: AbortSignal.timeout(120000),
    });
    const j = await r.json();
    const cost = typeof j.usage?.cost === "number" ? j.usage.cost : null;
    ledger(TIMER, "song:timing", cost);
    const text: string = j.choices?.[0]?.message?.content || "";
    const t = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { lines: { i: number; start: number; end: number }[]; duration?: number };
    const out = lines.map((l, i) => {
      const x = t.lines?.find((y) => y.i === i);
      return x && Number.isFinite(x.start) && Number.isFinite(x.end) && x.end > x.start ? { ...l, start: x.start, end: x.end } : l;
    });
    // Keep lines in order: a line never starts before the previous one.
    for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].start) out[i] = { ...out[i], start: out[i - 1].end, end: Math.max(out[i].end, out[i - 1].end + 1) };
    return { lines: out, duration: Number.isFinite(t.duration) ? t.duration : undefined, cost, ok: true };
  } catch {
    return { lines, cost: null, ok: false };
  }
}

// mp3 frame duration from the file itself (MPEG-1 Layer III, CBR assumed; fine for Lyria's output).
// ponytail: CBR-only header math; switch to parseMedia if Lyria ever returns VBR.
function mp3Seconds(b: Buffer): number {
  let i = 0;
  if (b.toString("latin1", 0, 3) === "ID3") i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  while (i < b.length - 4 && !(b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0)) i++;
  const kbps = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][b[i + 2] >> 4] || 128;
  return ((b.length - i) * 8) / (kbps * 1000);
}

export async function makeSong(plan: SongPlan): Promise<SongMeta> {
  const id = songId(plan);
  const metaFile = join(SONG_DIR, id + ".json");
  if (existsSync(metaFile)) return JSON.parse(readFileSync(metaFile, "utf8"));
  mkdirSync(SONG_DIR, { recursive: true });
  const { mp3, sung, cost } = await lyria(lyriaPrompt(plan));
  const planned: SongLine[] = plan.sections.flatMap((s) => s.lines.map((text, i) => ({ text, section: s.label, start: s.start + ((s.end - s.start) * i) / s.lines.length, end: s.start + ((s.end - s.start) * (i + 1)) / s.lines.length })));
  const timed = await listen(mp3, planned);
  const duration = Math.round(mp3Seconds(mp3) * 100) / 100;
  // Listened timings drift late over the song; squeeze them so the last line ends before the audio does.
  const k = Math.min(1, (duration - 0.5) / Math.max(...timed.lines.map((l) => l.end)));
  const lines = timed.lines.map((l) => ({ ...l, start: Math.round(l.start * k * 10) / 10, end: Math.round(l.end * k * 10) / 10 }));
  const meta: SongMeta = { id, duration, lines, sung, timing: timed.ok ? "listened" : "planned", cost: (cost || 0) + (timed.cost || 0) };
  writeFileSync(join(SONG_DIR, id + ".partial.mp3"), mp3);
  renameSync(join(SONG_DIR, id + ".partial.mp3"), join(SONG_DIR, id + ".mp3"));
  writeFileSync(metaFile, JSON.stringify(meta));
  return meta;
}
