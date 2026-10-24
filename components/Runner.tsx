"use client";
import { useEffect, useState } from "react";
import type { Angle, SeedMeta } from "@/lib/seeds";
import type { Artifact } from "@/lib/types";
import { post } from "./api";
import { Blocks } from "./Blocks";
import { Chat } from "./Chat";
import { Quiz } from "./Quiz";
import { Player } from "@remotion/player";
import { CompanyVideo, DURATION, type VideoProps } from "@/video/CompanyVideo";

type Opt = { id: string; label: string };

export function Runner({ meta, options }: { meta: SeedMeta; options: Opt[] }) {
  const [company, setCompany] = useState("");
  const [pick, setPick] = useState(options[0]?.id || "");
  const [art, setArt] = useState<(Artifact & { angles?: Angle[] }) | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [spend, setSpend] = useState<number | null>(null);

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("c");
    if (c) setCompany(c);
  }, []);

  async function run(extra: Record<string, string> = {}, c = company) {
    setBusy("Researching live and writing… (30–90 s on a new company)");
    setErr("");
    setArt(null);
    try {
      const body = { company: c, dealId: meta.ui === "crm" ? pick : "", noteId: meta.ui === "notes" ? pick : "", ...extra };
      const r = await post<{ artifact: Artifact & { angles?: Angle[] }; spend: number }>(`/api/seed/${meta.id}`, body);
      setArt(r.artifact);
      setSpend(r.spend);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy("");
  }

  const companyBar = meta.needsCompany && meta.ui !== "photo" && (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
    >
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" aria-label="Company" />
      <button disabled={!!busy || !company.trim()}>Run</button>
      {art && (
        <button type="button" className="ghost" disabled={!!busy} onClick={() => run({ fresh: "1" })}>
          Regenerate
        </button>
      )}
    </form>
  );

  return (
    <main>
      <a href={company ? "/?c=" + encodeURIComponent(company) : "/"} className="noprint">
        ← all tools
      </a>
      <h1>{meta.title}</h1>
      <p className="muted">{meta.blurb}</p>
      {companyBar}
      {meta.ui === "photo" && <Photo busy={!!busy} onCompany={(c) => (setCompany(c), run({}, c))} />}
      {(meta.ui === "crm" || meta.ui === "notes") && (
        <div className="row">
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button disabled={!!busy} onClick={() => run()}>
            Run
          </button>
        </div>
      )}
      {meta.ui === "quiz" && (
        <>
          <Quiz />
          <AiIndex />
        </>
      )}
      {meta.ui === "pipeline" && <Pipeline />}
      {busy && <p className="loading">{busy}</p>}
      {err && <p className="err">{err}</p>}
      {art?.angles && <Campaign angles={art.angles} />}
      {art && meta.id === "media" && <Video company={company} />}
      {art && <Blocks artifact={art} />}
      {art && meta.ui === "chat-website" && <Chat mode="website" company={company} opener={`Live assistant built only from ${company}'s public website. Ask it what a customer would ask.`} />}
      {art && meta.ui === "chat-cfo" && <Chat mode="cfo" company={company} opener="AI simulation of the CFO, grounded in the annual report. Pitch Velho; it will push back. Voice works in Chrome/Edge." />}
      {spend !== null && <p className="muted" style={{ fontSize: 12 }}>OpenRouter spend so far: ${spend.toFixed(2)}</p>}
    </main>
  );
}

function Photo({ busy, onCompany }: { busy: boolean; onCompany: (c: string) => void }) {
  const [seen, setSeen] = useState("");
  const [err, setErr] = useState("");
  const [manual, setManual] = useState("");

  async function onFile(f: File) {
    setErr("");
    setSeen("Reading the photo…");
    // shrink to ~1024px so phone photos upload fast
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = Object.assign(document.createElement("canvas"), { width: img.width * k, height: img.height * k });
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    try {
      const r = await post<{ company: string | null; confidence: number; seen: string }>("/api/photo", { image: c.toDataURL("image/jpeg", 0.8) });
      if (!r.company) return setSeen(`Could not tell which company (saw: ${r.seen}). Type it below.`);
      setSeen(`Recognised ${r.company} (${Math.round(r.confidence * 100)}% sure; saw “${r.seen}”).`);
      onCompany(r.company);
    } catch (e) {
      setErr((e as Error).message);
      setSeen("");
    }
  }

  return (
    <div className="card">
      <label>
        <b>Snap a booth, badge or business card</b>
        <br />
        <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {seen && <p>{seen}</p>}
      {err && <p className="err">{err}</p>}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onCompany(manual.trim());
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="…or type the company" />
        <button disabled={busy}>Brief me</button>
      </form>
    </div>
  );
}

function Pipeline() {
  const [talk, setTalk] = useState("keynote-" + new Date().toISOString().slice(0, 10));
  const [origin, setOrigin] = useState("");
  const [leads, setLeads] = useState<{ id: number; name: string; company: string; role: string; email: string; result: { score: number; headline: string; meetingDraft: string } }[]>([]);
  useEffect(() => setOrigin(location.origin), []);

  async function load() {
    setLeads((await (await fetch("/api/lead?talk=" + encodeURIComponent(talk))).json()).leads);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talk]);

  const url = `${origin}/check?talk=${encodeURIComponent(talk)}`;
  return (
    <div>
      <div className="card">
        <div className="row">
          <b>Talk tag</b>
          <input value={talk} onChange={(e) => setTalk(e.target.value)} />
        </div>
        {origin && (
          <div className="row" style={{ marginTop: 12, alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={"/api/qr?url=" + encodeURIComponent(url)} alt="QR code for the audience" width={220} height={220} />
            <div>
              <p>Put this QR on the last slide. The audience gets a personal automation result; leads appear below live.</p>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </div>
          </div>
        )}
      </div>
      <h2>Leads from this talk ({leads.length})</h2>
      {leads.length === 0 && <p className="muted">None yet — scan the QR with a phone to try it.</p>}
      {leads.map((l) => (
        <div key={l.id} className="card">
          <b>{l.name || "Anonymous"}</b> {l.company && `· ${l.company}`} · {l.role} <span className="tag">readiness {l.result.score}</span>
          <p className="muted">{l.result.headline}</p>
          <div className="draft">
            <b>Meeting request</b> <span className="tag">draft — not sent</span>
            <pre>{l.result.meetingDraft}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiIndex() {
  const [industry, setIndustry] = useState("logistics");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<{ score: number; summary: string; examples: { company: string; what: string; url: string; date?: string }[]; laggingSignals: string[]; asOf: string; tol?: string; registry?: { companies: number; newLast12m: number; url: string } } | null>(null);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    setErr("");
    try {
      setR(await post("/api/aiindex", { industry }));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Finnish industry AI index</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry, e.g. construction" />
        <button disabled={busy}>{busy ? "Sweeping the web…" : "Check"}</button>
      </form>
      {err && <p className="err">{err}</p>}
      {r && (
        <>
          <p>
            <b>{r.score}/100</b> visible AI adoption (estimate, {r.asOf}). {r.summary}
          </p>
          <ul>
            {r.examples.map((x, i) => (
              <li key={i}>
                <b>{x.company}</b>: {x.what}{" "}
                <a href={x.url} target="_blank" rel="noreferrer">
                  source
                </a>
              </li>
            ))}
          </ul>
          <p className="muted">Still manual: {r.laggingSignals.join(" · ")}</p>
          {r.registry && (
            <p>
              Finnish trade register, industry code {r.tol}: <b>{r.registry.companies.toLocaleString("en")}</b> companies, <b>{r.registry.newLast12m.toLocaleString("en")}</b> registered in the last 12 months (includes inactive ones).{" "}
              <a href={r.registry.url} target="_blank" rel="noreferrer">
                source
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Campaign({ angles }: { angles: Angle[] }) {
  const [fb, setFb] = useState<Record<string, { up: number; down: number }>>({});
  const prefix = angles[0]?.id.replace(/-\d+$/, "-") || "";
  useEffect(() => {
    fetch("/api/feedback?prefix=" + encodeURIComponent(prefix))
      .then((r) => r.json())
      .then((j) => setFb(j.feedback));
  }, [prefix]);

  // ponytail: Beta-mean bandit — simulated panel is the prior (worth ~2 votes), real thumbs dominate fast
  const rank = (a: Angle) => {
    const p = (a.panel.cfo + a.panel.coo + a.panel.ceo) / 30;
    const f = fb[a.id] || { up: 0, down: 0 };
    return (1 + 2 * p + f.up) / (2 + 2 + f.up + f.down);
  };
  async function vote(id: string, up: boolean) {
    setFb((o) => ({ ...o, [id]: { up: (o[id]?.up || 0) + (up ? 1 : 0), down: (o[id]?.down || 0) + (up ? 0 : 1) } }));
    await post("/api/feedback", { angle: id, up });
  }

  return (
    <div>
      {[...angles]
        .sort((a, b) => rank(b) - rank(a))
        .map((a, i) => (
          <div key={a.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>
                <b>#{i + 1}</b> <span className="tag">{a.format}</span> <span className="tag">panel CFO {a.panel.cfo} · COO {a.panel.coo} · CEO {a.panel.ceo} (simulated)</span>
              </span>
              <span className="row">
                <button className="ghost" onClick={() => vote(a.id, true)}>
                  👍 {fb[a.id]?.up || 0}
                </button>
                <button className="ghost" onClick={() => vote(a.id, false)}>
                  👎 {fb[a.id]?.down || 0}
                </button>
              </span>
            </div>
            <h2 style={{ margin: "8px 0" }}>{a.hook}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
            <p className="muted">Visual: {a.visual}</p>
            <p className="muted">Panel: “{a.panel.comment}”</p>
          </div>
        ))}
    </div>
  );
}

// Brand colour = most common strongly saturated hue in their homepage screenshot; also shrink it to a JPEG.
async function brandShot(src: string): Promise<{ shot: string; accent: string }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = Object.assign(document.createElement("canvas"), { width: 1280, height: Math.round((1280 * img.height) / img.width) });
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4 * 7) {
    const [r, gr, b] = [px[i], px[i + 1], px[i + 2]];
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
    if (max < 90 || (max - min) / max < 0.5) continue;
    const h = max === r ? ((gr - b) / (max - min) + 6) % 6 : max === gr ? (b - r) / (max - min) + 2 : (r - gr) / (max - min) + 4;
    const k = Math.round(h * 4);
    const e = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    bins.set(k, { n: e.n + 1, r: e.r + r, g: e.g + gr, b: e.b + b });
  }
  const top = [...bins.values()].sort((a, b) => b.n - a.n)[0];
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return { shot: c.toDataURL("image/jpeg", 0.85), accent: top && top.n > 200 ? `#${hex(top.r / top.n)}${hex(top.g / top.n)}${hex(top.b / top.n)}` : "#f2b544" };
}

function Video({ company }: { company: string }) {
  const [props, setProps] = useState<VideoProps | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/video/props?company=" + encodeURIComponent(company))
      .then((r) => r.json())
      .then(async (j) => {
        if (j.error) throw new Error(j.error);
        const p: VideoProps = j.props;
        setProps(p.shot ? { ...p, ...(await brandShot(p.shot)) } : p);
      })
      .catch((e) => setErr((e as Error).message));
  }, [company]);
  async function render() {
    setBusy(true);
    setErr("");
    try {
      setUrl((await post<{ url: string }>("/api/video", { props })).url);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>30-second film for {company}</h2>
      {!props && !err && <p className="loading">Capturing their homepage and building the film…</p>}
      {props && <Player component={CompanyVideo} inputProps={props} durationInFrames={DURATION} fps={30} compositionWidth={1920} compositionHeight={1080} initialFrame={45} style={{ width: "100%" }} controls />}
      <div className="row" style={{ marginTop: 8 }}>
        <button disabled={busy || !props} onClick={render}>
          {busy ? "Rendering MP4… (about a minute)" : "Render MP4"}
        </button>
        {url && (
          <a href={url} download>
            Download MP4
          </a>
        )}
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
