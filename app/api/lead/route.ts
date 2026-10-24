import { db } from "@/lib/db";
import { llmJson } from "@/lib/llm";
import { QUIZ, readiness } from "@/lib/quiz";
export const maxDuration = 120;

// Public quiz submission (seeds 1 and 6). Returns the visitor's personal result; stores the lead for Velho.
export async function POST(req: Request) {
  try {
    const { talk, name, company, email, answers } = (await req.json()) as { talk?: string; name?: string; company?: string; email?: string; answers: number[] };
    if (!Array.isArray(answers) || answers.length !== QUIZ.length) return Response.json({ error: "Answer all questions" }, { status: 400 });
    const picked = QUIZ.map((q, i) => `${q.q} ${q.a[answers[i]] ?? "?"}`).join("\n");
    const score = readiness(answers);
    const r = await llmJson<{ headline: string; ideas: { title: string; how: string; hoursBack: string }[]; firstStep: string; meetingDraft: string }>({
      model: "fast",
      maxTokens: 3000,
      messages: [
        { role: "system", content: "You write for Velho, a Helsinki AI & automation growth partner (finds the manual work that slows a company down, builds the fix, makes sure people use it). Concrete, warm, no hype, no AI clichés. Reply with JSON only." },
        {
          role: "user",
          content: `A visitor${company ? ` from ${company}` : ""} took the 2-minute "What could we automate?" check. Readiness score ${score}/100. Answers:\n${picked}\n\nJSON: {"headline": personal 1-line result (max 14 words), "ideas":[3 x {"title","how": 1 sentence specific to their answers,"hoursBack": "estimate, e.g. ~3 h/person/week"}], "firstStep": one thing they can do this week without Velho, "meetingDraft": a 60-word note a Velho employee would send this person proposing a 20-min call, referencing their answers (draft only)}`,
        },
      ],
    });
    db.prepare("INSERT INTO leads (talk, name, company, role, email, answers, result, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      talk || "",
      name || "",
      company || "",
      QUIZ[0].a[answers[0]] ?? "",
      email || "",
      JSON.stringify(answers),
      JSON.stringify({ score, ...r }),
      Date.now(),
    );
    const { meetingDraft: _internal, ...visible } = r; // the meeting draft is for Velho only
    return Response.json({ score, ...visible });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}

// Internal lead list for Velho (talk-to-pipeline page)
export async function GET(req: Request) {
  const talk = new URL(req.url).searchParams.get("talk");
  const rows = (talk ? db.prepare("SELECT * FROM leads WHERE talk = ? ORDER BY created DESC").all(talk) : db.prepare("SELECT * FROM leads ORDER BY created DESC LIMIT 200").all()) as Record<string, string>[];
  return Response.json({ leads: rows.map((r) => ({ ...r, result: JSON.parse(r.result || "{}") })) });
}
