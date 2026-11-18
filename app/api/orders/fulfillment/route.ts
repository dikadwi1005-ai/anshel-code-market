import {FieldValue} from "firebase-admin/firestore";
import {commerceServices} from "@/lib/server/commerce";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization");
  const respond = (status: number, error?: string) => Response.json(error ? {error} : {ok: true}, {
    status, headers: {"Cache-Control": "private, no-store"},
  });
  if (!token?.startsWith("Bearer ") || token.length > 8192) return respond(401, "Masuk sebagai admin.");

  try {
    const {app, db} = commerceServices();
    const {getAuth} = await import("firebase-admin/auth");
    const actor = await getAuth(app).verifyIdToken(token.slice(7), true).catch(() => null);
    if (!actor || !/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid)) return respond(401, "Masuk sebagai admin.");
    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return respond(400, "Nomor pesanan tidak valid.");
    const admin = db.collection("market_admins").doc(actor.uid);
    const order = db.collection("market_orders").doc(id);
    const status = await db.runTransaction(async tx => {
      const [adminRecord, orderRecord] = await tx.getAll(admin, order);
      if (!adminRecord.exists) return 403;
      const data = orderRecord.data();
      if (!data) return 404;
      if (data.status !== "paid") return 409;
      if (data.fulfillment_status === "sent") return 200;
      if (data.fulfillment_status !== "awaiting_email") return 409;
      tx.update(order, {fulfillment_status: "sent", fulfilled_at: FieldValue.serverTimestamp(), fulfilled_by: actor.uid});
      return 200;
    });
    return status === 200 ? respond(200) : respond(status, "Pesanan tidak bisa ditandai sudah dikirim.");
  } catch {
    return respond(503, "Status pengiriman belum dapat disimpan.");
  }
}
