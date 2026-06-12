/**
 * Browser-side `electron` shim for the BizFlow web port.
 *
 * The real preload calls `ipcRenderer.invoke(channel, ...args)`. Here we keep
 * the exact same API surface but route every call over HTTP to the Node bridge
 * server (see web/server.ts). `contextBridge.exposeInMainWorld` simply assigns
 * onto `window`, mirroring the non-context-isolated Electron path.
 */

type AnyFn = (...args: unknown[]) => unknown;

/**
 * When the app is embedded for a single-module demo, the host passes
 * `?only=<moduleId>` on the URL. We forward it with every IPC call so the
 * bridge can scope `module:getEnabled` to just that module.
 */
function activeOnlyModule(): string {
  try {
    return new URLSearchParams(window.location.search).get("only") || "";
  } catch {
    return "";
  }
}

/**
 * A stable id for this browser session. It scopes the caller to its own
 * isolated sandbox database on the bridge, so two people using the demo at the
 * same time never share or overwrite each other's data. It persists across
 * reloads in the same tab (sessionStorage) and can be pinned with `?session=`.
 */
function sessionId(): string {
  try {
    const KEY = "bizflow:session-id";
    const fromUrl = new URLSearchParams(window.location.search).get("session");
    if (fromUrl) {
      sessionStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "default";
  }
}

async function httpInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const res = await fetch("/ipc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel,
      args,
      only: activeOnlyModule(),
      session: sessionId(),
    }),
  });
  if (!res.ok) throw new Error(`Bridge HTTP ${res.status} for ${channel}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || `Bridge error for ${channel}`);
  return json.data;
}

// Local event registry so preload's `.on()` listeners (e.g. migration events)
// don't crash. The web bridge currently never emits these, so they are inert.
const listeners = new Map<string, Set<AnyFn>>();

export const ipcRenderer = {
  invoke: httpInvoke,
  on(channel: string, cb: AnyFn) {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(cb);
  },
  once(channel: string, cb: AnyFn) {
    const wrap: AnyFn = (...a) => {
      this.removeListener(channel, wrap);
      return cb(...a);
    };
    this.on(channel, wrap);
  },
  removeListener(channel: string, cb: AnyFn) {
    listeners.get(channel)?.delete(cb);
  },
  removeAllListeners(channel: string) {
    listeners.delete(channel);
  },
  send() {
    /* no-op in the web port */
  },
};

export const contextBridge = {
  exposeInMainWorld(key: string, value: unknown) {
    (window as unknown as Record<string, unknown>)[key] = value;
  },
};

export const shell = {
  openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    return Promise.resolve();
  },
};

export const webFrame = {
  setZoomFactor() {},
  getZoomFactor() {
    return 1;
  },
};

export default { ipcRenderer, contextBridge, shell, webFrame };
