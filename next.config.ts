import type { NextConfig } from "next";
const oldRoutes = ["admin","produk","checkout","tersimpan","bandingkan","tentang","kebijakan","rilis"];
// Header keamanan dasar. CSP sengaja dibatasi pada direktif yang aman bagi Next.js
// (tanpa script-src) agar tidak memutus hidrasi; perketat dengan nonce bila diperlukan.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return oldRoutes.map((slug) => ({ source: `/${slug}.html`, destination: `/${slug}`, permanent: false }));
  },
};
export default nextConfig;
