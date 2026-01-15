/**
 * Core data types for the dispatch app
 */

// Import and re-export Order from orders domain for backward compatibility
import type { Order } from "@/lib/domains/orders/orders.types";
export type { Order };

// Re-export Driver from drivers domain for backward compatibility
export type { Driver } from "@/lib/domains/drivers/drivers.types";

// Re-export Zone from zones domain for backward compatibility
export type { Zone } from "@/lib/domains/zones/zones.types";

export interface Dispatch {
  id: string;
  driverName: string;
  driverPhone: string;
  orders: Order[];
  createdAt: Date;
}

export interface CSVParseResult {
  success: boolean;
  orders: Order[];
  error?: string;
  headers: string[];
}

export interface Vehicle {
  id: string;
  driverId: string;
  vehicleType?: string;
  maxWeight: number;
  maxVolume: number;
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
}

export interface OptimizedRoute {
  success: boolean;
  driverId: string;
  totalDistance: number;
  totalDuration: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    rank: number;
    distanceFromPrev: number;
  }>;
}
