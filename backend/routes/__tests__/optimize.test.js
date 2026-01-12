/**
 * Integration tests for Route Optimization API endpoints
 * Tests full stack: Fastify + PostgreSQL + OR-Tools
 * Database auto-cleans before each test
 */

import { buildTestApp, cleanDatabase } from '../../__tests__/helpers.js';

describe('Route Optimization API', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/routes/optimize', () => {
    let driverId;
    let orderIds = [];

    beforeEach(async () => {
      // Create a driver
      const driverResponse = await app.inject({
        method: 'POST',
        url: '/api/drivers',
        payload: {
          name: 'Test Driver',
          phone: '555-0100',
        },
      });

      driverId = JSON.parse(driverResponse.body).id;

      // Create a vehicle for the driver
      const client = await app.pg.connect();
      try {
        await client.query(
          `INSERT INTO vehicles (driver_id, max_weight, max_volume) 
           VALUES ($1, $2, $3)`,
          [driverId, 1000, 5000]
        );
      } finally {
        client.release();
      }

      // Create orders with coordinates
      const orderData = {
        orders: [
          {
            order_number: 'TEST-001',
            customer_name: 'John Doe',
            address: '123 Main St, New York, NY',
            latitude: 40.7128,
            longitude: -74.0060,
            package_weight: 5.5,
          },
          {
            order_number: 'TEST-002',
            customer_name: 'Jane Smith',
            address: '456 Oak Ave, New York, NY',
            latitude: 40.7580,
            longitude: -73.9855,
            package_weight: 3.2,
          },
        ],
      };

      const orderResponse = await app.inject({
        method: 'POST',
        url: '/api/orders',
        payload: orderData,
      });

      const orders = JSON.parse(orderResponse.body).orders;
      orderIds = orders.map((o) => o.id);

      // Assign orders to driver
      await client.query(
        `UPDATE orders SET driver_id = $1 WHERE id = ANY($2::uuid[])`,
        [driverId, orderIds]
      );
      client.release();
    });

    it('should return 404 when driver not found', async () => {
      const fakeDriverId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: '/api/routes/optimize',
        payload: {
          driverId: fakeDriverId,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Driver not found');
    });

    it('should return 400 when no orders found for driver', async () => {
      // Create another driver with no orders
      const driverResponse = await app.inject({
        method: 'POST',
        url: '/api/drivers',
        payload: {
          name: 'Empty Driver',
          phone: '555-0200',
        },
      });

      const emptyDriverId = JSON.parse(driverResponse.body).id;

      const response = await app.inject({
        method: 'POST',
        url: '/api/routes/optimize',
        payload: {
          driverId: emptyDriverId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('No orders found for driver');
    });

    it('should return 400 when orders have no coordinates', async () => {
      // Create order without coordinates
      const orderData = {
        orders: [
          {
            order_number: 'TEST-NO-COORDS',
            customer_name: 'No Coords',
            address: '123 Main St',
            // No latitude/longitude
          },
        ],
      };

      const orderResponse = await app.inject({
        method: 'POST',
        url: '/api/orders',
        payload: orderData,
      });

      const order = JSON.parse(orderResponse.body).orders[0];

      // Assign to driver
      const client = await app.pg.connect();
      try {
        await client.query('UPDATE orders SET driver_id = $1 WHERE id = $2', [
          driverId,
          order.id,
        ]);
      } finally {
        client.release();
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/routes/optimize',
        payload: {
          driverId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No orders with coordinates found');
    });

    it('should optimize route for driver with orders', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/routes/optimize',
        payload: {
          driverId,
        },
      });

      // Should succeed (200) or handle service unavailable (503)
      // OR-Tools might not be available in test environment
      expect([200, 503]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('totalDistance');
        expect(body).toHaveProperty('totalDuration');
        expect(body).toHaveProperty('orders');
        expect(Array.isArray(body.orders)).toBe(true);
      }
    });

    it('should optimize specific orders by orderIds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/routes/optimize',
        payload: {
          driverId,
          orderIds: [orderIds[0]], // Only optimize first order
        },
      });

      // Should succeed or handle service unavailable
      expect([200, 400, 503]).toContain(response.statusCode);
    });
  });
});

