import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How BizFlow collects, stores, and uses customer and operational data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-foreground/65">Effective date: {new Date().toISOString().slice(0, 10)}</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-foreground/80">
        <p>
          We collect the minimum data required to deliver purchases and support: email address, order metadata,
          license records, and support conversation history.
        </p>
        <p>
          Payment card data is handled by Stripe. BizFlow does not store full card numbers or CVC values.
          We process Stripe webhook events for fulfillment and accounting.
        </p>
        <p>
          We use request IDs and structured logs to diagnose production incidents. Logs may include route, status,
          and error metadata, but never plaintext passwords.
        </p>
        <p>
          You can request data export or deletion by opening a support ticket from your account email address.
        </p>
      </section>
    </main>
  );
}
