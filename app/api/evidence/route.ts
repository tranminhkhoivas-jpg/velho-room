import {extractEvidence,checkClaim} from "@/lib/fastino";
export async function POST(req:Request){
  try{
    const body=await req.text();if(body.length>16000)throw new Error("Source input is too large.");
    const j=JSON.parse(body);
    if(j.action==="extract")return Response.json({entities:await extractEvidence(j.source)});
    if(j.action==="check")return Response.json({decision:await checkClaim(j.source,j.claim)});
    return Response.json({error:"Choose extraction or a claim check."},{status:400});
  }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
