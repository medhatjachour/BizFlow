import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#060d1a",
    theme_color: "#060d1a",
    icons: [
      { src: "/brand/bizflow-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/bizflow-icon.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
