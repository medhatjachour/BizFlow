import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { PLUGINS } from "@/lib/plugins";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/download`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...PLUGINS.map((plugin) => ({
      url: `${siteUrl}/plugins/${plugin.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
