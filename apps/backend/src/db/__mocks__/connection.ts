import { jest } from '@jest/globals';

// Mock database connection for testing
const mockDb = {
  prepare: jest.fn(() => ({
    get: jest.fn(),
    all: jest.fn(() => []),
    run: jest.fn(() => ({ changes: 1 })),
  })),
  transaction: jest.fn((fn: any) => fn),
  pragma: jest.fn(),
  exec: jest.fn(),
  close: jest.fn(),
};

export default mockDb;
