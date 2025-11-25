/**
 * Map Availability Detection
 * Checks if native map modules are available (for development builds)
 * Returns false in Expo Go where native modules aren't available
 */

let isMapAvailableCache: boolean | null = null;

/**
 * Check if native maps are available
 * Caches the result to avoid repeated checks
 */
export function isNativeMapAvailable(): boolean {
  // Return cached result if available
  if (isMapAvailableCache !== null) {
    return isMapAvailableCache;
  }

  try {
    // Try to require expo-maps
    // This will throw if the module isn't available (Expo Go)
    require("expo-maps");
    isMapAvailableCache = true;
    return true;
  } catch (error) {
    // Module not available - we're in Expo Go or module not installed
    isMapAvailableCache = false;
    return false;
  }
}

/**
 * Reset the cache (useful for testing or if modules are loaded dynamically)
 */
export function resetMapAvailabilityCache(): void {
  isMapAvailableCache = null;
}
