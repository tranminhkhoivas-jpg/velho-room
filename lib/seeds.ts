import { cacheGet, cacheSet } from "./db";
import { dossierBrief, dossierSources, getDossier } from "./dossier";
import { llmJson, readUrl } from "./llm";
import { ghostCard, luotsiChart } from "./svg";
import type { Artifact, Block, Dossier } from "./types";
import crm from "../data/crm.json";
import notes from "../data/notes.json";

export type SeedMeta = {
  id: string;
  n: number;
  title: string;
  blurb: string;
  kind: "brief" | "new";
  ui?: "chat-website" | "chat-cfo" | "quiz" | "pipeline" | "photo" | "campaign" | "crm" | "notes";
  needsCompany: boolean;
};

export const SEEDS: SeedMeta[] = [
  { id: "signals", n: 4, kind: "brief", needsCompany: true, title: "Signals in public data", blurb: "Register changes, EU tenders, hiring and leadership news that say “now”, scored with a cited reason." },
  { id: "proof", n: 3, kind: "brief", needsCompany: true, ui: "chat-website", title: "Proof before pitch", blurb: "A small working demo on the prospect’s own public data, before the first meeting." },
  { id: "buyer", n: 7, kind: "brief", needsCompany: true, ui: "chat-cfo", title: "Buyer simulator", blurb: "Rehearse the pitch on an AI CFO built from the company’s real annual report. Text or voice." },
  { id: "ghost", n: 11, kind: "new", needsCompany: true, title: "Ghost Employee", blurb: "“Meet your invisible hire”: the manual work a company pays for, as a trading card a CEO forwards." },
  { id: "luotsi", n: 15, kind: "new", needsCompany: true, title: "Luotsi Chart", blurb: "The company’s growth waters as a nautical chart: goals ahead, rocks to avoid, lighthouses to steer by." },
  { id: "media", n: 9, kind: "brief", needsCompany: true, title: "One-of-one media", blurb: "A mini-report and a printable postcard made for exactly one company." },
  { id: "check", n: 1, kind: "brief", needsCompany: false, ui: "quiz", title: "Interactive site: automation check + Finnish AI index", blurb: "A 2-minute “what could we automate?” check with a personal result, plus a live index of how Finnish industries use AI." },
  { id: "pipeline", n: 6, kind: "brief", needsCompany: false, ui: "pipeline", title: "Talk-to-pipeline", blurb: "A QR code on the keynote slide; the audience gets a personal result, Velho gets warm leads with meeting drafts." },
  { id: "tradefair", n: 5, kind: "brief", needsCompany: true, ui: "photo", title: "Trade fair companion", blurb: "Snap a booth, get a 30-second brief and a follow-up draft before you walk away." },
  { id: "words", n: 13, kind: "new", needsCompany: true, title: "In Their Own Words", blurb: "The executive’s own public quotes, linked, and an opener that answers what they actually said." },
  { id: "radar", n: 14, kind: "new", needsCompany: true, title: "Room Radar", blurb: "Where the target’s execs will physically be in the next months, and how Velho gets in that room." },
  { id: "hackathon", n: 12, kind: "new", needsCompany: true, title: "Hackathon-in-a-box", blurb: "“We wrote your company a hackathon brief.” A 48-hour build sprint Velho could run for them." },
  { id: "campaign", n: 2, kind: "brief", needsCompany: true, ui: "campaign", title: "Viral campaign engine", blurb: "24 B2B content angles, pre-tested on a simulated CFO/COO/CEO panel, re-ranked by real thumbs." },
  { id: "deadDeal", n: 8, kind: "brief", needsCompany: false, ui: "crm", title: "Dead deal resurrector", blurb: "Finds deals that went quiet and a real, current reason to reconnect. (Synthetic CRM.)" },
  { id: "caseStudy", n: 10, kind: "brief", needsCompany: false, ui: "notes", title: "Case-study machine", blurb: "Project notes into a before/after story, a LinkedIn post and a one-pager. (Synthetic notes.)" },
];

const VELHO = `Velho (Velho Applied Intelligence Oy, Helsinki, velho.io) is a strategic AI growth partner: it finds the manual work that slows a company down, builds the fix and makes sure people use it (Find → Prioritise → Ship → Adopt; a named Velho expert works with the client team every month). It also does growth strategy and experimental/viral marketing. Founders are builders (co-founder Oskar Kallio built Luotsi, Finland's #1 boating app). Ideal customers: established companies with real operations and budget; buyers are CEOs, CFOs, COOs, heads of operations. They are busy, pitched constantly and ignore generic AI messages.`;

const RULES = `Rules:
- Use ONLY facts from the dossier or your own web results; put the source url on every factual list item.
- Public signals are reasons to ASK, never a diagnosis of internal processes. Say "we noticed", not "you have a problem".
- Label every number you estimate with the word "estimate".
- Drafts are for a Velho employee to review and send manually; never imply anything was sent.
- Write like a sharp, warm human. Short. Specific. No AI clichés, no "I hope this finds you well", no "leverage", no "synergy".
- The bar: would a busy CEO stop, read, share or reply?`;

const BLOCK_SPEC = `Reply with ONE JSON object, no markdown: {"title": string, "blocks": Block[]} where each Block is one of
{"t":"h","text"} | {"t":"p","text"} | {"t":"note","text"} | {"t":"list","items":[{"text","url"?,"tag"?}]} | {"t":"table","cols":[string],"rows":[[string]]} | {"t":"draft","label","text"} | {"t":"score","label","value":number,"max":number,"why"}`;

async function gen(d: Dossier | null, task: string, opts: { web?: number; withSite?: boolean; extra?: string; model?: "fast" | "write" } = {}): Promise<Artifact> {
  const a = await llmJson<Artifact>({
    model: opts.model || "write",
    web: opts.web,
    maxTokens: 12000,
    messages: [
      { role: "system", content: `${VELHO}\n\n${RULES}\n\n${BLOCK_SPEC}` },
      { role: "user", content: `${d ? `DOSSIER (researched ${d.builtAt.slice(0, 10)}):\n${dossierBrief(d, opts.withSite)}\n\n` : ""}${opts.extra ? opts.extra + "\n\n" : ""}TASK:\n${task}` },
    ],
  });
  a.blocks = (a.blocks || []).filter((b) => b && typeof b === "object" && "t" in b);
  return a;
}

const withSources = (a: Artifact, d: Dossier): Artifact => ({ ...a, blocks: [...a.blocks, { t: "sources", items: dossierSources(d) }] });

type Runner = (d: Dossier | null, input: Record<string, string>) => Promise<Artifact>;

const RUN: Record<string, Runner> = {
  signals: async (d) =>
    withSources(
      await gen(d!, `Signals board. 1) A "score" block: Why-now score 0-100 with one-line why. 2) "list" of the signals ranked strongest first, tag = signal type, text = what happened + why it matters to Velho, with url. Include register changes and EU tenders if any. 3) "p": who at the company to approach first and why (from leadership). 4) "p": the best timing (e.g. before/after a results date). 5) "draft" label "Opener (LinkedIn/email)": max 70 words, tied to the strongest signal, ends with a low-friction question. 6) "note": what we do NOT know and must ask.`),
      d!,
    ),

  proof: async (d) => {
    const pages = await sitePages(d!.website);
    const a = withSources(
      await gen(
        d!,
        `Proof before pitch. Pick ONE concrete, plausible process that is visible from their public website pages or job ads (e.g. product/price data, store or location lists, service requests, job-ad duties). Build a small working demo from REAL data in the text: a "table" of 5-12 real rows extracted from the website text (columns you choose, values only from the text). Then: "p" explaining what an automation on top of this would do for them, in their words; "list" of 3 numbered steps Velho would ship in month one; "note" stating which parts are demo vs what needs their internal data; "draft" label "Pre-meeting email" (max 90 words) that offers to show the demo built on their own public data. Below this artifact the page offers a live "ask our website" assistant.`,
        { withSite: true, extra: pages.map((p) => `PAGE ${p.url}:\n${p.text}`).join("\n\n") },
      ),
      d!,
    );
    if (pages.length) a.blocks.push({ t: "list", items: pages.map((p) => ({ text: "Page read for this demo", url: p.url, tag: "site" })) });
    return a;
  },

  buyer: async (d) => {
    const report = await annualReport(d!);
    return withSources(
      await gen(
        d!,
        `Buyer simulator setup card for rehearsing a pitch to this company's CFO. Blocks: "h" with the CFO name and title (from leadership, else "CFO"); "list" of 5-7 key figures/priorities from the annual report excerpt with page context (cite annual report url); "list" titled-by-tag "Likely objections" (tag "objection") — 5 sharp objections this CFO would raise to an AI/automation partner, grounded in the figures; "p" coaching: the one number to open with. "note": the CFO in the chat below is an AI simulation built from public documents, not the real person.`,
        { extra: report ? `ANNUAL REPORT EXCERPT (${d!.annualReportUrl}):\n${report.slice(0, 18000)}` : "No annual report text found; say so in a note and use dossier facts." },
      ),
      d!,
    );
  },

  ghost: async (d) => {
    const g = await llmJson<{ ghostName: string; title: string; tagline: string; tasks: { task: string; evidence: string; url?: string; hoursPerWeek: number }[]; fte: number; eurPerYear: number; assumption: string; draft: string }>({
      model: "write",
      maxTokens: 8000,
      messages: [
        { role: "system", content: `${VELHO}\n\n${RULES}\nReply with JSON only.` },
        {
          role: "user",
          content: `DOSSIER:\n${dossierBrief(d!, true)}\n\nInvent a playful persona for the "ghost employee": all the repetitive manual work this company appears (from public evidence: job ads, services, scale) to be paying people to do. A Finnish first name + surname that fits the company (e.g. "Excel-Eero"), a funny job title, a tagline. 4-6 tasks, each with the public evidence and url and an hoursPerWeek ESTIMATE. fte = sum hours/37.5 (estimate). eurPerYear = fte * 55000 (estimate, loaded Finnish salary). assumption = one sentence on how estimates were made. draft = a 60-word note a Velho employee could send to the COO with the card attached, light and respectful, asks if the ghost is real.
JSON: {"ghostName","title","tagline","tasks":[{"task","evidence","url","hoursPerWeek"}],"fte","eurPerYear","assumption","draft"}`,
        },
      ],
    });
    const blocks: Block[] = [
      { t: "svg", svg: ghostCard(d!.name, g) },
      { t: "list", items: g.tasks.map((x) => ({ text: `${x.task} — ${x.evidence} (~${x.hoursPerWeek} h/week, estimate)`, url: x.url, tag: "evidence" })) },
      { t: "note", text: `Estimate: ${g.assumption} Public evidence only; the real numbers come from a conversation.` },
      { t: "draft", label: "Note to the COO (with the card)", text: g.draft },
    ];
    return withSources({ title: `Meet ${g.ghostName}, ${d!.name}'s invisible hire`, blocks }, d!);
  },

  luotsi: async (d) => {
    const c = await llmJson<{ destination: string; destinationSource?: string; rocks: { label: string; evidence: string; url?: string }[]; lighthouses: { label: string; why: string }[]; currents: string[]; captainsNote: string }>({
      model: "write",
      maxTokens: 6000,
      messages: [
        { role: "system", content: `${VELHO}\n\n${RULES}\nReply with JSON only.` },
        {
          role: "user",
          content: `DOSSIER:\n${dossierBrief(d!)}\n\nDraw this company's growth waters as a nautical chart (Oskar from Velho built Luotsi, Finland's #1 boating app). destination = their stated goal (short, max 6 words) with source url. rocks = 3-5 risks/bottlenecks that block the goal, each max 5 words label + public evidence + url. lighthouses = 2-4 quick wins Velho could ship in weeks (max 5 words each) + why. currents = 2-3 market forces (max 5 words). captainsNote = a 50-word pilot's note to the CEO in nautical voice, warm, ends with an invitation to plan the route together.
JSON: {"destination","destinationSource","rocks":[{"label","evidence","url"}],"lighthouses":[{"label","why"}],"currents":[],"captainsNote"}`,
        },
      ],
    });
    const blocks: Block[] = [
      { t: "svg", svg: luotsiChart(d!.name, c) },
      { t: "list", items: c.rocks.map((r) => ({ text: `Rock: ${r.label} — ${r.evidence}`, url: r.url, tag: "rock" })) },
      { t: "list", items: c.lighthouses.map((l) => ({ text: `Lighthouse: ${l.label} — ${l.why}`, tag: "quick win" })) },
      { t: "draft", label: "Captain's note (to the CEO)", text: c.captainsNote },
      { t: "note", text: "Rocks are read from public evidence, not from inside the company. Chart is a conversation starter." },
    ];
    return withSources({ title: `Luotsi Chart: ${d!.name}`, blocks }, d!);
  },

  media: async (d) => {
    const m = await llmJson<{ report: Artifact; postcard: { front: string; back: string } }>({
      model: "write",
      maxTokens: 10000,
      messages: [
        { role: "system", content: `${VELHO}\n\n${RULES}\nReply with JSON only.` },
        {
          role: "user",
          content: `DOSSIER:\n${dossierBrief(d!)}\n\nMake one-of-one media for exactly this company. 1) report: a 1-page mini-report titled for them ("3 things we noticed about <company>'s next 12 months" or better), blocks per this spec: ${BLOCK_SPEC.replace("Reply with ONE JSON object, no markdown: ", "")}. Use h/p/list with urls, end with a "draft" cover email (max 80 words). 2) postcard: front = a striking 4-9 word headline about THEM (not about Velho); back = a handwritten-style 50-word note from a Velho founder, specific, with one question.
JSON: {"report":{"title","blocks":[]},"postcard":{"front","back"}}`,
        },
      ],
    });
    return withSources({ title: m.report.title, blocks: [{ t: "postcard", front: m.postcard.front, back: m.postcard.back }, ...m.report.blocks] }, d!);
  },

  tradefair: async (d) =>
    withSources(
      await gen(d!, `Trade fair companion: a Velho employee is standing at this company's booth RIGHT NOW. 1) "h" 30-second brief title. 2) "list" of 5 things to know (what they do, size, the freshest news, who leads, one manual-work clue) with urls. 3) "list" tag "ask" — 3 smart questions to ask the person at the booth. 4) "draft" label "Follow-up (send tonight)": max 80 words, references meeting at the booth with a [placeholder] for their name and one thing they said, offers one specific idea. 5) "note": fill in placeholders before sending.`, { model: "fast" }),
      d!,
    ),

  words: async (d) =>
    withSources(
      await gen(
        d!,
        `In Their Own Words. Search the web for this company's CEO/CFO/COO PUBLIC interviews, podcasts, LinkedIn posts, CEO letters and keynotes (last 24 months). 1) "list" of 4-8 exact short quotes (in quotation marks, max 30 words each, translated to English if Finnish with "(transl.)"), tag = speaker, url = source; only quotes you actually found. 2) "p": the 2 priorities they keep repeating. 3) "draft" label "Opener that answers them": max 70 words, quotes ONE thing they said and responds to it with a specific Velho angle and a question. 4) "draft" label "LinkedIn comment": max 40 words, a genuinely useful comment on their theme (no pitch). 5) "note": if fewer than 2 real quotes were found, say so plainly.`,
        { web: 8 },
      ),
      d!,
    ),

  radar: async (d) =>
    withSources(
      await gen(
        d!,
        `Room Radar. Today is ${new Date().toISOString().slice(0, 10)}. Search the web for UPCOMING (next 6 months) events where this company's executives speak, exhibit or attend, or where their industry gathers in Finland/Nordics (trade fairs, conferences, industry association days, investor/results webcasts, meetups, Slush side events). 1) "table" cols [Date, Event, Who from them / why relevant, Link] — only real events with real dates found; mark "(industry event)" when the company is not confirmed. 2) "p": the single best room for Velho to be in, and how (attend, speak, host a side breakfast, sponsor a coffee). 3) "draft" label "Pre-event note": max 60 words asking for 15 minutes at the event. 4) "draft" label "Walk-up line": one sentence to say in person. 5) "note": unconfirmed items and what to verify.`,
        { web: 8 },
      ),
      d!,
    ),

  hackathon: async (d) =>
    withSources(
      await gen(
        d!,
        `Hackathon-in-a-box: write this company a 48-hour hackathon brief in the style of a real hackathon challenge brief (like "Velho Challenge: B2B Marketing Tools"). Blocks: "h" title "<Company> Challenge: <theme>"; "p" The challenge (1 bold sentence + 2 lines, grounded in their goals/signals); "table" cols [Direction, The goal, What success looks like] with 3 rows; "list" 6 idea seeds tagged "idea" ("prompts, not a menu"), each specific to their operations and public data; "list" judging criteria (4 items); "p" Practicalities: 2 days, a Velho expert + 2 builders + their process owner, working demo on Monday. Then "draft" label "Cover note to the CEO": max 70 words, "We wrote you a hackathon brief" angle, offers Velho running it.`,
      ),
      d!,
    ),
};

export async function runSeed(id: string, input: Record<string, string>): Promise<Artifact> {
  const meta = SEEDS.find((s) => s.id === id);
  if (!meta) throw new Error("Unknown seed " + id);
  const company = (input.company || "").trim();
  const key = `seed:${id}:${company.toLowerCase()}:${input.dealId || input.noteId || ""}`;
  if (!input.fresh) {
    const hit = cacheGet<Artifact>(key);
    if (hit) return hit;
  }
  let a: Artifact;
  if (id === "deadDeal") a = await deadDeal(input.dealId);
  else if (id === "caseStudy") a = await caseStudy(input.noteId);
  else if (id === "campaign") a = await campaign(await getDossier(company));
  else {
    const run = RUN[id];
    if (!run) throw new Error(`Seed ${id} has no generator`);
    if (meta.needsCompany && !company) throw new Error("Type a company first");
    a = await run(company ? await getDossier(company) : null, input);
  }
  cacheSet(key, a);
  return a;
}

// ----- seeds with their own data -----

// Proof before pitch: homepage links -> the 4 most process-revealing same-site pages, read in parallel.
// ponytail: keyword scoring, swap for an LLM pick if it chooses badly
const PAGE_HINTS = /career|job|rekry|ura|service|palvelu|product|tuote|price|hinta|order|tilaa|store|myymä|location|toimipist|support|tuki|contact|yhtey|case|customer|asiakas/i;
async function sitePages(website?: string): Promise<{ url: string; text: string }[]> {
  if (!website) return [];
  const home = await readUrl(website, 200000, { "X-With-Links-Summary": "true", "X-Retain-Images": "none" });
  const host = new URL(website).hostname.replace(/^www\./, "");
  const seen = new Set<string>();
  const urls = [...home.matchAll(/\]\((https?:\/\/[^)\s#]+)\)/g)]
    .map((m) => m[1])
    .filter((u) => {
      try {
        const x = new URL(u);
        const key = x.pathname.replace(/\/$/, "");
        if (!x.hostname.endsWith(host) || !key || seen.has(key) || !PAGE_HINTS.test(key)) return false;
        seen.add(key);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 4);
  const texts = await Promise.all(urls.map((u) => readUrl(u, 3000)));
  return urls.map((url, i) => ({ url, text: texts[i] })).filter((p) => p.text);
}

export async function annualReport(d: Dossier): Promise<string> {
  if (!d.annualReportUrl) return "";
  const key = "ar:" + d.annualReportUrl;
  const hit = cacheGet<string>(key, 1000 * 60 * 60 * 24 * 7);
  if (hit) return hit;
  const text = await readUrl(d.annualReportUrl, 60000);
  if (text) cacheSet(key, text);
  return text;
}

type Deal = (typeof crm.deals)[number];

async function deadDeal(dealId?: string): Promise<Artifact> {
  const deal = crm.deals.find((x: Deal) => x.id === dealId);
  if (!deal) throw new Error("Pick a deal");
  const d = await getDossier(deal.company);
  return withSources(
    await gen(
      d,
      `Dead deal resurrector. The SYNTHETIC CRM deal below went quiet. Find what changed at the company SINCE the last contact date using the dossier signals (newer than ${deal.lastContact}). 1) "score" label "Reconnect strength" 0-100 with why. 2) "list" of the new triggers since last contact (tag = type, with url), or say none. 3) "p": the real reason to reconnect now, connecting their original objection to the new trigger. 4) "draft" label "Reconnect message to ${deal.contact}": max 80 words, references the earlier conversation honestly, no guilt-tripping, no "just checking in". 5) "note": "CRM history is synthetic demo data; company signals are live public data."`,
      { extra: `CRM DEAL (synthetic): ${JSON.stringify(deal)}` },
    ),
    d,
  );
}

async function caseStudy(noteId?: string): Promise<Artifact> {
  const note = notes.projects.find((x) => x.id === noteId);
  if (!note) throw new Error("Pick a project note");
  return gen(
    null,
    `Case-study machine. Turn the SYNTHETIC project notes into: 1) "h" headline with the strongest before→after number; 2) "table" cols [Metric, Before, After] using ONLY numbers in the notes (write "not measured" otherwise); 3) "p" story in 4 short paragraphs (problem in their words, what Velho shipped, adoption, result) — use p blocks; 4) "draft" label "LinkedIn post": max 120 words, human, first line is a hook; 5) "draft" label "One-pager summary": 6 lines; 6) "list" tag "missing": facts to confirm with the client before publishing (permission to name them, numbers to verify); 7) "note": "Synthetic notes. Publishing a real case needs client and Velho approval."`,
    { extra: `PROJECT NOTES (synthetic): ${JSON.stringify(note)}` },
  );
}

export type Angle = { id: string; format: string; hook: string; body: string; visual: string; panel: { cfo: number; coo: number; ceo: number; comment: string } };

async function campaign(d: Dossier): Promise<Artifact & { angles: Angle[] }> {
  const r = await llmJson<{ angles: Omit<Angle, "id">[] }>({
    model: "write",
    maxTokens: 14000,
    messages: [
      { role: "system", content: `${VELHO}\n\n${RULES}\nReply with JSON only.` },
      {
        role: "user",
        content: `DOSSIER of a target account (use it to make angles land with companies LIKE this one, industry ${d.industry || ""}):\n${dossierBrief(d)}\n\nGenerate 24 B2B content angles for Velho to reach CEOs/CFOs/COOs of companies like this. Mix formats evenly: "LinkedIn post", "15s vertical video script", "carousel", "data visual", "contrarian take", "meme-ish". Each: hook (max 14 words), body (max 60 words; for video: 3 short scene lines), visual (one-line art direction). Then act as a SIMULATED panel of three busy Finnish buyers (CFO, COO, CEO) and score each 1-10 for "would I stop scrolling and share/reply", plus one blunt combined comment (max 15 words).
JSON: {"angles":[{"format","hook","body","visual","panel":{"cfo","coo","ceo","comment"}}]}`,
      },
    ],
  });
  const angles = r.angles.map((a, i) => ({ ...a, id: `${d.name.toLowerCase().replace(/\W+/g, "-")}-${i}` }));
  return withSources(
    {
      title: `Campaign engine — ${angles.length} angles tuned for companies like ${d.name}`,
      angles,
      blocks: [{ t: "note", text: "Panel scores are a SIMULATED pre-test by AI buyer personas. Real ranking comes from thumbs below and, once Velho approves posting, from real engagement." }],
    } as Artifact & { angles: Angle[] },
    d,
  ) as Artifact & { angles: Angle[] };
}
