/**
 * Books Repository Tests
 *
 * Tests for the BooksRepository to ensure
 * book-specific operations work correctly.
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

import { BooksRepository } from '../books.repository.js';

describe('BooksRepository', () => {
  let repository: BooksRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  const createMockBookRow = (overrides = {}) => ({
    id: 'book-123',
    project_id: 'project-1',
    book_number: 1,
    title: 'The First Book',
    status: 'setup',
    word_count: 50000,
    ending_state: JSON.stringify({
      characters: [],
      world: {},
      timeline: 'End of Year 1',
      unresolved: [],
    }),
    book_summary: 'A compelling story about...',
    timeline_end: 'End of Year 1',
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

    repository = new BooksRepository(mockDb);
  });

  describe('findByIdParsed', () => {
    it('should return parsed book with JSON fields', () => {
      const row = createMockBookRow();
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('book-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('book-123');
      expect(result?.ending_state).toEqual({
        characters: [],
        world: {},
        timeline: 'End of Year 1',
        unresolved: [],
      });
    });

    it('should handle null ending_state', () => {
      const row = createMockBookRow({ ending_state: null });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('book-123');

      expect(result?.ending_state).toBeNull();
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findByIdParsed('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return all books for a project', () => {
      const rows = [
        createMockBookRow({ id: 'book-1', book_number: 1 }),
        createMockBookRow({ id: 'book-2', book_number: 2 }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByProjectId('project-1');

      expect(result).toHaveLength(2);
    });

    it('should order by book_number by default', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findByProjectId('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY book_number ASC')
      );
    });
  });

  describe('findByProjectAndNumber', () => {
    it('should find book by project and number', () => {
      const row = createMockBookRow({ book_number: 2 });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByProjectAndNumber('project-1', 2);

      expect(mockStatement.get).toHaveBeenCalledWith('project-1', 2);
      expect(result?.book_number).toBe(2);
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findByProjectAndNumber('project-1', 99);

      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return books by status', () => {
      const rows = [createMockBookRow({ status: 'generating' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByStatus('generating');

      expect(mockStatement.all).toHaveBeenCalledWith('generating');
    });
  });

  describe('findWithChapterCounts', () => {
    it('should return books with chapter counts', () => {
      const rows = [
        { ...createMockBookRow(), chapter_count: 15, completed_chapters: 10 },
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findWithChapterCounts('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(c.id) as chapter_count')
      );
      expect(result[0].chapter_count).toBe(15);
      expect(result[0].completed_chapters).toBe(10);
    });
  });

  describe('getNextBookNumber', () => {
    it('should return next book number', () => {
      mockStatement.get.mockReturnValue({ next_number: 4 });

      const result = repository.getNextBookNumber('project-1');

      expect(result).toBe(4);
    });

    it('should return 1 for first book', () => {
      mockStatement.get.mockReturnValue({ next_number: 1 });

      const result = repository.getNextBookNumber('project-1');

      expect(result).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update book status', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow({ status: 'completed' }));

      const result = repository.updateStatus('book-123', 'completed');

      expect(result).toBe(true);
    });
  });

  describe('updateWordCount', () => {
    it('should update word count', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow({ word_count: 75000 }));

      const result = repository.updateWordCount('book-123', 75000);

      expect(result).toBe(true);
    });
  });

  describe('recalculateWordCount', () => {
    it('should recalculate from chapters and update', () => {
      mockStatement.get.mockReturnValueOnce({ total: 80000 });
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow({ word_count: 80000 }));

      const result = repository.recalculateWordCount('book-123');

      expect(result).toBe(80000);
    });
  });

  describe('updateEndingState', () => {
    it('should update ending state as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow());

      const endingState = {
        characters: [{ characterId: '1', characterName: 'Hero' }],
        world: { politicalChanges: [] },
        timeline: 'End of Year 2',
        unresolved: ['Mystery remains'],
      };

      const result = repository.updateEndingState('book-123', endingState as any);

      expect(result).toBe(true);
    });
  });

  describe('updateBookSummary', () => {
    it('should update book summary', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow());

      const result = repository.updateBookSummary('book-123', 'New summary');

      expect(result).toBe(true);
    });
  });

  describe('updateTimelineEnd', () => {
    it('should update timeline end', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockBookRow());

      const result = repository.updateTimelineEnd('book-123', 'End of Year 3');

      expect(result).toBe(true);
    });
  });

  describe('getTotalWordCountForProject', () => {
    it('should return total word count', () => {
      mockStatement.get.mockReturnValue({ total: 250000 });

      const result = repository.getTotalWordCountForProject('project-1');

      expect(result).toBe(250000);
    });
  });

  describe('getBookCountForProject', () => {
    it('should return book count', () => {
      mockStatement.get.mockReturnValue({ count: 3 });

      const result = repository.getBookCountForProject('project-1');

      expect(result).toBe(3);
    });
  });

  describe('isLastBook', () => {
    it('should return true for last book', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockBookRow({ book_number: 3 }))
        .mockReturnValueOnce({ max_number: 3 });

      const result = repository.isLastBook('book-123');

      expect(result).toBe(true);
    });

    it('should return false for non-last book', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockBookRow({ book_number: 1 }))
        .mockReturnValueOnce({ max_number: 3 });

      const result = repository.isLastBook('book-123');

      expect(result).toBe(false);
    });

    it('should return false when book not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.isLastBook('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getPreviousBook', () => {
    it('should return previous book', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockBookRow({ book_number: 2, project_id: 'project-1' }))
        .mockReturnValueOnce(createMockBookRow({ book_number: 1 }));

      const result = repository.getPreviousBook('book-123');

      expect(result?.book_number).toBe(1);
    });

    it('should return null for first book', () => {
      mockStatement.get.mockReturnValue(createMockBookRow({ book_number: 1 }));

      const result = repository.getPreviousBook('book-123');

      expect(result).toBeNull();
    });
  });

  describe('getNextBook', () => {
    it('should return next book', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockBookRow({ book_number: 1, project_id: 'project-1' }))
        .mockReturnValueOnce(createMockBookRow({ book_number: 2 }));

      const result = repository.getNextBook('book-123');

      expect(result?.book_number).toBe(2);
    });

    it('should return null for last book', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockBookRow({ book_number: 3 }))
        .mockReturnValueOnce(undefined);

      const result = repository.getNextBook('book-123');

      expect(result).toBeNull();
    });
  });

  describe('getBookStats', () => {
    it('should return book statistics', () => {
      mockStatement.get.mockReturnValue({
        total_chapters: 20,
        completed_chapters: 18,
        pending_chapters: 2,
        word_count: 60000,
      });

      const result = repository.getBookStats('book-123');

      expect(result).toEqual({
        totalChapters: 20,
        completedChapters: 18,
        pendingChapters: 2,
        wordCount: 60000,
      });
    });

    it('should handle empty book', () => {
      mockStatement.get.mockReturnValue(null);

      const result = repository.getBookStats('book-123');

      expect(result).toEqual({
        totalChapters: 0,
        completedChapters: 0,
        pendingChapters: 0,
        wordCount: 0,
      });
    });
  });

  describe('deleteWithCascade', () => {
    it('should delete book and chapters in transaction', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const transactionFn = jest.fn((fn: () => any) => () => fn());
      mockDb.transaction = transactionFn;

      repository = new BooksRepository(mockDb);

      const result = repository.deleteWithCascade('book-123');

      expect(transactionFn).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
