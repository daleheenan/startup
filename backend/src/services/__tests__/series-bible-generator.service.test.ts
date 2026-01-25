import { jest } from '@jest/globals';
import { SeriesBibleGeneratorService } from '../series-bible-generator.service.js';
import type { Book, Project, StoryBible, BookEndingState } from '../../shared/types/index.js';

jest.mock('../../db/connection.js');

describe('SeriesBibleGeneratorService', () => {
  let service: SeriesBibleGeneratorService;
  let mockDb: any;

  beforeEach(async () => {
    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default;
    service = new SeriesBibleGeneratorService();
    jest.clearAllMocks();
  });

  describe('generateSeriesBible', () => {
    it('should generate complete series bible from multiple books', () => {
      const mockBooks: Book[] = [
        {
          id: 'book-1',
          project_id: 'project-1',
          book_number: 1,
          title: 'Book One',
          word_count: 75000,
          status: 'completed',
          ending_state: {
            characters: [
              {
                characterId: 'char-1',
                characterName: 'Hero',
                location: 'Castle',
                emotionalState: 'Determined',
                physicalState: 'Healthy',
                relationships: [],
                goals: ['Save kingdom'],
                knowledge: ['Secret revealed'],
                possessions: ['Magic sword'],
              },
            ],
            world: {
              politicalChanges: ['King overthrown'],
              physicalChanges: ['Castle damaged'],
              socialChanges: [],
              activeThreats: ['Dark lord rising'],
              knownSecrets: ['Prophecy exists'],
            },
            timeline: 'End of Year 1',
            unresolved: ['Who is the dark lord?'],
          },
          book_summary: 'Hero begins quest',
          timeline_end: 'End of Year 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'book-2',
          project_id: 'project-1',
          book_number: 2,
          title: 'Book Two',
          word_count: 0,
          status: 'setup',
          ending_state: null,
          book_summary: null,
          timeline_end: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockStoryBible: StoryBible = {
        characters: [
          {
            id: 'char-1',
            name: 'Hero',
            role: 'protagonist',
            physicalDescription: 'Brave hero',
            personalityTraits: ['brave', 'loyal'],
            voiceSample: 'I will not fail',
            goals: ['Save kingdom'],
            conflicts: [],
            currentState: {
              location: 'Village',
              emotionalState: 'Eager',
              goals: ['Start journey'],
              conflicts: [],
            },
            relationships: [],
          },
        ],
        world: {
          locations: [
            { id: 'loc-1', name: 'Castle', description: 'Grand castle', significance: 'Capital' },
          ],
          factions: [
            { id: 'fac-1', name: 'Royal Guard', description: 'Protectors', goals: ['Duty'] },
          ],
          systems: [
            { id: 'sys-1', type: 'magic', name: 'Magic', description: 'Ancient magic', rules: ['Rare'] },
          ],
        },
        timeline: [],
      };

      const mockProject: Project = {
        id: 'project-1',
        title: 'Epic Trilogy',
        type: 'trilogy',
        genre: 'Fantasy',
        book_count: 3,
        story_bible: mockStoryBible,
        story_dna: { genre: 'Fantasy', subgenre: 'Epic Fantasy', tone: 'Epic', themes: ['Good vs Evil', 'Courage'], proseStyle: 'Descriptive' },
        series_bible: null,
        universe_id: null,
        is_universe_root: false,
        status: 'setup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const booksStmt = { all: jest.fn().mockReturnValue(mockBooks) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue([]) };
      const updateStmt = { run: jest.fn() };

      mockPrepare
        .mockReturnValueOnce(booksStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValue(chaptersStmt)  // Multiple calls for chapters
        .mockReturnValueOnce(updateStmt);

      const result = service.generateSeriesBible('project-1');

      expect(result).toBeDefined();
      expect(result.characters).toHaveLength(1);
      expect(result.characters[0].name).toBe('Hero');
      expect(result.characters[0].development).toHaveLength(1);
      expect(result.world.length).toBeGreaterThan(0);
      expect(result.themes).toEqual(['Good vs Evil', 'Courage']);
      expect(updateStmt.run).toHaveBeenCalled();
    });

    it('should throw error if no books found', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const booksStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(booksStmt);

      expect(() => service.generateSeriesBible('project-1')).toThrow(
        'No books found for project project-1'
      );
    });

    it('should throw error if story bible not found', () => {
      const mockBooks: Book[] = [
        {
          id: 'book-1',
          project_id: 'project-1',
          book_number: 1,
          title: 'Book One',
          word_count: 0,
          status: 'completed',
          ending_state: null,
          book_summary: null,
          timeline_end: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockProject: Project = {
        id: 'project-1',
        title: 'Test',
        type: 'standalone',
        genre: 'Fantasy',
        book_count: 1,
        story_bible: null,
        story_dna: null,
        series_bible: null,
        universe_id: null,
        is_universe_root: false,
        status: 'setup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const booksStmt = { all: jest.fn().mockReturnValue(mockBooks) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };

      mockPrepare
        .mockReturnValueOnce(booksStmt)
        .mockReturnValueOnce(projectStmt);

      expect(() => service.generateSeriesBible('project-1')).toThrow(
        'Story bible not found for project project-1'
      );
    });
  });

  describe('getSeriesBible', () => {
    it('should retrieve existing series bible', () => {
      const mockSeriesBible = {
        characters: [],
        world: [],
        timeline: [],
        themes: [],
        mysteries: [],
      };

      const mockProject = {
        id: 'project-1',
        title: 'Test',
        type: 'standalone',
        genre: 'Fantasy',
        book_count: 1,
        story_bible: null,
        story_dna: null,
        series_bible: JSON.stringify(mockSeriesBible),
        status: 'setup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { get: jest.fn().mockReturnValue(mockProject) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = service.getSeriesBible('project-1');

      expect(result).toEqual(mockSeriesBible);
    });

    it('should return null if series bible not found', () => {
      const mockProject: Project = {
        id: 'project-1',
        title: 'Test',
        type: 'standalone',
        genre: 'Fantasy',
        book_count: 1,
        story_bible: null,
        story_dna: null,
        series_bible: null,
        universe_id: null,
        is_universe_root: false,
        status: 'setup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { get: jest.fn().mockReturnValue(mockProject) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = service.getSeriesBible('project-1');

      expect(result).toBeNull();
    });
  });
});
