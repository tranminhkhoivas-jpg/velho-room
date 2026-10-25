import { cacheGet, cacheSet } from "@/lib/db";
import { dossierSources, getDossier } from "@/lib/dossier";
import { runSeed } from "@/lib/seeds";
import type { VideoProps } from "@/video/CompanyVideo";

export const maxDuration = 300;

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)) + "…");

const COOKIE = "[id*=cookie i], [class*=cookie i], [id*=consent i], [class*=consent i], #onetrust-consent-sdk, #CybotCookiebotDialog, #usercentrics-root, .cc-window, [aria-modal=true]";

// Microlink (free, no key, blocks cookie banners); Jina Reader as fallback, which misses some banners (e.g. kesko.fi).
async function shotUrl(url: string): Promise<Response> {
  try {
    const q = new URLSearchParams({ url, screenshot: "true", meta: "false", "viewport.width": "1440", "viewport.height": "900", "viewport.deviceScaleFactor": "1", "screenshot.type": "jpeg" });
    const j = await (await fetch("https://api.microlink.io/?" + q, { signal: AbortSignal.timeout(60000) })).json();
    if (j.data?.screenshot?.url) return await fetch(j.data.screenshot.url, { signal: AbortSignal.timeout(30000) });
  } catch {}
  // Jina answers with either the image itself or a link to it.
  const res = await fetch("https://r.jina.ai/" + url, { headers: { "X-Return-Format": "screenshot", "X-Remove-Selector": COOKIE, "X-No-Cache": "true" }, signal: AbortSignal.timeout(60000) });
  return res.headers.get("content-type")?.startsWith("image/") ? res : await fetch((await res.text()).trim(), { signal: AbortSignal.timeout(30000) });
}

// Homepage screenshot, kept as a data URL so the render does not depend on an expiring link.
async function screenshot(url: string): Promise<string> {
  const key = "shot2:" + url;
  const hit = cacheGet<string>(key, 7 * 864e5);
  if (hit) return hit;
  try {
    const img = await shotUrl(url);
    if (!img.ok) return "";
    const data = `data:${img.headers.get("content-type") || "image/png"};base64,` + Buffer.from(await img.arrayBuffer()).toString("base64");
    cacheSet(key, data);
    return data;
  } catch {
    return "";
  }
}

// GET ?company= builds the video's props from the cached dossier and one-of-one media report (no new writing).
export async function GET(req: Request) {
  const company = new URL(req.url).searchParams.get("company") || "";
  if (!company) return Response.json({ error: "company required" }, { status: 400 });
  try {
    const d = await getDossier(company);
    const m = await runSeed("media", { company });
    const card = m.blocks.find((b) => b.t === "postcard");
    const back = card?.t === "postcard" ? card.back : "";
    const quote = d.goals.find((g) => g.speaker && /,/.test(g.speaker) && /CEO|chief|president|director|CIO|CFO|COO/i.test(g.speaker)) || d.goals[0];
    const signals = d.signals
      .filter((s) => /^\d{4}-\d{2}/.test(s.date || ""))
      .sort((a, b) => (b.date! > a.date! ? 1 : -1))
      .slice(0, 4)
      .reverse()
      .map((s) => ({ date: s.date!, type: s.type, text: clip(s.text, 120), source: s.url ? new URL(s.url).hostname.replace(/^www\./, "") : "" }));
    const findings = m.blocks.flatMap((b,i) => {
      if (b.t !== "h") return [];
      const ev = m.blocks.slice(i+1).find((x)=>x.t === "list" || x.t === "h");
      return [{title:clip(b.text.replace(/^\d+[.)]\s*/,""),85),fact:ev?.t==="list"?clip(ev.items[0]?.text||"",130):""}];
    }).slice(0,3);
    for (const s of d.signals) {
      if (findings.length>=3) break;
      findings.push({title:clip(s.text,85),fact:clip(`${s.date || "Date not confirmed"} · ${s.url || "Source not available"}`,130)});
    }
    if (findings.length<3) throw new Error("Not enough sourced findings for a three-part film. Use the report or refresh company research.");
    const props: VideoProps = {
      company: d.name.replace(/\s+(Oyj|Oy|Abp|Ab|plc)$/i, "") || company,
      domain: d.website ? new URL(d.website).hostname.replace(/^www\./, "") : "",
      oneLiner: clip(d.oneLiner, 150),
      shot: d.website ? await screenshot(d.website) : "",
      accent: "#f2b544",
      sources: dossierSources(d).length,
      signals,
      quote: quote ? { text: clip(quote.text, 170), speaker: clip(quote.speaker || "Company public materials", 70), paraphrase:true } : { text: "No public priority was found; ask the company directly.", speaker: "Research limitation", paraphrase:true },
      // each report heading plus the first evidence line under it
      findings,
      // the note's question, minus lead-ins like "Genuinely curious:"
      question: clip((back.match(/[^.!?]*\?/)?.[0].replace(/^.*:\s*/, "").trim() || (card?.t === "postcard" ? card.front : m.title)).replace(/^\w/, (c) => c.toUpperCase()), 140),
    };
    return Response.json({ props,sources:dossierSources(d) });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
