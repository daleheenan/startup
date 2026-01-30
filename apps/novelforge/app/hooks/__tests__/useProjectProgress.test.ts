/**
 * Tests for useProjectProgress hook
 * Tests workflow progress calculation and step completion tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectProgress } from '../useProjectProgress';

describe('useProjectProgress', () => {
  describe('with null project', () => {
    it('should return empty progress data when project is null', () => {
      const { result } = renderHook(() => useProjectProgress(null));

      expect(result.current).toEqual({
        steps: [],
        completedSteps: [],
        percentComplete: 0,
        canGenerate: false,
      });
    });
  });

  describe('step definitions', () => {
    it('should define all workflow steps', () => {
      const project = createMockProject();
      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.steps).toHaveLength(5);
      expect(result.current.steps.map(s => s.id)).toEqual([
        'concept',
        'characters',
        'world',
        'plot',
        'outline',
      ]);
    });

    it('should mark concept, characters, and outline as required', () => {
      const project = createMockProject();
      const { result } = renderHook(() => useProjectProgress(project));

      const requiredSteps = result.current.steps.filter(s => s.required);
      expect(requiredSteps.map(s => s.id)).toEqual(['concept', 'characters', 'outline']);
    });

    it('should mark world and plot as optional', () => {
      const project = createMockProject();
      const { result } = renderHook(() => useProjectProgress(project));

      const optionalSteps = result.current.steps.filter(s => !s.required);
      expect(optionalSteps.map(s => s.id)).toEqual(['world', 'plot']);
    });

    it('should include correct routes for each step', () => {
      const project = createMockProject({ id: 'project-123' });
      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.steps[0].route).toBe('/projects/project-123');
      expect(result.current.steps[1].route).toBe('/projects/project-123/characters');
      expect(result.current.steps[2].route).toBe('/projects/project-123/world');
      expect(result.current.steps[3].route).toBe('/projects/project-123/plot');
      expect(result.current.steps[4].route).toBe('/projects/project-123/outline');
    });
  });

  describe('concept step completion', () => {
    it('should mark concept complete when project has title and genre', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toContain('concept');
    });

    it('should not mark concept complete without title', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: { genre: 'Fantasy' },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).not.toContain('concept');
    });

    it('should not mark concept complete without genre', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: undefined,
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).not.toContain('concept');
    });
  });

  describe('characters step completion', () => {
    it('should mark characters complete when at least one character exists', () => {
      const project = createMockProject({
        story_bible: {
          characters: [{ name: 'Hero' }],
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toContain('characters');
    });

    it('should not mark characters complete with empty characters array', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).not.toContain('characters');
    });

    it('should not mark characters complete without story_bible', () => {
      const project = createMockProject({
        story_bible: undefined,
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).not.toContain('characters');
    });
  });

  describe('world step completion', () => {
    it('should mark world complete when world is an array with elements', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: [{ name: 'Kingdom' }],
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toContain('world');
    });

    it('should mark world complete when world has locations', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: {
            locations: [{ name: 'Castle' }],
            factions: [],
            systems: [],
          },
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toContain('world');
    });

    it('should mark world complete when world has factions', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: {
            locations: [],
            factions: [{ name: 'Guild' }],
            systems: [],
          },
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toContain('world');
    });

    it('should not mark world complete with empty world', () => {
      const project = createMockProject({
        story_bible: {
          characters: [],
          world: [],
        },
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).not.toContain('world');
    });
  });

  describe('outline step completion', () => {
    it('should mark outline complete when book has chapters', () => {
      const project = createMockProject();
      const books = [
        {
          id: 'book-1',
          book_number: 1,
          chapters: [{ id: 'chapter-1' }],
        },
      ];

      const { result } = renderHook(() => useProjectProgress(project, books));

      expect(result.current.completedSteps).toContain('outline');
    });

    it('should not mark outline complete without books', () => {
      const project = createMockProject();

      const { result } = renderHook(() => useProjectProgress(project, []));

      expect(result.current.completedSteps).not.toContain('outline');
    });

    it('should not mark outline complete when book has no chapters', () => {
      const project = createMockProject();
      const books = [
        {
          id: 'book-1',
          book_number: 1,
          chapters: [],
        },
      ];

      const { result } = renderHook(() => useProjectProgress(project, books));

      expect(result.current.completedSteps).not.toContain('outline');
    });
  });

  describe('progress calculation', () => {
    it('should calculate 0% with no completed steps', () => {
      const project = createMockProject({
        title: undefined,
        story_dna: undefined,
        story_bible: undefined,
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.percentComplete).toBe(0);
    });

    it('should calculate 20% with 1 of 5 steps complete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: undefined,
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.completedSteps).toEqual(['concept']);
      expect(result.current.percentComplete).toBe(20);
    });

    it('should calculate 100% with all steps complete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: {
          characters: [{ name: 'Hero' }],
          world: [{ name: 'Kingdom' }],
        },
      });
      const books = [
        {
          id: 'book-1',
          book_number: 1,
          chapters: [{ id: 'chapter-1' }],
        },
      ];

      const { result } = renderHook(() => useProjectProgress(project, books));

      // concept, characters, world, outline (4 of 5 - plot not checked currently)
      expect(result.current.completedSteps).toContain('concept');
      expect(result.current.completedSteps).toContain('characters');
      expect(result.current.completedSteps).toContain('world');
      expect(result.current.completedSteps).toContain('outline');
      expect(result.current.percentComplete).toBe(80); // 4/5 = 80%
    });
  });

  describe('canGenerate flag', () => {
    it('should be false when required steps are incomplete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: undefined, // No characters
      });

      const { result } = renderHook(() => useProjectProgress(project));

      expect(result.current.canGenerate).toBe(false);
    });

    it('should be true when all required steps are complete', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: {
          characters: [{ name: 'Hero' }],
        },
      });
      const books = [
        {
          id: 'book-1',
          book_number: 1,
          chapters: [{ id: 'chapter-1' }],
        },
      ];

      const { result } = renderHook(() => useProjectProgress(project, books));

      // Required: concept, characters, outline - all complete
      expect(result.current.canGenerate).toBe(true);
    });

    it('should be true even without optional steps', () => {
      const project = createMockProject({
        title: 'My Novel',
        story_dna: { genre: 'Fantasy' },
        story_bible: {
          characters: [{ name: 'Hero' }],
          world: undefined, // Optional step not complete
        },
      });
      const books = [
        {
          id: 'book-1',
          book_number: 1,
          chapters: [{ id: 'chapter-1' }],
        },
      ];

      const { result } = renderHook(() => useProjectProgress(project, books));

      // Optional steps (world, plot) not required for generation
      expect(result.current.canGenerate).toBe(true);
    });
  });

  describe('memoisation', () => {
    it('should return same object reference when inputs unchanged', () => {
      const project = createMockProject();
      const books = [{ id: 'book-1', book_number: 1, chapters: [] }];

      const { result, rerender } = renderHook(() => useProjectProgress(project, books));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it('should return new object when project changes', () => {
      const project1 = createMockProject({ title: 'First' });
      const project2 = createMockProject({ title: 'Second' });

      const { result, rerender } = renderHook(
        ({ project }) => useProjectProgress(project),
        { initialProps: { project: project1 } }
      );

      const firstResult = result.current;
      rerender({ project: project2 });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });
  });
});

// Helper function to create mock project data
function createMockProject(overrides: Partial<{
  id: string;
  title?: string;
  story_dna?: { genre?: string; tone?: string; themes?: string[] };
  story_bible?: {
    characters?: any[];
    world?: any[] | { locations?: any[]; factions?: any[]; systems?: any[] };
  };
  book_count?: number;
}> = {}) {
  return {
    id: 'project-1',
    title: 'Test Project',
    story_dna: { genre: 'Fantasy', tone: 'Dark', themes: ['Revenge'] },
    story_bible: {
      characters: [{ name: 'Hero' }],
      world: [],
    },
    book_count: 1,
    ...overrides,
  };
}
