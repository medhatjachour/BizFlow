export const restaurantManifest = {
  id: 'restaurant' as const,
  name: 'Restaurant',
  nameAr: 'المطعم',
  description: 'Table management, reservations, digital menu, and dine-in order tracking.',
  icon: '🍽️',
  color: 'orange',
  status: 'active' as const,
  routePrefix: '/restaurant',
  ipcPrefix: 'restaurant',
  models: ['RestaurantTable', 'TableReservation', 'MenuItem', 'DineInOrder', 'DineInOrderItem'],
  defaultEnabled: false
}
