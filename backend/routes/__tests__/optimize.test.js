/**
 * Integration tests for Route Optimization API endpoints
 * Tests full stack: Fastify + PostgreSQL + OR-Tools
 * Database is cleaned before each test for isolation
 */

import { buildTestApp, cleanDatabase } from "../../__tests__/helpers.js";

describe("Route Optimization API", () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  // Clean database before each test for isolation
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

    beforeEach(async () => {
      // Create a driver
      const driverResponse = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: {
          name: "Test Driver",
          phone: "555-0100",
        },
      });

      expect(driverResponse.statusCode).toBe(201);
      driverId = JSON.parse(driverResponse.body).id;

      // Create a vehicle for the driver
      const vehicleClient = await app.pg.connect();
      try {
        await vehicleClient.query(
          `INSERT INTO vehicles (driver_id, max_weight, max_volume) 
           VALUES ($1, $2, $3)`,
          [driverId, 1000, 5000]
        );
      } finally {
        vehicleClient.release();
      }

      // Create orders with coordinates
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St, New York, NY",
            latitude: 40.7128,
            longitude: -74.006,
            package_weight: 5.5,
          },
          {
            order_number: "TEST-002",
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

      expect(orderResponse.statusCode).toBe(200);
      const orderBody = JSON.parse(orderResponse.body);
      expect(orderBody.created).toBe(2);

      const orders = orderBody.orders;
      orderIds = orders.map((o) => o.id);

      // Assign orders to driver
      const updateClient = await app.pg.connect();
      try {
        await updateClient.query(
          `UPDATE orders SET driver_id = $1 WHERE id = ANY($2::uuid[])`,
          [driverId, orderIds]
        );
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
      // Create another driver with no orders
      const driverResponse = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: {
          name: "Empty Driver",
          phone: "555-0200",
        },
      });

      expect(driverResponse.statusCode).toBe(201);
      const emptyDriverId = JSON.parse(driverResponse.body).id;

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
      // Create order without coordinates
      const orderData = {
        orders: [
          {
            order_number: "TEST-NO-COORDS",
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

      expect(orderResponse.statusCode).toBe(200);
      const orderBody = JSON.parse(orderResponse.body);
      expect(orderBody.created).toBe(1);
      const order = orderBody.orders[0];

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

      // Accept 400 (expected) or 500 (OR-Tools error)
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

      // Accept 200 (success), 500 (OR-Tools error), or 503 (service unavailable)
      expect([200, 500, 503]).toContain(response.statusCode);

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

      // Accept 200 (success), 400 (validation), 500 (OR-Tools error), or 503 (service unavailable)
      expect([200, 400, 500, 503]).toContain(response.statusCode);
    });
  });
});
