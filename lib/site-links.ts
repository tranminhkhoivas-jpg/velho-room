const HINTS=/career|job|rekry|ura|service|palvelu|product|tuote|price|hinta|order|tilaa|store|myymä|location|toimipist|support|tuki|contact|yhtey|case|customer|asiakas|solution|ratkais|glaz|lasit/i;
export function siteLinks(text:string,website:string){
 const host=new URL(website).hostname.replace(/^www\./,""),seen=new Set<string>();
 return [...text.matchAll(/\]\((https?:\/\/[^)\s#]+)\)/g)].map(m=>m[1]).filter(u=>{try{const x=new URL(u),key=x.pathname.replace(/\/$/,"");if(!(x.hostname===host||x.hostname.endsWith("."+host))||!key||seen.has(key)||/privacy|cookie|terms|legal|tietosuoja|eväste/i.test(key))return false;seen.add(key);return true;}catch{return false;}});
}
export function processLinks(text:string,website:string){return siteLinks(text,website).filter(u=>HINTS.test(new URL(u).pathname)).sort((a,b)=>{const score=(u:string)=>/product|tuote|service|palvelu|solution|ratkais|glaz|lasit/i.test(new URL(u).pathname)?2:1;return score(b)-score(a)||a.length-b.length;});}
export function regionLink(text:string,website:string){const links=siteLinks(text,website);for(const pattern of [/^\/(int|international)\/?$/i,/^\/(en|en-gb)\/?$/i,/^\/fi\/?$/i]){const found=links.find(u=>pattern.test(new URL(u).pathname));if(found)return found;}return undefined;}
