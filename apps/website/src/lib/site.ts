// Central site metadata — single source of truth for SEO, OG, sitemap, manifest.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const siteConfig = {
  name: "BizFlow",
  title: "BizFlow — Run your whole business in one beautiful app",
  description:
    "BizFlow is a modern business management system: POS, inventory, finance, and specialized modules for bakeries, restaurants, clinics, vets and gyms. Try any module in your browser, then download the desktop build — one-time pricing, no subscriptions.",
  url: siteUrl,
  ogImageAlt: "BizFlow — one app to run your whole business",
} as const;
