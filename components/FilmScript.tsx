"use client";
import type {VideoProps} from "@/video/CompanyVideo";
export function FilmScript({value,disabled,onChange}:{value:VideoProps;disabled:boolean;onChange:(p:VideoProps)=>void}){
 const field=(label:string,text:string,max:number,change:(s:string)=>void)=><label style={{display:"block"}}>{label} <textarea rows={2} maxLength={max} value={text} onChange={e=>change(e.target.value)} style={{width:"100%"}}/></label>;
 return <details className="card"><summary>Review and edit the film script</summary><fieldset disabled={disabled}><legend>Public-data draft — check every claim before export</legend><p>Keep text short for the 30-second format. Editing clears the previous download and review checkbox. Preview each scene before rendering. Edits stay in this browser until rendered.</p>
 {field("Company description",value.oneLiner,150,oneLiner=>onChange({...value,oneLiner}))}
 {value.signals.map((s,i)=><div className="card" key={i}><p>Timeline {s.date} · {s.source||"Source not recorded"}</p>{field("Timeline text "+(i+1),s.text,120,text=>onChange({...value,signals:value.signals.map((v,j)=>j===i?{...v,text}:v)}))}</div>)}
 {field("Public priority (paraphrase, not a verbatim quotation)",value.quote.text,170,text=>onChange({...value,quote:{...value.quote,text,paraphrase:true}}))}
 {value.findings.map((f,i)=><div className="card" key={i}>{field("Finding "+(i+1)+" headline",f.title,85,title=>onChange({...value,findings:value.findings.map((v,j)=>j===i?{...v,title}:v)}))}{field("Finding "+(i+1)+" evidence",f.fact,130,fact=>onChange({...value,findings:value.findings.map((v,j)=>j===i?{...v,fact}:v)}))}</div>)}
 {field("Closing question",value.question,140,question=>onChange({...value,question}))}
 </fieldset></details>;
}
