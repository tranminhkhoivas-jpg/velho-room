import { getDossier } from "@/lib/dossier";
import { getSpend } from "@/lib/db";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { company, fresh } = await req.json();
    if (!company?.trim()) return Response.json({ error: "Type a company" }, { status: 400 });
    return Response.json({ dossier: await getDossier(company.trim(), !!fresh), spend: getSpend() });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
