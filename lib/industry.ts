export type IndustryExample={company:string;what:string;url:string;date?:string;status?:"supported"|"unsupported"|"review"|"unavailable";sourceExcerpt?:string;checkNote?:string;identity?:{name:string;businessId:string;url:string};supportProbability?:number};
export type IndustryIndex={industry:string;score:null;summary:string;examples:IndustryExample[];laggingSignals:string[];asOf:string;tol?:string;coverage?:{candidates:number;readable:number;supported:number};registry?:{companies:number;newLast12m:number;url:string}};

export function evidencePeriod(value:string):{start:number;end:number}|null {
  const v=value.trim();let start:number,end:number;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){start=Date.parse(v);if(!Number.isFinite(start)||new Date(start).toISOString().slice(0,10)!==v)return null;return{start,end:start};}
  const month=v.match(/^(\d{4})-(\d{2})$/);
  if(month){const y=Number(month[1]),m=Number(month[2]);if(m<1||m>12)return null;start=Date.UTC(y,m-1,1);end=Date.UTC(y,m,0);return{start,end};}
  const season=v.toLocaleLowerCase().match(/^(spring|summer|autumn|fall|kevät|kesä|syksy)\s+(\d{4})$/);
  if(season){const y=Number(season[2]),m=/spring|kevät/.test(season[1])?2:/summer|kesä/.test(season[1])?5:8;return{start:Date.UTC(y,m,1),end:Date.UTC(y,m+3,0)};}
  if(/^\d{4}$/.test(v)){const y=Number(v);return{start:Date.UTC(y,0,1),end:Date.UTC(y,11,31)};}
  return null;
}
export function currentEvidencePeriod(value:string,now=Date.now()):boolean {
  const period=evidencePeriod(value);return !!period&&period.start>=now-548*864e5&&period.end<=now;
}

export function industrySourceWindow(text:string,company:string):string {
  const terms=company.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[];
  const ai=/\bAI\b|artificial intelligence|tekoäly|machine learning|koneoppimi|automaat|automat|robot|predict|ennust/i;
  const parts=text.split(/\n\s*\n/).map((value,i,all)=>({value,i,all,score:(ai.test(value)?2:0)+(terms.some(t=>value.toLocaleLowerCase().includes(t))?1:0)})).filter(p=>p.score>=2).sort((a,b)=>b.score-a.score);
  const picked=new Set<number>();let length=0;
  for(const p of parts)for(const i of [p.i-1,p.i,p.i+1])if(i>=0&&i<p.all.length&&!picked.has(i)){
    const section=p.all[i];if(length+section.length+2>6000)continue;picked.add(i);length+=section.length+2;
  }
  return [...picked].sort((a,b)=>a-b).map(i=>parts[0].all[i]).join("\n\n");
}
