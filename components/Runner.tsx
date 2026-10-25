"use client";
import { useEffect, useRef, useState } from "react";
import type { Angle, SeedMeta } from "@/lib/seeds";
import type { Artifact } from "@/lib/types";
import { post } from "./api";
import { Blocks, Draft } from "./Blocks";
import { Chat } from "./Chat";
import { Quiz } from "./Quiz";
import { ProofDemo } from "./ProofDemo";
import { WorkloadCalculator } from "./WorkloadCalculator";
import { CampaignExperiments } from "./CampaignExperiments";
import { EvidenceReview } from "./EvidenceReview";
import type {IndustryIndex} from "@/lib/industry";
import {StaffInputs} from "./StaffInputs";
import {STAFF_TOOLS} from "@/lib/staff-input";
import {LeadAction} from "./LeadAction";
import {FilmScript} from "./FilmScript";
import type {LeadWork,QuizContext} from "@/lib/lead-work";
import { Player } from "@remotion/player";
import { CompanyVideo, DURATION, type VideoProps } from "@/video/CompanyVideo";
import { LyricVideo, type LyricProps } from "@/video/LyricVideo";

type Opt = { id: string; label: string };

export function Runner({ meta, options }: { meta: SeedMeta; options: Opt[] }) {
  const [company, setCompany] = useState("");
  const [pick, setPick] = useState(options[0]?.id || "");
  const [art, setArt] = useState<(Artifact & { angles?: Angle[] }) | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const version = useRef(0);
  const [resultCompany, setResultCompany] = useState("");
  const [staffInput,setStaffInput]=useState("");
  const [fund,setFund]=useState("1000000");
  function changeCompany(c: string) { version.current++; setCompany(c); setArt(null); setErr(""); setBusy("");setStaffInput(""); }
  const [spend, setSpend] = useState<number | null>(null);
  const [isAudit, setIsAudit] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("c");
    if (c) setCompany(c);
  }, []);

  async function run(extra: Record<string, string> = {}, c = company) {
    const request = ++version.current;
    setBusy("Researching live and writing… (30–90 s on a new company)");
    setErr("");
    setArt(null);
    try {
      const body = { company: c, dealId: meta.ui === "crm"&&!staffInput ? pick : "", noteId: meta.ui === "notes"&&!staffInput ? pick : "", staffInput, ...(meta.ui === "fund" ? { fund } : {}), ...extra };
      const r = await post<{ artifact: Artifact & { angles?: Angle[] }; spend: number; auditSpend?:number|null }>(`/api/seed/${meta.id}`, body);
      if (request !== version.current) return;
      setResultCompany(c);
      setArt(r.artifact);
      if (c) history.replaceState(null, "", "?c=" + encodeURIComponent(c));
      setIsAudit(r.auditSpend !== null && r.auditSpend !== undefined);
      setSpend(r.auditSpend ?? r.spend);
    } catch (e) {
      if (request === version.current) setErr((e as Error).message);
    }
    if (request === version.current) setBusy("");
  }

  const companyBar = meta.needsCompany && meta.ui !== "photo" && (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
    >
      <input value={company} onChange={(e) => changeCompany(e.target.value)} placeholder="Company name" aria-label="Company" />
      {meta.ui === "fund" && <input type="number" min={1000} max={1000000000} step={1000} value={fund} onChange={(e) => { version.current++; setFund(e.target.value); setArt(null); }} aria-label="Fund size in euros" title="Fund size in euros" style={{ maxWidth: 170 }} />}
      <button disabled={!!busy || !company.trim()}>Run</button>
      <button type="button" className="ghost" disabled={!!busy || !company.trim()} onClick={async () => {
        setBusy("Refreshing company research and replacing old results…"); setErr(""); setArt(null);
        const request = ++version.current;
        try {
          await post("/api/dossier", {company, fresh:true});
          if (request === version.current) await run({fresh:"1"});
        } catch (e) { if (request === version.current) {setErr((e as Error).message);setBusy("");} }
      }}>Refresh research</button>
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
      {meta.needsCompany && <p className="note">Public clues support a conversation, not a diagnosis. Suggested process problems, savings and builds are hypotheses until the company confirms them.</p>}
      {companyBar}
      {STAFF_TOOLS.includes(meta.id)&&(meta.ui!=="photo"||company)&&<><StaffInputs key={meta.id+company} id={meta.id} company={company} onChange={raw=>{version.current++;setStaffInput(raw);setArt(null);setErr("");setBusy("");}}/>{staffInput&&<button disabled={!!busy} onClick={()=>run()}>Generate using staff input</button>}</>}
      {meta.ui === "photo" && <Photo busy={!!busy} onCompany={(c) => {if(c.trim().toLocaleLowerCase()===company.trim().toLocaleLowerCase())run({},c);else{changeCompany(c);run({staffInput:""},c);}}} />}
      {(meta.ui === "crm" || meta.ui === "notes") && (
        <div className="row">
          {!staffInput&&<select value={pick} aria-label="Choose a synthetic record" onChange={(e) => { version.current++; setPick(e.target.value); setArt(null); setErr(""); setBusy(""); }} style={{ flex: 1 }}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>}
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
      {busy && <p role="status" className="loading">{busy}</p>}
      {err && <p role="alert" className="err">{err}</p>}
      {art?.angles && <><CampaignExperiments key={art.angles.map(a=>a.id).join(":")} angles={art.angles} /><Campaign angles={art.angles} /></>}
      {art && meta.id === "song" && <Song key={resultCompany + JSON.stringify(art.title)} company={resultCompany} />}
      {art && meta.id === "media" && <Video key={resultCompany + JSON.stringify(art.title)} company={resultCompany} />}
      {art && <Blocks artifact={art} />}
      {art?.proof && <ProofDemo key={resultCompany + art.proof.collectedAt} data={art.proof} />}
      {art?.workload && <WorkloadCalculator key={resultCompany + art.title} tasks={art.workload} company={resultCompany} />}
      {art && <EvidenceReview key={resultCompany + art.title} />}
      {art && meta.ui === "chat-website" && <Chat key={resultCompany} mode="website" company={resultCompany} opener={`Live assistant built only from ${company}'s public website. Ask it what a customer would ask.`} />}
      {art && meta.ui === "chat-cfo" && <Chat key={resultCompany} mode="cfo" company={resultCompany} opener="AI simulation of the CFO using available public research and report text. Review source limitations above. Pitch Velho; it will push back. Voice works in Chrome/Edge." />}
      {spend !== null && <p className="muted" style={{ fontSize: 12 }}>{isAudit ? "OpenRouter audit spend (Fastino checks logged separately)" : "OpenRouter spend so far"}: ${spend.toFixed(2)}</p>}
    </main>
  );
}

function Photo({ busy, onCompany }: { busy: boolean; onCompany: (c: string) => void }) {
  const [seen, setSeen] = useState("");
  const [err, setErr] = useState("");
  const [manual, setManual] = useState("");
  const [reading, setReading] = useState(false);
  useEffect(() => { setManual(new URLSearchParams(location.search).get("c") || ""); }, []);

  async function onFile(f: File) {
    setErr("");
    setSeen("Reading the photo…");
    setReading(true);
    try {
    if (!f.type.startsWith("image/") || f.size > 15 * 1024 * 1024) throw new Error("Choose an image under 15 MB, or type the company below.");
    // shrink to ~1024px so phone photos upload fast
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = Object.assign(document.createElement("canvas"), { width: img.width * k, height: img.height * k });
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      img.close();
      const r = await post<{ company: string | null; confidence: number; seen: string }>("/api/photo", { image: c.toDataURL("image/jpeg", 0.8) });
      if (!r.company) return setSeen(`Could not tell which company (saw: ${r.seen}). Type it below.`);
      setSeen(`Recognised ${r.company} (${Math.round(r.confidence * 100)}% sure; saw “${r.seen}”).`);
      setManual(r.company);
    } catch (e) {
      setErr((e as Error).message);
      setSeen("");
    } finally { setReading(false); }
  }

  return (
    <div className="card">
      <label>
        <b>Snap a booth, badge or business card</b>
        <br />
        <input type="file" accept="image/*" capture="environment" disabled={busy || reading} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {seen && <p>{seen}</p>}
      {err && <p role="alert" className="err">{err}</p>}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onCompany(manual.trim());
        }}
      >
        <input value={manual} aria-label="Confirm company name" onChange={(e) => setManual(e.target.value)} placeholder="…or type the company" />
        <button disabled={busy || reading || !manual.trim()}>Confirm company and brief me</button>
      </form>
    </div>
  );
}

function Pipeline() {
  const [talk, setTalk] = useState("keynote-" + new Date().toISOString().slice(0, 10));
  const [origin, setOrigin] = useState("");
  const [leads, setLeads] = useState<{ id: number; name: string; company: string; role: string; email: string;contactCount?:number;work:LeadWork; result: { score: number; headline: string; pending?:boolean; meetingDraft: string;context?:QuizContext } }[]>([]);
  const [total,setTotal]=useState(0);
  const [search,setSearch]=useState(""),[before,setBefore]=useState<number|null>(null),[next,setNext]=useState<number|null>(null);
  useEffect(() => {setOrigin(location.origin);const tag=new URLSearchParams(location.search).get("talk");if(tag)setTalk(tag);}, []);

  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLeads([]); setLoadError("");
    async function load() {
      try {
        const r = await fetch("/api/lead?talk=" + encodeURIComponent(talk)+"&search="+encodeURIComponent(search)+(before?"&before="+before:""), { signal: controller.signal });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not load leads.");
        if (active) { setLeads(j.leads);setTotal(j.total??j.leads.length);setNext(j.nextCursor); setLoadError(""); }
      } catch (e) { if (active) setLoadError((e as Error).message); }
    }
    load(); const t = setInterval(load, 5000);
    return () => { active = false; controller.abort(); clearInterval(t); };
  }, [talk,search,before]);

  const url = `${origin}/check?talk=${encodeURIComponent(talk)}`;
  return (
    <div>
      <div className="card">
        <div className="row">
          <b>Talk tag</b>
            <input value={talk} maxLength={200} aria-label="Talk tag" onChange={(e) => {setTalk(e.target.value);setBefore(null);const u=new URL(location.href);u.searchParams.set("talk",e.target.value);history.replaceState(null,"",u);}} />
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
      <h2>Leads from this talk ({total})</h2><label>Find a contact, name or company <input value={search} onChange={e=>{setSearch(e.target.value);setBefore(null);}}/></label><div className="row"><button className="ghost" disabled={!before} onClick={()=>setBefore(null)}>Latest submissions</button><button className="ghost" disabled={!next} onClick={()=>setBefore(next)}>Older submissions</button></div>
        {total>leads.length&&<p className="note">Showing {leads.length} of {total} matching submissions. Use Older submissions or search to find the rest.</p>}
      {loadError && <p role="alert" className="err">{loadError}</p>}
      {leads.length === 0 && <p className="muted">None yet — scan the QR with a phone to try it.</p>}
      {leads.map((l) => (
        <div key={l.id} className="card">
          <b>{l.name || "Anonymous"}</b> {l.company && `· ${l.company}`} · {l.role} <span className="tag">opportunity indicator {l.result.score}</span>
          <p className="muted">{l.result.headline}</p>
          {l.email && <p>Contact: {l.email} · {l.contactCount||1} submission(s) across talks. {(l.contactCount||0)>1&&<button className="ghost" onClick={()=>{setTalk("");setSearch(l.email);setBefore(null);}}>View contact history</button>}</p>}
          <LeadAction id={l.id} work={l.work} context={l.result.context} email={l.email}/>
          {l.result.pending&&<p className="note">Answers saved. Personalised result pending; no meeting draft is ready.</p>}
          {l.email&&!l.result.pending&&l.result.meetingDraft&&l.result.context?.contactPermission&&<Draft label="Meeting request (permission recorded; staff review still required)" text={l.result.meetingDraft} />}
        </div>
      ))}
    </div>
  );
}

function AiIndex() {
  const [industry, setIndustry] = useState("logistics");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<IndustryIndex | null>(null);
  const [err, setErr] = useState("");
  async function go(fresh=false) {
    setBusy(true);
    setErr(""); setR(null);
    try {
      setR(await post("/api/aiindex", { industry,fresh }));
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
        <input aria-label="Industry" disabled={busy} value={industry} maxLength={120} onChange={(e) => {setIndustry(e.target.value);setR(null);}} placeholder="Industry, e.g. construction" />
        <button disabled={busy}>{busy ? "Sweeping the web…" : "Check"}</button>
        <button type="button" className="ghost" disabled={busy||!industry.trim()} onClick={()=>go(true)}>Refresh evidence</button>
      </form>
      {err && <p role="alert" className="err">{err}</p>}
      {r && (
        <>
          <p>
            <b>{r.coverage?.supported??0} source-supported candidate examples</b> ({r.asOf}). {r.summary}
          </p>
          <ul>
            {r.examples.map((x, i) => (
              <li key={i}>
                <b>{x.company}</b>: {x.what}{" "}
                <span className="tag">{x.status||"not reviewed"}</span>{" "}
                <a href={x.url} target="_blank" rel="noreferrer">
                  source
                </a>
                {x.date&&<span> · Research-supplied date: {x.date}; confirm in original.</span>}
                {x.checkNote&&<p className="muted">{x.checkNote}</p>}
                {x.identity&&<p>Matched Finnish legal entity: <a href={x.identity.url} target="_blank" rel="noreferrer">{x.identity.name} ({x.identity.businessId})</a>. Confirm that the case concerns this entity.</p>}
                {x.sourceExcerpt&&<details><summary>Inspect original passage used for the check</summary><pre style={{whiteSpace:"pre-wrap"}}>{x.sourceExcerpt}</pre></details>}
              </li>
            ))}
          </ul>
          <p className="note">Coverage: {r.coverage?.candidates??r.examples.length} candidates, {r.coverage?.readable??0} readable source windows. These are discovery results with machine checks, not independent proof of adoption. Source passages are sent to Fastino with inference storage disabled requested.</p>
          {r.registry && (
            <p>
              Finnish trade register, model-selected industry code {r.tol} (confirm its fit): <b>{r.registry.companies.toLocaleString("en")}</b> companies, <b>{r.registry.newLast12m.toLocaleString("en")}</b> registered in the last 12 months (includes inactive ones; not an adoption denominator).{" "}
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
  const [voteError, setVoteError] = useState("");
  const [voted, setVoted] = useState<Record<string,boolean>>({});
  const prefix = angles[0]?.id.replace(/-[^-]+$/, "-") || "";
  useEffect(() => {
    fetch("/api/feedback?prefix=" + encodeURIComponent(prefix))
      .then((r) => r.json())
      .then((j) => { if (!j.feedback) throw new Error(j.error || "Could not load votes"); setFb(j.feedback); }).catch((e) => setVoteError(e.message));
  }, [prefix]);

  // ponytail: Beta-mean bandit — simulated panel is the prior (worth ~2 votes), real thumbs dominate fast
  const rank = (a: Angle) => {
    const p = (a.panel.cfo + a.panel.coo + a.panel.ceo) / 30;
    const f = fb[a.id] || { up: 0, down: 0 };
    return (1 + 2 * p + f.up) / (2 + 2 + f.up + f.down);
  };
  async function vote(id: string, up: boolean) {
    if (voted[id]) return;
    setVoted((v) => ({...v,[id]:true})); setVoteError("");
    try {
      await post("/api/feedback", { angle: id, up });
      setFb((o) => ({ ...o, [id]: { up: (o[id]?.up || 0) + (up ? 1 : 0), down: (o[id]?.down || 0) + (up ? 0 : 1) } }));
    } catch (e) { setVoted((v)=>({...v,[id]:false})); setVoteError((e as Error).message); }
  }

  return (
    <div>
      <h2>Draft angles: AI panel and staff preferences</h2>
      <p className="muted">This order reflects simulated buyer opinions and employee thumbs. Use the separate observed-results comparison above for campaign evidence.</p>
      {voteError && <p role="alert" className="err">{voteError}</p>}
      {[...angles]
        .sort((a, b) => rank(b) - rank(a))
        .map((a, i) => (
          <div key={a.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>
                <b>#{i + 1}</b> <span className="tag">{a.format}</span> <span className="tag">panel CFO {a.panel.cfo} · COO {a.panel.coo} · CEO {a.panel.ceo} (simulated)</span>
              </span>
              <span className="row">
                <button className="ghost" disabled={voted[a.id]} onClick={() => vote(a.id, true)}>
                  👍 {fb[a.id]?.up || 0}
                </button>
                <button className="ghost" disabled={voted[a.id]} onClick={() => vote(a.id, false)}>
                  👎 {fb[a.id]?.down || 0}
                </button>
              </span>
            </div>
            <h2 style={{ margin: "8px 0" }}>{a.hook}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
            {a.theme&&<p className="muted">Theme: {a.theme}</p>}
            {a.review&&<p className="note">{a.review}</p>}
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
  const [reviewed,setReviewed]=useState(false);
  const [filmSources,setFilmSources]=useState<{title:string;url:string}[]>([]);
  useEffect(() => {
    setProps(null); setUrl(""); setErr("");setReviewed(false);setFilmSources([]);
    let active = true;
    fetch("/api/video/props?company=" + encodeURIComponent(company))
      .then((r) => r.json())
      .then(async (j) => {
        if (j.error) throw new Error(j.error);
        const p: VideoProps = j.props;
        const ready = p.shot ? { ...p, ...(await brandShot(p.shot).catch(() => ({shot:p.shot, accent:p.accent}))) } : p;
        if (active) {setProps(ready);setFilmSources(j.sources||[]);}
      })
      .catch((e) => { if (active) setErr((e as Error).message); });
    return () => { active = false; };
  }, [company]);
  async function render() {
    setBusy(true);
    setErr("");
    try {
      let r = await post<{id:string;status:string;url?:string;error?:string}>("/api/video", { props });
      const until = Date.now() + 300000;
      while (r.status !== "ready" && r.status !== "failed" && Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const response = await fetch("/api/video?status=1&id=" + r.id);
        if (!response.ok) throw new Error("Could not check the render. Sign in again if your session expired.");
        r = await response.json();
      }
      if (!r.url) throw new Error(r.error || "The render is still queued. Retry to check the same job; it will not start a duplicate.");
      setUrl(r.url);
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
      {props&&<><FilmScript value={props} disabled={busy} onChange={p=>{setProps(p);setUrl("");setReviewed(false);setErr("");}}/><details><summary>Original research sources for script review ({filmSources.length})</summary><ul>{filmSources.map((s,i)=><li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul></details><label><input type="checkbox" disabled={busy} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed the current script against its sources and previewed the scenes. Export stays local; publication needs approval.</label></>}
      <div className="row" style={{ marginTop: 8 }}>
        <button disabled={busy || !props || !reviewed} onClick={render}>
          {busy ? "Rendering MP4… (about a minute)" : "Render MP4"}
        </button>
        {url && (
          <a href={url} download>
            Download MP4
          </a>
        )}
      </div>
      {err && <p role="alert" className="err">{err}</p>}
    </div>
  );
}

// Polls a queued job (song or render) until it is ready or failed.
async function waitFor<T extends { id: string; status: string; error?: string }>(first: T, statusUrl: (id: string) => string): Promise<T> {
  let r = first;
  const until = Date.now() + 300000;
  while (r.status !== "ready" && r.status !== "failed" && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(statusUrl(r.id));
    if (!response.ok) throw new Error("Could not check the job. Sign in again if your session expired.");
    r = await response.json();
  }
  if (r.status !== "ready") throw new Error(r.error || "Still working. Press the button again to check the same job; it will not start a duplicate.");
  return r;
}

function Song({ company }: { company: string }) {
  const [props, setProps] = useState<LyricProps | null>(null);
  const [busy, setBusy] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  async function sing() {
    setBusy("Lyria is writing and singing the song… (about a minute)"); setErr(""); setUrl("");
    try {
      const r = await waitFor(await post<{ id: string; status: string; error?: string }>("/api/song", { company }), (id) => `/api/song?status=1&id=${id}`);
      const meta = await (await fetch(`/api/song?meta=1&id=${r.id}`)).json();
      setBusy("Capturing their homepage for the backdrop…");
      const v = await fetch("/api/video/props?company=" + encodeURIComponent(company)).then((x) => x.json()).catch(() => ({}));
      const look = v.props?.shot ? await brandShot(v.props.shot).catch(() => ({ shot: "", accent: v.props.accent || "#f2b544" })) : { shot: "", accent: "#f2b544" };
      const plan = await post<{ artifact: Artifact }>("/api/seed/song", { company }).then((x) => x.artifact.song?.plan);
      setProps({ company, title: plan?.title || "A song for " + company, genre: plan?.genre || "", ...look, audio: `/api/song?id=${r.id}`, duration: meta.duration, lines: meta.lines, facts: (plan?.facts || []).map((x) => x.text).slice(0, 6) });
    } catch (e) { setErr((e as Error).message); }
    setBusy("");
  }
  async function render() {
    setBusy("Rendering the music video… (a few minutes)"); setErr("");
    try {
      const r = await waitFor(await post<{ id: string; status: string; url?: string; error?: string }>("/api/video", { composition: "LyricVideo", props }), (id) => `/api/video?status=1&id=${id}`);
      setUrl(r.url || "");
    } catch (e) { setErr((e as Error).message); }
    setBusy("");
  }
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>The song and its music video</h2>
      {!props && <button disabled={!!busy} onClick={sing}>Make the song (about $0.10)</button>}
      {busy && <p className="loading">{busy}</p>}
      {props && <>
        <audio controls src={props.audio} style={{ width: "100%" }} />
        <Player component={LyricVideo} inputProps={props} durationInFrames={Math.max(90, Math.ceil(props.duration * 30))} fps={30} compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", marginTop: 8 }} controls />
        <div className="row" style={{ marginTop: 8 }}>
          <button disabled={!!busy} onClick={render}>Render music video MP4</button>
          {url && <a href={url} download>Download MP4</a>}
        </div>
      </>}
      {err && <p className="err">{err}</p>}
      <p className="note">AI music by Google Lyria. Draft for staff review; nothing is published or sent.</p>
    </div>
  );
}
