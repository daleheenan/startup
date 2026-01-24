'use client';

import { colors, gradients, borderRadius, shadows } from '../lib/constants';

interface StoryConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string;
  protagonistHint: string;
  conflictType: string;
}

interface ConceptCardProps {
  concept: StoryConcept;
  isSelected: boolean;
  onSelect: () => void;
  onSave?: () => void;
  disabled: boolean;
}

export default function ConceptCard({ concept, isSelected, onSelect, onSave, disabled }: ConceptCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onSelect}
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          : colors.surface,
        border: isSelected
          ? `2px solid ${colors.brandStart}`
          : `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        padding: '1.5rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        position: 'relative',
        boxShadow: isSelected ? shadows.md : shadows.sm,
      }}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '24px',
          height: '24px',
          background: gradients.brand,
          borderRadius: borderRadius.full,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.surface,
          fontSize: '14px',
        }}>
          ✓
        </div>
      )}

      {/* Title */}
      <h3 style={{
        fontSize: '1.5rem',
        marginBottom: '1rem',
        color: colors.text,
        paddingRight: '2rem',
      }}>
        {concept.title}
      </h3>

      {/* Logline */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: colors.brandLight,
        borderLeft: `3px solid ${colors.brandStart}`,
        borderRadius: borderRadius.sm,
      }}>
        <p style={{
          fontSize: '0.95rem',
          color: '#374151',
          fontStyle: 'italic',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {concept.logline}
        </p>
      </div>

      {/* Synopsis */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{
          fontSize: '0.9rem',
          color: '#64748B',
          lineHeight: 1.6,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {concept.synopsis}
        </p>
      </div>

      {/* Hook */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#FAF5FF',
        borderRadius: '6px',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.25rem',
        }}>
          Unique Hook
        </div>
        <p style={{
          fontSize: '0.875rem',
          color: '#374151',
          margin: 0,
        }}>
          {concept.hook}
        </p>
      </div>

      {/* Metadata */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        fontSize: '0.875rem',
        marginBottom: onSave ? '1rem' : 0,
      }}>
        <div>
          <span style={{ color: '#64748B' }}>Protagonist:</span>{' '}
          <span style={{ color: '#374151' }}>{concept.protagonistHint}</span>
        </div>
        <div>
          <span style={{ color: '#64748B' }}>Conflict:</span>{' '}
          <span style={{ color: '#374151', textTransform: 'capitalize' }}>
            {concept.conflictType}
          </span>
        </div>
      </div>

      {/* Save Button */}
      {onSave && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.625rem',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.sm,
            color: colors.textSecondary,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Save for Later</span>
        </button>
      )}
    </div>
  );
}
