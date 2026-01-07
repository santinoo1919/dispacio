/**
 * Drivers API Endpoints
 * CRUD operations for drivers
 */

import { commonSchemas } from "../schemas/common.js";
import { driverSchemas } from "../schemas/drivers.js";

export default async function driversRoutes(fastify, options) {
  /**
   * GET /api/drivers
   * Get all drivers with optional filters
   * Query params: is_active, limit, offset
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: ["drivers"],
        summary: "Get all drivers",
        description:
          "Retrieve all drivers with optional filtering by active status, pagination support",
        querystring: driverSchemas.GetDriversQuery,
        response: {
          200: driverSchemas.GetDriversResponse,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { is_active, limit, offset } = request.query;

      try {
        let query = "SELECT * FROM drivers";
        const params = [];
        const conditions = [];

        if (is_active !== undefined) {
          params.push(is_active);
          conditions.push(`is_active = $${params.length}`);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        // Get total count for pagination
        const countQuery =
          "SELECT COUNT(*) as total FROM drivers" +
          (conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "");
        const countResult = await fastify.pg.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);

        query += ` ORDER BY created_at DESC LIMIT $${
          params.length + 1
        } OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await fastify.pg.query(query, params);

        // Transform to API format
        const drivers = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          initials: row.initials || null,
          color: row.color || null,
          location:
            row.location_lat && row.location_lng
              ? {
                  lat: parseFloat(row.location_lat),
                  lng: parseFloat(row.location_lng),
                }
              : null,
          is_active: row.is_active,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at ? row.updated_at.toISOString() : null,
        }));

        return {
          drivers,
          total,
          limit,
          offset,
        };
      } catch (error) {
        fastify.log.error("Get drivers error:", error);
        return reply.code(500).send({
          error: "Failed to fetch drivers",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/drivers/:id
   * Get a single driver by ID
   */
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["drivers"],
        summary: "Get driver by ID",
        description: "Retrieve a single driver by their UUID",
        params: commonSchemas.UuidParam,
        response: {
          200: driverSchemas.CreateDriverResponse,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await fastify.pg.query(
          "SELECT * FROM drivers WHERE id = $1",
          [id]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Driver not found" });
        }

        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          initials: row.initials || null,
          color: row.color || null,
          location:
            row.location_lat && row.location_lng
              ? {
                  lat: parseFloat(row.location_lat),
                  lng: parseFloat(row.location_lng),
                }
              : null,
          is_active: row.is_active,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at ? row.updated_at.toISOString() : null,
        };
      } catch (error) {
        fastify.log.error("Get driver error:", error);
        return reply.code(500).send({
          error: "Failed to fetch driver",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/drivers
   * Create a new driver
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: ["drivers"],
        summary: "Create a new driver",
        description: "Create a new driver with name, phone, and optional location",
        body: driverSchemas.CreateDriverBody,
        response: {
          201: driverSchemas.CreateDriverResponse,
          400: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { name, phone, email, initials, color, location, is_active } =
        request.body;

      try {
        // Generate initials if not provided
        const generatedInitials =
          initials ||
          name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        const result = await fastify.pg.query(
          `INSERT INTO drivers (
            name, phone, email, initials, color, 
            location_lat, location_lng, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            name,
            phone,
            email || null,
            generatedInitials,
            color || null,
            location?.lat || null,
            location?.lng || null,
            is_active !== undefined ? is_active : true,
          ]
        );

        const row = result.rows[0];
        const driver = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          initials: row.initials || null,
          color: row.color || null,
          location:
            row.location_lat && row.location_lng
              ? {
                  lat: parseFloat(row.location_lat),
                  lng: parseFloat(row.location_lng),
                }
              : null,
          is_active: row.is_active,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at ? row.updated_at.toISOString() : null,
        };

        return reply.code(201).send(driver);
      } catch (error) {
        fastify.log.error("Create driver error:", error);
        return reply.code(500).send({
          error: "Failed to create driver",
          message: error.message,
        });
      }
    }
  );

  /**
   * PUT /api/drivers/:id
   * Update a driver
   */
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["drivers"],
        summary: "Update a driver",
        description: "Update driver information",
        params: commonSchemas.UuidParam,
        body: driverSchemas.UpdateDriverBody,
        response: {
          200: driverSchemas.UpdateDriverResponse,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      try {
        // Build dynamic UPDATE query
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
          fields.push(`name = $${paramIndex++}`);
          values.push(updates.name);
        }
        if (updates.phone !== undefined) {
          fields.push(`phone = $${paramIndex++}`);
          values.push(updates.phone);
        }
        if (updates.email !== undefined) {
          fields.push(`email = $${paramIndex++}`);
          values.push(updates.email || null);
        }
        if (updates.initials !== undefined) {
          fields.push(`initials = $${paramIndex++}`);
          values.push(updates.initials || null);
        }
        if (updates.color !== undefined) {
          fields.push(`color = $${paramIndex++}`);
          values.push(updates.color || null);
        }
        if (updates.location !== undefined) {
          fields.push(
            `location_lat = $${paramIndex++}`,
            `location_lng = $${paramIndex++}`
          );
          values.push(
            updates.location?.lat || null,
            updates.location?.lng || null
          );
        }
        if (updates.is_active !== undefined) {
          fields.push(`is_active = $${paramIndex++}`);
          values.push(updates.is_active);
        }

        if (fields.length === 0) {
          return reply.code(400).send({
            error: "No fields to update",
          });
        }

        // Add updated_at
        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE drivers SET ${fields.join(
          ", "
        )} WHERE id = $${paramIndex} RETURNING *`;
        const result = await fastify.pg.query(query, values);

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Driver not found" });
        }

        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          initials: row.initials || null,
          color: row.color || null,
          location:
            row.location_lat && row.location_lng
              ? {
                  lat: parseFloat(row.location_lat),
                  lng: parseFloat(row.location_lng),
                }
              : null,
          is_active: row.is_active,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at ? row.updated_at.toISOString() : null,
        };
      } catch (error) {
        fastify.log.error("Update driver error:", error);
        return reply.code(500).send({
          error: "Failed to update driver",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/drivers/:id
   * Delete a driver (soft delete by setting is_active = false)
   * Or hard delete if no orders assigned
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["drivers"],
        summary: "Delete a driver",
        description:
          "Soft delete a driver (set is_active=false). Hard delete only if no orders assigned.",
        params: commonSchemas.UuidParam,
        response: {
          200: driverSchemas.DeleteDriverResponse,
          400: commonSchemas.Error,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const client = await fastify.pg.connect();
      try {
        await client.query("BEGIN");

        // Check if driver exists
        const driverResult = await client.query(
          "SELECT id FROM drivers WHERE id = $1",
          [id]
        );

        if (driverResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.code(404).send({ error: "Driver not found" });
        }

        // Check if driver has assigned orders
        const ordersResult = await client.query(
          "SELECT COUNT(*) as count FROM orders WHERE driver_id = $1",
          [id]
        );
        const orderCount = parseInt(ordersResult.rows[0].count, 10);

        if (orderCount > 0) {
          // Soft delete: set is_active = false
          await client.query(
            "UPDATE drivers SET is_active = false, updated_at = NOW() WHERE id = $1",
            [id]
          );
          await client.query("COMMIT");
          return { success: true, id, soft_deleted: true };
        } else {
          // Hard delete: no orders assigned
          await client.query("DELETE FROM drivers WHERE id = $1", [id]);
          await client.query("COMMIT");
          return { success: true, id, soft_deleted: false };
        }
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error("Delete driver error:", error);
        return reply.code(500).send({
          error: "Failed to delete driver",
          message: error.message,
        });
      } finally {
        client.release();
      }
    }
  );
}

