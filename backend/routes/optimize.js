/**
 * Route Optimization Endpoints
 * POST /api/routes/optimize - Optimize route for a driver using OR-Tools VRP solver
 */

import { commonSchemas } from "../schemas/common.js";
import { routeSchemas } from "../schemas/routes.js";
import {
  convertVehicleToORTools,
  parseORToolsResponse,
  solveVRPWithORTools,
} from "../services/route-optimizer.js";

export default async function optimizeRoutes(fastify, options) {
  /**
   * POST /api/routes/optimize
   * Optimize route for a driver
   * Body: { driverId: "uuid", orderIds?: ["uuid1", "uuid2"] }
   */
  fastify.post(
    "/optimize",
    {
      schema: {
        tags: ["routes"],
        summary: "Optimize route for a driver",
        description:
          "Optimize delivery route for a driver using OR-Tools VRP solver. Optionally specify order IDs to optimize, otherwise optimizes all orders for the driver.",
        body: routeSchemas.OptimizeRouteBody,
        response: {
          200: routeSchemas.OptimizeRouteResponse,
          400: commonSchemas.Error,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
          503: commonSchemas.Error,
        },
      },
      // Stricter rate limit for CPU-intensive optimization
      config: {
        rateLimit: {
          max: 20, // Only 20 optimizations per minute (CPU intensive)
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      // request.body is already validated by Fastify!
      const { driverId, orderIds } = request.body;

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
        const shouldAssignDriver = orderIds && orderIds.length > 0;

        if (shouldAssignDriver) {
          // Optimize specific orders (don't require driver_id match - will assign during optimization)
          ordersResult = await fastify.pg.query(
            `SELECT * FROM orders 
           WHERE id = ANY($1::uuid[])
           ORDER BY route_rank NULLS LAST, created_at`,
            [orderIds]
          );
          // Driver assignment moved to transaction below
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

        // Filter orders with coordinates (required for optimization)
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

        // 4. Convert to OR-Tools format and get depot location
        const { depotLocation } = convertVehicleToORTools(
          vehicle,
          driver,
          ordersWithCoords
        );

        // 5. Solve VRP using OR-Tools
        const solverResult = await solveVRPWithORTools(
          ordersWithCoords,
          vehicle,
          depotLocation
        );

        // 6. Parse OR-Tools solution
        const optimizedRoute = parseORToolsResponse(
          solverResult,
          ordersWithCoords
        );

        // 7. Update order ranks in database (all writes in one transaction)
        const client = await fastify.pg.connect();
        try {
          await client.query("BEGIN");

          // Assign driver to orders if specific orderIds were provided
          if (shouldAssignDriver) {
            await client.query(
              `UPDATE orders 
               SET driver_id = $1, updated_at = NOW()
               WHERE id = ANY($2::uuid[]) AND (driver_id IS NULL OR driver_id != $1)`,
              [driverId, orderIds]
            );
          }

          // Update ranks for optimized orders
          for (const optimizedOrder of optimizedRoute.orders) {
            await client.query(
              "UPDATE orders SET route_rank = $1, updated_at = NOW() WHERE id = $2",
              [optimizedOrder.rank, optimizedOrder.orderId]
            );
          }

          // Reset ranks for orders in the same zone(s) as optimized orders, but not in the optimized route
          // This ensures zones are independent - optimizing one zone doesn't affect others
          const optimizedOrderIds = optimizedRoute.orders.map((o) => o.orderId);

          // Get zone IDs for the optimized orders
          const zoneResult = await client.query(
            `SELECT DISTINCT zone_id FROM orders WHERE id = ANY($1::uuid[]) AND zone_id IS NOT NULL`,
            [optimizedOrderIds]
          );

          const zoneIds = zoneResult.rows.map((row) => row.zone_id);

          if (zoneIds.length > 0) {
            // Reset ranks only for orders in the same zones, same driver, but not in optimized route
            await client.query(
              `UPDATE orders 
               SET route_rank = NULL, updated_at = NOW() 
               WHERE driver_id = $1 
                 AND zone_id = ANY($2::uuid[])
                 AND id != ALL($3::uuid[])`,
              [driverId, zoneIds, optimizedOrderIds]
            );
          } else {
            // Fallback: if no zones, reset all orders for this driver (backward compatibility)
            await client.query(
              `UPDATE orders 
               SET route_rank = NULL, updated_at = NOW() 
               WHERE driver_id = $1 AND id != ALL($2::uuid[])`,
              [driverId, optimizedOrderIds]
            );
          }

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
    }
  );
}
