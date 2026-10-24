import { getDossier, dossierBrief } from "@/lib/dossier";
import { annualReport } from "@/lib/seeds";
import { llm, llmJson, type Msg } from "@/lib/llm";
export const maxDuration = 300;

// mode "website": answers only from the prospect's public site (proof before pitch)
// mode "cfo": AI CFO persona built from the annual report (buyer simulator); mode "score": grades the rehearsal
export async function POST(req: Request) {
  try {
    const { mode, company, messages } = (await req.json()) as { mode: string; company: string; messages: Msg[] };
    const d = await getDossier(company);
    if (mode === "website") {
      const sys = `You are a demo assistant built by Velho on ${d.name}'s PUBLIC website only. Answer visitor questions in 1-4 sentences using only the website text and dossier below; if the answer is not there, say so and suggest who to ask. Reply in the user's language.\n\n${dossierBrief(d, true)}`;
      return Response.json({ reply: await llm({ model: "fast", maxTokens: 1500, messages: [{ role: "system", content: sys }, ...messages] }) });
    }
    const report = (await annualReport(d)).slice(0, 30000);
    const cfo = d.leadership.find((l) => /cfo|financ|talous/i.test(l.role));
    if (mode === "score") {
      const s = await llmJson<{ score: number; strengths: string[]; fixes: string[]; bestLine: string }>({
        model: "write",
        maxTokens: 3000,
        messages: [
          { role: "system", content: "You are a tough B2B sales coach. Reply with JSON only." },
          {
            role: "user",
            content: `Grade this pitch rehearsal by a Velho rep (AI & automation growth partner) against an AI-simulated CFO of ${d.name}. Transcript:\n${messages.map((m) => `${m.role === "user" ? "REP" : "CFO"}: ${m.content}`).join("\n")}\n\nJSON: {"score":0-100,"strengths":[2-3],"fixes":[2-3 concrete],"bestLine":"a better line the rep should have said"}`,
          },
        ],
      });
      return Response.json({ score: s });
    }
    const sys = `Role-play ${cfo ? `${cfo.name}, ${cfo.role}` : "the CFO"} of ${d.name}. This is an AI SIMULATION for sales rehearsal, built from public documents. You are busy, numerate, polite but skeptical of AI consultants; you get pitched weekly. Ground every figure in the annual report excerpt or dossier; never invent numbers, say "I'd have to check" instead. Push back on vague claims; ask about payback, risks, data security, who maintains it, and what other Finnish companies saw. Keep replies to 1-4 short sentences, like speech. If the rep is specific and earns it, agree to a 30-minute follow-up.\n\nDOSSIER:\n${dossierBrief(d)}\n\nANNUAL REPORT EXCERPT:\n${report || "(not found)"}`;
    return Response.json({ reply: await llm({ model: "write", maxTokens: 1200, messages: [{ role: "system", content: sys }, ...messages] }) });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
