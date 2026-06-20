/**
 * Commerce Plugin – IPlugin implementation
 *
 * Wires together manifest, schema migration and IPC handler registration
 * following the same pattern as bakery, restaurant, warehouse and clinic.
 */

import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerCommerceHandlers } from './handlers/index'
import { ensureCommerceSchema } from './migrate'

const CommercePlugin: IPlugin = {
  id: 'commerce',
  ensureSchema: ensureCommerceSchema,
  registerHandlers: registerCommerceHandlers,
}

export default CommercePlugin
