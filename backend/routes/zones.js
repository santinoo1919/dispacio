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
        // Get all zones
        const zonesResult = await fastify.pg.query(
          "SELECT * FROM zones ORDER BY created_at ASC"
        );

        // Get orders for each zone
        const zones = await Promise.all(
          zonesResult.rows.map(async (zone) => {
            const ordersResult = await fastify.pg.query(
              `SELECT * FROM orders 
               WHERE zone_id = $1 
               ORDER BY route_rank NULLS LAST, created_at ASC`,
              [zone.id]
            );

            return {
              id: zone.id,
              name: zone.name,
              center: {
                lat: parseFloat(zone.center_lat),
                lng: parseFloat(zone.center_lng),
              },
              radius: zone.radius ? parseFloat(zone.radius) : null,
              orders: ordersResult.rows,
              orderCount: ordersResult.rows.length,
              createdAt: zone.created_at,
              updatedAt: zone.updated_at,
            };
          })
        );

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

        const createdZones = [];

        for (const zoneData of zonesData) {
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

          // Assign orders to zone
          if (zoneData.orderIds && zoneData.orderIds.length > 0) {
            await client.query(
              `UPDATE orders 
               SET zone_id = $1, updated_at = NOW()
               WHERE id = ANY($2::uuid[])`,
              [zone.id, zoneData.orderIds]
            );
          }

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

