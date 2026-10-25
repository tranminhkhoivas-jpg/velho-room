"use client";
import { useState } from "react";
import { proofCsv, proofReply, searchProof, type ProofData, type ProofRecord } from "@/lib/proof";
import { Draft } from "./Blocks";

export function ProofDemo({ data }: { data: ProofData }) {
  const [query, setQuery] = useState("");
  const [excluded,setExcluded]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [result, setResult] = useState<{ records: ProofRecord[]; milliseconds: number } | null>(null);
  function download() {
    const url = URL.createObjectURL(new Blob([proofCsv(data.records)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "public-evidence-records.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="card" aria-label="Working public-data demonstration">
    <h2>Try the working demo: enquiry evidence finder</h2>
    <p>Before: {data.inputCharacters.toLocaleString()} characters across {data.pages.length} public pages. After: {data.records.length} traceable records that can be searched and exported.</p>
    <p className="muted">Try words from an actual customer enquiry. This example finds literal public passages; it does not infer an answer or access internal systems. Queries stay in this browser and use no AI calls.</p>
    {!data.records.length ? <p role="status" className="note">The collected pages contain no usable passages. Inspect the sources below; this demo cannot answer enquiries from these pages.</p> : <>
      <form onSubmit={e => { e.preventDefault(); const start = performance.now(); const records = searchProof(data, query,excluded); setSelected(records.map(r=>r.id));setResult({ records, milliseconds: performance.now() - start }); }}>
        <label htmlFor="proof-enquiry">Customer enquiry or topic</label>
        <div className="row"><input id="proof-enquiry" value={query} maxLength={500} onChange={e => { setQuery(e.target.value); setResult(null); }} placeholder="e.g. delivery, stores, sustainability — use the source language" /><button disabled={!query.trim()}>Find evidence</button></div>
        <label>Exclude words <input value={excluded} maxLength={200} onChange={e=>{setExcluded(e.target.value);setResult(null);}} placeholder="e.g. balcony"/></label>
        <p className="muted">Keyword search, not question answering. Excluded words remove whole passages. Use the source language; select only passages that answer your enquiry.</p>
      </form>
      {result && <div role="status"><p>{result.records.length} matching passage(s), {result.milliseconds.toFixed(1)} ms in this browser. This is search latency, not a measured business saving.</p>{result.records.map(r=><label key={r.id} style={{display:"block"}}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/>{r.id}: {r.excerpt.slice(0,180)}</label>)}<Draft key={query+selected.join(":")} label="Selected evidence for your reply — check that it answers the question" text={proofReply(result.records.filter(r=>selected.includes(r.id)))} /></div>}
      <button className="ghost" onClick={download}>Download all evidence records (CSV)</button>
    </>}
    <details><summary>Inspect the actual input and extracted records</summary>
      <p>Collected {new Date(data.collectedAt).toLocaleString()}. Duplicate lines and very short or oversized passages are omitted. Matching uses keywords, so a relevant passage may still require context.</p>
      {data.pages.map(p => <details key={p.url}><summary>{p.url}</summary><a href={p.url} target="_blank" rel="noreferrer">Open original</a><pre style={{ whiteSpace: "pre-wrap" }}>{p.text}</pre></details>)}
      <ol>{data.records.map(r => <li key={r.id}><b>{r.id}</b> {r.excerpt} <a href={r.source} target="_blank" rel="noreferrer">source</a></li>)}</ol>
    </details>
    <p className="note">Built on {data.company}&apos;s public information. A production enquiry workflow would also need the company&apos;s routing rules, private knowledge, owner and approval process. No enquiry is sent.</p>
  </section>;
}
