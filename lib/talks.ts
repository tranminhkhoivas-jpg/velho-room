import { llmJson, readUrl } from "./llm";
import { extractTalk, checkClaims, type Entity } from "./fastino";
import { inDateWindow } from "./public-evidence";
import type { Dossier } from "./types";

export type TalkSpan = { label: string; text: string; confidence: number; at?: number; verified?: boolean };
export type Talk = { title: string; url: string; speaker: string; date?: string; kind: string; source: "captions" | "page" | "none"; spans: TalkSpan[]; note?: string };

const KEY = /goal|strateg|priorit|challenge|problem|growth|cost|efficien|automat|\bAI\b|digital|invest|customer|profit|tavoite|strategia|haaste|kasvu|tekoäly|kustann|tehokk|asiakas|investoin/gi;

// ponytail: unofficial YouTube player endpoint (Android client); breaks if YouTube changes it. Upgrade: YouTube Data API captions with OAuth.
async function captions(id: string): Promise<{ text: string; marks: { at: number; ms: number }[] } | null> {
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)" }, body: JSON.stringify({ videoId: id, context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34, hl: "en" } } }), signal: AbortSignal.timeout(20000) });
    const tracks: { languageCode: string; kind?: string; baseUrl: string }[] = (await r.json()).captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    // Human captions before auto captions; English or Finnish before anything else.
    const rank = (t: (typeof tracks)[0]) => (t.kind === "asr" ? 2 : 0) + (/^(en|fi)/.test(t.languageCode) ? 0 : 1);
    const t = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
    if (!t) return null;
    const j = await (await fetch(t.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3", { signal: AbortSignal.timeout(20000) })).json();
    let text = "";
    const marks: { at: number; ms: number }[] = [];
    for (const e of j.events || []) {
      const s = (e.segs || []).map((x: { utf8?: string }) => x.utf8 || "").join("").replace(/\s+/g, " ").trim();
      if (!s) continue;
      marks.push({ at: text.length, ms: e.tStartMs || 0 });
      text += s + " ";
    }
    return text.trim() ? { text, marks } : null;
  } catch {
    return null;
  }
}

// The densest ~5,800-character stretch of priority/strategy talk, so GLiNER sees the substance, not the intro.
function bestChunk(text: string, size = 5800): number {
  if (text.length <= size) return 0;
  let best = 0, bestScore = -1;
  for (let start = 0; start < text.length; start += 1000) {
    const score = (text.slice(start, start + size).match(KEY) || []).length;
    if (score > bestScore) { best = start; bestScore = score; }
  }
  return Math.min(best, text.length - size);
}

const ytId = (url: string) => url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1];

// Unlabelled captions remain useful research topics, but cannot establish who said them.
export function speakerTurn(text:string,at:number,name:string):string|null {
  const labels=[...text.matchAll(/(?:^|[\n.!?]\s+)([\p{L}][\p{L} .,'’–-]{1,90}):\s*/gu)];
  const before=labels.filter(m=>m.index!+m[0].length<=at).pop();
  if(!before)return null;
  const parts=name.toLocaleLowerCase().match(/[\p{L}]{2,}/gu)||[];
  if(parts.length<2||!parts.every(p=>before[1].toLocaleLowerCase().includes(p)))return null;
  const next=labels.find(m=>m.index!>before.index!);
  return text.slice(before.index!,Math.min(next?.index??text.length,before.index!+6000));
}

// Public talks, podcasts and interview transcripts by the company's executives -> exact GLiNER 2.5 spans.
export async function talkInsights(d: Dossier): Promise<Talk[]> {
  const r = await llmJson<{ talks: { title: string; url: string; speaker: string; date?: string; kind: string }[] }>({ purpose: "words:talks", model: "fast", web: 8, maxTokens: 3000, messages: [
    { role: "system", content: "Find public recordings or full transcripts of named company executives speaking. Return JSON only; never invent URLs." },
    { role: "user", content: `Company: ${d.name}. Leadership: ${JSON.stringify(d.leadership)}. Find up to 3 public talks, keynotes, panel appearances, podcast episodes or long interviews from the last 36 months where the CEO, CFO or COO speaks at length about strategy or operations. Prefer YouTube videos (they have captions) and pages with a full transcript. Exclude short press quotes. JSON: {"talks":[{"title":"...","url":"exact video or transcript page","speaker":"full name and role","date":"YYYY-MM-DD or empty","kind":"keynote|podcast|interview|panel|earnings call"}]}. Empty list if none.` },
  ] });
  const out: Talk[] = [];
  for (const t of (Array.isArray(r.talks) ? r.talks : []).slice(0, 3)) {
    if (![t.title, t.url, t.speaker].every((x) => typeof x === "string" && x.trim()) || !/^https?:\/\//.test(t.url)) continue;
    const talk: Talk = { title: t.title, url: t.url, speaker: t.speaker, date: t.date || undefined, kind: t.kind || "talk", source: "none", spans: [] };
    const today=Date.parse(new Date().toISOString().slice(0,10));
    if(!inDateWindow(t.date||"",today-1096*864e5,today)){talk.note="Date missing or outside the last 36 months; excluded from executive-based drafts.";out.push(talk);continue;}
    const id = ytId(t.url);
    const cap = id ? await captions(id) : null;
    const text = cap?.text || (id ? "" : await readUrl(t.url, 200000));
    if (!text || text.length < 400) { talk.note = "No captions or transcript text could be read."; out.push(talk); continue; }
    talk.source = cap ? "captions" : "page";
    const start = bestChunk(text);
    let found: Entity[];
    try { found = await extractTalk(text.slice(start, start + 5800)); }
    catch (e) { talk.note = (e as Error).message; out.push(talk); continue; }
    const seen = new Set<string>();
    for (const x of found.sort((a, b) => b.confidence - a.confidence).slice(0,12)) {
      const k = x.label + ":" + x.text.toLowerCase();
      // Drop weak spans, numberless "metrics" and the company's own name posing as an initiative.
      if (seen.has(k) || x.text.length < 3 || x.confidence < 0.75 || (x.label === "metric" && !/\d/.test(x.text)) || d.name.toLowerCase().includes(x.text.toLowerCase().replace(/\s+(oyj?|abp?)$/, ""))) continue;
      seen.add(k);
      const at = cap ? Math.floor((cap.marks.filter((m) => m.at <= start + x.start).pop()?.ms || 0) / 1000) : undefined;
      const leader=d.leadership.find(l=>t.speaker.toLocaleLowerCase().includes(l.name.toLocaleLowerCase()));
      const turn=leader?speakerTurn(text,start+Array.from(text.slice(start,start+5800)).slice(0,x.start).join("").length,leader.name):null;
      let verified=false;
      if(turn)try{verified=(await checkClaims(turn,[`${leader!.name} personally states and endorses this position (not a host question, another person's claim, hypothetical or disagreement): ${x.text}`]))[0].verdict==="supported";}catch{}
      talk.spans.push({ label: x.label, text: x.text, confidence: x.confidence, at, verified });
    }
    talk.spans = talk.spans.slice(0, 12);
    out.push(talk);
  }
  return out;
}

export const talkLink = (t: Talk, s: TalkSpan) => (s.at !== undefined && ytId(t.url) ? `https://www.youtube.com/watch?v=${ytId(t.url)}&t=${s.at}s` : t.url);
