import {Timestamp} from "firebase-admin/firestore";
import {commerceServices} from "@/lib/server/commerce";

export const runtime = "nodejs";
const headers = {"Cache-Control":"private, no-store", Vary:"Authorization"};
const json = (data:unknown,status=200) => Response.json(data,{status,headers});

function localDate(value:string|null){
  if(!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const utc=Date.parse(value+"T00:00:00Z");
  if(!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,10)!==value)return null;
  return utc-7*3600000;
}

export async function GET(request:Request){
  const token=request.headers.get("authorization");
  if(!token?.startsWith("Bearer ")||token.length>8192)return json({error:"Masuk sebagai admin."},401);
  const query=new URL(request.url).searchParams;
  const mode=query.get("mode");
  if(mode!=="audit"&&mode!=="reports")return json({error:"Jenis data tidak valid."},400);
  try{
    const {app,db}=commerceServices();
    const {getAuth}=await import("firebase-admin/auth");
    const actor=await getAuth(app).verifyIdToken(token.slice(7),true).catch(()=>null);
    if(!actor||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))return json({error:"Masuk sebagai admin."},401);
    if(!(await db.collection("market_admins").doc(actor.uid).get()).exists)return json({error:"Akses admin diperlukan."},403);

    if(mode==="audit"){
      const cursor=query.get("after");
      if(cursor&&!/^[A-Za-z0-9_-]{1,128}$/.test(cursor))return json({error:"Halaman audit tidak valid."},400);
      const collection=db.collection("market_admin_audit");
      let page=collection.orderBy("created_at","desc").limit(31);
      if(cursor){
        const previous=await collection.doc(cursor).get();
        if(!previous.exists)return json({error:"Halaman audit tidak ditemukan."},404);
        page=page.startAfter(previous);
      }
      const result=await page.get();
      const events=result.docs.slice(0,30).map(doc=>{
        const row=doc.data();
        return {id:doc.id,action:row.action,actor:row.actor_uid,reference:row.product_id??row.order_id,active:row.active===true,date:row.created_at?.toDate?.().toISOString()??null};
      });
      return json({events,next:result.size>30?events.at(-1)?.id:null});
    }

    const start=localDate(query.get("from"));
    const end=localDate(query.get("to"));
    const day=86400000;
    if(start===null||end===null||end<start||end-start>=365*day)return json({error:"Pilih rentang tanggal yang valid, maksimal 365 hari."},400);

    const result=await db.collection("market_orders")
      .where("created_at",">=",Timestamp.fromMillis(start))
      .where("created_at","<",Timestamp.fromMillis(end+day))
      .select("status","amount_idr","fulfillment_status")
      .limit(10001).get();
    if(result.size>10000)return json({error:"Rentang memuat lebih dari 10.000 pesanan. Pilih rentang yang lebih pendek."},422);

    const totals={orders:result.size,paid:0,gross:0,pending:0,expired:0,failed:0,creating:0,awaiting:0,sent:0};
    for(const snapshot of result.docs){
      const row=snapshot.data();
      if(row.status==="paid"){
        totals.paid++;
        if(Number.isSafeInteger(row.amount_idr)&&row.amount_idr>0)totals.gross+=row.amount_idr;
        if(row.fulfillment_status==="sent")totals.sent++;
        if(row.fulfillment_status==="awaiting_email")totals.awaiting++;
      }else if(row.status==="pending")totals.pending++;
      else if(row.status==="expired")totals.expired++;
      else if(row.status==="failed")totals.failed++;
      else if(row.status==="creating")totals.creating++;
    }
    return json({totals});
  }catch{return json({error:"Data belum dapat dimuat."},503)}
}
