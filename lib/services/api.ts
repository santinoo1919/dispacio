/**
 * API Client Service
 * HTTP client for calling Fastify backend endpoints
 * Uses axios for robust error handling, interceptors, and request cancellation
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

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
 * Create axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds default timeout
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - add auth headers, logging, etc.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any auth tokens here if needed
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    // Log request in development
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return data directly (axios wraps it in response.data)
    return response.data;
  },
  (error: AxiosError) => {
    // Handle axios errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      const fullError = new Error(errorMessage);
      (fullError as any).status = status;
      (fullError as any).data = data;
      (fullError as any).endpoint = error.config?.url;
      
      return Promise.reject(fullError);
    } else if (error.request) {
      // Request made but no response (network error, timeout, etc.)
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return Promise.reject(
          new Error(`Request timeout: ${error.config?.url} exceeded ${error.config?.timeout}ms`)
        );
      }
      
      return Promise.reject(
        new Error(`Cannot connect to backend at ${API_BASE_URL}. Is the server running?`)
      );
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

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
 * Extends AxiosRequestConfig for type-safe request options
 */
export interface ApiRequestOptions extends Omit<AxiosRequestConfig, "url" | "baseURL"> {
  /**
   * Request timeout in milliseconds (default: 30000 = 30 seconds)
   * Can be overridden per request
   */
  timeout?: number;
  /**
   * AbortSignal for request cancellation (optional)
   * Axios supports this natively via signal property
   */
  signal?: AbortSignal;
}

/**
 * Make API request with error handling, timeout, and cancellation support
 * Uses axios for robust HTTP client functionality
 * 
 * @param endpoint - API endpoint (e.g., "/api/orders")
 * @param options - Request options including method, body, headers, timeout, signal
 * @returns Promise resolving to the response data
 * @throws Error with status code and error details on failure
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", data, headers, timeout, signal, ...restOptions } = options;

  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      method,
      data, // Axios uses 'data' instead of 'body'
      headers,
      timeout,
      signal,
      ...restOptions,
    });

    // Response interceptor already extracts response.data
    return response as T;
  } catch (error) {
    // Error is already handled by response interceptor
    // Re-throw to maintain error structure
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
    data: { driverId, orderIds }, // Axios uses 'data' instead of 'body', and auto-serializes JSON
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
