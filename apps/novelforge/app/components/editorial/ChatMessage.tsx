'use client';

import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';
import RecommendationCard from './RecommendationCard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialChanges = Record<string, any>;

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
  appliedChanges?: {
    concept?: PartialChanges;
    dna?: PartialChanges;
  };
  recommendedChanges?: {
    concept?: PartialChanges;
    dna?: PartialChanges;
    rationale: string;
  };
  onApply?: () => void;
  onDismiss?: () => void;
}

/**
 * Component that renders individual chat messages.
 * Supports user messages, AI responses (answers, changes, recommendations).
 */
export default function ChatMessage({
  role,
  content,
  timestamp,
  responseType,
  appliedChanges,
  recommendedChanges,
  onApply,
  onDismiss,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Format timestamp for display
  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Get badge configuration based on response type
  const getBadge = (): { text: string; bg: string; color: string } | null => {
    if (!isAssistant || !responseType) return null;

    switch (responseType) {
      case 'answer':
        return {
          text: 'Answer',
          bg: colors.semantic.infoLight,
          color: colors.semantic.infoDark,
        };
      case 'change_applied':
        return {
          text: 'Change Applied',
          bg: colors.semantic.successLight,
          color: colors.semantic.successDark,
        };
      case 'recommendation':
        return {
          text: 'Recommendation',
          bg: colors.semantic.warningLight,
          color: colors.semantic.warningDark,
        };
      default:
        return null;
    }
  };

  // Format applied changes for display
  const formatAppliedChanges = (): string[] => {
    if (!appliedChanges) return [];

    const changes: string[] = [];

    if (appliedChanges.concept) {
      Object.entries(appliedChanges.concept).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
          changes.push(`Updated ${fieldName}: "${value}"`);
        }
      });
    }

    if (appliedChanges.dna) {
      Object.entries(appliedChanges.dna).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
          const displayValue = Array.isArray(value) ? value.join(', ') : value;
          changes.push(`Updated ${fieldName}: "${displayValue}"`);
        }
      });
    }

    return changes;
  };

  const badge = getBadge();
  const changesList = formatAppliedChanges();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: spacing[2],
      }}
    >
      {/* Message bubble */}
      <div
        style={{
          maxWidth: '80%',
          padding: spacing[4],
          borderRadius: borderRadius.lg,
          background: isUser
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : colors.background.surface,
          border: isUser ? 'none' : `1px solid ${colors.border.default}`,
          color: isUser ? colors.white : colors.text.primary,
          fontSize: typography.fontSize.base,
          lineHeight: typography.lineHeight.normal,
        }}
      >
        {/* Header with badge and timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing[2],
            gap: spacing[3],
          }}
        >
          {/* Badge for assistant messages */}
          {badge && (
            <span
              style={{
                padding: `${spacing[1]} ${spacing[2]}`,
                borderRadius: borderRadius.sm,
                background: badge.bg,
                color: badge.color,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {badge.text}
            </span>
          )}

          {/* Timestamp */}
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: isUser
                ? 'rgba(255, 255, 255, 0.8)'
                : colors.text.tertiary,
              marginLeft: 'auto',
            }}
          >
            {formatTime(timestamp)}
          </span>
        </div>

        {/* Message content */}
        <p
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </p>

        {/* Applied changes list */}
        {changesList.length > 0 && (
          <div style={{ marginTop: spacing[3] }}>
            <div
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Changes made:
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[1],
              }}
            >
              {changesList.map((change, index) => (
                <li
                  key={index}
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing[2],
                  }}
                >
                  <span style={{ color: colors.semantic.success }}>•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation card (shown below message for recommendations) */}
      {recommendedChanges && onApply && onDismiss && (
        <div style={{ maxWidth: '80%', width: '100%' }}>
          <RecommendationCard
            rationale={recommendedChanges.rationale}
            changes={recommendedChanges}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        </div>
      )}
    </div>
  );
}
