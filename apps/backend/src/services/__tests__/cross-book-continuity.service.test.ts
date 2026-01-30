import { jest } from '@jest/globals';
import type { BookEndingState, StoryBible } from '../../shared/types/index.js';

// Mock dependencies
jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');

// Create mock functions with proper types
const mockGetActiveVersion = jest.fn<() => Promise<any>>();

// Mock book versioning service
jest.mock('../book-versioning.service.js', () => ({
  bookVersioningService: {
    getActiveVersion: mockGetActiveVersion,
  },
}));

// Import service AFTER mocks are set up
import { CrossBookContinuityService } from '../cross-book-continuity.service.js';

describe('CrossBookContinuityService', () => {
  let service: CrossBookContinuityService;
  let mockClaudeService: any;
  let mockDb: any;
  let prepareCallIndex: number;
  let mockStatements: any[];

  beforeEach(async () => {
    // Dynamic imports to get mocked versions
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;

    service = new CrossBookContinuityService();

    // Reset mocks
    jest.clearAllMocks();
    prepareCallIndex = 0;
    mockStatements = [];
  });

  /**
   * Helper to create a statement mock with get/all/run methods
   */
  const createStatement = (returnValue: any) => {
    const stmt: any = {
      get: jest.fn().mockReturnValue(returnValue),
      all: jest.fn().mockReturnValue(returnValue),
      run: jest.fn().mockReturnValue(returnValue),
    };
    return stmt;
  };

  /**
   * Setup db.prepare mock to return statements in sequence
   */
  const setupPrepare = (...statements: any[]) => {
    mockStatements = statements;
    prepareCallIndex = 0;

    mockDb.prepare = jest.fn().mockImplementation(() => {
      const stmt = mockStatements[prepareCallIndex] || createStatement(null);
      prepareCallIndex++;
      return stmt;
    });
  };

  describe('generateBookEndingState', () => {
    it('should generate ending state from book data', async () => {
      // Mock database responses
      const mockBook = {
        id: 'book-123',
        project_id: 'project-456',
        book_number: 1,
        title: 'Test Book',
      };

      const mockProject = {
        story_bible: JSON.stringify({
          characters: [
            {
              id: 'char-1',
              name: 'John Doe',
              role: 'protagonist',
            },
          ],
          world: {},
          timeline: [],
        }),
      };

      const mockLastChapter = {
        content: 'Final chapter content showing character at the castle...',
        summary: 'John Doe arrives at the castle and finds the artifact.',
      };

      const mockEndingState: BookEndingState = {
        characters: [
          {
            characterId: 'char-1',
            characterName: 'John Doe',
            location: 'The Castle',
            emotionalState: 'Triumphant but wary',
            physicalState: 'Healthy',
            relationships: [],
            goals: ['Protect the artifact'],
            knowledge: ['The artifact holds great power'],
            possessions: ['Ancient artifact'],
          },
        ],
        world: {
          politicalChanges: ['King has fallen'],
          physicalChanges: ['Castle partially destroyed'],
          socialChanges: [],
          activeThreats: ['Dark forces gathering'],
          knownSecrets: ['Artifact origin revealed'],
        },
        timeline: 'End of Book 1',
        unresolved: ['Who sent the dark forces?'],
      };

      // Mock active version
      mockGetActiveVersion.mockResolvedValue({
        id: 'version-1',
        version_number: 1,
      });

      // Setup database mocks in order:
      // 1. get book
      // 2. get project
      // 3. get last chapter
      // 4. update book
      setupPrepare(
        createStatement(mockBook),
        createStatement(mockProject),
        createStatement(mockLastChapter),
        createStatement({ run: jest.fn() })
      );

      mockClaudeService.createCompletionWithUsage = jest.fn().mockImplementation(() =>
        Promise.resolve({
          content: JSON.stringify(mockEndingState),
          usage: { inputTokens: 100, outputTokens: 200 },
        })
      );

      // Execute
      const result = await service.generateBookEndingState('book-123');

      // Verify
      expect(result).toEqual(mockEndingState);
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('analyzing the ending state'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('STORY BIBLE CHARACTERS'),
            }),
          ]),
        })
      );
    });

    it('should throw error if book not found', async () => {
      setupPrepare(
        createStatement(null) // book not found
      );

      await expect(service.generateBookEndingState('nonexistent')).rejects.toThrow(
        'Book not found: nonexistent'
      );
    });

    it('should throw error if story bible not found', async () => {
      const mockBook = { id: 'book-123', project_id: 'project-456' };
      const mockProject = { story_bible: null };

      setupPrepare(
        createStatement(mockBook),
        createStatement(mockProject)
      );

      await expect(service.generateBookEndingState('book-123')).rejects.toThrow(
        'Story bible not found'
      );
    });

    it('should throw error if no completed chapters found', async () => {
      const mockBook = {
        id: 'book-123',
        project_id: 'project-456',
        book_number: 1,
      };

      const mockProject = {
        story_bible: JSON.stringify({
          characters: [],
          world: {},
          timeline: [],
        }),
      };

      mockGetActiveVersion.mockResolvedValue({
        id: 'version-1',
        version_number: 1,
      });

      setupPrepare(
        createStatement(mockBook),
        createStatement(mockProject),
        createStatement({ content: null, summary: null })
      );

      await expect(service.generateBookEndingState('book-123')).rejects.toThrow(
        'No completed chapters found'
      );
    });

    it('should handle Claude API errors gracefully', async () => {
      const mockBook = {
        id: 'book-123',
        project_id: 'project-456',
      };

      const mockProject = {
        story_bible: JSON.stringify({
          characters: [{ id: 'char-1', name: 'Test' }],
        }),
      };

      const mockLastChapter = {
        content: 'Chapter content',
        summary: 'Summary',
      };

      mockGetActiveVersion.mockResolvedValue({
        id: 'version-1',
        version_number: 1,
      });

      setupPrepare(
        createStatement(mockBook),
        createStatement(mockProject),
        createStatement(mockLastChapter)
      );

      mockClaudeService.createCompletionWithUsage = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('Claude API error'))
      );

      await expect(service.generateBookEndingState('book-123')).rejects.toThrow(
        'Claude API error'
      );
    });
  });

  describe('generateBookSummary', () => {
    it('should generate comprehensive book summary from chapters', async () => {
      const mockBook = {
        id: 'book-123',
        project_id: 'project-456',
      };

      const mockChapters = [
        {
          chapter_number: 1,
          title: 'The Beginning',
          summary: 'Hero starts journey',
        },
        {
          chapter_number: 2,
          title: 'The Challenge',
          summary: 'Hero faces first obstacle',
        },
      ];

      const mockSummary = `This book follows the hero's journey as they start their quest and face their first challenge. Major themes include courage and determination.`;

      // Setup database mocks in order:
      // 1. get chapters (first query in service)
      // 2. get book (for tracking info)
      // 3. update book
      setupPrepare(
        createStatement(mockChapters),
        createStatement(mockBook),
        createStatement({ run: jest.fn() })
      );

      mockClaudeService.createCompletionWithUsage = jest.fn().mockImplementation(() =>
        Promise.resolve({
          content: mockSummary,
          usage: { inputTokens: 100, outputTokens: 50 },
        })
      );

      const result = await service.generateBookSummary('book-123');

      expect(result).toBe(mockSummary);
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('book summary'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Chapter 1: The Beginning'),
            }),
          ]),
        })
      );
    });

    it('should throw error if no completed chapters found', async () => {
      setupPrepare(
        createStatement([]) // no chapters
      );

      await expect(service.generateBookSummary('book-123')).rejects.toThrow(
        'No completed chapters found'
      );
    });
  });

  describe('loadPreviousBookState', () => {
    it('should return null for first book', () => {
      const result = service.loadPreviousBookState('project-123', 1);
      expect(result).toBeNull();
    });

    it('should load ending state from previous book', () => {
      const mockEndingState: BookEndingState = {
        characters: [],
        world: {
          politicalChanges: [],
          physicalChanges: [],
          socialChanges: [],
          activeThreats: [],
          knownSecrets: [],
        },
        timeline: 'End of Book 1',
        unresolved: [],
      };

      const mockPreviousBook = {
        ending_state: JSON.stringify(mockEndingState),
      };

      setupPrepare(
        createStatement(mockPreviousBook)
      );

      const result = service.loadPreviousBookState('project-123', 2);

      expect(result).toEqual(mockEndingState);
    });

    it('should return null if previous book has no ending state', () => {
      const mockPreviousBook = { ending_state: null };

      setupPrepare(
        createStatement(mockPreviousBook)
      );

      const result = service.loadPreviousBookState('project-123', 2);

      expect(result).toBeNull();
    });
  });

  describe('loadPreviousBookSummary', () => {
    it('should return null for first book', () => {
      const result = service.loadPreviousBookSummary('project-123', 1);
      expect(result).toBeNull();
    });

    it('should load summary from previous book', () => {
      const mockSummary = 'Book 1 summary';
      const mockPreviousBook = { book_summary: mockSummary };

      setupPrepare(
        createStatement(mockPreviousBook)
      );

      const result = service.loadPreviousBookSummary('project-123', 2);

      expect(result).toBe(mockSummary);
    });
  });

  describe('applyPreviousBookState', () => {
    it('should update character states from previous book', () => {
      const currentStoryBible: StoryBible = {
        characters: [
          {
            id: 'char-1',
            name: 'John Doe',
            role: 'protagonist',
            physicalDescription: 'A hero',
            personalityTraits: ['brave'],
            voiceSample: 'I will not fail',
            goals: ['Save the world'],
            conflicts: [],
            currentState: {
              location: 'Village',
              emotionalState: 'Determined',
              goals: ['Start journey'],
              conflicts: [],
            },
            relationships: [],
          },
        ],
        world: {
          locations: [],
          factions: [],
          systems: [],
        },
        timeline: [],
      };

      const previousState: BookEndingState = {
        characters: [
          {
            characterId: 'char-1',
            characterName: 'John Doe',
            location: 'The Castle',
            emotionalState: 'Victorious',
            physicalState: 'Wounded',
            relationships: [],
            goals: ['Protect artifact', 'Return home'],
            knowledge: ['Secret of the artifact'],
            possessions: ['Artifact'],
          },
        ],
        world: {
          politicalChanges: [],
          physicalChanges: [],
          socialChanges: [],
          activeThreats: [],
          knownSecrets: [],
        },
        timeline: 'End of Book 1',
        unresolved: [],
      };

      const result = service.applyPreviousBookState(currentStoryBible, previousState);

      expect(result.characters[0]!.currentState!.location).toBe('The Castle');
      expect(result.characters[0]!.currentState!.emotionalState).toBe('Victorious');
      expect(result.characters[0]!.currentState!.goals).toEqual([
        'Protect artifact',
        'Return home',
      ]);
    });

    it('should preserve characters without previous state', () => {
      const currentStoryBible: StoryBible = {
        characters: [
          {
            id: 'char-2',
            name: 'Jane Smith',
            role: 'ally',
            physicalDescription: 'A new ally',
            personalityTraits: ['clever'],
            voiceSample: 'Let me help',
            goals: ['Help hero'],
            conflicts: [],
            currentState: {
              location: 'City',
              emotionalState: 'Eager',
              goals: ['Meet hero'],
              conflicts: [],
            },
            relationships: [],
          },
        ],
        world: {
          locations: [],
          factions: [],
          systems: [],
        },
        timeline: [],
      };

      const previousState: BookEndingState = {
        characters: [
          {
            characterId: 'char-1',
            characterName: 'John Doe',
            location: 'Castle',
            emotionalState: 'Happy',
            physicalState: 'Healthy',
            relationships: [],
            goals: [],
            knowledge: [],
            possessions: [],
          },
        ],
        world: {
          politicalChanges: [],
          physicalChanges: [],
          socialChanges: [],
          activeThreats: [],
          knownSecrets: [],
        },
        timeline: 'End',
        unresolved: [],
      };

      const result = service.applyPreviousBookState(currentStoryBible, previousState);

      // Jane's state should be unchanged since she wasn't in previous book
      expect(result.characters[0]!.currentState!.location).toBe('City');
      expect(result.characters[0]!.name).toBe('Jane Smith');
    });
  });
});
