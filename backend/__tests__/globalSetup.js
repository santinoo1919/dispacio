/**
 * Jest global setup - runs ONCE before all tests
 * Sets up database schema (migrations) for all tests
 * 
 * This runs in a single process before Jest workers start,
 * so no race conditions or locking needed!
 */

import Fastify from 'fastify';
import { registerDatabase } from '../db/connection.js';

export default async function globalSetup() {
  console.log('Running database migrations for tests...');
  
  const app = Fastify({ logger: false });
  
  try {
    // Connect to test database
    await registerDatabase(app);
    
    // Run migrations ONCE for all tests
    // Skip infrastructure migrations (users, permissions)
    const client = await app.pg.connect();
    try {
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
      const infrastructureMigrations = ['004_create_app_user.sql'];
      
      // Get all migration files sorted by name
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();
      
      // Execute each migration (skip infrastructure migrations)
      for (const file of migrationFiles) {
        // Skip infrastructure migrations
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
        
        // Run migration - IF NOT EXISTS handles idempotency
        await client.query(migrationSQL);
        console.log(`  ✓ Migration ${file} applied`);
      }
      
      console.log('Database migrations completed successfully!');
    } finally {
      client.release();
    }
  } finally {
    await app.close();
  }
}

