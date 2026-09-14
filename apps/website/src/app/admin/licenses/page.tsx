import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import LicensesConsole from "@/components/admin/LicensesConsole";
import { ADMIN_COOKIE, readLicenses, verifyToken } from "@/lib/admin";
import { readLicenseRequests } from "@/lib/license-requests";

export const metadata: Metadata = {
  title: "Licence console — BizFlow",
  robots: { index: false, follow: false },
};

// Licences and the request inbox both change outside this page's control.
export const dynamic = "force-dynamic";

export default async function AdminLicensesPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) redirect("/admin/login");

  const [licenses, requests] = await Promise.all([readLicenses(), readLicenseRequests()]);

  return (
    <>
      <AuroraBackground />
      <LicensesConsole licenses={licenses} requests={requests} />
    </>
  );
}
