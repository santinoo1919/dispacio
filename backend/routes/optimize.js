/**
 * Route Optimization Endpoints
 * POST /api/routes/optimize - Optimize route for a driver using VROOM
 */

import {
  callVROOM,
  convertOrdersToVROOM,
  convertVehicleToVROOM,
  parseVROOMResponse,
} from "../services/vroom.js";

export default async function optimizeRoutes(fastify, options) {
  /**
   * POST /api/routes/optimize
   * Optimize route for a driver
   * Body: { driverId: "uuid", orderIds?: ["uuid1", "uuid2"] }
   */
  fastify.post("/optimize", async (request, reply) => {
    const { driverId, orderIds } = request.body;

    if (!driverId) {
      return reply.code(400).send({ error: "driverId is required" });
    }

    try {
      // 1. Fetch driver
      const driverResult = await fastify.pg.query(
        "SELECT * FROM drivers WHERE id = $1",
        [driverId]
      );

      if (driverResult.rows.length === 0) {
        return reply.code(404).send({ error: "Driver not found" });
      }

      const driver = driverResult.rows[0];

      // 2. Fetch orders for driver
      let ordersResult;
      if (orderIds && orderIds.length > 0) {
        // Optimize specific orders
        ordersResult = await fastify.pg.query(
          `SELECT * FROM orders 
           WHERE driver_id = $1 AND id = ANY($2::uuid[])
           ORDER BY route_rank NULLS LAST, created_at`,
          [driverId, orderIds]
        );
      } else {
        // Optimize all orders for driver
        ordersResult = await fastify.pg.query(
          `SELECT * FROM orders 
           WHERE driver_id = $1 
           ORDER BY route_rank NULLS LAST, created_at`,
          [driverId]
        );
      }

      const orders = ordersResult.rows;

      if (orders.length === 0) {
        return reply.code(400).send({ error: "No orders found for driver" });
      }

      // Filter orders with coordinates (required for VROOM)
      const ordersWithCoords = orders.filter(
        (o) => o.latitude != null && o.longitude != null
      );

      if (ordersWithCoords.length === 0) {
        return reply.code(400).send({
          error:
            "No orders with coordinates found. Coordinates are required for optimization.",
        });
      }

      // 3. Fetch vehicle for driver
      const vehicleResult = await fastify.pg.query(
        "SELECT * FROM vehicles WHERE driver_id = $1 LIMIT 1",
        [driverId]
      );

      let vehicle = vehicleResult.rows[0];

      // Create default vehicle if none exists
      if (!vehicle) {
        vehicle = {
          max_weight: 1000, // kg
          max_volume: 100000, // cm³
          max_length: 300, // cm
          max_width: 200, // cm
          max_height: 200, // cm
        };
      }

      // 4. Convert to VROOM format
      const vroomJobs = convertOrdersToVROOM(ordersWithCoords);
      const vroomVehicle = convertVehicleToVROOM(
        vehicle,
        driver,
        ordersWithCoords
      );

      // 5. Call VROOM (skip if not configured)
      if (!process.env.VROOM_URL) {
        return reply.code(503).send({
          error: "VROOM not configured",
          message:
            "VROOM_URL environment variable not set. Route optimization is not available yet.",
        });
      }

      const vroomResponse = await callVROOM(vroomJobs, [vroomVehicle]);

      // 6. Parse VROOM response
      const optimizedRoute = parseVROOMResponse(
        vroomResponse,
        ordersWithCoords
      );

      // 7. Update order ranks in database
      const client = await fastify.pg.connect();
      try {
        await client.query("BEGIN");

        // Update ranks for optimized orders
        for (const optimizedOrder of optimizedRoute.orders) {
          await client.query(
            "UPDATE orders SET route_rank = $1, updated_at = NOW() WHERE id = $2",
            [optimizedOrder.rank, optimizedOrder.orderId]
          );
        }

        // Reset ranks for orders not in optimized route
        const optimizedOrderIds = optimizedRoute.orders.map((o) => o.orderId);
        await client.query(
          `UPDATE orders 
           SET route_rank = NULL, updated_at = NOW() 
           WHERE driver_id = $1 AND id != ALL($2::uuid[])`,
          [driverId, optimizedOrderIds]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      // 8. Return optimized route
      return {
        success: true,
        driverId,
        totalDistance: optimizedRoute.totalDistance,
        totalDuration: optimizedRoute.totalDuration,
        orders: optimizedRoute.orders,
      };
    } catch (error) {
      fastify.log.error("Route optimization error:", error);
      return reply.code(500).send({
        error: "Failed to optimize route",
        message: error.message,
      });
    }
  });
}
