/**
 * Core data types for the dispatch app
 */

// Re-export Order from orders domain for backward compatibility
export type { Order } from "@/lib/domains/orders/orders.types";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  initials: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Zone {
  id: string; // Display name (e.g., "Zone 1")
  serverId?: string; // Backend UUID for API calls
  center: {
    lat: number;
    lng: number;
  };
  orders: Order[];
  orderCount: number;
  assignedDriverId?: string; // Driver assigned to all orders in this zone
}

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
