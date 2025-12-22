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

/**
 * Find the nearest driver to a zone center based on geographic proximity
 * @param zoneCenter Zone center coordinates
 * @param drivers Array of drivers with location data
 * @returns Driver ID of the nearest driver, or first driver if no locations available
 */
export function findNearestDriver(
  zoneCenter: { lat: number; lng: number },
  drivers: Array<{ id: string; location?: { lat: number; lng: number } }>
): string {
  // Filter drivers with location data
  const driversWithLocation = drivers.filter(
    (driver) => driver.location != null
  );

  if (driversWithLocation.length === 0) {
    // Fallback: return first driver if no locations available
    return drivers[0]?.id || "";
  }

  let nearestDriver = driversWithLocation[0];
  let minDistance = calculateDistance(
    zoneCenter.lat,
    zoneCenter.lng,
    nearestDriver.location!.lat,
    nearestDriver.location!.lng
  );

  for (const driver of driversWithLocation) {
    if (!driver.location) continue;

    const distance = calculateDistance(
      zoneCenter.lat,
      zoneCenter.lng,
      driver.location.lat,
      driver.location.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestDriver = driver;
    }
  }

  return nearestDriver.id;
}
