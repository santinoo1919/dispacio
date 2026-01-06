/**
 * Driver-related Zod schemas
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Driver entity schema
export const DriverSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  initials: z.string().nullable(),
  color: z.string().nullable(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

// Query parameters for GET /api/drivers
export const GetDriversQuerySchema = z.object({
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// Driver input for creation
export const CreateDriverBodySchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional(),
  initials: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  is_active: z.boolean().optional().default(true),
});

// Driver input for update
export const UpdateDriverBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  initials: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  is_active: z.boolean().optional(),
});

// Response schemas
export const GetDriversResponseSchema = z.object({
  drivers: z.array(DriverSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const CreateDriverResponseSchema = DriverSchema;

export const UpdateDriverResponseSchema = DriverSchema;

export const DeleteDriverResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().uuid(),
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
export const driverSchemas = {
  Driver: cleanSchema(zodToJsonSchema(DriverSchema, schemaOptions)),
  GetDriversQuery: cleanSchema(
    zodToJsonSchema(GetDriversQuerySchema, schemaOptions)
  ),
  CreateDriverBody: cleanSchema(
    zodToJsonSchema(CreateDriverBodySchema, schemaOptions)
  ),
  UpdateDriverBody: cleanSchema(
    zodToJsonSchema(UpdateDriverBodySchema, schemaOptions)
  ),
  GetDriversResponse: cleanSchema(
    zodToJsonSchema(GetDriversResponseSchema, schemaOptions)
  ),
  CreateDriverResponse: cleanSchema(
    zodToJsonSchema(CreateDriverResponseSchema, schemaOptions)
  ),
  UpdateDriverResponse: cleanSchema(
    zodToJsonSchema(UpdateDriverResponseSchema, schemaOptions)
  ),
  DeleteDriverResponse: cleanSchema(
    zodToJsonSchema(DeleteDriverResponseSchema, schemaOptions)
  ),
};

