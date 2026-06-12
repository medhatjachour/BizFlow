import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BizFlow — Run your whole business in one beautiful app",
  description:
    "BizFlow is a modern business management system: POS, inventory, finance, and modules for bakeries, restaurants, clinics, vets and gyms. Try any module in your browser, then download the desktop build.",
  keywords: [
    "BizFlow",
    "POS",
    "business management",
    "inventory",
    "try in browser",
    "desktop app",
    "bakery app",
    "clinic app",
    "vet app",
    "dentist app",
  ],
  icons: { icon: "/brand/bizflow-icon.png" },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
