/**
 * Zone transformers
 * Converts between backend API format and frontend format
 */

import { DRIVERS, getBackendDriverId } from "@/lib/data/drivers";
import { assignDriverToZone as apiAssignDriverToZone } from "@/lib/services/api";
import { Zone, Order } from "@/lib/types";
import { findNearestDriver } from "@/lib/utils/distance";

/**
 * Backend API zone format (from lib/services/api.ts)
 */
export interface ApiZone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius?: number | null;
  orders: Array<{ id: string; [key: string]: any }>;
  orderCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Transform backend zone format to frontend format
 * @param apiZone Backend zone data
 * @param orders Frontend orders array (to populate zone.orders)
 * @param autoAssignDriver If true, automatically assign driver by geographic proximity if not already assigned
 */
export function transformZone(
  apiZone: ApiZone,
  orders: Order[],
  autoAssignDriver: boolean = true
): Zone {
  // Get orders for this zone from our orders array
  const zoneOrders = orders.filter((o) =>
    apiZone.orders.some((zo) => zo.id === o.serverId)
  );

  // Determine assigned driver (from orders or geographic matching)
  const driverIds = new Set(
    zoneOrders.map((o) => o.driverId).filter(Boolean)
  );
  let assignedDriverId: string | undefined;
  
  if (driverIds.size === 1) {
    // All orders have same driver
    assignedDriverId = Array.from(driverIds)[0];
  } else if (autoAssignDriver) {
    // Use geographic matching for UI display only
    // Don't sync to backend - drivers must be created via Drivers API first
    const nearestDriverId = findNearestDriver(apiZone.center, DRIVERS);
    if (nearestDriverId) {
      assignedDriverId = nearestDriverId;
      // TODO: Once Drivers API exists, sync assignment to backend
      // apiAssignDriverToZone(apiZone.id, backendDriverId).catch(() => {});
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

