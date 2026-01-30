'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/app/lib/fetch-utils';
import { useWorkflowPrerequisites } from '@/app/hooks/useWorkflowPrerequisites';
import { getFirstIncompletePrerequisite } from '@/app/lib/workflow-utils';
import BlockedStepMessage from './BlockedStepMessage';
import LoadingState from './LoadingState';
import type { WorkflowStep, Project, Outline, Chapter } from '@/shared/types';

interface WorkflowNavigationGuardProps {
  projectId: string;
  currentStep: WorkflowStep;
  children: ReactNode;
}

/**
 * WorkflowNavigationGuard Component
 *
 * Wrapper component that checks workflow prerequisites before rendering children.
 * If prerequisites are not met, displays a BlockedStepMessage instead.
 *
 * Usage:
 * ```tsx
 * <WorkflowNavigationGuard projectId={id} currentStep="world">
 *   <WorldBuildingContent />
 * </WorkflowNavigationGuard>
 * ```
 */
export default function WorkflowNavigationGuard({
  projectId,
  currentStep,
  children,
}: WorkflowNavigationGuardProps) {
  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json() as Promise<Project>;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch outline data (needed for outline/chapters/analytics steps)
  const { data: outline, isLoading: outlineLoading } = useQuery({
    queryKey: ['outline', projectId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/outlines?projectId=${projectId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (Array.isArray(data) ? data[0] : data) as Outline | null;
    },
    enabled: ['outline', 'chapters', 'analytics'].includes(currentStep),
    staleTime: 30 * 1000,
  });

  // Fetch chapters data (needed for analytics step)
  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', projectId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/projects/${projectId}/chapters`);
      if (!res.ok) return [];
      return res.json() as Promise<Chapter[]>;
    },
    enabled: currentStep === 'analytics',
    staleTime: 30 * 1000,
  });

  // Calculate loading state
  const isLoading =
    projectLoading ||
    (['outline', 'chapters', 'analytics'].includes(currentStep) && outlineLoading) ||
    (currentStep === 'analytics' && chaptersLoading);

  // Use workflow prerequisites hook
  const { canAccess, getBlockingReason } = useWorkflowPrerequisites(
    projectId,
    project || null,
    outline,
    chapters
  );

  // Show loading state while fetching data
  if (isLoading) {
    return <LoadingState message="Checking prerequisites..." />;
  }

  // If no project data yet, render children (let the page handle the error)
  if (!project) {
    return <>{children}</>;
  }

  // Check if user can access this step
  const hasAccess = canAccess(currentStep);

  if (!hasAccess) {
    const reason = getBlockingReason(currentStep) || 'Prerequisites not met';
    const missingStep = getFirstIncompletePrerequisite(currentStep, project, outline, chapters);

    return (
      <BlockedStepMessage
        projectId={projectId}
        step={currentStep}
        reason={reason}
        missingStep={missingStep || undefined}
      />
    );
  }

  // Prerequisites met, render children
  return <>{children}</>;
}
