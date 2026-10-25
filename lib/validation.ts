import type { Artifact, Block } from "./types";

export function textInput(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label} must contain 1–${max} characters.`);
  return value.trim();
}
export function webUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : undefined; } catch { return undefined; }
}
const string = (x: unknown): x is string => typeof x === "string";
export function validateArtifact(value: unknown, allowSvg = false): Artifact {
  if (!value || typeof value !== "object") throw new Error("The AI returned an invalid result. Please regenerate.");
  const a = value as Artifact;
  const clean = (s: string) => s.replace(/<\/?(?:antml:)?cite\b[^>]*>/gi, "");
  const scrub = (x: unknown): unknown => typeof x === "string" ? clean(x) : Array.isArray(x) ? x.map(scrub) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k,v])=>[k,scrub(v)])) : x;
  const sourceRecord=a.sourceRecord,proof=a.proof,publicEvidence=a.publicEvidence;
  Object.assign(a, scrub(a));
  if(sourceRecord)a.sourceRecord=sourceRecord;
  if(proof)a.proof=proof;
  if(publicEvidence)a.publicEvidence=publicEvidence;
  if (!string(a.title) || !Array.isArray(a.blocks) || !a.blocks.length) throw new Error("The AI result is incomplete. Please regenerate.");
  for (const b of a.blocks) {
    let ok = !!b && typeof b === "object";
    if (!ok) throw new Error("The AI returned an invalid content block. Please regenerate.");
    switch (b.t) {
      case "h": case "p": case "note": ok = string(b.text); break;
      case "draft": ok = string(b.label) && string(b.text); break;
      case "postcard": ok = string(b.front) && string(b.back); break;
      case "score":
        if (b.max === undefined) b.max = 100; // Every current seed's score is explicitly defined on a 0–100 scale.
        ok = string(b.label) && Number.isFinite(b.value) && Number.isFinite(b.max) && b.max > 0 && b.value >= 0 && b.value <= b.max; break;
      case "table": ok = Array.isArray(b.cols) && b.cols.every(string) && Array.isArray(b.rows) && b.rows.every((r) => Array.isArray(r) && r.length === b.cols.length && r.every(string)); break;
      case "list": ok = Array.isArray(b.items) && b.items.every((i) => i && string(i.text)); if (ok) b.items.forEach((i) => { i.url = webUrl(i.url); }); break;
      case "sources": ok = Array.isArray(b.items) && b.items.every((i) => i && string(i.title) && !!webUrl(i.url)); break;
      case "svg": ok = allowSvg && string(b.svg) && !/<script|\son\w+\s*=|javascript:/i.test(b.svg); break;
      default: ok = false;
    }
    if (!ok) throw new Error(`The AI returned an invalid ${String((b as Block).t)} block. Please regenerate.`);
  }
  return a;
}
