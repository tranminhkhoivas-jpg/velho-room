const common=new Set("a an the of for to in on at and or is are be we our your their this that hypothetical before after".split(" "));
function words(s:string){return new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>=3&&!common.has(w)));}
function similarity(a:string,b:string){const x=words(a),y=words(b);if(x.size<5||y.size<5)return 0;return [...x].filter(w=>y.has(w)).length/new Set([...x,...y]).size;}
export function duplicateAngles(angles:{hook:string;body:string}[]){const out:{index:number;earlier:number}[]=[];
 for(let i=0;i<angles.length;i++)for(let j=0;j<i;j++){if(angles[i].hook.trim().toLowerCase()===angles[j].hook.trim().toLowerCase()||similarity(angles[i].hook,angles[j].hook)>=0.7||similarity(angles[i].body,angles[j].body)>=0.85){out.push({index:i,earlier:j});break;}}
 return out;
}
