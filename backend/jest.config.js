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
  
  // Test timeout (some tests may need more time for DB operations)
  testTimeout: 10000
};

