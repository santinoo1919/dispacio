/**
 * Zone transformers
 * Converts between backend API format and frontend format
 */

import { Order, Zone } from "@/lib/types";
import { findNearestDriver } from "@/lib/utils/distance";

/**
 * Backend API zone format (from lib/services/api.ts)
 */
export interface ApiZone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius?: number | null;
  orders: { id: string; [key: string]: any }[];
  orderCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Transform backend zone format to frontend format
 * @param apiZone Backend zone data
 * @param orders Frontend orders array (to populate zone.orders)
 * @param autoAssignDriver If true, automatically assign driver by geographic proximity if not already assigned
 * @param drivers Optional array of drivers from API (if not provided, uses hardcoded fallback)
 */
export function transformZone(
  apiZone: ApiZone,
  orders: Order[],
  autoAssignDriver: boolean = true,
  drivers?: { id: string; location?: { lat: number; lng: number } | null }[]
): Zone {
  // Get orders for this zone from our orders array
  const zoneOrders = orders.filter((o) =>
    apiZone.orders.some((zo) => zo.id === o.serverId)
  );

  // Determine assigned driver (from orders or geographic matching)
  const driverIds = new Set(zoneOrders.map((o) => o.driverId).filter(Boolean));
  let assignedDriverId: string | undefined;

  if (driverIds.size === 1) {
    // All orders have same driver
    assignedDriverId = Array.from(driverIds)[0];
  } else if (autoAssignDriver && drivers) {
    // Use geographic matching for UI display only
    // Only use drivers if provided (no hardcoded fallback)
    const driversToUse = drivers
      .filter((d) => d.location != null)
      .map((d) => ({ id: d.id, location: d.location! }));
    if (driversToUse.length > 0) {
      const nearestDriverId = findNearestDriver(apiZone.center, driversToUse);
      if (nearestDriverId) {
        assignedDriverId = nearestDriverId;
        // TODO: Sync assignment to backend using Drivers API
        // apiAssignDriverToZone(apiZone.id, backendDriverId).catch(() => {});
      }
    }
  }

  return {
    id: apiZone.name || apiZone.id, // Use name (e.g., "Zone 1") as id for display
    serverId: apiZone.id, // Store UUID for API calls
    center: apiZone.center,
    orders: zoneOrders,
    orderCount: zoneOrders.length,
    assignedDriverId,
  };
}
