import { addSpend, db } from "./db";

// Model ids are env-configurable; defaults checked against openrouter.ai/api/v1/models on 2026-10-24.
export const MODELS = {
  fast: process.env.MODEL_FAST || "anthropic/claude-haiku-5.5",
  write: process.env.MODEL_WRITE || "anthropic/claude-sonnet-5.5",
};

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

type LlmOptions = {
  purpose?: string;
  messages: Msg[];
  model?: keyof typeof MODELS;
  web?: number; // max web results; 0/undefined = no web search
  maxTokens?: number;
};
const globalQueue = globalThis as unknown as { __velhoAiQueue?: Promise<unknown> };
export async function llm(opts: LlmOptions): Promise<string> {
  if (!process.env.VELHO_AUDIT_ID) return request(opts);
  // One paid audit request at a time, across routes sharing this Node process.
  const job = (globalQueue.__velhoAiQueue || Promise.resolve()).catch(() => {}).then(() => request(opts));
  globalQueue.__velhoAiQueue = job;
  return job;
}
async function request(opts: LlmOptions): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing (project-root .env)");
  const audit = process.env.VELHO_AUDIT_ID || "normal";
  const model = MODELS[opts.model || "fast"];
  if (process.env.VELHO_AUDIT_ID) {
    const row = db.prepare("SELECT COALESCE(SUM(cost),0) AS cost, SUM(CASE WHEN status IN ('pending','unknown') THEN 1 ELSE 0 END) AS unknown FROM ai_calls WHERE audit = ?").get(audit) as {cost:number;unknown:number};
    if (row.unknown) throw new Error("Paid audit paused: an earlier request has unconfirmed cost. Reconcile its ledger entry before continuing.");
    const limit = Number(process.env.VELHO_AUDIT_LIMIT || 4);
    // Conservative allowance for one bounded request, including search. Not a provider billing guarantee.
    if (!Number.isFinite(limit) || limit > 5 || row.cost + 0.25 > limit) throw new Error("Audit spending allowance reached. Existing results can still be used.");
    if (model !== "anthropic/claude-haiku-5.5") throw new Error("This audit is restricted to Haiku 5.5.");
  }
  const purpose = opts.purpose || opts.messages.map((m) => typeof m.content === "string" ? m.content : "photo").join(" ").match(/TASK:\s*([^\n.]+)|Company: "[^"]+"|pitch rehearsal|Role-play|visitor|industry|photo/i)?.[0]?.slice(0, 120) || "generation";
  const callId = db.prepare("INSERT INTO ai_calls (audit, model, purpose, status, created) VALUES (?, ?, ?, 'pending', ?)").run(audit, model, purpose, Date.now()).lastInsertRowid;
  try {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Velho Room" },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens || 4000,
      ...(model === "anthropic/claude-haiku-5.5" && process.env.VELHO_AUDIT_ID ? { reasoning: { effort: "none" } } : {}),
      ...(opts.web ? { plugins: [{ id: "web", max_results: opts.web }] } : {}),
    }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await res.json();
  db.prepare("UPDATE ai_calls SET request_id = ?, output = ? WHERE id = ?").run(typeof j.id === "string" ? j.id : null, process.env.VELHO_AUDIT_ID ? String(j.choices?.[0]?.message?.content || "") : null, callId);
  const cost = j.usage?.cost;
  const known = typeof cost === "number" && Number.isFinite(cost) && cost >= 0;
  db.prepare("UPDATE ai_calls SET cost = ?, status = ? WHERE id = ?").run(known ? cost : null, known ? "reported" : res.status >= 400 && res.status < 500 ? "rejected" : "unknown", callId);
  if (!res.ok || j.error) throw new Error(`AI request failed: ${j.error?.message || res.statusText}. Try again after checking provider access.`);
  if (known) addSpend(cost);
  if (j.choices?.[0]?.finish_reason === "length") throw new Error("The AI response was cut short. Please regenerate; the partial result was not saved.");
  if (!known && process.env.VELHO_AUDIT_ID) throw new Error("AI cost was not reported. Paid audit paused; check the ledger before continuing.");
  return j.choices?.[0]?.message?.content || "";
  } catch (e) {
    db.prepare("UPDATE ai_calls SET status = 'unknown' WHERE id = ? AND status = 'pending'").run(callId);
    throw e;
  }
}

// Ask for JSON in the prompt and parse the first object; works across providers without response_format support.
export async function llmJson<T>(opts: Parameters<typeof llm>[0]): Promise<T> {
  const text = await llm(opts);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI returned an invalid format. Please regenerate; the incomplete result was not saved.");
  try { return JSON.parse(text.slice(start, end + 1)) as T; }
  catch { throw new Error("The AI returned an invalid format. Please regenerate; the incomplete result was not saved."); }
}

// Jina Reader turns any URL (pages and PDFs) into readable text.
export async function readUrl(url: string, max = 12000, headers: Record<string, string> = { "X-Return-Format": "text" }): Promise<string> {
  try {
    const res = await fetch("https://r.jina.ai/" + url, { headers, signal: AbortSignal.timeout(25000) });
    if (!res.ok) return "";
    return (await res.text()).slice(0, max);
  } catch {
    return "";
  }
}
