/**
 * Bakery Plugin – Manifest
 *
 * Central metadata for the Bakery plugin.  Imported by the module registry
 * (src/shared/modules.ts) and the Settings UI.
 *
 * Adding a new plugin:
 *   1. Create  src/plugins/<id>/manifest.ts   — this file (copy template below)
 *   2. Create  src/plugins/<id>/handlers.ts   — ipcMain.handle registrations
 *   3. Create  src/plugins/<id>/preload.ts    — ipcRenderer.invoke wrappers
 *   4. Create  src/plugins/<id>/schema.prisma — Prisma models (no datasource/generator)
 *   5. Create  src/renderer/src/plugins/<id>/pages/index.tsx — main UI page
 *   6. Register in the 4 wiring points below:
 *      a. src/preload/index.ts          → add `<id>: <id>Preload` to api object
 *      b. src/main/ipc/handlers/index.ts → call register<Id>Handlers(prisma)
 *      c. src/renderer/src/App.tsx       → add lazy route
 *      d. src/renderer/src/components/layout/RootLayout.tsx → add nav item
 *      e. src/shared/modules.ts          → add to MODULE_REGISTRY
 *      f. scripts/merge-schemas.js       → add to MODULE_REGISTRY (JS)
 *
 * Removing a plugin:
 *   - Delete the src/plugins/<id>/ directory
 *   - Delete src/renderer/src/plugins/<id>/
 *   - Remove from the 6 wiring points above
 *   - Run: npm run prisma:migrate -- --name remove_<id>_module
 */

export const bakeryManifest = {
  id: 'bakery' as const,
  name: 'Bakery',
  nameAr: 'المخبز',
  description: 'Production scheduling, recipe management, ingredient pantry and waste tracking for bakery businesses.',
  icon: '🥐',
  color: 'amber',
  status: 'active' as const,
  routePrefix: '/bakery',
  ipcPrefix: 'bakery',
  models: ['Recipe', 'RecipeIngredient', 'ProductionBatch', 'PantryIngredient', 'WasteLog', 'ProductionSchedule'],
  /** Default enabled state for new installations */
  defaultEnabled: true
}
