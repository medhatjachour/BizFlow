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
    "@type": "SoftwareApplication",
    name: `${siteConfig.name} ${plugin.name}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: plugin.description,
    url: `${siteUrl}/plugins/${plugin.id}`,
    offers: { "@type": "Offer", price: String(plugin.price), priceCurrency: "USD" },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">Back to BizFlow</Link>
      <p className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{plugin.tagline}</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">BizFlow {plugin.name}</h1>
      <p className="mt-6 max-w-2xl text-xl text-slate-300">{plugin.description}</p>
      <p className="mt-4 max-w-2xl text-slate-400">Built for {plugin.bestFor.toLowerCase()}.</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href={`/download?module=${plugin.id}`} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Download {plugin.name}</Link>
        <Link href={`/app?module=${plugin.id}`} className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">Try in browser</Link>
      </div>
      <section className="mt-16 grid gap-4 sm:grid-cols-2" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">{plugin.name} features</h2>
        {plugin.features.map((feature) => <div key={feature} className="border-t border-white/10 py-4 text-slate-300">{feature}</div>)}
      </section>
    </main>
  );
}
