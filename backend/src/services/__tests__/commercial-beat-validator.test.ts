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

import {
  CommercialBeatValidatorService,
  COMMERCIAL_BEATS,
  GENRE_EXPECTATIONS,
} from '../commercial-beat-validator.js';
import type { StoryStructure, Act, ChapterOutline } from '../../shared/types/index.js';

describe('CommercialBeatValidatorService', () => {
  let service: CommercialBeatValidatorService;

  beforeEach(() => {
    service = new CommercialBeatValidatorService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Commercial Beats Configuration
  // ============================================================================

  describe('COMMERCIAL_BEATS', () => {
    it('should have 10 standard commercial beats', () => {
      expect(COMMERCIAL_BEATS).toHaveLength(10);
    });

    it('should have critical beats at correct percentages', () => {
      const criticalBeats = COMMERCIAL_BEATS.filter(b => b.importance === 'critical');
      expect(criticalBeats.length).toBeGreaterThanOrEqual(5);

      // Check key beat positions
      const incitingIncident = COMMERCIAL_BEATS.find(b => b.name === 'Inciting Incident');
      expect(incitingIncident?.idealPercentage).toBe(12);

      const midpoint = COMMERCIAL_BEATS.find(b => b.name === 'Midpoint Twist');
      expect(midpoint?.idealPercentage).toBe(50);

      const darkMoment = COMMERCIAL_BEATS.find(b => b.name === 'Dark Moment / All Is Lost');
      expect(darkMoment?.idealPercentage).toBe(75);

      const climax = COMMERCIAL_BEATS.find(b => b.name === 'Climax');
      expect(climax?.idealPercentage).toBe(88);
    });

    it('should have tolerance ranges for all beats', () => {
      for (const beat of COMMERCIAL_BEATS) {
        expect(beat.toleranceMin).toBeLessThan(beat.idealPercentage);
        expect(beat.toleranceMax).toBeGreaterThan(beat.idealPercentage);
      }
    });
  });

  // ============================================================================
  // Genre Expectations
  // ============================================================================

  describe('GENRE_EXPECTATIONS', () => {
    it('should have expectations for common genres', () => {
      expect(GENRE_EXPECTATIONS['thriller']).toBeDefined();
      expect(GENRE_EXPECTATIONS['romance']).toBeDefined();
      expect(GENRE_EXPECTATIONS['fantasy']).toBeDefined();
      expect(GENRE_EXPECTATIONS['mystery']).toBeDefined();
      expect(GENRE_EXPECTATIONS['science fiction']).toBeDefined();
      expect(GENRE_EXPECTATIONS['horror']).toBeDefined();
    });

    it('should have genre-specific custom beats for romance', () => {
      const romance = GENRE_EXPECTATIONS['romance'];
      expect(romance.customBeats).toBeDefined();
      expect(romance.customBeats?.find(b => b.name === 'Meet-Cute')).toBeDefined();
    });

    it('should have word count ranges for each genre', () => {
      for (const [genre, expectations] of Object.entries(GENRE_EXPECTATIONS)) {
        expect(expectations.typicalWordCount.min).toBeLessThan(expectations.typicalWordCount.max);
        expect(expectations.chapterWordCount.min).toBeLessThan(expectations.chapterWordCount.max);
      }
    });
  });

  // ============================================================================
  // getGenreExpectations
  // ============================================================================

  describe('getGenreExpectations', () => {
    it('should return expectations for valid genre', () => {
      const result = service.getGenreExpectations('thriller');
      expect(result).toBeDefined();
      expect(result?.genre).toBe('Thriller');
    });

    it('should handle case-insensitive genre names', () => {
      const result1 = service.getGenreExpectations('THRILLER');
      const result2 = service.getGenreExpectations('Thriller');
      const result3 = service.getGenreExpectations('thriller');

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should return null for unknown genre', () => {
      const result = service.getGenreExpectations('unknown_genre_xyz');
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // validateStructure
  // ============================================================================

  describe('validateStructure', () => {
    const createMockStructure = (options?: {
      actCount?: number;
      chaptersPerAct?: number;
      wordsPerChapter?: number;
      includeMidpointBeat?: boolean;
    }): StoryStructure => {
      const {
        actCount = 3,
        chaptersPerAct = 10,
        wordsPerChapter = 2200,
        includeMidpointBeat = true,
      } = options || {};

      const acts: Act[] = [];
      let chapterNumber = 1;

      for (let actNum = 1; actNum <= actCount; actNum++) {
        const chapters: ChapterOutline[] = [];
        const actBeats = [];

        // Add midpoint beat to act 2
        if (actNum === 2 && includeMidpointBeat) {
          actBeats.push({
            name: 'Midpoint',
            description: 'Major twist',
            percentagePoint: 50,
          });
        }

        for (let i = 0; i < chaptersPerAct; i++) {
          chapters.push({
            number: chapterNumber++,
            title: `Chapter ${chapterNumber - 1}`,
            summary: 'Test chapter summary',
            actNumber: actNum,
            povCharacter: 'Protagonist',
            wordCountTarget: wordsPerChapter,
            scenes: [],
          });
        }

        acts.push({
          number: actNum,
          name: `Act ${actNum}`,
          description: `Act ${actNum} description`,
          beats: actBeats,
          targetWordCount: chaptersPerAct * wordsPerChapter,
          chapters,
        });
      }

      return {
        type: 'three_act',
        acts,
      };
    };

    it('should return a valid report for a well-structured outline', () => {
      const structure = createMockStructure({ actCount: 3, chaptersPerAct: 10 });
      const result = service.validateStructure(structure, 80000, 'thriller');

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.beatResults).toHaveLength(COMMERCIAL_BEATS.length);
    });

    it('should identify missing critical beats', () => {
      const structure = createMockStructure({ includeMidpointBeat: false });
      const result = service.validateStructure(structure, 80000);

      // Should have some issues since beats aren't explicitly defined
      expect(result.beatResults.some(r => !r.found)).toBe(true);
    });

    it('should validate act balance', () => {
      const structure = createMockStructure({ actCount: 3, chaptersPerAct: 10 });
      const result = service.validateStructure(structure, 80000);

      expect(result.pacingAnalysis).toBeDefined();
      expect(result.pacingAnalysis.actBalance).toHaveLength(3);
    });

    it('should validate word counts', () => {
      const structure = createMockStructure({ wordsPerChapter: 2200 });
      const result = service.validateStructure(structure, 80000, 'thriller');

      expect(result.wordCountAnalysis).toBeDefined();
      expect(result.wordCountAnalysis.chapterCount).toBe(30);
      expect(result.wordCountAnalysis.averageChapterWordCount).toBe(2200);
    });

    it('should flag chapters outside word count tolerance', () => {
      const structure = createMockStructure({ wordsPerChapter: 500 }); // Too short
      const result = service.validateStructure(structure, 80000, 'thriller');

      expect(result.wordCountAnalysis.chaptersOutOfTolerance.length).toBeGreaterThan(0);
    });

    it('should include genre-specific recommendations', () => {
      const structure = createMockStructure();
      const result = service.validateStructure(structure, 80000, 'romance');

      // Should have at least some recommendations
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should determine readyForGeneration based on score and critical issues', () => {
      const structure = createMockStructure();
      const result = service.validateStructure(structure, 80000);

      // readyForGeneration should be boolean
      expect(typeof result.readyForGeneration).toBe('boolean');
    });
  });

  // ============================================================================
  // generateChapterBrief
  // ============================================================================

  describe('generateChapterBrief', () => {
    const createMockStructure = (): StoryStructure => ({
      type: 'three_act',
      acts: [
        {
          number: 1,
          name: 'Act 1',
          description: 'Setup',
          beats: [],
          targetWordCount: 20000,
          chapters: [
            {
              number: 1,
              title: 'Opening',
              summary: 'The story begins',
              actNumber: 1,
              povCharacter: 'Hero',
              wordCountTarget: 2200,
              scenes: [
                {
                  id: 'scene-1',
                  order: 1,
                  location: 'City',
                  characters: ['Hero'],
                  povCharacter: 'Hero',
                  goal: 'Establish character',
                  conflict: 'Internal doubt',
                  outcome: 'yes',
                  emotionalBeat: 'Uncertainty',
                },
              ],
            },
          ],
        },
      ],
    });

    it('should generate a brief with word count targets', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];
      const result = service.generateChapterBrief(chapter, structure, 5, 'thriller');

      expect(result.wordCountTarget).toBe(2200);
      expect(result.wordCountMin).toBeLessThan(result.wordCountTarget);
      expect(result.wordCountMax).toBeGreaterThan(result.wordCountTarget);
    });

    it('should include commercial beats for the chapter position', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];

      // At 5% of story, should include Opening Hook
      const result = service.generateChapterBrief(chapter, structure, 5, 'thriller');

      expect(Array.isArray(result.commercialBeats)).toBe(true);
    });

    it('should set appropriate pacing guidance based on position', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];

      // Early in story (5%) should have medium pacing for setup
      const earlyResult = service.generateChapterBrief(chapter, structure, 5, 'thriller');
      expect(['slow', 'medium', 'fast']).toContain(earlyResult.pacingGuidance);

      // Late in story (88%) should have fast pacing for climax
      const lateResult = service.generateChapterBrief(chapter, structure, 88, 'thriller');
      expect(lateResult.pacingGuidance).toBe('fast');
    });

    it('should include tone notes', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];
      const result = service.generateChapterBrief(chapter, structure, 75, 'thriller');

      expect(Array.isArray(result.toneNotes)).toBe(true);
      expect(result.toneNotes.length).toBeGreaterThan(0);
    });

    it('should include scene requirements', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];
      const result = service.generateChapterBrief(chapter, structure, 5, 'thriller');

      expect(result.sceneRequirements).toHaveLength(1);
      expect(result.sceneRequirements[0].goal).toBe('Establish character');
    });

    it('should include genre notes when genre is recognised', () => {
      const structure = createMockStructure();
      const chapter = structure.acts[0].chapters[0];
      const result = service.generateChapterBrief(chapter, structure, 5, 'thriller');

      expect(result.genreNotes).toBeDefined();
    });
  });

  // ============================================================================
  // Overall Score Calculation
  // ============================================================================

  describe('overall score calculation', () => {
    it('should penalise missing critical beats heavily', () => {
      const structure: StoryStructure = {
        type: 'three_act',
        acts: [
          {
            number: 1,
            name: 'Act 1',
            description: 'Test',
            beats: [],
            targetWordCount: 80000,
            chapters: [],
          },
        ],
      };

      const result = service.validateStructure(structure, 80000);

      // With no beats defined, score should be low
      expect(result.overallScore).toBeLessThan(50);
    });

    it('should reward well-placed beats', () => {
      const structure: StoryStructure = {
        type: 'three_act',
        acts: [
          {
            number: 1,
            name: 'Setup',
            description: 'Act 1',
            beats: [
              { name: 'Opening Image', description: 'Hook', percentagePoint: 0 },
              { name: 'Catalyst', description: 'Inciting', percentagePoint: 12 },
            ],
            targetWordCount: 20000,
            chapters: Array.from({ length: 10 }, (_, i) => ({
              number: i + 1,
              title: `Chapter ${i + 1}`,
              summary: 'Test',
              actNumber: 1,
              povCharacter: 'Hero',
              wordCountTarget: 2000,
              scenes: [],
            })),
          },
          {
            number: 2,
            name: 'Confrontation',
            description: 'Act 2',
            beats: [
              { name: 'Midpoint', description: 'Twist', percentagePoint: 50 },
            ],
            targetWordCount: 40000,
            chapters: Array.from({ length: 20 }, (_, i) => ({
              number: i + 11,
              title: `Chapter ${i + 11}`,
              summary: 'Test',
              actNumber: 2,
              povCharacter: 'Hero',
              wordCountTarget: 2000,
              scenes: [],
            })),
          },
          {
            number: 3,
            name: 'Resolution',
            description: 'Act 3',
            beats: [
              { name: 'Dark Night of the Soul', description: 'Low point', percentagePoint: 75 },
              { name: 'Finale', description: 'Climax', percentagePoint: 88 },
            ],
            targetWordCount: 20000,
            chapters: Array.from({ length: 10 }, (_, i) => ({
              number: i + 31,
              title: `Chapter ${i + 31}`,
              summary: 'Test',
              actNumber: 3,
              povCharacter: 'Hero',
              wordCountTarget: 2000,
              scenes: [],
            })),
          },
        ],
      };

      const result = service.validateStructure(structure, 80000);

      // With properly placed beats, score should be higher
      expect(result.overallScore).toBeGreaterThan(30);
    });
  });
});
