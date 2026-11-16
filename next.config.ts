import type { NextConfig } from "next";
const oldRoutes = ["admin","produk","checkout","tersimpan","bandingkan","tentang","kebijakan","rilis"];
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return oldRoutes.map((slug) => ({ source: `/${slug}.html`, destination: `/${slug}`, permanent: false }));
  },
};
export default nextConfig;
