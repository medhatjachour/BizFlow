import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { brandIconPath, siteConfig, siteUrl, withBasePath } from "@/lib/site";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.title,
    template: "%s — BizFlow",
  },
  description: siteConfig.description,
  applicationName: "BizFlow",
  category: "Business software",
  keywords: [
    "BizFlow",
    "point of sale",
    "business management software",
    "inventory management",
    "bakery software",
    "restaurant POS",
    "clinic management",
    "veterinary software",
    "gym management",
    "try in browser",
    "offline desktop app",
  ],
  authors: [{ name: "BizFlow" }],
  creator: "BizFlow",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "BizFlow",
    description: siteConfig.description,
    locale: "en_US",
    images: [{ url: withBasePath("/opengraph-image"), alt: siteConfig.ogImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    description: siteConfig.description,
    images: [withBasePath("/opengraph-image")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: brandIconPath, type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: brandIconPath,
  },
};

export const viewport: Viewport = {
  themeColor: "#060d1a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: siteConfig.description,
    url: siteUrl,
    image: `${siteUrl}${withBasePath("/opengraph-image")}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
