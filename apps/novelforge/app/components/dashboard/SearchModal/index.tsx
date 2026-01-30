'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from '@/app/components/ui/FocusTrap';
import { useKeyboardShortcut } from '@/app/hooks/useKeyboardShortcut';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
  zIndex,
  a11y,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==================== CSS KEYFRAMES ====================

/**
 * Injects the fade-in and slide-up keyframes into <head> once.
 * Guarded by a unique ID to prevent duplicate injection and by a
 * typeof check for SSR safety.
 */
(function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('search-modal-keyframes')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'search-modal-keyframes';
  styleEl.textContent = `
    @keyframes searchModalBackdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes searchModalCardIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(styleEl);
})();

// ==================== COMPONENT ====================

/**
 * SearchModal
 *
 * A keyboard-accessible command-palette-style modal that renders via a
 * portal to document.body so it stacks above all other content.
 *
 * Features:
 * - Dark semi-transparent backdrop with fade-in animation
 * - Centred modal card that slides up and fades in
 * - Search input auto-focused on open via FocusTrap
 * - Escape closes the modal (via useKeyboardShortcut)
 * - Click outside the card closes the modal
 * - Keyboard navigation hints displayed at the bottom
 * - Focus trapped within the modal while open
 *
 * @param isOpen  - Controls modal visibility
 * @param onClose - Callback fired when the modal should close
 */
export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // ---- Escape key closes the modal ----
  useKeyboardShortcut(
    { key: 'Escape', preventDefault: true },
    onClose,
    isOpen,
  );

  // ---- Reset query when modal opens; focus the input ----
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // FocusTrap handles initial focus, but we explicitly target
      // the input in case it is not the first focusable element.
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // ---- Click-outside handler ----
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close when the click target is the backdrop itself,
      // not a child element inside the card.
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // ---- Portal mount guard (SSR safety) ----
  if (typeof document === 'undefined') return null;
  if (!isOpen) return null;

  // ==================== STYLES ====================

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: colors.background.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    animation: `searchModalBackdropIn ${a11y.animationDuration.medium} ease forwards`,
    // Ensure the backdrop fills the viewport and captures clicks
    padding: spacing[4],
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '70vh',
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.xl,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: `searchModalCardIn ${a11y.animationDuration.medium} ease forwards`,
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[4]} ${spacing[5]}`,
    borderBottom: `1px solid ${colors.border.default}`,
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '1.5rem',
    height: '1.5rem',
    color: colors.text.tertiary,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.base,
    color: colors.text.primary,
    caretColor: colors.brand.primary,
    minWidth: 0,
  };

  const resultsStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: spacing[4],
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const placeholderStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
  };

  const hintsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    padding: `${spacing[3]} ${spacing[5]}`,
    borderTop: `1px solid ${colors.border.default}`,
    backgroundColor: colors.background.primary,
  };

  const hintItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    transition: transitions.colors,
  };

  const kbdStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.375rem',
    height: '1.375rem',
    padding: `0 ${spacing[1]}`,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    backgroundColor: colors.background.surfaceHover,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.sm,
    boxSizing: 'border-box',
  };

  // ==================== RENDER ====================

  const modal = (
    <div
      style={backdropStyle}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <FocusTrap active={true} initialFocus={true} returnFocus={true}>
        <div style={cardStyle} ref={cardRef}>
          {/* Search input row */}
          <div style={inputWrapperStyle}>
            <span style={iconStyle} aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="9" r="5.5" />
                <line x1="13.5" y1="13.5" x2="18" y2="18" />
              </svg>
            </span>

            <input
              ref={inputRef}
              type="text"
              style={inputStyle}
              placeholder="Search projects, characters, chapters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-autocomplete="list"
              aria-controls="search-modal-results"
              spellCheck={false}
            />
          </div>

          {/* Results area */}
          <div
            id="search-modal-results"
            style={resultsStyle}
            role="listbox"
            aria-label="Search results"
          >
            <span style={placeholderStyle}>
              {query.length === 0
                ? 'Start typing to search...'
                : 'No results found.'}
            </span>
          </div>

          {/* Keyboard hints footer */}
          <div style={hintsStyle} aria-hidden="true">
            <span style={hintItemStyle}>
              <kbd style={kbdStyle}>↑</kbd>
              <kbd style={kbdStyle}>↓</kbd>
              <span>Navigate</span>
            </span>
            <span style={hintItemStyle}>
              <kbd style={kbdStyle}>Enter</kbd>
              <span>Select</span>
            </span>
            <span style={hintItemStyle}>
              <kbd style={kbdStyle}>Esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </div>
      </FocusTrap>
    </div>
  );

  return createPortal(modal, document.body);
}
