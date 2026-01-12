/**
 * Jest setup file for backend tests
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs in tests

// Note: We use pg-mem (in-memory database) for tests
// No real PostgreSQL database needed!
// DATABASE_URL is ignored when using pg-mem

