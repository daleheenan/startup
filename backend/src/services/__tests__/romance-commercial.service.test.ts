import { jest } from '@jest/globals';

// Mock logger
jest.mock('../logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock database
jest.mock('../../db/connection.js');

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

import { REQUIRED_ROMANCE_BEATS, BEAT_PLACEMENT_PERCENTAGES } from '../romance-commercial.service';
import type { RomanceBeatType } from '../romance-commercial.service';

let romanceCommercialService: any;
let mockDb: any;

describe('RomanceCommercialService', () => {
  const testProjectId = 'test-romance-project-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    const serviceModule = await import('../romance-commercial.service.js');
    romanceCommercialService = serviceModule.romanceCommercialService;
  });

  describe('setHeatLevel', () => {
    it('should set heat level 1 with default options', () => {
      const mockStmt = {
        run: jest.fn(),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.setHeatLevel(testProjectId, 1);

      expect(result.projectId).toBe(testProjectId);
      expect(result.heatLevel).toBe(1);
      expect(result.fadeToBlack).toBe(true);
      expect(result.onPageIntimacy).toBe(false);
      expect(result.sensualityFocus).toBe('balanced');
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should throw error for heat level below 1', () => {
      expect(() => {
        romanceCommercialService.setHeatLevel(testProjectId, 0);
      }).toThrow('Heat level must be between 1 and 5');
    });

    it('should throw error for heat level above 5', () => {
      expect(() => {
        romanceCommercialService.setHeatLevel(testProjectId, 6);
      }).toThrow('Heat level must be between 1 and 5');
    });

    it('should set heat level 5 with explicit intimacy', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.setHeatLevel(testProjectId, 5);

      expect(result.heatLevel).toBe(5);
      expect(result.fadeToBlack).toBe(false);
      expect(result.onPageIntimacy).toBe(true);
    });

    it('should accept custom options', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.setHeatLevel(testProjectId, 3, {
        contentWarnings: ['explicit content'],
        fadeToBlack: true,
        sensualityFocus: 'emotional',
      });

      expect(result.contentWarnings).toEqual(['explicit content']);
      expect(result.fadeToBlack).toBe(true);
      expect(result.sensualityFocus).toBe('emotional');
    });
  });

  describe('getHeatLevel', () => {
    it('should return null for non-existent project', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.getHeatLevel('non-existent');

      expect(result).toBeNull();
    });

    it('should retrieve heat level configuration', () => {
      const mockRow = {
        id: 'heat-1',
        project_id: testProjectId,
        heat_level: 4,
        content_warnings: '["explicit content"]',
        fade_to_black: 0,
        on_page_intimacy: 1,
        sensuality_focus: 'physical',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.getHeatLevel(testProjectId);

      expect(result?.heatLevel).toBe(4);
      expect(result?.contentWarnings).toEqual(['explicit content']);
      expect(result?.fadeToBlack).toBe(false);
      expect(result?.onPageIntimacy).toBe(true);
      expect(result?.sensualityFocus).toBe('physical');
    });
  });

  describe('trackBeat', () => {
    it('should track a basic romance beat', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.trackBeat(testProjectId, 'meet_cute', 1);

      expect(result.projectId).toBe(testProjectId);
      expect(result.beatType).toBe('meet_cute');
      expect(result.chapterNumber).toBe(1);
      expect(result.completed).toBe(false);
    });

    it('should throw error for invalid beat type', () => {
      expect(() => {
        romanceCommercialService.trackBeat(testProjectId, 'invalid_beat', 1);
      }).toThrow('Invalid beat type: invalid_beat');
    });

    it('should throw error for emotional intensity below 1', () => {
      expect(() => {
        romanceCommercialService.trackBeat(testProjectId, 'first_kiss', 5, {
          emotionalIntensity: 0,
        });
      }).toThrow('Emotional intensity must be between 1 and 10');
    });

    it('should throw error for emotional intensity above 10', () => {
      expect(() => {
        romanceCommercialService.trackBeat(testProjectId, 'first_kiss', 5, {
          emotionalIntensity: 11,
        });
      }).toThrow('Emotional intensity must be between 1 and 10');
    });

    it('should track beat with all details', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.trackBeat(testProjectId, 'first_kiss', 8, {
        sceneDescription: 'Under the stars',
        emotionalIntensity: 9,
        notes: 'Key moment',
        completed: true,
      });

      expect(result.sceneDescription).toBe('Under the stars');
      expect(result.emotionalIntensity).toBe(9);
      expect(result.notes).toBe('Key moment');
      expect(result.completed).toBe(true);
    });
  });

  describe('getBeatTracking', () => {
    it('should return empty array for project with no beats', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.getBeatTracking(testProjectId);

      expect(result).toEqual([]);
    });

    it('should return all tracked beats ordered by chapter', () => {
      const mockRows = [
        {
          id: 'beat-1',
          project_id: testProjectId,
          beat_type: 'meet_cute',
          chapter_number: 1,
          scene_description: 'First meeting',
          emotional_intensity: 7,
          completed: 1,
          notes: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'beat-2',
          project_id: testProjectId,
          beat_type: 'first_kiss',
          chapter_number: 8,
          scene_description: null,
          emotional_intensity: 9,
          completed: 0,
          notes: 'Important beat',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.getBeatTracking(testProjectId);

      expect(result).toHaveLength(2);
      expect(result[0].beatType).toBe('meet_cute');
      expect(result[0].chapterNumber).toBe(1);
      expect(result[1].beatType).toBe('first_kiss');
      expect(result[1].chapterNumber).toBe(8);
    });
  });

  describe('validateBeats', () => {
    it('should identify missing required beats', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.validateBeats(testProjectId, 25);

      expect(result.allRequiredBeatsPresent).toBe(false);
      expect(result.hasHEAorHFN).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.beatResults).toHaveLength(11);
    });

    it('should validate complete romance structure', () => {
      const mockRows = [
        { beat_type: 'meet_cute', chapter_number: 2 },
        { beat_type: 'first_kiss', chapter_number: 10 },
        { beat_type: 'black_moment', chapter_number: 19 },
        { beat_type: 'declaration', chapter_number: 22 },
        { beat_type: 'hea_hfn', chapter_number: 24 },
      ].map((beat, index) => ({
        id: `beat-${index}`,
        project_id: testProjectId,
        beat_type: beat.beat_type,
        chapter_number: beat.chapter_number,
        scene_description: null,
        emotional_intensity: null,
        completed: 1,
        notes: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }));

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.validateBeats(testProjectId, 25);

      expect(result.allRequiredBeatsPresent).toBe(true);
      expect(result.hasHEAorHFN).toBe(true);
    });

    it('should detect beat occurring too early', () => {
      const mockRows = [
        {
          id: 'beat-1',
          project_id: testProjectId,
          beat_type: 'first_kiss',
          chapter_number: 1,
          scene_description: null,
          emotional_intensity: null,
          completed: 1,
          notes: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.validateBeats(testProjectId, 30);

      const firstKiss = result.beatResults.find((b: any) => b.beatType === 'first_kiss');
      expect(firstKiss?.withinTolerance).toBe(false);
      expect(firstKiss?.issue).toContain('too early');
    });
  });

  describe('getSuggestedBeats', () => {
    it('should return suggestions for all beat types', () => {
      const result = romanceCommercialService.getSuggestedBeats(25);

      expect(result).toHaveLength(11);
      expect(result.every((s: any) => s.beatType)).toBe(true);
      expect(result.every((s: any) => s.suggestedChapter > 0)).toBe(true);
      expect(result.every((s: any) => s.description)).toBe(true);
    });

    it('should scale suggestions based on total chapters', () => {
      const small = romanceCommercialService.getSuggestedBeats(10);
      const large = romanceCommercialService.getSuggestedBeats(50);

      const smallMeetCute = small.find((s: any) => s.beatType === 'meet_cute')?.suggestedChapter || 0;
      const largeMeetCute = large.find((s: any) => s.beatType === 'meet_cute')?.suggestedChapter || 0;

      expect(largeMeetCute).toBeGreaterThan(smallMeetCute);
    });
  });

  describe('isHeartbreaker', () => {
    it('should fail when HEA/HFN is missing', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.isHeartbreaker(testProjectId, 25);

      expect(result.passes).toBe(false);
      expect(result.issues.some((i: string) => i.includes('HEARTBREAKER'))).toBe(true);
    });

    it('should pass for complete romance', () => {
      const mockRows = [
        { beat_type: 'meet_cute', chapter_number: 2 },
        { beat_type: 'first_kiss', chapter_number: 10 },
        { beat_type: 'black_moment', chapter_number: 19 },
        { beat_type: 'declaration', chapter_number: 22 },
        { beat_type: 'hea_hfn', chapter_number: 24 },
      ].map((beat, index) => ({
        id: `beat-${index}`,
        project_id: testProjectId,
        beat_type: beat.beat_type,
        chapter_number: beat.chapter_number,
        scene_description: null,
        emotional_intensity: null,
        completed: 1,
        notes: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }));

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = romanceCommercialService.isHeartbreaker(testProjectId, 25);

      expect(result.passes).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('deleteBeat', () => {
    it('should delete a tracked beat', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      romanceCommercialService.deleteBeat(testProjectId, 'meet_cute');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM romance_beats WHERE project_id = ? AND beat_type = ?'
      );
      expect(mockStmt.run).toHaveBeenCalledWith(testProjectId, 'meet_cute');
    });
  });

  describe('deleteHeatLevel', () => {
    it('should delete heat level configuration', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      romanceCommercialService.deleteHeatLevel(testProjectId);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM romance_heat_levels WHERE project_id = ?'
      );
      expect(mockStmt.run).toHaveBeenCalledWith(testProjectId);
    });
  });

  describe('Constants validation', () => {
    it('should have all required beats defined', () => {
      expect(REQUIRED_ROMANCE_BEATS).toContain('meet_cute');
      expect(REQUIRED_ROMANCE_BEATS).toContain('first_kiss');
      expect(REQUIRED_ROMANCE_BEATS).toContain('black_moment');
      expect(REQUIRED_ROMANCE_BEATS).toContain('declaration');
      expect(REQUIRED_ROMANCE_BEATS).toContain('hea_hfn');
    });

    it('should have placement percentages for all beats', () => {
      const beatTypes: RomanceBeatType[] = [
        'meet_cute',
        'first_attraction',
        'first_conflict',
        'first_touch',
        'first_kiss',
        'first_intimacy',
        'black_moment',
        'grand_gesture',
        'declaration',
        'commitment',
        'hea_hfn',
      ];

      beatTypes.forEach(beatType => {
        expect(BEAT_PLACEMENT_PERCENTAGES[beatType]).toBeDefined();
        expect(BEAT_PLACEMENT_PERCENTAGES[beatType].ideal).toBeGreaterThan(0);
        expect(BEAT_PLACEMENT_PERCENTAGES[beatType].min).toBeLessThanOrEqual(BEAT_PLACEMENT_PERCENTAGES[beatType].ideal);
        expect(BEAT_PLACEMENT_PERCENTAGES[beatType].max).toBeGreaterThanOrEqual(BEAT_PLACEMENT_PERCENTAGES[beatType].ideal);
      });
    });
  });
});
