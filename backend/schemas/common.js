/**
 * Common schemas for error responses and shared types
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Error response schema
export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// UUID parameter schema
export const UuidParamSchema = z.object({
  id: z.string().uuid(),
});

// Health check response (flexible for different health endpoints)
export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().optional(),
  ready: z.boolean().optional(),
  checks: z.record(z.any()).optional(), // Flexible object for various checks
  system: z.record(z.any()).optional(), // System info
  error: z.string().optional(),
  // Legacy fields for backwards compatibility
  database: z.string().optional(),
});

// Helper to clean schema (remove $schema property that Fastify doesn't like)
const cleanSchema = (schema) => {
  const cleaned = { ...schema };
  delete cleaned.$schema;
  if (cleaned.definitions) {
    Object.keys(cleaned.definitions).forEach((key) => {
      if (cleaned.definitions[key].$schema) {
        delete cleaned.definitions[key].$schema;
      }
    });
  }
  return cleaned;
};

// Convert to JSON Schema for Fastify (OpenAPI 3.0 format)
const schemaOptions = { target: "openApi3" };
export const commonSchemas = {
  Error: cleanSchema(zodToJsonSchema(ErrorSchema, schemaOptions)),
  UuidParam: cleanSchema(zodToJsonSchema(UuidParamSchema, schemaOptions)),
  HealthResponse: cleanSchema(
    zodToJsonSchema(HealthResponseSchema, schemaOptions)
  ),
};
