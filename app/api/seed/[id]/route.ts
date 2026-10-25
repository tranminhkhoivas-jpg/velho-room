import { runSeed } from "@/lib/seeds";
import { getSpend, getAuditSpend } from "@/lib/db";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let input;
  try{const raw=await req.text();if(raw.length>50000)throw new Error("Input is too large. Use a smaller approved note sample.");input=JSON.parse(raw);if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Provide a tool input object.");}
  catch(e){return Response.json({error:(e as Error).message},{status:400});}
  try {
    return Response.json({ artifact: await runSeed(id, input), spend: getSpend(), auditSpend:getAuditSpend() });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
