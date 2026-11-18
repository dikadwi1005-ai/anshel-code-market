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
  if (event?.event_type !== "payment.completed") return new Response(null, {status: 204});
  const id = event?.data?.order_id;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return new Response(null, {status: 400});

  try {
    const {db} = commerceServices();
    const order = db.collection("market_orders").doc(id);
    const result = await db.runTransaction(async tx => {
      const data = (await tx.get(order)).data();
      if (!data || data.payment_mode !== mode) return 409;
      if (data.status === "creating") return 503;
      if (!matchesCompletedPayment(event, {orderId: id, paymentId: data.payment_id, amount: data.amount_idr})) return 409;
      if (data.status === "paid") return 204;
      if (data.status !== "pending") return 409;
      tx.update(order, {status: "paid", paid_at: FieldValue.serverTimestamp(), fulfillment_status: "awaiting_email"});
      return 204;
    });
    return new Response(null, {status: result});
  } catch {
    return new Response(null, {status: 503});
  }
}
