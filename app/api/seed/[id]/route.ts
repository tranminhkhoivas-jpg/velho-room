import { runSeed } from "@/lib/seeds";
import { getSpend } from "@/lib/db";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const input = await req.json();
    return Response.json({ artifact: await runSeed(id, input), spend: getSpend() });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
