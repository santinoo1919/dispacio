/**
 * Orders Domain Zod Schemas
 * Runtime validation for API responses
 * Matches backend response format (snake_case)
 */

import { z } from "zod";

/**
 * Order entity schema (API format - snake_case)
 */
export const ApiOrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  customer_name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  amount: z.number().nullable(),
  items: z.string().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).nullable(),
  package_length: z.number().nullable(),
  package_width: z.number().nullable(),
  package_height: z.number().nullable(),
  package_weight: z.number().nullable(),
  package_volume: z.number().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  driver_id: z.string().uuid().nullable(),
  route_rank: z.number().int().nullable(),
  version: z.number().int().default(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  raw_data: z.any().nullable(),
});

/**
 * Response schema for GET /api/orders
 */
export const GetOrdersResponseSchema = z.object({
  orders: z.array(ApiOrderSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

/**
 * Response schema for POST /api/orders
 */
export const CreateOrdersResponseSchema = z.object({
  success: z.boolean(),
  created: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int(),
  orders: z.array(ApiOrderSchema),
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

/**
 * Response schema for PUT /api/orders/:id
 * Returns a single order
 */
export const UpdateOrderResponseSchema = ApiOrderSchema;

/**
 * Response schema for DELETE /api/orders/:id
 */
export const DeleteOrderResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().uuid(),
});

/**
 * Response schema for PUT /api/orders/bulk-assign-driver
 */
export const BulkAssignDriverResponseSchema = z.object({
  success: z.boolean(),
  updated: z.number().int(),
  orderIds: z.array(z.string().uuid()),
});

