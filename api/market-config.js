"use strict";

// Public configuration endpoint for the browser admin. Do not return service
// role keys, secret keys, database passwords, or other privileged credentials.
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = (process.env.SUPABASE_PROJECT_URL || "").replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    return res.status(503).json({
      configured: false,
      message: "Supabase khusus Anshel Market belum dikonfigurasi."
    });
  }

  return res.status(200).json({ configured: true, url, publishableKey });
};
