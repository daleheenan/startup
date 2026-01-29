import { jest } from '@jest/globals';

// Mock logger first to prevent initialisation errors
jest.mock('../logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../db/connection.js');
jest.mock('../claude.service.js');
jest.mock('../../utils/json-extractor.js');

// Mock commercial beat validator
jest.mock('../commercial-beat-validator.js', () => ({
  commercialBeatValidatorService: {
    generateChapterBrief: jest.fn().mockReturnValue({
      chapterNumber: 1,
      title: 'Test Chapter',
      summary: 'Test summary',
      wordCountTarget: 2200,
      wordCountMin: 1980,
      wordCountMax: 2420,
      storyPercentage: 5,
      commercialBeats: [{ name: 'Opening Hook', description: 'Hook readers', readerExpectation: 'Immediate engagement' }],
      pacingGuidance: 'medium',
      toneNotes: ['Establish character voice'],
      sceneRequirements: [{ goal: 'Introduce protagonist', conflict: 'Internal', outcome: 'yes', emotionalBeat: 'Curiosity' }],
    }),
    getGenreExpectations: jest.fn().mockReturnValue({
      genre: 'Thriller',
      typicalWordCount: { min: 70000, max: 100000 },
      chapterWordCount: { min: 1500, max: 3000 },
      pacingExpectations: 'Fast-paced with tension peaks',
      criticalBeats: ['Opening Hook', 'Inciting Incident', 'Midpoint Twist', 'Climax'],
    }),
  },
  COMMERCIAL_BEATS: [
    { name: 'Opening Hook', description: 'Hook', idealPercentage: 0, toleranceMin: 0, toleranceMax: 3, importance: 'critical', readerExpectation: 'Test' },
    { name: 'Inciting Incident', description: 'Incite', idealPercentage: 12, toleranceMin: 10, toleranceMax: 15, importance: 'critical', readerExpectation: 'Test' },
  ],
}));

import { ChapterBriefGeneratorService } from '../chapter/brief-generator.js';
import type { StoryDNA } from '../../shared/types/index.js';

describe('ChapterBriefGeneratorService', () => {
  let service: ChapterBriefGeneratorService;
  let mockDb: any;

  beforeEach(async () => {
    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    service = new ChapterBriefGeneratorService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // generateChapterBrief
  // ============================================================================

  describe('generateChapterBrief', () => {
    it('should generate a brief for a valid chapter', async () => {
      const bookId = 'book-123';
      const chapterNumber = 1;

      // Mock book context query
      const mockBookStmt = {
        get: jest.fn().mockReturnValue({
          id: bookId,
          project_id: 'project-123',
          genre: 'thriller',
          story_dna: JSON.stringify({
            genre: 'thriller',
            subgenre: 'psychological',
            tone: 'dark',
            themes: ['betrayal', 'identity'],
            proseStyle: 'terse',
          }),
          story_bible: JSON.stringify({
            characters: [
              {
                id: 'char-1',
                name: 'Detective Smith',
                role: 'protagonist',
                personalityTraits: ['determined', 'haunted'],
                voiceSample: 'Short sentences. Direct.',
                goals: ['Solve the case'],
                conflicts: ['Past trauma'],
                relationships: [],
              },
            ],
          }),
          plot_structure: null,
          outline_structure: JSON.stringify({
            type: 'three_act',
            acts: [
              {
                number: 1,
                name: 'Setup',
                description: 'Introduce the world',
                beats: [],
                targetWordCount: 20000,
                chapters: [
                  {
                    number: 1,
                    title: 'Opening',
                    summary: 'The story begins',
                    actNumber: 1,
                    povCharacter: 'Detective Smith',
                    wordCountTarget: 2200,
                    scenes: [
                      {
                        id: 'scene-1',
                        order: 1,
                        location: 'Police Station',
                        characters: ['Detective Smith'],
                        povCharacter: 'Detective Smith',
                        goal: 'Receive new case',
                        conflict: 'Reluctance',
                        outcome: 'yes',
                        emotionalBeat: 'Determination',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        }),
      };

      // Mock previous chapter summary (no previous for chapter 1)
      const mockPrevChapterStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      // Mock brief storage
      const mockInsertBriefStmt = {
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn().mockReturnValue([]),
      };

      // Default mock for any additional db.prepare calls
      const defaultMockStmt = {
        run: jest.fn(),
        get: jest.fn().mockReturnValue(null),
        all: jest.fn().mockReturnValue([]),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockBookStmt)
        .mockReturnValueOnce(mockPrevChapterStmt)
        .mockReturnValueOnce(mockInsertBriefStmt)
        .mockReturnValue(defaultMockStmt);

      const result = await service.generateChapterBrief({
        bookId,
        chapterNumber,
      });

      expect(result).toBeDefined();
      expect(result.chapterNumber).toBe(1);
      expect(result.bookId).toBe(bookId);
      expect(result.wordCountTarget).toBe(2200);
      expect(result.id).toBeDefined();
    });

    it('should throw error if book context not found', async () => {
      const mockBookStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockBookStmt);

      await expect(
        service.generateChapterBrief({
          bookId: 'nonexistent',
          chapterNumber: 1,
        })
      ).rejects.toThrow('Book context not found');
    });

    it('should throw error if chapter not in outline', async () => {
      const mockBookStmt = {
        get: jest.fn().mockReturnValue({
          id: 'book-123',
          outline_structure: JSON.stringify({
            type: 'three_act',
            acts: [
              {
                number: 1,
                chapters: [], // No chapters
              },
            ],
          }),
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValue(mockBookStmt);

      await expect(
        service.generateChapterBrief({
          bookId: 'book-123',
          chapterNumber: 99, // Non-existent chapter
        })
      ).rejects.toThrow('Chapter 99 not found in outline');
    });
  });

  // ============================================================================
  // buildChapterPromptFromBrief
  // ============================================================================

  describe('buildChapterPromptFromBrief', () => {
    const mockBrief = {
      id: 'brief-123',
      bookId: 'book-123',
      chapterNumber: 1,
      title: 'The Beginning',
      summary: 'Our story starts here',
      wordCountTarget: 2200,
      wordCountMin: 1980,
      wordCountMax: 2420,
      storyPercentage: 5,
      commercialBeats: [
        { name: 'Opening Hook', description: 'Hook the reader', readerExpectation: 'Immediate engagement' },
      ],
      pacingGuidance: 'medium' as const,
      toneNotes: ['Establish voice', 'Create atmosphere'],
      sceneRequirements: [
        { goal: 'Introduce protagonist', conflict: 'Internal doubt', outcome: 'yes', emotionalBeat: 'Curiosity' },
      ],
      previousChapterSummary: null,
      nextChapterPreview: 'Next: "Discovery" - Something unexpected happens',
      characterStates: [
        {
          characterId: 'char-1',
          characterName: 'Hero',
          role: 'protagonist',
          currentEmotionalState: 'anxious',
          currentLocation: 'Home',
          currentGoals: ['Find the truth'],
          relevanceToChapter: 'pov' as const,
          voiceNotes: 'Direct, introspective',
        },
      ],
      plotThreads: [
        {
          threadName: 'Main Mystery',
          threadType: 'main' as const,
          currentPhase: 'setup',
          chapterRole: 'introduces' as const,
          notes: 'Mystery begins here',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockStoryDNA: StoryDNA = {
      genre: 'thriller',
      subgenre: 'psychological',
      tone: 'dark',
      themes: ['betrayal', 'identity'],
      proseStyle: 'terse',
    };

    it('should build a comprehensive prompt from the brief', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Chapter 1');
      expect(result).toContain('The Beginning');
      expect(result).toContain('2200 words');
      expect(result).toContain('Opening Hook');
      expect(result).toContain('MEDIUM');
      expect(result).toContain('Hero');
      expect(result).toContain('Main Mystery');
    });

    it('should include word count budget section', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Word Count Budget');
      expect(result).toContain('Target: 2200');
      expect(result).toContain('1980 - 2420');
    });

    it('should include commercial beat requirements', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Commercial Beat Requirements');
      expect(result).toContain('Opening Hook');
      expect(result).toContain('Immediate engagement');
    });

    it('should include character states', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Character States');
      expect(result).toContain('Hero');
      expect(result).toContain('POV');
      expect(result).toContain('anxious');
    });

    it('should include plot threads', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Plot Threads');
      expect(result).toContain('Main Mystery');
      expect(result).toContain('INTRODUCES');
    });

    it('should include style requirements from StoryDNA', () => {
      const result = service.buildChapterPromptFromBrief(mockBrief, mockStoryDNA);

      expect(result).toContain('Style Requirements');
      expect(result).toContain('dark');
      expect(result).toContain('terse');
      expect(result).toContain('betrayal');
    });

    it('should include editorial guidance when present', () => {
      const briefWithEditorial = {
        ...mockBrief,
        editorialGuidance: {
          vebIssues: [
            {
              issueType: 'Exposition',
              description: 'Info dump detected',
              severity: 'moderate' as const,
              remedy: 'Show rather than tell',
            },
          ],
          priorityScore: 65,
          focusAreas: ['Reduce exposition'],
          avoidPatterns: ['Info dumps'],
          styleGuidance: 'Keep it tight',
        },
      };

      const result = service.buildChapterPromptFromBrief(briefWithEditorial, mockStoryDNA);

      expect(result).toContain('Editorial Guidance');
      expect(result).toContain('65');
      expect(result).toContain('Reduce exposition');
    });

    it('should include lessons learned when present', () => {
      const briefWithLessons = {
        ...mockBrief,
        lessonsLearned: [
          'Maintain consistent voice',
          'End scenes on tension',
        ],
      };

      const result = service.buildChapterPromptFromBrief(briefWithLessons, mockStoryDNA);

      expect(result).toContain('Lessons from Previous Chapters');
      expect(result).toContain('Maintain consistent voice');
    });
  });

  // ============================================================================
  // generateAllChapterBriefs
  // ============================================================================

  describe('generateAllChapterBriefs', () => {
    it('should generate briefs for all chapters in order', async () => {
      const bookId = 'book-123';

      // Mock book context with multiple chapters
      const mockBookStmt = {
        get: jest.fn().mockReturnValue({
          id: bookId,
          project_id: 'project-123',
          genre: 'thriller',
          story_dna: JSON.stringify({
            genre: 'thriller',
            subgenre: '',
            tone: 'neutral',
            themes: [],
            proseStyle: 'standard',
          }),
          story_bible: JSON.stringify({ characters: [] }),
          plot_structure: null,
          outline_structure: JSON.stringify({
            type: 'three_act',
            acts: [
              {
                number: 1,
                name: 'Act 1',
                chapters: [
                  { number: 1, title: 'Ch 1', summary: 'First', actNumber: 1, povCharacter: 'Hero', wordCountTarget: 2000, scenes: [] },
                  { number: 2, title: 'Ch 2', summary: 'Second', actNumber: 1, povCharacter: 'Hero', wordCountTarget: 2200, scenes: [] },
                ],
              },
            ],
          }),
        }),
      };

      const mockPrevChapterStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      const mockInsertBriefStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockBookStmt)
        .mockReturnValueOnce(mockPrevChapterStmt)
        .mockReturnValueOnce(mockInsertBriefStmt)
        .mockReturnValueOnce(mockBookStmt)
        .mockReturnValueOnce(mockPrevChapterStmt)
        .mockReturnValueOnce(mockInsertBriefStmt);

      const result = await service.generateAllChapterBriefs(bookId, false);

      expect(result.briefs).toHaveLength(2);
      expect(result.generationOrder).toEqual([1, 2]);
      expect(result.totalWordCountBudget).toBe(4200); // 2000 + 2200
    });
  });

  // ============================================================================
  // generateRevisionBrief
  // ============================================================================

  describe('generateRevisionBrief', () => {
    it('should generate a brief with editorial guidance', async () => {
      const bookId = 'book-123';
      const chapterNumber = 1;
      const vebIssues = {
        scenePurpose: {
          earned: false,
          reasoning: 'Scene does not advance plot',
          recommendation: 'Cut or combine with another scene',
        },
        expositionIssues: [
          { issue: 'info_dump', quote: 'The history of...', suggestion: 'Weave into dialogue', severity: 'moderate' },
        ],
      };

      // Mock context queries
      const mockBookStmt = {
        get: jest.fn().mockReturnValue({
          id: bookId,
          genre: 'thriller',
          story_dna: JSON.stringify({ genre: 'thriller', subgenre: '', tone: 'neutral', themes: [], proseStyle: 'standard' }),
          story_bible: JSON.stringify({ characters: [] }),
          outline_structure: JSON.stringify({
            type: 'three_act',
            acts: [
              {
                number: 1,
                chapters: [
                  { number: 1, title: 'Ch 1', summary: 'First', actNumber: 1, povCharacter: 'Hero', wordCountTarget: 2000, scenes: [] },
                ],
              },
            ],
          }),
        }),
      };

      const mockPrevChapterStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      const mockVebStmt = {
        get: jest.fn().mockReturnValue(null), // No VEB report
      };

      const mockInsertBriefStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockBookStmt)
        .mockReturnValueOnce(mockPrevChapterStmt)
        .mockReturnValueOnce(mockVebStmt)
        .mockReturnValueOnce(mockInsertBriefStmt);

      const result = await service.generateRevisionBrief(bookId, chapterNumber, vebIssues);

      expect(result).toBeDefined();
      expect(result.chapterNumber).toBe(1);
      // Editorial guidance should be present
      expect(result.editorialGuidance).toBeDefined();
    });
  });
});
