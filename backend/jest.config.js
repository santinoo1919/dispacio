export default {
  // Support ES modules (automatically inferred from package.json "type": "module")
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  
  // Transform ES modules - Jest needs this for ES modules
  transform: {},
  
  // Module resolution
  moduleNameMapper: {},
  
  // Run migrations ONCE before all tests (no race conditions!)
  // Use file:// URL for ES modules
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Coverage settings
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    '!routes/**/__tests__/**',
    '!services/**/__tests__/**'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Run tests sequentially for database tests (more reliable, avoids connection pool issues)
  // Database integration tests benefit from sequential execution to prevent:
  // - Connection pool exhaustion
  // - Hanging tests due to unclosed connections
  // - Race conditions in database cleanup
  maxWorkers: 1,
  
  // Test timeout (some tests may need more time for DB operations)
  testTimeout: 10000
};

