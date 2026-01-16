/**
 * API Client Service
 * HTTP client for calling Fastify backend endpoints
 * Uses axios for robust error handling, interceptors, and request cancellation
 *
 * Production features:
 * - Request ID tracking for debugging
 * - Structured error logging
 * - Automatic retry for transient errors
 * - Rate limit handling (429)
 * - Type-safe error classes
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry, {
  exponentialDelay,
  isNetworkOrIdempotentRequestError,
} from "axios-retry";
import {
  setupRequestInterceptor,
  setupResponseInterceptor,
} from "./api.interceptors";

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
 * Configure automatic retry for transient errors
 * Retries network errors and 5xx server errors
 */
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: exponentialDelay, // Exponential backoff: 100ms, 200ms, 400ms
  retryCondition: (error) => {
    // Retry on network errors or server errors (5xx)
    return (
      isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
  onRetry: (retryCount, error, requestConfig) => {
    if (__DEV__) {
      console.warn(
        `[API Retry] Attempt ${retryCount} for ${requestConfig.method?.toUpperCase()} ${
          requestConfig.url
        }`,
        error.message
      );
    }
  },
});

// Setup interceptors
setupRequestInterceptor(apiClient, API_BASE_URL);
setupResponseInterceptor(apiClient, API_BASE_URL);

// Re-export error classes and utilities
export { isConflictError } from "@/lib/domains/orders/orders.errors";
export { ApiError, isApiError } from "./api.errors";
export type { ConflictError } from "./api.types";

/**
 * API Request Options
 * Extends AxiosRequestConfig for type-safe request options
 */
export interface ApiRequestOptions
  extends Omit<AxiosRequestConfig, "url" | "baseURL"> {
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
 * Features:
 * - Automatic retry for transient errors (network, 5xx)
 * - Request ID tracking for debugging
 * - Structured error logging
 * - Rate limit handling (429)
 * - Type-safe error classes
 *
 * @param endpoint - API endpoint (e.g., "/api/orders")
 * @param options - Request options including method, data, headers, timeout, signal
 * @returns Promise resolving to the response data
 * @throws ApiError with status code and error details on failure
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    data,
    headers,
    timeout,
    signal,
    ...restOptions
  } = options;

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
    // Error is already handled by response interceptor and converted to ApiError
    // Re-throw to maintain error structure
    throw error;
  }
}

/**
 * Optimize route for a driver using VROOM
 * @param driverId Driver ID
 * @param orderIds Optional array of specific order IDs to optimize
 */
export async function optimizeRoute(driverId: string, orderIds?: string[]) {
  // Import type dynamically to avoid circular dependencies
  type OptimizeRouteResponse =
    import("@/lib/domains/routes/routes.types").OptimizeRouteResponse;
  return apiRequest<OptimizeRouteResponse>("/api/routes/optimize", {
    method: "POST",
    data: { driverId, orderIds },
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
