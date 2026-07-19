// ─── Coffee Shop Plugin – Entry Point ────────────────────────────────────────
// Implements the IPlugin contract so the main process can:
//   1. Ensure the coffee schema is applied on first launch (ensureSchema)
//   2. Register all coffee IPC channels (registerHandlers)
// ─────────────────────────────────────────────────────────────────────────────

import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerCoffeeHandlers } from './handlers'
import { ensureCoffeeSchema } from './migrate'

const CoffeePlugin: IPlugin = {
  id: 'coffee',
  ensureSchema:      ensureCoffeeSchema,
  registerHandlers:  registerCoffeeHandlers
}

export default CoffeePlugin
