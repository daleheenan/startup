'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

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

  const confirmBackground = confirmStyle === 'danger'
    ? '#EF4444'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const confirmHoverBackground = confirmStyle === 'danger'
    ? '#DC2626'
    : 'linear-gradient(135deg, #5a6fd6 0%, #6b4190 100%)';

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
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          animation: 'dialogSlideIn 0.2s ease-out',
        }}
      >
        <h3
          id="confirm-dialog-title"
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1A1A2E',
            marginBottom: '0.75rem',
          }}
        >
          {title}
        </h3>
        <p
          id="confirm-dialog-message"
          style={{
            fontSize: '0.938rem',
            color: '#64748B',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.25rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              fontSize: '0.938rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            style={{
              padding: '0.75rem 1.25rem',
              background: confirmBackground,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.938rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: confirmStyle === 'danger'
                ? '0 4px 14px rgba(239, 68, 68, 0.3)'
                : '0 4px 14px rgba(102, 126, 234, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = confirmHoverBackground;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = confirmBackground;
            }}
          >
            {confirmText}
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
