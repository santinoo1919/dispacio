/**
 * Zones Domain Zod Schemas
 * Runtime validation for API responses
 * Matches backend response format
 */

import { z } from "zod";
import { ApiOrderSchema } from "../orders/orders.schemas";

/**
 * Zone center coordinates
 */
const ZoneCenterSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * Zone entity schema (API format)
 * Note: Backend returns zones with nested orders and camelCase createdAt/updatedAt
 */
export const ApiZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  center: ZoneCenterSchema,
  radius: z.number().nullable().optional(),
  orders: z.array(ApiOrderSchema),
  orderCount: z.number().int(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
});

/**
 * Response schema for GET /api/zones
 */
export const GetZonesResponseSchema = z.object({
  zones: z.array(ApiZoneSchema),
});

/**
 * Response schema for POST /api/zones
 */
export const CreateZonesResponseSchema = z.object({
  success: z.boolean(),
  created: z.number().int(),
  zones: z.array(ApiZoneSchema),
});

/**
 * Response schema for PUT /api/zones/:id/assign-driver
 */
export const AssignDriverToZoneResponseSchema = z.object({
  success: z.boolean(),
  zoneId: z.string().uuid(),
  driverId: z.string().uuid(),
  updated: z.number().int(),
  orderIds: z.array(z.string().uuid()),
});

