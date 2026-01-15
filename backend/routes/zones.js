/**
 * Zones API Endpoints
 * CRUD operations for zones (stable geographic groupings)
 */

import { commonSchemas } from "../schemas/common.js";
import { zoneSchemas } from "../schemas/zones.js";

export default async function zonesRoutes(fastify, options) {
  /**
   * GET /api/zones
   * Get all zones with their orders
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: ["zones"],
        summary: "Get all zones",
        description: "Retrieve all zones with their assigned orders",
        response: {
          200: zoneSchemas.GetZonesResponse,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      try {
        // Get all zones with their orders in a single query (JOIN to avoid N+1)
        const result = await fastify.pg.query(
          `SELECT 
            z.id AS zone_id,
            z.name AS zone_name,
            z.center_lat,
            z.center_lng,
            z.radius,
            z.created_at AS zone_created_at,
            z.updated_at AS zone_updated_at,
            o.id AS order_id,
            o.order_number,
            o.customer_name,
            o.address,
            o.phone,
            o.notes,
            o.amount,
            o.items,
            o.priority,
            o.package_length,
            o.package_width,
            o.package_height,
            o.package_weight,
            o.package_volume,
            o.latitude,
            o.longitude,
            o.driver_id,
            o.route_rank,
            o.created_at AS order_created_at,
            o.updated_at AS order_updated_at,
            o.raw_data
          FROM zones z
          LEFT JOIN orders o ON o.zone_id = z.id
          ORDER BY z.created_at ASC, o.route_rank NULLS LAST, o.created_at ASC`
        );

        // Group orders by zone
        const zonesMap = new Map();
        
        for (const row of result.rows) {
          const zoneId = row.zone_id;
          
          if (!zonesMap.has(zoneId)) {
            zonesMap.set(zoneId, {
              id: zoneId,
              name: row.zone_name,
              center: {
                lat: parseFloat(row.center_lat),
                lng: parseFloat(row.center_lng),
              },
              radius: row.radius ? parseFloat(row.radius) : null,
              orders: [],
              orderCount: 0,
              createdAt: row.zone_created_at,
              updatedAt: row.zone_updated_at,
            });
          }

          // Add order if it exists (LEFT JOIN may return null order_id)
          if (row.order_id) {
            const zone = zonesMap.get(zoneId);
            zone.orders.push({
              id: row.order_id,
              order_number: row.order_number,
              customer_name: row.customer_name,
              address: row.address,
              phone: row.phone,
              notes: row.notes,
              amount: row.amount,
              items: row.items,
              priority: row.priority,
              package_length: row.package_length,
              package_width: row.package_width,
              package_height: row.package_height,
              package_weight: row.package_weight,
              package_volume: row.package_volume,
              latitude: row.latitude,
              longitude: row.longitude,
              driver_id: row.driver_id,
              route_rank: row.route_rank,
              created_at: row.order_created_at,
              updated_at: row.order_updated_at,
              raw_data: row.raw_data,
            });
            zone.orderCount = zone.orders.length;
          }
        }

        const zones = Array.from(zonesMap.values());

        return { zones };
      } catch (error) {
        fastify.log.error("Get zones error:", error);
        return reply.code(500).send({
          error: "Failed to fetch zones",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/zones
   * Create zones from order clustering
   * Body: { zones: [{ name, center: {lat, lng}, orderIds: [...] }] }
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: ["zones"],
        summary: "Create zones from clustering",
        description:
          "Create zones and assign orders to them. Used when clustering orders.",
        body: zoneSchemas.CreateZonesBody,
        response: {
          200: zoneSchemas.CreateZonesResponse,
          400: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { zones: zonesData } = request.body;

      const client = await fastify.pg.connect();
      try {
        await client.query("BEGIN");

        // Delete existing empty zones first (cleanup stale zones)
        await client.query(
          `DELETE FROM zones WHERE id NOT IN (
            SELECT DISTINCT zone_id FROM orders WHERE zone_id IS NOT NULL
          )`
        );

        const createdZones = [];

        for (const zoneData of zonesData) {
          // Skip zones with no orders - only create zones that have orders
          if (!zoneData.orderIds || zoneData.orderIds.length === 0) {
            fastify.log.warn(
              `Skipping zone creation for ${zoneData.name}: no orders assigned`
            );
            continue;
          }

          // Create zone
          const zoneResult = await client.query(
            `INSERT INTO zones (name, center_lat, center_lng, radius)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              zoneData.name,
              zoneData.center.lat,
              zoneData.center.lng,
              zoneData.radius || null,
            ]
          );

          const zone = zoneResult.rows[0];

          // Assign orders to zone (we know orderIds is not empty from check above)
          await client.query(
            `UPDATE orders 
             SET zone_id = $1, updated_at = NOW()
             WHERE id = ANY($2::uuid[])`,
            [zone.id, zoneData.orderIds]
          );

          // Get orders for response
          const ordersResult = await client.query(
            `SELECT * FROM orders WHERE zone_id = $1`,
            [zone.id]
          );

          createdZones.push({
            id: zone.id,
            name: zone.name,
            center: {
              lat: parseFloat(zone.center_lat),
              lng: parseFloat(zone.center_lng),
            },
            radius: zone.radius ? parseFloat(zone.radius) : null,
            orders: ordersResult.rows,
            orderCount: ordersResult.rows.length,
          });
        }

        await client.query("COMMIT");

        return {
          success: true,
          created: createdZones.length,
          zones: createdZones,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error("Create zones error:", error);
        return reply.code(500).send({
          error: "Failed to create zones",
          message: error.message,
        });
      } finally {
        client.release();
      }
    }
  );

  /**
   * DELETE /api/zones/:id
   * Delete a zone (orders are unassigned, not deleted)
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["zones"],
        summary: "Delete a zone",
        description: "Delete a zone. Orders in the zone are unassigned but not deleted.",
        params: commonSchemas.UuidParam,
        response: {
          200: { type: "object", properties: { success: { type: "boolean" }, id: { type: "string" } } },
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

        // Unassign orders from zone
        await client.query(
          "UPDATE orders SET zone_id = NULL, updated_at = NOW() WHERE zone_id = $1",
          [id]
        );

        // Delete zone
        const result = await client.query(
          "DELETE FROM zones WHERE id = $1 RETURNING id",
          [id]
        );

        if (result.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.code(404).send({ error: "Zone not found" });
        }

        await client.query("COMMIT");
        return { success: true, id };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error("Delete zone error:", error);
        return reply.code(500).send({ error: "Failed to delete zone", message: error.message });
      } finally {
        client.release();
      }
    }
  );

  /**
   * DELETE /api/zones
   * Delete all zones (orders are unassigned, not deleted)
   */
  fastify.delete(
    "/",
    {
      schema: {
        tags: ["zones"],
        summary: "Delete all zones",
        description: "Delete all zones. Orders are unassigned but not deleted.",
        response: {
          200: { type: "object", properties: { success: { type: "boolean" }, deleted: { type: "number" } } },
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const client = await fastify.pg.connect();
      try {
        await client.query("BEGIN");

        // Unassign all orders from zones
        await client.query("UPDATE orders SET zone_id = NULL, updated_at = NOW() WHERE zone_id IS NOT NULL");

        // Delete all zones
        const result = await client.query("DELETE FROM zones RETURNING id");

        await client.query("COMMIT");
        return { success: true, deleted: result.rows.length };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error("Delete all zones error:", error);
        return reply.code(500).send({ error: "Failed to delete zones", message: error.message });
      } finally {
        client.release();
      }
    }
  );

  /**
   * PUT /api/zones/:id/assign-driver
   * Assign driver to all orders in a zone
   * Body: { driverId: "uuid" }
   */
  fastify.put(
    "/:id/assign-driver",
    {
      schema: {
        tags: ["zones"],
        summary: "Assign driver to zone",
        description: "Assign a driver to all orders in a zone",
        params: commonSchemas.UuidParam,
        body: zoneSchemas.AssignDriverBody,
        response: {
          200: zoneSchemas.AssignDriverResponse,
          400: commonSchemas.Error,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { id: zoneId } = request.params;
      const { driverId } = request.body;

      try {
        // Validate zone exists
        const zoneResult = await fastify.pg.query(
          "SELECT id FROM zones WHERE id = $1",
          [zoneId]
        );

        if (zoneResult.rows.length === 0) {
          return reply.code(404).send({ error: "Zone not found" });
        }

        // Validate driver exists
        const driverResult = await fastify.pg.query(
          "SELECT id FROM drivers WHERE id = $1",
          [driverId]
        );

        if (driverResult.rows.length === 0) {
          return reply.code(400).send({ error: "Driver not found" });
        }

        // Assign driver to all orders in zone
        const result = await fastify.pg.query(
          `UPDATE orders 
           SET driver_id = $1, updated_at = NOW()
           WHERE zone_id = $2
           RETURNING id`,
          [driverId, zoneId]
        );

        return {
          success: true,
          zoneId,
          driverId,
          updated: result.rows.length,
          orderIds: result.rows.map((row) => row.id),
        };
      } catch (error) {
        fastify.log.error("Assign driver to zone error:", error);
        return reply.code(500).send({
          error: "Failed to assign driver to zone",
          message: error.message,
        });
      }
    }
  );
}

