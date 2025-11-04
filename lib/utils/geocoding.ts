/**
 * Geocoding utilities (FALLBACK ONLY)
 * Used only when CSV doesn't include coordinates
 * If CSV has latitude/longitude columns, those are used directly
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Generate simple mock coordinates (FALLBACK ONLY)
 * Only used if CSV doesn't have coordinates
 */
function getMockCoordinates(address: string): Coordinates {
  // Simple fallback: return Dubai center
  // In production, you'd call a real geocoding API here
  return {
    latitude: 25.2048, // Dubai center
    longitude: 55.2708,
  };
}

/**
 * Get coordinates for an order
 * Uses CSV coordinates if available (preferred), otherwise falls back to geocoding
 */
export function getOrderCoordinates(order: {
  address: string;
  latitude?: number;
  longitude?: number;
}): Coordinates {
  // Use CSV coordinates if available (SIMPLER & MORE ACCURATE)
  if (order.latitude !== undefined && order.longitude !== undefined) {
    return {
      latitude: order.latitude,
      longitude: order.longitude,
    };
  }

  // Fallback: use mock coordinates (only if CSV doesn't have coordinates)
  return getMockCoordinates(order.address);
}
