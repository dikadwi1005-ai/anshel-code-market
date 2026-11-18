import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { commerceServices, paymentSettings } from "@/lib/server/commerce";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const settings = paymentSettings();
  if (!settings) return Response.json({ error: "Pembayaran belum tersedia." }, { status: 503 });
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ") || token.length > 8192) return new Response(null, {status: 401});
  const productId = new URL(request.url).searchParams.get("product");
  if (!productId || !/^[A-Za-z0-9_-]{1,128}$/.test(productId)) return new Response(null, {status: 400});

  try {
    const {app, db} = commerceServices();
    const {getAuth} = await import("firebase-admin/auth");
    const auth = getAuth(app);
    const buyer = await auth.verifyIdToken(token.slice(7), true).catch(() => null);
    if (!buyer?.email || !buyer.email_verified || !["google.com", "password"].includes(buyer.firebase.sign_in_provider)) {
      return Response.json({error: "Masuk dengan email yang sudah terverifikasi."}, {status: 401});
    }
    const product = db.collection("market_products").doc(productId);
    const offer = db.collection("market_sale_offers").doc(productId);
    const marker = db.collection("market_checkout_limits").doc(createHash("sha256").update(buyer.uid).digest("hex"));
    const order = db.collection("market_orders").doc(randomUUID());
    const reserved = await db.runTransaction(async tx => {
      const [productSnap, offerSnap, markerSnap] = await tx.getAll(product, offer, marker);
      const item = productSnap.data();
      if (!item || !["preview", "published"].includes(item.status) || offerSnap.get("active") !== true || !offerSnap.get("file_name") || !offerSnap.get("private_reference") ||
          typeof item.license_summary !== "string" || !item.license_summary.trim() ||
          !Number.isSafeInteger(item.price_idr) || item.price_idr <= 0 || item.price_idr > 1000000000) return null;
      const now = Date.now();
      if ((markerSnap.get("retry_after") ?? 0) > now) return false;
      tx.set(marker, {retry_after: now + 60000});
      tx.create(order, {
        buyer_uid: buyer.uid, buyer_email: buyer.email, product_id: productId,
        amount_idr: item.price_idr, currency: "IDR", payment_mode: settings.mode,
        status: "creating", created_at: FieldValue.serverTimestamp(),
      });
      return Number(item.price_idr);
    });
    if (reserved === null) return Response.json({error: "Produk belum tersedia untuk dibeli."}, {status: 404});
    if (reserved === false) return Response.json({error: "Tunggu satu menit sebelum mencoba lagi."}, {status: 429});

    const response = await fetch(settings.api + "/api/v1/payments", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: {"X-Api-Key": settings.key, "Content-Type": "application/json"},
      body: JSON.stringify({
        order_id: order.id, amount: reserved, currency: "IDR", payment_method_type_code: "QRIS",
        expires_in_hours: 1, success_return_url: siteUrl + "/akun", cancel_return_url: siteUrl + "/akun",
      }),
    });
    if (!response.ok) throw Error("Provider response rejected");
    const payment = await response.json();
    const link = new URL(payment.payment_link_url);
    const allowedHosts = settings.mode === "live" ? ["pay.sumopod.com"] : ["pay-sandbox.sumopod.com"];
    if (link.protocol !== "https:" || !allowedHosts.includes(link.hostname) || link.port ||
        link.username || link.password || payment.order_id !== order.id || payment.amount !== reserved ||
        typeof payment.payment_id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(payment.payment_id)) {
      throw Error("Invalid payment response");
    }
    const payable = await db.runTransaction(async tx => {
      const saved = (await tx.get(order)).data();
      if (saved?.status === "paid" && saved.payment_id === payment.payment_id) return false;
      if (saved?.status !== "creating") throw Error("Order no longer pending creation");
      tx.update(order, {status: "pending", payment_id: payment.payment_id});
      return true;
    });
    if (!payable) return Response.json({url: siteUrl + "/akun"}, {headers: {"Cache-Control":"no-store"}});
    return Response.json({ url: link.href }, { headers: {"Cache-Control": "no-store"} });
  } catch {
    return Response.json({error: "Link pembayaran belum dapat dibuat. Silakan coba lagi nanti."}, {status: 503});
  }
}

export async function GET(request: Request) {
  const settings = paymentSettings();
  const productId = new URL(request.url).searchParams.get("product");
  let available = false;
  if (settings && productId && /^[A-Za-z0-9_-]{1,128}$/.test(productId)) {
    try {
      const {db} = commerceServices();
      const [product,offer] = await db.getAll(db.collection("market_products").doc(productId),db.collection("market_sale_offers").doc(productId));
      const item=product.data();
      available=!!item && ["preview","published"].includes(item.status) && Number.isSafeInteger(item.price_idr) &&
        item.price_idr>0 && typeof item.license_summary==="string" && !!item.license_summary.trim() &&
        offer.get("active")===true && Boolean(offer.get("file_name") && offer.get("private_reference"));
    } catch { /* A checkout without working server configuration stays hidden. */ }
  }
  return Response.json({available}, {headers: {"Cache-Control": "no-store"}});
}
