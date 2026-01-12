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
 * Run migrations with pg-mem compatibility fixes
 * Replaces DECIMAL with NUMERIC for pg-mem support
 */
async function runMigrationsForTests(fastify) {
  const client = await fastify.pg.connect();

  try {
    // Read migration files
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, "../db/migrations");
    
    // Get all migration files sorted by name
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Execute each migration
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      let migrationSQL = fs.readFileSync(migrationPath, "utf8");
      
      // Fix pg-mem compatibility: replace DECIMAL with NUMERIC
      migrationSQL = migrationSQL.replace(/DECIMAL\((\d+),\s*(\d+)\)/gi, 'NUMERIC($1, $2)');
      
      await client.query(migrationSQL);
    }
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

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
  // Note: We need to modify migrations for pg-mem compatibility
  await runMigrationsForTests(app);

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

