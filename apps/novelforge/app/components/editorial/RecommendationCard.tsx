'use client';

import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialChanges = Record<string, any>;

interface RecommendationCardProps {
  rationale: string;
  changes: {
    concept?: PartialChanges;
    dna?: PartialChanges;
  };
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Component that displays AI recommendations requiring user approval.
 * Shows rationale, proposed changes, and Apply/Dismiss actions.
 */
export default function RecommendationCard({
  rationale,
  changes,
  onApply,
  onDismiss,
}: RecommendationCardProps) {
  // Format proposed changes for display
  const formatChanges = (): Array<{ field: string; value: string }> => {
    const changesList: Array<{ field: string; value: string }> = [];

    if (changes.concept) {
      Object.entries(changes.concept).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const fieldName = key.replace(/([A-Z])/g, ' $1').trim();
          const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          changesList.push({
            field: `Concept: ${displayName}`,
            value: String(value),
          });
        }
      });
    }

    if (changes.dna) {
      Object.entries(changes.dna).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const fieldName = key.replace(/([A-Z])/g, ' $1').trim();
          const displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          changesList.push({
            field: `DNA: ${displayName}`,
            value: displayValue,
          });
        }
      });
    }

    return changesList;
  };

  const proposedChanges = formatChanges();

  return (
    <div
      style={{
        background: colors.background.surface,
        border: `2px solid ${colors.semantic.warningBorder}`,
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[3],
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: colors.semantic.warningLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typography.fontSize.lg,
          }}
        >
          💡
        </div>
        <h4
          style={{
            margin: 0,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Suggested Changes
        </h4>
      </div>

      {/* Rationale */}
      <div
        style={{
          padding: spacing[3],
          background: colors.semantic.warningLight,
          borderRadius: borderRadius.md,
          border: `1px solid ${colors.semantic.warningBorder}`,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.semantic.warningDark,
            marginBottom: spacing[2],
          }}
        >
          Rationale:
        </div>
        <p
          style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: colors.semantic.warningDark,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {rationale}
        </p>
      </div>

      {/* Proposed changes */}
      {proposedChanges.length > 0 && (
        <div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.secondary,
              marginBottom: spacing[2],
            }}
          >
            Proposed changes:
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[2],
            }}
          >
            {proposedChanges.map((change, index) => (
              <li
                key={index}
                style={{
                  padding: spacing[3],
                  background: colors.background.surfaceHover,
                  borderRadius: borderRadius.sm,
                  border: `1px solid ${colors.border.default}`,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.tertiary,
                    marginBottom: spacing[1],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {change.field}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.primary,
                    wordBreak: 'break-word',
                  }}
                >
                  {change.value}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[2] }}>
        <button
          onClick={onApply}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.white,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.3)';
          }}
        >
          Apply Changes
        </button>
        <button
          onClick={onDismiss}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            color: colors.text.secondary,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = colors.background.surfaceHover;
            e.currentTarget.style.borderColor = colors.border.hover;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = colors.background.surface;
            e.currentTarget.style.borderColor = colors.border.default;
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
