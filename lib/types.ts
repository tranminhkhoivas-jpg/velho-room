// Every seed returns blocks; one renderer shows them all.
export type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "note"; text: string } // labels: estimate, simulated, synthetic
  | { t: "list"; items: { text: string; url?: string; tag?: string }[] }
  | { t: "table"; cols: string[]; rows: string[][] }
  | { t: "draft"; label: string; text: string } // copyable, never sent
  | { t: "score"; label: string; value: number; max: number; why?: string }
  | { t: "svg"; svg: string } // built by our own code with escaped text only
  | { t: "postcard"; front: string; back: string }
  | { t: "sources"; items: { title: string; url: string }[] };

export type Artifact = { title: string; blocks: Block[] };

export type Fact = { text: string; url?: string; date?: string; inferred?: boolean };
export type Signal = Fact & { type: string; why?: string };

export type Dossier = {
  query: string;
  name: string;
  website?: string;
  businessId?: string;
  oneLiner: string;
  industry?: string;
  sizeHint?: string;
  hq?: string;
  leadership: { name: string; role: string; url?: string }[];
  signals: Signal[];
  goals: (Fact & { speaker?: string })[];
  manualWorkClues: Fact[];
  annualReportUrl?: string;
  registry?: { businessId: string; name: string; industry?: string; registered?: string; form?: string; changes: Fact[] };
  tenders: Fact[];
  siteText: string;
  builtAt: string;
};

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
