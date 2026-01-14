/**
 * Test helpers for building Fastify app with PostgreSQL test database
 * Uses real PostgreSQL - 100% compatibility, no workarounds needed!
 * 
 * Note: Migrations are run ONCE globally via jest.config.js globalSetup
 * This simplifies the code and eliminates race conditions!
 */

import Fastify from 'fastify';
import { registerDatabase } from '../db/connection.js';
import ordersRoutes from '../routes/orders.js';
import optimizeRoutes from '../routes/optimize.js';
import zonesRoutes from '../routes/zones.js';
import driversRoutes from '../routes/drivers.js';

/**
 * Build a test Fastify app with PostgreSQL database
 * Schema is already set up by globalSetup (migrations run once before all tests)
 * @returns {Promise<FastifyInstance>}
 */
export async function buildTestApp() {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register PostgreSQL database
  // Schema already exists from globalSetup - no migrations needed here!
  await registerDatabase(app);

  // Register routes
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(optimizeRoutes, { prefix: '/api/routes' });
  await app.register(zonesRoutes, { prefix: '/api/zones' });
  await app.register(driversRoutes, { prefix: '/api/drivers' });

  // Health check endpoint (simplified for tests)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  await app.ready();
  return app;
}

/**
 * Clean all tables before each test
 * Uses TRUNCATE for fast, reliable cleanup with real PostgreSQL
 * @param {FastifyInstance} app - Fastify app instance
 */
export async function cleanDatabase(app) {
  const client = await app.pg.connect();
  try {
    // TRUNCATE is fast and reliable with real PostgreSQL
    // CASCADE ensures foreign key constraints are handled
    // RESTART IDENTITY resets sequences (not needed for UUIDs, but good practice)
    await client.query('TRUNCATE TABLE orders, zones, vehicles, drivers RESTART IDENTITY CASCADE');
  } finally {
    client.release();
  }
}

