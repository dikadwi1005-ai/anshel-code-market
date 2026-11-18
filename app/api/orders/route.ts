import { commerceServices } from "@/lib/server/commerce";

export const runtime = "nodejs";
const headers = {"Cache-Control": "private, no-store", Vary: "Authorization"};

export async function GET(request: Request) {
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ") || token.length > 8192) {
    return Response.json({error: "Masuk untuk melihat pesanan."}, {status: 401, headers});
  }

  try {
    const {app, db} = commerceServices();
    const {getAuth} = await import("firebase-admin/auth");
    const buyer = await getAuth(app).verifyIdToken(token.slice(7), true).catch(() => null);
    if (!buyer?.email_verified || !["google.com", "password"].includes(buyer.firebase.sign_in_provider)) {
      return Response.json({error: "Masuk dengan email terverifikasi."}, {status: 401, headers});
    }

    const result = await db.collection("market_orders").where("buyer_uid", "==", buyer.uid).get();
    const orders = result.docs.flatMap(doc => {
      const data = doc.data();
      if (!["pending", "paid", "expired", "failed"].includes(data.status)) return [];
      return [{
        id: doc.id,
        amount: data.amount_idr,
        status: data.status,
        fulfillment: ["awaiting_email", "sent"].includes(data.fulfillment_status) ? data.fulfillment_status : null,
        created: data.created_at?.toDate?.().toISOString() ?? "",
      }];
    }).sort((a, b) => b.created.localeCompare(a.created)).slice(0, 20);
    return Response.json({orders}, {headers});
  } catch {
    return Response.json({error: "Pesanan belum dapat dimuat."}, {status: 503, headers});
  }
}
