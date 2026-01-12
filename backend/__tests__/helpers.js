/**
 * Test helpers for building Fastify app with in-memory test database
 */

import Fastify from 'fastify';
import { registerTestDatabase } from './db-mem.js';
import { runMigrations } from '../db/connection.js';
import ordersRoutes from '../routes/orders.js';
import optimizeRoutes from '../routes/optimize.js';
import zonesRoutes from '../routes/zones.js';
import driversRoutes from '../routes/drivers.js';

/**
 * Build a test Fastify app with in-memory database
 * Uses pg-mem - no real PostgreSQL needed!
 * @returns {Promise<FastifyInstance>}
 */
export async function buildTestApp() {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register in-memory database (pg-mem)
  await registerTestDatabase(app);
  
  // Run migrations to set up schema
  await runMigrations(app);

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
 * Note: With pg-mem, this is optional since each test can get a fresh DB,
 * but keeping it for explicit cleanup and test isolation
 * @param {FastifyInstance} app - Fastify app instance
 */
export async function cleanDatabase(app) {
  const client = await app.pg.connect();
  try {
    // Delete in reverse order of dependencies
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM zones');
    await client.query('DELETE FROM drivers');
    await client.query('DELETE FROM vehicles');
  } finally {
    client.release();
  }
}

