import { notFound } from "next/navigation";
import { SEEDS } from "@/lib/seeds";
import { Runner } from "@/components/Runner";
import crm from "@/data/crm.json";
import notes from "@/data/notes.json";

export default async function SeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = SEEDS.find((s) => s.id === id);
  if (!meta) notFound();
  // pickers only need labels; full fixtures stay on the server
  const options =
    meta.ui === "crm"
      ? crm.deals.map((x) => ({ id: x.id, label: `${x.company} — ${x.stage}, last contact ${x.lastContact}` }))
      : meta.ui === "notes"
        ? notes.projects.map((x) => ({ id: x.id, label: `${x.client} (${x.industry}), ${x.month}` }))
        : [];
  return <Runner meta={meta} options={options} />;
}
