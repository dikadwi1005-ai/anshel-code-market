import {randomUUID} from "node:crypto";
import {get} from "@vercel/blob";
import {FieldValue} from "firebase-admin/firestore";
import {commerceServices} from "@/lib/server/commerce";

export function deliveryEnabled(){
  return Boolean(process.env.MARKET_EMAIL_ENABLED==="true"&&process.env.RESEND_API_KEY&&process.env.MARKET_EMAIL_FROM&&process.env.BLOB_READ_WRITE_TOKEN);
}

export async function sendOrderEmail(id:string){
  if(!deliveryEnabled())return "disabled";
  const {db}=commerceServices();
  const ref=db.collection("market_orders").doc(id);
  const lease=randomUUID();
  const work=await db.runTransaction(async tx=>{
    const row=(await tx.get(ref)).data();
    if(!row||row.status!=="paid"||row.fulfillment_status!=="awaiting_email")return null;
    if(typeof row.delivery_blob_path!=="string"||!row.delivery_blob_path.startsWith("releases/"+row.product_id+"/")||
       typeof row.delivery_file_name!=="string"||typeof row.buyer_email!=="string")return null;
    const now=Date.now(), first=row.delivery_first_attempt_ms??now;
    if((row.delivery_lease_until_ms??0)>now||now-first>=23*3600000)return null;
    tx.update(ref,{
      delivery_first_attempt_ms:first,delivery_lease_until_ms:now+120000,delivery_lease:lease,
      delivery_email_state:"sending",
    });
    return {path:row.delivery_blob_path as string,name:row.delivery_file_name as string,email:row.buyer_email as string};
  });
  if(!work)return "skipped";
  let messageId:string|undefined;
  try{
    const file=await get(work.path,{access:"private"});
    if(!file||file.statusCode!==200)throw Error("ZIP unavailable");
    const reader=file.stream.getReader();
    const chunks:Uint8Array[]=[];
    let size=0;
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>4*1024*1024){await reader.cancel();throw Error("ZIP exceeds limit")}
      chunks.push(value);
    }
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),
      headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"anshel-order/"+id},
      body:JSON.stringify({
        from:process.env.MARKET_EMAIL_FROM,to:[work.email],subject:"File pesanan Anshel Code Market",
        text:"Pembayaran QRIS untuk pesanan "+id+" telah terverifikasi. File yang kamu beli terlampir.",
        attachments:[{filename:work.name.replace(/[^A-Za-z0-9._ -]/g,"_"),content:Buffer.concat(chunks).toString("base64")}],
      }),
    });
    if(!response.ok)throw Error("Email provider rejected");
    const result=await response.json();
    if(typeof result.id!=="string"||!result.id)throw Error("Email receipt missing");
    messageId=result.id;
  }catch{
    await db.runTransaction(async tx=>{
      const row=(await tx.get(ref)).data();
      if(row?.delivery_lease!==lease||row.fulfillment_status!=="awaiting_email")return;
      tx.update(ref,{delivery_email_state:"failed",delivery_lease_until_ms:0,delivery_lease:FieldValue.delete()});
    });
    return "failed";
  }

  const audit=db.collection("market_admin_audit").doc();
  await db.runTransaction(async tx=>{
    const row=(await tx.get(ref)).data();
    if(row?.delivery_lease!==lease||row.fulfillment_status!=="awaiting_email")return;
    tx.update(ref,{
      fulfillment_status:"sent",fulfilled_at:FieldValue.serverTimestamp(),fulfilled_by:"system",
      delivery_email_state:"accepted",delivery_email_id:messageId,
      delivery_lease:FieldValue.delete(),delivery_lease_until_ms:0,
    });
    tx.create(audit,{action:"order_email_accepted",actor_uid:"system",order_id:id,created_at:FieldValue.serverTimestamp()});
  });
  return "sent";
}
