/**
 * Jest setup file for backend tests
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs in tests

// Set test database URL if not already set
// Defaults to test database (used in CI with PostgreSQL service)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/dispacio_test';
}

// Note: We use pg-mem (in-memory database) for tests
// No real PostgreSQL database needed!
// DATABASE_URL is ignored when using pg-mem

