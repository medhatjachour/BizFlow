// Central site metadata — single source of truth for SEO, OG, sitemap, manifest.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const basePath = (
  process.env.NEXT_PUBLIC_BASE_PATH ?? ""
).replace(/\/+$/, "");

export function withBasePath(p: string): string {
  if (!p.startsWith("/")) return p;
  if (!basePath) return p;
  return `${basePath}${p}`;
}

export const brandIconPath = withBasePath("/brand/bizflow-icon.png");

export const siteConfig = {
  name: "BizFlow",
  title: "BizFlow POS, Inventory & Business Management Software",
  description:
    "BizFlow is offline-first POS, inventory, finance, and business management software for retail shops, restaurants, bakeries, clinics, pharmacies, gyms, warehouses, and service teams. Try modules in your browser, then download the desktop app with one-time pricing.",
  url: siteUrl,
  ogImageAlt: "BizFlow POS and business management software modules",
  founder: "Medhat Jachour",
  sameAs: [
    "https://github.com/medhatjachour/BizFlow",
    "https://www.linkedin.com/in/medhatjachour/",
  ],
} as const;
