"use client";
import {useEffect,useState} from "react";
import type {LeadWork,QuizContext} from "@/lib/lead-work";
export function LeadAction({id,work,context,email}:{id:number;work:LeadWork;context?:QuizContext;email:string}){
 const [value,setValue]=useState(work),[err,setErr]=useState(""),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 useEffect(()=>{if(!dirty&&work.updated>value.updated)setValue(work);},[work,dirty,value.updated]);
 function change(p:Partial<LeadWork>){setValue({...value,...p});setDirty(true);setSaved(false);}
 async function save(){setBusy(true);setErr("");try{const r=await fetch("/api/lead",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,work:value,expectedUpdated:value.updated})}),j=await r.json();if(!r.ok)throw new Error(j.error);setValue(j.work);setDirty(false);setSaved(true);}catch(e){setErr((e as Error).message);}finally{setBusy(false);}}
 return <div className="card"><p><b>Visitor intent:</b> {context?.intent||"Not recorded (older entry)"} · <b>Follow-up permission:</b> {email&&context?.contactPermission?"Visitor explicitly permitted email follow-up":"Not granted — do not use the address for follow-up"}</p>
  {context&&<p>Task: {context.task||"Not supplied"}<br/>Constraints: {context.constraints||"Not supplied"}</p>}
  <p className="muted">A high opportunity score is not a request to be contacted. This queue only records staff actions; it sends nothing.</p>
  <fieldset disabled={busy}><legend>Staff next action</legend><div className="row"><label>Owner <input maxLength={200} value={value.owner} onChange={e=>change({owner:e.target.value})}/></label><label>Status <select value={value.status} onChange={e=>change({status:e.target.value as LeadWork["status"]})}>{["new","reviewing","waiting","closed"].map(s=><option key={s}>{s}</option>)}</select></label><label>Due date <input type="date" value={value.due} onChange={e=>change({due:e.target.value})}/></label></div><label>Next action <input maxLength={1000} value={value.nextAction} onChange={e=>change({nextAction:e.target.value})} style={{width:"100%"}}/></label><button disabled={!dirty} onClick={save}>{busy?"Saving…":"Save next action"}</button></fieldset>
  {saved&&<p role="status">Saved on this laptop.</p>}{err&&<p role="alert" className="err">{err}</p>}
 </div>;
}
