'use client';

import { useMemo, useCallback } from 'react';
import type { Character, PlotStructure, StoryStructure } from '../../shared/types';

// Flexible chapter type for the hook
interface ChapterData {
  id?: string;
  content?: string | null;
  [key: string]: any;
}

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
  | 'coherence'
  | 'originality'
  | 'outline'
  | 'outline-review'  // Sprint 39: Optional editorial review of outline before chapters
  | 'chapters'
  | 'analytics'
  | 'editorial-report'
  | 'follow-up'
  | 'series'
  | 'publishing';

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

// Outline data structure - flexible to work with page-specific interfaces
export interface OutlineData {
  id?: string;
  structure?: StoryStructure;
  total_chapters?: number;
  [key: string]: any; // Allow additional properties from page-specific types
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
  chapters?: ChapterData[] | null
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

    case 'coherence':
      // Coherence check is optional - just requires plots to exist
      break;

    case 'originality':
      // Originality check is optional - just requires concept to exist
      break;

    case 'outline':
      if (!hasOutlineContent(outline)) {
        missing.push('Story outline with chapters');
      }
      break;

    case 'outline-review':
      // Outline review requires a complete outline
      if (!hasOutlineContent(outline)) {
        missing.push('Complete outline');
      }
      break;

    case 'chapters':
      // Need outline to be complete first (outline-review is optional)
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

    case 'editorial-report':
      // Need completed chapters with content for VEB analysis
      const completedChapters = chapters?.filter(ch => ch.content && ch.content.length > 0) || [];
      if (completedChapters.length === 0) {
        missing.push('At least one completed chapter with content');
      }
      break;

    case 'follow-up':
      // Need all chapters completed (book complete) for follow-up recommendations
      const allChapters = chapters || [];
      const writtenChapters = allChapters.filter(ch => ch.content && ch.content.length > 0);
      if (allChapters.length === 0 || writtenChapters.length < allChapters.length) {
        missing.push('All chapters must be completed');
      }
      break;

    case 'series':
      // Series management is always accessible - no prerequisites
      break;

    case 'publishing':
      // Publishing settings are always accessible after project exists
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
  'coherence',
  'originality',
  'outline',
  'outline-review',  // Sprint 39: Optional editorial review before chapters
  'chapters',
  'analytics',
  'editorial-report',
  'follow-up',
];

/**
 * Step display names
 */
const STEP_NAMES: Record<WorkflowStep, string> = {
  concept: 'Story Concept',
  characters: 'Characters',
  world: 'World Building',
  plots: 'Plot Structure',
  coherence: 'Coherence Check',
  originality: 'Originality Check',
  outline: 'Outline',
  'outline-review': 'Outline Review',
  chapters: 'Chapters',
  analytics: 'Analytics',
  'editorial-report': 'Editorial Report',
  'follow-up': 'Follow-Up Ideas',
  series: 'Series Management',
  publishing: 'Publishing Settings',
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
  chapters?: ChapterData[] | null
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
      coherence: {
        isComplete: false,
        isRequired: false,  // Coherence check is optional
        requiresPrevious: 'plots',
        missingItems: [],
      },
      originality: {
        isComplete: false,
        isRequired: false,  // Originality check is optional
        requiresPrevious: 'coherence',
        missingItems: [],
      },
      outline: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'originality',
        missingItems: [],
      },
      'outline-review': {
        isComplete: false,
        isRequired: false,  // Outline review is optional
        requiresPrevious: 'outline',
        missingItems: [],
      },
      chapters: {
        isComplete: false,
        isRequired: true,
        requiresPrevious: 'outline',  // Chapters require outline (not outline-review, since it's optional)
        missingItems: [],
      },
      analytics: {
        isComplete: false,
        isRequired: false, // Analytics is optional
        requiresPrevious: 'chapters',
        missingItems: [],
      },
      'editorial-report': {
        isComplete: false,
        isRequired: false, // Editorial report is optional
        requiresPrevious: 'chapters',
        missingItems: [],
      },
      'follow-up': {
        isComplete: false,
        isRequired: false, // Follow-up is optional
        requiresPrevious: 'chapters',
        missingItems: [],
      },
      series: {
        isComplete: false,
        isRequired: false, // Series management is optional (for multi-book projects)
        requiresPrevious: null, // No prerequisites - always accessible
        missingItems: [],
      },
      publishing: {
        isComplete: false,
        isRequired: false, // Publishing is optional
        requiresPrevious: 'chapters', // Requires chapters to be complete
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

    // Check coherence completion (optional - always accessible if plots exist)
    checks.coherence.missingItems = getMissingItemsForStep('coherence', project);
    // Coherence is considered "complete" if it's been viewed (always allow access)
    checks.coherence.isComplete = checks.plots.isComplete;

    // Check originality completion (optional - always accessible if coherence accessible)
    checks.originality.missingItems = getMissingItemsForStep('originality', project);
    // Originality is considered "complete" if it's been viewed (always allow access)
    checks.originality.isComplete = checks.coherence.isComplete;

    // Check outline completion
    checks.outline.missingItems = getMissingItemsForStep('outline', project, outline);
    checks.outline.isComplete = hasOutlineContent(outline);

    // Check outline-review completion (optional - always accessible if outline exists)
    checks['outline-review'].missingItems = getMissingItemsForStep('outline-review', project, outline);
    // Outline review is considered "complete" if outline exists (always allow access to skip or review)
    checks['outline-review'].isComplete = checks.outline.isComplete;

    // Check chapters completion (at least one chapter exists)
    checks.chapters.missingItems = getMissingItemsForStep('chapters', project, outline, chapters);
    checks.chapters.isComplete = (chapters?.length ?? 0) > 0;

    // Check analytics completion (at least one chapter has content)
    checks.analytics.missingItems = getMissingItemsForStep('analytics', project, outline, chapters);
    const chaptersWithContent = chapters?.filter(ch => ch.content && ch.content.length > 0) || [];
    checks.analytics.isComplete = chaptersWithContent.length > 0;

    // Check editorial-report completion (requires completed chapters)
    checks['editorial-report'].missingItems = getMissingItemsForStep('editorial-report', project, outline, chapters);
    checks['editorial-report'].isComplete = chaptersWithContent.length > 0;

    // Check follow-up completion (requires ALL chapters to be written)
    checks['follow-up'].missingItems = getMissingItemsForStep('follow-up', project, outline, chapters);
    const allChaptersWritten = chapters && chapters.length > 0 &&
      chapters.every(ch => ch.content && ch.content.length > 0);
    checks['follow-up'].isComplete = allChaptersWritten || false;

    // Series management is always accessible (no prerequisites)
    checks.series.missingItems = getMissingItemsForStep('series', project, outline, chapters);
    checks.series.isComplete = true; // Always accessible

    // Publishing settings - accessible after chapters exist
    checks.publishing.missingItems = getMissingItemsForStep('publishing', project, outline, chapters);
    checks.publishing.isComplete = true; // Always considered complete (it's just settings)

    return checks;
  }, [project, outline, chapters]);

  // Helper: Can access a step?
  const canAccess = useCallback((step: WorkflowStep): boolean => {
    const check = prerequisites[step];

    // No previous requirement means always accessible
    if (!check.requiresPrevious) {
      return true;
    }

    // Check if previous step is complete
    const previousCheck = prerequisites[check.requiresPrevious];
    return previousCheck.isComplete;
  }, [prerequisites]);

  // Helper: Get blocking reason
  const getBlockingReason = useCallback((step: WorkflowStep): string | null => {
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
  }, [prerequisites, canAccess]);

  // Helper: Get missing items for a step
  const getMissingItems = useCallback((step: WorkflowStep): string[] => {
    return prerequisites[step].missingItems;
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
