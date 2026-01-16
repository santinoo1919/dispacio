/**
 * Orders Domain Types
 * Domain model for orders (frontend format)
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
  rank?: number; // Order position in dispatch sequence (undefined if not optimized)
  driverId?: string; // Driver assigned to this order (frontend ID)
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

/**
 * Backend API order format (snake_case)
 * Matches actual backend response - nullable fields use null, not undefined
 */
export interface ApiOrder {
  id: string;
  order_number: string;
  customer_name: string;
  address: string;
  phone: string | null;
  notes: string | null;
  amount: number | null;
  items: string | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  package_length: number | null;
  package_width: number | null;
  package_height: number | null;
  package_weight: number | null;
  package_volume: number | null;
  latitude: number | null;
  longitude: number | null;
  driver_id: string | null; // Backend UUID
  route_rank: number | null;
  version: number; // Optimistic locking (defaults to 1)
  created_at: string;
  updated_at: string;
  raw_data: any | null;
}

/**
 * Request format for creating orders (API format)
 */
export interface CreateOrderRequest {
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
  version?: number; // For optimistic locking on updates
  rawData?: Record<string, any>;
}

/**
 * Response from creating orders
 */
export interface CreateOrdersResponse {
  success: boolean;
  created: number;
  skipped: number;
  failed: number;
  orders: ApiOrder[];
  skippedOrders?: { order: string; reason: string }[];
  errors?: { order: string; error: string }[];
}
