import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { Book } from '../../shared/types/index.js';

// Mock database with a simple object that we can control
const mockDb = {
  prepare: jest.fn(),
};

// Mock database connection
jest.mock('../../db/connection.js', () => mockDb);

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock cache service
const mockCacheInvalidate = jest.fn();
jest.mock('../../services/cache.service.js', () => ({
  cache: {
    invalidate: mockCacheInvalidate,
  },
}));

// Import router after mocks
import booksRouter from '../books.js';

describe('Books Router', () => {
  let app: express.Application;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;
  let mockRun: jest.Mock;

  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBookId = '987fcdeb-51a2-43e1-a123-123456789abc';
  const mockDate = '2024-01-15T10:00:00.000Z';

  const mockBook: Book = {
    id: mockBookId,
    project_id: mockProjectId,
    book_number: 1,
    title: 'The Shadow King',
    status: 'setup',
    word_count: 0,
    ending_state: null,
    book_summary: null,
    timeline_end: null,
    created_at: mockDate,
    updated_at: mockDate,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock functions for each test
    mockGet = jest.fn();
    mockAll = jest.fn();
    mockRun = jest.fn();

    // Set default behavior
    mockGet.mockReturnValue(mockBook);
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
    app.use('/api/books', booksRouter);
  });

  describe('GET /api/books/project/:projectId', () => {
    it('should return all books for a project', async () => {
      const mockBooks = [
        mockBook,
        {
          ...mockBook,
          id: 'book-2-id',
          book_number: 2,
          title: 'The Shadow Queen',
        },
      ];

      mockAll.mockReturnValue(mockBooks);

      const response = await request(app)
        .get(`/api/books/project/${mockProjectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(response.body.books).toHaveLength(2);
      expect(response.body.books[0].title).toBe('The Shadow King');
      expect(response.body.books[1].title).toBe('The Shadow Queen');
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockAll).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty array when project has no books', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get(`/api/books/project/${mockProjectId}`)
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(response.body.books).toHaveLength(0);
    });

    it('should return books ordered by book_number ASC', async () => {
      const mockBooks = [
        { ...mockBook, book_number: 1, title: 'Book 1' },
        { ...mockBook, book_number: 2, title: 'Book 2' },
        { ...mockBook, book_number: 3, title: 'Book 3' },
      ];

      mockAll.mockReturnValue(mockBooks);

      const response = await request(app)
        .get(`/api/books/project/${mockProjectId}`)
        .expect(200);

      expect(response.body.books[0].book_number).toBe(1);
      expect(response.body.books[1].book_number).toBe(2);
      expect(response.body.books[2].book_number).toBe(3);
    });

    it('should return 500 on database error', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get(`/api/books/project/${mockProjectId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockAll.mockImplementation(() => {
        throw { some: 'object' };
      });

      const response = await request(app)
        .get(`/api/books/project/${mockProjectId}`)
        .expect(500);

      expect(response.body.error.message).toBe('Unknown error');
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return a specific book by id', async () => {
      mockGet.mockReturnValue(mockBook);

      const response = await request(app)
        .get(`/api/books/${mockBookId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', mockBookId);
      expect(response.body).toHaveProperty('title', 'The Shadow King');
      expect(response.body).toHaveProperty('project_id', mockProjectId);
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith(mockBookId);
    });

    it('should return 404 when book is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get(`/api/books/${mockBookId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Book not found');
    });

    it('should return 404 when book is undefined', async () => {
      mockGet.mockReturnValue(undefined);

      const response = await request(app)
        .get(`/api/books/${mockBookId}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database read error');
      });

      const response = await request(app)
        .get(`/api/books/${mockBookId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database read error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockGet.mockImplementation(() => {
        throw null;
      });

      const response = await request(app)
        .get(`/api/books/${mockBookId}`)
        .expect(500);

      expect(response.body.error.message).toBe('Unknown error');
    });
  });

  describe('POST /api/books', () => {
    const validBookData = {
      projectId: mockProjectId,
      title: 'New Book Title',
      bookNumber: 2,
    };

    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should create a new book with valid data', async () => {
      const response = await request(app)
        .post('/api/books')
        .send(validBookData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('project_id', mockProjectId);
      expect(response.body).toHaveProperty('title', 'New Book Title');
      expect(response.body).toHaveProperty('book_number', 2);
      expect(response.body).toHaveProperty('status', 'setup');
      expect(response.body).toHaveProperty('word_count', 0);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should create book with default book_number of 1', async () => {
      const dataWithoutBookNumber = {
        projectId: mockProjectId,
        title: 'First Book',
      };

      const response = await request(app)
        .post('/api/books')
        .send(dataWithoutBookNumber)
        .expect(201);

      expect(response.body).toHaveProperty('book_number', 1);
    });

    it('should generate a UUID for the new book', async () => {
      const response = await request(app)
        .post('/api/books')
        .send(validBookData)
        .expect(201);

      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should return 400 if projectId is missing', async () => {
      const invalidData = {
        title: 'Book Without Project',
        bookNumber: 1,
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 if projectId is not a valid UUID', async () => {
      const invalidData = {
        projectId: 'not-a-uuid',
        title: 'Book Title',
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.issues).toBeDefined();
    });

    it('should return 400 if title is missing', async () => {
      const invalidData = {
        projectId: mockProjectId,
        bookNumber: 1,
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if title is empty string', async () => {
      const invalidData = {
        projectId: mockProjectId,
        title: '',
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if title is too long', async () => {
      const invalidData = {
        projectId: mockProjectId,
        title: 'a'.repeat(501), // Max is 500
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if bookNumber is not a positive integer', async () => {
      const invalidData = {
        projectId: mockProjectId,
        title: 'Book Title',
        bookNumber: 0,
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if bookNumber is negative', async () => {
      const invalidData = {
        projectId: mockProjectId,
        title: 'Book Title',
        bookNumber: -1,
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database insert failed');
      });

      const response = await request(app)
        .post('/api/books')
        .send(validBookData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database insert failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockRun.mockImplementation(() => {
        throw { code: 'SOME_ERROR' };
      });

      const response = await request(app)
        .post('/api/books')
        .send(validBookData)
        .expect(500);

      expect(response.body.error.message).toBe('Unknown error');
    });
  });

  describe('PUT /api/books/:id', () => {
    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
      // Mock getting book for cache invalidation
      mockGet.mockReturnValue({ project_id: mockProjectId });
    });

    it('should update book title', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain('Updated Title');
      expect(callArgs).toContain(mockBookId);
    });

    it('should update book status', async () => {
      const updateData = {
        status: 'writing',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain('writing');
    });

    it('should update book word count', async () => {
      const updateData = {
        wordCount: 5000,
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain(5000);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: 'New Title',
        status: 'editing',
        wordCount: 10000,
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      const callArgs = mockRun.mock.calls[0] as any[];
      expect(callArgs).toContain('New Title');
      expect(callArgs).toContain('editing');
      expect(callArgs).toContain(10000);
    });

    it('should always update updated_at timestamp', async () => {
      const updateData = {
        title: 'Updated',
      };

      await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      const callArgs = mockRun.mock.calls[0] as any[];
      // Check that there's an ISO date string in the call args
      const hasTimestamp = callArgs.some((arg: any) =>
        typeof arg === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(arg)
      );
      expect(hasTimestamp).toBe(true);
    });

    it('should invalidate series bible cache after update', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(mockCacheInvalidate).toHaveBeenCalledWith(`series-bible:${mockProjectId}`);
    });

    it('should not invalidate cache if book not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const updateData = {
        title: 'Updated Title',
      };

      await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(404);

      expect(mockCacheInvalidate).not.toHaveBeenCalled();
    });

    it('should return 404 when book is not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Book not found');
    });

    it('should return 400 if no fields provided', async () => {
      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if title is empty', async () => {
      const updateData = {
        title: '',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if title is too long', async () => {
      const updateData = {
        title: 'a'.repeat(501),
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if status is invalid', async () => {
      const updateData = {
        status: 'invalid-status',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept all valid status values', async () => {
      const validStatuses = ['setup', 'planning', 'writing', 'editing', 'complete'];

      for (const status of validStatuses) {
        mockRun.mockReturnValue({ changes: 1 });

        await request(app)
          .put(`/api/books/${mockBookId}`)
          .send({ status })
          .expect(200);
      }

      // mockRun should have been called for each status (plus one additional call for GET during cache invalidation)
      expect(mockRun.mock.calls.length).toBeGreaterThanOrEqual(validStatuses.length);
    });

    it('should return 400 if wordCount is negative', async () => {
      const updateData = {
        wordCount: -100,
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept wordCount of 0', async () => {
      const updateData = {
        wordCount: 0,
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database update failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockRun.mockImplementation(() => {
        throw 'string error';
      });

      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error.message).toBe('Unknown error');
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete a book successfully', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(204);

      expect(response.body).toEqual({});
      expect(mockRun).toHaveBeenCalledWith(mockBookId);
    });

    it('should return 404 when book is not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Book not found');
    });

    it('should return 204 when changes is undefined (not 0)', async () => {
      // When changes is undefined, the strict equality check (=== 0) fails
      // so the route doesn't return 404, it proceeds to send 204
      mockRun.mockReturnValue({});

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database delete failed');
      });

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database delete failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockRun.mockImplementation(() => {
        throw undefined;
      });

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(500);

      expect(response.body.error.message).toBe('Unknown error');
    });

    it('should handle foreign key constraint errors', async () => {
      mockRun.mockImplementation(() => {
        const error: any = new Error('FOREIGN KEY constraint failed');
        error.code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
        throw error;
      });

      const response = await request(app)
        .delete(`/api/books/${mockBookId}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('FOREIGN KEY constraint');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express will handle this before our route
      expect(response.status).toBe(400);
    });

    it('should handle empty request body in POST', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty request body in PUT', async () => {
      const response = await request(app)
        .put(`/api/books/${mockBookId}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
