'use client';

import { useState, type CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import { PUBLICATION_STATUSES } from '@/app/lib/book-data';
import ConfirmDialog from '@/app/components/shared/ConfirmDialog';

// ==================== TYPES ====================

export interface StatusPipelineProps {
  /** Current publication status */
  currentStatus: string;
  /** Callback when status changes */
  onStatusChange: (newStatus: string) => void;
  /** Whether the pipeline is disabled */
  disabled?: boolean;
}

// ==================== COMPONENT ====================

/**
 * StatusPipeline displays a visual workflow for publication status.
 *
 * Shows 5 steps:
 * - Draft → Beta Readers → Editing → Submitted → Published
 *
 * Features:
 * - Current step highlighted
 * - Completed steps have checkmark
 * - Click step to change status (with confirmation)
 * - Visual progress indicator
 */
export default function StatusPipeline({
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusPipelineProps) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStepClick = (statusValue: string) => {
    if (disabled || statusValue === currentStatus) return;
    setPendingStatus(statusValue);
  };

  const handleConfirmChange = () => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  };

  const handleCancelChange = () => {
    setPendingStatus(null);
  };

  const getCurrentStepIndex = () => {
    return PUBLICATION_STATUSES.findIndex(s => s.value === currentStatus);
  };

  const getPendingStatusLabel = () => {
    const status = PUBLICATION_STATUSES.find(s => s.value === pendingStatus);
    return status?.label || pendingStatus;
  };

  const isStepCompleted = (index: number) => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex > index;
  };

  const isStepCurrent = (statusValue: string) => {
    return statusValue === currentStatus;
  };

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    padding: spacing[6],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
  };

  const stepsContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  };

  const progressLineStyle: CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '10%',
    right: '10%',
    height: '4px',
    background: colors.border.default,
    zIndex: 0,
  };

  const progressFillStyle: CSSProperties = {
    height: '100%',
    background: colors.brand.gradient,
    transition: 'width 0.3s ease',
    width: `${(getCurrentStepIndex() / (PUBLICATION_STATUSES.length - 1)) * 100}%`,
  };

  const getStepStyle = (statusValue: string, index: number): CSSProperties => {
    const isCurrent = isStepCurrent(statusValue);
    const isCompleted = isStepCompleted(index);

    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing[2],
      cursor: disabled ? 'not-allowed' : 'pointer',
      zIndex: 1,
      opacity: disabled ? 0.6 : 1,
      transition: transitions.all,
    };
  };

  const getCircleStyle = (statusValue: string, index: number): CSSProperties => {
    const isCurrent = isStepCurrent(statusValue);
    const isCompleted = isStepCompleted(index);

    let background = colors.background.surface;
    let borderColor = colors.border.default;
    let color = colors.text.tertiary;

    if (isCompleted) {
      background = colors.semantic.successLight;
      borderColor = colors.semantic.success;
      color = colors.semantic.successDark;
    } else if (isCurrent) {
      background = colors.brand.primaryLight;
      borderColor = colors.brand.primary;
      color = colors.brand.primary;
    }

    return {
      width: '44px',
      height: '44px',
      borderRadius: borderRadius.full,
      background,
      border: `3px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color,
      transition: transitions.all,
    };
  };

  const labelStyle = (isCurrent: boolean): CSSProperties => ({
    fontSize: typography.fontSize.sm,
    fontWeight: isCurrent ? typography.fontWeight.semibold : typography.fontWeight.medium,
    color: isCurrent ? colors.brand.primary : colors.text.secondary,
    textAlign: 'center',
    maxWidth: '100px',
    transition: transitions.colors,
  });

  // ---- Render ----

  return (
    <>
      <div style={containerStyle}>
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[6],
          }}
        >
          Publication Status
        </h3>

        <div style={stepsContainerStyle}>
          {/* Progress Line */}
          <div style={progressLineStyle}>
            <div style={progressFillStyle} />
          </div>

          {/* Steps */}
          {PUBLICATION_STATUSES.map((status, index) => {
            const isCurrent = isStepCurrent(status.value);
            const isCompleted = isStepCompleted(index);

            return (
              <div
                key={status.value}
                style={getStepStyle(status.value, index)}
                onClick={() => handleStepClick(status.value)}
                onMouseEnter={(e) => {
                  if (!disabled && !isCurrent) {
                    const circle = e.currentTarget.querySelector('div') as HTMLElement;
                    if (circle) {
                      circle.style.transform = 'scale(1.1)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  const circle = e.currentTarget.querySelector('div') as HTMLElement;
                  if (circle) {
                    circle.style.transform = 'scale(1)';
                  }
                }}
              >
                <div style={getCircleStyle(status.value, index)}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span style={labelStyle(isCurrent)}>{status.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={pendingStatus !== null}
        title="Change Publication Status?"
        message={`Are you sure you want to change the status to "${getPendingStatusLabel()}"?`}
        confirmText="Change Status"
        cancelText="Cancel"
        confirmStyle="primary"
        onConfirm={handleConfirmChange}
        onCancel={handleCancelChange}
      />
    </>
  );
}
