"use client";
import { useEffect,useState } from "react";
import { workload, type WorkTask } from "@/lib/workload";
import {ghostCard} from "@/lib/svg";
import { Draft } from "./Blocks";

export function WorkloadCalculator({ tasks,company }: { tasks: { task:string; hoursPerWeek:number; evidence:string }[];company:string }) {
  const [rows,setRows]=useState<WorkTask[]>(tasks.map(t=>({task:t.task,hours:t.hoursPerWeek,recoverable:25,basis:"hypothesis",evidence:t.evidence})));
  const [cost,setCost]=useState(30);
  const [running,setRunning]=useState(0);
  const [error,setError]=useState("");
  const [result,setResult]=useState<ReturnType<typeof workload>|null>(null);
  const [name,setName]=useState("Workload scenario"),[revision,setRevision]=useState(0),[saved,setSaved]=useState("");
  const storageKey="velho:workload:"+company.trim().toLocaleLowerCase();
  useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const s=JSON.parse(raw);const r=workload(s.rows,s.cost,s.running);setRows(s.rows);setCost(s.cost);setRunning(s.running);setName(String(s.name||"Workload scenario"));setRevision(s.revision||1);setResult(r);setSaved("Restored the latest saved scenario from this browser.");}}catch{setError("Saved scenario could not be restored. Original hypotheses are shown; calculate and save a new version.");}},[storageKey]);
  const card=result?ghostCard(company,{ghostName:name.slice(0,24),title:`Scenario version ${revision} · ${rows.length} tasks`,tagline:`Baseline ${result.baselineHours.toFixed(1)} h/wk; proposed recovery ${result.recoveredHours.toFixed(1)} h/wk`,tasks:rows.map(r=>({task:r.task,hoursPerWeek:r.hours})),fte:result.fteEquivalent,eurPerYear:result.annualCapacity,costLabel:"POTENTIAL CAPACITY · NOT CASH SAVINGS",basisLabel:"Employee-entered scenario · review assumptions below"}):"";
  function download(){const u=URL.createObjectURL(new Blob([card],{type:"image/svg+xml"}));const a=document.createElement("a");a.href=u;a.download="workload-scenario-v"+revision+".svg";a.click();URL.revokeObjectURL(u);}
  function update(i:number,patch:Partial<WorkTask>){setRows(rows.map((r,j)=>j===i?{...r,...patch}:r));setResult(null);setError("");}
  return <section className="card" aria-label="Workload scenario calculator">
    <h2>Replace the guesses with your own workload</h2>
    <p>The original card above is a public-data hypothesis. Calculate your scenario below to make a matching shareable card. Starting numbers remain hypotheses until checked. Saved versions stay in this browser, including your measurement notes; use approved samples on a shared device.</p>
    <form onSubmit={e=>{e.preventDefault();try{const r=workload(rows,cost,running),v=revision+1;setResult(r);setRevision(v);localStorage.setItem(storageKey,JSON.stringify({name,revision:v,rows,cost,running}));setSaved("Saved version "+v+" in this browser; reload restores it.");setError("");}catch(e){setError((e as Error).message);}}}>
      <label>Scenario name <input maxLength={100} required value={name} onChange={e=>{setName(e.target.value);setResult(null);}}/></label>
      {rows.map((r,i)=><fieldset key={i} style={{marginBottom:12}}><legend>{r.task}</legend>
        <label style={{display:"block"}}>Task name <input value={r.task} maxLength={300} required onChange={e=>update(i,{task:e.target.value})} style={{width:"100%"}}/></label>
        <label>Hours per week <input type="number" min="0" max="168" step="0.1" required value={r.hours} onChange={e=>update(i,{hours:e.target.valueAsNumber})}/></label>{" "}
        <label>Recoverable time (%) <input type="number" min="0" max="100" required value={r.recoverable} onChange={e=>update(i,{recoverable:e.target.valueAsNumber})}/></label>{" "}
        <label>Basis <select value={r.basis} onChange={e=>update(i,{basis:e.target.value as WorkTask["basis"],...(e.target.value==="measured sample"?{evidence:""}:{})})}><option value="hypothesis">Hypothesis</option><option value="employee estimate">Employee estimate</option><option value="measured sample">Measured sample</option></select></label>
        <label style={{display:"block"}}>Source or measurement notes <input value={r.evidence} maxLength={1000} required={r.basis==="measured sample"} onChange={e=>update(i,{evidence:e.target.value})} style={{width:"100%"}}/></label>
        <button type="button" className="ghost" disabled={rows.length===1} onClick={()=>{setRows(rows.filter((_,j)=>j!==i));setResult(null);}}>Remove task</button>
      </fieldset>)}
      <p><button type="button" className="ghost" disabled={rows.length>=50} onClick={()=>{setRows([...rows,{task:"New task",hours:0,recoverable:0,basis:"employee estimate",evidence:""}]);setResult(null);}}>Add your own task</button></p>
      <label>Loaded labour cost (EUR/hour) <input type="number" min="0" max="10000" step="0.01" required value={cost} onChange={e=>{setCost(e.target.valueAsNumber);setResult(null);}}/></label>{" "}
      <label>Annual running cost (EUR) <input type="number" min="0" max="1000000000" step="1" required value={running} onChange={e=>{setRunning(e.target.valueAsNumber);setResult(null);}}/></label>{" "}
      <button>Calculate scenario</button><span className="muted"> and save a new version</span>
    </form>
    {error&&<p role="alert" className="err">{error}</p>}
    {saved&&<p className="note">{result?saved:"Unsaved changes — calculate again to update the card and saved version."}</p>}
    {result&&<><div style={{maxWidth:480}} aria-label="Corrected workload scenario card" dangerouslySetInnerHTML={{__html:card}}/><button className="ghost" onClick={download}>Download this scenario card</button><p className="note">Card shows the first six task labels; the baseline total covers all {rows.length}. Share the detailed assumptions below with it. This is proposed recoverable capacity, not guaranteed savings.</p></>}
    {result&&<div role="status"><Draft label="Workload scenario — review with the process owner" text={`Baseline: ${result.baselineHours.toFixed(1)} hours/week.\nPotential time recovered: ${result.recoveredHours.toFixed(1)} hours/week (${result.fteEquivalent.toFixed(2)} FTE equivalent at 37.5h/week).\nAnnual capacity value: EUR ${result.annualCapacity.toFixed(0)}.\nAnnual running cost: EUR ${result.annualRunningCost.toFixed(0)}.\nNet annual capacity value: EUR ${result.netCapacity.toFixed(0)}.\n\nFormula: weekly hours × recoverable fraction × 52 weeks × EUR/hour, minus running cost.\nAssumptions: stable weekly workload, no overlap between tasks, 52 active weeks; setup cost is excluded. Capacity value is not guaranteed cash savings or a staffing reduction.\n\nInputs:\n${rows.map(r=>`${r.task}: ${r.hours} h/week, ${r.recoverable}% recoverable, basis: ${r.basis}. Notes: ${r.evidence||"not supplied"}`).join("\n")}`} /></div>}
  </section>;
}
