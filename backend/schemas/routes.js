/**
 * Route optimization schemas
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Body schema for POST /api/routes/optimize
export const OptimizeRouteBodySchema = z.object({
  driverId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).optional(),
});

// Optimized order in route response
export const OptimizedOrderSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  rank: z.number().int(),
  distanceFromPrev: z.number(), // Distance from previous stop in km
});

// Response schema for route optimization
export const OptimizeRouteResponseSchema = z.object({
  success: z.boolean(),
  driverId: z.string().uuid(),
  totalDistance: z.number(),
  totalDuration: z.number(),
  orders: z.array(OptimizedOrderSchema),
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
export const routeSchemas = {
  OptimizeRouteBody: cleanSchema(
    zodToJsonSchema(OptimizeRouteBodySchema, schemaOptions)
  ),
  OptimizeRouteResponse: cleanSchema(
    zodToJsonSchema(OptimizeRouteResponseSchema, schemaOptions)
  ),
};
