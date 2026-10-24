import { Quiz } from "@/components/Quiz";

// Public page the talk QR code opens (seed 6) — also usable standalone (seed 1)
export default async function Check({ searchParams }: { searchParams: Promise<{ talk?: string }> }) {
  const { talk } = await searchParams;
  return (
    <main>
      <h1>What could your team stop doing by hand?</h1>
      <p className="muted">Six taps, two minutes, a personal result. Built at a hackathon for Velho.</p>
      <Quiz talk={talk || ""} />
    </main>
  );
}
