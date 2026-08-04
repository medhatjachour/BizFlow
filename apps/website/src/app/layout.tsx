import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { brandIconPath, siteConfig, siteUrl } from "@/lib/site";
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
  keywords: [
    "BizFlow",
    "POS",
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
    title: siteConfig.title,
    description: siteConfig.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: brandIconPath,
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
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
