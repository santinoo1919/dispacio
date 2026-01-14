/**
 * Integration tests for Orders API endpoints
 * Tests full stack: Fastify + PostgreSQL
 * Each test runs in its own transaction for perfect isolation
 */

import { buildTestApp, startTestTransaction, rollbackTestTransaction } from "../../__tests__/helpers.js";

describe("Orders API", () => {
  let app;
  let transactionClient;

  // Build app before all tests
  beforeAll(async () => {
    app = await buildTestApp();
  });

  // Start transaction before each test (perfect isolation)
  beforeEach(async () => {
    transactionClient = await startTestTransaction(app);
  });

  // Rollback transaction after each test (undo all changes)
  afterEach(async () => {
    await rollbackTestTransaction(transactionClient);
  });

  // Close app after all tests
  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/orders", () => {
    it("should create a single order", async () => {
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St, City, State",
            phone: "555-0100",
            latitude: 40.7128,
            longitude: -74.006,
            package_weight: 5.5,
            priority: "normal",
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.created).toBe(1);
      expect(body.orders).toHaveLength(1);
      expect(body.orders[0].order_number).toBe("TEST-001");
      expect(body.orders[0].customer_name).toBe("John Doe");
      expect(body.orders[0].id).toBeDefined();
    });

    it("should create multiple orders in bulk", async () => {
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St",
            latitude: 40.7128,
            longitude: -74.006,
          },
          {
            order_number: "TEST-002",
            customer_name: "Jane Smith",
            address: "456 Oak Ave",
            latitude: 40.758,
            longitude: -73.9855,
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.created).toBe(2);
      expect(body.orders).toHaveLength(2);
      expect(body.failed).toBe(0);
    });

    it("should reject order without required fields", async () => {
      const orderData = {
        orders: [
          {
            customer_name: "John Doe",
            // Missing order_number and address
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should handle package dimensions", async () => {
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St",
            latitude: 40.7128,
            longitude: -74.006,
            package_length: 10.5,
            package_width: 8.0,
            package_height: 6.0,
            package_weight: 5.5,
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // PostgreSQL NUMERIC returns numbers, not strings
      expect(body.orders[0].package_length).toBe(10.5);
      expect(body.orders[0].package_width).toBe(8.0);
      expect(body.orders[0].package_height).toBe(6.0);
      expect(body.orders[0].package_weight).toBe(5.5);
    });
  });

  describe("GET /api/orders", () => {
    beforeEach(async () => {
      // Create test orders
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St",
            latitude: 40.7128,
            longitude: -74.006,
          },
          {
            order_number: "TEST-002",
            customer_name: "Jane Smith",
            address: "456 Oak Ave",
            latitude: 40.758,
            longitude: -73.9855,
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.created).toBe(2);
      expect(body.orders).toHaveLength(2);
    });

    it("should get all orders", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/orders?limit=10&offset=0",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orders).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("should filter orders by driver_id", async () => {
      // First, create a driver
      const driverResponse = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: {
          name: "Test Driver",
          phone: "555-0100",
        },
      });

      expect(driverResponse.statusCode).toBe(201);
      const driver = JSON.parse(driverResponse.body);
      const driverId = driver.id;

      // Get orders
      const orderResponse = await app.inject({
        method: "GET",
        url: "/api/orders?limit=10&offset=0",
      });

      const orders = JSON.parse(orderResponse.body).orders;
      const orderId = orders[0].id;

      // Update order with driver_id
      const client = await app.pg.connect();
      try {
        await client.query("UPDATE orders SET driver_id = $1 WHERE id = $2", [
          driverId,
          orderId,
        ]);
      } finally {
        client.release();
      }

      // Filter by driver_id
      const filteredResponse = await app.inject({
        method: "GET",
        url: `/api/orders?driver_id=${driverId}&limit=10&offset=0`,
      });

      expect(filteredResponse.statusCode).toBe(200);
      const body = JSON.parse(filteredResponse.body);
      expect(body.orders).toHaveLength(1);
      expect(body.orders[0].driver_id).toBe(driverId);
    });

    it("should support pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/orders?limit=1&offset=0",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orders).toHaveLength(1);
      expect(body.limit).toBe(1);
      expect(body.offset).toBe(0);
    });
  });

  describe("GET /api/orders/:id", () => {
    let orderId;

    beforeEach(async () => {
      const orderData = {
        orders: [
          {
            order_number: "TEST-001",
            customer_name: "John Doe",
            address: "123 Main St",
            latitude: 40.7128,
            longitude: -74.006,
          },
        ],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/orders",
        payload: orderData,
      });

      const body = JSON.parse(response.body);
      expect(body.orders).toHaveLength(1);
      orderId = body.orders[0].id;
    });

    it("should get order by ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/orders/${orderId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(orderId);
      expect(body.order_number).toBe("TEST-001");
    });

    it("should return 404 for non-existent order", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await app.inject({
        method: "GET",
        url: `/api/orders/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Order not found");
    });
  });
});
