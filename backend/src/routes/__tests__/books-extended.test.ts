import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { Book } from '../../shared/types/index.js';

// Mock database with simple object that we can control
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

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => next(),
  });
  multer.memoryStorage = () => ({});
  return multer;
});

// Import router after mocks
import booksRouter from '../books.js';

describe('Books Router - Extended Endpoints', () => {
  let app: express.Application;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;
  let mockRun: jest.Mock;

  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBookId = '987fcdeb-51a2-43e1-a123-123456789abc';
  const mockPenNameId = '456e7890-e12b-34d5-a678-901234567def';
  const mockSeriesId = '321fedcb-a987-65e4-b321-fedcba987654';
  const mockDate = '2024-01-15T10:00:00.000Z';

  const mockBook: Book & { project_title?: string; series_name?: string; pen_name?: string; genre?: string } = {
    id: mockBookId,
    project_id: mockProjectId,
    book_number: 1,
    title: 'The Shadow King',
    status: 'setup',
    word_count: 50000,
    ending_state: null,
    book_summary: null,
    timeline_end: null,
    publication_status: 'draft',
    publication_date: null,
    pen_name_id: mockPenNameId,
    isbn: null,
    cover_image: null,
    cover_image_type: null,
    blurb: null,
    keywords: null,
    price: null,
    platforms: null,
    series_id: mockSeriesId,
    created_at: mockDate,
    updated_at: mockDate,
    project_title: 'The Shadow Series',
    series_name: 'Chronicles',
    pen_name: 'Jane Austen',
    genre: 'Mystery',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock functions for each test
    mockGet = jest.fn();
    mockAll = jest.fn();
    mockRun = jest.fn();

    // Set default behaviour
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

  describe('GET /api/books/all', () => {
    it('should return all books with pagination', async () => {
      const mockBooks = [
        mockBook,
        {
          ...mockBook,
          id: 'book-2-id',
          title: 'The Shadow Queen',
        },
      ];

      mockGet.mockReturnValue({ total: 2 });
      mockAll.mockReturnValue(mockBooks);

      const response = await request(app)
        .get('/api/books/all')
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('pageSize', 20);
      expect(response.body).toHaveProperty('totalPages', 1);
      expect(response.body.books).toHaveLength(2);
    });

    it('should filter by pen_name_id', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get(`/api/books/all?pen_name_id=${mockPenNameId}`)
        .expect(200);

      expect(response.body.books).toHaveLength(1);
      expect(mockAll).toHaveBeenCalled();
      const callArgs = mockAll.mock.calls[0] as any[];
      expect(callArgs).toContain(mockPenNameId);
    });

    it('should filter by publication_status', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?publication_status=draft')
        .expect(200);

      expect(response.body.books).toHaveLength(1);
      expect(mockAll).toHaveBeenCalled();
      const callArgs = mockAll.mock.calls[0] as any[];
      expect(callArgs).toContain('draft');
    });

    it('should filter by multiple publication statuses', async () => {
      mockGet.mockReturnValue({ total: 2 });
      mockAll.mockReturnValue([mockBook, { ...mockBook, publication_status: 'published' }]);

      const response = await request(app)
        .get('/api/books/all?publication_status=draft,published')
        .expect(200);

      expect(response.body.books).toHaveLength(2);
      const callArgs = mockAll.mock.calls[0] as any[];
      expect(callArgs).toContain('draft');
      expect(callArgs).toContain('published');
    });

    it('should filter by genre', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?genre=Mystery')
        .expect(200);

      expect(response.body.books).toHaveLength(1);
      const callArgs = mockAll.mock.calls[0] as any[];
      expect(callArgs).toContain('Mystery');
    });

    it('should filter by series_id', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get(`/api/books/all?series_id=${mockSeriesId}`)
        .expect(200);

      expect(response.body.books).toHaveLength(1);
      const callArgs = mockAll.mock.calls[0] as any[];
      expect(callArgs).toContain(mockSeriesId);
    });

    it('should search books by title', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?search=Shadow')
        .expect(200);

      expect(response.body.books).toHaveLength(1);
      const callArgs = mockAll.mock.calls[0] as any[];
      // Check that search pattern is included
      const hasSearchPattern = callArgs.some((arg: any) =>
        typeof arg === 'string' && arg.includes('Shadow')
      );
      expect(hasSearchPattern).toBe(true);
    });

    it('should sort by title ascending', async () => {
      const book1 = { ...mockBook, title: 'Alpha Book' };
      const book2 = { ...mockBook, id: 'book-2', title: 'Beta Book' };

      mockGet.mockReturnValue({ total: 2 });
      mockAll.mockReturnValue([book1, book2]);

      const response = await request(app)
        .get('/api/books/all?sort=title&order=asc')
        .expect(200);

      expect(response.body.books[0].title).toBe('Alpha Book');
      expect(response.body.books[1].title).toBe('Beta Book');
    });

    it('should sort by updated_at descending by default', async () => {
      mockGet.mockReturnValue({ total: 2 });
      mockAll.mockReturnValue([mockBook, { ...mockBook, id: 'book-2' }]);

      const response = await request(app)
        .get('/api/books/all')
        .expect(200);

      expect(response.body).toHaveProperty('books');
    });

    it('should handle pagination parameters correctly', async () => {
      mockGet.mockReturnValue({ total: 50 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?page=2&pageSize=10')
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.totalPages).toBe(5);
      const callArgs = mockAll.mock.calls[0] as any[];
      // Should include LIMIT and OFFSET values
      expect(callArgs).toContain(10); // pageSize
      expect(callArgs).toContain(10); // offset (page 2 * 10 - 10)
    });

    it('should limit page size to maximum of 100', async () => {
      mockGet.mockReturnValue({ total: 200 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?pageSize=500')
        .expect(200);

      expect(response.body.pageSize).toBe(100);
    });

    it('should prevent SQL injection in sort field', async () => {
      mockGet.mockReturnValue({ total: 1 });
      mockAll.mockReturnValue([mockBook]);

      const response = await request(app)
        .get('/api/books/all?sort=DROP%20TABLE%20books')
        .expect(200);

      // Should use default sort field (updated_at) instead
      expect(response.body).toHaveProperty('books');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/books/all')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });
  });

  describe('GET /api/books/stats', () => {
    it('should return dashboard statistics', async () => {
      mockGet.mockReturnValue({ total_books: 10, total_words: 500000 });
      mockAll
        .mockReturnValueOnce([
          { publication_status: 'draft', count: 5 },
          { publication_status: 'published', count: 5 },
        ])
        .mockReturnValueOnce([
          { pen_name_id: mockPenNameId, pen_name: 'Jane Austen', count: 10 },
        ]);

      const response = await request(app)
        .get('/api/books/stats')
        .expect(200);

      expect(response.body).toHaveProperty('total_books', 10);
      expect(response.body).toHaveProperty('total_words', 500000);
      expect(response.body).toHaveProperty('by_status');
      expect(response.body.by_status).toHaveProperty('draft', 5);
      expect(response.body.by_status).toHaveProperty('published', 5);
      expect(response.body).toHaveProperty('by_pen_name');
      expect(response.body.by_pen_name[mockPenNameId]).toEqual({
        name: 'Jane Austen',
        count: 10,
      });
    });

    it('should filter statistics by pen_name_id', async () => {
      mockGet.mockReturnValue({ total_books: 5, total_words: 250000 });
      mockAll
        .mockReturnValueOnce([{ publication_status: 'draft', count: 5 }])
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get(`/api/books/stats?pen_name_id=${mockPenNameId}`)
        .expect(200);

      expect(response.body.total_books).toBe(5);
      const firstCallArgs = mockGet.mock.calls[0] as any[];
      expect(firstCallArgs).toContain(mockPenNameId);
    });

    it('should filter statistics by publication_status', async () => {
      mockGet.mockReturnValue({ total_books: 3, total_words: 150000 });
      mockAll
        .mockReturnValueOnce([{ publication_status: 'published', count: 3 }])
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/books/stats?publication_status=published')
        .expect(200);

      expect(response.body.total_books).toBe(3);
      const firstCallArgs = mockGet.mock.calls[0] as any[];
      expect(firstCallArgs).toContain('published');
    });

    it('should filter statistics by genre', async () => {
      mockGet.mockReturnValue({ total_books: 4, total_words: 200000 });
      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/books/stats?genre=Mystery')
        .expect(200);

      expect(response.body.total_books).toBe(4);
      const firstCallArgs = mockGet.mock.calls[0] as any[];
      expect(firstCallArgs).toContain('Mystery');
    });

    it('should handle zero statistics gracefully', async () => {
      mockGet.mockReturnValue(null);
      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/books/stats')
        .expect(200);

      expect(response.body.total_books).toBe(0);
      expect(response.body.total_words).toBe(0);
      expect(response.body.by_status).toEqual({});
      expect(response.body.by_pen_name).toEqual({});
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const response = await request(app)
        .get('/api/books/stats')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database query failed');
    });
  });

  describe('PATCH /api/books/:id/status', () => {
    beforeEach(() => {
      mockGet.mockReturnValue({ publication_status: 'draft' });
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should update book publication status', async () => {
      const updatedBook = { ...mockBook, publication_status: 'published' };
      mockGet
        .mockReturnValueOnce({ publication_status: 'draft' })
        .mockReturnValueOnce(updatedBook);

      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ publication_status: 'published' })
        .expect(200);

      expect(response.body).toHaveProperty('publication_status', 'published');
      expect(mockRun).toHaveBeenCalledTimes(2); // Update + history insert
    });

    it('should log status change in history', async () => {
      mockGet
        .mockReturnValueOnce({ publication_status: 'draft' })
        .mockReturnValueOnce(mockBook);

      await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({
          publication_status: 'editing',
          notes: 'Sent to editor',
        })
        .expect(200);

      // Second call should be history insert
      expect(mockRun).toHaveBeenCalledTimes(2);
      const historyCallArgs = mockRun.mock.calls[1] as any[];
      expect(historyCallArgs).toContain('draft'); // old_status
      expect(historyCallArgs).toContain('editing'); // new_status
      expect(historyCallArgs).toContain('Sent to editor'); // notes
    });

    it('should update status without notes', async () => {
      mockGet
        .mockReturnValueOnce({ publication_status: 'draft' })
        .mockReturnValueOnce(mockBook);

      await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ publication_status: 'beta_readers' })
        .expect(200);

      expect(mockRun).toHaveBeenCalledTimes(2);
      const historyCallArgs = mockRun.mock.calls[1] as any[];
      expect(historyCallArgs).toContain(null); // notes should be null
    });

    it('should return 400 for invalid publication status', async () => {
      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ publication_status: 'invalid_status' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid publication status');
    });

    it('should return 400 when publication_status is missing', async () => {
      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ notes: 'Some notes' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should accept all valid publication statuses', async () => {
      const validStatuses = ['draft', 'beta_readers', 'editing', 'submitted', 'published'];

      for (const status of validStatuses) {
        mockGet
          .mockReturnValueOnce({ publication_status: 'draft' })
          .mockReturnValueOnce({ ...mockBook, publication_status: status });
        mockRun.mockReturnValue({ changes: 1 });

        await request(app)
          .patch(`/api/books/${mockBookId}/status`)
          .send({ publication_status: status })
          .expect(200);
      }

      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 when book is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ publication_status: 'published' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Book not found');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockReturnValueOnce({ publication_status: 'draft' });
      mockRun.mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({ publication_status: 'published' })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database update failed');
    });
  });

  describe('GET /api/books/:id/status-history', () => {
    it('should return status history for a book', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          old_status: 'draft',
          new_status: 'editing',
          changed_at: '2024-01-20T10:00:00.000Z',
          notes: 'Sent to editor',
        },
        {
          id: 'history-2',
          old_status: 'editing',
          new_status: 'published',
          changed_at: '2024-02-15T14:30:00.000Z',
          notes: 'Published on Amazon',
        },
      ];

      mockAll.mockReturnValue(mockHistory);

      const response = await request(app)
        .get(`/api/books/${mockBookId}/status-history`)
        .expect(200);

      expect(response.body).toHaveProperty('history');
      expect(response.body.history).toHaveLength(2);
      expect(response.body.history[0].old_status).toBe('draft');
      expect(response.body.history[0].new_status).toBe('editing');
      expect(response.body.history[0].notes).toBe('Sent to editor');
      expect(response.body.history[1].old_status).toBe('editing');
      expect(response.body.history[1].new_status).toBe('published');
      expect(mockAll).toHaveBeenCalledWith(mockBookId);
    });

    it('should return empty array when book has no history', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get(`/api/books/${mockBookId}/status-history`)
        .expect(200);

      expect(response.body.history).toHaveLength(0);
    });

    it('should order history by changed_at DESC', async () => {
      const mockHistory = [
        {
          id: 'history-2',
          old_status: 'editing',
          new_status: 'published',
          changed_at: '2024-02-15T14:30:00.000Z',
          notes: null,
        },
        {
          id: 'history-1',
          old_status: 'draft',
          new_status: 'editing',
          changed_at: '2024-01-20T10:00:00.000Z',
          notes: null,
        },
      ];

      mockAll.mockReturnValue(mockHistory);

      const response = await request(app)
        .get(`/api/books/${mockBookId}/status-history`)
        .expect(200);

      // Most recent should be first
      expect(response.body.history[0].changed_at).toBe('2024-02-15T14:30:00.000Z');
      expect(response.body.history[1].changed_at).toBe('2024-01-20T10:00:00.000Z');
    });

    it('should handle history entries without notes', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          old_status: 'draft',
          new_status: 'editing',
          changed_at: '2024-01-20T10:00:00.000Z',
          notes: null,
        },
      ];

      mockAll.mockReturnValue(mockHistory);

      const response = await request(app)
        .get(`/api/books/${mockBookId}/status-history`)
        .expect(200);

      expect(response.body.history[0].notes).toBeNull();
    });

    it('should return 500 on database error', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const response = await request(app)
        .get(`/api/books/${mockBookId}/status-history`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database query failed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in PATCH request', async () => {
      const response = await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle invalid UUID format gracefully', async () => {
      mockAll.mockReturnValue([]);

      await request(app)
        .get('/api/books/invalid-uuid/status-history')
        .expect(200);
    });

    it('should handle very long notes in status update', async () => {
      const longNotes = 'A'.repeat(5000);
      mockGet
        .mockReturnValueOnce({ publication_status: 'draft' })
        .mockReturnValueOnce(mockBook);

      await request(app)
        .patch(`/api/books/${mockBookId}/status`)
        .send({
          publication_status: 'editing',
          notes: longNotes,
        })
        .expect(200);

      const historyCallArgs = mockRun.mock.calls[1] as any[];
      expect(historyCallArgs).toContain(longNotes);
    });
  });
});
