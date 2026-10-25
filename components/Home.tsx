"use client";
import { useEffect, useRef, useState } from "react";
import type { SeedMeta } from "@/lib/seeds";
import type { Dossier } from "@/lib/types";
import { post } from "./api";

export function DossierCard({ d }: { d: Dossier }) {
  return (
    <div className="card dossier">
      <b>{d.name}</b> {d.businessId && <span className="tag">Y-tunnus {d.businessId}</span>} {d.industry && <span className="tag">{d.industry}</span>}
      <p>{d.oneLiner}</p>
      <p className="muted">
        {[d.hq, d.sizeHint, d.website].filter(Boolean).join(" · ")} · {d.signals.length} signals · {d.sourceLimits?.some((s)=>s.startsWith("TED")) ? "EU tenders unknown" : `${d.tenders.length} matching EU notices returned`} · built {d.builtAt.slice(0, 16).replace("T", " ")}
      </p>
      {d.sourceLimits?.map((s)=><p className="note" key={s}>{s}</p>)}
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
  const version = useRef(0);
  const [d, setD] = useState<Dossier | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("c");
    if (c) setCompany(c);
  }, []);

  async function research(fresh = false) {
    if (!company.trim()) return;
    const request = ++version.current;
    setD(null);
    setBusy(true);
    setErr("");
    try {
      const result = await post<{ dossier: Dossier }>("/api/dossier", { company, fresh });
      if (request !== version.current) return;
      setD(result.dossier);
      history.replaceState(null, "", "?c=" + encodeURIComponent(company));
    } catch (e) {
      if (request === version.current) setErr((e as Error).message);
    }
    if (request === version.current) setBusy(false);
  }

  const q = company.trim() ? "?c=" + encodeURIComponent(company.trim()) : "";
  return (
    <main>
      <h1>Velho Room</h1>
      <p className="muted">Research a company, then choose a tool. Results use public sources and may be cached for 24 hours; review facts before using a draft.</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          research();
        }}
      >
        <input value={company} onChange={(e) => { version.current++; setCompany(e.target.value); setD(null); setErr(""); setBusy(false); }} placeholder="Company name, e.g. Kesko" aria-label="Company" />
        <button disabled={busy}>{busy ? "Researching… (~40 s)" : "Research"}</button>
        {d && (
          <button type="button" className="ghost" disabled={busy} onClick={() => research(true)}>
            Refresh
          </button>
        )}
      </form>
      {err && <p role="alert" className="err">{err}</p>}
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
