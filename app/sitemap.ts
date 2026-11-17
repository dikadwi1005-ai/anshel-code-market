import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
const origin = siteUrl;
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: origin, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: origin + "/tentang", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: origin + "/kebijakan", lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
}
