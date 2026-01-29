/**
 * Barrel export file for React hooks
 *
 * Provides organised imports for all custom hooks in NovelForge
 */

export { useKeyboardShortcut } from './useKeyboardShortcut';
export type { ShortcutConfig } from './useKeyboardShortcut';
export { useNavigationCounts } from './useNavigationCounts';
export { useOfflineChapter } from './useOfflineChapter';
export { useProjectNavigation } from './useProjectNavigation';
export { useProjectProgress } from './useProjectProgress';
export { useProjects, useProject, useInvalidateProjects } from './useProjects';
export { useStoryIdeas, useCreateStoryIdea } from './useStoryIdeas';
export type { CreateStoryIdeaParams, CreateStoryIdeaResponse } from './useStoryIdeas';
export { useUserPreferences, useUpdateUserPreferences } from './useUserPreferences';
export type { UserPreferences } from './useUserPreferences';
export { useWorkflowPrerequisites } from './useWorkflowPrerequisites';
