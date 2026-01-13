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
 * Convert DO $$ ... END $$ blocks to regular SQL for pg-mem compatibility
 * Extracts ALTER TABLE statements from PL/pgSQL blocks
 * pg-mem doesn't support PL/pgSQL, so we convert to plain SQL
 */
function convertDoBlocksToSQL(sql) {
  // Pattern to match DO $$ BEGIN ... END $$ blocks
  // This regex captures the entire DO block and extracts the ALTER TABLE statement
  const doBlockPattern = /DO\s+\$\$\s*BEGIN\s+IF\s+NOT\s+EXISTS\s*\([^)]+\)\s+THEN\s+((?:ALTER\s+TABLE[^;]+(?:;|\n)))\s+END\s+IF;\s*END\s+\$\$/gis;
  
  return sql.replace(doBlockPattern, (match, alterTable) => {
    // Extract and clean the ALTER TABLE statement
    // Remove extra whitespace and ensure it ends with semicolon
    let stmt = alterTable.trim();
    if (!stmt.endsWith(';')) {
      stmt += ';';
    }
    return stmt;
  });
}

/**
 * Run migrations with pg-mem compatibility fixes
 * Replaces DECIMAL with NUMERIC and converts DO blocks to regular SQL
 * 
 * Separates schema migrations (tables, constraints) from infrastructure migrations (users, permissions)
 * Infrastructure migrations are skipped in tests as they:
 * - Are not needed for testing application logic
 * - Are run manually by DBA in production
 * - Contain features pg-mem doesn't support (GRANT, CREATE USER)
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
    // 3. pg-mem doesn't support GRANT/CREATE USER
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
      let migrationSQL = fs.readFileSync(migrationPath, "utf8");
      
      // Skip migrations with GRANT or CREATE USER (infrastructure, not schema)
      if (migrationSQL.includes('GRANT ') || migrationSQL.includes('CREATE USER')) {
        continue;
      }
      
      // Fix pg-mem compatibility: replace DECIMAL with NUMERIC
      migrationSQL = migrationSQL.replace(/DECIMAL\((\d+),\s*(\d+)\)/gi, 'NUMERIC($1, $2)');
      
      // Convert DO $$ ... END $$ blocks to regular SQL
      // pg-mem doesn't support PL/pgSQL, so we extract the ALTER TABLE statements
      migrationSQL = convertDoBlocksToSQL(migrationSQL);
      
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
    // Use TRUNCATE for faster, more reliable cleanup
    // CASCADE ensures foreign key constraints are handled
    // RESTART IDENTITY resets sequences (not needed for UUIDs, but good practice)
    await client.query('TRUNCATE TABLE orders, zones, vehicles, drivers RESTART IDENTITY CASCADE');
  } catch (error) {
    // If TRUNCATE fails (pg-mem might not support it), fall back to DELETE
    // Delete in reverse order of dependencies to avoid foreign key violations
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM zones');
    await client.query('DELETE FROM vehicles');
    await client.query('DELETE FROM drivers');
  } finally {
    client.release();
  }
}

