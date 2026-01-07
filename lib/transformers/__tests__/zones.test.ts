import { transformZone, ApiZone } from '../zones';
import { Order } from '@/lib/types';

describe('transformZone', () => {
  const orders: Order[] = [
    { id: 'A', customerName: 'A', address: 'addr', serverId: 'uuid-1', rawData: {} },
    { id: 'B', customerName: 'B', address: 'addr', serverId: 'uuid-2', rawData: {} },
  ];

  it('maps API zone and selects matching orders', () => {
    const apiZone: ApiZone = {
      id: 'zone-1',
      name: 'Zone 1',
      center: { lat: 10, lng: 20 },
      orders: [{ id: 'uuid-1' }, { id: 'uuid-2' }],
    };

    const zone = transformZone(apiZone, orders, false);
    expect(zone.id).toBe('Zone 1');
    expect(zone.serverId).toBe('zone-1');
    expect(zone.center).toEqual({ lat: 10, lng: 20 });
    expect(zone.orders.map(o => o.id)).toEqual(['A', 'B']);
    expect(zone.orderCount).toBe(2);
  });

  it('auto-assigns driver when enabled and drivers provided', () => {
    const apiZone: ApiZone = {
      id: 'zone-2',
      name: 'Zone 2',
      center: { lat: 40.7128, lng: -74.0060 },
      orders: [{ id: 'uuid-1' }],
    };
    const drivers = [
      { id: 'driver1', location: { lat: 40.7228, lng: -74.0060 } }, // ~1 km away
      { id: 'driver2', location: { lat: 40.7528, lng: -74.0060 } }, // farther
    ];
    const zone = transformZone(apiZone, orders, true, drivers);
    expect(zone.assignedDriverId).toBe('driver1');
  });

  it('uses consistent driver assignment when all orders have same driverId', () => {
    const ordersWithDriver = [
      { ...orders[0], driverId: 'same' },
      { ...orders[1], driverId: 'same' },
    ];
    const apiZone: ApiZone = {
      id: 'zone-3',
      name: 'Zone 3',
      center: { lat: 0, lng: 0 },
      orders: [{ id: 'uuid-1' }, { id: 'uuid-2' }],
    };
    const zone = transformZone(apiZone, ordersWithDriver as any, true);
    expect(zone.assignedDriverId).toBe('same');
  });
});


