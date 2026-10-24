"use client";
import { useEffect, useState } from "react";
import type { SeedMeta } from "@/lib/seeds";
import type { Dossier } from "@/lib/types";
import { post } from "./api";

export function DossierCard({ d }: { d: Dossier }) {
  return (
    <div className="card dossier">
      <b>{d.name}</b> {d.businessId && <span className="tag">Y-tunnus {d.businessId}</span>} {d.industry && <span className="tag">{d.industry}</span>}
      <p>{d.oneLiner}</p>
      <p className="muted">
        {[d.hq, d.sizeHint, d.website].filter(Boolean).join(" · ")} · {d.signals.length} signals · {d.tenders.length} EU tenders · built {d.builtAt.slice(0, 16).replace("T", " ")}
      </p>
      {d.signals.length > 0 && (
        <ul>
          {d.signals.slice(0, 4).map((s, i) => (
            <li key={i}>
              <span className="tag">{s.type}</span> {s.text} {s.url && <a href={s.url} target="_blank" rel="noreferrer">source</a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Home({ seeds }: { seeds: SeedMeta[] }) {
  const [company, setCompany] = useState("");
  const [d, setD] = useState<Dossier | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("c");
    if (c) setCompany(c);
  }, []);

  async function research(fresh = false) {
    if (!company.trim()) return;
    setBusy(true);
    setErr("");
    try {
      setD((await post<{ dossier: Dossier }>("/api/dossier", { company, fresh })).dossier);
      history.replaceState(null, "", "?c=" + encodeURIComponent(company));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  const q = company.trim() ? "?c=" + encodeURIComponent(company.trim()) : "";
  return (
    <main>
      <h1>Velho Room</h1>
      <p className="muted">Type any company. Every tool below runs live on public data about it and shows its sources.</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          research();
        }}
      >
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name, e.g. Kesko" aria-label="Company" />
        <button disabled={busy}>{busy ? "Researching… (~40 s)" : "Research"}</button>
        {d && (
          <button type="button" className="ghost" disabled={busy} onClick={() => research(true)}>
            Refresh
          </button>
        )}
      </form>
      {err && <p className="err">{err}</p>}
      {d && <DossierCard d={d} />}
      <div className="grid">
        {[...seeds]
          .sort((a, b) => a.n - b.n)
          .map((s) => (
            <a key={s.id} className="tile" href={`/s/${s.id}${s.needsCompany ? q : ""}`}>
              <span className={"tag" + (s.kind === "new" ? " new" : "")}>{s.kind === "new" ? "new seed" : `brief seed ${s.n}`}</span>
              <b>{s.title}</b>
              <span className="muted">{s.blurb}</span>
            </a>
          ))}
      </div>
    </main>
  );
}
