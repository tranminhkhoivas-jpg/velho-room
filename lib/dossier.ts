import { cacheGet, cacheSet, db } from "./db";
import { llmJson, readUrl } from "./llm";
import type { Dossier, Fact } from "./types";
import { textInput, webUrl } from "./validation";

const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/\b(oyj|oy|ab|abp|ltd|plc|inc|group)\b/g, "").replace(/[^a-z0-9åäö]+/g, " ").trim();
const legalName = (s:string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const parties = (v:unknown):string[] => typeof v==="string"?[v]:Array.isArray(v)?v.flatMap(parties):v && typeof v==="object"?Object.values(v).flatMap(parties):[];
const matchingParties = (v:unknown,name:string) => parties(v).filter(p=>legalName(p)===legalName(name)||legalName(p).startsWith(legalName(name)+" "));

type WebResearch = Omit<Dossier, "query" | "registry" | "tenders" | "siteText" | "builtAt">;

async function webResearch(query: string): Promise<WebResearch> {
  return llmJson<WebResearch>({
    model: "fast",
    web: 8,
    purpose: "research:"+query,
    maxTokens: 14000,
    messages: [
      {
        role: "system",
        content:
          "You are a B2B research analyst for Velho, a Finnish AI and automation growth partner. Research the company using web search. Only state facts you found; every fact needs the specific source page URL and a date (YYYY-MM-DD or YYYY-MM) when known. Prefer current official management pages and dated appointment notices for leadership; an old partner press release is not current leadership evidence. Prefer newer official announcements when dates conflict. Separate proposed transactions from completed ones. Mark anything you inferred with inferred:true. Keep every text field under 200 characters. Reply with one JSON object only, no markdown.",
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

export async function prh(nameOrId: string): Promise<Dossier["registry"] | undefined> {
  const isId = /^\d{7}-\d$/.test(nameOrId);
  const url = `https://avoindata.prh.fi/opendata-ytj-api/v3/companies?${isId ? "businessId" : "name"}=${encodeURIComponent(nameOrId)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Register request failed");
    const j = (await response.json()) as { companies?: PrhCompany[] };
    const list = j.companies || [];
    const current = (c: PrhCompany) => c.names.find((n) => !n.endDate)?.name || c.names[0]?.name || "";
    // prefer a company whose CURRENT name matches the query; PRH name search also hits historical names
    const exact = list.find((c) => norm(current(c)) === norm(nameOrId));
    const prefixes = list.filter((c) => norm(current(c)).startsWith(norm(nameOrId)));
    if (!isId && !exact && prefixes.length > 1) throw new Error("Several companies match this name. Use the full registered name or business ID: " + prefixes.slice(0,4).map(current).join("; "));
    const c = exact || prefixes[0] || (isId ? list[0] : undefined);
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
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Several companies match")) throw e;
    throw new Error("Trade register is temporarily unavailable.");
  }
}

async function ted(name: string): Promise<Fact[]|null> {
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
    if (!res.ok) return null;
    const j = (await res.json()) as { notices?: Record<string, unknown>[] };
    const first = (v: unknown) => (v && typeof v === "object" ? (Object.values(v as Record<string, string[]>)[0]?.[0] ?? "") : String(v ?? ""));
    const pick = (v: unknown) => (v && typeof v === "object" ? ((v as Record<string, string>).eng ?? first(v)) : String(v ?? ""));
    // Keep the legal suffix: Kesko AB is not proof of an award to Kesko Oyj.
    return (j.notices || [])
      .filter((x) => matchingParties(x["buyer-name"],name).length || matchingParties(x["winner-name"],name).length)
      .slice(0, 5)
      .map((x) => ({
        text: `${pick(x["notice-title"])} — named buyer: ${matchingParties(x["buyer-name"],name).join("; ") || parties(x["buyer-name"]).join("; ")}; matched winner: ${matchingParties(x["winner-name"],name).join("; ") || "none"}. Name match only; verify legal identity and awarded lot in the notice.`,
        date: String(x["publication-date"]).slice(0, 10),
        url: `https://ted.europa.eu/en/notice/-/detail/${x["publication-number"]}`,
      }));
  } catch {
    return null;
  }
}

export async function getDossier(query: string, fresh = false): Promise<Dossier> {
  query = textInput(query, "Company");
  const key = "dossier:" + norm(query);
  if (!fresh) {
    const hit = cacheGet<Dossier>(key);
    if (hit && hit.tenderMatchVersion===2) return hit;
  }
  let registryUnavailable = false;
  const lookup = async (name:string) => {try{return await prh(name);}catch(e){if(e instanceof Error && e.message.startsWith("Several companies match"))throw e;registryUnavailable=true;return undefined;}};
  const [web, reg0] = await Promise.all([webResearch(query), lookup(query)]);
  if (!web.name || !webUrl(web.website)) throw new Error("Could not confidently identify this company. Try its full official name or website.");
  for (const field of ["leadership", "signals", "goals", "manualWorkClues"] as const) {
    if (!Array.isArray(web[field])) throw new Error("Company research was incomplete. Try its full official name again.");
  }
  web.businessId = web.businessId?.match(/\d{7}-\d/)?.[0];
  const reg = reg0 || (web.businessId ? await lookup(web.businessId) : undefined) || (web.name ? await lookup(web.name) : undefined);
  const [tenderResult, siteText] = await Promise.all([ted(reg?.name || web.name || query), web.website ? readUrl(web.website, 8000) : Promise.resolve("")]);
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
    tenders: tenderResult || [],
    tenderMatchVersion: 2,
    sourceLimits:[...(registryUnavailable && !reg ? ["Trade register unavailable; identity not independently confirmed there."]:[]),...(tenderResult===null?["TED search unavailable; tender activity is unknown, not zero."]:[]),...(!siteText?["Website text unavailable; do not treat the website demo as complete."]:[])],
    siteText,
    builtAt: new Date().toISOString(),
  };
  cacheSet(key, d);
  if (fresh) {
    const names = new Set([query.toLowerCase().trim(),d.name.toLowerCase().trim()]);
    const rows = db.prepare("SELECT key FROM cache WHERE key LIKE 'seed:%'").all() as {key:string}[];
    for (const row of rows) if (names.has(row.key.split(":")[2])) db.prepare("DELETE FROM cache WHERE key = ?").run(row.key);
  }
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
    `EU tenders (TED):\n${d.tenders.map(f).join("\n") || "- no matching notices returned; check source limits"}`,
    d.sourceLimits?.length ? `Source limits:\n${d.sourceLimits.join("\n")}` : "",
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
  add("Annual report", d.annualReportUrl);
  for (const l of d.leadership) add(`${l.name}, ${l.role}`, l.url);
  if (d.registry) add("Finnish Trade Register (PRH/YTJ)", `https://tietopalvelu.ytj.fi/yritys/${d.registry.businessId}`);
  for (const s of d.signals) add(s.text.slice(0, 80), s.url);
  for (const g of d.goals) add(g.text.slice(0, 80), g.url);
  for (const m of d.manualWorkClues) add(m.text.slice(0, 80), m.url);
  for (const t of d.tenders) add(t.text.slice(0, 80), t.url);
  return out;
}
