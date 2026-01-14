/**
 * PostgreSQL connection pool for Fastify
 */

import postgres from "@fastify/postgres";

/**
 * Register PostgreSQL plugin with Fastify
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function registerDatabase(fastify) {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/dispacio";

  await fastify.register(postgres, {
    connectionString,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Query protection - kill slow queries to prevent resource hogging
    query_timeout: 30000, // 30 seconds max per query
    statement_timeout: 30000, // PostgreSQL-level timeout
  });

  fastify.log.info("PostgreSQL connection pool initialized (30s query timeout)");
}

/**
 * Run database migrations with tracking
 * Tracks which migrations have been applied to prevent running them multiple times
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function runMigrations(fastify) {
  const client = await fastify.pg.connect();

  try {
    // Create migration tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Read migration files
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, "migrations");
    
    // Get all migration files sorted by name
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Get already applied migrations
    const appliedResult = await client.query("SELECT version FROM schema_migrations");
    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));

    // Execute each migration that hasn't been applied yet
    let appliedCount = 0;
    for (const file of migrationFiles) {
      // Skip if already applied
      if (appliedVersions.has(file)) {
        fastify.log.info(`Migration ${file} already applied, skipping`);
        continue;
      }

      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");
      
      // Execute migration in a transaction
      await client.query("BEGIN");
      try {
        await client.query(migrationSQL);
        // Record that this migration was applied
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        fastify.log.info(`✓ Migration ${file} applied`);
        appliedCount++;
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error(`✗ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    if (appliedCount > 0) {
      fastify.log.info(`Applied ${appliedCount} new migration(s)`);
    } else {
      fastify.log.info("All migrations up to date");
    }
  } catch (error) {
    fastify.log.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}
