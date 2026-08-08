import type { Metadata } from "next";
import Link from "next/link";

import SupportTicketForm from "@/components/support/SupportTicketForm";

export const metadata: Metadata = {
  title: "Support",
  description: "Open a BizFlow support ticket and track delivery status with a ticket ID.",
};

export default function SupportPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Support</h1>
      <p className="mt-3 text-sm text-foreground/70">
        Open a support request and receive a ticket ID you can track publicly.
      </p>
      <p className="mt-2 text-xs text-foreground/55">
        SLA target: first response within 24h on business days.
      </p>

      <SupportTicketForm />

      <div className="mt-6 text-sm text-foreground/70">
        Already have a ticket? Check status on the{" "}
        <Link href="/support/status" className="font-semibold underline">
          support status page
        </Link>
        .
      </div>
    </main>
  );
}
