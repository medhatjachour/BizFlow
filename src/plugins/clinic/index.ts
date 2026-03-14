import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerClinicHandlers } from './handlers'
import { ensureClinicSchema } from './migrate'

const ClinicPlugin: IPlugin = {
  id: 'clinic',
  ensureSchema: ensureClinicSchema,
  registerHandlers: registerClinicHandlers
}

export default ClinicPlugin
