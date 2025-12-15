/**
 * Distance calculation utilities
 * Uses Haversine formula for calculating distances between geographic coordinates
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "2.5 km" or "850 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculate distance between two orders
 * @param order1 First order
 * @param order2 Second order
 * @returns Distance in kilometers, or null if coordinates are missing
 */
export function calculateOrderDistance(
  order1: { latitude?: number; longitude?: number },
  order2: { latitude?: number; longitude?: number }
): number | null {
  if (
    order1.latitude == null ||
    order1.longitude == null ||
    order2.latitude == null ||
    order2.longitude == null
  ) {
    return null;
  }

  return calculateDistance(
    order1.latitude,
    order1.longitude,
    order2.latitude,
    order2.longitude
  );
}
