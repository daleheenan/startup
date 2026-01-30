import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_REQUIREMENTS,
  isStepComplete,
  arePrerequisitesComplete,
  canAccessStep,
  getBlockingReason,
  getFirstIncompletePrerequisite,
  getTabStatus,
  getOrderedWorkflowSteps,
  getNextStep,
  calculateCompletionPercentage,
} from '../workflow-utils';
import type { Project, Outline, Chapter, WorkflowStep } from '../../../shared/types';

// Test fixtures
const createMockProject = (overrides?: Partial<Project>): Project => {
  const base: Project = {
    id: 'test-project-1',
    title: 'Test Novel',
    type: 'standalone',
    genre: 'Fantasy',
    status: 'setup',
    story_dna: null,
    story_bible: null,
    series_bible: null,
    plot_structure: null,
    book_count: 1,
    universe_id: null,
    is_universe_root: false,
    time_period_type: null,
    specific_year: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Apply overrides
  const project = { ...base, ...overrides };

  // Ensure story_concept is not accidentally added unless specified
  if (!overrides || !('story_concept' in overrides)) {
    // story_concept is a legacy field that might exist on the project
    // Explicitly set it to null if not provided
    (project as any).story_concept = null;
  }

  return project;
};

const createMockOutline = (overrides?: Partial<Outline>): Outline => ({
  id: 'outline-1',
  book_id: 'book-1',
  structure_type: 'three_act',
  structure: {
    type: 'three_act',
    acts: [],
  },
  total_chapters: 25,
  target_word_count: 80000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockChapter = (overrides?: Partial<Chapter>): Chapter => ({
  id: 'chapter-1',
  book_id: 'book-1',
  chapter_number: 1,
  title: 'Chapter 1',
  scene_cards: [],
  content: 'Chapter content',
  summary: null,
  status: 'completed',
  word_count: 3000,
  flags: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('workflow-utils', () => {
  describe('WORKFLOW_REQUIREMENTS', () => {
    it('should contain all workflow steps', () => {
      const expectedSteps: WorkflowStep[] = [
        'concept',
        'characters',
        'world',
        'plots',
        'coherence',
        'originality',
        'outline',
        'chapters',
        'analytics',
        'outline-review',
        'editorial-report',
        'follow-up',
      ];

      for (const step of expectedSteps) {
        expect(WORKFLOW_REQUIREMENTS[step]).toBeDefined();
        expect(WORKFLOW_REQUIREMENTS[step].step).toBe(step);
      }
    });

    it('should have correct prerequisite chain', () => {
      expect(WORKFLOW_REQUIREMENTS.concept.requiredSteps).toEqual([]);
      expect(WORKFLOW_REQUIREMENTS.characters.requiredSteps).toEqual(['concept']);
      expect(WORKFLOW_REQUIREMENTS.world.requiredSteps).toEqual(['concept', 'characters']);
      expect(WORKFLOW_REQUIREMENTS.plots.requiredSteps).toEqual(['concept', 'characters', 'world']);
    });

    it('should include route and icon for each step', () => {
      for (const [step, requirement] of Object.entries(WORKFLOW_REQUIREMENTS)) {
        expect(requirement.route).toBeDefined();
        expect(requirement.icon).toBeDefined();
        expect(requirement.label).toBeDefined();
      }
    });
  });

  describe('isStepComplete', () => {
    describe('concept step', () => {
      it('should return true when story_dna exists', () => {
        const project = createMockProject({ story_dna: { theme: 'Adventure' } as any });
        expect(isStepComplete('concept', project)).toBe(true);
      });

      it('should return true when story_concept exists', () => {
        const project = createMockProject({ story_concept: 'A novel about...' } as any);
        expect(isStepComplete('concept', project)).toBe(true);
      });

      it('should return false when neither exists', () => {
        const project = createMockProject({ story_dna: null });
        expect(isStepComplete('concept', project)).toBe(false);
      });
    });

    describe('characters step', () => {
      it('should return true when characters exist', () => {
        const project = createMockProject({
          story_bible: {
            characters: [{ name: 'John', role: 'protagonist' }] as any,
          } as any,
        });
        expect(isStepComplete('characters', project)).toBe(true);
      });

      it('should return false when no characters exist', () => {
        const project = createMockProject({
          story_bible: { characters: [] } as any,
        });
        expect(isStepComplete('characters', project)).toBe(false);
      });

      it('should return false when story_bible is null', () => {
        const project = createMockProject({ story_bible: null });
        expect(isStepComplete('characters', project)).toBe(false);
      });
    });

    describe('world step', () => {
      it('should return true when locations exist', () => {
        const project = createMockProject({
          story_bible: {
            world: { locations: [{ name: 'Castle' }] } as any,
          } as any,
        });
        expect(isStepComplete('world', project)).toBe(true);
      });

      it('should return true when factions exist', () => {
        const project = createMockProject({
          story_bible: {
            world: { factions: [{ name: 'Guild' }] } as any,
          } as any,
        });
        expect(isStepComplete('world', project)).toBe(true);
      });

      it('should return true when systems exist', () => {
        const project = createMockProject({
          story_bible: {
            world: { systems: [{ name: 'Magic' }] } as any,
          } as any,
        });
        expect(isStepComplete('world', project)).toBe(true);
      });

      it('should return false when no world elements exist', () => {
        const project = createMockProject({
          story_bible: {
            world: { locations: [], factions: [], systems: [] } as any,
          } as any,
        });
        expect(isStepComplete('world', project)).toBe(false);
      });

      it('should return false when world is undefined', () => {
        const project = createMockProject({
          story_bible: {} as any,
        });
        expect(isStepComplete('world', project)).toBe(false);
      });
    });

    describe('plots step', () => {
      it('should return true when plot layers exist', () => {
        const project = createMockProject({
          plot_structure: {
            plot_layers: [{ type: 'main' }] as any,
          } as any,
        });
        expect(isStepComplete('plots', project)).toBe(true);
      });

      it('should return false when no plot layers exist', () => {
        const project = createMockProject({
          plot_structure: { plot_layers: [] } as any,
        });
        expect(isStepComplete('plots', project)).toBe(false);
      });

      it('should return false when plot_structure is null', () => {
        const project = createMockProject({ plot_structure: null });
        expect(isStepComplete('plots', project)).toBe(false);
      });
    });

    describe('coherence and originality steps', () => {
      it('should return true when plots exist (optional steps)', () => {
        const project = createMockProject({
          plot_structure: {
            plot_layers: [{ type: 'main' }] as any,
          } as any,
        });
        expect(isStepComplete('coherence', project)).toBe(true);
        expect(isStepComplete('originality', project)).toBe(true);
      });

      it('should return false when plots do not exist', () => {
        const project = createMockProject({ plot_structure: null });
        expect(isStepComplete('coherence', project)).toBe(false);
        expect(isStepComplete('originality', project)).toBe(false);
      });
    });

    describe('outline step', () => {
      it('should return true when outline with chapters exists', () => {
        const project = createMockProject();
        const outline = createMockOutline({ total_chapters: 25 });
        expect(isStepComplete('outline', project, outline)).toBe(true);
      });

      it('should return false when outline is null', () => {
        const project = createMockProject();
        expect(isStepComplete('outline', project, null)).toBe(false);
      });

      it('should return false when outline has zero chapters', () => {
        const project = createMockProject();
        const outline = createMockOutline({ total_chapters: 0 });
        expect(isStepComplete('outline', project, outline)).toBe(false);
      });
    });

    describe('chapters step', () => {
      it('should return true when chapters exist', () => {
        const project = createMockProject();
        const chapters = [createMockChapter()];
        expect(isStepComplete('chapters', project, undefined, chapters)).toBe(true);
      });

      it('should return false when no chapters exist', () => {
        const project = createMockProject();
        expect(isStepComplete('chapters', project, undefined, [])).toBe(false);
      });
    });

    describe('analytics step', () => {
      it('should return true when chapters with content exist', () => {
        const project = createMockProject();
        const chapters = [createMockChapter({ content: 'Some content' })];
        expect(isStepComplete('analytics', project, undefined, chapters)).toBe(true);
      });

      it('should return false when chapters have no content', () => {
        const project = createMockProject();
        const chapters = [createMockChapter({ content: '' })];
        expect(isStepComplete('analytics', project, undefined, chapters)).toBe(false);
      });

      it('should return false when no chapters exist', () => {
        const project = createMockProject();
        expect(isStepComplete('analytics', project, undefined, [])).toBe(false);
      });
    });

    describe('editorial-report step', () => {
      it('should return true when chapters with content exist', () => {
        const project = createMockProject();
        const chapters = [createMockChapter({ content: 'Content here' })];
        expect(isStepComplete('editorial-report', project, undefined, chapters)).toBe(true);
      });

      it('should return false when chapters are empty', () => {
        const project = createMockProject();
        const chapters = [createMockChapter({ content: '' })];
        expect(isStepComplete('editorial-report', project, undefined, chapters)).toBe(false);
      });
    });

    describe('follow-up step', () => {
      it('should return true when all chapters have content', () => {
        const project = createMockProject();
        const chapters = [
          createMockChapter({ id: 'ch1', content: 'Content 1' }),
          createMockChapter({ id: 'ch2', content: 'Content 2' }),
        ];
        expect(isStepComplete('follow-up', project, undefined, chapters)).toBe(true);
      });

      it('should return false when some chapters lack content', () => {
        const project = createMockProject();
        const chapters = [
          createMockChapter({ id: 'ch1', content: 'Content 1' }),
          createMockChapter({ id: 'ch2', content: '' }),
        ];
        expect(isStepComplete('follow-up', project, undefined, chapters)).toBe(false);
      });

      it('should return false when no chapters exist', () => {
        const project = createMockProject();
        expect(isStepComplete('follow-up', project, undefined, [])).toBe(false);
      });
    });
  });

  describe('arePrerequisitesComplete', () => {
    it('should return true for concept (no prerequisites)', () => {
      const project = createMockProject();
      expect(arePrerequisitesComplete('concept', project)).toBe(true);
    });

    it('should return true when all prerequisites are met', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
      });
      expect(arePrerequisitesComplete('world', project)).toBe(true);
    });

    it('should return false when prerequisites are missing', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: { characters: [] } as any,
      });
      expect(arePrerequisitesComplete('world', project)).toBe(false);
    });

    it('should check all prerequisites in chain', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
        plot_structure: null,
      });
      expect(arePrerequisitesComplete('plots', project)).toBe(true);
      expect(arePrerequisitesComplete('outline', project)).toBe(false); // Missing plots
    });
  });

  describe('canAccessStep', () => {
    it('should always allow access to concept', () => {
      const project = createMockProject();
      expect(canAccessStep('concept', project)).toBe(true);
    });

    it('should allow access when prerequisites are met', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
        } as any,
      });
      expect(canAccessStep('characters', project)).toBe(true);
      expect(canAccessStep('world', project)).toBe(true);
    });

    it('should block access when prerequisites are not met', () => {
      const project = createMockProject({
        story_dna: null,
      });
      expect(canAccessStep('characters', project)).toBe(false);
    });
  });

  describe('getBlockingReason', () => {
    it('should return null when step is accessible', () => {
      const project = createMockProject({ story_dna: { theme: 'Adventure' } as any });
      expect(getBlockingReason('concept', project)).toBeNull();
      expect(getBlockingReason('characters', project)).toBeNull();
    });

    it('should return reason with single missing step', () => {
      const project = createMockProject({ story_dna: null });
      const reason = getBlockingReason('characters', project);
      expect(reason).toBe('Please complete Overview first.');
    });

    it('should return reason with multiple missing steps', () => {
      const project = createMockProject({
        story_dna: null,
        story_bible: { characters: [] } as any,
      });
      const reason = getBlockingReason('world', project);
      expect(reason).toBe('Please complete Overview and Characters first.');
    });

    it('should format three or more missing steps correctly', () => {
      const project = createMockProject({
        story_dna: null,
        story_bible: { characters: [] } as any,
      });
      const reason = getBlockingReason('plots', project);
      expect(reason).toMatch(/Please complete .*Overview.*Characters.*World.* first\./);
    });
  });

  describe('getFirstIncompletePrerequisite', () => {
    it('should return null when all prerequisites are complete', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
        } as any,
      });
      expect(getFirstIncompletePrerequisite('world', project)).toBeNull();
    });

    it('should return first incomplete prerequisite', () => {
      const project = createMockProject({
        story_dna: null,
        story_bible: { characters: [] } as any,
      });
      expect(getFirstIncompletePrerequisite('characters', project)).toBe('concept');
      expect(getFirstIncompletePrerequisite('world', project)).toBe('concept');
    });

    it('should return first in chain when multiple are incomplete', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: { characters: [] } as any,
      });
      expect(getFirstIncompletePrerequisite('plots', project)).toBe('characters');
    });
  });

  describe('getTabStatus', () => {
    it('should return active for current tab', () => {
      const project = createMockProject();
      expect(getTabStatus('concept', project, '/projects/1')).toBe('active');
      expect(getTabStatus('characters', project, '/projects/1/characters')).toBe('active');
    });

    it('should return locked when prerequisites not met', () => {
      const project = createMockProject({ story_dna: null });
      expect(getTabStatus('characters', project, '/projects/1')).toBe('locked');
    });

    it('should return completed when step is complete and viewing different tab', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
        } as any,
      });
      // Check characters from plot tab - characters should be completed
      expect(getTabStatus('characters', project, '/projects/1/plot')).toBe('completed');
    });

    it('should return required when step is incomplete but required by others', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
      });
      expect(getTabStatus('characters', project, '/projects/1')).toBe('required');
    });

    it('should handle root path for concept tab', () => {
      const project = createMockProject();
      expect(getTabStatus('concept', project, '/projects/1')).toBe('active');
    });
  });

  describe('getOrderedWorkflowSteps', () => {
    it('should return steps in correct order', () => {
      const steps = getOrderedWorkflowSteps();
      expect(steps).toEqual([
        'concept',
        'characters',
        'world',
        'plots',
        'coherence',
        'originality',
        'outline',
        'outline-review',
        'chapters',
        'analytics',
        'editorial-report',
        'follow-up',
      ]);
    });

    it('should return array with all workflow steps', () => {
      const steps = getOrderedWorkflowSteps();
      expect(steps.length).toBe(12);
    });
  });

  describe('getNextStep', () => {
    it('should return concept when nothing is complete', () => {
      const project = createMockProject({ story_dna: null });
      expect(getNextStep(project)).toBe('concept');
    });

    it('should return next incomplete step', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: { characters: [] } as any,
      });
      expect(getNextStep(project)).toBe('characters');
    });

    it('should skip to next incomplete after completing early steps', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
        plot_structure: null,
      });
      expect(getNextStep(project)).toBe('plots');
    });

    it('should return null when all steps are complete', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
        plot_structure: { plot_layers: [{ type: 'main' }] } as any,
      });
      const outline = createMockOutline({ total_chapters: 25 });
      const chapters = [
        createMockChapter({ id: 'ch1', content: 'Content' }),
        createMockChapter({ id: 'ch2', content: 'Content' }),
      ];
      // All steps complete
      const result = getNextStep(project, outline, chapters);
      expect(result).toBeNull();
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should return 0 when no steps are complete', () => {
      const project = createMockProject({ story_dna: null });
      expect(calculateCompletionPercentage(project)).toBe(0);
    });

    it('should calculate percentage correctly for partial completion', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
        plot_structure: { plot_layers: [{ type: 'main' }] } as any,
      });
      // concept, characters, world, plots, coherence, originality = 6/12 = 50%
      expect(calculateCompletionPercentage(project)).toBe(50);
    });

    it('should return 100 when all steps are complete', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
        story_bible: {
          characters: [{ name: 'John' }] as any,
          world: { locations: [{ name: 'Castle' }] } as any,
        } as any,
        plot_structure: { plot_layers: [{ type: 'main' }] } as any,
      });
      const outline = createMockOutline({ total_chapters: 25 });
      const chapters = [
        createMockChapter({ id: 'ch1', content: 'Content 1' }),
        createMockChapter({ id: 'ch2', content: 'Content 2' }),
      ];
      const percentage = calculateCompletionPercentage(project, outline, chapters);
      expect(percentage).toBe(100);
    });

    it('should round percentage to nearest integer', () => {
      const project = createMockProject({
        story_dna: { theme: 'Adventure' } as any,
      });
      // 1/12 = 8.333... should round to 8
      expect(calculateCompletionPercentage(project)).toBe(8);
    });
  });

  describe('edge cases and type safety', () => {
    it('should handle undefined chapters array', () => {
      const project = createMockProject();
      expect(isStepComplete('chapters', project, undefined, undefined)).toBe(false);
    });

    it('should handle undefined outline', () => {
      const project = createMockProject();
      expect(isStepComplete('outline', project, undefined)).toBe(false);
    });

    it('should handle empty arrays gracefully', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: { locations: [], factions: [], systems: [] },
        } as any,
        plot_structure: { plot_layers: [] } as any,
      });
      expect(isStepComplete('characters', project)).toBe(false);
      expect(isStepComplete('world', project)).toBe(false);
      expect(isStepComplete('plots', project)).toBe(false);
    });

    it('should handle null and undefined values in nested structures', () => {
      const project = createMockProject({
        story_bible: null,
        plot_structure: null,
      });
      expect(() => isStepComplete('characters', project)).not.toThrow();
      expect(() => isStepComplete('world', project)).not.toThrow();
      expect(() => isStepComplete('plots', project)).not.toThrow();
    });
  });
});
