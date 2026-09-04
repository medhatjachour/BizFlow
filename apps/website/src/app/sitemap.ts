import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { PLUGINS } from "@/lib/plugins";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/download`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/status`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${siteUrl}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...PLUGINS.map((plugin) => ({
      url: `${siteUrl}/plugins/${plugin.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
