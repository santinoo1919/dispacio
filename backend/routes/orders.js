/**
 * Orders API Endpoints
 * CRUD operations for orders
 */

import { commonSchemas } from "../schemas/common.js";
import { orderSchemas } from "../schemas/orders.js";

export default async function ordersRoutes(fastify, options) {
  /**
   * GET /api/orders
   * Get orders with optional filters
   * Query params: driver_id, limit, offset
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: ["orders"],
        summary: "Get orders with optional filters",
        description:
          "Retrieve orders with optional filtering by driver_id, pagination support",
        querystring: orderSchemas.GetOrdersQuery,
        response: {
          200: orderSchemas.GetOrdersResponse,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      // request.query is already validated by Fastify!
      const { driver_id, limit, offset } = request.query;

      try {
        let query = "SELECT * FROM orders";
        const params = [];
        const conditions = [];

        if (driver_id) {
          params.push(driver_id);
          conditions.push(`driver_id = $${params.length}`);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += ` ORDER BY route_rank NULLS LAST, created_at DESC LIMIT $${
          params.length + 1
        } OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await fastify.pg.query(query, params);

        return {
          orders: result.rows,
          total: result.rows.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
        };
      } catch (error) {
        fastify.log.error("Get orders error:", error);
        return reply.code(500).send({
          error: "Failed to fetch orders",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/orders/:id
   * Get single order by ID
   */
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["orders"],
        summary: "Get single order by ID",
        description: "Retrieve a specific order by its UUID",
        params: commonSchemas.UuidParam,
        response: {
          200: orderSchemas.Order,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      // request.params.id is already validated as UUID!
      const { id } = request.params;

      try {
        const result = await fastify.pg.query(
          "SELECT * FROM orders WHERE id = $1",
          [id]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Order not found" });
        }

        return result.rows[0];
      } catch (error) {
        fastify.log.error("Get order error:", error);
        return reply.code(500).send({
          error: "Failed to fetch order",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/orders
   * Bulk create orders from CSV data
   * Body: { orders: [...] }
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: ["orders"],
        summary: "Bulk create orders",
        description: "Create multiple orders from CSV data or array input",
        body: orderSchemas.CreateOrdersBody,
        response: {
          200: orderSchemas.CreateOrdersResponse,
          400: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      // request.body.orders is already validated by Fastify!
      const { orders } = request.body;

      const client = await fastify.pg.connect();
      try {
        await client.query("BEGIN");

        const insertedOrders = [];
        const errors = [];

        for (const order of orders) {
          try {
            // Validate required fields
            if (!order.order_number || !order.customer_name || !order.address) {
              errors.push({
                order: order.order_number || "unknown",
                error:
                  "Missing required fields: order_number, customer_name, address",
              });
              continue;
            }

            // Calculate volume if dimensions provided
            let package_volume = order.package_volume;
            if (
              !package_volume &&
              order.package_length &&
              order.package_width &&
              order.package_height
            ) {
              package_volume =
                parseFloat(order.package_length) *
                parseFloat(order.package_width) *
                parseFloat(order.package_height);
            }

            const result = await client.query(
              `INSERT INTO orders (
              order_number, customer_name, address, phone, notes, amount, items,
              priority, package_length, package_width, package_height, package_weight, package_volume,
              latitude, longitude, driver_id, route_rank, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
              [
                order.order_number,
                order.customer_name,
                order.address,
                order.phone || null,
                order.notes || null,
                order.amount ? parseFloat(order.amount) : null,
                order.items || null,
                order.priority || "normal",
                order.package_length ? parseFloat(order.package_length) : null,
                order.package_width ? parseFloat(order.package_width) : null,
                order.package_height ? parseFloat(order.package_height) : null,
                order.package_weight ? parseFloat(order.package_weight) : null,
                package_volume ? parseFloat(package_volume) : null,
                order.latitude ? parseFloat(order.latitude) : null,
                order.longitude ? parseFloat(order.longitude) : null,
                order.driver_id || null,
                order.route_rank || null,
                order.rawData ? JSON.stringify(order.rawData) : null,
              ]
            );

            insertedOrders.push(result.rows[0]);
          } catch (error) {
            // Handle unique constraint violations (duplicate order_number)
            if (error.code === "23505") {
              errors.push({
                order: order.order_number,
                error: "Order number already exists",
              });
            } else {
              errors.push({
                order: order.order_number || "unknown",
                error: error.message,
              });
            }
          }
        }

        await client.query("COMMIT");

        return {
          success: true,
          created: insertedOrders.length,
          failed: errors.length,
          orders: insertedOrders,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error("Create orders error:", error);
        return reply.code(500).send({
          error: "Failed to create orders",
          message: error.message,
        });
      } finally {
        client.release();
      }
    }
  );

  /**
   * PUT /api/orders/bulk-assign-driver
   * Bulk assign driver to multiple orders
   * Body: { orderIds: ["uuid1", "uuid2", ...], driverId: "uuid" }
   * NOTE: This must come BEFORE /:id route to avoid route matching conflicts
   */
  fastify.put(
    "/bulk-assign-driver",
    {
      schema: {
        tags: ["orders"],
        summary: "Bulk assign driver to orders",
        description:
          "Assign a driver to multiple orders in a single operation. More efficient than updating orders individually.",
        body: orderSchemas.BulkAssignDriverBody,
        response: {
          200: orderSchemas.BulkAssignDriverResponse,
          400: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      const { orderIds, driverId } = request.body;

      try {
        // Validate driver exists
        const driverResult = await fastify.pg.query(
          "SELECT id FROM drivers WHERE id = $1",
          [driverId]
        );

        if (driverResult.rows.length === 0) {
          return reply.code(400).send({
            error: "Driver not found",
            message: `Driver with ID ${driverId} does not exist`,
          });
        }

        // Bulk update orders
        const result = await fastify.pg.query(
          `UPDATE orders 
           SET driver_id = $1, updated_at = NOW() 
           WHERE id = ANY($2::uuid[])
           RETURNING id`,
          [driverId, orderIds]
        );

        return {
          success: true,
          updated: result.rows.length,
          orderIds: result.rows.map((row) => row.id),
        };
      } catch (error) {
        fastify.log.error("Bulk assign driver error:", error);
        return reply.code(500).send({
          error: "Failed to assign driver to orders",
          message: error.message,
        });
      }
    }
  );

  /**
   * PUT /api/orders/:id
   * Update order
   */
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["orders"],
        summary: "Update order",
        description: "Update an existing order by ID",
        params: commonSchemas.UuidParam,
        body: orderSchemas.UpdateOrderBody,
        response: {
          200: orderSchemas.Order,
          400: commonSchemas.Error,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      // Both params and body are already validated!
      const { id } = request.params;
      const updates = request.body;

      try {
        // Build dynamic update query
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
          "customer_name",
          "address",
          "phone",
          "notes",
          "amount",
          "items",
          "priority",
          "package_length",
          "package_width",
          "package_height",
          "package_weight",
          "package_volume",
          "latitude",
          "longitude",
          "driver_id",
          "route_rank",
        ];

        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }

        if (fields.length === 0) {
          return reply.code(400).send({ error: "No valid fields to update" });
        }

        // Add updated_at
        fields.push(`updated_at = NOW()`);
        values.push(id);
        paramIndex++;

        const query = `UPDATE orders SET ${fields.join(
          ", "
        )} WHERE id = $${paramIndex} RETURNING *`;
        const result = await fastify.pg.query(query, values);

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Order not found" });
        }

        return result.rows[0];
      } catch (error) {
        fastify.log.error("Update order error:", error);
        return reply.code(500).send({
          error: "Failed to update order",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/orders/:id
   * Delete order
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["orders"],
        summary: "Delete order",
        description: "Delete an order by ID",
        params: commonSchemas.UuidParam,
        response: {
          200: orderSchemas.DeleteOrderResponse,
          404: commonSchemas.Error,
          500: commonSchemas.Error,
        },
      },
    },
    async (request, reply) => {
      // request.params.id is already validated as UUID!
      const { id } = request.params;

      try {
        const result = await fastify.pg.query(
          "DELETE FROM orders WHERE id = $1 RETURNING id",
          [id]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Order not found" });
        }

        return { success: true, id: result.rows[0].id };
      } catch (error) {
        fastify.log.error("Delete order error:", error);
        return reply.code(500).send({
          error: "Failed to delete order",
          message: error.message,
        });
      }
    }
  );
}
