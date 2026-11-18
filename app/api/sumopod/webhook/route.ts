import {after} from "next/server";
import {deliveryEnabled, sendOrderEmail} from "@/lib/server/order-email";
import { FieldValue } from "firebase-admin/firestore";
import { commerceServices } from "@/lib/server/commerce";
import { matchesCompletedPayment, verifySumopodSignature } from "@/lib/server/sumopod-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const mode = process.env.SUMOPOD_MODE;
  const secret = process.env.SUMOPOD_SIGNING_SECRET;
  if (!secret || (mode !== "sandbox" && mode !== "live")) return new Response(null, {status: 503});
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, {status: 400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      return new Response(null, {status: 413});
    }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks);
  if (!verifySumopodSignature(raw, request.headers, secret)) return new Response(null, {status: 401});

  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { return new Response(null, {status: 400}); }
  const kind = event?.event_type;
  if (kind !== "payment.completed" && kind !== "payment.failed" && kind !== "payment.expired") {
    return new Response(null, {status: 204});
  }
  const id = event?.data?.order_id;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return new Response(null, {status: 400});

  try {
    const {db} = commerceServices();
    const order = db.collection("market_orders").doc(id);
    const result = await db.runTransaction(async tx => {
      const data = (await tx.get(order)).data();
      if (!data || data.payment_mode !== mode) return 409;
      const paymentId = event.data.payment_id;
      if (typeof paymentId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(paymentId)) return 409;
      if (data.status === "creating") {
        if (kind !== "payment.completed") return 503;
        // A verified completion can recover a payment whose creation response was lost.
        if (!matchesCompletedPayment(event, {orderId: id, paymentId, amount: data.amount_idr})) return 409;
        tx.update(order, {payment_id: paymentId, status: "paid", paid_at: FieldValue.serverTimestamp(), fulfillment_status: "awaiting_email"});
        return 204;
      }
      if (paymentId !== data.payment_id) return 409;

      if (kind === "payment.completed") {
        if (!matchesCompletedPayment(event, {orderId: id, paymentId: data.payment_id, amount: data.amount_idr})) return 409;
        if (data.status === "paid") return 204;
        if (!["pending", "failed", "expired"].includes(data.status)) return 409;
        tx.update(order, {status: "paid", paid_at: FieldValue.serverTimestamp(), fulfillment_status: "awaiting_email"});
      } else {
        if (data.status !== "pending") return 204;
        const status = kind === "payment.expired" ? "expired" : "failed";
        tx.update(order, {status, updated_at: FieldValue.serverTimestamp()});
      }
      return 204;
    });
    if(result===204&&kind==="payment.completed"&&deliveryEnabled()){
      after(async()=>{await sendOrderEmail(id).catch(()=>{})});
    }
    return new Response(null, {status: result});
  } catch {
    return new Response(null, {status: 503});
  }
}
