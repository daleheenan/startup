import { jest } from '@jest/globals';

// Mock database connection for tests
// Provides sensible defaults that can be overridden per-test using mockReturnValue or mockImplementation
const mockDb = {
  prepare: jest.fn(() => ({
    run: jest.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
    get: jest.fn(() => ({ test: 1 })), // Default return value for health checks etc.
    all: jest.fn(() => []),
    bind: jest.fn(function(this: any) { return this; }),
  })),
  exec: jest.fn(),
  transaction: jest.fn((fn: Function) => fn),
  close: jest.fn(),
};

export default mockDb;
