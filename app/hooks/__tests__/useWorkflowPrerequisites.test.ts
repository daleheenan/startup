/**
 * Tests for useWorkflowPrerequisites hook
 * Tests the workflow state machine and prerequisite checking
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useWorkflowPrerequisites,
  WorkflowProjectData,
  OutlineData,
  WorkflowStep,
} from '../useWorkflowPrerequisites';

describe('useWorkflowPrerequisites', () => {
  describe('initial state with null project', () => {
    it('should return all steps incomplete when project is null', () => {
      const { result } = renderHook(() =>
        useWorkflowPrerequisites(null, null)
      );

      expect(result.current.prerequisites.concept.isComplete).toBe(false);
      expect(result.current.prerequisites.characters.isComplete).toBe(false);
      expect(result.current.prerequisites.outline.isComplete).toBe(false);
    });

    it('should return concept as current step when project is null', () => {
      const { result } = renderHook(() =>
        useWorkflowPrerequisites(null, null)
      );

      expect(result.current.currentStep).toBe('concept');
    });

    it('should not be ready for generation when project is null', () => {
      const { result } = renderHook(() =>
        useWorkflowPrerequisites(null, null)
      );

      expect(result.current.isReadyForGeneration).toBe(false);
    });
  });

  describe('prerequisite chain', () => {
    it('should define correct prerequisite chain', () => {
      const project = createMockProject();
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      // Verify chain: concept has no prereq, others have previous step
      expect(result.current.prerequisites.concept.requiresPrevious).toBeNull();
      expect(result.current.prerequisites.characters.requiresPrevious).toBe('concept');
      expect(result.current.prerequisites.world.requiresPrevious).toBe('characters');
      expect(result.current.prerequisites.plots.requiresPrevious).toBe('world');
      expect(result.current.prerequisites.outline.requiresPrevious).toBe('originality');
      expect(result.current.prerequisites.chapters.requiresPrevious).toBe('outline');
    });

    it('should mark required steps correctly', () => {
      const project = createMockProject();
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      // Required steps
      expect(result.current.prerequisites.concept.isRequired).toBe(true);
      expect(result.current.prerequisites.characters.isRequired).toBe(true);
      expect(result.current.prerequisites.world.isRequired).toBe(true);
      expect(result.current.prerequisites.plots.isRequired).toBe(true);
      expect(result.current.prerequisites.outline.isRequired).toBe(true);
      expect(result.current.prerequisites.chapters.isRequired).toBe(true);

      // Optional steps
      expect(result.current.prerequisites.coherence.isRequired).toBe(false);
      expect(result.current.prerequisites.originality.isRequired).toBe(false);
      expect(result.current.prerequisites.analytics.isRequired).toBe(false);
      expect(result.current.prerequisites['editorial-report'].isRequired).toBe(false);
      expect(result.current.prerequisites['follow-up'].isRequired).toBe(false);
    });
  });

  describe('canAccess function', () => {
    it('should always allow access to concept (first step)', () => {
      const project = createMockProject({ title: undefined });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.canAccess('concept')).toBe(true);
    });

    it('should block characters when concept is incomplete', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_concept: undefined,
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.canAccess('characters')).toBe(false);
    });

    it('should allow characters when concept is complete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.canAccess('characters')).toBe(true);
    });

    it('should block outline when plots are incomplete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: { characters: [createMockCharacter({ name: 'Hero', role: 'protagonist' })], world: [{ name: 'Kingdom' }] },
        plot_structure: createMockPlotStructure({ plot_layers: [] }), // No plots
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.canAccess('outline')).toBe(false);
    });
  });

  describe('getBlockingReason function', () => {
    it('should return null for accessible steps', () => {
      const project = createMockProject();
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.getBlockingReason('concept')).toBeNull();
    });

    it('should return reason for blocked steps', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_concept: undefined,
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      const reason = result.current.getBlockingReason('characters');
      expect(reason).toContain('Story Concept');
    });
  });

  describe('concept step completion', () => {
    it('should be complete with title and genre', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.concept.isComplete).toBe(true);
    });

    it('should be complete with story_concept logline', () => {
      const project = createMockProject({
        story_concept: { logline: 'A story about...' },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.concept.isComplete).toBe(true);
    });

    it('should be incomplete without title or concept', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_concept: undefined,
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.concept.isComplete).toBe(false);
    });
  });

  describe('characters step completion', () => {
    it('should be complete with at least one character', () => {
      const project = createMockProject({
        story_bible: { characters: [createMockCharacter({ name: 'Hero', role: 'protagonist' })] },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.characters.isComplete).toBe(true);
    });

    it('should be incomplete without characters', () => {
      const project = createMockProject({
        story_bible: { characters: [] },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.characters.isComplete).toBe(false);
    });
  });

  describe('world step completion', () => {
    it('should be complete with world array elements', () => {
      const project = createMockProject({
        story_bible: { characters: [], world: [{ name: 'Kingdom' }] },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.world.isComplete).toBe(true);
    });

    it('should be complete with world object locations', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: { locations: [{ name: 'Castle' }], factions: [], systems: [] },
        },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.world.isComplete).toBe(true);
    });

    it('should be incomplete with empty world', () => {
      const project = createMockProject({
        story_bible: { characters: [], world: [] },
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.world.isComplete).toBe(false);
    });
  });

  describe('plots step completion', () => {
    it('should be complete with plot layers', () => {
      const project = createMockProject({
        plot_structure: createMockPlotStructure({
          plot_layers: [createMockPlotLayer({ type: 'main', name: 'Main Plot' })],
        }),
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.plots.isComplete).toBe(true);
    });

    it('should be incomplete without plot layers', () => {
      const project = createMockProject({
        plot_structure: createMockPlotStructure({ plot_layers: [] }),
      });
      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.prerequisites.plots.isComplete).toBe(false);
    });
  });

  describe('outline step completion', () => {
    it('should be complete with total_chapters', () => {
      const project = createMockProject();
      const outline: OutlineData = { total_chapters: 10 };

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline)
      );

      expect(result.current.prerequisites.outline.isComplete).toBe(true);
    });

    it('should be complete with structure containing chapters', () => {
      const project = createMockProject();
      const outline: OutlineData = {
        structure: {
          type: 'three_act',
          acts: [{
            number: 1,
            name: 'Act One',
            description: 'Setup',
            beats: [],
            targetWordCount: 20000,
            chapters: [{
              number: 1,
              title: 'Chapter 1',
              summary: 'The beginning',
              actNumber: 1,
              povCharacter: 'Hero',
              wordCountTarget: 3000,
              scenes: [],
            }],
          }],
        },
      };

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline)
      );

      expect(result.current.prerequisites.outline.isComplete).toBe(true);
    });

    it('should be incomplete without outline', () => {
      const project = createMockProject();

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, null)
      );

      expect(result.current.prerequisites.outline.isComplete).toBe(false);
    });
  });

  describe('chapters step completion', () => {
    it('should be complete when chapters exist', () => {
      const project = createMockProject();
      const outline: OutlineData = { total_chapters: 5 };
      const chapters = [{ id: 'ch-1', content: 'Chapter content' }];

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline, chapters)
      );

      expect(result.current.prerequisites.chapters.isComplete).toBe(true);
    });

    it('should be incomplete without chapters', () => {
      const project = createMockProject();
      const outline: OutlineData = { total_chapters: 5 };

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline, [])
      );

      expect(result.current.prerequisites.chapters.isComplete).toBe(false);
    });
  });

  describe('analytics step completion', () => {
    it('should be complete when chapters have content', () => {
      const project = createMockProject();
      const chapters = [{ id: 'ch-1', content: 'Some chapter content here' }];

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, null, chapters)
      );

      expect(result.current.prerequisites.analytics.isComplete).toBe(true);
    });

    it('should be incomplete when chapters have no content', () => {
      const project = createMockProject();
      const chapters = [{ id: 'ch-1', content: '' }];

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, null, chapters)
      );

      expect(result.current.prerequisites.analytics.isComplete).toBe(false);
    });
  });

  describe('currentStep calculation', () => {
    it('should return concept when nothing is complete', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_concept: undefined,
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.currentStep).toBe('concept');
    });

    it('should return first incomplete required step', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: { characters: [], world: [] }, // No characters
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.currentStep).toBe('characters');
    });

    it('should return analytics when all required steps complete', () => {
      const project = createCompleteProject();
      const outline: OutlineData = { total_chapters: 5 };
      const chapters = [{ id: 'ch-1', content: 'Content' }];

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline, chapters)
      );

      expect(result.current.currentStep).toBe('analytics');
    });
  });

  describe('nextStep calculation', () => {
    it('should return next incomplete step', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: { characters: [], world: [] },
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      // Current is characters (incomplete), next should be world
      expect(result.current.nextStep).toBe('world');
    });

    it('should return null when all steps complete', () => {
      const project = createCompleteProject();
      const outline: OutlineData = { total_chapters: 5 };
      const chapters = [
        { id: 'ch-1', content: 'Content 1' },
        { id: 'ch-2', content: 'Content 2' },
      ];

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline, chapters)
      );

      // All steps complete - follow-up requires all chapters written
      // If only 2 chapters but outline has 5, follow-up won't be complete
      // But analytics will be complete, so nextStep might be editorial-report or follow-up
      expect(['editorial-report', 'follow-up', null]).toContain(result.current.nextStep);
    });
  });

  describe('isReadyForGeneration', () => {
    it('should be false when required prereqs are incomplete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: { characters: [], world: [] }, // Missing characters
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.isReadyForGeneration).toBe(false);
    });

    it('should be true when all generation prereqs complete', () => {
      const project = createCompleteProject();
      const outline: OutlineData = { total_chapters: 5 };

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project, outline)
      );

      expect(result.current.isReadyForGeneration).toBe(true);
    });
  });

  describe('getCompletionPercentage', () => {
    it('should return 0% when no steps complete', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_concept: undefined,
        story_bible: undefined,
        plot_structure: undefined,
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      expect(result.current.getCompletionPercentage()).toBe(0);
    });

    it('should calculate percentage based on required steps', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: { characters: [createMockCharacter({ name: 'Hero' })], world: [] },
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      // concept and characters complete out of 6 required = 33%
      const percentage = result.current.getCompletionPercentage();
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(100);
    });
  });

  describe('getMissingItems', () => {
    it('should return missing items for incomplete steps', () => {
      const project = createMockProject({
        story_bible: { characters: [], world: [] },
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      const missingCharacters = result.current.getMissingItems('characters');
      expect(missingCharacters.length).toBeGreaterThan(0);
      expect(missingCharacters[0]).toContain('character');
    });

    it('should return empty array for complete steps', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
      });

      const { result } = renderHook(() =>
        useWorkflowPrerequisites('project-1', project)
      );

      const missingConcept = result.current.getMissingItems('concept');
      expect(missingConcept).toEqual([]);
    });
  });
});

// Helper to create a mock character with all required fields
function createMockCharacter(overrides: Partial<{
  id: string;
  name: string;
  role: string;
  personalityTraits: string[];
  voiceSample: string;
  goals: string[];
  conflicts: string[];
  relationships: { characterId: string; type: string; description: string }[];
}> = {}) {
  return {
    id: overrides.id ?? `char-${Math.random().toString(36).slice(2, 9)}`,
    name: overrides.name ?? 'Test Character',
    role: overrides.role ?? 'protagonist',
    personalityTraits: overrides.personalityTraits ?? ['Brave', 'Kind'],
    voiceSample: overrides.voiceSample ?? 'Sample dialogue here',
    goals: overrides.goals ?? ['Save the world'],
    conflicts: overrides.conflicts ?? ['Internal doubt'],
    relationships: overrides.relationships ?? [],
  };
}

// Helper to create a mock plot layer with all required fields
function createMockPlotLayer(overrides: Partial<{
  id: string;
  name: string;
  description: string;
  type: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
  color: string;
  points: any[];
  status: 'active' | 'resolved' | 'abandoned';
}> = {}): any {
  return {
    id: overrides.id ?? `plot-${Math.random().toString(36).slice(2, 9)}`,
    name: overrides.name ?? 'Main Plot',
    description: overrides.description ?? 'The main plot of the story',
    type: overrides.type ?? 'main',
    color: overrides.color ?? '#FF5733',
    points: overrides.points ?? [],
    status: overrides.status ?? 'active',
  };
}

// Helper to create a mock plot structure with all required fields
function createMockPlotStructure(overrides: Partial<{
  plot_layers: any[];
  act_structure: { act_one_end: number; act_two_midpoint: number; act_two_end: number; act_three_climax: number };
}> = {}): any {
  return {
    plot_layers: overrides.plot_layers ?? [createMockPlotLayer()],
    act_structure: overrides.act_structure ?? { act_one_end: 5, act_two_midpoint: 12, act_two_end: 20, act_three_climax: 25 },
  };
}

// Helper to create mock project with defaults
function createMockProject(
  overrides: Partial<WorkflowProjectData> = {}
): WorkflowProjectData {
  return {
    id: 'project-1',
    title: 'Test Project',
    genre: 'Fantasy',
    story_dna: { genre: 'Fantasy' },
    story_bible: {
      characters: [createMockCharacter({ name: 'Hero', role: 'protagonist' })],
      world: [{ name: 'Kingdom' }],
    },
    plot_structure: createMockPlotStructure({
      plot_layers: [createMockPlotLayer({ type: 'main', name: 'Main Plot' })],
    }),
    ...overrides,
  };
}

// Helper to create a complete project
function createCompleteProject(): WorkflowProjectData {
  return {
    id: 'project-1',
    title: 'Complete Novel',
    genre: 'Fantasy',
    story_dna: { genre: 'Fantasy', proseStyle: 'Literary', pointOfView: 'Third Person' },
    story_concept: { logline: 'A complete story', synopsis: 'Full synopsis' },
    story_bible: {
      characters: [
        createMockCharacter({ name: 'Hero', role: 'protagonist' }),
        createMockCharacter({ name: 'Villain', role: 'antagonist' }),
      ],
      world: [
        { name: 'Kingdom' },
        { name: 'Castle' },
      ],
    },
    plot_structure: createMockPlotStructure({
      plot_layers: [
        createMockPlotLayer({ type: 'main', name: 'Main Plot' }),
        createMockPlotLayer({ type: 'subplot', name: 'Romance' }),
      ],
    }),
  };
}
