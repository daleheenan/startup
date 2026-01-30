'use client';

import { useState } from 'react';

interface RegenerationToolbarProps {
  selectionStart: number;
  selectionEnd: number;
  selectionText: string;
  onRegenerate: (mode: 'general' | 'dialogue' | 'description') => void;
  position: { top: number; left: number };
}

export default function RegenerationToolbar({
  selectionStart,
  selectionEnd,
  selectionText,
  onRegenerate,
  position,
}: RegenerationToolbarProps) {
  const [generating, setGenerating] = useState(false);

  const wordCount = selectionText.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleRegenerate = async (mode: 'general' | 'dialogue' | 'description') => {
    setGenerating(true);
    try {
      await onRegenerate(mode);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        ...styles.toolbar,
        top: position.top,
        left: position.left,
      }}
    >
      <div style={styles.info}>
        <span style={styles.wordCount}>{wordCount} words selected</span>
      </div>
      <div style={styles.buttons}>
        <button
          onClick={() => handleRegenerate('general')}
          disabled={generating}
          style={{...styles.button, ...styles.buttonPrimary}}
          title="Regenerate with overall improvements"
        >
          {generating ? '⏳' : '✨'} General
        </button>
        <button
          onClick={() => handleRegenerate('dialogue')}
          disabled={generating}
          style={{...styles.button, ...styles.buttonSecondary}}
          title="Focus on improving dialogue"
        >
          💬 Dialogue
        </button>
        <button
          onClick={() => handleRegenerate('description')}
          disabled={generating}
          style={{...styles.button, ...styles.buttonSecondary}}
          title="Focus on improving descriptions"
        >
          🎨 Description
        </button>
      </div>
      {generating && (
        <div style={styles.loadingText}>Generating variations...</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'absolute',
    backgroundColor: '#fff',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '12px',
    zIndex: 100,
    minWidth: '400px',
  },
  info: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #E5E7EB',
  },
  wordCount: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
  },
  buttons: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
    color: '#fff',
  },
  buttonSecondary: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  loadingText: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};
