import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLUGINS, getPlugin } from "@/lib/plugins";
import { siteConfig, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return PLUGINS.map((plugin) => ({ id: plugin.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plugin = getPlugin(id);
  if (!plugin) return {};
  return {
    title: `${plugin.name} software for ${plugin.bestFor}`,
    description: plugin.description,
    alternates: { canonical: `${siteUrl}/plugins/${plugin.id}` },
    openGraph: {
      title: `${plugin.name} — ${plugin.tagline}`,
      description: plugin.description,
      url: `${siteUrl}/plugins/${plugin.id}`,
      type: "website",
    },
  };
}

export default async function PluginPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plugin = getPlugin(id);
  if (!plugin) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BizFlow", item: siteUrl },
          { "@type": "ListItem", position: 2, name: plugin.name, item: `${siteUrl}/plugins/${plugin.id}` },
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: `${siteConfig.name} ${plugin.name}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Windows, macOS, Linux",
        description: plugin.longDescription,
        url: `${siteUrl}/plugins/${plugin.id}`,
        offers: { "@type": "Offer", price: String(plugin.price), priceCurrency: "USD", availability: "https://schema.org/InStock" },
        featureList: plugin.features,
        audience: { "@type": "Audience", audienceType: plugin.bestFor },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What is BizFlow ${plugin.name}?`,
            acceptedAnswer: { "@type": "Answer", text: plugin.longDescription },
          },
          {
            "@type": "Question",
            name: `Who is BizFlow ${plugin.name} best for?`,
            acceptedAnswer: { "@type": "Answer", text: `BizFlow ${plugin.name} is best for ${plugin.bestFor.toLowerCase()}.` },
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">Back to BizFlow</Link>
      <p className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{plugin.tagline}</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">BizFlow {plugin.name}</h1>
      <p className="mt-6 max-w-2xl text-xl text-slate-300">{plugin.description}</p>
      <p className="mt-4 max-w-2xl text-slate-400">Built for {plugin.bestFor.toLowerCase()}.</p>
      <p className="mt-4 max-w-3xl text-slate-300">{plugin.longDescription}</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href={`/download?module=${plugin.id}`} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Download {plugin.name}</Link>
        <Link href={`/app?module=${plugin.id}`} className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">Try in browser</Link>
      </div>
      <section className="mt-16 grid gap-4 sm:grid-cols-2" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">{plugin.name} features</h2>
        {plugin.features.map((feature) => <div key={feature} className="border-t border-white/10 py-4 text-slate-300">{feature}</div>)}
      </section>
      <section className="mt-16 grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-2" aria-labelledby="answers-heading">
        <h2 id="answers-heading" className="sm:col-span-2 text-2xl font-semibold">Common questions about BizFlow {plugin.name}</h2>
        <div>
          <h3 className="text-sm font-semibold text-cyan-300">What does it help with?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{plugin.features.slice(0, 4).join(". ")}.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-cyan-300">Can I test it first?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Yes. Open the live browser demo for {plugin.name}, then download the desktop installer when you are ready.</p>
        </div>
      </section>
    </main>
  );
}
