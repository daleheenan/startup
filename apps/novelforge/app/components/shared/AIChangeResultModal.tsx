'use client';

import { useEffect, useRef } from 'react';
import { colors, borderRadius } from '../../lib/constants';

interface AIChangeResultModalProps {
  isOpen: boolean;
  title: string;
  explanation: string;
  changesMade?: string[];
  onClose: () => void;
}

/**
 * Modal to display the results of an AI-powered change.
 * Shows an explanation and optional list of specific changes made.
 */
export default function AIChangeResultModal({
  isOpen,
  title,
  explanation,
  changesMade = [],
  onClose,
}: AIChangeResultModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-change-dialog-title"
      aria-describedby="ai-change-dialog-description"
    >
      <div
        ref={dialogRef}
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: borderRadius.lg,
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          animation: 'dialogSlideIn 0.2s ease-out',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Header with success icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#ECFDF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
          }}>
            ✓
          </div>
          <h3
            id="ai-change-dialog-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: colors.text,
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>

        {/* Explanation */}
        <div
          id="ai-change-dialog-description"
          style={{
            padding: '1rem',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: borderRadius.md,
            marginBottom: changesMade.length > 0 ? '1rem' : '1.5rem',
          }}
        >
          <p style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: '#166534',
            lineHeight: 1.6,
          }}>
            {explanation}
          </p>
        </div>

        {/* Changes list */}
        {changesMade.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: colors.textSecondary,
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.025em',
            }}>
              Changes Made
            </h4>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {changesMade.map((change, index) => (
                <li
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: '#F8FAFC',
                    borderRadius: borderRadius.sm,
                    fontSize: '0.875rem',
                    color: colors.text,
                  }}
                >
                  <span style={{ color: '#10B981', fontWeight: 600 }}>•</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: 'white',
              fontSize: '0.938rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #5a6fd6 0%, #6b4190 100%)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }}
          >
            Got it
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes dialogSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
