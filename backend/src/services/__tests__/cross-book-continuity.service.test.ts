import { jest } from '@jest/globals';
import { CrossBookContinuityService } from '../cross-book-continuity.service.js';
import type { BookEndingState, StoryBible } from '../../shared/types/index.js';

// Mock dependencies
jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');

describe('CrossBookContinuityService', () => {
  let service: CrossBookContinuityService;
  let mockClaudeService: any;
  let mockDb: any;

  beforeEach(async () => {
    // Dynamic imports to get mocked versions
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;

    service = new CrossBookContinuityService();

    // Reset mocks
    jest.clearAllMocks();
  });

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

      // Setup mocks
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chapterStmt = { get: jest.fn().mockReturnValue(mockLastChapter) };
      const updateStmt = { run: jest.fn() };

      mockPrepare
        .mockReturnValueOnce(bookStmt)  // First call: get book
        .mockReturnValueOnce(projectStmt)  // Second call: get project
        .mockReturnValueOnce(chapterStmt)  // Third call: get last chapter
        .mockReturnValueOnce(updateStmt);  // Fourth call: update book

      mockClaudeService.createCompletion = jest.fn().mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockEndingState))
      );

      // Execute
      const result = await service.generateBookEndingState('book-123');

      // Verify
      expect(result).toEqual(mockEndingState);
      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
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
      expect(updateStmt.run).toHaveBeenCalledWith(
        JSON.stringify(mockEndingState),
        expect.any(String),
        'book-123'
      );
    });

    it('should throw error if book not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(null) };
      mockPrepare.mockReturnValueOnce(bookStmt);

      await expect(service.generateBookEndingState('nonexistent')).rejects.toThrow(
        'Book not found: nonexistent'
      );
    });

    it('should throw error if story bible not found', async () => {
      const mockBook = { id: 'book-123', project_id: 'project-456' };
      const mockProject = { story_bible: null };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };

      mockPrepare
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt);

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

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chapterStmt = { get: jest.fn().mockReturnValue({ content: null, summary: null }) };

      mockPrepare
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(chapterStmt);

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

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chapterStmt = { get: jest.fn().mockReturnValue(mockLastChapter) };

      mockPrepare
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(chapterStmt);

      mockClaudeService.createCompletion = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('Claude API error'))
      );

      await expect(service.generateBookEndingState('book-123')).rejects.toThrow(
        'Claude API error'
      );
    });
  });

  describe('generateBookSummary', () => {
    it('should generate comprehensive book summary from chapters', async () => {
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

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const chaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };
      const updateStmt = { run: jest.fn() };

      mockPrepare
        .mockReturnValueOnce(chaptersStmt)
        .mockReturnValueOnce(updateStmt);

      mockClaudeService.createCompletion = jest.fn().mockImplementation(() =>
        Promise.resolve(mockSummary)
      );

      const result = await service.generateBookSummary('book-123');

      expect(result).toBe(mockSummary);
      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('book summary'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Chapter 1: The Beginning'),
            }),
          ]),
        })
      );
      expect(updateStmt.run).toHaveBeenCalled();
    });

    it('should throw error if no completed chapters found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const chaptersStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(chaptersStmt);

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

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const previousBookStmt = { get: jest.fn().mockReturnValue(mockPreviousBook) };
      mockPrepare.mockReturnValueOnce(previousBookStmt);

      const result = service.loadPreviousBookState('project-123', 2);

      expect(result).toEqual(mockEndingState);
      expect(previousBookStmt.get).toHaveBeenCalledWith('project-123', 1);
    });

    it('should return null if previous book has no ending state', () => {
      const mockPreviousBook = { ending_state: null };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const previousBookStmt = { get: jest.fn().mockReturnValue(mockPreviousBook) };
      mockPrepare.mockReturnValueOnce(previousBookStmt);

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

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const previousBookStmt = { get: jest.fn().mockReturnValue(mockPreviousBook) };
      mockPrepare.mockReturnValueOnce(previousBookStmt);

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
