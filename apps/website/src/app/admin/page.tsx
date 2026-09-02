import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuroraBackground from "@/components/AuroraBackground";
import AdminDashboard from "@/components/admin/AdminDashboard";
import {
  ADMIN_COOKIE,
  adminUsingDefault,
  readCustomers,
  readLicenses,
  readOrders,
  readRequests,
  readSupportTickets,
  verifyToken,
} from "@/lib/admin";
import { getPurchasable } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Manager — BizFlow",
  robots: { index: false, follow: false },
};

// Always read fresh data from disk.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) redirect("/admin/login");

  const [orders, requests, tickets, licenses, customers] = await Promise.all([
    readOrders(),
    readRequests(),
    readSupportTickets(),
    readLicenses(),
    readCustomers(),
  ]);

  // Enrich orders with a human label from the shared catalog.
  const ordersView = orders.map((o) => ({
    ...o,
    label: getPurchasable(o.itemId)?.label ?? o.itemId,
  }));

  return (
    <>
      <AuroraBackground />
      <AdminDashboard
        orders={ordersView}
        requests={requests}
        tickets={tickets}
        licenses={licenses}
        customers={customers}
        usingDefaultPassword={adminUsingDefault}
      />
    </>
  );
}
