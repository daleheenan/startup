// Test setup file (CommonJS)

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ANTHROPIC_API_KEY = 'test-api-key';

// Set longer timeout for tests
jest.setTimeout(10000);

// Mock uuid module (ESM-only) to work with Jest's CommonJS environment
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
}));

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};
