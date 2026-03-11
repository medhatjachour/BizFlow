import type { IPlugin } from '../../shared/interfaces/IPlugin'
import { registerRestaurantHandlers } from './handlers'
import { ensureRestaurantSchema } from './migrate'

const RestaurantPlugin: IPlugin = {
  id: 'restaurant',
  ensureSchema: ensureRestaurantSchema,
  registerHandlers: registerRestaurantHandlers
}

export default RestaurantPlugin
