"use strict";

// Firebase web-app configuration is PUBLIC by design. All data authorization
// must be enforced by Firestore Security Rules, never by hiding these values.
// Do not add service-account JSON, private keys, or payment credentials here.
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const firebase = {
    apiKey: (process.env.FIREBASE_API_KEY || "").trim(),
    authDomain: (process.env.FIREBASE_AUTH_DOMAIN || "").trim(),
    projectId: (process.env.FIREBASE_PROJECT_ID || "").trim(),
    appId: (process.env.FIREBASE_APP_ID || "").trim()
  };
  if (!firebase.apiKey || !/^[a-z0-9-]+$/.test(firebase.projectId) ||
      firebase.authDomain !== firebase.projectId + ".firebaseapp.com" ||
      !/^\d+:[^:]+:web:[A-Za-z0-9_-]+$/.test(firebase.appId)) {
    return res.status(503).json({
      provider: "firebase", configured: false,
      message: "Firebase khusus Anshel Market belum dikonfigurasi."
    });
  }

  return res.status(200).json({
    provider: "firebase",
    configured: true,
    firebase,
    storageEnabled: false,
    ordersEnabled: false,
    paymentsEnabled: false
  });
};
