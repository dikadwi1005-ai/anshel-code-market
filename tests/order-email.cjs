const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const ts=require("typescript");
const source=ts.transpileModule(fs.readFileSync("lib/server/order-email.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const packed=Buffer.from("504b030401020304","hex");
const initial={status:"paid",fulfillment_status:"awaiting_email",product_id:"p1",delivery_blob_path:"releases/p1/v1.zip",delivery_file_name:"produk.zip",buyer_email:"buyer@example.test"};
function harness(changes={}, opts={}){
 let row={...initial,...changes},calls=[],events=[],queue=Promise.resolve();
 const ref={};
 const db={collection:name=>({doc:()=>name==="market_orders"?ref:{}}),
   runTransaction: fn=>{
    const task=queue.then(()=>fn({get:async()=>({data:()=>({...row})}),update:(_,patch)=>Object.assign(row,patch),create:(_,record)=>events.push(record)}));
    queue=task.catch(()=>{});
    return task;
   }};
 const exports={};
 vm.runInNewContext(source,{
   exports,Buffer,Date,AbortSignal,
   process:{env:opts.disabled?{}:{MARKET_EMAIL_ENABLED:"true",RESEND_API_KEY:"unit-test",MARKET_EMAIL_FROM:"Market <sales@example.test>",BLOB_READ_WRITE_TOKEN:"unit-test"}},
   require:name=>({
     "node:crypto":{randomUUID:()=>Math.random().toString()},
     "@vercel/blob":{get:async(path,config)=>{assert.equal(path,"releases/p1/v1.zip");assert.equal(config.access,"private");return {statusCode:200,stream:new ReadableStream({start(c){c.enqueue(packed);c.close()}})}}},
     "firebase-admin/firestore":{FieldValue:{serverTimestamp:()=>new Date(),delete:()=>undefined}},
     "@/lib/server/commerce":{commerceServices:()=>({db})},
   })[name],
   fetch:async(url,request)=>{
     assert.equal(url,"https://api.resend.com/emails");
     calls.push(request);
     return opts.fail ? {ok:false} : {ok:true,json:async()=>({id:"provider-receipt"})};
   },
 });
 return {send:()=>exports.sendOrderEmail("order-1"),calls,events,row};
}
(async()=>{
 let t=harness({}, {disabled:true});assert.equal(await t.send(),"disabled");assert.equal(t.calls.length,0);
 t=harness({status:"pending"});assert.equal(await t.send(),"skipped");assert.equal(t.calls.length,0);
 t=harness({delivery_blob_path:"releases/other/v1.zip"});assert.equal(await t.send(),"skipped");assert.equal(t.calls.length,0);
 t=harness();
 const outcomes=await Promise.all([t.send(),t.send()]); assert.deepEqual(outcomes.sort(),["sent","skipped"]);
 assert.equal(t.calls.length,1);assert.equal(t.row.fulfillment_status,"sent");assert.equal(t.row.delivery_email_id,"provider-receipt");
 assert.equal(t.calls[0].headers["Idempotency-Key"],"anshel-order/order-1");
 const payload=JSON.parse(t.calls[0].body);
 assert.equal(payload.to[0],initial.buyer_email);assert.equal(payload.attachments[0].content,packed.toString("base64"));
 assert.equal(t.events.length,1);assert.equal(await t.send(),"skipped");
 t=harness({}, {fail:true});assert.equal(await t.send(),"failed");assert.equal(t.row.fulfillment_status,"awaiting_email");assert.equal(t.row.delivery_lease_until_ms,0);
 assert.equal(await t.send(),"failed");assert.equal(t.calls[0].headers["Idempotency-Key"],t.calls[1].headers["Idempotency-Key"]);
 t=harness({delivery_first_attempt_ms:Date.now()-24*3600000});assert.equal(await t.send(),"skipped");assert.equal(t.calls.length,0);
 console.log("PASS: paid gate, private ZIP, concurrent send, provider failure and safe retry window");
})().catch(error=>{console.error(error);process.exit(1)});

