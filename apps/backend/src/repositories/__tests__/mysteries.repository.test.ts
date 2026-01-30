/**
 * Mysteries Repository Tests
 *
 * Tests for the MysteriesRepository to ensure
 * mystery-specific operations work correctly.
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

import { MysteriesRepository, type MysteryStatus, type MysteryImportance } from '../mysteries.repository.js';
import db from '../../db/connection.js';

describe('MysteriesRepository', () => {
  let repository: MysteriesRepository;
  let mockDb: any;
  let mockPrepare: jest.Mock;
  let mockStatement: any;

  const createMockMysteryRow = (overrides = {}) => ({
    id: 'mystery-123',
    series_id: 'project-1',
    question: 'Who killed the wizard?',
    raised_book: 1,
    raised_chapter: 5,
    context: 'The wizard was found dead in his study.',
    answered_book: null,
    answered_chapter: null,
    answer: null,
    status: 'open' as MysteryStatus,
    importance: 'major' as MysteryImportance,
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

    repository = new MysteriesRepository(mockDb);
  });

  describe('findByIdParsed', () => {
    it('should return parsed mystery when found', () => {
      const row = createMockMysteryRow();
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('mystery-123');

      expect(result).toEqual({
        id: 'mystery-123',
        question: 'Who killed the wizard?',
        raisedIn: {
          bookNumber: 1,
          chapterNumber: 5,
          context: 'The wizard was found dead in his study.',
        },
        answeredIn: undefined,
        status: 'open',
        importance: 'major',
        seriesId: 'project-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should parse answeredIn when mystery is resolved', () => {
      const row = createMockMysteryRow({
        status: 'resolved',
        answered_book: 3,
        answered_chapter: 10,
        answer: 'The butler did it.',
      });
      mockStatement.get.mockReturnValue(row);

      const result = repository.findByIdParsed('mystery-123');

      expect(result?.answeredIn).toEqual({
        bookNumber: 3,
        chapterNumber: 10,
        answer: 'The butler did it.',
      });
    });

    it('should return null when not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = repository.findByIdParsed('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findBySeriesId', () => {
    it('should return all mysteries for a series', () => {
      const rows = [
        createMockMysteryRow({ id: 'mystery-1', raised_chapter: 1 }),
        createMockMysteryRow({ id: 'mystery-2', raised_chapter: 5 }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findBySeriesId('project-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('mystery-1');
      expect(result[1].id).toBe('mystery-2');
    });

    it('should order by raised book and chapter by default', () => {
      mockStatement.all.mockReturnValue([]);

      repository.findBySeriesId('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY raised_book ASC, raised_chapter ASC')
      );
    });
  });

  describe('findBySeriesAndStatus', () => {
    it('should return mysteries filtered by status', () => {
      const rows = [createMockMysteryRow({ status: 'open' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findBySeriesAndStatus('project-1', 'open');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("WHERE series_id = ? AND status = ?")
      );
      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 'open');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOpenMysteries', () => {
    it('should return only open mysteries', () => {
      const rows = [createMockMysteryRow({ status: 'open' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findOpenMysteries('project-1');

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 'open');
      expect(result[0].status).toBe('open');
    });
  });

  describe('findResolvedMysteries', () => {
    it('should return only resolved mysteries', () => {
      const rows = [
        createMockMysteryRow({
          status: 'resolved',
          answered_book: 2,
          answered_chapter: 8,
          answer: 'The answer',
        }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findResolvedMysteries('project-1');

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 'resolved');
      expect(result[0].status).toBe('resolved');
    });
  });

  describe('findByImportance', () => {
    it('should return mysteries by importance', () => {
      const rows = [createMockMysteryRow({ importance: 'major' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByImportance('project-1', 'major');

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 'major');
      expect(result[0].importance).toBe('major');
    });
  });

  describe('findMajorMysteries', () => {
    it('should return only major mysteries', () => {
      const rows = [createMockMysteryRow({ importance: 'major' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findMajorMysteries('project-1');

      expect(result[0].importance).toBe('major');
    });
  });

  describe('findByRaisedBook', () => {
    it('should return mysteries raised in a specific book', () => {
      const rows = [createMockMysteryRow({ raised_book: 2 })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByRaisedBook('project-1', 2);

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 2);
      expect(result[0].raisedIn.bookNumber).toBe(2);
    });
  });

  describe('findByRaisedChapter', () => {
    it('should return mysteries raised in a specific chapter', () => {
      const rows = [createMockMysteryRow({ raised_book: 1, raised_chapter: 5 })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findByRaisedChapter('project-1', 1, 5);

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', 1, 5);
    });
  });

  describe('createMystery', () => {
    it('should create a new mystery', () => {
      const createdRow = createMockMysteryRow();
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createdRow);

      const result = repository.createMystery({
        id: 'mystery-123',
        seriesId: 'project-1',
        question: 'Who killed the wizard?',
        raisedBook: 1,
        raisedChapter: 5,
        context: 'The wizard was found dead in his study.',
        importance: 'major',
      });

      expect(result.id).toBe('mystery-123');
      expect(result.status).toBe('open');
      expect(result.importance).toBe('major');
    });

    it('should default importance to minor', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockMysteryRow({ importance: 'minor' }));

      const result = repository.createMystery({
        id: 'mystery-123',
        seriesId: 'project-1',
        question: 'A minor question?',
        raisedBook: 1,
        raisedChapter: 1,
        context: 'Some context',
      });

      expect(result.importance).toBe('minor');
    });
  });

  describe('updateStatus', () => {
    it('should update mystery status', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockMysteryRow({ status: 'red_herring' }));

      const result = repository.updateStatus('mystery-123', 'red_herring');

      expect(result).toBe(true);
    });

    it('should return false when mystery not found', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      mockStatement.get.mockReturnValue(null);

      const result = repository.updateStatus('nonexistent', 'resolved');

      expect(result).toBe(false);
    });
  });

  describe('resolveMystery', () => {
    it('should resolve a mystery with answer details', () => {
      const resolvedRow = createMockMysteryRow({
        status: 'resolved',
        answered_book: 3,
        answered_chapter: 15,
        answer: 'The butler did it.',
      });
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(resolvedRow);

      const result = repository.resolveMystery('mystery-123', 3, 15, 'The butler did it.');

      expect(result?.status).toBe('resolved');
      expect(result?.answeredIn?.bookNumber).toBe(3);
      expect(result?.answeredIn?.chapterNumber).toBe(15);
      expect(result?.answeredIn?.answer).toBe('The butler did it.');
    });

    it('should return null when mystery not found', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      mockStatement.get.mockReturnValue(null);

      const result = repository.resolveMystery('nonexistent', 3, 15, 'Answer');

      expect(result).toBeNull();
    });
  });

  describe('markAsRedHerring', () => {
    it('should mark mystery as red herring', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockMysteryRow({ status: 'red_herring' }));

      const result = repository.markAsRedHerring('mystery-123');

      expect(result).toBe(true);
    });
  });

  describe('reopenMystery', () => {
    it('should reopen a resolved mystery', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(createMockMysteryRow());

      const result = repository.reopenMystery('mystery-123');

      expect(result).toBe(true);
    });
  });

  describe('getSeriesStats', () => {
    it('should return mystery statistics', () => {
      mockStatement.get.mockReturnValue({
        total: 10,
        open: 5,
        resolved: 4,
        red_herring: 1,
        major_mysteries: 3,
        minor_mysteries: 5,
        subplot_mysteries: 2,
      });

      const result = repository.getSeriesStats('project-1');

      expect(result).toEqual({
        total: 10,
        open: 5,
        resolved: 4,
        redHerring: 1,
        majorMysteries: 3,
        minorMysteries: 5,
        subplotMysteries: 2,
      });
    });

    it('should handle empty series', () => {
      mockStatement.get.mockReturnValue({
        total: 0,
        open: 0,
        resolved: 0,
        red_herring: 0,
        major_mysteries: 0,
        minor_mysteries: 0,
        subplot_mysteries: 0,
      });

      const result = repository.getSeriesStats('empty-project');

      expect(result.total).toBe(0);
    });
  });

  describe('getMysteryTimeline', () => {
    it('should return mysteries with timeline strings', () => {
      const rows = [
        createMockMysteryRow({ raised_book: 1, raised_chapter: 5 }),
        createMockMysteryRow({
          id: 'mystery-2',
          raised_book: 2,
          raised_chapter: 3,
          status: 'resolved',
          answered_book: 3,
          answered_chapter: 10,
          answer: 'Resolved',
        }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.getMysteryTimeline('project-1');

      expect(result[0].raisedAt).toBe('Book 1, Chapter 5');
      expect(result[0].resolvedAt).toBeUndefined();
      expect(result[1].raisedAt).toBe('Book 2, Chapter 3');
      expect(result[1].resolvedAt).toBe('Book 3, Chapter 10');
    });
  });

  describe('countOpenMysteries', () => {
    it('should return count of open mysteries', () => {
      mockStatement.get.mockReturnValue({ count: 7 });

      const result = repository.countOpenMysteries('project-1');

      expect(result).toBe(7);
    });
  });

  describe('countByRaisedBook', () => {
    it('should return mystery counts by book', () => {
      mockStatement.all.mockReturnValue([
        { book_number: 1, count: 5 },
        { book_number: 2, count: 3 },
        { book_number: 3, count: 2 },
      ]);

      const result = repository.countByRaisedBook('project-1');

      expect(result).toEqual([
        { bookNumber: 1, count: 5 },
        { bookNumber: 2, count: 3 },
        { bookNumber: 3, count: 2 },
      ]);
    });
  });

  describe('searchByQuestion', () => {
    it('should search mysteries by question text', () => {
      const rows = [createMockMysteryRow({ question: 'Who killed the wizard?' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.searchByQuestion('project-1', 'wizard');

      expect(mockStatement.all).toHaveBeenCalledWith('project-1', '%wizard%');
      expect(result).toHaveLength(1);
    });
  });

  describe('getUnresolvedMajorMysteries', () => {
    it('should return open major mysteries', () => {
      const rows = [
        createMockMysteryRow({ status: 'open', importance: 'major' }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.getUnresolvedMajorMysteries('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("status = 'open' AND importance = 'major'")
      );
      expect(result[0].status).toBe('open');
      expect(result[0].importance).toBe('major');
    });
  });

  describe('deleteBySeriesId', () => {
    it('should delete all mysteries for a series', () => {
      mockStatement.run.mockReturnValue({ changes: 5 });

      const result = repository.deleteBySeriesId('project-1');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM series_mysteries WHERE series_id = ?');
      expect(result).toBe(5);
    });
  });

  describe('findLongRunningMysteries', () => {
    it('should find mysteries that span multiple books', () => {
      const rows = [
        createMockMysteryRow({
          raised_book: 1,
          status: 'resolved',
          answered_book: 3,
          answered_chapter: 10,
          answer: 'Answer',
        }),
      ];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findLongRunningMysteries('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('answered_book > raised_book')
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findNeverResolvedMysteries', () => {
    it('should find mysteries that were never resolved', () => {
      const rows = [createMockMysteryRow({ status: 'open' })];
      mockStatement.all.mockReturnValue(rows);

      const result = repository.findNeverResolvedMysteries('project-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("status = 'open'")
      );
      expect(result[0].status).toBe('open');
    });
  });
});
