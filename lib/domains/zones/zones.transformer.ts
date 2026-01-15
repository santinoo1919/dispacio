/**
 * Zones Transformer
 * Converts between backend API format and domain format
 */

import type { ApiZone, Zone, CreateZoneRequest } from "./zones.types";
import type { Order } from "../orders/orders.types";

/**
 * Transform backend API zone format to domain format
 * @param apiZone Backend zone data
 * @param orders Orders to include in the zone
 * @param drivers Optional drivers array for driver lookup
 */
export function toDomain(
  apiZone: ApiZone,
  orders: Order[] = [],
  drivers?: Array<{ id: string; color?: string | null }>
): Zone {
  // Filter orders that belong to this zone
  // Backend returns orders in the zone response, but we need to match by zone_id
  const zoneOrders = orders.filter(
    (order) => (order as any).zoneId === apiZone.id
  );

  return {
    id: apiZone.name, // Use name as display ID
    serverId: apiZone.id, // Backend UUID
    center: {
      lat: apiZone.center_lat,
      lng: apiZone.center_lng,
    },
    radius: apiZone.radius,
    orders: zoneOrders,
    orderCount: zoneOrders.length,
    assignedDriverId: apiZone.driver_id || undefined,
    createdAt: apiZone.created_at,
    updatedAt: apiZone.updated_at,
  };
}

/**
 * Transform domain zone format to API request format
 */
export function toApi(zone: CreateZoneRequest): {
  name: string;
  center_lat: number;
  center_lng: number;
  radius?: number;
  order_ids: string[];
} {
  return {
    name: zone.name,
    center_lat: zone.center.lat,
    center_lng: zone.center.lng,
    radius: zone.radius,
    order_ids: zone.orderIds,
  };
}

/**
 * Transform multiple API zones to domain zones
 */
export function toDomainMany(
  apiZones: ApiZone[],
  orders: Order[] = [],
  drivers?: Array<{ id: string; color?: string | null }>
): Zone[] {
  return apiZones.map((apiZone) => toDomain(apiZone, orders, drivers));
}

