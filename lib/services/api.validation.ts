/**
 * API Response Validation
 * Zod schemas for validating API responses at runtime
 * Prevents malformed data from corrupting the cache
 */

import { z } from "zod";

/**
 * Validate API response against Zod schema
 * Throws ApiError if validation fails
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Create a detailed validation error message
      const issues = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });

      const message = `Response validation failed${endpoint ? ` for ${endpoint}` : ""}:\n${issues.join("\n")}`;

      // Log in development for debugging
      if (__DEV__) {
        console.error("[API Validation Error]", {
          endpoint,
          issues: error.issues,
          receivedData: data,
        });
      }

      // Throw a validation error that can be caught by error handlers
      throw new Error(message);
    }
    throw error;
  }
}

/**
 * Safe validation - returns result instead of throwing
 * Useful for optional validation or logging
 */
export function safeValidateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

