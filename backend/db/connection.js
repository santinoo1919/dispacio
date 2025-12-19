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
  });

  fastify.log.info("PostgreSQL connection pool initialized");
}

/**
 * Run database migrations
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function runMigrations(fastify) {
  const client = await fastify.pg.connect();

  try {
    // Read migration file
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.join(__dirname, "migrations", "001_initial.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute migration
    await client.query(migrationSQL);
    fastify.log.info("Database migrations executed successfully");
  } catch (error) {
    fastify.log.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}
