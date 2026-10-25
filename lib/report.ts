import {cacheGet,cacheSet} from "./db";
import {readUrl} from "./llm";
import {sourceWindow} from "./public-evidence";
import {pdfText} from "./pdf-text";
export type ReportData={url:string;text:string;status:"document"|"index"|"unavailable";note:string};
export function reportLinks(text:string,currentYear=new Date().getFullYear()){
 const matches=[...text.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)].map(m=>({label:m[1],url:m[2]}));
 const score=(v:{label:string;url:string})=>{let all=v.label+" "+v.url;try{all=decodeURIComponent(all);}catch{}const years=(all.match(/20\d{2}/g)||[]).map(Number).filter(y=>y<=currentYear);return (years.length?Math.max(...years):2000)+(/annual.?report|vuosikertomus|annual.?review|financial.?review/i.test(all)?50:0)+(/english|_en\b|[-_/]en[-_.]/i.test(all)?2:0)-(/sustainab|remunerat|governance/i.test(all)?60:0);};
 return matches.filter(v=>/\.pdf(?:[?#]|$)/i.test(v.url)&&/annual|vuosi|financial.?review/i.test(v.label+v.url)).sort((a,b)=>score(b)-score(a)).map(v=>v.url).filter((u,i,a)=>a.indexOf(u)===i).slice(0,3);
}
export async function reportData(url?:string):Promise<ReportData>{
 if(!url)return{url:"",text:"",status:"unavailable",note:"No annual-report URL was supplied by research; use dossier context only."};
 const key="ar:quality-v2:"+url,hit=cacheGet<ReportData>(key,7*864e5);if(hit)return hit;
 const page=await readUrl(url,180000,{"X-With-Links-Summary":"true","X-Retain-Images":"none"});
 if(!page)return{url,text:"",status:"unavailable",note:"The report source was unreadable; no report figures are claimed."};
 const direct=/\.pdf(?:[?#]|$)/i.test(url);
 const candidates=direct?[url]:reportLinks(page);
 for(const candidate of candidates){let text=candidate===url?page:await readUrl(candidate,180000);if(text.length<1000)text=await pdfText(candidate,url);if(text.length<1000||!/(revenue|net sales|operating profit|financial statements|liikevaihto|liikevoitto)/i.test(text))continue;
  const excerpt=text.slice(0,2000)+"\n\n"+sourceWindow(text,"revenue net sales operating profit cash flow strategy risks financial statements liikevaihto liikevoitto",27000);
  const result:ReportData={url:candidate,text:excerpt,status:"document",note:"Readable annual-report PDF excerpt; limited selection, not the entire document. Check period, units and original pages."};cacheSet(key,result);return result;
 }
 return{url,text:"",status:"index",note:"Only a report index or unverified document was readable. No actual annual report is claimed; use dossier context only."};
}
