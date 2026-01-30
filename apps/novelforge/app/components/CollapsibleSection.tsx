'use client';

import { useState, useEffect } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  optional?: boolean;
  count?: number;
  children: React.ReactNode;
  sectionId: string; // For localStorage persistence
  background?: string;
  borderColor?: string;
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  optional = false,
  count,
  children,
  sectionId,
  background = '#F8FAFC',
  borderColor = '#E2E8F0',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`collapsible-${sectionId}`);
    if (saved !== null) {
      setIsOpen(saved === 'true');
    }
  }, [sectionId]);

  // Save state to localStorage when it changes
  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(`collapsible-${sectionId}`, String(newState));
  };

  // Handle keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOpen();
    }
  };

  return (
    <div
      style={{
        padding: '1rem',
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isOpen ? '0.75rem' : 0,
        }}
        aria-expanded={isOpen}
        aria-controls={`section-${sectionId}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          {/* Chevron icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Title and description */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                {title}
              </span>
              {optional && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#64748B',
                    background: '#F1F5F9',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  Optional
                </span>
              )}
              {count !== undefined && count > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: '#667eea',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
            {description && (
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse text hint */}
        <span
          style={{
            fontSize: '0.75rem',
            color: '#94A3B8',
            marginLeft: '1rem',
          }}
        >
          {isOpen ? 'Collapse' : 'Expand'}
        </span>
      </div>

      {/* Content */}
      {isOpen && (
        <div
          id={`section-${sectionId}`}
          style={{
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          {children}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
