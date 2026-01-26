/**
 * Workflow Utility Functions
 *
 * Provides functions for managing the sequential workflow progression
 * through project creation steps: Concept -> Characters -> World -> Plot -> Outline -> Chapters -> Analytics
 */

import type {
  WorkflowStep,
  WorkflowRequirement,
  TabStatus,
  Project,
  Outline,
  Chapter,
} from '../../shared/types';

/**
 * Workflow requirements define the prerequisite chain
 * Each step requires all previous steps to be completed
 */
export const WORKFLOW_REQUIREMENTS: Record<WorkflowStep, WorkflowRequirement> = {
  concept: {
    step: 'concept',
    requiredSteps: [],
    label: 'Overview',
    route: '',
    icon: '📋'
  },
  characters: {
    step: 'characters',
    requiredSteps: ['concept'],
    label: 'Characters',
    route: '/characters',
    icon: '👥'
  },
  world: {
    step: 'world',
    requiredSteps: ['concept', 'characters'],
    label: 'World',
    route: '/world',
    icon: '🌍'
  },
  plots: {
    step: 'plots',
    requiredSteps: ['concept', 'characters', 'world'],
    label: 'Plot',
    route: '/plot',
    icon: '📖'
  },
  coherence: {
    step: 'coherence',
    requiredSteps: ['concept', 'characters', 'world', 'plots'],
    label: 'Coherence',
    route: '/coherence',
    icon: '🔗'
  },
  originality: {
    step: 'originality',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'coherence'],
    label: 'Originality',
    route: '/originality',
    icon: '✨'
  },
  outline: {
    step: 'outline',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'coherence', 'originality'],
    label: 'Outline',
    route: '/outline',
    icon: '📝'
  },
  chapters: {
    step: 'chapters',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'coherence', 'originality', 'outline'],
    label: 'Chapters',
    route: '/progress',
    icon: '📚'
  },
  analytics: {
    step: 'analytics',
    requiredSteps: ['concept', 'characters', 'world', 'plots', 'coherence', 'originality', 'outline', 'chapters'],
    label: 'Analytics',
    route: '/analytics',
    icon: '📊'
  }
};

/**
 * Check if a specific workflow step is complete
 */
export function isStepComplete(
  step: WorkflowStep,
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): boolean {
  switch (step) {
    case 'concept':
      // Project exists and has basic setup
      return project.story_dna !== null || (project as any).story_concept !== null;

    case 'characters':
      // Has at least one character defined
      return (project.story_bible?.characters?.length ?? 0) > 0;

    case 'world':
      // Has world elements defined
      const world = project.story_bible?.world;
      if (!world) return false;
      // Check if any world elements exist
      return (
        (world.locations?.length ?? 0) > 0 ||
        (world.factions?.length ?? 0) > 0 ||
        (world.systems?.length ?? 0) > 0
      );

    case 'plots':
      // Has plot layers defined
      return (project.plot_structure?.plot_layers?.length ?? 0) > 0;

    case 'coherence':
      // Coherence is optional - always complete if plots exist
      return (project.plot_structure?.plot_layers?.length ?? 0) > 0;

    case 'originality':
      // Originality is optional - always complete if plots exist
      return (project.plot_structure?.plot_layers?.length ?? 0) > 0;

    case 'outline':
      // Has an outline with chapters
      return outline !== null && (outline?.total_chapters ?? 0) > 0;

    case 'chapters':
      // Has at least one chapter
      return (chapters?.length ?? 0) > 0;

    case 'analytics':
      // Has at least one chapter with content
      return (chapters?.filter(ch => ch.content && ch.content.length > 0)?.length ?? 0) > 0;

    default:
      return false;
  }
}

/**
 * Check if all prerequisite steps are complete for a given step
 */
export function arePrerequisitesComplete(
  step: WorkflowStep,
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): boolean {
  const requirements = WORKFLOW_REQUIREMENTS[step];

  for (const requiredStep of requirements.requiredSteps) {
    if (!isStepComplete(requiredStep, project, outline, chapters)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a step can be accessed (prerequisites met)
 */
export function canAccessStep(
  step: WorkflowStep,
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): boolean {
  // Concept/Overview is always accessible
  if (step === 'concept') return true;

  return arePrerequisitesComplete(step, project, outline, chapters);
}

/**
 * Get the reason why a step is blocked
 */
export function getBlockingReason(
  step: WorkflowStep,
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): string | null {
  if (canAccessStep(step, project, outline, chapters)) {
    return null;
  }

  const requirements = WORKFLOW_REQUIREMENTS[step];
  const missingSteps: string[] = [];

  for (const requiredStep of requirements.requiredSteps) {
    if (!isStepComplete(requiredStep, project, outline, chapters)) {
      missingSteps.push(WORKFLOW_REQUIREMENTS[requiredStep].label);
    }
  }

  if (missingSteps.length === 0) {
    return null;
  }

  if (missingSteps.length === 1) {
    return `Please complete ${missingSteps[0]} first.`;
  }

  const lastStep = missingSteps.pop();
  return `Please complete ${missingSteps.join(', ')} and ${lastStep} first.`;
}

/**
 * Get the first incomplete prerequisite step
 */
export function getFirstIncompletePrerequisite(
  step: WorkflowStep,
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): WorkflowStep | null {
  const requirements = WORKFLOW_REQUIREMENTS[step];

  for (const requiredStep of requirements.requiredSteps) {
    if (!isStepComplete(requiredStep, project, outline, chapters)) {
      return requiredStep;
    }
  }

  return null;
}

/**
 * Get the visual status of a tab
 */
export function getTabStatus(
  step: WorkflowStep,
  project: Project,
  currentPath: string,
  outline?: Outline | null,
  chapters?: Chapter[]
): TabStatus {
  const requirements = WORKFLOW_REQUIREMENTS[step];
  const isCurrentTab = currentPath.includes(requirements.route) ||
    (requirements.route === '' && !currentPath.includes('/'));

  // Currently viewing this tab
  if (isCurrentTab) return 'active';

  // Can't access this step yet
  if (!canAccessStep(step, project, outline, chapters)) {
    return 'locked';
  }

  // Step is complete
  if (isStepComplete(step, project, outline, chapters)) {
    return 'completed';
  }

  // Step is required (has dependencies on it)
  const hasStepsRequiringThis = Object.values(WORKFLOW_REQUIREMENTS).some(
    req => req.requiredSteps.includes(step)
  );

  return hasStepsRequiringThis ? 'required' : 'optional';
}

/**
 * Get all workflow steps in order
 */
export function getOrderedWorkflowSteps(): WorkflowStep[] {
  return ['concept', 'characters', 'world', 'plots', 'coherence', 'originality', 'outline', 'chapters', 'analytics'];
}

/**
 * Get the next step that needs to be completed
 */
export function getNextStep(
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): WorkflowStep | null {
  const steps = getOrderedWorkflowSteps();

  for (const step of steps) {
    if (!isStepComplete(step, project, outline, chapters)) {
      return step;
    }
  }

  return null; // All steps complete
}

/**
 * Calculate overall completion percentage
 */
export function calculateCompletionPercentage(
  project: Project,
  outline?: Outline | null,
  chapters?: Chapter[]
): number {
  const steps = getOrderedWorkflowSteps();
  let completedCount = 0;

  for (const step of steps) {
    if (isStepComplete(step, project, outline, chapters)) {
      completedCount++;
    }
  }

  return Math.round((completedCount / steps.length) * 100);
}
