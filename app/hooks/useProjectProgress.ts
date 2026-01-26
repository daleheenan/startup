'use client';

import { useMemo } from 'react';
import type { CreationProgressData, CreationStep } from '@/shared/types';

interface ProjectData {
  id: string;
  title?: string;
  story_dna?: {
    genre?: string;
    tone?: string;
    themes?: string[];
  };
  story_bible?: {
    characters?: any[];
    // World can be either a flat array of WorldElement[] or an object with categories
    world?: any[] | {
      locations?: any[];
      factions?: any[];
      systems?: any[];
    };
  };
  book_count?: number;
}

// Helper to count world elements regardless of structure
function countWorldElements(world: any): number {
  if (!world) return 0;
  if (Array.isArray(world)) {
    return world.length;
  }
  // Object with categories
  return (
    (world.locations?.length || 0) +
    (world.factions?.length || 0) +
    (world.systems?.length || 0)
  );
}

// Helper to check if world has elements
function hasWorldElements(world: any): boolean {
  return countWorldElements(world) > 0;
}

interface BookData {
  id: string;
  book_number: number;
  chapters?: any[];
}

export function useProjectProgress(project: ProjectData | null, books: BookData[] = []) {
  const progressData: CreationProgressData = useMemo(() => {
    if (!project) {
      return {
        steps: [],
        completedSteps: [],
        percentComplete: 0,
        canGenerate: false,
      };
    }

    const steps: CreationStep[] = [
      {
        id: 'concept',
        name: 'Story Concept',
        route: `/projects/${project.id}`,
        required: true,
        icon: '📖',
      },
      {
        id: 'characters',
        name: 'Characters',
        route: `/projects/${project.id}/characters`,
        required: true,
        icon: '👥',
      },
      {
        id: 'world',
        name: 'World Building',
        route: `/projects/${project.id}/world`,
        required: false,
        icon: '🌍',
      },
      {
        id: 'plot',
        name: 'Plot Structure',
        route: `/projects/${project.id}/plot`,
        required: false,
        icon: '📊',
      },
      {
        id: 'outline',
        name: 'Outline',
        route: `/projects/${project.id}/outline`,
        required: true,
        icon: '📝',
      },
    ];

    const completedSteps: string[] = [];

    // Check concept (has title and genre)
    if (project.title && project.story_dna?.genre) {
      completedSteps.push('concept');
    }

    // Check characters (has at least one character)
    if (project.story_bible?.characters && project.story_bible.characters.length > 0) {
      completedSteps.push('characters');
    }

    // Check world building (has any world elements - optional)
    if (hasWorldElements(project.story_bible?.world)) {
      completedSteps.push('world');
    }

    // Check plot structure (optional - we'll check if plot layers exist)
    // For now, we'll skip this check since we need to query the database
    // This can be enhanced later with actual plot data

    // Check outline (has at least one book with chapters - required for generation)
    const firstBook = books[0];
    if (firstBook && firstBook.chapters && firstBook.chapters.length > 0) {
      completedSteps.push('outline');
    }

    // Calculate required vs optional completion
    const requiredSteps = steps.filter((s) => s.required);
    const completedRequiredSteps = requiredSteps.filter((s) =>
      completedSteps.includes(s.id)
    );

    // Percent complete based on all steps (required + optional)
    const percentComplete = Math.round((completedSteps.length / steps.length) * 100);

    // Can generate if all required steps are complete
    const canGenerate = completedRequiredSteps.length === requiredSteps.length;

    return {
      steps,
      completedSteps,
      percentComplete,
      canGenerate,
    };
  }, [project, books]);

  return progressData;
}

/**
 * Hook to provide project navigation data
 * Updated to work with the new ProjectNavigation component that uses
 * PROJECT_NAV_TABS from constants and useWorkflowPrerequisites for status
 */
export function useProjectNavigation(
  projectId: string,
  project: ProjectData | null,
  outline?: any, // Optional outline data for workflow checks
  chapters?: any[] // Optional chapters data for analytics check
): {
  projectId: string;
  project?: ProjectData | null;
  outline?: any;
  chapters?: any[];
} {
  return {
    projectId,
    project,
    outline,
    chapters,
  };
}
