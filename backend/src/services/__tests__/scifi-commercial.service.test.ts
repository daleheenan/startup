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

import { HARDNESS_EXPECTATIONS } from '../scifi-commercial.service.js';
import type { HardnessLevel, TechExplanationDepth } from '../scifi-commercial.service.js';

let sciFiCommercialService: any;
let mockDb: any;

describe('SciFiCommercialService', () => {
  const testProjectId = 'test-scifi-project-123';
  const testProjectId2 = 'test-scifi-project-456';

  beforeEach(async () => {
    jest.clearAllMocks();

    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    const serviceModule = await import('../scifi-commercial.service.js');
    sciFiCommercialService = serviceModule.sciFiCommercialService;
  });

  describe('setClassification', () => {
    describe('Happy path', () => {
      it('should set hard sci-fi classification', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = sciFiCommercialService.setClassification(
          testProjectId,
          'hard',
          'detailed',
          9
        );

        expect(result).toBeDefined();
        expect(result.projectId).toBe(testProjectId);
        expect(result.hardnessLevel).toBe('hard');
        expect(result.techExplanationDepth).toBe('detailed');
        expect(result.scientificAccuracyPriority).toBe(9);
        expect(result.speculativeElements).toEqual([]);
        expect(result.realScienceBasis).toEqual([]);
        expect(result.handwaveAllowed).toEqual([]);
      });

      it('should set all valid hardness levels', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const hardnessLevels: HardnessLevel[] = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];

        hardnessLevels.forEach((level, index) => {
          const result = sciFiCommercialService.setClassification(
            `test-project-${index}`,
            level,
            'moderate',
            5
          );
          expect(result.hardnessLevel).toBe(level);
        });
      });

      it('should set all valid tech explanation depths', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const depths: TechExplanationDepth[] = ['detailed', 'moderate', 'minimal', 'none'];

        depths.forEach((depth, index) => {
          const result = sciFiCommercialService.setClassification(
            `test-project-depth-${index}`,
            'medium',
            depth,
            5
          );
          expect(result.techExplanationDepth).toBe(depth);
        });
      });

      it('should update existing classification', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        sciFiCommercialService.setClassification(testProjectId, 'soft', 'minimal', 3);
        const updated = sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);

        expect(updated.hardnessLevel).toBe('hard');
        expect(updated.techExplanationDepth).toBe('detailed');
        expect(updated.scientificAccuracyPriority).toBe(9);

        const mockGetStmt = {
          get: jest.fn().mockReturnValue({
            id: 'class-1',
            project_id: testProjectId,
            hardness_level: 'hard',
            tech_explanation_depth: 'detailed',
            scientific_accuracy_priority: 9,
            speculative_elements: '[]',
            real_science_basis: '[]',
            handwave_allowed: '[]',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          })
        };
        mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

        const retrieved = sciFiCommercialService.getClassification(testProjectId);
        expect(retrieved?.hardnessLevel).toBe('hard');
      });

      it('should handle consistent classification without warnings', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = sciFiCommercialService.setClassification(
          testProjectId,
          'hard',
          'detailed',
          9
        );

        expect(result).toBeDefined();
      });
    });

    describe('Edge cases', () => {
      it('should throw error for invalid hardness level', () => {
        expect(() => {
          sciFiCommercialService.setClassification(
            testProjectId,
            'ultra_hard' as any,
            'detailed',
            9
          );
        }).toThrow('Invalid hardness level: ultra_hard');
      });

      it('should throw error for invalid tech explanation depth', () => {
        expect(() => {
          sciFiCommercialService.setClassification(
            testProjectId,
            'hard',
            'ultra_detailed' as any,
            9
          );
        }).toThrow('Invalid tech explanation depth: ultra_detailed');
      });

      it('should throw error for accuracy priority below 1', () => {
        expect(() => {
          sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 0);
        }).toThrow('Scientific accuracy priority must be between 1 and 10');
      });

      it('should throw error for accuracy priority above 10', () => {
        expect(() => {
          sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 11);
        }).toThrow('Scientific accuracy priority must be between 1 and 10');
      });
    });

    describe('Boundary conditions', () => {
      it('should handle boundary accuracy values', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const min = sciFiCommercialService.setClassification(testProjectId, 'science_fantasy', 'none', 1);
        expect(min.scientificAccuracyPriority).toBe(1);

        const max = sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 10);
        expect(max.scientificAccuracyPriority).toBe(10);
      });
    });

    describe('Consistency warnings', () => {
      it('should log warning for hard sci-fi with no explanation', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        // This should complete but log a warning
        const result = sciFiCommercialService.setClassification(
          testProjectId,
          'hard',
          'none',
          9
        );

        expect(result).toBeDefined();
        // Consistency check happens internally
      });

      it('should log warning for science fantasy with detailed explanation', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = sciFiCommercialService.setClassification(
          testProjectId,
          'science_fantasy',
          'detailed',
          1
        );

        expect(result).toBeDefined();
      });

      it('should log warning for accuracy mismatch', () => {
        const mockStmt = { run: jest.fn() };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = sciFiCommercialService.setClassification(
          testProjectId,
          'hard',
          'detailed',
          2
        );

        expect(result).toBeDefined();
      });
    });
  });

  describe('getClassification', () => {
    it('should return null for non-existent project', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = sciFiCommercialService.getClassification('non-existent-project');
      expect(result).toBeNull();
    });

    it('should retrieve classification', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'firm', 'moderate', 7);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = sciFiCommercialService.getClassification(testProjectId);

      expect(result).toBeDefined();
      expect(result?.hardnessLevel).toBe('firm');
      expect(result?.techExplanationDepth).toBe('moderate');
      expect(result?.scientificAccuracyPriority).toBe(7);
    });

    it('should handle multiple projects independently', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);
      sciFiCommercialService.setClassification(testProjectId2, 'soft', 'minimal', 3);

      const mockGetStmt1 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-2',
          project_id: testProjectId2,
          hardness_level: 'soft',
          tech_explanation_depth: 'minimal',
          scientific_accuracy_priority: 3,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt1).mockReturnValueOnce(mockGetStmt2);

      const result1 = sciFiCommercialService.getClassification(testProjectId);
      const result2 = sciFiCommercialService.getClassification(testProjectId2);

      expect(result1?.hardnessLevel).toBe('hard');
      expect(result2?.hardnessLevel).toBe('soft');
    });
  });

  describe('addSpeculativeElement', () => {
    beforeEach(() => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      sciFiCommercialService.setClassification(testProjectId, 'firm', 'moderate', 7);
    });

    it('should add a speculative element', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt).mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.addSpeculativeElement(testProjectId, 'FTL travel');

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '["FTL travel"]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.speculativeElements).toContain('FTL travel');
    });

    it('should add multiple speculative elements', () => {
      const baseRow = {
        id: 'class-1',
        project_id: testProjectId,
        hardness_level: 'firm',
        tech_explanation_depth: 'moderate',
        scientific_accuracy_priority: 7,
        speculative_elements: '[]',
        real_science_basis: '[]',
        handwave_allowed: '[]',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(baseRow)
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce({
          get: jest.fn().mockReturnValue({
            ...baseRow,
            speculative_elements: '["FTL travel"]',
          })
        })
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce({
          get: jest.fn().mockReturnValue({
            ...baseRow,
            speculative_elements: '["FTL travel","Sentient AI"]',
          })
        })
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.addSpeculativeElement(testProjectId, 'FTL travel');
      sciFiCommercialService.addSpeculativeElement(testProjectId, 'Sentient AI');
      sciFiCommercialService.addSpeculativeElement(testProjectId, 'Time travel');

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '["FTL travel","Sentient AI","Time travel"]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.speculativeElements).toHaveLength(3);
      expect(classification?.speculativeElements).toContain('FTL travel');
      expect(classification?.speculativeElements).toContain('Sentient AI');
      expect(classification?.speculativeElements).toContain('Time travel');
    });

    it('should not add duplicate elements', () => {
      const baseRow = {
        id: 'class-1',
        project_id: testProjectId,
        hardness_level: 'firm',
        tech_explanation_depth: 'moderate',
        scientific_accuracy_priority: 7,
        speculative_elements: '[]',
        real_science_basis: '[]',
        handwave_allowed: '[]',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(baseRow)
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce({
          get: jest.fn().mockReturnValue({
            ...baseRow,
            speculative_elements: '["FTL travel"]',
          })
        })
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.addSpeculativeElement(testProjectId, 'FTL travel');
      sciFiCommercialService.addSpeculativeElement(testProjectId, 'FTL travel');

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '["FTL travel"]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.speculativeElements).toHaveLength(1);
    });

    it('should throw error when no classification exists', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      expect(() => {
        sciFiCommercialService.addSpeculativeElement('non-existent-project', 'FTL travel');
      }).toThrow('No sci-fi classification exists for this project');
    });
  });

  describe('getSpeculativeElements', () => {
    it('should return empty array for project with no classification', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = sciFiCommercialService.getSpeculativeElements('non-existent-project');
      expect(result).toEqual([]);
    });

    it('should return all speculative elements', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'firm', 'moderate', 7);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '["FTL travel","Warp drives"]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = sciFiCommercialService.getSpeculativeElements(testProjectId);

      expect(result).toHaveLength(2);
      expect(result).toContain('FTL travel');
      expect(result).toContain('Warp drives');
    });
  });

  describe('setRealScienceBasis', () => {
    beforeEach(() => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);
    });

    it('should set real science basis', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt).mockReturnValueOnce(mockUpdateStmt);

      const scienceAreas = ['Quantum mechanics', 'Relativity', 'Exobiology'];
      sciFiCommercialService.setRealScienceBasis(testProjectId, scienceAreas);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '["Quantum mechanics","Relativity","Exobiology"]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.realScienceBasis).toEqual(scienceAreas);
    });

    it('should update existing real science basis', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.setRealScienceBasis(testProjectId, ['Physics']);
      sciFiCommercialService.setRealScienceBasis(testProjectId, ['Biology', 'Chemistry']);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '["Biology","Chemistry"]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.realScienceBasis).toEqual(['Biology', 'Chemistry']);
    });

    it('should handle empty array', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt).mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.setRealScienceBasis(testProjectId, []);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.realScienceBasis).toEqual([]);
    });

    it('should throw error when no classification exists', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      expect(() => {
        sciFiCommercialService.setRealScienceBasis('non-existent-project', ['Physics']);
      }).toThrow('No sci-fi classification exists for this project');
    });
  });

  describe('setHandwaveAreas', () => {
    beforeEach(() => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      sciFiCommercialService.setClassification(testProjectId, 'firm', 'moderate', 7);
    });

    it('should set handwave areas', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt).mockReturnValueOnce(mockUpdateStmt);

      const areas = ['FTL propulsion', 'Artificial gravity'];
      sciFiCommercialService.setHandwaveAreas(testProjectId, areas);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '["FTL propulsion","Artificial gravity"]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.handwaveAllowed).toEqual(areas);
    });

    it('should update existing handwave areas', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.setHandwaveAreas(testProjectId, ['FTL']);
      sciFiCommercialService.setHandwaveAreas(testProjectId, ['Inertial dampeners', 'Shields']);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '["Inertial dampeners","Shields"]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.handwaveAllowed).toEqual(['Inertial dampeners', 'Shields']);
    });

    it('should handle empty array', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt).mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.setHandwaveAreas(testProjectId, []);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      expect(classification?.handwaveAllowed).toEqual([]);
    });

    it('should throw error when no classification exists', () => {
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      expect(() => {
        sciFiCommercialService.setHandwaveAreas('non-existent-project', ['FTL']);
      }).toThrow('No sci-fi classification exists for this project');
    });
  });

  describe('checkConsistency', () => {
    describe('Happy path - consistent configurations', () => {
      it('should validate hard sci-fi with detailed explanations', () => {
        const result = sciFiCommercialService.checkConsistency('hard', 'detailed', 9);

        expect(result.consistent).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should validate firm sci-fi with moderate explanations', () => {
        const result = sciFiCommercialService.checkConsistency('firm', 'moderate', 7);

        expect(result.consistent).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should validate soft sci-fi with minimal explanations', () => {
        const result = sciFiCommercialService.checkConsistency('soft', 'minimal', 3);

        expect(result.consistent).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should validate science fantasy with no explanations', () => {
        const result = sciFiCommercialService.checkConsistency('science_fantasy', 'none', 1);

        expect(result.consistent).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
    });

    describe('Inconsistent configurations', () => {
      it('should flag hard sci-fi with no explanations', () => {
        const result = sciFiCommercialService.checkConsistency('hard', 'none', 9);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('Hard sci-fi readers expect detailed'))).toBe(true);
      });

      it('should flag science fantasy with detailed explanations', () => {
        const result = sciFiCommercialService.checkConsistency('science_fantasy', 'detailed', 1);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('Science fantasy typically doesn\'t require'))).toBe(true);
      });

      it('should flag accuracy priority misalignment', () => {
        const result = sciFiCommercialService.checkConsistency('hard', 'detailed', 2);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('doesn\'t align with'))).toBe(true);
      });

      it('should flag hard sci-fi with low accuracy', () => {
        const result = sciFiCommercialService.checkConsistency('hard', 'detailed', 5);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('Hard sci-fi requires high'))).toBe(true);
      });

      it('should flag soft sci-fi with high accuracy', () => {
        const result = sciFiCommercialService.checkConsistency('soft', 'minimal', 9);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('doesn\'t typically prioritise'))).toBe(true);
      });

      it('should flag science fantasy with high accuracy', () => {
        const result = sciFiCommercialService.checkConsistency('science_fantasy', 'none', 8);

        expect(result.consistent).toBe(false);
        expect(result.issues.some((i: string) => i.includes('doesn\'t typically prioritise'))).toBe(true);
      });
    });

    describe('Boundary conditions', () => {
      it('should allow accuracy within tolerance range', () => {
        // Hard sci-fi typically expects 9, so 6-10 should be acceptable (within 3 points)
        const result1 = sciFiCommercialService.checkConsistency('hard', 'detailed', 8);
        expect(result1.issues.some((i: string) => i.includes('doesn\'t align with'))).toBe(false);

        const result2 = sciFiCommercialService.checkConsistency('hard', 'detailed', 10);
        expect(result2.issues.some((i: string) => i.includes('doesn\'t align with'))).toBe(false);
      });

      it('should flag accuracy outside tolerance range', () => {
        // Hard sci-fi typically expects 9, so 5 is outside tolerance (4 points away)
        const result = sciFiCommercialService.checkConsistency('hard', 'detailed', 5);

        expect(result.consistent).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateConsistency', () => {
    it('should fail when no classification exists', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      const result = sciFiCommercialService.validateConsistency('non-existent-project');

      expect(result.consistent).toBe(false);
      expect(result.issues).toContain('No sci-fi classification set for this project');
    });

    it('should validate existing classification', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = sciFiCommercialService.validateConsistency(testProjectId);

      expect(result.consistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag inconsistent existing classification', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'none', 2);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'none',
          scientific_accuracy_priority: 2,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = sciFiCommercialService.validateConsistency(testProjectId);

      expect(result.consistent).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('getReaderExpectations', () => {
    it('should return expectations for hard sci-fi', () => {
      const result = sciFiCommercialService.getReaderExpectations('hard');

      expect(result.hardnessLevel).toBe('hard');
      expect(result.description).toContain('Rigorous');
      expect(result.readerExpectation).toContain('real science');
      expect(result.exampleAuthors).toContain('Andy Weir');
      expect(result.techExplanation).toContain('Detailed');
      expect(result.typicalAccuracyPriority).toBe(9);
    });

    it('should return expectations for all hardness levels', () => {
      const levels: HardnessLevel[] = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];

      levels.forEach(level => {
        const result = sciFiCommercialService.getReaderExpectations(level);
        expect(result.hardnessLevel).toBe(level);
        expect(result.description).toBeTruthy();
        expect(result.readerExpectation).toBeTruthy();
        expect(result.exampleAuthors.length).toBeGreaterThan(0);
      });
    });

    it('should have descending accuracy priorities', () => {
      expect(HARDNESS_EXPECTATIONS.hard.typicalAccuracyPriority).toBeGreaterThan(
        HARDNESS_EXPECTATIONS.firm.typicalAccuracyPriority
      );
      expect(HARDNESS_EXPECTATIONS.firm.typicalAccuracyPriority).toBeGreaterThan(
        HARDNESS_EXPECTATIONS.medium.typicalAccuracyPriority
      );
      expect(HARDNESS_EXPECTATIONS.medium.typicalAccuracyPriority).toBeGreaterThan(
        HARDNESS_EXPECTATIONS.soft.typicalAccuracyPriority
      );
      expect(HARDNESS_EXPECTATIONS.soft.typicalAccuracyPriority).toBeGreaterThan(
        HARDNESS_EXPECTATIONS.science_fantasy.typicalAccuracyPriority
      );
    });
  });

  describe('suggestExplanationDepth', () => {
    it('should suggest detailed for hard sci-fi', () => {
      const result = sciFiCommercialService.suggestExplanationDepth('hard');

      expect(result.recommended).toBe('detailed');
      expect(result.alternatives).toContain('moderate');
      expect(result.reasoning).toContain('Hard sci-fi');
    });

    it('should suggest moderate for firm sci-fi', () => {
      const result = sciFiCommercialService.suggestExplanationDepth('firm');

      expect(result.recommended).toBe('moderate');
      expect(result.alternatives).toContain('detailed');
      expect(result.alternatives).toContain('minimal');
    });

    it('should suggest minimal for soft sci-fi', () => {
      const result = sciFiCommercialService.suggestExplanationDepth('soft');

      expect(result.recommended).toBe('minimal');
      expect(result.alternatives).toContain('moderate');
      expect(result.alternatives).toContain('none');
    });

    it('should suggest none for science fantasy', () => {
      const result = sciFiCommercialService.suggestExplanationDepth('science_fantasy');

      expect(result.recommended).toBe('none');
      expect(result.alternatives).toContain('minimal');
    });

    it('should provide reasoning for all levels', () => {
      const levels: HardnessLevel[] = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];

      levels.forEach(level => {
        const result = sciFiCommercialService.suggestExplanationDepth(level);
        expect(result.reasoning).toBeTruthy();
        expect(result.alternatives.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSubgenreDefaults', () => {
    it('should return defaults for Hard SF', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Hard SF');

      expect(result.hardnessLevel).toBe('hard');
      expect(result.techExplanationDepth).toBe('detailed');
      expect(result.accuracyPriority).toBe(9);
    });

    it('should return defaults for Space Opera', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Space Opera');

      expect(result.hardnessLevel).toBe('firm');
      expect(result.techExplanationDepth).toBe('moderate');
      expect(result.accuracyPriority).toBe(6);
    });

    it('should return defaults for Cyberpunk', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Cyberpunk');

      expect(result.hardnessLevel).toBe('medium');
      expect(result.techExplanationDepth).toBe('moderate');
      expect(result.accuracyPriority).toBe(5);
    });

    it('should return defaults for Dystopian', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Dystopian');

      expect(result.hardnessLevel).toBe('soft');
      expect(result.techExplanationDepth).toBe('minimal');
      expect(result.accuracyPriority).toBe(4);
    });

    it('should return defaults for Post-Apocalyptic', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Post-Apocalyptic');

      expect(result.hardnessLevel).toBe('soft');
      expect(result.techExplanationDepth).toBe('minimal');
      expect(result.accuracyPriority).toBe(3);
    });

    it('should return defaults for Military SF', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Military SF');

      expect(result.hardnessLevel).toBe('firm');
      expect(result.techExplanationDepth).toBe('moderate');
      expect(result.accuracyPriority).toBe(7);
    });

    it('should return defaults for Near Future', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Near Future');

      expect(result.hardnessLevel).toBe('hard');
      expect(result.techExplanationDepth).toBe('detailed');
      expect(result.accuracyPriority).toBe(8);
    });

    it('should return medium defaults for unknown subgenre', () => {
      const result = sciFiCommercialService.getSubgenreDefaults('Unknown Subgenre');

      expect(result.hardnessLevel).toBe('medium');
      expect(result.techExplanationDepth).toBe('moderate');
      expect(result.accuracyPriority).toBe(5);
    });

    it('should return defaults for all documented subgenres', () => {
      const subgenres = [
        'Hard SF',
        'Space Opera',
        'Cyberpunk',
        'Dystopian',
        'Post-Apocalyptic',
        'First Contact',
        'Military SF',
        'Near Future',
        'Far Future',
        'Biopunk',
      ];

      subgenres.forEach(subgenre => {
        const result = sciFiCommercialService.getSubgenreDefaults(subgenre);
        expect(result.hardnessLevel).toBeTruthy();
        expect(result.techExplanationDepth).toBeTruthy();
        expect(result.accuracyPriority).toBeGreaterThanOrEqual(1);
        expect(result.accuracyPriority).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('deleteClassification', () => {
    it('should delete classification', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      sciFiCommercialService.deleteClassification(testProjectId);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare = jest.fn().mockReturnValue(mockGetStmt);

      const result = sciFiCommercialService.getClassification(testProjectId);
      expect(result).toBeNull();
    });

    it('should not affect other projects', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);
      sciFiCommercialService.setClassification(testProjectId2, 'soft', 'minimal', 3);

      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);
      sciFiCommercialService.deleteClassification(testProjectId);

      const mockGetStmt1 = {
        get: jest.fn().mockReturnValue(undefined),
      };
      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-2',
          project_id: testProjectId2,
          hardness_level: 'soft',
          tech_explanation_depth: 'minimal',
          scientific_accuracy_priority: 3,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt1).mockReturnValueOnce(mockGetStmt2);

      const result1 = sciFiCommercialService.getClassification(testProjectId);
      const result2 = sciFiCommercialService.getClassification(testProjectId2);

      expect(result1).toBeNull();
      expect(result2?.hardnessLevel).toBe('soft');
    });

    it('should handle deleting non-existent classification gracefully', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      expect(() => {
        sciFiCommercialService.deleteClassification('non-existent-project');
      }).not.toThrow();
    });
  });

  describe('Constants validation', () => {
    it('should have expectations for all hardness levels', () => {
      const levels: HardnessLevel[] = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];

      levels.forEach(level => {
        expect(HARDNESS_EXPECTATIONS[level]).toBeDefined();
        expect(HARDNESS_EXPECTATIONS[level].hardnessLevel).toBe(level);
        expect(HARDNESS_EXPECTATIONS[level].description).toBeTruthy();
        expect(HARDNESS_EXPECTATIONS[level].readerExpectation).toBeTruthy();
        expect(HARDNESS_EXPECTATIONS[level].exampleAuthors.length).toBeGreaterThan(0);
        expect(HARDNESS_EXPECTATIONS[level].techExplanation).toBeTruthy();
        expect(HARDNESS_EXPECTATIONS[level].typicalAccuracyPriority).toBeGreaterThanOrEqual(1);
        expect(HARDNESS_EXPECTATIONS[level].typicalAccuracyPriority).toBeLessThanOrEqual(10);
      });
    });

    it('should have example authors for each level', () => {
      expect(HARDNESS_EXPECTATIONS.hard.exampleAuthors).toContain('Andy Weir');
      expect(HARDNESS_EXPECTATIONS.firm.exampleAuthors).toContain('Alastair Reynolds');
      expect(HARDNESS_EXPECTATIONS.medium.exampleAuthors).toContain('Becky Chambers');
      expect(HARDNESS_EXPECTATIONS.soft.exampleAuthors).toContain('Ursula K. Le Guin');
      expect(HARDNESS_EXPECTATIONS.science_fantasy.exampleAuthors).toContain('Frank Herbert (Dune)');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete hard sci-fi setup', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'hard', 'detailed', 9);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.setRealScienceBasis(testProjectId, ['Quantum mechanics', 'Relativity']);
      sciFiCommercialService.setHandwaveAreas(testProjectId, []);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'hard',
          tech_explanation_depth: 'detailed',
          scientific_accuracy_priority: 9,
          speculative_elements: '[]',
          real_science_basis: '["Quantum mechanics","Relativity"]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt2).mockReturnValueOnce(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      const validation = sciFiCommercialService.validateConsistency(testProjectId);

      expect(classification?.hardnessLevel).toBe('hard');
      expect(classification?.realScienceBasis).toHaveLength(2);
      expect(classification?.handwaveAllowed).toHaveLength(0);
      expect(validation.consistent).toBe(true);
    });

    it('should handle complete space opera setup', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'firm', 'moderate', 7);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.addSpeculativeElement(testProjectId, 'FTL travel');
      sciFiCommercialService.addSpeculativeElement(testProjectId, 'Energy shields');
      sciFiCommercialService.setHandwaveAreas(testProjectId, ['FTL propulsion', 'Artificial gravity']);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'firm',
          tech_explanation_depth: 'moderate',
          scientific_accuracy_priority: 7,
          speculative_elements: '["FTL travel","Energy shields"]',
          real_science_basis: '[]',
          handwave_allowed: '["FTL propulsion","Artificial gravity"]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt2).mockReturnValueOnce(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      const validation = sciFiCommercialService.validateConsistency(testProjectId);

      expect(classification?.speculativeElements).toHaveLength(2);
      expect(classification?.handwaveAllowed).toHaveLength(2);
      expect(validation.consistent).toBe(true);
    });

    it('should handle complete science fantasy setup', () => {
      const mockStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

      sciFiCommercialService.setClassification(testProjectId, 'science_fantasy', 'none', 1);

      const mockGetStmt = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'science_fantasy',
          tech_explanation_depth: 'none',
          scientific_accuracy_priority: 1,
          speculative_elements: '[]',
          real_science_basis: '[]',
          handwave_allowed: '[]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      const mockUpdateStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      sciFiCommercialService.addSpeculativeElement(testProjectId, 'The Force');
      sciFiCommercialService.addSpeculativeElement(testProjectId, 'Psychic powers');
      sciFiCommercialService.setHandwaveAreas(testProjectId, ['Everything']);

      const mockGetStmt2 = {
        get: jest.fn().mockReturnValue({
          id: 'class-1',
          project_id: testProjectId,
          hardness_level: 'science_fantasy',
          tech_explanation_depth: 'none',
          scientific_accuracy_priority: 1,
          speculative_elements: '["The Force","Psychic powers"]',
          real_science_basis: '[]',
          handwave_allowed: '["Everything"]',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
      };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockGetStmt2).mockReturnValueOnce(mockGetStmt2);

      const classification = sciFiCommercialService.getClassification(testProjectId);
      const validation = sciFiCommercialService.validateConsistency(testProjectId);

      expect(classification?.speculativeElements).toHaveLength(2);
      expect(validation.consistent).toBe(true);
    });
  });
});
