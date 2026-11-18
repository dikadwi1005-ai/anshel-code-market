import {commerceServices} from "@/lib/server/commerce";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const headers = {"Cache-Control": "private, no-store", Vary: "Authorization"};
  const respond = (data: unknown, status = 200) => Response.json(data, {status, headers});
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192) return respond({error: "Masuk sebagai admin."}, 401);
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  if (cursor && cursor.length > 2048) return respond({error: "Halaman tidak valid."}, 400);
  try {
    const {app, db} = commerceServices();
    const {getAuth} = await import("firebase-admin/auth");
    const auth = getAuth(app);
    const actor = await auth.verifyIdToken(authorization.slice(7), true).catch(() => null);
    if (!actor || !/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid)) return respond({error: "Masuk sebagai admin."}, 401);
    if (!(await db.collection("market_admins").doc(actor.uid).get()).exists) return respond({error: "Akses admin diperlukan."}, 403);
    const page = await auth.listUsers(50, cursor);
    const eligible = page.users.filter(user => user.email);
    const roles = eligible.length ? await db.getAll(...eligible.map(user => db.collection("market_admins").doc(user.uid))) : [];
    const customers = eligible.flatMap((user, i) => roles[i].exists ? [] : [{
      id: user.uid, email: user.email, verified: user.emailVerified, disabled: user.disabled,
      created: user.metadata.creationTime,
    }]);
    return respond({customers, next: page.pageToken ?? null});
  } catch {
    return respond({error: "Daftar pelanggan belum dapat dimuat."}, 503);
  }
}
