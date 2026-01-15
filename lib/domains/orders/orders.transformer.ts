/**
 * Orders Transformer
 * Converts between backend API format and domain format
 */

import type { ApiOrder, CreateOrderRequest, Order } from "./orders.types";

/**
 * Transform backend API order format to domain format
 */
export function toDomain(apiOrder: ApiOrder): Order {
  return {
    id: apiOrder.order_number || apiOrder.id,
    customerName: apiOrder.customer_name,
    address: apiOrder.address,
    phone: apiOrder.phone,
    notes: apiOrder.notes,
    amount: apiOrder.amount,
    items: apiOrder.items,
    priority: (apiOrder.priority as "low" | "normal" | "high") || "normal",
    rank: apiOrder.route_rank ?? undefined, // Preserve 0, convert null to undefined
    driverId: apiOrder.driver_id || undefined, // Driver ID is now backend UUID directly
    latitude: apiOrder.latitude,
    longitude: apiOrder.longitude,
    packageLength: apiOrder.package_length,
    packageWidth: apiOrder.package_width,
    packageHeight: apiOrder.package_height,
    packageWeight: apiOrder.package_weight,
    packageVolume: apiOrder.package_volume,
    serverId: apiOrder.id,
    rawData: apiOrder.raw_data || {},
  };
}

/**
 * Transform domain order format to API request format
 * @param order Domain order
 * @param getBackendDriverId Function to convert driver ID (now pass-through since IDs are backend UUIDs)
 */
export function toApi(
  order: Order,
  getBackendDriverId: (id: string) => string | null = (id) => id
): CreateOrderRequest {
  return {
    order_number: order.id,
    customer_name: order.customerName,
    address: order.address,
    phone: order.phone,
    notes: order.notes,
    amount: order.amount,
    items: order.items,
    priority: order.priority || "normal",
    package_length: order.packageLength,
    package_width: order.packageWidth,
    package_height: order.packageHeight,
    package_weight: order.packageWeight,
    package_volume: order.packageVolume,
    latitude: order.latitude,
    longitude: order.longitude,
    driver_id: order.driverId
      ? getBackendDriverId(order.driverId) || undefined
      : undefined,
    // Only include route_rank if explicitly set and > 0 (not for new CSV orders)
    ...(order.rank !== undefined && order.rank !== null && order.rank > 0
      ? { route_rank: order.rank }
      : {}),
    // Only include rawData if it exists and has content
    ...(order.rawData && Object.keys(order.rawData).length > 0
      ? { rawData: order.rawData }
      : {}),
  };
}

/**
 * Transform multiple API orders to domain orders
 */
export function toDomainMany(apiOrders: ApiOrder[]): Order[] {
  return apiOrders.map(toDomain);
}
