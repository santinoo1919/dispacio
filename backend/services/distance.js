/**
 * Distance calculation utilities using Haversine formula
 * Used for building distance matrices for OR-Tools VRP solver
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 Latitude of first point
 * @param {number} lng1 Longitude of first point
 * @param {number} lat2 Latitude of second point
 * @param {number} lng2 Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
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
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Build distance matrix for OR-Tools VRP solver
 * OR-Tools expects distances in meters (integers)
 * @param {Array} locations Array of {lat, lng} objects
 * @returns {Array<Array<number>>} 2D array where matrix[i][j] = distance from i to j in meters
 */
export function buildDistanceMatrix(locations) {
  const n = locations.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0; // Distance to self is 0
      } else {
        // Calculate distance in km, convert to meters, round to integer
        const distanceKm = calculateDistance(
          locations[i].lat,
          locations[i].lng,
          locations[j].lat,
          locations[j].lng
        );
        matrix[i][j] = Math.round(distanceKm * 1000); // Convert km to meters
      }
    }
  }

  return matrix;
}
