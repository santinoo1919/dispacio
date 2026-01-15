/**
 * API Client Service
 * HTTP client for calling Fastify backend endpoints
 */

// API base URL Configuration
// 
// Set via environment variable EXPO_PUBLIC_API_URL:
// - Local dev (simulator):  http://localhost:3000
// - Local dev (device):     http://<your-computer-ip>:3000
// - Production:             https://dispacio-production.up.railway.app
//
// Create .env.local for local overrides (gitignored)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Response from route optimization endpoint
 */
export interface OptimizeRouteResponse {
  success: boolean;
  driverId: string;
  totalDistance: number;
  totalDuration: number;
  orders: {
    orderId: string;
    orderNumber: string;
    rank: number;
    distanceFromPrev: number;
  }[];
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface ConflictError extends ApiError {
  currentVersion: number;
}

/**
 * Check if error is a version conflict (409)
 */
export function isConflictError(error: unknown): error is Error & { status: 409; data: ConflictError } {
  return (
    error instanceof Error &&
    (error as any).status === 409 &&
    (error as any).data?.error === "Conflict"
  );
}

/**
 * Make API request with error handling
 * Exported for use by domain repositories
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      // If response is not JSON, get text
      const text = await response.text();
      throw new Error(
        `API returned non-JSON: ${text} (Status: ${response.status})`
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.message || `HTTP ${response.status}`;
      const fullError = new Error(errorMessage);
      (fullError as any).status = response.status;
      (fullError as any).data = data;
      (fullError as any).endpoint = endpoint;
      throw fullError;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`
      );
    }
    throw error;
  }
}

/**
 * Order-related functions have been moved to OrdersService
 * @deprecated Use OrdersService from @/lib/domains/orders/orders.service instead
 * - fetchOrders → OrdersService.getOrders()
 * - fetchOrder → OrdersService.getOrder()
 * - createOrders → OrdersService.createOrders()
 * - updateOrder → OrdersService.updateOrder()
 * - deleteOrder → OrdersService.deleteOrder()
 * - bulkAssignDriver → OrdersService.assignDriverToOrders()
 */

/**
 * Optimize route for a driver using VROOM
 * @param driverId Driver ID
 * @param orderIds Optional array of specific order IDs to optimize
 */
export async function optimizeRoute(
  driverId: string,
  orderIds?: string[]
): Promise<OptimizeRouteResponse> {
  return apiRequest("/api/routes/optimize", {
    method: "POST",
    body: JSON.stringify({ driverId, orderIds }),
  });
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{
  status: string;
  database: string;
  timestamp?: string;
}> {
  return apiRequest("/health");
}

/**
 * Zone-related functions have been moved to ZonesService
 * @deprecated Use ZonesService from @/lib/domains/zones/zones.service instead
 * - fetchZones → ZonesService.getZones()
 * - createZones → ZonesService.createZones()
 * - assignDriverToZone → ZonesService.assignDriverToZone()
 */

/**
 * Driver-related functions have been moved to DriversService
 * @deprecated Use DriversService from @/lib/domains/drivers/drivers.service instead
 * - fetchDrivers → DriversService.getDrivers()
 * - fetchDriver → DriversService.getDriver()
 * - createDriver → DriversService.createDriver()
 * - updateDriver → DriversService.updateDriver()
 * - deleteDriver → DriversService.deleteDriver()
 */
