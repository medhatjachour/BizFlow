const faqs = [
  {
    question: "What is BizFlow?",
    answer:
      "BizFlow is offline-first business management software with POS, inventory, finance, reporting, customer management, and specialized modules for retail, restaurants, bakeries, clinics, pharmacies, gyms, warehouses, and service teams.",
  },
  {
    question: "Who is BizFlow best for?",
    answer:
      "BizFlow is best for small and growing businesses that want a desktop app they can own, run locally, and use without monthly subscription fees.",
  },
  {
    question: "Does BizFlow work offline?",
    answer:
      "Yes. BizFlow is designed as an offline-capable desktop application. Business data is stored locally on the device, while licensing and optional website services use online APIs.",
  },
  {
    question: "Can I try BizFlow before buying?",
    answer:
      "Yes. Each BizFlow module can be tested live in the browser before downloading the desktop installer or buying a license.",
  },
  {
    question: "How is BizFlow licensed?",
    answer:
      "BizFlow uses one-time license keys. Activation validates the purchase online, binds the license to the customer device, and stores a signed local activation certificate for offline use.",
  },
];

const comparisons = [
  ["Traditional cloud POS", "Monthly fees, cloud dependency, data hosted by the vendor"],
  ["Spreadsheet workflow", "Manual inventory updates, weak reporting, no checkout flow"],
  ["BizFlow", "Owned desktop software, local data, live browser trial, specialized modules"],
];

export default function AnswerEngineContent() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section id="answers" className="relative mx-auto max-w-6xl px-4 py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-biz-300">BizFlow answers</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">POS and business software, explained plainly</h2>
        <p className="mt-4 text-sm leading-7 text-foreground/65">
          BizFlow helps business owners run sales, stock, finance, customers, and specialized operations from one offline-capable desktop app. These answers are written for buyers comparing POS, inventory, and business management systems.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="glass rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">{faq.question}</summary>
              <p className="mt-3 text-sm leading-6 text-foreground/65">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-bold">How BizFlow compares</h3>
          <div className="mt-4 divide-y divide-white/10">
            {comparisons.map(([label, detail]) => (
              <div key={label} className="py-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/55">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}