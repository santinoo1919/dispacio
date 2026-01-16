/**
 * API Interceptors
 * Request and response interceptors for axios client
 */

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { ApiError, handleAxiosError } from "./api.errors";

/**
 * Generate a UUID for request tracking
 * React Native compatible (doesn't use Node.js crypto)
 */
function generateRequestId(): string {
  // Simple UUID v4 implementation for React Native
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Setup request interceptor
 * Adds request ID tracking, auth headers, and logging
 */
export function setupRequestInterceptor(
  client: AxiosInstance,
  apiBaseUrl: string
) {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Generate request ID for tracking
      const requestId = generateRequestId();
      config.headers["X-Request-ID"] = requestId;

      // Store metadata for response interceptor
      (config as any).metadata = {
        requestId,
        startTime: Date.now(),
      };

      // Add any auth tokens here if needed
      // const token = getAuthToken();
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }

      // Structured logging in development
      if (__DEV__) {
        console.log(
          `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
          {
            requestId,
            headers: config.headers,
          }
        );
      }

      return config;
    },
    (error) => {
      // Handle request error
      if (__DEV__) {
        console.error("[API Request Error]", error);
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Setup response interceptor
 * Handles successful responses and converts errors to ApiError
 */
export function setupResponseInterceptor(
  client: AxiosInstance,
  apiBaseUrl: string
) {
  client.interceptors.response.use(
    (response) => {
      // Log successful responses in development
      const metadata = (response.config as any).metadata;
      if (__DEV__ && metadata) {
        const duration = Date.now() - metadata.startTime;
        console.log(
          `[API Response] ${response.config.method?.toUpperCase()} ${
            response.config.url
          }`,
          {
            requestId: metadata.requestId,
            status: response.status,
            duration: `${duration}ms`,
          }
        );
      }

      // Return data directly (axios wraps it in response.data)
      return response.data;
    },
    (error: AxiosError) => {
      // Convert axios errors to ApiError
      const apiError = handleAxiosError(error, undefined, apiBaseUrl);
      return Promise.reject(apiError);
    }
  );
}

