import type { AppMeta } from "./types";
import { PLUGINS } from "./plugins";
import ModuleFrame from "@/components/desktop/ModuleFrame";

/**
 * The BizFlow desktop dock is generated from the plugin catalog: one app per
 * module. Opening a module launches the real BizFlow web app focused on that
 * module's route, with a built-in "download" action.
 */
export const APPS: AppMeta[] = PLUGINS.map((p) => {
  const ModuleComponent = () => <ModuleFrame pluginId={p.id} />;
  ModuleComponent.displayName = `Module_${p.id}`;
  return {
    id: p.id,
    title: p.name,
    accent: p.accent,
    icon: <span className="text-xl leading-none">{p.icon}</span>,
    defaultSize: { width: 1100, height: 720 },
    component: ModuleComponent,
  } satisfies AppMeta;
});

export const getApp = (id: string) => APPS.find((a) => a.id === id);
