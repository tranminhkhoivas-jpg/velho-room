"use client";
import {useState} from "react";
import type {StaffInput} from "@/lib/staff-input";

export function StaffInputs({id,company,onChange}:{id:string;company:string;onChange:(raw:string)=>void}){
 const [enabled,setEnabled]=useState(false);
 const [value,setValue]=useState<StaffInput>({kind:"synthetic",company:"",notes:"",contact:"",lastContact:"",objection:"",owner:"",dataAccess:"",constraints:"",success:"",approved:false});
 function update(p:Partial<StaffInput>){const v={...value,...p};setValue(v);onChange(JSON.stringify({...v,company:company||v.company}));}
 return <details className="card"><summary>Use your own {id==="deadDeal"?"sales conversation":id==="caseStudy"?"project notes":id==="tradefair"?"booth conversation":"scope and constraints"}</summary>
  <label><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);onChange(e.target.checked?JSON.stringify({...value,company:company||value.company}):"");}}/> Use staff-supplied input instead of a sample-only draft</label>
  {enabled&&<fieldset><legend>Facts supplied by you</legend>
   <label style={{display:"block"}}>Record basis <select value={value.kind} onChange={e=>update({kind:e.target.value as StaffInput["kind"]})}><option value="synthetic">Fictional sample</option><option value="staff">Staff-supplied record — not independently verified</option></select></label>
   {!company&&<label style={{display:"block"}}>Company <input maxLength={200} value={value.company} onChange={e=>update({company:e.target.value})}/></label>}
   {(id==="deadDeal"||id==="tradefair")&&<label style={{display:"block"}}>Person you actually spoke with (optional) <input maxLength={200} value={value.contact} onChange={e=>update({contact:e.target.value})}/></label>}
   {id==="deadDeal"&&<><label style={{display:"block"}}>Last contact date <input type="date" value={value.lastContact} onChange={e=>update({lastContact:e.target.value})}/></label><label style={{display:"block"}}>Recorded objection or reason for postponing <input maxLength={1000} value={value.objection} onChange={e=>update({objection:e.target.value})}/></label></>}
   <label style={{display:"block"}}>Original notes — preserve measurements, dates and uncertainties <textarea rows={6} maxLength={8000} value={value.notes} onChange={e=>update({notes:e.target.value})} style={{width:"100%"}}/></label>
   {(id==="hackathon"||id==="luotsi")&&<>{([['owner','Process owner'],['dataAccess','Available approved data or sample'],['constraints','Constraints and exclusions'],['success','What observable result would count as success?']] as const).map(([k,label])=><label key={k} style={{display:"block"}}>{label} <input maxLength={k==="owner"?200:1000} value={value[k]} onChange={e=>update({[k]:e.target.value})} style={{width:"100%"}}/></label>)}<p>Unknown fields stay open and block a “ready to run” proposal; the tool will list what still needs agreeing.</p></>}
   <p className="note">Supplied notes go to OpenRouter to prepare the artifact and may be checked with Fastino. Use public or approved sample material. Generated artifacts are cached locally for up to a day; nothing is sent to a buyer.</p>
   <label><input type="checkbox" checked={value.approved} onChange={e=>update({approved:e.target.checked})}/> I confirm this material is approved for this AI processing.</label>
  </fieldset>}
 </details>;
}
