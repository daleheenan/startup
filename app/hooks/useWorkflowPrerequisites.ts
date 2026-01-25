'use client';

import { useMemo } from 'react';
import type { Character, PlotStructure, StoryStructure } from '../../shared/types';

/**
 * Workflow Prerequisites Hook
 *
 * Enforces the prerequisite chain for NovelForge workflow:
 * Concept → Characters → World → Plots → Outline → Style → Submit → Chapters (monitoring)
 *
 * Each step requires the previous step to be completed before it can be accessed.
 */

// Workflow step identifiers
export type WorkflowStep =
  | 'concept'
  | 'characters'
  | 'world'
  | 'plots'
  | 'outline'
  | 'style'
  | 'submission'
  | 'chapters';

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
}

// Prose style data structure
export interface ProseStyleData {
  id?: string;
  voice_tone?: string;
  narrative_distance?: string;
  // Consider style complete if it has at least basic configuration
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
  proseStyle?: ProseStyleData | null
): string[] {
  const missing: string[] = [];

  if (!project) {
    return ['Project data not loaded'];
  }

  switch (step) {
    case 'concept':
      if (!project.title) missing.push('Project title');
      if (!project.genre && !project.story_dna?.genre) missing.push('Genre');
      if (!project.description) missing.push('Project description');
      break;

    case 'characters':
      const characters = project.story_bible?.characters || [];
      const hasProtagonist = characters.some(c =>
        c.role?.toLowerCase().includes('protagonist') ||
        c.role?.toLowerCase().includes('main character')
      );
      const hasAntagonist = characters.some(c =>
        c.role?.toLowerCase().includes('antagonist') ||
        c.role?.toLowerCase().includes('villain')
      );

      if (!hasProtagonist) missing.push('Protagonist');
      if (!hasAntagonist) missing.push('Antagonist');
      break;

    case 'world':
      const worldCount = countWorldElements(project.story_bible?.world);
      if (worldCount === 0) {
        missing.push('At least one world element (location, faction, or system)');
      }
      break;

    case 'plots':
      const plotLayers = project.plot_structure?.plot_layers || [];
      const hasMainPlot = plotLayers.some(layer => layer.type === 'main');

      if (!hasMainPlot) {
        missing.push('At least one main plot layer');
      }
      break;

    case 'outline':
      if (!hasOutlineContent(outline)) {
        missing.push('Outline with at least one act containing chapters');
      }
      break;

    case 'style':
      if (!proseStyle || !proseStyle.id) {
        missing.push('Prose style configuration');
      }
      break;

    case 'submission':
      if (!project.generation_submitted_at) {
        missing.push('Submit project for generation');
      }
      break;

    case 'chapters':
      // Chapters step is always accessible after submission
      break;
  }

  return missing;
}

/**
 * useWorkflowPrerequisites Hook
 *
 * Manages workflow prerequisites and determines which steps are accessible.
 *
 * @param projectId - The project ID
 * @param project - Project data (can be null if not loaded yet)
 * @param outline - Optional outline data
 * @param proseStyle - Optional prose style data
 */
export function useWorkflowPrerequisites(
  projectId: string | null,
  project: WorkflowProjectData | null,
  outline?: OutlineData | null,
  proseStyle?: ProseStyleData | null
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
      style: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'outline',
        missingItems: [],
      },
      submission: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'style',
        missingItems: [],
      },
      chapters: {
        isComplete: false,
        isRequired: false,
        requiresPrevious: 'submission',
        missingItems: [],
      },
    };

    if (!project) {
      // If no project data, nothing is complete
      return checks;
    }

    // Check concept completion
    checks.concept.missingItems = getMissingItemsForStep('concept', project);
    checks.concept.isComplete =
      !!project.title &&
      (!!project.genre || !!project.story_dna?.genre) &&
      !!project.description;

    // Check characters completion
    checks.characters.missingItems = getMissingItemsForStep('characters', project);
    const characters = project.story_bible?.characters || [];
    const hasProtagonist = characters.some(c =>
      c.role?.toLowerCase().includes('protagonist') ||
      c.role?.toLowerCase().includes('main character')
    );
    const hasAntagonist = characters.some(c =>
      c.role?.toLowerCase().includes('antagonist') ||
      c.role?.toLowerCase().includes('villain')
    );
    checks.characters.isComplete = hasProtagonist && hasAntagonist;

    // Check world completion
    checks.world.missingItems = getMissingItemsForStep('world', project);
    const worldCount = countWorldElements(project.story_bible?.world);
    checks.world.isComplete = worldCount > 0;

    // Check plots completion
    checks.plots.missingItems = getMissingItemsForStep('plots', project);
    const plotLayers = project.plot_structure?.plot_layers || [];
    const hasMainPlot = plotLayers.some(layer => layer.type === 'main');
    checks.plots.isComplete = hasMainPlot;

    // Check outline completion
    checks.outline.missingItems = getMissingItemsForStep('outline', project, outline);
    checks.outline.isComplete = hasOutlineContent(outline);

    // Check style completion
    checks.style.missingItems = getMissingItemsForStep('style', project, outline, proseStyle);
    checks.style.isComplete = !!(proseStyle && proseStyle.id);

    // Check submission completion
    checks.submission.missingItems = getMissingItemsForStep('submission', project);
    checks.submission.isComplete = !!project.generation_submitted_at;

    // Chapters is complete once submission is done (it's a monitoring step)
    checks.chapters.isComplete = checks.submission.isComplete;
    checks.chapters.missingItems = [];

    return checks;
  }, [project, outline, proseStyle]);

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
      const stepNames: Record<WorkflowStep, string> = {
        concept: 'Story Concept',
        characters: 'Characters',
        world: 'World Building',
        plots: 'Plot Structure',
        outline: 'Outline',
        style: 'Prose Style',
        submission: 'Submission',
        chapters: 'Chapters',
      };

      const previousStepName = stepNames[check.requiresPrevious];
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
    const steps: WorkflowStep[] = [
      'concept',
      'characters',
      'world',
      'plots',
      'outline',
      'style',
      'submission',
      'chapters',
    ];

    for (const step of steps) {
      const check = prerequisites[step];
      if (check.isRequired && !check.isComplete) {
        return step;
      }
    }

    // All required steps complete, user is on chapters
    return 'chapters';
  }, [prerequisites]);

  // Determine next step (first incomplete step after current)
  const nextStep = useMemo<WorkflowStep | null>(() => {
    const steps: WorkflowStep[] = [
      'concept',
      'characters',
      'world',
      'plots',
      'outline',
      'style',
      'submission',
      'chapters',
    ];

    const currentIndex = steps.indexOf(currentStep);

    for (let i = currentIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      const check = prerequisites[step];
      if (!check.isComplete) {
        return step;
      }
    }

    return null; // All steps complete
  }, [currentStep, prerequisites]);

  // Check if ready for generation (all required steps before submission complete)
  const isReadyForGeneration = useMemo(() => {
    return (
      prerequisites.concept.isComplete &&
      prerequisites.characters.isComplete &&
      prerequisites.world.isComplete &&
      prerequisites.plots.isComplete &&
      prerequisites.outline.isComplete &&
      prerequisites.style.isComplete
    );
  }, [prerequisites]);

  return {
    prerequisites,
    canAccess,
    getBlockingReason,
    currentStep,
    nextStep,
    isReadyForGeneration,
    getMissingItems,
  };
}
