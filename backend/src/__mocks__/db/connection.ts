// Mock database connection for tests
const mockDb = {
  prepare: jest.fn(() => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  })),
  exec: jest.fn(),
  transaction: jest.fn((fn: Function) => fn),
  close: jest.fn(),
};

export default mockDb;
