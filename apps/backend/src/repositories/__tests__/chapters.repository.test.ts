/**
 * Chapters Repository Tests
 *
 * Tests for the ChaptersRepository to ensure
 * chapter-specific operations work correctly.
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

import { ChaptersRepository } from '../chapters.repository.js';

describe('ChaptersRepository', () => {
  let repository: ChaptersRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  const createMockChapterRow = (overrides = {}) => ({
    id: 'chapter-123',
    book_id: 'book-1',
    chapter_number: 1,
    title: 'The Beginning',
    scene_cards: JSON.stringify([
      { id: 'scene-1', order: 1, location: 'Castle', characters: ['Hero'] },
    ]),
    content: 'It was a dark and stormy night...',
    summary: 'The hero begins their journey.',
    status: 'completed',
    word_count: 3000,
    flags: JSON.stringify([
      { id: 'flag-1', type: 'continuity', severity: 'minor', description: 'Check timeline' },
    ]),
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

    repository = new ChaptersRepository(mockDb);
  });

  describe('findByIdParsed', () => {
    it('should return parsed chapter with JSON fields', () => {
      const row = createMockChapterRow();
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('chapter-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('chapter-123');
      expect(result?.scene_cards).toHaveLength(1);
      expect(result?.flags).toHaveLength(1);
    });

    it('should handle null JSON fields with fallbacks', () => {
      const row = createMockChapterRow({ scene_cards: null, flags: null });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('chapter-123');

      expect(result?.scene_cards).toEqual([]);
      expect(result?.flags).toEqual([]);
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findByIdParsed('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should return all chapters for a book', () => {
      const rows = [
        createMockChapterRow({ id: 'chapter-1', chapter_number: 1 }),
        createMockChapterRow({ id: 'chapter-2', chapter_number: 2 }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByBookId('book-1');

      expect(result).toHaveLength(2);
    });

    it('should order by chapter_number by default', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findByBookId('book-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY chapter_number ASC')
      );
    });
  });

  describe('findByBookAndNumber', () => {
    it('should find chapter by book and number', () => {
      const row = createMockChapterRow({ chapter_number: 5 });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByBookAndNumber('book-1', 5);

      expect(mockStatement.get).toHaveBeenCalledWith('book-1', 5);
      expect(result?.chapter_number).toBe(5);
    });
  });

  describe('findByStatus', () => {
    it('should return chapters by status', () => {
      const rows = [createMockChapterRow({ status: 'editing' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByStatus('editing');

      expect(mockStatement.all).toHaveBeenCalledWith('editing');
    });
  });

  describe('findByBookAndStatus', () => {
    it('should return chapters by book and status', () => {
      const rows = [createMockChapterRow({ status: 'pending' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByBookAndStatus('book-1', 'pending');

      expect(mockStatement.all).toHaveBeenCalledWith('book-1', 'pending');
    });
  });

  describe('findWithContext', () => {
    it('should return chapter with book context', () => {
      const row = {
        ...createMockChapterRow(),
        book_title: 'The First Book',
        book_number: 1,
        project_id: 'project-1',
      };
      mockStatement.get.mockReturnValue(row);

      const result = repository.findWithContext('chapter-123');

      expect(result?.book_title).toBe('The First Book');
      expect(result?.book_number).toBe(1);
      expect(result?.project_id).toBe('project-1');
    });
  });

  describe('findByProjectId', () => {
    it('should return all chapters for a project', () => {
      const rows = [
        {
          ...createMockChapterRow(),
          book_title: 'Book 1',
          book_number: 1,
          project_id: 'project-1',
        },
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByProjectId('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].project_id).toBe('project-1');
    });
  });

  describe('getNextChapterNumber', () => {
    it('should return next chapter number', () => {
      mockStatement.get.mockReturnValue({ next_number: 11 });

      const result = repository.getNextChapterNumber('book-1');

      expect(result).toBe(11);
    });

    it('should return 1 for first chapter', () => {
      mockStatement.get.mockReturnValue({ next_number: 1 });

      const result = repository.getNextChapterNumber('book-1');

      expect(result).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update chapter status', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockChapterRow({ status: 'editing' }));

      const result = repository.updateStatus('chapter-123', 'editing');

      expect(result).toBe(true);
    });
  });

  describe('updateContent', () => {
    it('should update content and calculate word count', () => {
      const content = 'This is the new chapter content with exactly ten words here.';
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockChapterRow({ content, word_count: 10 }));

      const result = repository.updateContent('chapter-123', content);

      expect(result).toBe(true);
    });
  });

  describe('updateSummary', () => {
    it('should update chapter summary', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockChapterRow());

      const result = repository.updateSummary('chapter-123', 'New summary');

      expect(result).toBe(true);
    });
  });

  describe('updateSceneCards', () => {
    it('should update scene cards as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockChapterRow());

      const sceneCards = [
        { id: 'scene-1', order: 1, location: 'Forest', characters: ['Hero', 'Villain'] },
      ];

      const result = repository.updateSceneCards('chapter-123', sceneCards as any);

      expect(result).toBe(true);
    });
  });

  describe('updateFlags', () => {
    it('should update flags as JSON', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockChapterRow());

      const flags = [
        { id: 'flag-1', type: 'style', severity: 'major', description: 'Fix prose' },
      ];

      const result = repository.updateFlags('chapter-123', flags as any);

      expect(result).toBe(true);
    });
  });

  describe('addFlag', () => {
    it('should add a flag to existing flags', () => {
      mockStatement.get.mockReturnValue(createMockChapterRow());
      mockStatement.run.mockReturnValue({ changes: 1 });

      const newFlag = { id: 'flag-2', type: 'plot', severity: 'minor', description: 'Check plot' };

      const result = repository.addFlag('chapter-123', newFlag as any);

      expect(result).toBe(true);
    });

    it('should return false when chapter not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.addFlag('nonexistent', {} as any);

      expect(result).toBe(false);
    });
  });

  describe('removeFlag', () => {
    it('should remove a flag by id', () => {
      mockStatement.get.mockReturnValue(createMockChapterRow());
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = repository.removeFlag('chapter-123', 'flag-1');

      expect(result).toBe(true);
    });
  });

  describe('resolveFlag', () => {
    it('should mark a flag as resolved', () => {
      mockStatement.get.mockReturnValue(createMockChapterRow());
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = repository.resolveFlag('chapter-123', 'flag-1');

      expect(result).toBe(true);
    });
  });

  describe('getTotalWordCountForBook', () => {
    it('should return total word count', () => {
      mockStatement.get.mockReturnValue({ total: 75000 });

      const result = repository.getTotalWordCountForBook('book-1');

      expect(result).toBe(75000);
    });
  });

  describe('getChapterCountForBook', () => {
    it('should return chapter count', () => {
      mockStatement.get.mockReturnValue({ count: 15 });

      const result = repository.getChapterCountForBook('book-1');

      expect(result).toBe(15);
    });
  });

  describe('getBookChapterStats', () => {
    it('should return chapter statistics', () => {
      mockStatement.get.mockReturnValue({
        total: 20,
        pending: 2,
        writing: 1,
        editing: 3,
        completed: 14,
        word_count: 60000,
      });

      const result = repository.getBookChapterStats('book-1');

      expect(result).toEqual({
        total: 20,
        pending: 2,
        writing: 1,
        editing: 3,
        completed: 14,
        wordCount: 60000,
      });
    });
  });

  describe('getPreviousChapter', () => {
    it('should return previous chapter', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockChapterRow({ chapter_number: 5, book_id: 'book-1' }))
        .mockReturnValueOnce(createMockChapterRow({ chapter_number: 4 }));

      const result = repository.getPreviousChapter('chapter-123');

      expect(result?.chapter_number).toBe(4);
    });

    it('should return null for first chapter', () => {
      mockStatement.get.mockReturnValue(createMockChapterRow({ chapter_number: 1 }));

      const result = repository.getPreviousChapter('chapter-123');

      expect(result).toBeNull();
    });
  });

  describe('getNextChapter', () => {
    it('should return next chapter', () => {
      mockStatement.get
        .mockReturnValueOnce(createMockChapterRow({ chapter_number: 5, book_id: 'book-1' }))
        .mockReturnValueOnce(createMockChapterRow({ chapter_number: 6 }));

      const result = repository.getNextChapter('chapter-123');

      expect(result?.chapter_number).toBe(6);
    });
  });

  describe('findWithUnresolvedFlags', () => {
    it('should return chapters with unresolved flags', () => {
      const rows = [
        createMockChapterRow({
          flags: JSON.stringify([{ id: 'flag-1', resolved: false }]),
        }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findWithUnresolvedFlags('book-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findPendingChapters', () => {
    it('should return pending chapters', () => {
      const rows = [createMockChapterRow({ status: 'pending' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findPendingChapters('book-1');

      expect(mockStatement.all).toHaveBeenCalledWith('book-1', 'pending');
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple chapters', () => {
      mockStatement.run.mockReturnValue({ changes: 3 });

      const result = repository.bulkUpdateStatus(['ch-1', 'ch-2', 'ch-3'], 'completed');

      expect(result).toBe(3);
    });

    it('should return 0 for empty array', () => {
      const result = repository.bulkUpdateStatus([], 'completed');

      expect(result).toBe(0);
    });
  });

  describe('renumberChapters', () => {
    it('should renumber chapters sequentially', () => {
      const rows = [
        createMockChapterRow({ id: 'ch-1', chapter_number: 1 }),
        createMockChapterRow({ id: 'ch-2', chapter_number: 3 }), // Gap
        createMockChapterRow({ id: 'ch-3', chapter_number: 5 }), // Gap
      ];
      mockStatement.all.mockReturnValue(rows);
      mockStatement.run.mockReturnValue({ changes: 1 });

      const transactionFn = jest.fn((fn: () => any) => () => fn());
      mockDb.transaction = transactionFn;

      repository = new ChaptersRepository(mockDb);
      repository.renumberChapters('book-1');

      expect(transactionFn).toHaveBeenCalled();
    });
  });
});
