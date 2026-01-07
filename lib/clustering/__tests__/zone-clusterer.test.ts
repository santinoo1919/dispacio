import { ZoneClusterer } from '../zone-clusterer';
import { Order } from '@/lib/types';

describe('ZoneClusterer', () => {
  it('returns Unassigned Zone when no coords available', () => {
    const orders: Order[] = [
      { id: 'A', customerName: 'A', address: 'x', rawData: {} },
      { id: 'B', customerName: 'B', address: 'y', rawData: {} },
    ];
    const zc = new ZoneClusterer();
    const zones = zc.clusterOrders(orders);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe('Unassigned Zone');
    expect(zones[0].orderCount).toBe(2);
  });

  it('clusters nearby points into zones and keeps singles separate', () => {
    const orders: Order[] = [
      // Cluster near (10,10)
      { id: 'C1', customerName: 'c1', address: 'a', latitude: 10.001, longitude: 10.001, rawData: {} },
      { id: 'C2', customerName: 'c2', address: 'a', latitude: 10.002, longitude: 10.002, rawData: {} },
      // Single far away
      { id: 'S1', customerName: 's1', address: 'a', latitude: 20.0, longitude: 20.0, rawData: {} },
    ];
    const zc = new ZoneClusterer({ radius: 80, minPoints: 2, maxZoom: 14 });
    const zones = zc.clusterOrders(orders);
    // We expect at least two zones: one cluster zone and one single
    expect(zones.length).toBeGreaterThanOrEqual(2);
    const totalOrders = zones.reduce((acc, z) => acc + z.orderCount, 0);
    expect(totalOrders).toBe(3);
  });

  it('appends Unassigned Zone for orders missing coordinates', () => {
    const orders: Order[] = [
      { id: 'C1', customerName: 'c1', address: 'a', latitude: 10.0, longitude: 10.0, rawData: {} },
      { id: 'U1', customerName: 'u1', address: 'a', rawData: {} },
    ];
    const zc = new ZoneClusterer();
    const zones = zc.clusterOrders(orders);
    const hasUnassigned = zones.some((z) => z.id === 'Unassigned Zone');
    expect(hasUnassigned).toBe(true);
  });
});


