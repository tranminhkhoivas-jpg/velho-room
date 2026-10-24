import { cacheGet, cacheSet } from "@/lib/db";
import { llmJson } from "@/lib/llm";
export const maxDuration = 300;

type Index = { industry: string; score: number; summary: string; examples: { company: string; what: string; url: string; date?: string }[]; laggingSignals: string[]; asOf: string };

// Finnish industry AI index: one live web sweep per industry, cached for a day
export async function POST(req: Request) {
  try {
    const { industry } = (await req.json()) as { industry: string };
    const key = "aiindex:" + industry.toLowerCase();
    const hit = cacheGet<Index>(key);
    if (hit) return Response.json(hit);
    const r = await llmJson<Index>({
      model: "fast",
      web: 8,
      maxTokens: 10000,
      messages: [
        { role: "system", content: "You are a research analyst. Use web search. Only cite what you found. Keep texts under 200 chars. Reply with one JSON object only." },
        {
          role: "user",
          content: `How visibly are FINNISH companies in the "${industry}" industry using AI and automation (last 18 months)? Look for news, case studies, job ads for AI roles, press releases. JSON: {"industry","score": 0-100 visible adoption (estimate),"summary": 2 sentences,"examples":[up to 6 {"company","what","url","date"}],"laggingSignals":[2-3 signs of manual work still common],"asOf":"${new Date().toISOString().slice(0, 10)}"}`,
        },
      ],
    });
    cacheSet(key, r);
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
