module.exports = {
  // Use node environment (not jsdom - we're testing pure functions)
  testEnvironment: 'node',
  
  // Test file patterns - only .test.ts files (no .tsx for React components)
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  
  // Module path mapping to match tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/ios/',
    '/android/',
    '/web-build/'
  ],
  
  // Don't transform node_modules except for specific packages that need it
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|papaparse))'
  ],
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Coverage settings (optional, can be enabled later)
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true
};

