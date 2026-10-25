export type Experiment = { angle:string; creative:string; channel:"email"|"LinkedIn"|"event"|"other"; cohort:string; mode:"reported"|"synthetic"; exposures:number; replies:number; meetings:number; evidence:string };
export type SavedExperiment = Experiment & {updated:number};
export function validateExperiment(x:unknown):Experiment {
  if(!x||typeof x!=="object")throw new Error("Enter an experiment result.");
  const e=x as Experiment;
  if(typeof e.creative!=="string"||!e.creative.trim()||e.creative.length>6000)throw new Error("Preserve the exact content used in this experiment (up to 6,000 characters).");
  if(typeof e.angle!=="string"||!/^[-a-z0-9]{1,200}$/.test(e.angle)||!["email","LinkedIn","event","other"].includes(e.channel)||!["reported","synthetic"].includes(e.mode)||typeof e.cohort!=="string"||!e.cohort.trim()||e.cohort.length>120||typeof e.evidence!=="string"||!e.evidence.trim()||e.evidence.length>2000)throw new Error("Provide an angle, channel, cohort and source/measurement note; label synthetic tests separately.");
  if(![e.exposures,e.replies,e.meetings].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e8)||e.replies>e.exposures||e.meetings>e.replies)throw new Error("Use non-negative whole-person counts: meetings ≤ replies ≤ people reached.");
  return {angle:e.angle,creative:e.creative.trim(),channel:e.channel,cohort:e.cohort.trim(),mode:e.mode,exposures:e.exposures,replies:e.replies,meetings:e.meetings,evidence:e.evidence.trim()};
}
// Descriptive Wilson lower bound; not proof of a causal lift or a winning campaign.
export function replyLowerBound(e:Experiment):number|null {
  if(e.mode!=="reported"||e.exposures===0)return null;
  const n=e.exposures,p=e.replies/n,z=1.96;
  return Math.max(0,(p+z*z/(2*n)-z*Math.sqrt((p*(1-p)+z*z/(4*n))/n))/(1+z*z/n));
}
export function rankExperiments(rows:SavedExperiment[],channel:string,cohort:string) {
  return rows.filter(e=>e.mode==="reported"&&e.channel===channel&&e.cohort===cohort&&e.exposures>0).sort((a,b)=>(replyLowerBound(b)??-1)-(replyLowerBound(a)??-1));
}
