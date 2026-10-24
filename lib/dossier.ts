import { cacheGet, cacheSet } from "./db";
import { llmJson, readUrl } from "./llm";
import type { Dossier, Fact } from "./types";

const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/\b(oyj|oy|ab|abp|ltd|plc|inc|group)\b/g, "").replace(/[^a-z0-9åäö]+/g, " ").trim();

type WebResearch = Omit<Dossier, "query" | "registry" | "tenders" | "siteText" | "builtAt">;

async function webResearch(query: string): Promise<WebResearch> {
  return llmJson<WebResearch>({
    model: "fast",
    web: 8,
    maxTokens: 14000,
    messages: [
      {
        role: "system",
        content:
          "You are a B2B research analyst for Velho, a Finnish AI and automation growth partner. Research the company using web search. Only state facts you found; every fact needs the source url and a date (YYYY-MM-DD or YYYY-MM) when known. Mark anything you inferred with inferred:true. Keep every text field under 200 characters. Reply with one JSON object only, no markdown.",
      },
      {
        role: "user",
        content: `Company: "${query}". Today is ${today()}.
Return JSON:
{"name": official name, "website": url, "businessId": Finnish Y-tunnus if found, "oneLiner": what they do in one sentence, "industry": string, "sizeHint": revenue/employees with year, "hq": city,
"leadership": [{"name","role","url"}] (CEO, CFO, COO, head of operations; max 6),
"signals": [{"type": "leadership|expansion|hiring|funding|acquisition|investment|tender|news|results","text","url","date","why": why this is a reason for an AI/automation partner to reach out NOW}] (max 10, newest first, last 18 months),
"goals": [{"text": exact quote or close paraphrase of a stated strategic goal or priority,"speaker","url","date"}] (max 6, prefer exec quotes from interviews, annual reports, CEO letters),
"manualWorkClues": [{"text": public evidence of manual work, e.g. job ads for data entry, order handling, invoicing, coordinators, Excel,"url","date","inferred"}] (max 8),
"annualReportUrl": direct url to latest annual report or financial statement PDF if any}`,
      },
    ],
  });
}

type PrhCompany = {
  businessId: { value: string; registrationDate?: string };
  names: { name: string; registrationDate?: string; endDate?: string }[];
  mainBusinessLine?: { descriptions: { languageCode: string; description: string }[] };
  companyForms?: { descriptions: { languageCode: string; description: string }[]; endDate?: string }[];
  companySituations?: { type: string; registrationDate?: string }[];
  registrationDate?: string;
  lastModified?: string;
};

async function prh(nameOrId: string): Promise<Dossier["registry"] | undefined> {
  const isId = /^\d{7}-\d$/.test(nameOrId);
  const url = `https://avoindata.prh.fi/opendata-ytj-api/v3/companies?${isId ? "businessId" : "name"}=${encodeURIComponent(nameOrId)}`;
  try {
    const j = (await (await fetch(url, { signal: AbortSignal.timeout(15000) })).json()) as { companies?: PrhCompany[] };
    const list = j.companies || [];
    const current = (c: PrhCompany) => c.names.find((n) => !n.endDate)?.name || c.names[0]?.name || "";
    // prefer a company whose CURRENT name matches the query; PRH name search also hits historical names
    const c = list.find((c) => norm(current(c)) === norm(nameOrId)) || list.find((c) => norm(current(c)).startsWith(norm(nameOrId))) || (isId ? list[0] : undefined);
    if (!c) return undefined;
    const en = (d?: { descriptions: { languageCode: string; description: string }[] }) => d?.descriptions.find((x) => x.languageCode === "3")?.description;
    const changes: Fact[] = c.names
      .filter((n) => n.registrationDate && n.registrationDate > "2023")
      .map((n) => ({ text: `Name registered: ${n.name}`, date: n.registrationDate, url: `https://tietopalvelu.ytj.fi/yritys/${c.businessId.value}` }));
    for (const s of c.companySituations || [])
      changes.push({ text: `Company situation entry type ${s.type}`, date: s.registrationDate, url: `https://tietopalvelu.ytj.fi/yritys/${c.businessId.value}` });
    return {
      businessId: c.businessId.value,
      name: current(c),
      industry: en(c.mainBusinessLine),
      registered: c.businessId.registrationDate,
      form: en(c.companyForms?.find((f) => !f.endDate)),
      changes,
    };
  } catch {
    return undefined;
  }
}

async function ted(name: string): Promise<Fact[]> {
  const n = name.replace(/\b(Oyj|Oy|Ab|Abp)\b/g, "").trim().replace(/"/g, "");
  try {
    const res = await fetch("https://api.ted.europa.eu/v3/notices/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `(winner-name ~ "${n}" OR buyer-name ~ "${n}") AND publication-date>=20250101`,
        fields: ["publication-number", "notice-title", "buyer-name", "winner-name", "publication-date"],
        limit: 15,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = (await res.json()) as { notices?: Record<string, unknown>[] };
    const first = (v: unknown) => (v && typeof v === "object" ? (Object.values(v as Record<string, string[]>)[0]?.[0] ?? "") : String(v ?? ""));
    const pick = (v: unknown) => (v && typeof v === "object" ? ((v as Record<string, string>).eng ?? first(v)) : String(v ?? ""));
    // TED's ~ match is fuzzy; keep notices where the full name really appears as buyer or winner
    const needle = n.toLowerCase();
    return (j.notices || [])
      .filter((x) => JSON.stringify([x["buyer-name"], x["winner-name"]]).toLowerCase().includes(needle))
      .slice(0, 5)
      .map((x) => ({
        text: `${pick(x["notice-title"])} — buyer: ${first(x["buyer-name"])}${JSON.stringify(x["winner-name"] ?? "").toLowerCase().includes(needle) ? " (company listed as winner)" : ""}`,
        date: String(x["publication-date"]).slice(0, 10),
        url: `https://ted.europa.eu/en/notice/-/detail/${x["publication-number"]}`,
      }));
  } catch {
    return [];
  }
}

export async function getDossier(query: string, fresh = false): Promise<Dossier> {
  const key = "dossier:" + norm(query);
  if (!fresh) {
    const hit = cacheGet<Dossier>(key);
    if (hit) return hit;
  }
  const [web, reg0] = await Promise.all([webResearch(query), prh(query)]);
  web.businessId = web.businessId?.match(/\d{7}-\d/)?.[0];
  const reg = reg0 || (web.businessId ? await prh(web.businessId) : undefined) || (web.name ? await prh(web.name) : undefined);
  const [tenders, siteText] = await Promise.all([ted(reg?.name || web.name || query), web.website ? readUrl(web.website, 8000) : Promise.resolve("")]);
  const d: Dossier = {
    query,
    ...web,
    name: reg?.name || web.name || query,
    businessId: reg?.businessId || web.businessId,
    leadership: web.leadership || [],
    signals: web.signals || [],
    goals: web.goals || [],
    manualWorkClues: web.manualWorkClues || [],
    registry: reg,
    tenders,
    siteText,
    builtAt: new Date().toISOString(),
  };
  cacheSet(key, d);
  return d;
}

// Compact text version of the dossier for prompts.
export function dossierBrief(d: Dossier, withSite = false): string {
  const f = (x: { text: string; url?: string; date?: string }) => `- ${x.text}${x.date ? ` (${x.date})` : ""}${x.url ? ` [${x.url}]` : ""}`;
  return [
    `COMPANY: ${d.name}${d.businessId ? ` (Y-tunnus ${d.businessId})` : ""} — ${d.oneLiner}`,
    `Industry: ${d.industry || d.registry?.industry || "?"}; size: ${d.sizeHint || "?"}; HQ: ${d.hq || "?"}; website: ${d.website || "?"}`,
    `Leadership:\n${d.leadership.map((l) => `- ${l.name}, ${l.role}${l.url ? ` [${l.url}]` : ""}`).join("\n") || "- unknown"}`,
    `Signals:\n${d.signals.map((s) => f({ ...s, text: `[${s.type}] ${s.text}${s.why ? ` — why now: ${s.why}` : ""}` })).join("\n") || "- none found"}`,
    `Stated goals:\n${d.goals.map((g) => f({ ...g, text: `"${g.text}"${g.speaker ? ` — ${g.speaker}` : ""}` })).join("\n") || "- none found"}`,
    `Manual-work clues:\n${d.manualWorkClues.map((m) => f({ ...m, text: m.text + (m.inferred ? " (inferred)" : "") })).join("\n") || "- none found"}`,
    `Register changes:\n${d.registry?.changes.map(f).join("\n") || "- none"}`,
    `EU tenders (TED):\n${d.tenders.map(f).join("\n") || "- none"}`,
    withSite && d.siteText ? `Website text (excerpt):\n${d.siteText.slice(0, 5000)}` : "",
  ].join("\n");
}

export function dossierSources(d: Dossier) {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  const add = (title: string, url?: string) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push({ title, url });
    }
  };
  add("Website", d.website);
  if (d.registry) add("Finnish Trade Register (PRH/YTJ)", `https://tietopalvelu.ytj.fi/yritys/${d.registry.businessId}`);
  for (const s of d.signals) add(s.text.slice(0, 80), s.url);
  for (const g of d.goals) add(g.text.slice(0, 80), g.url);
  for (const m of d.manualWorkClues) add(m.text.slice(0, 80), m.url);
  for (const t of d.tenders) add(t.text.slice(0, 80), t.url);
  return out;
}
