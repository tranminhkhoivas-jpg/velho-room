// One-off: generate SYNTHETIC CRM deals and project notes (labelled synthetic everywhere they are shown).
process.loadEnvFile("../../.env");
import { writeFileSync } from "node:fs";
const { llmJson } = await import("../lib/llm");
const crm = await llmJson<{ deals: unknown[] }>({
  model: "write", maxTokens: 16000,
  messages: [{ role: "user", content: `Create a SYNTHETIC CRM export for Velho, a Helsinki AI & automation growth partner (founded 2025). 30 stalled deals with REAL established Finnish companies (mid-size and large, mixed industries: logistics, retail, manufacturing, construction, energy, food, wholesale, services, healthcare services; e.g. Kesko, Lassila & Tikanoja, Ponsse, Posti, Fiskars, Musti, Puuilo, Caverion, Lemonsoft... pick real ones). All people are FICTIONAL Finnish names. Last contact between 2025-11-01 and 2026-07-31.
JSON only: {"deals":[{"id":"D01","company","contact","role","stage":"intro call|discovery|proposal sent|pilot discussed","valueEur":number,"firstContact":"YYYY-MM-DD","lastContact":"YYYY-MM-DD","summary":"what was discussed, 1-2 sentences","objection":"why it stalled","thread":[{"from":"velho|them","date","text":"max 35 words"}] (2-4 messages)}]}` }],
});
writeFileSync("data/crm.json", JSON.stringify({ _note: "SYNTHETIC demo data. Companies are real public companies; people and conversations are fictional.", ...crm }, null, 1));
const notes = await llmJson<{ projects: unknown[] }>({
  model: "write", maxTokens: 10000,
  messages: [{ role: "user", content: `Create 6 SYNTHETIC raw project notes from a Velho expert (Helsinki AI & automation partner) for FICTIONAL client companies (fictional names like "Nordtrans Oy"), messy like real notes: bullets, abbreviations, Finnish words sometimes. Each project: one month, smallest useful build, adoption. Include some measured numbers (before/after hours, error rates, lead times) and some unmeasured claims.
JSON only: {"projects":[{"id":"P1","client","industry","expert":"fictional Velho expert name","month":"YYYY-MM","rawNotes":"8-15 lines of messy notes joined with \n"}]}` }],
});
writeFileSync("data/notes.json", JSON.stringify({ _note: "SYNTHETIC demo notes; clients are fictional.", ...notes }, null, 1));
console.log("deals", crm.deals.length, "notes", notes.projects.length);
