import { SEEDS } from "@/lib/seeds";
import { Home } from "@/components/Home";

export default function Page() {
  return <Home seeds={SEEDS} />;
}
