'use client';

import Link from 'next/link';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import { WORKFLOW_REQUIREMENTS } from '@/app/lib/workflow-utils';
import type { WorkflowStep } from '@/shared/types';

interface BlockedStepMessageProps {
  projectId: string;
  step: WorkflowStep;
  reason: string;
  missingStep?: WorkflowStep;
}

/**
 * BlockedStepMessage Component
 *
 * Displays a message when a user tries to access a workflow step
 * that they don't have access to yet (prerequisites not met).
 */
export default function BlockedStepMessage({
  projectId,
  step,
  reason,
  missingStep,
}: BlockedStepMessageProps) {
  const stepInfo = WORKFLOW_REQUIREMENTS[step];
  const missingStepInfo = missingStep ? WORKFLOW_REQUIREMENTS[missingStep] : null;

  // Get the route to the missing prerequisite step
  const prerequisiteRoute = missingStepInfo
    ? `/projects/${projectId}${missingStepInfo.route}`
    : `/projects/${projectId}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        margin: '2rem auto',
        maxWidth: '480px',
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.sm,
        textAlign: 'center',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Lock Icon */}
      <div
        style={{
          fontSize: '3rem',
          marginBottom: '1rem',
        }}
        aria-hidden="true"
      >
        🔒
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: colors.text,
          margin: '0 0 0.75rem 0',
        }}
      >
        {stepInfo.label} Locked
      </h2>

      {/* Reason */}
      <p
        style={{
          fontSize: '0.9375rem',
          color: colors.textSecondary,
          margin: '0 0 1.5rem 0',
          lineHeight: 1.6,
        }}
      >
        {reason}
      </p>

      {/* Action Button */}
      <Link
        href={prerequisiteRoute}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
          color: 'white',
          borderRadius: borderRadius.md,
          textDecoration: 'none',
          fontSize: '0.9375rem',
          fontWeight: 500,
          boxShadow: shadows.md,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = shadows.lg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = shadows.md;
        }}
      >
        {missingStepInfo && (
          <span aria-hidden="true">{missingStepInfo.icon}</span>
        )}
        <span>
          {missingStepInfo
            ? `Go to ${missingStepInfo.label}`
            : 'Complete Prerequisites'}
        </span>
      </Link>

      {/* Workflow Progress Hint */}
      <p
        style={{
          fontSize: '0.8125rem',
          color: colors.textTertiary,
          margin: '1.5rem 0 0 0',
        }}
      >
        Complete each step in order to unlock the next
      </p>
    </div>
  );
}
