/**
 * Zone-related Zod schemas
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OrderSchema } from "./orders.js";

// Zone center coordinates
const ZoneCenterSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// Zone entity schema
export const ZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  center: ZoneCenterSchema,
  radius: z.number().nullable().optional(),
  orders: z.array(OrderSchema),
  orderCount: z.number(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Body schema for POST /api/zones (create zones from clustering)
export const CreateZoneInputSchema = z.object({
  name: z.string(),
  center: ZoneCenterSchema,
  radius: z.number().optional(),
  orderIds: z.array(z.string().uuid()),
});

export const CreateZonesBodySchema = z.object({
  zones: z.array(CreateZoneInputSchema).min(1),
});

// Body schema for PUT /api/zones/:id/assign-driver
export const AssignDriverBodySchema = z.object({
  driverId: z.string().uuid(),
});

// Response schemas
export const GetZonesResponseSchema = z.object({
  zones: z.array(ZoneSchema),
});

export const CreateZonesResponseSchema = z.object({
  success: z.boolean(),
  created: z.number(),
  zones: z.array(ZoneSchema),
});

export const AssignDriverResponseSchema = z.object({
  success: z.boolean(),
  zoneId: z.string().uuid(),
  driverId: z.string().uuid(),
  updated: z.number(),
  orderIds: z.array(z.string().uuid()),
});

// Helper to clean schema
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

// Convert to JSON Schema for Fastify
const schemaOptions = { target: "openApi3" };
export const zoneSchemas = {
  Zone: cleanSchema(zodToJsonSchema(ZoneSchema, schemaOptions)),
  CreateZonesBody: cleanSchema(
    zodToJsonSchema(CreateZonesBodySchema, schemaOptions)
  ),
  AssignDriverBody: cleanSchema(
    zodToJsonSchema(AssignDriverBodySchema, schemaOptions)
  ),
  GetZonesResponse: cleanSchema(
    zodToJsonSchema(GetZonesResponseSchema, schemaOptions)
  ),
  CreateZonesResponse: cleanSchema(
    zodToJsonSchema(CreateZonesResponseSchema, schemaOptions)
  ),
  AssignDriverResponse: cleanSchema(
    zodToJsonSchema(AssignDriverResponseSchema, schemaOptions)
  ),
};

