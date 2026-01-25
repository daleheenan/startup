import { jest } from '@jest/globals';
import type { Chapter, Book, Project, Character, SceneCard } from '../../shared/types/index.js';

// Create mock statement
const mockStatement = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

// Create mock database
const mockDb = {
  prepare: jest.fn(() => mockStatement),
  exec: jest.fn(),
  transaction: jest.fn((fn: Function) => fn),
  close: jest.fn(),
};

// Mock the database connection module
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: mockDb,
}));

describe('ContextAssemblyService', () => {
  let service: any;

  beforeAll(async () => {
    // Import service once after mock is set up
    const module = await import('../context-assembly.service.js');
    service = new module.ContextAssemblyService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatement.run.mockReturnValue({ changes: 1 });
    mockStatement.get.mockReturnValue(null);
    mockStatement.all.mockReturnValue([]);
  });

  describe('assembleChapterContext', () => {
    it('should assemble complete context for chapter generation', () => {
      const mockSceneCards: SceneCard[] = [
        {
          id: 'scene-1',
          order: 1,
          location: 'Castle Hall',
          characters: ['Hero', 'Mentor'],
          povCharacter: 'Hero',
          goal: 'Learn about the quest',
          conflict: 'Hero doubts their ability',
          outcome: 'Mentor convinces hero',
          emotionalBeat: 'From doubt to determination',
          notes: 'Important scene',
        },
      ];

      const mockChapter = {
        id: 'chapter-1',
        book_id: 'book-1',
        chapter_number: 1,
        title: 'The Call',
        scene_cards: JSON.stringify(mockSceneCards),
        flags: '[]',
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book One',
        word_count: 0,
        status: 'generating',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockStoryBible = {
        characters: [
          {
            id: 'char-1',
            name: 'Hero',
            role: 'protagonist',
            physicalDescription: 'Young and brave',
            personalityTraits: ['brave', 'determined'],
            voiceSample: 'I will not give up',
            goals: ['Save the kingdom'],
            conflicts: ['Self-doubt'],
            currentState: {
              location: 'Village',
              emotionalState: 'Anxious',
              goals: ['Find courage'],
              conflicts: ['Fear of failure'],
            },
            relationships: [],
          },
          {
            id: 'char-2',
            name: 'Mentor',
            role: 'mentor',
            physicalDescription: 'Old and wise',
            personalityTraits: ['wise', 'patient'],
            voiceSample: 'Trust in yourself',
            goals: ['Guide hero'],
            conflicts: [],
            currentState: {
              location: 'Castle',
              emotionalState: 'Confident',
              goals: ['Prepare hero'],
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

      const mockProject = {
        id: 'project-1',
        title: 'Epic Quest',
        type: 'standalone',
        genre: 'Fantasy',
        book_count: 1,
        story_dna: JSON.stringify({
          genre: 'Fantasy',
          subgenre: 'Epic Fantasy',
          tone: 'Heroic',
          themes: ['Good vs Evil', 'Coming of Age'],
          proseStyle: 'Descriptive and immersive',
        }),
        story_bible: JSON.stringify(mockStoryBible),
        series_bible: null,
        status: 'generating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const summaryStmt = { get: jest.fn().mockReturnValue(null) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(summaryStmt);

      const result = service.assembleChapterContext('chapter-1');

      expect(result).toBeDefined();
      expect(result.system).toContain('AUTHOR AGENT');
      expect(result.system).toContain('Fantasy');
      expect(result.userPrompt).toContain('Hero');
      expect(result.userPrompt).toContain('Castle Hall');
      expect(result.userPrompt).toContain('SCENE CARDS');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should include previous chapter summary for chapters beyond chapter 1', () => {
      const mockSceneCards: SceneCard[] = [
        {
          id: 'scene-1',
          order: 1,
          location: 'Forest',
          characters: ['Hero'],
          povCharacter: 'Hero',
          goal: 'Find the artifact',
          conflict: 'Enemy ambush',
          outcome: 'Escape with artifact',
          emotionalBeat: 'Fear to triumph',
        },
      ];

      const mockChapter = {
        id: 'chapter-2',
        book_id: 'book-1',
        chapter_number: 2,
        title: 'The Journey',
        scene_cards: JSON.stringify(mockSceneCards),
        flags: '[]',
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book One',
        word_count: 0,
        status: 'generating',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProject = {
        id: 'project-1',
        story_dna: JSON.stringify({
          genre: 'Fantasy',
          subgenre: 'Epic',
          tone: 'Dark',
          themes: ['Revenge'],
          proseStyle: 'Concise',
        }),
        story_bible: JSON.stringify({
          characters: [
            {
              id: 'char-1',
              name: 'Hero',
              role: 'protagonist',
              physicalDescription: 'Strong',
              personalityTraits: ['brave'],
              voiceSample: 'I fight',
              goals: ['Win'],
              conflicts: ['Loss'],
              relationships: [],
            },
          ],
          world: { locations: [], factions: [], systems: [] },
          timeline: [],
        }),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const summaryStmt = {
        get: jest.fn().mockReturnValue({ summary: 'Hero received the call to adventure' }),
      };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(summaryStmt);

      const result = service.assembleChapterContext('chapter-2');

      expect(result.userPrompt).toContain('PREVIOUS CHAPTER SUMMARY');
      expect(result.userPrompt).toContain('Hero received the call to adventure');
    });

    it('should throw error if chapter not found', () => {
      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(null) };
      mockPrepare.mockReturnValueOnce(chapterStmt);

      expect(() => service.assembleChapterContext('nonexistent')).toThrow(
        'Chapter not found: nonexistent'
      );
    });

    it('should throw error if project missing Story DNA', () => {
      const mockChapter = {
        id: 'chapter-1',
        book_id: 'book-1',
        chapter_number: 1,
        scene_cards: JSON.stringify([]),
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book',
        word_count: 0,
        status: 'setup',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProject = {
        id: 'project-1',
        story_dna: null,
        story_bible: JSON.stringify({ characters: [] }),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt);

      expect(() => service.assembleChapterContext('chapter-1')).toThrow(
        'Project missing Story DNA or Story Bible'
      );
    });

    it('should throw error if chapter missing scene cards', () => {
      const mockChapter = {
        id: 'chapter-1',
        book_id: 'book-1',
        chapter_number: 1,
        scene_cards: null,
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book',
        word_count: 0,
        status: 'setup',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProject = {
        id: 'project-1',
        story_dna: JSON.stringify({
          genre: 'Fantasy',
          subgenre: 'Epic',
          tone: 'Dark',
          themes: [],
          proseStyle: 'Descriptive',
        }),
        story_bible: JSON.stringify({ characters: [] }),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt);

      expect(() => service.assembleChapterContext('chapter-1')).toThrow(
        'Chapter missing scene cards'
      );
    });

    it('should throw error if POV character not found', () => {
      const mockSceneCards: SceneCard[] = [
        {
          id: 'scene-1',
          order: 1,
          location: 'Forest',
          characters: ['UnknownHero'],
          povCharacter: 'UnknownHero',
          goal: 'Quest',
          conflict: 'Danger',
          outcome: 'Success',
          emotionalBeat: 'Hope',
        },
      ];

      const mockChapter = {
        id: 'chapter-1',
        book_id: 'book-1',
        chapter_number: 1,
        scene_cards: JSON.stringify(mockSceneCards),
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book',
        word_count: 0,
        status: 'setup',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProject = {
        id: 'project-1',
        story_dna: JSON.stringify({
          genre: 'Fantasy',
          subgenre: 'Epic',
          tone: 'Dark',
          themes: [],
          proseStyle: 'Descriptive',
        }),
        story_bible: JSON.stringify({
          characters: [
            {
              id: 'char-1',
              name: 'DifferentHero',
              role: 'protagonist',
              physicalDescription: 'Strong',
              personalityTraits: ['brave'],
              voiceSample: 'I fight',
              goals: ['Win'],
              conflicts: [],
              relationships: [],
            },
          ],
          world: { locations: [], factions: [], systems: [] },
          timeline: [],
        }),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt);

      expect(() => service.assembleChapterContext('chapter-1')).toThrow(
        'POV character not found: UnknownHero'
      );
    });

    it('should handle multiple scenes in chapter', () => {
      const mockSceneCards: SceneCard[] = [
        {
          id: 'scene-1',
          order: 1,
          location: 'Castle',
          characters: ['Hero', 'King'],
          povCharacter: 'Hero',
          goal: 'Get mission',
          conflict: 'King doubts hero',
          outcome: 'Mission granted',
          emotionalBeat: 'Uncertainty to resolve',
        },
        {
          id: 'scene-2',
          order: 2,
          location: 'Armory',
          characters: ['Hero', 'Blacksmith'],
          povCharacter: 'Hero',
          goal: 'Get sword',
          conflict: 'Sword costs too much',
          outcome: 'Blacksmith gifts sword',
          emotionalBeat: 'Despair to gratitude',
        },
      ];

      const mockChapter = {
        id: 'chapter-1',
        book_id: 'book-1',
        chapter_number: 1,
        title: 'Preparation',
        scene_cards: JSON.stringify(mockSceneCards),
        flags: '[]',
      };

      const mockBook: Book = {
        id: 'book-1',
        project_id: 'project-1',
        book_number: 1,
        title: 'Book',
        word_count: 0,
        status: 'generating',
        ending_state: null,
        book_summary: null,
        timeline_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockProject = {
        id: 'project-1',
        story_dna: JSON.stringify({
          genre: 'Fantasy',
          subgenre: 'Epic',
          tone: 'Heroic',
          themes: ['Courage'],
          proseStyle: 'Action-packed',
        }),
        story_bible: JSON.stringify({
          characters: [
            {
              id: 'char-1',
              name: 'Hero',
              role: 'protagonist',
              physicalDescription: 'Young warrior',
              personalityTraits: ['brave'],
              voiceSample: 'I am ready',
              goals: ['Prove myself'],
              conflicts: ['Inexperience'],
              relationships: [],
            },
            {
              id: 'char-2',
              name: 'King',
              role: 'authority',
              physicalDescription: 'Regal',
              personalityTraits: ['wise'],
              voiceSample: 'Do your duty',
              goals: ['Protect kingdom'],
              conflicts: [],
              relationships: [],
            },
            {
              id: 'char-3',
              name: 'Blacksmith',
              role: 'ally',
              physicalDescription: 'Burly',
              personalityTraits: ['generous'],
              voiceSample: 'Take this',
              goals: ['Help heroes'],
              conflicts: [],
              relationships: [],
            },
          ],
          world: { locations: [], factions: [], systems: [] },
          timeline: [],
        }),
      };

      const mockPrepare: any = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const bookStmt = { get: jest.fn().mockReturnValue(mockBook) };
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const summaryStmt = { get: jest.fn().mockReturnValue(null) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(bookStmt)
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(summaryStmt);

      const result = service.assembleChapterContext('chapter-1');

      expect(result.userPrompt).toContain('Scene 1: Castle');
      expect(result.userPrompt).toContain('Scene 2: Armory');
      expect(result.userPrompt).toContain('2000 words');
      expect(result.userPrompt).toContain('King');
      expect(result.userPrompt).toContain('Blacksmith');
    });
  });
});
