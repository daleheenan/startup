/**
 * Bestseller Mode Service Tests
 * Sprint 44: Comprehensive tests for bestseller mode functionality
 *
 * Tests cover:
 * - Enabling/disabling bestseller mode
 * - Criteria CRUD operations
 * - Checklist validation (15 requirements)
 * - Generation blocking
 * - Prompt enhancement generation
 * - Database mapping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { BestsellerModeService, type BestsellerCriteria, type CompTitle, type BeatMapping } from '../bestseller-mode.service.js';
import db from '../../db/connection.js';
import { randomUUID } from 'crypto';

// Mock dependencies
vi.mock('../../db/connection.js', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

vi.mock('../logger.service.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('BestsellerModeService', () => {
  let service: BestsellerModeService;
  let mockProjectId: string;
  let mockCriteriaId: string;

  beforeEach(() => {
    service = new BestsellerModeService();
    mockProjectId = randomUUID();
    mockCriteriaId = randomUUID();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toggleBestsellerMode', () => {
    it('should enable bestseller mode for a project', () => {
      const mockRun = vi.fn();
      (db.prepare as any).mockReturnValue({ run: mockRun });

      service.toggleBestsellerMode(mockProjectId, true);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE projects'));
      expect(mockRun).toHaveBeenCalledWith(
        1,
        expect.any(String),
        mockProjectId
      );
    });

    it('should disable bestseller mode for a project', () => {
      const mockRun = vi.fn();
      (db.prepare as any).mockReturnValue({ run: mockRun });

      service.toggleBestsellerMode(mockProjectId, false);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE projects'));
      expect(mockRun).toHaveBeenCalledWith(
        0,
        expect.any(String),
        mockProjectId
      );
    });

    it('should create criteria record when enabling if not exists', () => {
      const mockRun = vi.fn();
      const mockGet = vi.fn().mockReturnValue(undefined); // No existing criteria

      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('bestseller_criteria')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      service.toggleBestsellerMode(mockProjectId, true);

      // Should call getOrCreateCriteria which checks and creates if needed
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return true when bestseller mode is enabled', () => {
      const mockGet = vi.fn().mockReturnValue({ bestseller_mode: 1 });
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.isEnabled(mockProjectId);

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return false when bestseller mode is disabled', () => {
      const mockGet = vi.fn().mockReturnValue({ bestseller_mode: 0 });
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.isEnabled(mockProjectId);

      expect(result).toBe(false);
    });

    it('should return false when project not found', () => {
      const mockGet = vi.fn().mockReturnValue(undefined);
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.isEnabled(mockProjectId);

      expect(result).toBe(false);
    });
  });

  describe('getOrCreateCriteria', () => {
    it('should return existing criteria if present', () => {
      const existingCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        has_strong_premise: 1,
        premise_hook: 'Strong hook',
        genre_conventions_identified: 1,
        genre_conventions: JSON.stringify(['romance', 'fantasy']),
        target_tropes: JSON.stringify(['enemies-to-lovers', 'chosen-one']),
        comp_titles: JSON.stringify([{ title: 'Test', author: 'Author', year: 2023, whyComparable: 'Similar' }]),
        word_count_target: 80000,
        save_the_cat_beats_mapped: 1,
        beats_data: JSON.stringify({ openingHook: { chapter: 1, description: 'Hook' } }),
        inciting_incident_chapter: 2,
        midpoint_chapter: 15,
        all_is_lost_chapter: 25,
        resolution_planned: 1,
        resolution_notes: 'Happy ending',
        protagonist_want: 'Win championship',
        protagonist_need: 'Learn teamwork',
        protagonist_lie: 'I must do it alone',
        character_arc_complete: 1,
        voice_samples: JSON.stringify(['Sample 1', 'Sample 2']),
        checklist_complete: 1,
        checklist_passed: 1,
        validation_errors: JSON.stringify([]),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockGet = vi.fn().mockReturnValue(existingCriteria);
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.getOrCreateCriteria(mockProjectId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCriteriaId);
      expect(result.projectId).toBe(mockProjectId);
      expect(result.hasStrongPremise).toBe(true);
      expect(result.genreConventions).toEqual(['romance', 'fantasy']);
      expect(result.targetTropes).toEqual(['enemies-to-lovers', 'chosen-one']);
    });

    it('should create new criteria if none exists', () => {
      const mockGet = vi.fn().mockReturnValue(undefined);
      const mockRun = vi.fn();

      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      const result = service.getOrCreateCriteria(mockProjectId);

      expect(result).toBeDefined();
      expect(result.projectId).toBe(mockProjectId);
      expect(result.hasStrongPremise).toBe(false);
      expect(result.genreConventions).toEqual([]);
      expect(result.targetTropes).toEqual([]);
      expect(result.checklistComplete).toBe(false);
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('validateChecklist', () => {
    let completeCriteria: Partial<BestsellerCriteria>;

    beforeEach(() => {
      completeCriteria = {
        projectId: mockProjectId,
        hasStrongPremise: true,
        premiseHook: 'A compelling hook',
        genreConventionsIdentified: true,
        genreConventions: ['romance', 'fantasy', 'adventure'],
        targetTropes: ['enemies-to-lovers', 'chosen-one', 'reluctant-hero'],
        compTitles: [
          { title: 'Comp 1', author: 'Author 1', year: 2022, whyComparable: 'Similar' },
          { title: 'Comp 2', author: 'Author 2', year: 2023, whyComparable: 'Similar' },
        ] as CompTitle[],
        wordCountTarget: 80000,
        saveTheCatBeatsMapped: true,
        beatsData: {
          openingHook: { chapter: 1, description: 'Hook' },
          incitingIncident: { chapter: 2, description: 'Incident' },
          firstPlotPoint: { chapter: 5, description: 'Point' },
          midpointTwist: { chapter: 15, description: 'Twist' },
          allIsLost: { chapter: 25, description: 'Low point' },
          climax: { chapter: 28, description: 'Climax' },
          resolution: { chapter: 30, description: 'Resolution' },
        } as BeatMapping,
        incitingIncidentChapter: 2,
        midpointChapter: 15,
        allIsLostChapter: 25,
        resolutionPlanned: true,
        resolutionNotes: 'Happy ending',
        protagonistWant: 'Win the war',
        protagonistNeed: 'Learn to trust',
        protagonistLie: 'I must be alone',
        characterArcComplete: true,
        voiceSamples: ['Sample 1', 'Sample 2'],
      };
    });

    it('should validate complete checklist as passed', () => {
      const mockGet = vi.fn().mockReturnValue({
        ...completeCriteria,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(completeCriteria.genreConventions),
        target_tropes: JSON.stringify(completeCriteria.targetTropes),
        comp_titles: JSON.stringify(completeCriteria.compTitles),
        beats_data: JSON.stringify(completeCriteria.beatsData),
        voice_samples: JSON.stringify(completeCriteria.voiceSamples),
        has_strong_premise: 1,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.isComplete).toBe(true);
      expect(result.isPassed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.completionPercentage).toBe(100);
      expect(result.missingItems).toHaveLength(0);
    });

    it('should fail validation when missing strong premise', () => {
      const incompleteCriteria = {
        ...completeCriteria,
        hasStrongPremise: false,
        premiseHook: null,
      };

      const mockGet = vi.fn().mockReturnValue({
        ...incompleteCriteria,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(incompleteCriteria.genreConventions),
        target_tropes: JSON.stringify(incompleteCriteria.targetTropes),
        comp_titles: JSON.stringify(incompleteCriteria.compTitles),
        beats_data: JSON.stringify(incompleteCriteria.beatsData),
        voice_samples: JSON.stringify(incompleteCriteria.voiceSamples),
        has_strong_premise: 0,
        premise_hook: null,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.isPassed).toBe(false);
      expect(result.errors).toContain('Strong premise with hook is required');
      expect(result.missingItems).toContain('Strong premise');
    });

    it('should fail validation when insufficient tropes (less than 3)', () => {
      const incompleteCriteria = {
        ...completeCriteria,
        targetTropes: ['trope-1', 'trope-2'], // Only 2 tropes
      };

      const mockGet = vi.fn().mockReturnValue({
        ...incompleteCriteria,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(incompleteCriteria.genreConventions),
        target_tropes: JSON.stringify(incompleteCriteria.targetTropes),
        comp_titles: JSON.stringify(incompleteCriteria.compTitles),
        beats_data: JSON.stringify(incompleteCriteria.beatsData),
        voice_samples: JSON.stringify(incompleteCriteria.voiceSamples),
        has_strong_premise: 1,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.isPassed).toBe(false);
      expect(result.errors).toContain('At least 3 target tropes are required');
    });

    it('should fail validation when insufficient comparable titles (less than 2)', () => {
      const incompleteCriteria = {
        ...completeCriteria,
        compTitles: [{ title: 'Only One', author: 'Author', year: 2023, whyComparable: 'Similar' }] as CompTitle[],
      };

      const mockGet = vi.fn().mockReturnValue({
        ...incompleteCriteria,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(incompleteCriteria.genreConventions),
        target_tropes: JSON.stringify(incompleteCriteria.targetTropes),
        comp_titles: JSON.stringify(incompleteCriteria.compTitles),
        beats_data: JSON.stringify(incompleteCriteria.beatsData),
        voice_samples: JSON.stringify(incompleteCriteria.voiceSamples),
        has_strong_premise: 1,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.isPassed).toBe(false);
      expect(result.errors).toContain('At least 2 comparable titles are required');
    });

    it('should warn when inciting incident after Chapter 3', () => {
      const lateIncitingIncident = {
        ...completeCriteria,
        incitingIncidentChapter: 5, // After Chapter 3
      };

      const mockGet = vi.fn().mockReturnValue({
        ...lateIncitingIncident,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(lateIncitingIncident.genreConventions),
        target_tropes: JSON.stringify(lateIncitingIncident.targetTropes),
        comp_titles: JSON.stringify(lateIncitingIncident.compTitles),
        beats_data: JSON.stringify(lateIncitingIncident.beatsData),
        voice_samples: JSON.stringify(lateIncitingIncident.voiceSamples),
        has_strong_premise: 1,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
        inciting_incident_chapter: 5,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.warnings).toContain('Inciting incident after Chapter 3 may lose reader interest');
      expect(result.isPassed).toBe(true); // Warning, not error
    });

    it('should calculate correct completion percentage for partial completion', () => {
      const partialCriteria = {
        ...completeCriteria,
        hasStrongPremise: false,
        premiseHook: null,
        targetTropes: ['trope-1', 'trope-2'], // Only 2
        compTitles: [] as CompTitle[],
        protagonistWant: null,
        protagonistNeed: null,
      };

      const mockGet = vi.fn().mockReturnValue({
        ...partialCriteria,
        id: mockCriteriaId,
        project_id: mockProjectId,
        genre_conventions: JSON.stringify(partialCriteria.genreConventions),
        target_tropes: JSON.stringify(partialCriteria.targetTropes),
        comp_titles: JSON.stringify(partialCriteria.compTitles),
        beats_data: JSON.stringify(partialCriteria.beatsData),
        voice_samples: JSON.stringify(partialCriteria.voiceSamples),
        has_strong_premise: 0,
        premise_hook: null,
        genre_conventions_identified: 1,
        save_the_cat_beats_mapped: 1,
        resolution_planned: 1,
        character_arc_complete: 1,
        protagonist_want: null,
        protagonist_need: null,
      });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      // Should have 9 completed out of 15 total items
      expect(result.completionPercentage).toBe(60);
      expect(result.isComplete).toBe(false);
      expect(result.isPassed).toBe(false);
    });
  });

  describe('canStartGeneration', () => {
    it('should allow generation when bestseller mode is disabled', () => {
      const mockGet = vi.fn().mockReturnValue({ bestseller_mode: 0 });
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.canStartGeneration(mockProjectId);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block generation when bestseller mode enabled but checklist incomplete', () => {
      const mockGet = vi.fn()
        .mockReturnValueOnce({ bestseller_mode: 1 }) // isEnabled check
        .mockReturnValueOnce({ // getCriteria check
          id: mockCriteriaId,
          project_id: mockProjectId,
          has_strong_premise: 0,
          genre_conventions: JSON.stringify([]),
          target_tropes: JSON.stringify([]),
          comp_titles: JSON.stringify([]),
          voice_samples: JSON.stringify([]),
        });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.canStartGeneration(mockProjectId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Bestseller checklist incomplete');
    });

    it('should allow generation when checklist is complete', () => {
      const completeCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        has_strong_premise: 1,
        premise_hook: 'Hook',
        genre_conventions_identified: 1,
        genre_conventions: JSON.stringify(['romance', 'fantasy', 'adventure']),
        target_tropes: JSON.stringify(['trope1', 'trope2', 'trope3']),
        comp_titles: JSON.stringify([
          { title: 'C1', author: 'A1', year: 2022, whyComparable: 'S' },
          { title: 'C2', author: 'A2', year: 2023, whyComparable: 'S' },
        ]),
        word_count_target: 80000,
        save_the_cat_beats_mapped: 1,
        beats_data: JSON.stringify({ openingHook: { chapter: 1, description: 'Hook' } }),
        inciting_incident_chapter: 2,
        midpoint_chapter: 15,
        all_is_lost_chapter: 25,
        resolution_planned: 1,
        resolution_notes: 'Notes',
        protagonist_want: 'Want',
        protagonist_need: 'Need',
        protagonist_lie: 'Lie',
        character_arc_complete: 1,
        voice_samples: JSON.stringify(['Sample']),
      };

      const mockGet = vi.fn()
        .mockReturnValueOnce({ bestseller_mode: 1 })
        .mockReturnValueOnce(completeCriteria);

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.canStartGeneration(mockProjectId);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('getBestsellerPromptEnhancements', () => {
    it('should return null when bestseller mode is disabled', () => {
      const mockGet = vi.fn().mockReturnValue({ bestseller_mode: 0 });
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.getBestsellerPromptEnhancements(mockProjectId);

      expect(result).toBeNull();
    });

    it('should generate comprehensive prompt enhancements when enabled', () => {
      const mockCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        target_tropes: JSON.stringify(['enemies-to-lovers', 'chosen-one']),
        genre_conventions: JSON.stringify(['romance HEA', 'fantasy magic system']),
        protagonist_want: 'Save the kingdom',
        protagonist_need: 'Learn to trust others',
        protagonist_lie: 'I must do it alone',
        comp_titles: JSON.stringify([
          { title: 'Similar Book 1', author: 'Author 1', year: 2022, whyComparable: 'Tone and pacing' },
          { title: 'Similar Book 2', author: 'Author 2', year: 2023, whyComparable: 'Character dynamics' },
        ]),
      };

      const mockGet = vi.fn()
        .mockReturnValueOnce({ bestseller_mode: 1 })
        .mockReturnValueOnce(mockCriteria);

      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: vi.fn() };
      });

      const result = service.getBestsellerPromptEnhancements(mockProjectId);

      expect(result).toBeDefined();
      expect(result).toContain('BESTSELLER MODE ACTIVE');
      expect(result).toContain('enemies-to-lovers');
      expect(result).toContain('chosen-one');
      expect(result).toContain('romance HEA');
      expect(result).toContain('fantasy magic system');
      expect(result).toContain('Save the kingdom');
      expect(result).toContain('Learn to trust others');
      expect(result).toContain('I must do it alone');
      expect(result).toContain('Similar Book 1');
      expect(result).toContain('Author 1');
    });

    it('should handle criteria with minimal data', () => {
      const minimalCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        target_tropes: JSON.stringify([]),
        genre_conventions: JSON.stringify([]),
        comp_titles: JSON.stringify([]),
      };

      const mockGet = vi.fn()
        .mockReturnValueOnce({ bestseller_mode: 1 })
        .mockReturnValueOnce(minimalCriteria);

      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: vi.fn() };
      });

      const result = service.getBestsellerPromptEnhancements(mockProjectId);

      expect(result).toBeDefined();
      expect(result).toContain('BESTSELLER MODE ACTIVE');
      expect(result).toContain('Commercial hooks, page-turner pacing, emotional resonance');
    });
  });

  describe('updateCriteria', () => {
    it('should update criteria and revalidate checklist', () => {
      const existingCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        has_strong_premise: 0,
        target_tropes: JSON.stringify([]),
      };

      const mockGet = vi.fn()
        .mockReturnValueOnce(existingCriteria) // getOrCreateCriteria
        .mockReturnValueOnce({ // getCriteria after update
          ...existingCriteria,
          has_strong_premise: 1,
          premise_hook: 'Updated hook',
        });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.updateCriteria({
        projectId: mockProjectId,
        hasStrongPremise: true,
        premiseHook: 'Updated hook',
      });

      expect(mockRun).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle JSON fields correctly', () => {
      const existingCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        target_tropes: JSON.stringify([]),
        genre_conventions: JSON.stringify([]),
        comp_titles: JSON.stringify([]),
      };

      const mockGet = vi.fn()
        .mockReturnValueOnce(existingCriteria)
        .mockReturnValueOnce({
          ...existingCriteria,
          target_tropes: JSON.stringify(['new-trope-1', 'new-trope-2']),
        });

      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      service.updateCriteria({
        projectId: mockProjectId,
        targetTropes: ['new-trope-1', 'new-trope-2'],
      });

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockCriteriaId
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing criteria gracefully in validateChecklist', () => {
      const mockGet = vi.fn().mockReturnValue(null);
      (db.prepare as any).mockReturnValue({ get: mockGet });

      const result = service.validateChecklist(mockProjectId);

      expect(result.isComplete).toBe(false);
      expect(result.isPassed).toBe(false);
      expect(result.errors).toContain('Bestseller criteria not found');
      expect(result.completionPercentage).toBe(0);
    });

    it('should handle word count target below minimum', () => {
      const invalidCriteria = {
        id: mockCriteriaId,
        project_id: mockProjectId,
        word_count_target: 40000, // Below 50k minimum
        has_strong_premise: 1,
        genre_conventions: JSON.stringify(['romance']),
        target_tropes: JSON.stringify(['trope1', 'trope2', 'trope3']),
        comp_titles: JSON.stringify([{}, {}]),
        voice_samples: JSON.stringify([]),
      };

      const mockGet = vi.fn().mockReturnValue(invalidCriteria);
      const mockRun = vi.fn();
      (db.prepare as any).mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return { get: mockGet };
        return { run: mockRun };
      });

      const result = service.validateChecklist(mockProjectId);

      expect(result.errors).toContain('Word count target must be set (minimum 50,000 words)');
    });
  });
});
