/**
 * Zones Domain Types
 * Domain model for zones
 */

import type { Order } from "../orders/orders.types";

/**
 * Domain Zone format (frontend)
 */
export interface Zone {
  id: string; // Display name (e.g., "Zone 1")
  serverId?: string; // Backend UUID for API calls
  center: {
    lat: number;
    lng: number;
  };
  radius?: number | null;
  orders: Order[];
  orderCount: number;
  assignedDriverId?: string; // Driver assigned to all orders in this zone
  createdAt?: string;
  updatedAt?: string | null;
}

/**
 * Backend API zone format
 * Matches actual backend response - uses camelCase for center object and timestamps
 */
export interface ApiZone {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radius?: number | null;
  orders: any[]; // Nested orders array (will be transformed separately)
  orderCount: number;
  createdAt?: string;
  updatedAt?: string | null;
}

/**
 * Request format for creating zones
 */
export interface CreateZoneRequest {
  name: string;
  center: { lat: number; lng: number };
  radius?: number;
  orderIds: string[]; // Backend order UUIDs
}

/**
 * Request format for updating zones
 */
export interface UpdateZoneRequest {
  name?: string;
  center?: { lat: number; lng: number };
  radius?: number;
  orderIds?: string[];
}

/**
 * Response from fetching zones
 */
export interface GetZonesResponse {
  zones: ApiZone[];
}

/**
 * Response from creating zones
 */
export interface CreateZonesResponse {
  success: boolean;
  created: number;
  zones: ApiZone[];
}

/**
 * Response from assigning driver to zone
 */
export interface AssignDriverToZoneResponse {
  success: boolean;
  zoneId: string;
  driverId: string;
  updated: number;
  orderIds: string[];
}

