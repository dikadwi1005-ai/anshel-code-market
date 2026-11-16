import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/api/"] },
    sitemap: "https://anshel-code-market.vercel.app/sitemap.xml",
  };
}
