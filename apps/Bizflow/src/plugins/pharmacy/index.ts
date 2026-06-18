import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerPharmacyHandlers } from './handlers'
import { ensurePharmacySchema } from './migrate'

const PharmacyPlugin: IPlugin = {
  id: 'pharmacy',
  ensureSchema: ensurePharmacySchema,
  registerHandlers: registerPharmacyHandlers
}

export default PharmacyPlugin
