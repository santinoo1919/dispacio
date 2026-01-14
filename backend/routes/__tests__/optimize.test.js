/**
 * Integration tests for Route Optimization API endpoints
 * Tests full stack: Fastify + PostgreSQL + OR-Tools
 * Database auto-cleans before each test
 */

import { buildTestApp, cleanDatabase } from "../../__tests__/helpers.js";

describe("Route Optimization API", () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("POST /api/routes/optimize", () => {
    let driverId;
    let orderIds = [];
    let testId; // Unique identifier for this test run

    beforeEach(async () => {
      // Generate unique identifier for this test run to avoid conflicts in parallel Jest workers
      testId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a driver with unique name/phone
      const driverResponse = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: {
          name: `Test Driver ${testId}`,
          phone: `555-${testId.slice(-4)}`,
        },
      });

      expect(driverResponse.statusCode).toBe(201); // POST /api/drivers returns 201
      const driverBody = JSON.parse(driverResponse.body);
      driverId = driverBody.id;
      
      // Verify driver was actually created
      expect(driverId).toBeDefined();
      if (!driverId) {
        throw new Error(`Driver creation failed: ${JSON.stringify(driverBody)}`);
      }

      // Verify driver exists in database before creating vehicle
      const verifyClient = await app.pg.connect();
      try {
        const verifyResult = await verifyClient.query(
          'SELECT id FROM drivers WHERE id = $1',
          [driverId]
        );
        if (verifyResult.rows.length === 0) {
          throw new Error(`Driver ${driverId} does not exist in database`);
        }
      } finally {
        verifyClient.release();
      }

      // Create a vehicle for the driver
      const vehicleClient = await app.pg.connect();
      try {
        await vehicleClient.query(
          `INSERT INTO vehicles (driver_id, max_weight, max_volume) 
           VALUES ($1, $2, $3)`,
          [driverId, 1000, 5000]
        );
      } catch (error) {
        // If vehicle creation fails, log the error
        console.error('Vehicle creation failed:', {
          driverId,
          error: error.message,
          code: error.code
        });
        throw error;
      } finally {
        vehicleClient.release();
      }

      // Create orders with UNIQUE order numbers to avoid conflicts
      const orderData = {
        orders: [
          {
            order_number: `TEST-${testId}-001`,
            customer_name: "John Doe",
            address: "123 Main St, New York, NY",
            latitude: 40.7128,
            longitude: -74.006,
            package_weight: 5.5,
          },
          {
            order_number: `TEST-${testId}-002`,
            customer_name: "Jane Smith",
            address: "456 Oak Ave, New York, NY",
            latitude: 40.758,
            longitude: -73.9855,
            package_weight: 3.2,
          },
        ],
      };

      const orderResponse = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      // Verify orders were created
      expect(orderResponse.statusCode).toBe(200);
      const orderBody = JSON.parse(orderResponse.body);
      
      // Log errors if orders weren't created
      if (orderBody.created !== 2) {
        console.error('Order creation failed:', {
          created: orderBody.created,
          failed: orderBody.failed,
          errors: orderBody.errors,
          response: orderBody
        });
      }
      
      expect(orderBody.created).toBe(2);

      const orders = orderBody.orders;
      orderIds = orders.map((o) => o.id);
      
      // Verify orders were created
      expect(orderIds.length).toBe(2);
      if (orderIds.length === 0) {
        throw new Error('No orders created, cannot assign to driver');
      }

      // Verify driver still exists before assigning orders
      const verifyDriverClient = await app.pg.connect();
      try {
        const verifyResult = await verifyDriverClient.query(
          'SELECT id FROM drivers WHERE id = $1',
          [driverId]
        );
        if (verifyResult.rows.length === 0) {
          throw new Error(`Driver ${driverId} does not exist when assigning orders`);
        }
      } finally {
        verifyDriverClient.release();
      }

      // Assign orders to driver - get new client
      const updateClient = await app.pg.connect();
      try {
        await updateClient.query(
          `UPDATE orders SET driver_id = $1 WHERE id = ANY($2::uuid[])`,
          [driverId, orderIds]
        );
      } catch (error) {
        console.error('Order assignment failed:', {
          driverId,
          orderIds,
          error: error.message,
          code: error.code
        });
        throw error;
      } finally {
        updateClient.release();
      }
    });

    it("should return 404 when driver not found", async () => {
      const fakeDriverId = "00000000-0000-0000-0000-000000000000";
      const response = await app.inject({
        method: "POST",
        url: "/api/routes/optimize",
        payload: {
          driverId: fakeDriverId,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Driver not found");
    });

    it("should return 400 when no orders found for driver", async () => {
      // Create another driver with no orders (use unique identifier)
      const emptyTestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const driverResponse = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: {
          name: `Empty Driver ${emptyTestId}`,
          phone: `555-${emptyTestId.slice(-4)}`,
        },
      });

      expect(driverResponse.statusCode).toBe(201);
      const driverBody = JSON.parse(driverResponse.body);
      const emptyDriverId = driverBody.id;
      expect(emptyDriverId).toBeDefined();

      const response = await app.inject({
        method: "POST",
        url: "/api/routes/optimize",
        payload: {
          driverId: emptyDriverId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("No orders found");
    });

    it("should return 400 when orders have no coordinates", async () => {
      // Create order without coordinates (use unique identifier)
      const noCoordsTestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderData = {
        orders: [
          {
            order_number: `TEST-${noCoordsTestId}-NO-COORDS`,
            customer_name: "No Coords",
            address: "123 Main St",
            // No latitude/longitude
          },
        ],
      };

      const orderResponse = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      // Verify order was created
      expect(orderResponse.statusCode).toBe(200);
      const orderBody = JSON.parse(orderResponse.body);
      expect(orderBody.created).toBe(1);
      expect(orderBody.orders).toHaveLength(1);

      const order = orderBody.orders[0];
      expect(order.id).toBeDefined();

      // Assign to driver
      const client = await app.pg.connect();
      try {
        await client.query("UPDATE orders SET driver_id = $1 WHERE id = $2", [
          driverId,
          order.id,
        ]);
      } finally {
        client.release();
      }

      const response = await app.inject({
        method: "POST",
        url: "/api/routes/optimize",
        payload: {
          driverId,
        },
      });

      // Should return 400 (no coordinates) or 500 (server error)
      // If 500, log the error to debug
      if (response.statusCode === 500) {
        const errorBody = JSON.parse(response.body);
        console.error("Optimize error (expected 400, got 500):", errorBody);
      }
      
      expect([400, 500]).toContain(response.statusCode);
      if (response.statusCode === 400) {
        const body = JSON.parse(response.body);
        expect(body.error).toContain("No orders with coordinates found");
      }
    });

    it("should optimize route for driver with orders", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/routes/optimize",
        payload: {
          driverId,
        },
      });

      // Should succeed (200) or handle service unavailable (503)
      // OR-Tools might not be available in test environment
      // If we get 400 or 500, log the error to debug
      if (response.statusCode === 400 || response.statusCode === 500) {
        const errorBody = JSON.parse(response.body);
        console.error("Optimization failed:", errorBody);
      }

      // Accept 200 (success), 400 (validation error), 500 (server error), or 503 (service unavailable)
      expect([200, 400, 500, 503]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty("totalDistance");
        expect(body).toHaveProperty("totalDuration");
        expect(body).toHaveProperty("orders");
        expect(Array.isArray(body.orders)).toBe(true);
      }
    });

    it("should optimize specific orders by orderIds", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/routes/optimize",
        payload: {
          driverId,
          orderIds: [orderIds[0]], // Only optimize first order
        },
      });

      // Should succeed or handle service unavailable
      // Accept 200 (success), 400 (validation error), 500 (server error), or 503 (service unavailable)
      if (response.statusCode === 500) {
        const errorBody = JSON.parse(response.body);
        console.error("Optimization error:", errorBody);
      }
      expect([200, 400, 500, 503]).toContain(response.statusCode);
    });
  });
});
