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

describe('Pen Names Router - Portfolio Endpoints', () => {
  let app: express.Application;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;

  const mockUserId = 'owner';
  const mockPenNameId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '987fcdeb-51a2-43e1-a123-123456789abc';
  const mockBookId = '456e7890-e12b-34d5-a678-901234567def';
  const mockDate = '2024-01-15T10:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock functions for each test
    mockGet = jest.fn();
    mockAll = jest.fn();

    // Configure db.prepare to return our mocked statement
    mockDb.prepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/pen-names', penNamesRouter);
  });

  describe('GET /api/pen-names/:id/books', () => {
    const mockProject = {
      id: mockProjectId,
      title: 'The Mystery Series',
      type: 'series',
      genre: 'Mystery',
      status: 'active',
      book_count: 2,
      created_at: mockDate,
      updated_at: mockDate,
    };

    const mockBook = {
      id: mockBookId,
      project_id: mockProjectId,
      book_number: 1,
      title: 'The First Mystery',
      status: 'writing',
      word_count: 50000,
      created_at: mockDate,
      updated_at: mockDate,
    };

    it('should return all books for a pen name', async () => {
      mockGet.mockReturnValueOnce({ id: mockPenNameId }); // Pen name exists
      mockAll
        .mockReturnValueOnce([mockProject]) // Projects query
        .mockReturnValueOnce([mockBook]); // Books query for project

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(200);

      expect(response.body).toHaveProperty('pen_name_id', mockPenNameId);
      expect(response.body).toHaveProperty('projects');
      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].title).toBe('The Mystery Series');
      expect(response.body.projects[0].books).toHaveLength(1);
      expect(response.body.projects[0].books[0].title).toBe('The First Mystery');
      expect(response.body).toHaveProperty('total_projects', 1);
      expect(response.body).toHaveProperty('total_books', 1);
    });

    it('should return enriched projects with books', async () => {
      const secondBook = {
        ...mockBook,
        id: 'book-2-id',
        book_number: 2,
        title: 'The Second Mystery',
      };

      mockGet.mockReturnValueOnce({ id: mockPenNameId });
      mockAll
        .mockReturnValueOnce([mockProject])
        .mockReturnValueOnce([mockBook, secondBook]);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(200);

      expect(response.body.projects[0].books).toHaveLength(2);
      expect(response.body.total_books).toBe(2);
      expect(response.body.projects[0].books[0].book_number).toBe(1);
      expect(response.body.projects[0].books[1].book_number).toBe(2);
    });

    it('should handle multiple projects with multiple books', async () => {
      const secondProject = {
        ...mockProject,
        id: 'project-2-id',
        title: 'The Thriller Series',
        genre: 'Thriller',
      };

      mockGet.mockReturnValueOnce({ id: mockPenNameId });
      mockAll
        .mockReturnValueOnce([mockProject, secondProject])
        .mockReturnValueOnce([mockBook]) // Books for first project
        .mockReturnValueOnce([{ ...mockBook, id: 'book-2-id' }]); // Books for second project

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(200);

      expect(response.body.projects).toHaveLength(2);
      expect(response.body.total_projects).toBe(2);
      expect(response.body.total_books).toBe(2);
    });

    it('should return empty arrays when pen name has no projects', async () => {
      mockGet.mockReturnValueOnce({ id: mockPenNameId });
      mockAll.mockReturnValueOnce([]);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(200);

      expect(response.body.projects).toHaveLength(0);
      expect(response.body.total_projects).toBe(0);
      expect(response.body.total_books).toBe(0);
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockReturnValueOnce({ id: mockPenNameId });
      mockAll.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/books`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database query failed');
    });
  });

  describe('GET /api/pen-names/:id/stats', () => {
    const mockStats = {
      project_count: 5,
      total_word_count: 250000,
      book_count: 8,
    };

    const mockSeriesCount = {
      series_count: 2,
    };

    const mockGenreStats = [
      { genre: 'Mystery', count: 3, word_count: 150000 },
      { genre: 'Thriller', count: 2, word_count: 100000 },
    ];

    const mockYearStats = [
      { year: '2024', count: 3, word_count: 150000 },
      { year: '2023', count: 2, word_count: 100000 },
    ];

    const mockStatusStats = [
      { status: 'active', count: 3 },
      { status: 'planning', count: 2 },
    ];

    const mockChaptersCount = {
      completed_chapters: 45,
    };

    it('should return comprehensive statistics for a pen name', async () => {
      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce(mockGenreStats) // by_genre
        .mockReturnValueOnce(mockYearStats) // by_year
        .mockReturnValueOnce(mockStatusStats); // by_status

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(mockStats) // projectStats
        .mockReturnValueOnce(mockSeriesCount) // seriesCount
        .mockReturnValueOnce(mockChaptersCount); // chaptersCount

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('pen_name_id', mockPenNameId);
      expect(response.body).toHaveProperty('pen_name', 'Jane Austen');
      expect(response.body).toHaveProperty('book_count', 8);
      expect(response.body).toHaveProperty('project_count', 5);
      expect(response.body).toHaveProperty('word_count', 250000);
      expect(response.body).toHaveProperty('series_count', 2);
      expect(response.body).toHaveProperty('completed_chapters', 45);
      expect(response.body).toHaveProperty('by_genre');
      expect(response.body).toHaveProperty('by_year');
      expect(response.body).toHaveProperty('by_status');
    });

    it('should return genre breakdown correctly', async () => {
      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce(mockGenreStats)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(mockStats)
        .mockReturnValueOnce(mockSeriesCount)
        .mockReturnValueOnce(mockChaptersCount);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.by_genre).toHaveLength(2);
      expect(response.body.by_genre[0]).toEqual({
        genre: 'Mystery',
        count: 3,
        word_count: 150000,
      });
      expect(response.body.by_genre[1]).toEqual({
        genre: 'Thriller',
        count: 2,
        word_count: 100000,
      });
    });

    it('should return year breakdown correctly', async () => {
      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce(mockYearStats)
        .mockReturnValueOnce([]);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(mockStats)
        .mockReturnValueOnce(mockSeriesCount)
        .mockReturnValueOnce(mockChaptersCount);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.by_year).toHaveLength(2);
      expect(response.body.by_year[0]).toEqual({
        year: '2024',
        count: 3,
        word_count: 150000,
      });
      expect(response.body.by_year[1]).toEqual({
        year: '2023',
        count: 2,
        word_count: 100000,
      });
    });

    it('should return status breakdown correctly', async () => {
      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce(mockStatusStats);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(mockStats)
        .mockReturnValueOnce(mockSeriesCount)
        .mockReturnValueOnce(mockChaptersCount);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.by_status).toHaveLength(2);
      expect(response.body.by_status[0]).toEqual({
        status: 'active',
        count: 3,
      });
      expect(response.body.by_status[1]).toEqual({
        status: 'planning',
        count: 2,
      });
    });

    it('should handle zero statistics gracefully', async () => {
      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.book_count).toBe(0);
      expect(response.body.project_count).toBe(0);
      expect(response.body.word_count).toBe(0);
      expect(response.body.series_count).toBe(0);
      expect(response.body.completed_chapters).toBe(0);
      expect(response.body.by_genre).toEqual([]);
      expect(response.body.by_year).toEqual([]);
      expect(response.body.by_status).toEqual([]);
    });

    it('should return 404 when pen name is not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toBe('Pen name not found');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database query failed');
    });

    it('should handle null word counts correctly', async () => {
      const statsWithNullWordCount = {
        ...mockStats,
        total_word_count: null,
      };

      const genreStatsWithNull = [
        { genre: 'Mystery', count: 3, word_count: null },
      ];

      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Jane Austen',
      });

      mockAll
        .mockReturnValueOnce(genreStatsWithNull)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Jane Austen' })
        .mockReturnValueOnce(statsWithNullWordCount)
        .mockReturnValueOnce(mockSeriesCount)
        .mockReturnValueOnce(mockChaptersCount);

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.word_count).toBe(0);
      expect(response.body.by_genre[0].word_count).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid pen name ID format gracefully', async () => {
      mockGet.mockReturnValue(null);

      await request(app)
        .get('/api/pen-names/invalid-id/books')
        .expect(404);
    });

    it('should handle very large word counts', async () => {
      const largeStats = {
        project_count: 100,
        total_word_count: 10000000,
        book_count: 250,
      };

      mockGet.mockReturnValueOnce({
        id: mockPenNameId,
        pen_name: 'Prolific Author',
      });

      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      mockGet
        .mockReturnValueOnce({ id: mockPenNameId, pen_name: 'Prolific Author' })
        .mockReturnValueOnce(largeStats)
        .mockReturnValueOnce({ series_count: 0 })
        .mockReturnValueOnce({ completed_chapters: 0 });

      const response = await request(app)
        .get(`/api/pen-names/${mockPenNameId}/stats`)
        .expect(200);

      expect(response.body.word_count).toBe(10000000);
      expect(response.body.project_count).toBe(100);
      expect(response.body.book_count).toBe(250);
    });
  });
});
