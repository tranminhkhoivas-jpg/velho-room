"use client";
import { useEffect,useState } from "react";
import type { Angle } from "@/lib/seeds";
import { rankExperiments,replyLowerBound,type SavedExperiment,type Experiment } from "@/lib/experiments";
import { post } from "./api";

export function CampaignExperiments({angles}:{angles:Angle[]}) {
  const prefix=angles[0]?.id.replace(/-[^-]+$/,"-")||"";
  const [rows,setRows]=useState<SavedExperiment[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
  const [total,setTotal]=useState(0);
  const [form,setForm]=useState<Experiment>({angle:angles[0]?.id||"",creative:angles[0]?angles[0].hook+"\n\n"+angles[0].body:"",channel:"email",cohort:"",mode:"reported",exposures:0,replies:0,meetings:0,evidence:""});
  async function load(){const r=await fetch("/api/experiments?prefix="+encodeURIComponent(prefix));const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load results");setRows(j.experiments);setTotal(j.total??j.experiments.length);}
  useEffect(()=>{let active=true;fetch("/api/experiments?prefix="+encodeURIComponent(prefix)).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load results");if(active){setRows(j.experiments);setTotal(j.total??j.experiments.length);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[prefix]);
  const ranked=rankExperiments(rows,form.channel,form.cohort.trim());
  const existing=rows.find(r=>r.angle===form.angle&&r.channel===form.channel&&r.cohort===form.cohort.trim()&&r.mode===form.mode);
  function change(p:Partial<Experiment>){setForm({...form,...p});setStatus("");}
  return <section className="card" aria-label="Observed campaign experiments"><h2>Learn from observed campaign results</h2>
    <p>Record a cumulative snapshot for one variant and non-overlapping audience cohort. Re-saving the same angle/channel/cohort replaces its counts; retries do not add people. Only staff-reported observations appear in the comparison. Nothing is published or sent.</p>
    <p className="note">AI panel scores and thumbs below are opinions. Reported results here are entered by staff and not independently verified. Compare the same channel and cohort; differences may reflect audience or timing rather than content.</p>
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");setStatus("");try{await post("/api/experiments",{...form,expectedUpdated:existing?.updated});await load();setStatus("Saved cumulative result. Identical retries do not duplicate it.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
      <label>Content angle <select value={form.angle} onChange={e=>{const a=angles.find(a=>a.id===e.target.value)!;change({angle:a.id,creative:a.hook+"\n\n"+a.body});}}>{angles.map(a=><option key={a.id} value={a.id}>{a.hook}</option>)}</select></label>{" "}
      <label>Channel <select value={form.channel} onChange={e=>change({channel:e.target.value as Experiment["channel"]})}>{["email","LinkedIn","event","other"].map(c=><option key={c}>{c}</option>)}</select></label>{" "}
      <label>Cohort / test name <input required maxLength={120} value={form.cohort} onChange={e=>change({cohort:e.target.value})} placeholder="e.g. October CFO group A"/></label>{" "}
      <label>Data basis <select value={form.mode} onChange={e=>change({mode:e.target.value as Experiment["mode"]})}><option value="reported">Staff-reported observation</option><option value="synthetic">Synthetic test</option></select></label>
      <div className="row">{([['exposures','People reached (unique in variant)'],['replies','People who replied'],['meetings','Meetings from those replies']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="100000000" step="1" required value={form[key]} onChange={e=>change({[key]:e.target.valueAsNumber})}/></label>)}</div>
      <label style={{display:"block"}}>Source report URL or measurement notes <input required maxLength={2000} value={form.evidence} onChange={e=>change({evidence:e.target.value})} style={{width:"100%"}}/></label>
      <label style={{display:"block"}}>Exact content used in this test <textarea rows={4} required maxLength={6000} value={form.creative||""} onChange={e=>change({creative:e.target.value})} style={{width:"100%"}}/></label>
      <p className="muted">Use a new test name when content changes. Saved content is retained even after new angles are generated.</p>
      <button disabled={busy}>{existing?"Update this cohort result":"Save result"}</button>{" "}<button type="button" className="ghost" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}>Reload results</button>
    </form>
    {error&&<p role="alert" className="err">{error}</p>}{status&&<p role="status">{status}</p>}
    {total>rows.length&&<p className="note">Only the latest {rows.length} of {total} saved snapshots are loaded. This comparison is incomplete; inspect the stored data before choosing an angle.</p>}
    <h3>Observed comparison: {form.channel}, {form.cohort||"choose a cohort"}</h3>
    {!ranked.length?<p>No staff-reported audience data in this comparison. No winning angle can be inferred.</p>:<div className="tablewrap"><table><thead><tr><th>Angle</th><th>Reached</th><th>Replies</th><th>Meetings</th><th>Reply rate</th><th>Conservative bound</th></tr></thead><tbody>{ranked.map(r=><tr key={r.angle}><td>{r.creative?.split("\n")[0]?.slice(0,160)||"Legacy content not recorded"}<small style={{display:"block"}}>Variant {r.angle} · {r.cohort}</small></td><td>{r.exposures}</td><td>{r.replies}</td><td>{r.meetings}</td><td>{(100*r.replies/r.exposures).toFixed(1)}%</td><td>{(100*(replyLowerBound(r)||0)).toFixed(1)}%</td></tr>)}</tbody></table></div>}
    <p className="muted">Order uses a descriptive 95% Wilson lower bound on reply rate, so tiny samples are treated cautiously. It is not a causal test, guaranteed conversion or proof of statistical superiority. Zero-reach and synthetic records are excluded.</p>
    <details><summary>All saved snapshots ({rows.length})</summary>{rows.map(r=><div className="card" key={[r.angle,r.channel,r.cohort,r.mode].join(":")}><p><b>{r.cohort}</b> · {r.channel} · {r.mode} · {r.exposures} reached / {r.replies} replies / {r.meetings} meetings. Source: {r.evidence}</p><pre style={{whiteSpace:"pre-wrap"}}>{r.creative||"Legacy record: exact content was not preserved. Add the original content before updating."}</pre><button type="button" className="ghost" onClick={()=>{const {updated,...values}=r;change({...values,creative:r.creative||""});}}>Edit snapshot</button></div>)}</details>
  </section>;
}
