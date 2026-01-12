/**
 * In-memory PostgreSQL database for tests using pg-mem
 * No real PostgreSQL installation needed!
 */

import { newDb } from 'pg-mem';

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

  // Get pg Pool from pg-mem adapter
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  
  // Attach pg methods to Fastify (same interface as @fastify/postgres)
  fastify.decorate('pg', {
    connect: () => pool.connect(),
    query: async (text, params) => {
      const client = await pool.connect();
      try {
        return await client.query(text, params);
      } finally {
        client.release();
      }
    },
    pool: pool
  });

  // Store for cleanup if needed
  fastify.pgMem = mem;
}

