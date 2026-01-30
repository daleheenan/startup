import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock database with simple object that we can control
const mockDb = {
  prepare: jest.fn(),
};

// Mock database connection
jest.mock('../../../db/connection.js', () => mockDb);

// Mock logger to prevent console output
jest.mock('../../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Import router after mocks
import penNamesRouter from '../index.js';

describe('Pen Names Router - CRUD Operations', () => {
  let app: express.Application;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;
  let mockRun: jest.Mock;

  const mockUserId = 'owner';
  const mockPenNameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDate = '2024-01-15T10:00:00.000Z';

  const mockPenName = {
    id: mockPenNameId,
    user_id: mockUserId,
    pen_name: 'Jane Austen',
    display_name: 'J. Austen',
    bio: 'A classic author',
    bio_short: 'Classic writer',
    website: 'https://janeausten.com',
    social_media: JSON.stringify({
      twitter: '@janeausten',
      facebook: 'janeausten',
    }),
    genres: JSON.stringify(['Romance', 'Historical']),
    is_public: 1,
    is_default: 1,
    photo: null,
    photo_type: null,
    deleted_at: null,
    created_at: mockDate,
    updated_at: mockDate,
    book_count: 3,
    word_count: 150000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock functions for each test
    mockGet = jest.fn();
    mockAll = jest.fn();
    mockRun = jest.fn();

    // Set default behaviour
    mockGet.mockReturnValue(mockPenName);
    mockAll.mockReturnValue([]);
    mockRun.mockReturnValue({ changes: 1 });

    // Configure db.prepare to return our mocked statement
    mockDb.prepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/pen-names', penNamesRouter);
  });

  describe('GET /api/pen-names', () => {
    it('should return all pen names for the user', async () => {
      const mockPenNames = [
        mockPenName,
        {
          ...mockPenName,
          id: 'pen-name-2-id',
          pen_name: 'Agatha Christie',
          is_default: 0,
        },
      ];

      mockAll.mockReturnValue(mockPenNames);

      const response = await request(app)
        .get('/api/pen-names')
        .expect(200);

      expect(response.body).toHaveProperty('penNames');
      expect(response.body.penNames).toHaveLength(2);
      expect(response.body.penNames[0].pen_name).toBe('Jane Austen');
      expect(response.body.penNames[1].pen_name).toBe('Agatha Christie');
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockAll).toHaveBeenCalledWith(mockUserId);
    });

    it('should parse JSON fields correctly', async () => {
      mockAll.mockReturnValue([mockPenName]);

      const response = await request(app)
        .get('/api/pen-names')
        .expect(200);

      expect(response.body.penNames[0].social_media).toEqual({
        twitter: '@janeausten',
        facebook: 'janeausten',
      });
      expect(response.body.penNames[0].genres).toEqual(['Romance', 'Historical']);
    });

    it('should convert is_public and is_default to boolean', async () => {
      mockAll.mockReturnValue([mockPenName]);

      const response = await request(app)
        .get('/api/pen-names')
        .expect(200);

      expect(response.body.penNames[0].is_public).toBe(true);
      expect(response.body.penNames[0].is_default).toBe(true);
    });

    it('should return empty array when user has no pen names', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/pen-names')
        .expect(200);

      expect(response.body).toHaveProperty('penNames');
      expect(response.body.penNames).toHaveLength(0);
    });

    it('should exclude soft-deleted pen names', async () => {
      const deletedPenName = {
        ...mockPenName,
        id: 'deleted-id',
        deleted_at: mockDate,
      };

      mockAll.mockReturnValue([mockPenName]);

      const response = await request(app)
        .get('/api/pen-names')
        .expect(200);

      expect(response.body.penNames).not.toContainEqual(
        expect.objectContaining({ id: 'deleted-id' })
      );
    });

    it('should return 500 on database error', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/pen-names')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });
  });

  describe('GET /api/pen-names/:id', () => {
    it('should return a specific pen name by id', async () => {
      mockGet.mockReturnValue(mockPenName);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockPenNameId);
      expect(response.body).toHaveProperty('pen_name', 'Jane Austen');
      expect(response.body).toHaveProperty('book_count', 3);
      expect(response.body).toHaveProperty('word_count', 150000);
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith(mockPenNameId, mockUserId);
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 404 when pen name is undefined', async () => {
      mockGet.mockReturnValue(undefined);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should parse JSON fields for single pen name', async () => {
      mockGet.mockReturnValue(mockPenName);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}`)
        .expect(200);

      expect(response.body.social_media).toEqual({
        twitter: '@janeausten',
        facebook: 'janeausten',
      });
      expect(response.body.genres).toEqual(['Romance', 'Historical']);
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database read error');
      });

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database read error');
    });
  });

  describe('POST /api/pen-names', () => {
    const validPenNameData = {
      pen_name: 'Emily Brontë',
      display_name: 'E. Brontë',
      bio: 'Victorian novelist',
      bio_short: 'Novelist',
      website: 'https://emilybrontë.com',
      social_media: {
        twitter: '@ebrontë',
      },
      genres: ['Gothic', 'Romance'],
      is_public: true,
      is_default: false,
    };

    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
      mockGet.mockReturnValue(null); // No existing pen name
    });

    it('should create a new pen name with valid data', async () => {
      const response = await request(app)
        .post('/api/pen-names')
        .send(validPenNameData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('pen_name', 'Emily Brontë');
      expect(response.body).toHaveProperty('display_name', 'E. Brontë');
      expect(response.body).toHaveProperty('is_default', false);
      expect(response.body).toHaveProperty('created_at');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should generate a UUID for the new pen name', async () => {
      const response = await request(app)
        .post('/api/pen-names')
        .send(validPenNameData)
        .expect(201);

      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should trim pen_name before saving', async () => {
      const dataWithSpaces = {
        ...validPenNameData,
        pen_name: '  Emily Brontë  ',
      };

      const response = await request(app)
        .post('/api/pen-names')
        .send(dataWithSpaces)
        .expect(201);

      expect(response.body.pen_name).toBe('Emily Brontë');
    });

    it('should return 400 if pen_name is missing', async () => {
      const invalidData = {
        display_name: 'E. Brontë',
      };

      const response = await request(app)
        .post('/api/pen-names')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toBe('pen_name is required');
    });

    it('should return 400 if pen_name is empty string', async () => {
      const invalidData = {
        pen_name: '',
      };

      const response = await request(app)
        .post('/api/pen-names')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if pen_name only contains whitespace', async () => {
      const invalidData = {
        pen_name: '   ',
      };

      const response = await request(app)
        .post('/api/pen-names')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if pen_name already exists', async () => {
      mockGet.mockReturnValue({ id: 'existing-id' });

      const response = await request(app)
        .post('/api/pen-names')
        .send(validPenNameData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('A pen name with this name already exists');
    });

    it('should unset other default pen names when creating a default', async () => {
      const defaultData = {
        ...validPenNameData,
        is_default: true,
      };

      await request(app)
        .post('/api/pen-names')
        .send(defaultData)
        .expect(201);

      // Check that unset default statement was called
      expect(mockRun).toHaveBeenCalledTimes(2); // Once for unset, once for insert
    });

    it('should handle UNIQUE constraint violation', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('UNIQUE constraint failed: pen_names.pen_name');
      });

      const response = await request(app)
        .post('/api/pen-names')
        .send(validPenNameData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('A pen name with this name already exists');
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const response = await request(app)
        .post('/api/pen-names')
        .send(validPenNameData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database insert failed');
    });
  });

  describe('PUT /api/pen-names/:id', () => {
    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
      mockGet.mockReturnValue({ id: mockPenNameId }); // Pen name exists
    });

    it('should update pen name', async () => {
      const updateData = {
        pen_name: 'Jane Smith',
      };

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain('Jane Smith');
      expect(callArgs).toContain(mockPenNameId);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        pen_name: 'Jane Smith',
        display_name: 'J. Smith',
        bio: 'New bio',
        website: 'https://janesmith.com',
      };

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain('Jane Smith');
      expect(callArgs).toContain('J. Smith');
      expect(callArgs).toContain('New bio');
      expect(callArgs).toContain('https://janesmith.com');
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const updateData = {
        pen_name: 'Jane Smith',
      };

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 400 if no fields provided', async () => {
      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('No valid fields to update');
    });

    it('should return 400 if new pen_name conflicts with another', async () => {
      // First call checks existence, second checks conflict
      mockGet
        .mockReturnValueOnce({ id: mockPenNameId })
        .mockReturnValueOnce({ id: 'another-id' });

      const updateData = {
        pen_name: 'Existing Name',
      };

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('A pen name with this name already exists');
    });

    it('should always update updated_at timestamp', async () => {
      const updateData = {
        pen_name: 'Updated Name',
      };

      await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(200);

      const callArgs = mockRun.mock.calls[0] as any[];
      // Check that there's an ISO date string in the call args
      const hasTimestamp = callArgs.some((arg: any) =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      );
      expect(hasTimestamp).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const updateData = {
        pen_name: 'Jane Smith',
      };

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database update failed');
    });
  });

  describe('DELETE /api/pen-names/:id', () => {
    beforeEach(() => {
      mockGet.mockReturnValue({ id: mockPenNameId }); // Pen name exists
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should soft delete a pen name successfully', async () => {
      mockGet
        .mockReturnValueOnce({ id: mockPenNameId })
        .mockReturnValueOnce({ count: 0 }); // No books assigned

      const response = await request(app)
        .delete(`/api/pen-names/${mockPenNameId}`)
        .expect(204);

      expect(response.body).toEqual({});
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .delete(`/api/pen-names/${mockPenNameId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 400 if pen name has books assigned', async () => {
      mockGet
        .mockReturnValueOnce({ id: mockPenNameId })
        .mockReturnValueOnce({ count: 3 }); // 3 books assigned

      const response = await request(app)
        .delete(`/api/pen-names/${mockPenNameId}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Cannot delete pen name with 3 book(s) assigned');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockReturnValueOnce({ id: mockPenNameId });
      mockRun.mockImplementation(() => {
        throw new Error('Database delete failed');
      });

      const response = await request(app)
        .delete(`/api/pen-names/${mockPenNameId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database delete failed');
    });
  });

  describe('PUT /api/pen-names/:id/default', () => {
    beforeEach(() => {
      mockGet.mockReturnValue({ id: mockPenNameId }); // Pen name exists
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should set pen name as default', async () => {
      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}/default`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toBe('Default pen name updated');
      expect(mockRun).toHaveBeenCalledTimes(2); // Unset others, set this one
    });

    it('should unset other defaults before setting new default', async () => {
      await request(app)
        .put(`/api/pen-names/${mockPenNameId}/default`)
        .expect(200);

      // First call unsets others, second sets this one
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}/default`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}/default`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database update failed');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post('/api/pen-names')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle empty request body in POST', async () => {
      const response = await request(app)
        .post('/api/pen-names')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty request body in PUT', async () => {
      const response = await request(app)
        .put(`/api/pen-names/${mockPenNameId}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
