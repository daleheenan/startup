'use client';

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
          : '#FFFFFF',
        border: isSelected
          ? '2px solid #667eea'
          : '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.5rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        position: 'relative',
        boxShadow: isSelected
          ? '0 4px 14px rgba(102, 126, 234, 0.2)'
          : '0 1px 3px rgba(0,0,0,0.05)',
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '14px',
        }}>
          ✓
        </div>
      )}

      {/* Title */}
      <h3 style={{
        fontSize: '1.5rem',
        marginBottom: '1rem',
        color: '#1A1A2E',
        paddingRight: '2rem',
      }}>
        {concept.title}
      </h3>

      {/* Logline */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#EEF2FF',
        borderLeft: '3px solid #667eea',
        borderRadius: '4px',
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
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            color: '#64748B',
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
