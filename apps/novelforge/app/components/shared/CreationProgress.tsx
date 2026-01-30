'use client';

import Link from 'next/link';
import { colors, borderRadius } from '@/app/lib/constants';
import type { CreationProgressData } from '@/shared/types';

interface CreationProgressProps {
  progress: CreationProgressData;
  currentStepId?: string;
}

export default function CreationProgress({ progress, currentStepId }: CreationProgressProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
      role="navigation"
      aria-label="Creation progress"
    >
      {/* Progress Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, margin: 0 }}>
            Novel Creation Progress
          </h2>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: progress.canGenerate ? colors.success : colors.brandText,
            }}
          >
            {progress.percentComplete}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '8px',
            background: colors.brandLight,
            borderRadius: borderRadius.full,
            overflow: 'hidden',
          }}
          role="progressbar"
          aria-valuenow={progress.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percentComplete}%`,
              background: progress.canGenerate
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Steps - Desktop: Horizontal, Mobile: Vertical */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {progress.steps.map((step, index) => {
          const isCompleted = progress.completedSteps.includes(step.id);
          const isCurrent = currentStepId === step.id;
          const isClickable = step.route && (isCompleted || isCurrent);

          const stepContent = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: isCurrent ? colors.brandLight : isCompleted ? colors.successLight : colors.background,
                border: `1px solid ${isCurrent ? colors.brandBorder : isCompleted ? colors.successBorder : colors.border}`,
                borderRadius: borderRadius.md,
                transition: 'all 0.2s',
              }}
            >
              {/* Step Icon/Number */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: borderRadius.full,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted ? colors.success : isCurrent ? colors.brandText : colors.border,
                  color: colors.surface,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {isCompleted ? '✓' : step.icon || index + 1}
              </div>

              {/* Step Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: isCompleted ? colors.success : isCurrent ? colors.brandText : colors.textSecondary,
                    marginBottom: '0.125rem',
                  }}
                >
                  {step.name}
                  {step.required && !isCompleted && (
                    <span style={{ color: colors.error, marginLeft: '0.25rem' }}>*</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: colors.textSecondary,
                  }}
                >
                  {isCompleted ? 'Complete' : isCurrent ? 'In Progress' : step.required ? 'Required' : 'Optional'}
                </div>
              </div>
            </div>
          );

          if (isClickable) {
            return (
              <Link
                key={step.id}
                href={step.route}
                style={{
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                aria-label={`Go to ${step.name} step`}
              >
                {stepContent}
              </Link>
            );
          }

          return (
            <div key={step.id} style={{ cursor: 'default' }}>
              {stepContent}
            </div>
          );
        })}
      </div>

      {/* Generation Status */}
      {progress.canGenerate && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: colors.successLight,
            border: `1px solid ${colors.successBorder}`,
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: colors.success,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">✓</span>
          Ready to Generate Outline
        </div>
      )}
    </div>
  );
}
