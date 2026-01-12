/**
 * In-memory PostgreSQL database for tests using pg-mem
 * No real PostgreSQL installation needed!
 */

import { newDb } from 'pg-mem';
import postgres from '@fastify/postgres';

/**
 * Register in-memory PostgreSQL database with Fastify
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function registerTestDatabase(fastify) {
  // Create in-memory database
  const mem = newDb();
  
  // Enable UUID extension (needed for gen_random_uuid())
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
  });

  // Get pg adapter from pg-mem - this provides the connection
  const pgAdapter = mem.adapters.createPg();
  
  // pg-mem provides a connection string that works with pg library
  const connectionString = pgAdapter.connectionString;

  // Register with Fastify using the in-memory connection
  await fastify.register(postgres, {
    connectionString,
    // Minimal pool settings for tests
    max: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 1000,
  });

  // Store the mem database instance for potential future use
  fastify.pgMem = mem;
  
  fastify.log?.info('In-memory PostgreSQL database initialized (pg-mem)');
}

