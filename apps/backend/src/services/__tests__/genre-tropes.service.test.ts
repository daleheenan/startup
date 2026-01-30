import { jest } from '@jest/globals';

jest.mock('../../db/connection.js');
jest.mock('../logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

import { GenreTrope } from '../genre-tropes.service.js';
import type { Database } from 'better-sqlite3';

// Import service after mocks are set up
let genreTropesService: any;

describe('GenreTropesService', () => {
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    // Re-import service to get fresh instance
    const serviceModule = await import('../genre-tropes.service.js');
    genreTropesService = serviceModule.genreTropesService;

    // Bind private methods to preserve 'this' context
    // This fixes the binding issue in rows.map(this.parseTrope)
    (genreTropesService as any).parseTrope = (genreTropesService as any).parseTrope.bind(
      genreTropesService
    );
    (genreTropesService as any).parseJSON = (genreTropesService as any).parseJSON.bind(
      genreTropesService
    );
  });

  describe('getTropesByGenre', () => {
    it('should retrieve tropes for a specific genre', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'The Chosen One',
          description: 'A character destined by prophecy',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '["epic-fantasy", "high-fantasy"]',
          warning_tags: '["overused"]',
          examples: '["Harry Potter", "Star Wars"]',
          subversions: '["The chosen one fails"]',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-2',
          trope_name: 'Magic System',
          description: 'A magic system with clear rules',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'device',
          usage_frequency: 'moderate',
          compatibility_tags: '["epic-fantasy"]',
          warning_tags: null,
          examples: '["Brandon Sanderson works"]',
          subversions: '["Magic follows no rules"]',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM genre_tropes')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('fantasy');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('trope-1');
      expect(result[0].trope_name).toBe('The Chosen One');
      expect(result[0].compatibility_tags).toEqual(['epic-fantasy', 'high-fantasy']);
      expect(result[0].warning_tags).toEqual(['overused']);
      expect(result[1].trope_type).toBe('device');
      expect(result[1].usage_frequency).toBe('moderate');
    });

    it('should filter by subgenre when provided', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Space Battle',
          description: 'Epic combat in space',
          genre: 'science-fiction',
          subgenre: 'space-opera',
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('science-fiction', 'space-opera');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND (subgenre = ? OR subgenre IS NULL)')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('science-fiction', 'space-opera');
      expect(result).toHaveLength(1);
      expect(result[0].subgenre).toBe('space-opera');
    });

    it('should return empty array when no tropes found', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('unknown-genre');

      expect(result).toHaveLength(0);
    });

    it('should parse JSON fields correctly', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Test Trope',
          description: 'Test description',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '["tag1", "tag2", "tag3"]',
          warning_tags: '["warning1"]',
          examples: '["example1", "example2"]',
          subversions: '["subversion1"]',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      expect(result[0].compatibility_tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result[0].warning_tags).toEqual(['warning1']);
      expect(result[0].examples).toEqual(['example1', 'example2']);
      expect(result[0].subversions).toEqual(['subversion1']);
    });

    it('should handle null JSON fields gracefully', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Test Trope',
          description: 'Test description',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      expect(result[0].compatibility_tags).toBeUndefined();
      expect(result[0].warning_tags).toBeUndefined();
      expect(result[0].examples).toBeUndefined();
      expect(result[0].subversions).toBeUndefined();
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => genreTropesService.getTropesByGenre('fantasy')).toThrow('Database error');
    });
  });

  describe('getTropes', () => {
    it('should retrieve all tropes with no filters', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Trope 1',
          description: 'Description',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropes({});

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1')
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should filter by genre', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({ genre: 'mystery' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND genre = ?')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('mystery');
    });

    it('should filter by subgenre', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({ subgenre: 'cozy-mystery' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND (subgenre = ? OR subgenre IS NULL)')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('cozy-mystery');
    });

    it('should filter by trope type', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({ trope_type: 'plot' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND trope_type = ?')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('plot');
    });

    it('should filter by usage frequency', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({ usage_frequency: 'rare' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND usage_frequency = ?')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('rare');
    });

    it('should apply multiple filters together', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({
        genre: 'horror',
        trope_type: 'character',
        usage_frequency: 'common',
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND genre = ?')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND trope_type = ?')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND usage_frequency = ?')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('horror', 'character', 'common');
    });

    it('should order results by usage frequency and name', () => {
      const mockRows: any[] = [];
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      genreTropesService.getTropes({});

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_frequency DESC, trope_name ASC')
      );
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      expect(() => genreTropesService.getTropes({ genre: 'fantasy' })).toThrow(
        'Database connection lost'
      );
    });
  });

  describe('getTropeById', () => {
    it('should retrieve a single trope by ID', () => {
      const mockRow = {
        id: 'trope-123',
        trope_name: 'Ancient Evil',
        description: 'An ancient evil awakens',
        genre: 'fantasy',
        subgenre: 'dark-fantasy',
        trope_type: 'plot',
        usage_frequency: 'common',
        compatibility_tags: '["horror"]',
        warning_tags: null,
        examples: '["LOTR"]',
        subversions: '["Evil is good"]',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropeById('trope-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM genre_tropes WHERE id = ?'
      );
      expect(mockStmt.get).toHaveBeenCalledWith('trope-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('trope-123');
      expect(result?.trope_name).toBe('Ancient Evil');
      expect(result?.compatibility_tags).toEqual(['horror']);
    });

    it('should return null when trope not found', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropeById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => genreTropesService.getTropeById('trope-123')).toThrow('Database error');
    });
  });

  describe('getTropesForGenres', () => {
    it('should retrieve tropes for multiple genres', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Chosen One',
          description: 'Prophecy hero',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-2',
          trope_name: 'AI Uprising',
          description: 'Robots rebel',
          genre: 'science-fiction',
          subgenre: null,
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesForGenres(['fantasy', 'science-fiction']);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE genre IN (?,?)')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('fantasy', 'science-fiction');
      expect(result).toHaveLength(2);
      expect(result[0].genre).toBe('fantasy');
      expect(result[1].genre).toBe('science-fiction');
    });

    it('should return empty array for empty genres list', () => {
      const result = genreTropesService.getTropesForGenres([]);

      expect(result).toHaveLength(0);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should throw error for invalid genre values', () => {
      expect(() => genreTropesService.getTropesForGenres(['' as any])).toThrow(
        'Invalid genre value'
      );

      expect(() => genreTropesService.getTropesForGenres([123 as any])).toThrow(
        'Invalid genre value'
      );
    });

    it('should handle single genre in array', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Locked Room',
          description: 'Impossible crime',
          genre: 'mystery',
          subgenre: null,
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesForGenres(['mystery']);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE genre IN (?)')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('mystery');
      expect(result).toHaveLength(1);
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Query failed');
      });

      expect(() => genreTropesService.getTropesForGenres(['fantasy', 'horror'])).toThrow(
        'Query failed'
      );
    });
  });

  describe('saveConceptTropes', () => {
    it('should save tropes associated with a concept', () => {
      const mockDeleteStmt = {
        run: jest.fn(),
      };

      const mockInsertStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest
        .fn()
        .mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValue(mockInsertStmt);

      const tropes = [
        { tropeId: 'trope-1', preference: 'include' as const, notes: 'Use prominently' },
        { tropeId: 'trope-2', preference: 'exclude' as const },
        { tropeId: 'trope-3', preference: 'subvert' as const, notes: 'Twist the expectation' },
      ];

      genreTropesService.saveConceptTropes('concept-123', tropes);

      expect(mockDeleteStmt.run).toHaveBeenCalledWith('concept-123');
      expect(mockInsertStmt.run).toHaveBeenCalledTimes(3);
      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'concept-123',
        'trope-1',
        'include',
        'Use prominently'
      );
      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'concept-123',
        'trope-2',
        'exclude',
        null
      );
      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'concept-123',
        'trope-3',
        'subvert',
        'Twist the expectation'
      );
    });

    it('should handle empty tropes array', () => {
      const mockDeleteStmt = {
        run: jest.fn(),
      };

      const mockInsertStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest
        .fn()
        .mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValue(mockInsertStmt);

      genreTropesService.saveConceptTropes('concept-123', []);

      expect(mockDeleteStmt.run).toHaveBeenCalledWith('concept-123');
      expect(mockInsertStmt.run).not.toHaveBeenCalled();
    });

    it('should delete existing concept tropes before inserting new ones', () => {
      const mockDeleteStmt = {
        run: jest.fn(),
      };

      const mockInsertStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest
        .fn()
        .mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValue(mockInsertStmt);

      const tropes = [{ tropeId: 'trope-1', preference: 'include' as const }];

      genreTropesService.saveConceptTropes('concept-456', tropes);

      // Verify delete was called before insert
      expect(mockDeleteStmt.run).toHaveBeenCalledWith('concept-456');
      expect(mockInsertStmt.run).toHaveBeenCalled();
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Constraint violation');
      });

      const tropes = [{ tropeId: 'trope-1', preference: 'include' as const }];

      expect(() => genreTropesService.saveConceptTropes('concept-123', tropes)).toThrow(
        'Constraint violation'
      );
    });
  });

  describe('getConceptTropes', () => {
    it('should retrieve tropes associated with a concept', () => {
      const mockRows = [
        {
          id: 'concept-trope-1',
          concept_id: 'concept-123',
          trope_id: 'trope-1',
          preference: 'include',
          notes: 'Use this prominently',
          created_at: '2024-01-01T00:00:00.000Z',
          trope_name: 'Chosen One',
          description: 'Destined hero',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '["epic-fantasy"]',
          warning_tags: '["overused"]',
          examples: '["Harry Potter"]',
          subversions: '["Chosen one fails"]',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'concept-trope-2',
          concept_id: 'concept-123',
          trope_id: 'trope-2',
          preference: 'subvert',
          notes: null,
          created_at: '2024-01-01T00:00:00.000Z',
          trope_name: 'Ancient Evil',
          description: 'Dormant threat',
          genre: 'fantasy',
          subgenre: 'dark-fantasy',
          trope_type: 'plot',
          usage_frequency: 'moderate',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getConceptTropes('concept-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('JOIN genre_tropes gt ON ct.trope_id = gt.id')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('concept-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('concept-trope-1');
      expect(result[0].preference).toBe('include');
      expect(result[0].notes).toBe('Use this prominently');
      expect(result[0].trope.id).toBe('trope-1');
      expect(result[0].trope.trope_name).toBe('Chosen One');
      expect(result[0].trope.compatibility_tags).toEqual(['epic-fantasy']);
      expect(result[1].preference).toBe('subvert');
      expect(result[1].trope.trope_name).toBe('Ancient Evil');
    });

    it('should return empty array when concept has no tropes', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getConceptTropes('concept-empty');

      expect(result).toHaveLength(0);
    });

    it('should parse nested trope JSON fields correctly', () => {
      const mockRows = [
        {
          id: 'concept-trope-1',
          concept_id: 'concept-123',
          trope_id: 'trope-1',
          preference: 'include',
          notes: null,
          created_at: '2024-01-01T00:00:00.000Z',
          trope_name: 'Test Trope',
          description: 'Test',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '["tag1", "tag2"]',
          warning_tags: '["warn1"]',
          examples: '["ex1", "ex2"]',
          subversions: '["sub1"]',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getConceptTropes('concept-123');

      expect(result[0].trope.compatibility_tags).toEqual(['tag1', 'tag2']);
      expect(result[0].trope.warning_tags).toEqual(['warn1']);
      expect(result[0].trope.examples).toEqual(['ex1', 'ex2']);
      expect(result[0].trope.subversions).toEqual(['sub1']);
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Join failed');
      });

      expect(() => genreTropesService.getConceptTropes('concept-123')).toThrow('Join failed');
    });
  });

  describe('getRecommendedTropes', () => {
    it('should return genre tropes when no subgenres provided', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Trope 1',
          description: 'Description 1',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getRecommendedTropes(['fantasy'], []);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('trope-1');
    });

    it('should filter tropes by matching subgenre', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Generic Trope',
          description: 'Works for all',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-2',
          trope_name: 'Epic Trope',
          description: 'Epic fantasy specific',
          genre: 'fantasy',
          subgenre: 'epic-fantasy',
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-3',
          trope_name: 'Urban Trope',
          description: 'Urban fantasy specific',
          genre: 'fantasy',
          subgenre: 'urban-fantasy',
          trope_type: 'setting',
          usage_frequency: 'moderate',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getRecommendedTropes(['fantasy'], ['epic-fantasy']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('trope-1'); // Generic (no subgenre)
      expect(result[1].id).toBe('trope-2'); // Matches epic-fantasy
    });

    it('should include tropes with matching compatibility tags', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Compatible Trope',
          description: 'Has compatibility tag',
          genre: 'fantasy',
          subgenre: 'high-fantasy',
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '["epic-fantasy", "adventure"]',
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getRecommendedTropes(['fantasy'], ['epic-fantasy']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('trope-1');
    });

    it('should exclude tropes without matching subgenre or compatibility', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Urban Only',
          description: 'Urban fantasy only',
          genre: 'fantasy',
          subgenre: 'urban-fantasy',
          trope_type: 'setting',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getRecommendedTropes(['fantasy'], ['epic-fantasy']);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple subgenres', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Epic Trope',
          description: 'Epic',
          genre: 'fantasy',
          subgenre: 'epic-fantasy',
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-2',
          trope_name: 'Dark Trope',
          description: 'Dark',
          genre: 'fantasy',
          subgenre: 'dark-fantasy',
          trope_type: 'theme',
          usage_frequency: 'moderate',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getRecommendedTropes(
        ['fantasy'],
        ['epic-fantasy', 'dark-fantasy']
      );

      expect(result).toHaveLength(2);
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Query error');
      });

      expect(() => genreTropesService.getRecommendedTropes(['fantasy'], [])).toThrow(
        'Query error'
      );
    });
  });

  describe('createTrope', () => {
    it('should create a new trope with all fields', () => {
      const mockStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const newTrope = {
        trope_name: 'New Trope',
        description: 'A brand new trope',
        genre: 'fantasy',
        subgenre: 'epic-fantasy',
        trope_type: 'character' as const,
        usage_frequency: 'rare' as const,
        compatibility_tags: ['high-fantasy', 'adventure'],
        warning_tags: ['experimental'],
        examples: ['Novel A', 'Novel B'],
        subversions: ['Subversion 1', 'Subversion 2'],
      };

      const result = genreTropesService.createTrope(newTrope);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO genre_tropes')
      );
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String), // id (UUID)
        'New Trope',
        'A brand new trope',
        'fantasy',
        'epic-fantasy',
        'character',
        'rare',
        '["high-fantasy","adventure"]',
        '["experimental"]',
        '["Novel A","Novel B"]',
        '["Subversion 1","Subversion 2"]',
        expect.any(String), // created_at
        expect.any(String) // updated_at
      );
      expect(result.id).toBeDefined();
      expect(result.trope_name).toBe('New Trope');
      expect(result.genre).toBe('fantasy');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create trope with minimal required fields', () => {
      const mockStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const newTrope = {
        trope_name: 'Simple Trope',
        description: 'Simple description',
        genre: 'mystery',
        trope_type: 'plot' as const,
        usage_frequency: 'moderate' as const,
      };

      const result = genreTropesService.createTrope(newTrope);

      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'Simple Trope',
        'Simple description',
        'mystery',
        null,
        'plot',
        'moderate',
        '[]',
        '[]',
        '[]',
        '[]',
        expect.any(String),
        expect.any(String)
      );
      expect(result.trope_name).toBe('Simple Trope');
    });

    it('should throw error when database operation fails', () => {
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Unique constraint violated');
      });

      const newTrope = {
        trope_name: 'Duplicate Trope',
        description: 'Description',
        genre: 'fantasy',
        trope_type: 'character' as const,
        usage_frequency: 'common' as const,
      };

      expect(() => genreTropesService.createTrope(newTrope)).toThrow(
        'Unique constraint violated'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid JSON gracefully in parseJSON', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Bad JSON Trope',
          description: 'Has invalid JSON',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: 'invalid-json{',
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      expect(result[0].compatibility_tags).toBeUndefined();
    });

    it('should handle empty string JSON field', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Empty JSON Trope',
          description: 'Has empty JSON',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: '',
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      expect(result[0].compatibility_tags).toBeUndefined();
    });

    it('should handle very large genre arrays', () => {
      const largeGenreList = Array.from({ length: 50 }, (_, i) => `genre-${i}`);

      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesForGenres(largeGenreList);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should preserve trope order by usage frequency', () => {
      const mockRows = [
        {
          id: 'trope-1',
          trope_name: 'Common Trope A',
          description: 'Common',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'character',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-2',
          trope_name: 'Common Trope B',
          description: 'Common',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'plot',
          usage_frequency: 'common',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'trope-3',
          trope_name: 'Rare Trope',
          description: 'Rare',
          genre: 'fantasy',
          subgenre: null,
          trope_type: 'device',
          usage_frequency: 'rare',
          compatibility_tags: null,
          warning_tags: null,
          examples: null,
          subversions: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = genreTropesService.getTropesByGenre('fantasy');

      // Results should be ordered by usage_frequency DESC (common before rare), then name ASC
      expect(result).toHaveLength(3);
      expect(result[0].usage_frequency).toBe('common');
      expect(result[1].usage_frequency).toBe('common');
      expect(result[2].usage_frequency).toBe('rare');
    });
  });
});
