import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Portal Login",
  robots: { index: false, follow: false },
};

export default function PortalLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
