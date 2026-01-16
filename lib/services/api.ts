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
 * API Request Options
 * Extends RequestInit with timeout and signal support
 */
export interface ApiRequestOptions extends RequestInit {
  /**
   * Request timeout in milliseconds (default: 30000 = 30 seconds)
   */
  timeout?: number;
  /**
   * AbortSignal for request cancellation (optional)
   * If provided, timeout will not be applied (use signal for cancellation)
   */
  signal?: AbortSignal;
}

/**
 * Make API request with error handling, timeout, and cancellation support
 * Exported for use by domain repositories
 * 
 * @param endpoint - API endpoint (e.g., "/api/orders")
 * @param options - Request options including timeout and signal
 * @returns Promise resolving to the response data
 * @throws Error with status code and error details on failure
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeout = 30000, signal, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  // Create AbortController for timeout if no signal provided
  const controller = signal ? null : new AbortController();
  const abortSignal = signal || controller?.signal;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Set up timeout if no external signal provided
  if (controller) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: abortSignal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
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
    // Handle timeout/abort
    if (error instanceof Error && error.name === "AbortError") {
      if (controller?.signal.aborted && !signal) {
        throw new Error(
          `Request timeout: ${endpoint} exceeded ${timeout}ms`
        );
      }
      throw new Error("Request was cancelled");
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`
      );
    }

    throw error;
  } finally {
    // Clean up timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
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
