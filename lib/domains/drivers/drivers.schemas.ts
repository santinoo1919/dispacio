/**
 * Drivers Domain Zod Schemas
 * Runtime validation for API responses
 * Matches backend response format (snake_case)
 */

import { z } from "zod";

/**
 * Driver location schema
 */
const DriverLocationSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
  })
  .nullable();

/**
 * Driver entity schema (API format - snake_case)
 */
export const ApiDriverSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  initials: z.string().nullable(),
  color: z.string().nullable(),
  location: DriverLocationSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

/**
 * Response schema for GET /api/drivers
 */
export const GetDriversResponseSchema = z.object({
  drivers: z.array(ApiDriverSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

/**
 * Response schema for POST /api/drivers
 * Returns a single driver
 */
export const CreateDriverResponseSchema = ApiDriverSchema;

/**
 * Response schema for PUT /api/drivers/:id
 * Returns a single driver
 */
export const UpdateDriverResponseSchema = ApiDriverSchema;

/**
 * Response schema for DELETE /api/drivers/:id
 */
export const DeleteDriverResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().uuid(),
});

