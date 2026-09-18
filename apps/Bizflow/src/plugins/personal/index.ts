// ─── Personal Work Plugin – Entry Point ──────────────────────────────────────
// Implements the IPlugin contract so the main process can:
//   1. Ensure the personal-work schema is applied on first launch (ensureSchema)
//   2. Register all personal IPC channels (registerHandlers)
// ─────────────────────────────────────────────────────────────────────────────

import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerPersonalHandlers } from './handlers'
import { ensurePersonalSchema } from './migrate'

const PersonalPlugin: IPlugin = {
  id: 'personal',
  ensureSchema: ensurePersonalSchema,
  registerHandlers: registerPersonalHandlers
}

export default PersonalPlugin
