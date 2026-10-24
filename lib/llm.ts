import { addSpend } from "./db";

// Model ids are env-configurable; defaults checked against openrouter.ai/api/v1/models on 2026-10-24.
export const MODELS = {
  fast: process.env.MODEL_FAST || "anthropic/claude-haiku-5.5",
  write: process.env.MODEL_WRITE || "anthropic/claude-sonnet-5.5",
};

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

export async function llm(opts: {
  messages: Msg[];
  model?: keyof typeof MODELS;
  web?: number; // max web results; 0/undefined = no web search
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing (project-root .env)");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Velho Room" },
    body: JSON.stringify({
      model: MODELS[opts.model || "fast"],
      messages: opts.messages,
      max_tokens: opts.maxTokens || 4000,
      ...(opts.web ? { plugins: [{ id: "web", max_results: opts.web }] } : {}),
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`OpenRouter: ${j.error.message || JSON.stringify(j.error)}`);
  addSpend(j.usage?.cost || 0);
  return j.choices?.[0]?.message?.content || "";
}

// Ask for JSON in the prompt and parse the first object; works across providers without response_format support.
export async function llmJson<T>(opts: Parameters<typeof llm>[0]): Promise<T> {
  const text = await llm(opts);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model returned no JSON: " + text.slice(0, 200));
  return JSON.parse(text.slice(start, end + 1)) as T;
}

// Jina Reader turns any URL (pages and PDFs) into readable text.
export async function readUrl(url: string, max = 12000): Promise<string> {
  try {
    const res = await fetch("https://r.jina.ai/" + url, { headers: { "X-Return-Format": "text" }, signal: AbortSignal.timeout(25000) });
    if (!res.ok) return "";
    return (await res.text()).slice(0, max);
  } catch {
    return "";
  }
}
