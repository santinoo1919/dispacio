/**
 * Core data types for the dispatch app
 */

export interface Order {
  id: string;
  customerName: string;
  address: string;
  phone?: string;
  notes?: string;
  amount?: number;
  items?: string;
  priority?: "low" | "normal" | "high";
  rank: number; // Order position in dispatch sequence
  driverId?: string; // Driver assigned to this order
  latitude?: number; // Optional: coordinate from CSV
  longitude?: number; // Optional: coordinate from CSV
  // Package dimensions (for VROOM capacity constraints)
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  packageWeight?: number;
  packageVolume?: number;
  // Backend sync
  serverId?: string; // UUID from backend
  rawData: Record<string, any>; // Store all original CSV data for flexibility
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  initials: string;
}

export interface Zone {
  id: string;
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
