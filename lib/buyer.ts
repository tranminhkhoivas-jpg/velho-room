export const BUYER_RUBRIC=[
 {id:"relevance",label:"Relevant problem and public evidence"},
 {id:"discovery",label:"Questions that test unknown needs"},
 {id:"measurement",label:"Measurable small test; no invented savings"},
 {id:"risk",label:"Data, ownership, maintenance and constraints"},
 {id:"nextStep",label:"Specific low-pressure next step"},
] as const;
export type BuyerCriterion={id:string;points:number;quote:string;reason:string};
export function buyerScore(raw:unknown,userMessages:string[]){
 const x=raw as {rubric:BuyerCriterion[];strengths:string[];fixes:string[];bestLine:string};
 if(!x||!Array.isArray(x.rubric)||x.rubric.length!==5||!Array.isArray(x.strengths)||!x.strengths.every(s=>typeof s==="string")||!Array.isArray(x.fixes)||!x.fixes.every(s=>typeof s==="string")||typeof x.bestLine!=="string")throw new Error("The coaching result was incomplete. Retry scoring.");
 for(const c of BUYER_RUBRIC){const matches=x.rubric.filter(r=>r.id===c.id);if(matches.length!==1)throw new Error("The coaching rubric was incomplete.");const r=matches[0];
  if(!Number.isInteger(r.points)||r.points<0||r.points>4||typeof r.reason!=="string"||!r.reason.trim()||typeof r.quote!=="string"||r.points>0&&!r.quote.trim())throw new Error("The coach cited text absent from your pitch. Retry scoring.");
  if(r.quote){const pattern=new RegExp(r.quote.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"iu"),actual=userMessages.map(m=>pattern.exec(m)?.[0]).find(Boolean);if(!actual)throw new Error("The coach cited text absent from your pitch. Retry scoring.");r.quote=actual;}
 }
 return{score:x.rubric.reduce((n,r)=>n+r.points,0)*5,rubric:BUYER_RUBRIC.map(c=>({...x.rubric.find(r=>r.id===c.id)!,label:c.label})),strengths:x.strengths,fixes:x.fixes,bestLine:x.bestLine};
}
