import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions at module scope
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockClose = jest.fn();

// Configure mockPrepare to always return the statement methods
mockPrepare.mockReturnValue({
  get: mockGet,
  all: mockAll,
  run: mockRun,
});

// Mock database connection - must be before imports
jest.mock('../../db/connection.js', () => {
  const mockDb = {
    prepare: mockPrepare,
    exec: mockExec,
    close: mockClose,
  };
  return {
    __esModule: true,
    default: mockDb,
  };
});

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock server module to prevent circular dependency issues
jest.mock('../../server.js', () => ({
  isServerReady: () => true,
  isQueueWorkerReady: () => true,
}));

// Mock migrate module to prevent ESM import.meta.url issues
jest.mock('../../db/migrate.js', () => ({
  getMigrationStatus: jest.fn().mockReturnValue({
    currentVersion: 1,
    pendingMigrations: [],
    appliedMigrations: ['001_initial.sql'],
  }),
}));

// Import after mocks are set up
import healthRouter from '../health.js';

describe('Health Router', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear(); // Use mockClear instead of mockReset to preserve implementation
    mockExec.mockReset();
    mockClose.mockReset();

    // Ensure mockPrepare returns the statement methods
    mockPrepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Set default successful state
    mockGet.mockReturnValue({ test: 1 });
    mockAll.mockReturnValue([]);
    mockRun.mockReturnValue({ changes: 1 });

    // Setup Express app
    app = express();
    app.use('/api/health', healthRouter);
  });

  describe('GET /api/health', () => {
    it('should return 200 with ok status when database is healthy', async () => {
      const response = await request(app)
        .get('/api/health');

      // Debug: log response
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return 503 when database query fails', async () => {
      // Mock database failure
      mockGet.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error');
    });

    it('should return 503 when database query returns null', async () => {
      // Mock database returning no result
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body.error).toContain('no result');
    });
  });

  describe('GET /api/health/claude', () => {
    it('should return unhealthy when API key is not configured', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .get('/api/health/claude')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'API key not configured');

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should return unhealthy when API key is placeholder', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      const response = await request(app)
        .get('/api/health/claude')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'API key not configured');

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should return 503 status code when unhealthy', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      await request(app)
        .get('/api/health/claude')
        .expect(503);

      // Restore
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    });

    it('should include status field in response', async () => {
      const response = await request(app)
        .get('/api/health/claude');

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });
  });
});
