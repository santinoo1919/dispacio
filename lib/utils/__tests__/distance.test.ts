import {
  calculateDistance,
  formatDistance,
  calculateOrderDistance,
  findNearestDriver,
} from '../distance';

describe('calculateDistance', () => {
  it('should calculate distance between two known coordinates', () => {
    // Distance between New York (40.7128, -74.0060) and Los Angeles (34.0522, -118.2437)
    // Expected distance is approximately 3935.75 km (actual Haversine calculation)
    const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
    expect(distance).toBeCloseTo(3935.75, 2);
  });

  it('should return 0 for identical coordinates', () => {
    const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
    expect(distance).toBe(0);
  });

  it('should calculate short distances correctly', () => {
    // Distance between two close points (approximately 1 km apart)
    // Using coordinates that are roughly 1 km apart
    const distance = calculateDistance(40.7128, -74.0060, 40.7218, -74.0060);
    expect(distance).toBeCloseTo(1, 0.5);
  });

  it('should handle negative coordinates', () => {
    const distance = calculateDistance(-40.7128, -74.0060, -34.0522, -118.2437);
    expect(distance).toBeGreaterThan(0);
  });

  it('should handle coordinates across the equator', () => {
    const distance = calculateDistance(10.0, 0.0, -10.0, 0.0);
    expect(distance).toBeGreaterThan(0);
  });
});

describe('formatDistance', () => {
  it('should format distances less than 1 km in meters', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.1)).toBe('100 m');
    expect(formatDistance(0.85)).toBe('850 m');
  });

  it('should format distances 1 km or more in kilometers', () => {
    expect(formatDistance(1)).toBe('1.0 km');
    expect(formatDistance(2.5)).toBe('2.5 km');
    expect(formatDistance(10.75)).toBe('10.8 km');
  });

  it('should handle zero distance', () => {
    expect(formatDistance(0)).toBe('0 m');
  });

  it('should handle very large distances', () => {
    expect(formatDistance(1000)).toBe('1000.0 km');
  });
});

describe('calculateOrderDistance', () => {
  it('should calculate distance between two orders with coordinates', () => {
    const order1 = { latitude: 40.7128, longitude: -74.0060 };
    const order2 = { latitude: 34.0522, longitude: -118.2437 };
    const distance = calculateOrderDistance(order1, order2);
    expect(distance).toBeCloseTo(3935.75, 2);
  });

  it('should return null when first order has missing coordinates', () => {
    const order1 = { latitude: undefined, longitude: -74.0060 };
    const order2 = { latitude: 34.0522, longitude: -118.2437 };
    const distance = calculateOrderDistance(order1, order2);
    expect(distance).toBeNull();
  });

  it('should return null when second order has missing coordinates', () => {
    const order1 = { latitude: 40.7128, longitude: -74.0060 };
    const order2 = { latitude: undefined, longitude: -118.2437 };
    const distance = calculateOrderDistance(order1, order2);
    expect(distance).toBeNull();
  });

  it('should return null when both orders have missing coordinates', () => {
    const order1 = { latitude: undefined, longitude: undefined };
    const order2 = { latitude: undefined, longitude: undefined };
    const distance = calculateOrderDistance(order1, order2);
    expect(distance).toBeNull();
  });

  it('should return null when coordinates are null', () => {
    const order1 = { latitude: null as any, longitude: -74.0060 };
    const order2 = { latitude: 34.0522, longitude: -118.2437 };
    const distance = calculateOrderDistance(order1, order2);
    expect(distance).toBeNull();
  });
});

describe('findNearestDriver', () => {
  it('should find the nearest driver to a zone center', () => {
    const zoneCenter = { lat: 40.7128, lng: -74.0060 };
    const drivers = [
      { id: 'driver1', location: { lat: 40.7228, lng: -74.0060 } }, // ~1 km away
      { id: 'driver2', location: { lat: 40.7528, lng: -74.0060 } }, // ~4.4 km away
      { id: 'driver3', location: { lat: 40.8028, lng: -74.0060 } }, // ~10 km away
    ];
    const nearest = findNearestDriver(zoneCenter, drivers);
    expect(nearest).toBe('driver1');
  });

  it('should return first driver when no drivers have locations', () => {
    const zoneCenter = { lat: 40.7128, lng: -74.0060 };
    const drivers = [
      { id: 'driver1' },
      { id: 'driver2' },
      { id: 'driver3' },
    ];
    const nearest = findNearestDriver(zoneCenter, drivers);
    expect(nearest).toBe('driver1');
  });

  it('should return empty string when drivers array is empty', () => {
    const zoneCenter = { lat: 40.7128, lng: -74.0060 };
    const drivers: Array<{ id: string; location?: { lat: number; lng: number } }> = [];
    const nearest = findNearestDriver(zoneCenter, drivers);
    expect(nearest).toBe('');
  });

  it('should handle mixed drivers (some with locations, some without)', () => {
    const zoneCenter = { lat: 40.7128, lng: -74.0060 };
    const drivers = [
      { id: 'driver1' }, // No location
      { id: 'driver2', location: { lat: 40.7528, lng: -74.0060 } }, // ~4.4 km away
      { id: 'driver3', location: { lat: 40.7228, lng: -74.0060 } }, // ~1 km away (nearest)
    ];
    const nearest = findNearestDriver(zoneCenter, drivers);
    expect(nearest).toBe('driver3');
  });

  it('should correctly identify nearest when first driver is not nearest', () => {
    const zoneCenter = { lat: 40.7128, lng: -74.0060 };
    const drivers = [
      { id: 'driver1', location: { lat: 40.8028, lng: -74.0060 } }, // ~10 km away
      { id: 'driver2', location: { lat: 40.7228, lng: -74.0060 } }, // ~1 km away (nearest)
      { id: 'driver3', location: { lat: 40.7528, lng: -74.0060 } }, // ~4.4 km away
    ];
    const nearest = findNearestDriver(zoneCenter, drivers);
    expect(nearest).toBe('driver2');
  });
});

