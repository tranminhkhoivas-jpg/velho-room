import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp,writeFile,unlink,rmdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const exec=promisify(execFile);
export async function pdfText(url:string,indexUrl:string):Promise<string>{
 const source=new URL(url),index=new URL(indexUrl),host=index.hostname.replace(/^www\./,"");
 // The fallback only downloads observed documents from the original public publisher.
 if(source.protocol!=="https:"||!(source.hostname.replace(/^www\./,"")===host||source.hostname.endsWith("."+host))||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(host)||!host.includes("."))return "";
 let folder="",file="";
 try{
  const r=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(45000)});if(!r.ok||Number(r.headers.get("content-length"))>25*1024*1024||!r.body)return "";
  const chunks:Uint8Array[]=[];let bytes=0;
  for await(const chunk of r.body as unknown as AsyncIterable<Uint8Array>){bytes+=chunk.length;if(bytes>25*1024*1024){await r.body.cancel().catch(()=>{});return "";}chunks.push(chunk);}
  const data=Buffer.concat(chunks);if(data.subarray(0,5).toString()!=="%PDF-")return "";
  folder=await mkdtemp(join(tmpdir(),"velho-report-"));file=join(folder,"source.pdf");await writeFile(file,data);
  const result=await exec(process.env.VELHO_PDF_PYTHON||"python",[join(process.cwd(),"scripts","extract-report.py"),file],{timeout:30000,maxBuffer:4*1024*1024,windowsHide:true,encoding:"utf8"});return result.stdout.slice(0,180000);
 }catch{return "";}finally{if(file)await unlink(file).catch(()=>{});if(folder)await rmdir(folder).catch(()=>{});}
}
