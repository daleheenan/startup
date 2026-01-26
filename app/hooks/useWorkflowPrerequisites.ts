'use client';

import { useMemo } from 'react';
import type { Character, PlotStructure, StoryStructure, Chapter } from '../../shared/types';

/**
 * Workflow Prerequisites Hook
 *
 * Enforces the prerequisite chain for NovelForge workflow:
 * Concept → Characters → World → Plot → Outline → Chapters → Analytics
 *
 * Each step requires the previous step to be completed before it can be accessed.
 * Note: Style has been moved to global Settings page.
 */

// Workflow step identifiers (updated for new navigation)
export type WorkflowStep =
  | 'concept'
  | 'characters'
  | 'world'
  | 'plots'
  | 'outline'
  | 'chapters'
  | 'analytics';

// Project data structure expected by the hook
export interface WorkflowProjectData {
  id: string;
  title?: string | null;
  genre?: string | null;
  description?: string | null;
  story_dna?: {
    genre?: string;
    proseStyle?: string;
    pointOfView?: string;
  } | null;
  story_bible?: {
    characters?: Character[];
    world?: WorldData;
  } | null;
  plot_structure?: PlotStructure | null;
  story_concept?: {
    logline?: string;
    synopsis?: string;
    hook?: string;
  } | null;
  generation_submitted_at?: string | null;
}

// World data can be either array or object with categories
export type WorldData = any[] | {
  locations?: any[];
  factions?: any[];
  systems?: any[];
};

// Outline data structure
export interface OutlineData {
  id?: string;
  structure?: StoryStructure;
  total_chapters?: number;
}

// Prerequisite check result
export interface PrerequisiteCheck {
  isComplete: boolean;
  isRequired: boolean;
  requiresPrevious: WorkflowStep | null;
  missingItems: string[];
}

// Prerequisites map
export type PrerequisitesMap = Record<WorkflowStep, PrerequisiteCheck>;

// Hook return type
export interface UseWorkflowPrerequisitesResult {
  prerequisites: PrerequisitesMap;
  canAccess: (step: WorkflowStep) => boolean;
  getBlockingReason: (step: WorkflowStep) => string | null;
  currentStep: WorkflowStep;
  nextStep: WorkflowStep | null;
  isReadyForGeneration: boolean;
  getMissingItems: (step: WorkflowStep) => string[];
  getCompletionPercentage: () => number;
}

/**
 * Helper: Count world elements regardless of structure
 */
function countWorldElements(world: WorldData | null | undefined): number {
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

/**
 * Helper: Check if outline has content
 */
function hasOutlineContent(outline: OutlineData | null | undefined): boolean {
  if (!outline) return false;

  // Check total_chapters first (new format)
  if (outline.total_chapters && outline.total_chapters > 0) {
    return true;
  }

  // Fallback to checking structure (legacy format)
  if (!outline.structure) return false;
  const acts = outline.structure.acts;
  if (!acts || acts.length === 0) return false;

  // Check if at least one act has chapters
  return acts.some(act => act.chapters && act.chapters.length > 0);
}

/**
 * Helper: Get missing items for a specific step
 */
function getMissingItemsForStep(
  step: WorkflowStep,
  project: WorkflowProjectData | null,
  outline?: OutlineData | null,
  chapters?: Chapter[] | null
): string[] {
  const missing: string[] = [];

  if (!project) {
    return ['Project data not loaded'];
  }

  switch (step) {
    case 'concept':
      // Check for story concept or basic project info
      const hasConcept = project.story_concept?.logline || project.story_concept?.synopsis;
      const hasBasicInfo = project.title && (project.genre || project.story_dna?.genre);
      if (!hasConcept && !hasBasicInfo) {
        missing.push('Story concept or project details');
      }
      break;

    case 'characters':
      const characters = project.story_bible?.characters || [];
      if (characters.length === 0) {
        missing.push('At least one character');
      } else {
        const hasProtagonist = characters.some(c =>
          c.role?.toLowerCase().includes('protagonist') ||
          c.role?.toLowerCase().includes('main character')
        );
        if (!hasProtagonist) missing.push('Protagonist character');
      }
      break;

    case 'world':
      const worldCount = countWorldElements(project.story_bible?.world);
      if (worldCount === 0) {
        missing.push('At least one world element (location, faction, or system)');
      }
      break;

    case 'plots':
      const plotLayers = project.plot_structure?.plot_layers || [];
      if (plotLayers.length === 0) {
        missing.push('At least one plot layer');
      } else {
        const hasMainPlot = plotLayers.some(layer => layer.type === 'main');
        if (!hasMainPlot) {
          missing.push('Main plot layer');
        }
      }
      break;

    case 'outline':
      if (!hasOutlineContent(outline)) {
        missing.push('Story outline with chapters');
      }
      break;

    case 'chapters':
      // Need outline to be complete first
      if (!hasOutlineContent(outline)) {
        missing.push('Complete outline');
      }
      break;

    case 'analytics':
      // Need chapters with content
      const chaptersWithContent = chapters?.filter(ch => ch.content && ch.content.length > 0) || [];
      if (chaptersWithContent.length === 0) {
        missing.push('At least one generated chapter with content');
      }
      break;
  }

  return missing;
}

/**
 * Workflow step order for iteration
 */
const WORKFLOW_STEPS: WorkflowStep[] = [
  'concept',
  'characters',
  'world',
  'plots',
  'outline',
  'chapters',
  'analytics',
];

/**
 * Step display names
 */
const STEP_NAMES: Record<WorkflowStep, string> = {
  concept: 'Story Concept',
  characters: 'Characters',
  world: 'World Building',
  plots: 'Plot Structure',
  outline: 'Outline',
  chapters: 'Chapters',
  analytics: 'Analytics',
};

/**
 * useWorkflowPrerequisites Hook
 *
 * Manages workflow prerequisites and determines which steps are accessible.
 *
 * @param projectId - The project ID
 * @param project - Project data (can be null if not loaded yet)
 * @param outline - Optional outline data
 * @param chapters - Optional chapters data (for analytics check)
 */
export function useWorkflowPrerequisites(
  projectId: string | null,
  project: WorkflowProjectData | null,
  outline?: OutlineData | null,
  chapters?: Chapter[] | null
): UseWorkflowPrerequisitesResult {
  const prerequisites = useMemo<PrerequisitesMap>(() => {
    // Define prerequisite chain
    const checks: PrerequisitesMap = {
      concept: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: null,
        missingItems: [],
      },
      characters: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'concept',
        missingItems: [],
      },
      world: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'characters',
        missingItems: [],
      },
      plots: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'world',
        missingItems: [],
      },
      outline: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'plots',
        missingItems: [],
      },
      chapters: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'outline',
        missingItems: [],
      },
      analytics: {
        isComplete: false,
        isRequired: false, // Analytics is optional
        requiresPrevious: 'chapters',
        missingItems: [],
      },
    };

    if (!project) {
      // If no project data, nothing is complete
      return checks;
    }

    // Check concept completion
    checks.concept.missingItems = getMissingItemsForStep('concept', project);
    const hasConcept = !!(project.story_concept?.logline || project.story_concept?.synopsis);
    const hasBasicInfo = !!project.title && (!!project.genre || !!project.story_dna?.genre);
    checks.concept.isComplete = hasConcept || hasBasicInfo;

    // Check characters completion
    checks.characters.missingItems = getMissingItemsForStep('characters', project);
    const characters = project.story_bible?.characters || [];
    checks.characters.isComplete = characters.length > 0;

    // Check world completion
    checks.world.missingItems = getMissingItemsForStep('world', project);
    const worldCount = countWorldElements(project.story_bible?.world);
    checks.world.isComplete = worldCount > 0;

    // Check plots completion
    checks.plots.missingItems = getMissingItemsForStep('plots', project);
    const plotLayers = project.plot_structure?.plot_layers || [];
    checks.plots.isComplete = plotLayers.length > 0;

    // Check outline completion
    checks.outline.missingItems = getMissingItemsForStep('outline', project, outline);
    checks.outline.isComplete = hasOutlineContent(outline);

    // Check chapters completion (at least one chapter exists)
    checks.chapters.missingItems = getMissingItemsForStep('chapters', project, outline, chapters);
    checks.chapters.isComplete = (chapters?.length ?? 0) > 0;

    // Check analytics completion (at least one chapter has content)
    checks.analytics.missingItems = getMissingItemsForStep('analytics', project, outline, chapters);
    const chaptersWithContent = chapters?.filter(ch => ch.content && ch.content.length > 0) || [];
    checks.analytics.isComplete = chaptersWithContent.length > 0;

    return checks;
  }, [project, outline, chapters]);

  // Helper: Can access a step?
  const canAccess = useMemo(() => {
    return (step: WorkflowStep): boolean => {
      const check = prerequisites[step];

      // No previous requirement means always accessible
      if (!check.requiresPrevious) {
        return true;
      }

      // Check if previous step is complete
      const previousCheck = prerequisites[check.requiresPrevious];
      return previousCheck.isComplete;
    };
  }, [prerequisites]);

  // Helper: Get blocking reason
  const getBlockingReason = useMemo(() => {
    return (step: WorkflowStep): string | null => {
      if (canAccess(step)) {
        return null;
      }

      const check = prerequisites[step];
      if (!check.requiresPrevious) {
        return null;
      }

      const previousCheck = prerequisites[check.requiresPrevious];
      const previousStepName = STEP_NAMES[check.requiresPrevious];
      const missingItems = previousCheck.missingItems;

      if (missingItems.length > 0) {
        return `Complete ${previousStepName} first. Missing: ${missingItems.join(', ')}`;
      }

      return `Complete ${previousStepName} before accessing this step`;
    };
  }, [prerequisites, canAccess]);

  // Helper: Get missing items for a step
  const getMissingItems = useMemo(() => {
    return (step: WorkflowStep): string[] => {
      return prerequisites[step].missingItems;
    };
  }, [prerequisites]);

  // Determine current step (first incomplete required step)
  const currentStep = useMemo<WorkflowStep>(() => {
    for (const step of WORKFLOW_STEPS) {
      const check = prerequisites[step];
      if (check.isRequired && !check.isComplete) {
        return step;
      }
    }

    // All required steps complete, user is on analytics or complete
    return 'analytics';
  }, [prerequisites]);

  // Determine next step (first incomplete step after current)
  const nextStep = useMemo<WorkflowStep | null>(() => {
    const currentIndex = WORKFLOW_STEPS.indexOf(currentStep);

    for (let i = currentIndex + 1; i < WORKFLOW_STEPS.length; i++) {
      const step = WORKFLOW_STEPS[i];
      const check = prerequisites[step];
      if (!check.isComplete) {
        return step;
      }
    }

    return null; // All steps complete
  }, [currentStep, prerequisites]);

  // Check if ready for generation (all required steps before chapters complete)
  const isReadyForGeneration = useMemo(() => {
    return (
      prerequisites.concept.isComplete &&
      prerequisites.characters.isComplete &&
      prerequisites.world.isComplete &&
      prerequisites.plots.isComplete &&
      prerequisites.outline.isComplete
    );
  }, [prerequisites]);

  // Calculate completion percentage
  const getCompletionPercentage = useMemo(() => {
    return (): number => {
      const requiredSteps = WORKFLOW_STEPS.filter(step => prerequisites[step].isRequired);
      const completedCount = requiredSteps.filter(step => prerequisites[step].isComplete).length;
      return Math.round((completedCount / requiredSteps.length) * 100);
    };
  }, [prerequisites]);

  return {
    prerequisites,
    canAccess,
    getBlockingReason,
    currentStep,
    nextStep,
    isReadyForGeneration,
    getMissingItems,
    getCompletionPercentage,
  };
}
