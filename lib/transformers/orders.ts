/**
 * Order transformers
 * Converts between backend API format and frontend format
 */

import { getFrontendDriverId } from "@/lib/data/drivers";
import { Order } from "@/lib/types";

/**
 * Backend API order format (from lib/services/api.ts)
 */
export interface ApiOrder {
  id: string;
  order_number: string;
  customer_name: string;
  address: string;
  phone?: string;
  notes?: string;
  amount?: number;
  items?: string;
  priority?: string;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  package_weight?: number;
  package_volume?: number;
  latitude?: number;
  longitude?: number;
  driver_id?: string; // Backend UUID
  route_rank?: number;
  created_at?: string;
  updated_at?: string;
  raw_data?: any;
}

/**
 * Transform backend order format to frontend format
 */
export function transformOrder(apiOrder: ApiOrder): Order {
  return {
    id: apiOrder.order_number || apiOrder.id,
    customerName: apiOrder.customer_name,
    address: apiOrder.address,
    phone: apiOrder.phone,
    notes: apiOrder.notes,
    amount: apiOrder.amount,
    items: apiOrder.items,
    priority: (apiOrder.priority as "low" | "normal" | "high") || "normal",
    rank: apiOrder.route_rank ?? undefined, // Use nullish coalescing - preserve 0, convert null to undefined
    driverId: getFrontendDriverId(apiOrder.driver_id) || undefined, // Convert backend UUID to frontend ID
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
 * Transform frontend order format to backend API format
 */
export function transformOrderToApi(order: Order): {
  order_number: string;
  customer_name: string;
  address: string;
  phone?: string;
  notes?: string;
  amount?: number;
  items?: string;
  priority?: string;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  package_weight?: number;
  package_volume?: number;
  latitude?: number;
  longitude?: number;
  driver_id?: string;
  route_rank?: number;
  rawData?: Record<string, any>;
} {
  // Dynamic import to avoid circular dependency
  const { getBackendDriverId } = require("@/lib/data/drivers");
  return {
    order_number: order.id,
    customer_name: order.customerName,
    address: order.address,
    phone: order.phone,
    notes: order.notes,
    amount: order.amount,
    items: order.items,
    priority: order.priority,
    package_length: order.packageLength,
    package_width: order.packageWidth,
    package_height: order.packageHeight,
    package_weight: order.packageWeight,
    package_volume: order.packageVolume,
    latitude: order.latitude,
    longitude: order.longitude,
    driver_id: order.driverId
      ? getBackendDriverId(order.driverId) || undefined
      : undefined, // Convert frontend ID to backend UUID
    route_rank: order.rank,
    rawData: order.rawData,
  };
}

