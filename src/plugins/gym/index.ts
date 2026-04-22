import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerGymHandlers } from './handlers'
import { ensureGymSchema } from './migrate'

const GymPlugin: IPlugin = {
  id: 'gym',
  ensureSchema: ensureGymSchema,
  registerHandlers: registerGymHandlers
}

export default GymPlugin
