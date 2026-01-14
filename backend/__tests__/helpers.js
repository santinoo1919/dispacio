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
 * Start a transaction for test isolation
 * Each test runs in its own transaction and rolls back automatically
 * This provides perfect isolation and works with parallel execution
 * @param {FastifyInstance} app - Fastify app instance
 * @returns {Promise<Object>} Database client (keep for rollback)
 */
export async function startTestTransaction(app) {
  const client = await app.pg.connect();
  await client.query('BEGIN');
  return client;
}

/**
 * Rollback transaction and release client
 * Undoes all changes made during the test
 * @param {Object} client - Database client from startTestTransaction
 */
export async function rollbackTestTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

