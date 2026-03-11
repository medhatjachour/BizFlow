export const warehouseManifest = {
  id: 'warehouse' as const,
  name: 'Warehouse',
  nameAr: 'المستودع',
  description: 'Multi-location inventory with bin/location tracking and stock transfers.',
  icon: '🏭',
  color: 'blue',
  status: 'active' as const,
  routePrefix: '/warehouse',
  ipcPrefix: 'warehouse',
  models: ['WarehouseLocation', 'WarehouseStock', 'StockTransfer', 'StockTransferItem'],
  defaultEnabled: false
}
