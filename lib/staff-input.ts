import {textInput} from "./validation";
export type StaffInput={kind:"staff"|"synthetic";company:string;notes:string;contact:string;lastContact:string;objection:string;owner:string;dataAccess:string;constraints:string;success:string;approved:boolean};
export const STAFF_TOOLS=["deadDeal","caseStudy","tradefair","hackathon","luotsi"];
export function parseStaffInput(id:string,raw:unknown,company=""):StaffInput|undefined {
 if(raw===undefined||raw==="")return undefined;
 if(!STAFF_TOOLS.includes(id)||typeof raw!=="string"||raw.length>14000)throw new Error("Staff input is invalid or too long.");
 let x;try{x=JSON.parse(raw);}catch{throw new Error("Staff input could not be read.");}
 if(!x||typeof x!=="object"||Array.isArray(x)||x.approved!==true)throw new Error("Confirm that this material is approved for AI processing before using it.");
 if(x.kind!=="staff"&&x.kind!=="synthetic")throw new Error("Identify whether the notes are a fictional sample or a staff-supplied record.");
 const optional=(key:string,max=1000)=>x[key]===undefined||x[key]===""?"":textInput(x[key],key,max);
 const result:StaffInput={kind:x.kind,company:textInput(company||x.company,"Company",200),notes:textInput(x.notes,"Original notes",8000),contact:optional("contact",200),lastContact:optional("lastContact",10),objection:optional("objection",1000),owner:optional("owner",200),dataAccess:optional("dataAccess"),constraints:optional("constraints"),success:optional("success"),approved:true};
 if(id==="deadDeal"){
  const date=result.lastContact,today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>today)throw new Error("Enter a valid last-contact date that is not in the future.");
 }
 return result;
}
export function scopeGaps(input:StaffInput):string[]{return ([['owner','Named process owner'],['dataAccess','Approved data/sample access'],['constraints','Privacy, system and timing constraints'],['success','Measurable acceptance criterion']] as const).filter(([k])=>!input[k].trim()||/^(unknown|not (known|confirmed|supplied|available)|tbd|tbc|n\/?a|none|pending|unsure|to be (confirmed|determined)|-+|\?+)$/i.test(input[k].trim())).map(([,label])=>label);}
