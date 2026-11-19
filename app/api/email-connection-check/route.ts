import {createHash,timingSafeEqual} from "node:crypto";
import {commerceServices} from "@/lib/server/commerce";

export const runtime="nodejs";
const digest=Buffer.from("52eee0a92d297a0603e02ed66c64a22d927ecbc77aa0be5daaead81e098bdc52","hex");
const zip="UEsDBBQAAAAIAO9Jc13TvDlvSwAAAFMAAAAKAAAAUkVBRE1FLnR4dAXByQ2AMAwEwD8SPWwF6QHxhR8NrORIGOeSnfTPzMU61NmwPsXR4s0FZ5eMm255JjwqNFCI6WxBCwUnF4Z3WQZhYQU9dECbpn37AVBLAQIUABQAAAAIAO9Jc13TvDlvSwAAAFMAAAAKAAAAAAAAAAAAAAAAAAAAAABSRUFETUUudHh0UEsFBgAAAAABAAEAOAAAAHMAAAAAAA==";
const expires=1795055431385;

export async function POST(request:Request){
  const token=request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token||Date.now()>expires||!timingSafeEqual(createHash("sha256").update(token).digest(),digest))return new Response(null,{status:404});
  const key=process.env.RESEND_API_KEY,from=process.env.MARKET_EMAIL_FROM;
  if(!key||!from)return Response.json({error:"missing email configuration"},{status:503});
  const email=request.headers.get("x-test-recipient")||"";
  if(email.length>200||!/^\S+@\S+\.\S+$/.test(email))return new Response(null,{status:400});
  try{
    const {db}=commerceServices();
    const lock=db.collection("market_email_diagnostics").doc(digest.toString("hex"));
    const reserved=await db.runTransaction(async tx=>{
      if((await tx.get(lock)).exists)return false;
      tx.create(lock,{used_at:new Date()});return true;
    });
    if(!reserved)return new Response(null,{status:409});
    const response=await fetch("https://api.resend.com/emails",{method:"POST",redirect:"error",signal:AbortSignal.timeout(12000),headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"anshel-email-verify/"+digest.toString("hex")},body:JSON.stringify({from,to:[email],subject:"Uji pengiriman ZIP · Anshel Code Market",text:"Ini satu email uji dari Anshel Code Market. Buka anshel-test.zip untuk memeriksa lampiran. Tidak ada pesanan atau tagihan.",attachments:[{filename:"anshel-test.zip",content:zip}]})});
    const data=await response.json();
    if(!response.ok)return Response.json({providerStatus:response.status,providerError:data.name??null},{status:502});
    return Response.json({accepted:true,receipt:typeof data.id==="string"?data.id:null});
  }catch{return new Response(null,{status:503})}
}
