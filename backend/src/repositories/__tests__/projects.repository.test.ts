/**
 * Projects Repository Tests
 *
 * Tests for the ProjectsRepository to ensure
 * project-specific operations work correctly.
 */

import { jest } from '@jest/globals';

// Mock the database connection
jest.mock('../../db/connection.js', () => ({
  default: {
    prepare: jest.fn(),
    exec: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock the query monitor
jest.mock('../../db/query-monitor.js', () => ({
  queryMonitor: {
    wrapSync: jest.fn((sql: string, operation: () => any) => ({
      result: operation(),
      executionTimeMs: 0,
      isSlow: false,
    })),
  },
}));

// Mock the logger
jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { ProjectsRepository } from '../projects.repository.js';

describe('ProjectsRepository', () => {
  let repository: ProjectsRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  const createMockProjectRow = (overrides = {}) => ({
    id: 'project-123',
    title: 'Test Novel',
    type: 'standalone',
    genre: 'Fantasy',
    status: 'setup',
    story_dna: JSON.stringify({ genre: 'Fantasy', subgenre: 'Epic' }),
    story_bible: JSON.stringify({ characters: [], world: {}, timeline: [] }),
    series_bible: null,
    book_count: 1,
    universe_id: null,
    is_universe_root: 0,
    plot_structure: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockStatement = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
    };

    mockPrepare = jest.fn().mockReturnValue(mockStatement);

    mockDb = {
      prepare: mockPrepare,
      exec: jest.fn(),
      transaction: jest.fn((fn: () => any) => () => fn()),
    };

    repository = new ProjectsRepository(mockDb);
  });

  describe('findByIdParsed', () => {
    it('should return parsed project with JSON fields', () => {
      const row = createMockProjectRow();
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('project-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('project-123');
      expect(result?.story_dna).toEqual({ genre: 'Fantasy', subgenre: 'Epic' });
      expect(result?.is_universe_root).toBe(false);
    });

    it('should handle null JSON fields', () => {
      const row = createMockProjectRow({
        story_dna: null,
        story_bible: null,
        series_bible: null,
      });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('project-123');

      expect(result?.story_dna).toBeNull();
      expect(result?.story_bible).toBeNull();
      expect(result?.series_bible).toBeNull();
    });

    it('should convert is_universe_root to boolean', () => {
      const row = createMockProjectRow({ is_universe_root: 1 });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('project-123');

      expect(result?.is_universe_root).toBe(true);
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findByIdParsed('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAllParsed', () => {
    it('should return all projects with parsed JSON', () => {
      const rows = [
        createMockProjectRow({ id: 'project-1' }),
        createMockProjectRow({ id: 'project-2' }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findAllParsed();

      expect(result).toHaveLength(2);
      expect(result[0].story_dna).toEqual({ genre: 'Fantasy', subgenre: 'Epic' });
    });
  });

  describe('findByStatus', () => {
    it('should return projects by status', () => {
      const rows = [createMockProjectRow({ status: 'generating' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByStatus('generating');

      expect(mockStatement.all).toHaveBeenCalledWith('generating');
      expect(result[0].status).toBe('generating');
    });
  });

  describe('findByType', () => {
    it('should return projects by type', () => {
      const rows = [createMockProjectRow({ type: 'trilogy' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByType('trilogy');

      expect(mockStatement.all).toHaveBeenCalledWith('trilogy');
      expect(result[0].type).toBe('trilogy');
    });
  });

  describe('findByGenre', () => {
    it('should return projects by genre', () => {
      const rows = [createMockProjectRow({ genre: 'Sci-Fi' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByGenre('Sci-Fi');

      expect(mockStatement.all).toHaveBeenCalledWith('Sci-Fi');
    });
  });

  describe('findByUniverseId', () => {
    it('should return projects by universe', () => {
      const rows = [createMockProjectRow({ universe_id: 'universe-1' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByUniverseId('universe-1');

      expect(mockStatement.all).toHaveBeenCalledWith('universe-1');
    });
  });

  describe('findRecentlyUpdated', () => {
    it('should return recently updated projects', () => {
      const rows = [createMockProjectRow()];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findRecentlyUpdated(5);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at DESC')
      );
    });
  });

  describe('findWithBookCounts', () => {
    it('should return projects with actual book counts', () => {
      const rows = [
        { ...createMockProjectRow(), actual_book_count: 3 },
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findWithBookCounts();

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(b.id) as actual_book_count')
      );
      expect(result[0].actual_book_count).toBe(3);
    });
  });

  describe('updateStoryDNA', () => {
    it('should update story DNA as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow());

      const newDNA = { genre: 'Sci-Fi', subgenre: 'Space Opera' };
      const result = repository.updateStoryDNA('project-123', newDNA);

      expect(result).toBe(true);
    });
  });

  describe('updateStoryBible', () => {
    it('should update story bible as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow());

      const result = repository.updateStoryBible('project-123', { characters: [] });

      expect(result).toBe(true);
    });
  });

  describe('updateSeriesBible', () => {
    it('should update series bible as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow());

      const result = repository.updateSeriesBible('project-123', { themes: [] });

      expect(result).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update project status', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow({ status: 'completed' }));

      const result = repository.updateStatus('project-123', 'completed');

      expect(result).toBe(true);
    });
  });

  describe('linkToUniverse', () => {
    it('should link project to universe', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow({ universe_id: 'universe-1' }));

      const result = repository.linkToUniverse('project-123', 'universe-1');

      expect(result).toBe(true);
    });
  });

  describe('setAsUniverseRoot', () => {
    it('should set project as universe root', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow({ is_universe_root: 1 }));

      const result = repository.setAsUniverseRoot('project-123', true);

      expect(result).toBe(true);
    });

    it('should unset project as universe root', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockProjectRow({ is_universe_root: 0 }));

      const result = repository.setAsUniverseRoot('project-123', false);

      expect(result).toBe(true);
    });
  });

  describe('getTotalWordCount', () => {
    it('should return total word count from books', () => {
      mockStatement.get.mockReturnValue({ total: 75000 });

      const result = repository.getTotalWordCount('project-123');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SUM(word_count)')
      );
      expect(result).toBe(75000);
    });

    it('should return 0 when no books', () => {
      mockStatement.get.mockReturnValue({ total: 0 });

      const result = repository.getTotalWordCount('project-123');

      expect(result).toBe(0);
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', () => {
      mockStatement.get.mockReturnValue({
        total_books: 3,
        total_chapters: 45,
        total_word_count: 150000,
        completed_chapters: 40,
      });

      const result = repository.getProjectStats('project-123');

      expect(result).toEqual({
        totalBooks: 3,
        totalChapters: 45,
        totalWordCount: 150000,
        completedChapters: 40,
      });
    });

    it('should handle empty project', () => {
      mockStatement.get.mockReturnValue(null);

      const result = repository.getProjectStats('empty-project');

      expect(result).toEqual({
        totalBooks: 0,
        totalChapters: 0,
        totalWordCount: 0,
        completedChapters: 0,
      });
    });
  });

  describe('searchByTitle', () => {
    it('should search projects by title', () => {
      const rows = [createMockProjectRow({ title: 'The Dark Tower' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.searchByTitle('Tower');

      expect(mockStatement.all).toHaveBeenCalledWith('%Tower%');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDistinctGenres', () => {
    it('should return list of unique genres', () => {
      mockStatement.all.mockReturnValue([
        { genre: 'Fantasy' },
        { genre: 'Romance' },
        { genre: 'Sci-Fi' },
      ]);

      const result = repository.getDistinctGenres();

      expect(result).toEqual(['Fantasy', 'Romance', 'Sci-Fi']);
    });
  });
});
