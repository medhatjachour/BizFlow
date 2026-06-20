import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerWarehouseHandlers } from './handlers'
import { ensureWarehouseSchema } from './migrate'

const WarehousePlugin: IPlugin = {
  id: 'warehouse',
  ensureSchema: ensureWarehouseSchema,
  registerHandlers: registerWarehouseHandlers
}

export default WarehousePlugin
