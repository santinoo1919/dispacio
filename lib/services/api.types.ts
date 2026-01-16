/**
 * Shared API Types
 * Common types used across the API client
 */

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
}

/**
 * Version conflict error (409)
 */
export interface ConflictError extends ApiErrorResponse {
  currentVersion: number;
}

