"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PLUGINS, getPlugin } from "@/lib/plugins";
import ModuleFrame from "./ModuleFrame";

export default function Desktop() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedModuleId = searchParams.get("module");
  const activePlugin = getPlugin(requestedModuleId ?? "") ?? PLUGINS[0];

  if (!activePlugin) return null;

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#07111f]">
      <div className="shrink-0 border-b border-white/10 bg-[#0b1728] px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto">
         <Link href="/" className="text-lg font-semibold text-white transition hover:text-biz-200">
            BizFlow
          </Link>
          <div className="flex gap-2">
            {PLUGINS.map((plugin) => {
              const active = plugin.id === activePlugin.id;
              return (
                <button
                  key={plugin.id}
                  type="button"
                  onClick={() => router.replace(`/app?module=${plugin.id}`)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-biz-500 text-white"
                      : "bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{plugin.icon} </span>
                  {plugin.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ModuleFrame key={activePlugin.id} pluginId={activePlugin.id} />
      </div>
    </section>
  );
}
