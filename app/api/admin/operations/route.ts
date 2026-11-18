import {commerceServices, paymentSettings} from "@/lib/server/commerce";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = {"Cache-Control":"private, no-store", Vary:"Authorization"};
  const json = (data: unknown, status = 200) => Response.json(data, {status, headers});
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) return json({error:"Masuk sebagai admin."}, 401);

  try {
    const {app, db} = commerceServices();
    const {getAuth} = await import("firebase-admin/auth");
    const actor = await getAuth(app).verifyIdToken(authorization.slice(7), true).catch(()=>null);
    if (!actor || !/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid)) return json({error:"Masuk sebagai admin."}, 401);
    if (!(await db.collection("market_admins").doc(actor.uid).get()).exists) return json({error:"Akses admin diperlukan."}, 403);
    const mode = process.env.SUMOPOD_MODE;
    return json({
      firebase: true,
      sumopodMode: mode === "live" || mode === "sandbox" ? mode : null,
      apiKeyConfigured: Boolean(process.env.SUMOPOD_API_KEY),
      webhookConfigured: Boolean(process.env.SUMOPOD_SIGNING_SECRET),
      checkoutEnabled: Boolean(paymentSettings()),
    });
  } catch {
    return json({error:"Status konfigurasi belum dapat dimuat."}, 503);
  }
}
