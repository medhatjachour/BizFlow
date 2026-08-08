import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing purchase and use of BizFlow software and support.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-foreground/65">Effective date: {new Date().toISOString().slice(0, 10)}</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-foreground/80">
        <p>
          BizFlow grants you a non-exclusive license to use purchased modules for your business operations.
          Redistribution, resale, or reverse-engineering for resale is not permitted.
        </p>
        <p>
          You are responsible for securing your credentials, keeping your operating environment updated, and using
          the software in accordance with local regulations related to accounting, taxation, and customer data.
        </p>
        <p>
          Support availability and response targets are described on the public status page. We may suspend service
          for abuse, fraud, chargeback abuse, or security risk.
        </p>
        <p>
          These terms are governed by applicable local law. For legal requests contact support through the
          support portal and include your ticket ID.
        </p>
      </section>
    </main>
  );
}
