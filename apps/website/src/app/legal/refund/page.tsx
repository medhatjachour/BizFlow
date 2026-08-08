import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund and cancellation rules for BizFlow purchases.",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Refund Policy</h1>
      <p className="mt-3 text-sm text-foreground/65">Effective date: {new Date().toISOString().slice(0, 10)}</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-foreground/80">
        <p>
          New purchases are eligible for refund within 14 calendar days when there is a reproducible technical
          issue we cannot resolve, or if the product was purchased by mistake and not actively used.
        </p>
        <p>
          Refund requests require your order email and license key. Requests are tracked with a support ticket ID.
          Chargeback abuse may lead to account suspension.
        </p>
        <p>
          Custom development quotes and implementation services are non-refundable after implementation has begun,
          unless otherwise agreed in writing.
        </p>
      </section>
    </main>
  );
}
