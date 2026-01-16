/**
 * API Error Handling
 * Type-safe error classes and error handling utilities
 */

import { AxiosError } from "axios";

/**
 * Type-safe API Error class
 * Extends Error with status code, response data, and request tracking
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: any;
  public readonly endpoint?: string;
  public requestId?: string; // Not readonly to allow setting after construction
  public retryAfter?: number; // For rate limit errors (429), not readonly to allow setting

  constructor(message: string, status: number, data?: any, endpoint?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Handle axios errors and convert to ApiError
 */
export function handleAxiosError(
  error: AxiosError,
  requestId?: string,
  apiBaseUrl?: string
): ApiError {
  const metadata = (error.config as any)?.metadata;
  const finalRequestId = requestId || metadata?.requestId;
  const duration = metadata ? Date.now() - metadata.startTime : undefined;

  // Handle axios errors
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data as any;

    // Handle rate limiting (429)
    if (status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      const rateLimitError = new ApiError(
        `Rate limit exceeded. ${
          retryAfter
            ? `Retry after ${retryAfter}s`
            : "Please try again later."
        }`,
        status,
        data,
        error.config?.url
      );
      rateLimitError.retryAfter = retryAfter
        ? parseInt(retryAfter, 10)
        : undefined;
      rateLimitError.requestId = finalRequestId;

      // Structured error logging
      if (__DEV__) {
        console.error("[API Rate Limit]", {
          requestId: finalRequestId,
          endpoint: error.config?.url,
          retryAfter,
          duration: duration ? `${duration}ms` : undefined,
        });
      }

      return rateLimitError;
    }

    const errorMessage = data?.error || data?.message || `HTTP ${status}`;
    const apiError = new ApiError(
      errorMessage,
      status,
      data,
      error.config?.url
    );
    apiError.requestId = finalRequestId;

    // Structured error logging
    if (__DEV__) {
      console.error("[API Error]", {
        requestId: finalRequestId,
        endpoint: error.config?.url,
        method: error.config?.method,
        status,
        message: errorMessage,
        duration: duration ? `${duration}ms` : undefined,
      });
    }

    return apiError;
  } else if (error.request) {
    // Request made but no response (network error, timeout, etc.)
    let networkError: ApiError;

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      networkError = new ApiError(
        `Request timeout: ${error.config?.url} exceeded ${error.config?.timeout}ms`,
        0, // 0 indicates network/timeout error
        undefined,
        error.config?.url
      );
    } else {
      networkError = new ApiError(
        `Cannot connect to backend at ${apiBaseUrl || "the server"}. Is the server running?`,
        0,
        undefined,
        error.config?.url
      );
    }

    networkError.requestId = finalRequestId;

    // Structured error logging
    if (__DEV__) {
      console.error("[API Network Error]", {
        requestId: finalRequestId,
        endpoint: error.config?.url,
        code: error.code,
        message: networkError.message,
        duration: duration ? `${duration}ms` : undefined,
      });
    }

    return networkError;
  } else {
    // Something else happened
    const unknownError = new ApiError(
      error.message || "Unknown API error",
      0,
      undefined,
      error.config?.url
    );
    unknownError.requestId = finalRequestId;

    if (__DEV__) {
      console.error("[API Unknown Error]", {
        requestId: finalRequestId,
        error: error.message,
      });
    }

    return unknownError;
  }
}

