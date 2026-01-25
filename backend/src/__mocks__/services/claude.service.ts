import { jest } from '@jest/globals';

// Mock Claude service for tests
export const claudeService = {
  createCompletion: jest.fn(),
  createCompletionWithUsage: jest.fn(),
  streamCompletion: jest.fn(),
  testConnection: jest.fn(),
  getSessionStats: jest.fn(),
};

export default claudeService;
