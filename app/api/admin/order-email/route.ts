import {commerceServices} from "@/lib/server/commerce";
import {sendOrderEmail} from "@/lib/server/order-email";

export const runtime="nodejs";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store",Vary:"Authorization"}});

export async function POST(request:Request){
  const token=request.headers.get("authorization");
  const id=new URL(request.url).searchParams.get("order");
  if(!token?.startsWith("Bearer ")||token.length>8192)return json({error:"Masuk sebagai admin."},401);
  if(!id||!/^[a-f0-9-]{36}$/.test(id))return json({error:"Nomor pesanan tidak valid."},400);
  try{
    const {app,db}=commerceServices();
    const {getAuth}=await import("firebase-admin/auth");
    const actor=await getAuth(app).verifyIdToken(token.slice(7),true).catch(()=>null);
    if(!actor||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))return json({error:"Masuk sebagai admin."},401);
    if(!(await db.collection("market_admins").doc(actor.uid).get()).exists)return json({error:"Akses admin diperlukan."},403);
    const result=await sendOrderEmail(id);
    if(result==="sent")return json({ok:true});
    if(result==="disabled")return json({error:"Layanan email otomatis belum aktif."},503);
    if(result==="failed")return json({error:"Email belum dapat dikirim. Coba lagi atau cek pengiriman manual."},502);
    return json({error:"Pesanan tidak siap dikirim otomatis, sedang diproses, atau melewati batas coba ulang."},409);
  }catch{return json({error:"Status pengiriman belum dapat diproses."},503)}
}
