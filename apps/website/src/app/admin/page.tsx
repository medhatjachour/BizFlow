import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuroraBackground from "@/components/AuroraBackground";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isTab } from "@/lib/admin-tabs";
import {
  ADMIN_COOKIE,
  adminUsingDefault,
  readCustomers,
  readLicenses,
  readOrdersEnriched,
  readRequests,
  readSupportTickets,
  verifyToken,
} from "@/lib/admin";

export const metadata: Metadata = {
  title: "Manager — BizFlow",
  robots: { index: false, follow: false },
};

// Always read fresh data from disk.
export const dynamic = "force-dynamic";

/**
 * `?tab=` and `?notice=` are set by the drill-down pages so a manager returning
 * from an order or a customer lands on the queue they came from.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string }>;
}) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) redirect("/admin/login");

  const { tab, notice } = await searchParams;

  const [orders, requests, tickets, licenses, customers] = await Promise.all([
    readOrdersEnriched(),
    readRequests(),
    readSupportTickets(),
    readLicenses(),
    readCustomers(),
  ]);

  return (
    <>
      <AuroraBackground />
      <AdminDashboard
        orders={orders}
        requests={requests}
        tickets={tickets}
        licenses={licenses}
        customers={customers}
        usingDefaultPassword={adminUsingDefault}
        initialTab={isTab(tab) ? tab : undefined}
        notice={notice}
      />
    </>
  );
}
