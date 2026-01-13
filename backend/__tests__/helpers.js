/**
 * Test helpers for building Fastify app with PostgreSQL test database
 * Uses real PostgreSQL - 100% compatibility, no workarounds needed!
 */

import Fastify from 'fastify';
import { registerDatabase, runMigrations } from '../db/connection.js';
import ordersRoutes from '../routes/orders.js';
import optimizeRoutes from '../routes/optimize.js';
import zonesRoutes from '../routes/zones.js';
import driversRoutes from '../routes/drivers.js';

/**
 * Run migrations for tests, skipping infrastructure migrations
 * Infrastructure migrations (users, permissions) are skipped as they:
 * - Are not needed for testing application logic
 * - Are run manually by DBA in production
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
    
    // Infrastructure migrations (users, permissions, DBA operations)
    // These are skipped in tests because:
    // 1. Not needed for testing application logic
    // 2. Run manually by DBA in production
    const infrastructureMigrations = [
      '004_create_app_user.sql', // User creation and permissions
      // Add future infrastructure migrations here:
      // '005_setup_replication.sql',
      // '006_create_backup_user.sql',
    ];
    
    // Get all migration files sorted by name
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Execute each migration (skip infrastructure migrations)
    for (const file of migrationFiles) {
      // Skip infrastructure migrations - not needed for tests
      if (infrastructureMigrations.includes(file)) {
        continue;
      }
      
      // Also skip if migration contains infrastructure operations
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");
      
      // Skip migrations with GRANT or CREATE USER (infrastructure, not schema)
      if (migrationSQL.includes('GRANT ') || migrationSQL.includes('CREATE USER')) {
        continue;
      }
      
      // No workarounds needed - real PostgreSQL supports everything!
      await client.query(migrationSQL);
    }
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Build a test Fastify app with PostgreSQL database
 * Uses real PostgreSQL - 100% compatibility, no workarounds!
 * @returns {Promise<FastifyInstance>}
 */
export async function buildTestApp() {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register PostgreSQL database (real PostgreSQL, not pg-mem)
  // Uses DATABASE_URL from environment or defaults to test database
  await registerDatabase(app);
  
  // Run migrations to set up schema
  // No workarounds needed - real PostgreSQL supports all SQL features!
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

