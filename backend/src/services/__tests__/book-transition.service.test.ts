import { jest } from '@jest/globals';
import { BookTransitionService } from '../book-transition.service.js';
import type { Book, BookEndingState, BookTransition } from '../../shared/types/index.js';

jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');

describe('BookTransitionService', () => {
  let service: BookTransitionService;
  let mockClaudeService: any;
  let mockDb: any;

  beforeEach(async () => {
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService;
    mockDb = dbModule.default;

    service = new BookTransitionService();
    jest.clearAllMocks();
  });

  describe('generateBookTransition', () => {
    it('should generate transition between two books', async () => {
      const mockEndingState: BookEndingState = {
        characters: [
          {
            characterId: 'char-1',
            characterName: 'Hero',
            location: 'Castle',
            emotionalState: 'Victorious',
            physicalState: 'Wounded',
            relationships: [],
            goals: ['Recover', 'Prepare for next battle'],
            knowledge: ['Enemy weakness found'],
            possessions: ['Magic artifact'],
          },
        ],
        world: {
          politicalChanges: ['New king crowned'],
          physicalChanges: [],
          socialChanges: [],
          activeThreats: ['Dark army gathering'],
          knownSecrets: [],
        },
        timeline: 'End of Year 1',
        unresolved: ['Will dark army attack?'],
      };

      const mockFromBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book One',
        target_chapters: 30,
        status: 'completed',
        ending_state: JSON.stringify(mockEndingState),
        book_summary: 'Hero defeats initial threat and finds artifact',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockToBook: Book = {
        id: 'book-2',
        project_id: 'project-1',
        book_number: 2,
        title: 'Book Two',
        target_chapters: 30,
        status: 'planning',
        ending_state: null,
        book_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockTransitionData = {
        gapSummary:
          'During the six months between books, Hero recovered from wounds and trained with the artifact. The new king consolidated power while the dark army grew stronger in the north.',
        characterChanges: [
          {
            characterId: 'char-1',
            characterName: 'Hero',
            changes: [
              'Fully recovered from wounds',
              'Mastered artifact powers',
              'Became royal advisor',
            ],
            newLocation: 'Royal Palace',
            newStatus: 'King\'s champion',
          },
        ],
        worldChanges: [
          {
            type: 'political',
            description: 'New king established stable rule',
            impact: 'Kingdom ready for next conflict',
          },
          {
            type: 'threat',
            description: 'Dark army doubled in size',
            impact: 'Major invasion imminent',
          },
        ],
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn() };
      bookStmt.get.mockReturnValueOnce(mockFromBook).mockReturnValueOnce(mockToBook);

      const insertStmt = { run: jest.fn() };

      mockPrepare.mockReturnValueOnce(bookStmt).mockReturnValueOnce(insertStmt);

      mockClaudeService.createCompletion = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockTransitionData));

      const result = await service.generateBookTransition(
        'project-1',
        'book-1',
        'book-2',
        '6 months'
      );

      expect(result).toBeDefined();
      expect(result.gap_summary).toBe(mockTransitionData.gapSummary);
      expect(result.character_changes).toEqual(mockTransitionData.characterChanges);
      expect(result.world_changes).toEqual(mockTransitionData.worldChanges);
      expect(result.time_gap).toBe('6 months');

      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('transition summary'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('TIME GAP: 6 months'),
            }),
          ]),
        })
      );

      expect(insertStmt.run).toHaveBeenCalled();
    });

    it('should throw error if books not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(null) };
      mockPrepare.mockReturnValueOnce(bookStmt);

      await expect(
        service.generateBookTransition('project-1', 'book-1', 'book-2', '1 year')
      ).rejects.toThrow('Books not found');
    });

    it('should throw error if from book has no ending state', async () => {
      const mockFromBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book One',
        target_chapters: 30,
        status: 'completed',
        ending_state: null,
        book_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockToBook: Book = {
        id: 'book-2',
        project_id: 'project-1',
        book_number: 2,
        title: 'Book Two',
        target_chapters: 30,
        status: 'planning',
        ending_state: null,
        book_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn() };
      bookStmt.get.mockReturnValueOnce(mockFromBook).mockReturnValueOnce(mockToBook);

      mockPrepare.mockReturnValueOnce(bookStmt);

      await expect(
        service.generateBookTransition('project-1', 'book-1', 'book-2', '1 year')
      ).rejects.toThrow('has no ending state');
    });

    it('should throw error if from book is not before to book', async () => {
      const mockFromBook: Book = {
        id: 'book-2',
        project_id: 'project-1',
        book_number: 2,
        title: 'Book Two',
        target_chapters: 30,
        status: 'completed',
        ending_state: '{}',
        book_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockToBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book One',
        target_chapters: 30,
        status: 'completed',
        ending_state: null,
        book_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn() };
      bookStmt.get.mockReturnValueOnce(mockFromBook).mockReturnValueOnce(mockToBook);

      mockPrepare.mockReturnValueOnce(bookStmt);

      await expect(
        service.generateBookTransition('project-1', 'book-2', 'book-1', '1 year')
      ).rejects.toThrow('From book must be before to book');
    });
  });

  describe('getTransition', () => {
    it('should retrieve existing transition', () => {
      const mockTransition = {
        id: 'transition-1',
        project_id: 'project-1',
        from_book_id: 'book-1',
        to_book_id: 'book-2',
        time_gap: '6 months',
        gap_summary: 'Things happened',
        character_changes: JSON.stringify([]),
        world_changes: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { get: jest.fn().mockReturnValue(mockTransition) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = service.getTransition('book-1', 'book-2');

      expect(result).toBeDefined();
      expect(result?.id).toBe('transition-1');
      expect(result?.character_changes).toEqual([]);
    });

    it('should return null if transition not found', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { get: jest.fn().mockReturnValue(null) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = service.getTransition('book-1', 'book-2');

      expect(result).toBeNull();
    });
  });

  describe('getProjectTransitions', () => {
    it('should retrieve all transitions for a project', () => {
      const mockTransitions = [
        {
          id: 'transition-1',
          project_id: 'project-1',
          from_book_id: 'book-1',
          to_book_id: 'book-2',
          time_gap: '6 months',
          gap_summary: 'First gap',
          character_changes: JSON.stringify([]),
          world_changes: JSON.stringify([]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'transition-2',
          project_id: 'project-1',
          from_book_id: 'book-2',
          to_book_id: 'book-3',
          time_gap: '1 year',
          gap_summary: 'Second gap',
          character_changes: JSON.stringify([]),
          world_changes: JSON.stringify([]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { all: jest.fn().mockReturnValue(mockTransitions) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = service.getProjectTransitions('project-1');

      expect(result).toHaveLength(2);
      expect(result[0].gap_summary).toBe('First gap');
      expect(result[1].gap_summary).toBe('Second gap');
    });
  });
});
