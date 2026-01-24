// Mock Claude service for tests
export const claudeService = {
  createCompletion: jest.fn(),
  streamCompletion: jest.fn(),
};

export default claudeService;
