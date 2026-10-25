"use client";
import {useState} from "react";
import type {Entity,ClaimDecision} from "@/lib/fastino";
import {post} from "./api";

export function EvidenceReview(){
  const [source,setSource]=useState(""),[claim,setClaim]=useState(""),[entities,setEntities]=useState<Entity[]|null>(null),[decision,setDecision]=useState<ClaimDecision|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function run(action:"extract"|"check"){
    setBusy(true);setError("");if(action==="extract")setEntities(null);else setDecision(null);
    try{if(action==="extract"){const j=await post<{entities:Entity[]}>("/api/evidence",{action,source});setEntities(j.entities);}else{const j=await post<{decision:ClaimDecision}>("/api/evidence",{action,source,claim});setDecision(j.decision);}}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <details className="card"><summary>Check the source before using a draft</summary>
    <p>Paste the original public passage, then extract details with GLiNER 2.5 or check one proposed claim with GLiDE. Text is sent to Fastino with a request not to store the inference. Use public or approved sample material.</p>
    <label style={{display:"block"}}>Original source passage <textarea disabled={busy} maxLength={6000} rows={6} value={source} onChange={e=>{setSource(e.target.value);setEntities(null);setDecision(null);setError("");}} style={{width:"100%"}}/></label>
    <button type="button" disabled={busy||!source.trim()} onClick={()=>run("extract")}>Extract stated details</button>
    {entities&&<div role="status">{entities.length===0?<p>No matching details extracted. Absence here does not prove absence in the business.</p>:<ul>{entities.map((e,i)=><li key={i}><span className="tag">{e.label}</span> “{e.text}” <span className="muted">— characters {e.start}–{e.end}; model confidence {(100*e.confidence).toFixed(0)}%, not measured accuracy</span></li>)}</ul>}</div>}
    <label style={{display:"block"}}>Claim to check <textarea disabled={busy} rows={2} maxLength={1000} value={claim} onChange={e=>{setClaim(e.target.value);setDecision(null);setError("");}} style={{width:"100%"}}/></label>
    <button type="button" disabled={busy||!source.trim()||!claim.trim()} onClick={()=>run("check")}>Does the source support this claim?</button>
    {busy&&<p role="status">Checking the supplied source…</p>}{error&&<p role="alert" className="err">{error}</p>}
    {decision&&<p role="status" className="note">Machine support check: <b>{decision.verdict==="supported"?"Supported by the supplied passage":decision.verdict==="unsupported"?"Not supported — revise or remove the claim":"Uncertain — staff review required"}</b>. This is a model judgment, not independent verification of the source, date, author or claim. Nothing is approved or sent.</p>}
  </details>;
}
