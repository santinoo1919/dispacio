/**
 * Order-related Zod schemas
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Order entity schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  customer_name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  amount: z.number().nullable(),
  items: z.string().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  package_length: z.number().nullable(),
  package_width: z.number().nullable(),
  package_height: z.number().nullable(),
  package_weight: z.number().nullable(),
  package_volume: z.number().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  driver_id: z.string().uuid().nullable(),
  route_rank: z.number().int().nullable(),
  version: z.number().int().default(1), // Optimistic locking
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  raw_data: z.any().nullable(),
});

// Query parameters for GET /api/orders
export const GetOrdersQuerySchema = z.object({
  driver_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// Order input for bulk creation
export const OrderInputSchema = z.object({
  order_number: z.string(),
  customer_name: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  amount: z.coerce.number().optional(),
  items: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  package_length: z.coerce.number().optional(),
  package_width: z.coerce.number().optional(),
  package_height: z.coerce.number().optional(),
  package_weight: z.coerce.number().optional(),
  package_volume: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  driver_id: z.string().uuid().optional(),
  route_rank: z.number().int().optional(),
  rawData: z.any().optional(),
});

// Body schema for POST /api/orders
export const CreateOrdersBodySchema = z.object({
  orders: z.array(OrderInputSchema).min(1),
});

// Body schema for PUT /api/orders/:id
export const UpdateOrderBodySchema = z.object({
  customer_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  amount: z.coerce.number().optional(),
  items: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  package_length: z.coerce.number().optional(),
  package_width: z.coerce.number().optional(),
  package_height: z.coerce.number().optional(),
  package_weight: z.coerce.number().optional(),
  package_volume: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  driver_id: z.string().uuid().optional(),
  route_rank: z.number().int().optional(),
  version: z.number().int().optional(), // Optimistic locking: pass current version to detect conflicts
});

// Response schemas
export const GetOrdersResponseSchema = z.object({
  orders: z.array(OrderSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const CreateOrdersResponseSchema = z.object({
  success: z.boolean(),
  created: z.number(),
  skipped: z.number(),
  failed: z.number(),
  orders: z.array(OrderSchema),
  skippedOrders: z
    .array(
      z.object({
        order: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  errors: z
    .array(
      z.object({
        order: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

export const DeleteOrderResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().uuid(),
});

// Body schema for PUT /api/orders/bulk-assign-driver
export const BulkAssignDriverBodySchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
  driverId: z.string().uuid(),
});

export const BulkAssignDriverResponseSchema = z.object({
  success: z.boolean(),
  updated: z.number(),
  orderIds: z.array(z.string().uuid()),
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
export const orderSchemas = {
  Order: cleanSchema(zodToJsonSchema(OrderSchema, schemaOptions)),
  GetOrdersQuery: cleanSchema(
    zodToJsonSchema(GetOrdersQuerySchema, schemaOptions)
  ),
  CreateOrdersBody: cleanSchema(
    zodToJsonSchema(CreateOrdersBodySchema, schemaOptions)
  ),
  UpdateOrderBody: cleanSchema(
    zodToJsonSchema(UpdateOrderBodySchema, schemaOptions)
  ),
  GetOrdersResponse: cleanSchema(
    zodToJsonSchema(GetOrdersResponseSchema, schemaOptions)
  ),
  CreateOrdersResponse: cleanSchema(
    zodToJsonSchema(CreateOrdersResponseSchema, schemaOptions)
  ),
  DeleteOrderResponse: cleanSchema(
    zodToJsonSchema(DeleteOrderResponseSchema, schemaOptions)
  ),
  BulkAssignDriverBody: cleanSchema(
    zodToJsonSchema(BulkAssignDriverBodySchema, schemaOptions)
  ),
  BulkAssignDriverResponse: cleanSchema(
    zodToJsonSchema(BulkAssignDriverResponseSchema, schemaOptions)
  ),
};
