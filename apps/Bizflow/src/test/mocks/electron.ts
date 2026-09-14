/**
 * Test double for the `electron` module.
 *
 * The unit suites exercise main-process code (IPC handlers, services,
 * repositories), and that code imports `ipcMain`, `app`, `dialog`, `shell`,
 * `BrowserWindow` and `safeStorage` at module scope. Under CI the install runs
 * with `--ignore-scripts`, which is deliberate - it skips Electron's postinstall
 * that downloads the ~100MB runtime - so `require('electron')` throws:
 *
 *   Error: Electron failed to install correctly, please delete node_modules/electron
 *   and try installing again
 *     at getElectronPath node_modules/electron/index.js:17:11
 *     at node_modules/electron-log/src/main/index.js:3:18
 *
 * Aliasing `electron` to this file keeps the suites hermetic: they get the API
 * surface they call, without needing a packaged runtime. This is also why the
 * tests pass locally (a real Electron is installed) and failed in CI.
 *
 * Keep this permissive - it exists so imports resolve, not to emulate Electron.
 */

const noop = (): void => undefined
const asyncNoop = async (): Promise<undefined> => undefined

const emitter = {
  on: noop,
  once: noop,
  off: noop,
  removeListener: noop,
  removeAllListeners: noop,
  emit: noop
}

export const app = {
  ...emitter,
  getPath: () => process.cwd(),
  setPath: noop,
  getAppPath: () => process.cwd(),
  getName: () => 'bizflow',
  getVersion: () => '1.0.0',
  isPackaged: false,
  whenReady: async () => undefined,
  quit: noop,
  exit: noop,
  relaunch: noop,
  requestSingleInstanceLock: () => true,
  onBeforeQuit: noop
}

export const ipcMain = {
  ...emitter,
  handle: noop,
  handleOnce: noop,
  removeHandler: noop
}

export const ipcRenderer = {
  ...emitter,
  invoke: asyncNoop,
  send: noop,
  sendSync: () => undefined
}

export const dialog = {
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showMessageBox: async () => ({ response: 0, checkboxChecked: false }),
  showErrorBox: noop
}

export const shell = {
  openExternal: asyncNoop,
  openPath: asyncNoop,
  showItemInFolder: noop,
  trashItem: asyncNoop
}

export const BrowserWindow = class {
  static getAllWindows(): unknown[] {
    return []
  }
  static getFocusedWindow(): null {
    return null
  }
  webContents = { ...emitter, send: noop, openDevTools: noop }
  loadURL = asyncNoop
  show = noop
  close = noop
  on = noop
}

export const Menu = {
  setApplicationMenu: noop,
  buildFromTemplate: () => null,
  getApplicationMenu: () => null
}

export const nativeImage = {
  createFromPath: () => ({ isEmpty: () => true }),
  createFromBuffer: () => ({ isEmpty: () => true })
}

export const safeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: (value: string) => Buffer.from(value),
  decryptString: (buffer: Buffer) => buffer.toString()
}

export const screen = {
  getPrimaryDisplay: () => ({ workAreaSize: { width: 1280, height: 800 } })
}

export default {
  app,
  ipcMain,
  ipcRenderer,
  dialog,
  shell,
  BrowserWindow,
  Menu,
  nativeImage,
  safeStorage,
  screen
}
