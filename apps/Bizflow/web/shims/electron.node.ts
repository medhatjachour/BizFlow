/**
 * Node-side `electron` shim for the BizFlow web bridge server.
 *
 * The real main-process handlers call `ipcMain.handle(channel, fn)`. Here we
 * record those handlers into `__handlers` so the HTTP bridge can dispatch to
 * them. All other Electron globals are stubbed just enough to let the handler
 * modules import and initialise without a real Electron runtime.
 */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

type Handler = (event: unknown, ...args: unknown[]) => unknown;

/** channel -> handler registry, read by the HTTP bridge. */
export const __handlers = new Map<string, Handler>();

export const ipcMain = {
  handle(channel: string, fn: Handler) {
    __handlers.set(channel, fn);
  },
  handleOnce(channel: string, fn: Handler) {
    __handlers.set(channel, fn);
  },
  on() {},
  removeHandler(channel: string) {
    __handlers.delete(channel);
  },
  removeAllListeners() {},
};

const dataDir = path.join(os.tmpdir(), "bizflow-web-data");
fs.mkdirSync(dataDir, { recursive: true });

export const app = {
  getPath(name: string) {
    const p = name === "temp" ? os.tmpdir() : path.join(dataDir, name);
    fs.mkdirSync(p, { recursive: true });
    return p;
  },
  getName: () => "BizFlow",
  getVersion: () => "1.0.0",
  getAppPath: () => process.cwd(),
  getLocale: () => "en-US",
  whenReady: () => Promise.resolve(),
  on() {},
  once() {},
  quit() {},
  exit() {},
  relaunch() {},
  setName() {},
  isReady: () => true,
};

export class BrowserWindow {
  webContents = {
    send() {},
    on() {},
    setWindowOpenHandler() {},
    openDevTools() {},
    session: { webRequest: { onHeadersReceived() {} } },
  };
  loadURL() {
    return Promise.resolve();
  }
  loadFile() {
    return Promise.resolve();
  }
  on() {}
  once() {}
  show() {}
  focus() {}
  maximize() {}
  close() {}
  setMenuBarVisibility() {}
  static getAllWindows() {
    return [] as BrowserWindow[];
  }
  static getFocusedWindow() {
    return null;
  }
}

export const shell = {
  openExternal: () => Promise.resolve(),
  openPath: () => Promise.resolve(""),
  showItemInFolder: () => {},
};

export const dialog = {
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: "" }),
  showMessageBox: () => Promise.resolve({ response: 0 }),
  showErrorBox: () => {},
};

export const Menu = {
  setApplicationMenu() {},
  buildFromTemplate: () => ({}),
};

export const nativeImage = {
  createFromPath: () => ({ isEmpty: () => true }),
  createEmpty: () => ({ isEmpty: () => true }),
};

export const ipcRenderer = {
  invoke: () => Promise.resolve(),
  on() {},
  send() {},
};

export const session = {
  defaultSession: { webRequest: { onHeadersReceived() {} } },
};

export const safeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: (_value: string) => Buffer.alloc(0),
  decryptString: (_value: Buffer) => "",
};

export default {
  app,
  ipcMain,
  ipcRenderer,
  BrowserWindow,
  shell,
  dialog,
  Menu,
  nativeImage,
  session,
  safeStorage,
};
