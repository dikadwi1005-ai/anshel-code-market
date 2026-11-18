import {randomUUID} from "node:crypto";
import {put,get,del} from "@vercel/blob";
import {FieldValue} from "firebase-admin/firestore";
import {commerceServices} from "@/lib/server/commerce";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store",Vary:"Authorization"};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
const maxBytes=4*1024*1024;
async function handle(request:Request){
  const token=request.headers.get("authorization");
  const id=new URL(request.url).searchParams.get("product");
  if(!token?.startsWith("Bearer ")||token.length>8192)return json({error:"Masuk sebagai admin."},401);
  if(!id||!/^[A-Za-z0-9_-]{1,128}$/.test(id))return json({error:"Produk tidak valid."},400);
  try{
    const {app,db}=commerceServices();
    const {getAuth}=await import("firebase-admin/auth");
    const actor=await getAuth(app).verifyIdToken(token.slice(7),true).catch(()=>null);
    if(!actor||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))return json({error:"Masuk sebagai admin."},401);
    const admin=db.collection("market_admins").doc(actor.uid);
    if(!(await admin.get()).exists)return json({error:"Akses admin diperlukan."},403);
    if(!process.env.BLOB_READ_WRITE_TOKEN)return json({error:"Penyimpanan ZIP belum terhubung."},503);
    const product=db.collection("market_products").doc(id);
    const offer=db.collection("market_sale_offers").doc(id);
    if(!(await product.get()).exists)return json({error:"Produk tidak ditemukan."},404);
    if(request.method==="GET"){
      const row=(await offer.get()).data();
      if(typeof row?.blob_path!=="string"||!row.blob_path.startsWith("releases/"+id+"/"))return json({error:"Belum ada ZIP."},404);
      const result=await get(row.blob_path,{access:"private"});
      if(!result||result.statusCode!==200)return json({error:"ZIP tidak ditemukan."},404);
      const name=typeof row.file_name==="string"?row.file_name.replace(/[^a-zA-Z0-9._-]/g,"_"):"produk.zip";
      return new Response(result.stream,{headers:{...headers,"Content-Type":"application/zip","X-Content-Type-Options":"nosniff","Content-Disposition":'attachment; filename="'+name+'"'}});
    }
    const size=Number(request.headers.get("content-length"));
    if(size>maxBytes+65536)return json({error:"ZIP maksimal 4 MB."},413);
    const form=await request.formData().catch(()=>null);
    const file=form?.get("zip");
    if(!(file instanceof File)||!(/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,114}\.zip$/i.test(file.name)))return json({error:"Pilih file ZIP dengan nama yang valid."},400);
    if(file.size>maxBytes)return json({error:"ZIP maksimal 4 MB."},413);
    const prefix=new Uint8Array(await file.slice(0,4).arrayBuffer());
    if(prefix.length!==4||prefix[0]!==80||prefix[1]!==75||prefix[2]!==3||prefix[3]!==4)return json({error:"Pilih arsip ZIP yang berisi file."},400);
    const path="releases/"+id+"/"+randomUUID()+".zip";
    const blob=await put(path,file,{access:"private",contentType:"application/zip",addRandomSuffix:false});
    const audit=db.collection("market_admin_audit").doc();
    try{
      await db.runTransaction(async tx=>{
        const [role,item]=await tx.getAll(admin,product);
        if(!role.exists||!item.exists)throw Error("Access changed");
        tx.set(offer,{active:false,file_name:file.name,blob_path:blob.pathname,blob_bytes:file.size,private_reference:"Vercel Blob privat",updated_by:actor.uid,updated_at:FieldValue.serverTimestamp()},{merge:true});
        tx.create(audit,{action:"private_zip_uploaded",actor_uid:actor.uid,product_id:id,created_at:FieldValue.serverTimestamp()});
      });
    }catch(error){await del(blob.url).catch(()=>{});throw error}
    return json({fileName:file.name,reference:"Vercel Blob privat"});
  }catch{return json({error:"Arsip belum dapat diproses."},503)}
}
export const GET=handle;
export const POST=handle;
