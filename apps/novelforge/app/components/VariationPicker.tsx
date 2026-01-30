'use client';

import { useState } from 'react';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VariationPickerProps {
  chapterId: string;
  variationData: {
    variationId: string;
    originalText: string;
    variations: [string, string, string];
    contextBefore: string;
    contextAfter: string;
    mode: string;
  };
  onApply: (updatedContent: string) => void;
  onClose: () => void;
}

export default function VariationPicker({
  chapterId,
  variationData,
  onApply,
  onClose,
}: VariationPickerProps) {
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  // BUG-009 FIX: Add bounds checking for array access
  const allOptions = [
    { index: 0, label: 'Original', text: variationData.originalText },
    ...(variationData.variations && variationData.variations.length >= 3 ? [
      { index: 1, label: 'Variation 1', text: variationData.variations[0] },
      { index: 2, label: 'Variation 2', text: variationData.variations[1] },
      { index: 3, label: 'Variation 3', text: variationData.variations[2] },
    ] : [])
  ];

  const handleApply = async () => {
    if (selectedVariation === null) {
      alert('Please select a variation');
      return;
    }

    setApplying(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/regeneration/chapters/${chapterId}/apply-variation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variationId: variationData.variationId,
            selectedVariation,
          }),
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to apply variation');
      }

      const result = await res.json();
      onApply(result.updatedContent);
      alert('Variation applied successfully');
    } catch (error) {
      console.error('Error applying variation:', error);
      alert('Failed to apply variation');
    } finally {
      setApplying(false);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Choose a Variation</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        <div style={styles.modeLabel}>
          Mode: <strong>{variationData.mode}</strong>
        </div>

        <div style={styles.contextSection}>
          <div style={styles.contextLabel}>Context Before:</div>
          <div style={styles.contextText}>{variationData.contextBefore}</div>
        </div>

        <div style={styles.variationsContainer}>
          {allOptions.map((option) => (
            <div key={option.index} style={styles.variationCard}>
              <div style={styles.variationHeader}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="variation"
                    checked={selectedVariation === option.index}
                    onChange={() => setSelectedVariation(option.index)}
                    style={styles.radio}
                  />
                  <span style={styles.variationLabel}>{option.label}</span>
                </label>
                <span style={styles.wordCount}>
                  {getWordCount(option.text)} words
                </span>
              </div>
              <div
                style={{
                  ...styles.variationText,
                  ...(selectedVariation === option.index && styles.selectedVariation),
                }}
              >
                {option.text}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.contextSection}>
          <div style={styles.contextLabel}>Context After:</div>
          <div style={styles.contextText}>{variationData.contextAfter}</div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedVariation === null || applying}
            style={{
              ...styles.applyButton,
              ...(selectedVariation === null || applying ? styles.disabledButton : {}),
            }}
          >
            {applying ? 'Applying...' : 'Apply Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '1200px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '4px 8px',
  },
  modeLabel: {
    padding: '12px 24px',
    backgroundColor: '#F3F4F6',
    fontSize: '14px',
    color: '#374151',
  },
  contextSection: {
    padding: '16px 24px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  contextLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  contextText: {
    fontSize: '14px',
    color: '#4B5563',
    fontFamily: 'Georgia, serif',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  variationsContainer: {
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  variationCard: {
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  variationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  radio: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  variationLabel: {
    color: '#374151',
  },
  wordCount: {
    fontSize: '12px',
    color: '#6B7280',
  },
  variationText: {
    padding: '16px',
    fontSize: '15px',
    lineHeight: '1.7',
    fontFamily: 'Georgia, serif',
    color: '#1A1A2E',
    minHeight: '200px',
    backgroundColor: '#fff',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  selectedVariation: {
    backgroundColor: '#EFF6FF',
    border: '2px solid #3B82F6',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  applyButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3B82F6',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
