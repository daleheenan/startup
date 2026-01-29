import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions at module scope
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn();

// Configure mockPrepare to always return the statement methods
mockPrepare.mockReturnValue({
  get: mockGet,
  all: mockAll,
  run: mockRun,
});

// Mock database connection
jest.mock('../../db/connection.js', () => {
  const mockDb = {
    prepare: mockPrepare,
  };
  return {
    __esModule: true,
    default: mockDb,
  };
});

// Mock cache service
jest.mock('../../services/cache.service.js', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
}));

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import userSettingsRouter from '../user-settings.js';
import { cache } from '../../services/cache.service.js';

describe('User Settings Router - Preferences', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear();

    // Ensure mockPrepare returns the statement methods
    mockPrepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Reset cache mock
    (cache.get as jest.Mock).mockReturnValue(null);
    (cache.set as jest.Mock).mockImplementation(() => {});
    (cache.invalidate as jest.Mock).mockImplementation(() => {});

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/user-settings', userSettingsRouter);
  });

  describe('GET /api/user-settings/preferences', () => {
    it('should return preferences with show_ai_costs_menu column', async () => {
      // Mock database response with the new column
      mockGet.mockReturnValue({
        prose_style: null,
        show_ai_costs_menu: 1,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body).toHaveProperty('preferences');
      expect(response.body.preferences).toHaveProperty('showAICostsMenu', true);
      expect(response.body.preferences).toHaveProperty('proseStyle', null);
    });

    it('should handle missing show_ai_costs_menu gracefully', async () => {
      // Mock database response without the column (fallback)
      mockGet.mockReturnValue({
        prose_style: null,
        show_ai_costs_menu: null,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.showAICostsMenu).toBe(false);
    });

    it('should convert show_ai_costs_menu from 1 to true', async () => {
      mockGet.mockReturnValue({
        prose_style: JSON.stringify({ name: 'Test Style' }),
        show_ai_costs_menu: 1,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.showAICostsMenu).toBe(true);
      expect(response.body.preferences.proseStyle).toEqual({ name: 'Test Style' });
    });

    it('should convert show_ai_costs_menu from 0 to false', async () => {
      mockGet.mockReturnValue({
        prose_style: null,
        show_ai_costs_menu: 0,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.showAICostsMenu).toBe(false);
    });

    it('should use cache when available', async () => {
      const cachedData = {
        preferences: {
          showAICostsMenu: true,
          proseStyle: { name: 'Cached Style' },
        },
      };
      (cache.get as jest.Mock).mockReturnValue(cachedData);

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body).toEqual(cachedData);
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it('should cache the response', async () => {
      mockGet.mockReturnValue({
        prose_style: null,
        show_ai_costs_menu: 1,
      });

      await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(cache.set).toHaveBeenCalledWith(
        'user-preferences:owner',
        expect.objectContaining({
          preferences: expect.objectContaining({
            showAICostsMenu: true,
          }),
        }),
        1800
      );
    });

    it('should return 500 when database query fails', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PATCH /api/user-settings/preferences', () => {
    it('should create new preferences row when not exists', async () => {
      mockGet.mockReturnValue(null); // No existing row
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: true })
        .expect(200);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences')
      );
    });

    it('should update existing preferences row', async () => {
      mockGet.mockReturnValueOnce({ user_id: 'owner' }); // Check returns existing row
      mockGet.mockReturnValueOnce({
        // Final SELECT returns updated values
        prose_style: null,
        show_ai_costs_menu: 1,
      });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.showAICostsMenu).toBe(true);
    });

    it('should convert boolean true to 1 for database', async () => {
      mockGet.mockReturnValueOnce(null); // No existing row
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: true })
        .expect(200);

      // Check that run was called with 1 (not true)
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs).toContain(1);
    });

    it('should convert boolean false to 0 for database', async () => {
      mockGet.mockReturnValueOnce(null); // No existing row
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: false })
        .expect(200);

      // Check that run was called with 0 (not false)
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs).toContain(0);
    });

    it('should invalidate cache after update', async () => {
      mockGet.mockReturnValueOnce({ user_id: 'owner' });
      mockGet.mockReturnValueOnce({
        prose_style: null,
        show_ai_costs_menu: 1,
      });
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: true })
        .expect(200);

      expect(cache.invalidate).toHaveBeenCalledWith('user-preferences:owner');
    });

    it('should handle database errors gracefully', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .patch('/api/user-settings/preferences')
        .send({ showAICostsMenu: true })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should ignore invalid preference fields', async () => {
      mockGet.mockReturnValueOnce({ user_id: 'owner' });
      mockGet.mockReturnValueOnce({
        prose_style: null,
        show_ai_costs_menu: 0,
      });
      mockRun.mockReturnValue({ changes: 1 });

      // Send request with invalid field
      await request(app)
        .patch('/api/user-settings/preferences')
        .send({ invalidField: 'test' })
        .expect(200);

      // Should not call UPDATE since no valid fields
      const updateCalls = mockPrepare.mock.calls.filter(call =>
        call[0]?.includes('UPDATE user_preferences')
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('Database Schema Compatibility', () => {
    it('should handle NULL values for show_ai_costs_menu', async () => {
      mockGet.mockReturnValue({
        prose_style: null,
        show_ai_costs_menu: null,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.showAICostsMenu).toBe(false);
    });

    it('should handle undefined values for show_ai_costs_menu', async () => {
      mockGet.mockReturnValue({
        prose_style: null,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.showAICostsMenu).toBe(false);
    });

    it('should parse prose_style JSON correctly', async () => {
      const proseStyle = {
        name: 'Test Style',
        formality_level: 'formal',
      };

      mockGet.mockReturnValue({
        prose_style: JSON.stringify(proseStyle),
        show_ai_costs_menu: 1,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      expect(response.body.preferences.proseStyle).toEqual(proseStyle);
    });

    it('should handle malformed prose_style JSON', async () => {
      mockGet.mockReturnValue({
        prose_style: 'invalid json{',
        show_ai_costs_menu: 1,
      });

      const response = await request(app)
        .get('/api/user-settings/preferences')
        .expect(200);

      // Should fallback to null on parse error
      expect(response.body.preferences.proseStyle).toBeNull();
    });
  });
});
