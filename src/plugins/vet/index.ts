import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerVetHandlers } from './handlers'
import { ensureVetSchema } from './migrate'

const VetPlugin: IPlugin = {
  id: 'vet',
  ensureSchema: ensureVetSchema,
  registerHandlers: registerVetHandlers
}

export default VetPlugin
