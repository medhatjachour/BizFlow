/**
 * IPlugin – contract every BizFlow plugin must satisfy.
 *
 * Each plugin's  src/plugins/<id>/index.ts  exports a default object
 * that implements this interface. The main process loops over ALL_PLUGINS
 * to wire up handlers without manually updating handlers/index.ts.
 */
export interface IPlugin {
  /** Unique identifier — matches ModuleId in modules.ts */
  id: string

  /**
   * Run any DB migrations needed by this plugin.
   * Called on app startup before registerHandlers.
   */
  ensureSchema(prisma: any, dbUrl: string, cwd: string): Promise<void>

  /** Register all ipcMain.handle channels owned by this plugin. */
  registerHandlers(prisma: any): void
}
