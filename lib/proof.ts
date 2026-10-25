import { webUrl } from "./validation";

export type ProofPage = { url: string; text: string };
export type ProofRecord = { id: string; source: string; excerpt: string };
export type ProofData = { company: string; collectedAt: string; pages: ProofPage[]; records: ProofRecord[]; inputCharacters: number };

// Extract only literal passages, never model-written summaries. IDs remain traceable to a page.
export function buildProof(company: string, pages: ProofPage[], collectedAt = new Date().toISOString()): ProofData {
  const seen = new Set<string>();
  const safe = pages.filter(p => webUrl(p.url) && typeof p.text === "string" && p.text.trim()).slice(0, 5);
  const records: ProofRecord[] = [];
  for (const [page, p] of safe.entries()) {
    let pageRecords = 0;
    for (const part of p.text.split(/\n\s*\n/)) {
      const excerpt = part.trim();
      if(excerpt.split("\n").filter(l=>l.trim()).every(l=>/^\s*#{1,6}\s|^Markdown Content:\s*$/i.test(l)))continue;
      if(/^(please select your country|select (your )?(country|language)|skip to (main|navigation)|accept (all )?cookies|manage (cookie|privacy) (settings|preferences)|all rights reserved)/i.test(excerpt))continue;
      if (excerpt.length < 40 || /^https?:\/\/\S+$/.test(excerpt) || seen.has(excerpt)) continue;
      if (!excerpt.replace(/\[[^\]]*\]\([^)]*\)/g, "").replace(/[#*>|\s_-]+/g, "")) continue;
      if((excerpt.match(/\]\(https?:/g)||[]).length>=2&&excerpt.replace(/\[[^\]]*\]\([^)]*\)/g, "").replace(/[#*>|\s_-]+/g, "").length<40)continue;
      // Keep whole passages. Cutting at an arbitrary position can change the meaning.
      if (excerpt.length > 3000) continue;
      seen.add(excerpt);
      records.push({ id: `P${page + 1}-R${records.length + 1}`, source: p.url, excerpt });
      if (++pageRecords >= 50) break;
    }
    if (records.length >= 250) break;
  }
  return { company, collectedAt, pages: safe, records, inputCharacters: safe.reduce((n, p) => n + p.text.length, 0) };
}

const STOP = new Set("what where when which how can could would does do is are the a an and or of for to in on at your our their company please miten mitä missä milloin voin voi on ja tai yritys yrityksen".split(" "));
export function searchProof(data: ProofData, query: string, excluded = ""): ProofRecord[] {
  const [positive,...negative]=query.toLocaleLowerCase().split(/\b(?:not|except|excluding|without)\b|\bei\b/u);
  const terms = [...new Set(positive.match(/[\p{L}\p{N}]{3,}/gu) || [])].filter(t => !STOP.has(t));
  const exclusions=[...negative,excluded.toLocaleLowerCase()].join(" ").match(/[\p{L}\p{N}]{3,}/gu)?.filter(t=>!STOP.has(t)&&!terms.includes(t))||[];
  if (!terms.length) return [];
  const ranked = data.records.filter(r=>!exclusions.some(t=>r.excerpt.toLocaleLowerCase().includes(t))).map(record => {
    const text = record.excerpt.toLocaleLowerCase();
    const hits = terms.filter(t => text.includes(t));
    return { record, score: hits.length / terms.length };
  }).filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score || Math.min(b.record.excerpt.length,1000)-Math.min(a.record.excerpt.length,1000));
  return ranked.filter(x=>x.score===ranked[0]?.score).slice(0,3).map(x=>x.record);
}

export function proofReply(records: ProofRecord[]): string {
  if (!records.length) return "No matching passage in the collected public pages. A staff member needs to check another source before answering.";
  return "Public information relevant to your enquiry (exact excerpts; staff review required):\n\n" + records.map(r => `[${r.id}] “${r.excerpt}”\nSource: ${r.source}`).join("\n\n");
}

export function proofCsv(records: ProofRecord[]): string {
  const cell = (s: string) => '"' + (/^[\s]*[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
  return "\ufeff" + [["Record", "Exact passage", "Source"], ...records.map(r => [r.id, r.excerpt, r.source])].map(row => row.map(cell).join(",")).join("\r\n");
}
