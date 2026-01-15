/**
 * Zones Transformer
 * Converts between backend API format and domain format
 */

import type { ApiZone, Zone, CreateZoneRequest } from "./zones.types";
import type { Order } from "../orders/orders.types";
import { toDomain as orderToDomain } from "../orders/orders.transformer";

/**
 * Transform backend API zone format to domain format
 * @param apiZone Backend zone data with orders already included
 * @param orders Optional separate orders array (for backwards compatibility)
 * @param drivers Optional drivers array for driver lookup
 */
export function toDomain(
  apiZone: ApiZone,
  orders: Order[] = [],
  drivers?: Array<{ id: string; color?: string | null }>
): Zone {
  // Backend returns orders already grouped with the zone in the response
  // Use orders from apiZone.orders if available, otherwise fall back to filtering
  let zoneOrders: Order[] = [];
  
  if (apiZone.orders && Array.isArray(apiZone.orders) && apiZone.orders.length > 0) {
    // Transform API orders to domain orders
    zoneOrders = apiZone.orders.map((apiOrder: any) => orderToDomain(apiOrder));
  } else if (orders.length > 0) {
    // Fallback: Filter orders by zone_id if provided separately
    // This shouldn't happen in normal flow since backend includes orders
    zoneOrders = orders.filter(
      (order) => (order as any).zoneId === apiZone.id || (order as any).zone_id === apiZone.id
    );
  }

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

