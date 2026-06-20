import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerBakeryHandlers } from './handlers'
import { ensureBakerySchema } from './migrate'

const BakeryPlugin: IPlugin = {
  id: 'bakery',
  ensureSchema: ensureBakerySchema,
  registerHandlers: registerBakeryHandlers
}

export default BakeryPlugin
