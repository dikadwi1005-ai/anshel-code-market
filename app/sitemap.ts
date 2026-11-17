import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
const origin = siteUrl;
export default function sitemap(): MetadataRoute.Sitemap {

  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: origin + "/tentang", changeFrequency: "monthly", priority: 0.5 },
    { url: origin + "/kebijakan", changeFrequency: "monthly", priority: 0.4 },
    { url: origin + "/mitra" },
  ];
}
