/**
 * Shim for `@electron-toolkit/preload` in the web port.
 * The real package exposes a curated `electronAPI` (surfaced as `window.electron`).
 * Some BizFlow pages call `window.electron.ipcRenderer.invoke(...)`, so we route
 * that through the same HTTP bridge used by the main `electron` browser shim.
 */
import { ipcRenderer } from "./electron.browser";

export const electronAPI = {
  process: { versions: {} as Record<string, string> },
  ipcRenderer,
};

export default { electronAPI };
