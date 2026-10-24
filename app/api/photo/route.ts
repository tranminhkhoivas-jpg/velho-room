import { llmJson } from "@/lib/llm";
export const maxDuration = 120;

// Trade fair companion: booth photo -> company name (vision model)
export async function POST(req: Request) {
  try {
    const { image } = (await req.json()) as { image: string };
    if (!image?.startsWith("data:image/")) return Response.json({ error: "Send a photo" }, { status: 400 });
    const r = await llmJson<{ company: string | null; confidence: number; seen: string }>({
      model: "write",
      maxTokens: 800,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: 'This is a photo of a trade fair booth, badge, sign or business card. Which company is it? Reply JSON only: {"company": official company name or null, "confidence": 0-1, "seen": "the text/logo you read"}' },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
