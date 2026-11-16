import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  const firebase = {
    apiKey: (process.env.FIREBASE_API_KEY || "").trim(),
    authDomain: (process.env.FIREBASE_AUTH_DOMAIN || "").trim(),
    projectId: (process.env.FIREBASE_PROJECT_ID || "").trim(),
    appId: (process.env.FIREBASE_APP_ID || "").trim(),
  };
  const configured = !!firebase.apiKey && /^[a-z0-9-]+$/.test(firebase.projectId) &&
    firebase.authDomain === firebase.projectId + ".firebaseapp.com" &&
    /^\d+:[^:]+:web:[A-Za-z0-9_-]+$/.test(firebase.appId);
  return NextResponse.json({
    provider: "firebase", configured,
    ...(configured ? { firebase } : {}),
    storageEnabled: false, ordersEnabled: false, paymentsEnabled: false,
  }, { headers: { "Cache-Control": "no-store" } });
}
