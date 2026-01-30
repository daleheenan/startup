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

import type { PacingStyle, HookType, TwistType, ImpactLevel, ClockType, ReminderFrequency, CliffhangerFrequency } from '../thriller-commercial.service.js';

let thrillerCommercialService: any;
let mockDb: any;

describe('ThrillerCommercialService', () => {
  const testProjectId = 'test-thriller-project-123';
  const testProjectId2 = 'test-thriller-project-456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    const serviceModule = await import('../thriller-commercial.service.js');
    thrillerCommercialService = serviceModule.thrillerCommercialService;
  });

  describe('setPacingStyle', () => {
    describe('Happy path', () => {
      it('should set relentless pacing style with defaults', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.setPacingStyle(testProjectId, 'relentless');

        expect(result).toBeDefined();
        expect(result.projectId).toBe(testProjectId);
        expect(result.pacingStyle).toBe('relentless');
        expect(result.chapterHookRequired).toBe(true);
        expect(result.cliffhangerFrequency).toBe('most');
        expect(result.actionSceneRatio).toBe(40);
        expect(result.averageChapterTension).toBe(7);
        expect(mockDb.prepare).toHaveBeenCalled();
      });

      it('should set all valid pacing styles', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const styles: PacingStyle[] = ['relentless', 'escalating', 'rollercoaster', 'slow_burn'];

        styles.forEach((style, index) => {
          const result = thrillerCommercialService.setPacingStyle(`test-project-${index}`, style);
          expect(result.pacingStyle).toBe(style);
        });
      });

      it('should set custom options', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.setPacingStyle(testProjectId, 'escalating', {
          chapterHookRequired: false,
          cliffhangerFrequency: 'every',
          actionSceneRatio: 60,
          averageChapterTension: 8,
        });

        expect(result.pacingStyle).toBe('escalating');
        expect(result.chapterHookRequired).toBe(false);
        expect(result.cliffhangerFrequency).toBe('every');
        expect(result.actionSceneRatio).toBe(60);
        expect(result.averageChapterTension).toBe(8);
      });

      it('should update existing pacing configuration', () => {
        const mockStmt = { run: jest.fn() };
        const mockGetStmt = {
          get: jest.fn().mockReturnValue({
            id: 'pacing-1',
            project_id: testProjectId,
            pacing_style: 'relentless',
            chapter_hook_required: 1,
            cliffhanger_frequency: 'most',
            action_scene_ratio: 70,
            average_chapter_tension: 7,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          })
        };
        mockDb.prepare = jest.fn()
          .mockReturnValueOnce(mockStmt)
          .mockReturnValueOnce(mockStmt)
          .mockReturnValueOnce(mockGetStmt);

        thrillerCommercialService.setPacingStyle(testProjectId, 'slow_burn');
        const updated = thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
          actionSceneRatio: 70,
        });

        expect(updated.pacingStyle).toBe('relentless');
        expect(updated.actionSceneRatio).toBe(70);

        const retrieved = thrillerCommercialService.getPacingConfig(testProjectId);
        expect(retrieved?.pacingStyle).toBe('relentless');
      });

      it('should handle all cliffhanger frequency options', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const frequencies: CliffhangerFrequency[] = ['every', 'most', 'some'];

        frequencies.forEach((freq, index) => {
          const result = thrillerCommercialService.setPacingStyle(`test-project-freq-${index}`, 'relentless', {
            cliffhangerFrequency: freq,
          });
          expect(result.cliffhangerFrequency).toBe(freq);
        });
      });
    });

    describe('Edge cases', () => {
      it('should throw error for invalid pacing style', () => {
        expect(() => {
          thrillerCommercialService.setPacingStyle(testProjectId, 'invalid_style' as any);
        }).toThrow('Invalid pacing style: invalid_style');
      });

      it('should throw error for action scene ratio below 10', () => {
        expect(() => {
          thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
            actionSceneRatio: 5,
          });
        }).toThrow('Action scene ratio must be between 10 and 90');
      });

      it('should throw error for action scene ratio above 90', () => {
        expect(() => {
          thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
            actionSceneRatio: 95,
          });
        }).toThrow('Action scene ratio must be between 10 and 90');
      });

      it('should throw error for average tension below 1', () => {
        expect(() => {
          thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
            averageChapterTension: 0,
          });
        }).toThrow('Average chapter tension must be between 1 and 10');
      });

      it('should throw error for average tension above 10', () => {
        expect(() => {
          thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
            averageChapterTension: 11,
          });
        }).toThrow('Average chapter tension must be between 1 and 10');
      });
    });

    describe('Boundary conditions', () => {
      it('should handle boundary action scene ratio values', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const min = thrillerCommercialService.setPacingStyle(testProjectId, 'slow_burn', {
          actionSceneRatio: 10,
        });
        expect(min.actionSceneRatio).toBe(10);

        const max = thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
          actionSceneRatio: 90,
        });
        expect(max.actionSceneRatio).toBe(90);
      });

      it('should handle boundary tension values', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const min = thrillerCommercialService.setPacingStyle(testProjectId, 'slow_burn', {
          averageChapterTension: 1,
        });
        expect(min.averageChapterTension).toBe(1);

        const max = thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
          averageChapterTension: 10,
        });
        expect(max.averageChapterTension).toBe(10);
      });
    });
  });

  describe('getPacingConfig', () => {
    it('should return null for non-existent project', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = thrillerCommercialService.getPacingConfig('non-existent-project');
      expect(result).toBeNull();
    });

    it('should retrieve pacing configuration', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.setPacingStyle(testProjectId, 'rollercoaster', {
        actionSceneRatio: 55,
      });

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'rollercoaster',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 55,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getPacingConfig(testProjectId);

      expect(result).toBeDefined();
      expect(result?.pacingStyle).toBe('rollercoaster');
      expect(result?.actionSceneRatio).toBe(55);
    });

    it('should handle multiple projects independently', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless');
      thrillerCommercialService.setPacingStyle(testProjectId2, 'slow_burn');

      const mockGetStmt1 = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-2',
          project_id: testProjectId2,
          pacing_style: 'slow_burn',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'some',
          action_scene_ratio: 20,
          average_chapter_tension: 5,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt1).mockReturnValueOnce(mockGetStmt2);

      const result1 = thrillerCommercialService.getPacingConfig(testProjectId);
      const result2 = thrillerCommercialService.getPacingConfig(testProjectId2);

      expect(result1?.pacingStyle).toBe('relentless');
      expect(result2?.pacingStyle).toBe('slow_burn');
    });
  });

  describe('addChapterHook', () => {
    describe('Happy path', () => {
      it('should add a basic chapter hook', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addChapterHook(
          testProjectId,
          5,
          'cliffhanger',
          'The bomb timer hits 10 seconds',
          9
        );

        expect(result).toBeDefined();
        expect(result.projectId).toBe(testProjectId);
        expect(result.chapterNumber).toBe(5);
        expect(result.hookType).toBe('cliffhanger');
        expect(result.hookDescription).toBe('The bomb timer hits 10 seconds');
        expect(result.tensionLevel).toBe(9);
      });

      it('should add all valid hook types', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const hookTypes: HookType[] = [
          'cliffhanger',
          'revelation',
          'question',
          'threat',
          'betrayal',
          'countdown',
          'mystery_deepens',
          'reversal',
          'emotional_gut_punch',
          'foreshadowing',
        ];

        hookTypes.forEach((hookType, index) => {
          const result = thrillerCommercialService.addChapterHook(
            `test-project-hook-${index}`,
            index + 1,
            hookType,
            `Hook description for ${hookType}`,
            7
          );
          expect(result.hookType).toBe(hookType);
        });
      });

      it('should handle null hook description', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addChapterHook(
          testProjectId,
          3,
          'threat',
          null,
          6
        );

        expect(result.hookDescription).toBeNull();
      });

      it('should update existing chapter hook', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        thrillerCommercialService.addChapterHook(testProjectId, 5, 'question', 'First version', 5);
        const updated = thrillerCommercialService.addChapterHook(
          testProjectId,
          5,
          'cliffhanger',
          'Updated version',
          8
        );

        expect(updated.hookType).toBe('cliffhanger');
        expect(updated.hookDescription).toBe('Updated version');
        expect(updated.tensionLevel).toBe(8);
      });
    });

    describe('Edge cases', () => {
      it('should throw error for invalid hook type', () => {
        expect(() => {
          thrillerCommercialService.addChapterHook(
            testProjectId,
            5,
            'invalid_hook' as any,
            'description',
            7
          );
        }).toThrow('Invalid hook type: invalid_hook');
      });

      it('should throw error for tension level below 1', () => {
        expect(() => {
          thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'desc', 0);
        }).toThrow('Tension level must be between 1 and 10');
      });

      it('should throw error for tension level above 10', () => {
        expect(() => {
          thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'desc', 11);
        }).toThrow('Tension level must be between 1 and 10');
      });
    });

    describe('Boundary conditions', () => {
      it('should handle boundary tension values', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const min = thrillerCommercialService.addChapterHook(testProjectId, 1, 'question', null, 1);
        expect(min.tensionLevel).toBe(1);

        const max = thrillerCommercialService.addChapterHook(testProjectId, 2, 'threat', null, 10);
        expect(max.tensionLevel).toBe(10);
      });
    });
  });

  describe('getChapterHooks', () => {
    it('should return empty array for project with no hooks', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = thrillerCommercialService.getChapterHooks('non-existent-project');
      expect(result).toEqual([]);
    });

    it('should return all chapter hooks', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.addChapterHook(testProjectId, 1, 'threat', 'Hook 1', 7);
      thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'Hook 5', 9);
      thrillerCommercialService.addChapterHook(testProjectId, 10, 'revelation', 'Hook 10', 8);

      const mockRows = [
        {
          id: 'hook-1',
          project_id: testProjectId,
          chapter_number: 1,
          hook_type: 'threat',
          hook_description: 'Hook 1',
          tension_level: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'hook-5',
          project_id: testProjectId,
          chapter_number: 5,
          hook_type: 'cliffhanger',
          hook_description: 'Hook 5',
          tension_level: 9,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'hook-10',
          project_id: testProjectId,
          chapter_number: 10,
          hook_type: 'revelation',
          hook_description: 'Hook 10',
          tension_level: 8,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getChapterHooks(testProjectId);

      expect(result).toHaveLength(3);
      expect(result.map((h: any) => h.chapterNumber)).toContain(1);
      expect(result.map((h: any) => h.chapterNumber)).toContain(5);
      expect(result.map((h: any) => h.chapterNumber)).toContain(10);
    });

    it('should return hooks ordered by chapter number', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.addChapterHook(testProjectId, 10, 'revelation', 'Last', 8);
      thrillerCommercialService.addChapterHook(testProjectId, 1, 'threat', 'First', 7);
      thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'Middle', 9);

      const mockRows = [
        {
          id: 'hook-1',
          project_id: testProjectId,
          chapter_number: 1,
          hook_type: 'threat',
          hook_description: 'First',
          tension_level: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'hook-5',
          project_id: testProjectId,
          chapter_number: 5,
          hook_type: 'cliffhanger',
          hook_description: 'Middle',
          tension_level: 9,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'hook-10',
          project_id: testProjectId,
          chapter_number: 10,
          hook_type: 'revelation',
          hook_description: 'Last',
          tension_level: 8,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getChapterHooks(testProjectId);

      expect(result[0].chapterNumber).toBe(1);
      expect(result[1].chapterNumber).toBe(5);
      expect(result[2].chapterNumber).toBe(10);
    });
  });

  describe('addTwist', () => {
    describe('Happy path', () => {
      it('should add a basic twist', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTwist(
          testProjectId,
          15,
          'major_reveal',
          [3, 7, 12],
          'The detective is actually the killer',
          'high',
          true
        );

        expect(result).toBeDefined();
        expect(result.projectId).toBe(testProjectId);
        expect(result.chapterNumber).toBe(15);
        expect(result.twistType).toBe('major_reveal');
        expect(result.setupChapters).toEqual([3, 7, 12]);
        expect(result.description).toBe('The detective is actually the killer');
        expect(result.impactLevel).toBe('high');
        expect(result.foreshadowed).toBe(true);
      });

      it('should add all valid twist types', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const twistTypes: TwistType[] = [
          'major_reveal',
          'minor_reveal',
          'red_herring',
          'false_victory',
          'betrayal',
          'hidden_identity',
          'plot_reversal',
          'unreliable_info',
          'connection_reveal',
          'stakes_escalation',
        ];

        twistTypes.forEach((twistType, index) => {
          const result = thrillerCommercialService.addTwist(
            `test-project-twist-${index}`,
            10,
            twistType,
            [3, 5],
            `Description for ${twistType}`,
            'medium',
            true
          );
          expect(result.twistType).toBe(twistType);
        });
      });

      it('should handle all impact levels', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const impactLevels: ImpactLevel[] = ['low', 'medium', 'high', 'extreme'];

        impactLevels.forEach((impact, index) => {
          const result = thrillerCommercialService.addTwist(
            `test-project-impact-${index}`,
            10,
            'major_reveal',
            [5],
            'Description',
            impact,
            true
          );
          expect(result.impactLevel).toBe(impact);
        });
      });

      it('should use default parameters', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTwist(
          testProjectId,
          10,
          'major_reveal',
          [5],
          'Twist description'
        );

        expect(result.impactLevel).toBe('medium');
        expect(result.foreshadowed).toBe(true);
      });

      it('should handle null chapter number', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTwist(
          testProjectId,
          null,
          'major_reveal',
          [5],
          'Planned twist',
          'high',
          true
        );

        expect(result.chapterNumber).toBeNull();
      });

      it('should handle empty setup chapters', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTwist(
          testProjectId,
          10,
          'major_reveal',
          [],
          'Twist with no setup',
          'low',
          false
        );

        expect(result.setupChapters).toEqual([]);
      });
    });

    describe('Edge cases', () => {
      it('should throw error for invalid twist type', () => {
        expect(() => {
          thrillerCommercialService.addTwist(
            testProjectId,
            10,
            'invalid_twist' as any,
            [5],
            'Description'
          );
        }).toThrow('Invalid twist type: invalid_twist');
      });

      it('should throw error for invalid impact level', () => {
        expect(() => {
          thrillerCommercialService.addTwist(
            testProjectId,
            10,
            'major_reveal',
            [5],
            'Description',
            'ultra' as any
          );
        }).toThrow('Invalid impact level: ultra');
      });
    });
  });

  describe('getTwists', () => {
    it('should return empty array for project with no twists', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = thrillerCommercialService.getTwists('non-existent-project');
      expect(result).toEqual([]);
    });

    it('should return all twists', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.addTwist(testProjectId, 5, 'minor_reveal', [2], 'Twist 1');
      thrillerCommercialService.addTwist(testProjectId, 15, 'major_reveal', [8, 12], 'Twist 2');
      thrillerCommercialService.addTwist(testProjectId, 20, 'betrayal', [10], 'Twist 3');

      const mockRows = [
        {
          id: 'twist-1',
          project_id: testProjectId,
          chapter_number: 5,
          twist_type: 'minor_reveal',
          setup_chapters: '[2]',
          description: 'Twist 1',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'twist-2',
          project_id: testProjectId,
          chapter_number: 15,
          twist_type: 'major_reveal',
          setup_chapters: '[8,12]',
          description: 'Twist 2',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'twist-3',
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'betrayal',
          setup_chapters: '[10]',
          description: 'Twist 3',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getTwists(testProjectId);

      expect(result).toHaveLength(3);
    });

    it('should return twists ordered by chapter number', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.addTwist(testProjectId, 20, 'betrayal', [], 'Last');
      thrillerCommercialService.addTwist(testProjectId, 5, 'minor_reveal', [], 'First');
      thrillerCommercialService.addTwist(testProjectId, 15, 'major_reveal', [], 'Middle');

      const mockRows = [
        {
          id: 'twist-1',
          project_id: testProjectId,
          chapter_number: 5,
          twist_type: 'minor_reveal',
          setup_chapters: '[]',
          description: 'First',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'twist-2',
          project_id: testProjectId,
          chapter_number: 15,
          twist_type: 'major_reveal',
          setup_chapters: '[]',
          description: 'Middle',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'twist-3',
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'betrayal',
          setup_chapters: '[]',
          description: 'Last',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getTwists(testProjectId);

      expect(result[0].chapterNumber).toBe(5);
      expect(result[1].chapterNumber).toBe(15);
      expect(result[2].chapterNumber).toBe(20);
    });
  });

  describe('validateTwistSetup', () => {
    it('should validate properly foreshadowed twist', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const twist = thrillerCommercialService.addTwist(
        testProjectId,
        20,
        'major_reveal',
        [5, 10, 15],
        'Well-set-up twist',
        'high',
        true
      );

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: twist.id,
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'major_reveal',
          setup_chapters: '[5,10,15]',
          description: 'Well-set-up twist',
          impact_level: 'high',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.validateTwistSetup(testProjectId, twist.id);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag unforeshadowed twist', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const twist = thrillerCommercialService.addTwist(
        testProjectId,
        20,
        'major_reveal',
        [15],
        'Unforeshadowed twist',
        'high',
        false
      );

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: twist.id,
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'major_reveal',
          setup_chapters: '[15]',
          description: 'Unforeshadowed twist',
          impact_level: 'high',
          foreshadowed: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.validateTwistSetup(testProjectId, twist.id);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('not foreshadowed'))).toBe(true);
    });

    it('should flag twist with no setup chapters', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const twist = thrillerCommercialService.addTwist(
        testProjectId,
        20,
        'major_reveal',
        [],
        'No setup twist',
        'medium',
        true
      );

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: twist.id,
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'major_reveal',
          setup_chapters: '[]',
          description: 'No setup twist',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.validateTwistSetup(testProjectId, twist.id);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('No setup chapters'))).toBe(true);
    });

    it('should flag setup too close to twist', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const twist = thrillerCommercialService.addTwist(
        testProjectId,
        20,
        'major_reveal',
        [19],
        'Setup too close',
        'medium',
        true
      );

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: twist.id,
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'major_reveal',
          setup_chapters: '[19]',
          description: 'Setup too close',
          impact_level: 'medium',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.validateTwistSetup(testProjectId, twist.id);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('Setup too close'))).toBe(true);
    });

    it('should require extensive setup for extreme impact twists', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const twist = thrillerCommercialService.addTwist(
        testProjectId,
        20,
        'major_reveal',
        [15],
        'Extreme twist with minimal setup',
        'extreme',
        true
      );

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: twist.id,
          project_id: testProjectId,
          chapter_number: 20,
          twist_type: 'major_reveal',
          setup_chapters: '[15]',
          description: 'Extreme twist with minimal setup',
          impact_level: 'extreme',
          foreshadowed: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.validateTwistSetup(testProjectId, twist.id);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('Extreme impact'))).toBe(true);
    });

    it('should throw error for non-existent twist', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      expect(() => {
        thrillerCommercialService.validateTwistSetup(testProjectId, 'non-existent-id');
      }).toThrow('Twist not found');
    });
  });

  describe('addTickingClock', () => {
    describe('Happy path', () => {
      it('should add a basic ticking clock', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTickingClock(
          testProjectId,
          'deadline',
          'Bomb will explode in 24 hours'
        );

        expect(result).toBeDefined();
        expect(result.projectId).toBe(testProjectId);
        expect(result.clockType).toBe('deadline');
        expect(result.description).toBe('Bomb will explode in 24 hours');
        expect(result.reminderFrequency).toBe('regular');
        expect(result.active).toBe(true);
      });

      it('should add all valid clock types', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const clockTypes: ClockType[] = ['deadline', 'countdown', 'racing', 'decay', 'opportunity', 'survival'];

        clockTypes.forEach((clockType, index) => {
          const result = thrillerCommercialService.addTickingClock(
            `test-project-clock-${index}`,
            clockType,
            `Description for ${clockType}`
          );
          expect(result.clockType).toBe(clockType);
        });
      });

      it('should add clock with all options', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTickingClock(
          testProjectId,
          'countdown',
          'Nuclear launch in T-minus 60 minutes',
          {
            startChapter: 5,
            resolutionChapter: 25,
            stakes: 'Global nuclear war',
            timeRemaining: '60 minutes',
            reminderFrequency: 'constant',
            active: true,
          }
        );

        expect(result.startChapter).toBe(5);
        expect(result.resolutionChapter).toBe(25);
        expect(result.stakes).toBe('Global nuclear war');
        expect(result.timeRemaining).toBe('60 minutes');
        expect(result.reminderFrequency).toBe('constant');
        expect(result.active).toBe(true);
      });

      it('should handle all reminder frequencies', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const frequencies: ReminderFrequency[] = ['constant', 'regular', 'occasional'];

        frequencies.forEach((freq, index) => {
          const result = thrillerCommercialService.addTickingClock(
            `test-project-freq-${index}`,
            'deadline',
            'Description',
            { reminderFrequency: freq }
          );
          expect(result.reminderFrequency).toBe(freq);
        });
      });
    });

    describe('Edge cases', () => {
      it('should throw error for invalid clock type', () => {
        expect(() => {
          thrillerCommercialService.addTickingClock(testProjectId, 'invalid_clock' as any, 'Description');
        }).toThrow('Invalid clock type: invalid_clock');
      });

      it('should handle inactive clock', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = thrillerCommercialService.addTickingClock(
          testProjectId,
          'deadline',
          'Inactive clock',
          { active: false }
        );

        expect(result.active).toBe(false);
      });
    });
  });

  describe('getActiveTimePressure', () => {
    it('should return empty array for project with no clocks', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = thrillerCommercialService.getActiveTimePressure('non-existent-project');
      expect(result).toEqual([]);
    });

    it('should return only active clocks', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      thrillerCommercialService.addTickingClock(testProjectId, 'deadline', 'Active 1', { active: true });
      thrillerCommercialService.addTickingClock(testProjectId, 'countdown', 'Active 2', { active: true });
      thrillerCommercialService.addTickingClock(testProjectId, 'racing', 'Inactive', { active: false });

      const mockRows = [
        {
          id: 'clock-1',
          project_id: testProjectId,
          clock_type: 'deadline',
          description: 'Active 1',
          start_chapter: null,
          resolution_chapter: null,
          stakes: null,
          time_remaining: null,
          reminder_frequency: 'regular',
          active: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'clock-2',
          project_id: testProjectId,
          clock_type: 'countdown',
          description: 'Active 2',
          start_chapter: null,
          resolution_chapter: null,
          stakes: null,
          time_remaining: null,
          reminder_frequency: 'regular',
          active: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getActiveTimePressure(testProjectId);

      expect(result).toHaveLength(2);
      expect(result.every((c: any) => c.active)).toBe(true);
    });

    it('should return clocks ordered by creation time', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const clock1 = thrillerCommercialService.addTickingClock(testProjectId, 'deadline', 'First');
      const clock2 = thrillerCommercialService.addTickingClock(testProjectId, 'countdown', 'Second');

      const mockRows = [
        {
          id: clock1.id,
          project_id: testProjectId,
          clock_type: 'deadline',
          description: 'First',
          start_chapter: null,
          resolution_chapter: null,
          stakes: null,
          time_remaining: null,
          reminder_frequency: 'regular',
          active: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: clock2.id,
          project_id: testProjectId,
          clock_type: 'countdown',
          description: 'Second',
          start_chapter: null,
          resolution_chapter: null,
          stakes: null,
          time_remaining: null,
          reminder_frequency: 'regular',
          active: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const mockGetStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = thrillerCommercialService.getActiveTimePressure(testProjectId);

      expect(result[0].id).toBe(clock1.id);
      expect(result[1].id).toBe(clock2.id);
    });
  });

  describe('deactivateTickingClock', () => {
    it('should deactivate a clock', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const clock = thrillerCommercialService.addTickingClock(testProjectId, 'deadline', 'Test clock');

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.deactivateTickingClock(clock.id);

      const mockGetStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const active = thrillerCommercialService.getActiveTimePressure(testProjectId);
      expect(active).toHaveLength(0);
    });

    it('should not throw for non-existent clock', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      expect(() => {
        thrillerCommercialService.deactivateTickingClock('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('calculateTensionCurve', () => {
    beforeEach(() => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless');
    });

    it('should calculate tension curve for book with no hooks', () => {
      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      expect(result.chapters).toHaveLength(20);
      expect(result.averageTension).toBeGreaterThan(0);
      expect(result.pacingAnalysis).toContain('Relentless');
    });

    it('should calculate relentless pacing correctly', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      // Relentless should maintain high tension
      const avgTension = result.chapters.reduce((sum: number, ch: any) => sum + ch.tensionLevel, 0) / result.chapters.length;
      expect(avgTension).toBeGreaterThan(6);
    });

    it('should calculate escalating pacing correctly', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'escalating');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'escalating',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      // Escalating should increase over time
      const firstHalf = result.chapters.slice(0, 10).reduce((sum: number, ch: any) => sum + ch.tensionLevel, 0) / 10;
      const secondHalf = result.chapters.slice(10).reduce((sum: number, ch: any) => sum + ch.tensionLevel, 0) / 10;
      expect(secondHalf).toBeGreaterThan(firstHalf);
    });

    it('should incorporate chapter hooks into tension', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'High tension', 10);

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'hook-1',
            project_id: testProjectId,
            chapter_number: 5,
            hook_type: 'cliffhanger',
            hook_description: 'High tension',
            tension_level: 10,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          }
        ]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      const chapter5 = result.chapters.find((ch: any) => ch.chapterNumber === 5);
      expect(chapter5?.hasHook).toBe(true);
      expect(chapter5?.hookType).toBe('cliffhanger');
      expect(chapter5?.tensionLevel).toBe(10);
    });

    it('should identify tension peaks', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'rollercoaster');
      thrillerCommercialService.addChapterHook(testProjectId, 5, 'cliffhanger', 'Peak', 10);

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'rollercoaster',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'hook-1',
            project_id: testProjectId,
            chapter_number: 5,
            hook_type: 'cliffhanger',
            hook_description: 'Peak',
            tension_level: 10,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          }
        ]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      expect(result.tensionPeaks.length).toBeGreaterThan(0);
    });

    it('should identify tension valleys', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'rollercoaster');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'rollercoaster',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      expect(result.tensionValleys.length).toBeGreaterThan(0);
    });

    it('should handle book with no pacing config', () => {
      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      expect(result.chapters).toHaveLength(20);
      expect(result.pacingAnalysis).toContain('No pacing configuration');
    });

    it('should generate appropriate pacing analysis', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'slow_burn');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'slow_burn',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'some',
          action_scene_ratio: 20,
          average_chapter_tension: 5,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      expect(result.pacingAnalysis).toContain('Slow burn');
    });
  });

  describe('validatePacing', () => {
    it('should fail when no pacing configuration exists', () => {
      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetPacingStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('No pacing configuration'))).toBe(true);
    });

    it('should validate chapter hook requirements', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        chapterHookRequired: true,
      });
      thrillerCommercialService.addChapterHook(testProjectId, 1, 'threat', null, 7);
      thrillerCommercialService.addChapterHook(testProjectId, 2, 'cliffhanger', null, 8);

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'hook-1',
            project_id: testProjectId,
            chapter_number: 1,
            hook_type: 'threat',
            hook_description: null,
            tension_level: 7,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          {
            id: 'hook-2',
            project_id: testProjectId,
            chapter_number: 2,
            hook_type: 'cliffhanger',
            hook_description: null,
            tension_level: 8,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          }
        ]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.issues.some((i: string) => i.includes('chapters missing required hooks'))).toBe(true);
    });

    it('should validate cliffhanger frequency - every', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        cliffhangerFrequency: 'every',
      });

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'every',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i: string) => i.includes('Not enough cliffhangers'))).toBe(true);
    });

    it('should validate cliffhanger frequency - most', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        cliffhangerFrequency: 'most',
      });

      // Add only a few cliffhangers
      thrillerCommercialService.addChapterHook(testProjectId, 1, 'cliffhanger', null, 8);

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'hook-1',
            project_id: testProjectId,
            chapter_number: 1,
            hook_type: 'cliffhanger',
            hook_description: null,
            tension_level: 8,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          }
        ]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.issues.some((i: string) => i.includes('cliffhangers'))).toBe(true);
    });

    it('should validate cliffhanger frequency - some', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        cliffhangerFrequency: 'some',
      });

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'some',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.issues.some((i: string) => i.includes('cliffhangers'))).toBe(true);
    });

    it('should validate average tension matches target', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        averageChapterTension: 9,
        chapterHookRequired: false,
      });

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 9,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      // With no hooks and relentless pacing, average should be around 8, not 9
      expect(result.issues.some((i: string) => i.includes('Average tension'))).toBe(true);
    });

    it('should pass validation when requirements are met', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'relentless', {
        chapterHookRequired: false,
        cliffhangerFrequency: 'some',
        averageChapterTension: 8,
      });

      // Add enough cliffhangers
      for (let i = 1; i <= 7; i++) {
        thrillerCommercialService.addChapterHook(testProjectId, i, 'cliffhanger', null, 8);
      }

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'relentless',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'some',
          action_scene_ratio: 40,
          average_chapter_tension: 8,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue(
          Array.from({ length: 7 }, (_, i) => ({
            id: `hook-${i+1}`,
            project_id: testProjectId,
            chapter_number: i + 1,
            hook_type: 'cliffhanger',
            hook_description: null,
            tension_level: 8,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          }))
        ),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt)
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.validatePacing(testProjectId, 20);

      expect(result.valid).toBe(true);
    });
  });

  describe('Tension curve pacing styles', () => {
    it('should calculate slow_burn pacing with exponential curve', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'slow_burn');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'slow_burn',
          chapter_hook_required: 0,
          cliffhanger_frequency: 'some',
          action_scene_ratio: 20,
          average_chapter_tension: 5,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      // Slow burn should start low and end high
      const firstChapter = result.chapters[0].tensionLevel;
      const lastChapter = result.chapters[result.chapters.length - 1].tensionLevel;
      expect(lastChapter).toBeGreaterThan(firstChapter);
    });

    it('should calculate rollercoaster pacing with oscillation', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      thrillerCommercialService.setPacingStyle(testProjectId, 'rollercoaster');

      const mockGetPacingStmt = {
        get: jest.fn().mockReturnValue({
          id: 'pacing-1',
          project_id: testProjectId,
          pacing_style: 'rollercoaster',
          chapter_hook_required: 1,
          cliffhanger_frequency: 'most',
          action_scene_ratio: 40,
          average_chapter_tension: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetHooksStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetPacingStmt)
        .mockReturnValueOnce(mockGetHooksStmt);

      const result = thrillerCommercialService.calculateTensionCurve(testProjectId, 20);

      // Should have both peaks and valleys
      expect(result.tensionPeaks.length).toBeGreaterThan(0);
      expect(result.tensionValleys.length).toBeGreaterThan(0);
    });
  });
});
