import {FieldValue} from "firebase-admin/firestore";
import {commerceServices, paymentSettings} from "@/lib/server/commerce";

export const runtime = "nodejs";
const headers = {"Cache-Control":"private, no-store", Vary:"Authorization"};
const json = (data:unknown,status=200) => Response.json(data,{status,headers});

async function handle(request:Request, write:boolean) {
  const token=request.headers.get("authorization");
  const id=new URL(request.url).searchParams.get("product");
  if(!token?.startsWith("Bearer ")||token.length>8192)return json({error:"Masuk sebagai admin."},401);
  if(!id||!/^[A-Za-z0-9_-]{1,128}$/.test(id))return json({error:"Produk tidak valid."},400);
  try {
    const {app,db}=commerceServices();
    const {getAuth}=await import("firebase-admin/auth");
    const actor=await getAuth(app).verifyIdToken(token.slice(7),true).catch(()=>null);
    if(!actor||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))return json({error:"Masuk sebagai admin."},401);
    const admin=db.collection("market_admins").doc(actor.uid);
    const product=db.collection("market_products").doc(id);
    const offer=db.collection("market_sale_offers").doc(id);
    if(!(await admin.get()).exists)return json({error:"Akses admin diperlukan."},403);

    if(!write){
      const [item,entry]=await db.getAll(product,offer);
      if(!item.exists)return json({error:"Produk tidak ditemukan."},404);
      const value=entry.data();
      return json({fileName:value?.file_name??"", reference:value?.private_reference??"", stored:typeof value?.blob_path==="string", active:value?.active===true, checkoutEnabled:!!paymentSettings()});
    }

    const reader=request.body?.getReader();
    if(!reader)return json({error:"Data tidak valid."},400);
    const chunks:Uint8Array[]=[];
    let size=0;
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>4096){await reader.cancel();return json({error:"Data terlalu panjang."},413)}
      chunks.push(value);
    }
    let body:unknown;
    try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"))}catch{return json({error:"Data tidak valid."},400)}
    if(!body||typeof body!=="object")return json({error:"Data tidak valid."},400);
    const input=body as Record<string,unknown>;
    const fileName=typeof input.fileName==="string"?input.fileName.trim():"";
    const reference=typeof input.reference==="string"?input.reference.trim():"";
    const active=input.active;
    if(typeof active!=="boolean"||fileName.length>120||reference.length>240||
       (fileName&&!/^[^/\\\x00-\x1f]+\.zip$/i.test(fileName))||
       /https?:\/\//i.test(reference)||/[\x00-\x1f]/.test(reference)){
      return json({error:"Gunakan nama ZIP dan referensi internal tanpa tautan."},400);
    }

    const audit=db.collection("market_admin_audit").doc();
    const status=await db.runTransaction(async tx=>{
      const [role,item,existing]=await tx.getAll(admin,product,offer);
      if(!role.exists)return 403;
      const data=item.data();
      if(!data)return 404;
      if(existing.get("blob_path") && (fileName!==existing.get("file_name") || reference!==existing.get("private_reference")))return 409;
      if(active&&(!fileName||!reference||input.confirmed!==true||
         !["preview","published"].includes(data.status)||!Number.isSafeInteger(data.price_idr)||data.price_idr<=0||
         typeof data.license_summary!=="string"||!data.license_summary.trim()))return 409;
      tx.set(offer,{active,file_name:fileName,private_reference:reference,updated_at:FieldValue.serverTimestamp(),updated_by:actor.uid},{merge:true});
      tx.create(audit,{actor_uid:actor.uid,action:"sale_readiness_updated",product_id:id,active,created_at:FieldValue.serverTimestamp()});
      return 200;
    });
    if(status===409)return json({error:"Produk harus publik, memiliki harga, lisensi, serta ZIP privat yang dikonfirmasi siap dikirim."},status);
    if(status!==200)return json({error:"Perubahan tidak dapat disimpan."},status);
    return json({ok:true});
  }catch{return json({error:"Kesiapan jual belum dapat diproses."},503)}
}

export function GET(request:Request){return handle(request,false)}
export function POST(request:Request){return handle(request,true)}
