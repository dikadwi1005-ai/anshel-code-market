import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function commerceServices() {
  const name = "anshel-commerce";
  const raw = process.env.COMMERCE_SERVICE_ACCOUNT;
  const credentials = raw ? JSON.parse(raw) : undefined;
  if (credentials && credentials.project_id !== "anshelcode") throw Error("Unexpected project");
  const app = getApps().find(item => item.name === name) ?? initializeApp({
    projectId: "anshelcode",
    credential: credentials ? cert(credentials) : applicationDefault(),
  }, name);
  return { app, db: getFirestore(app) };
}

export function paymentSettings() {
  const mode = process.env.SUMOPOD_MODE;
  const key = process.env.SUMOPOD_API_KEY;
  const secret = process.env.SUMOPOD_SIGNING_SECRET;
  if (process.env.MARKET_CHECKOUT_ENABLED !== "true" || !key || !secret ||
      (mode !== "sandbox" && mode !== "live")) return null;
  const api = mode === "live" ? "https://api-pay.sumopod.com" : "https://api-pay-sandbox.sumopod.com";
  return { api, key, secret, mode };
}
