'use client';

import { useState, useRef, useEffect } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions, zIndex } from '@/app/lib/design-tokens';

interface ExportDropdownProps {
  projectId: string;
  isPdfExporting: boolean;
  isDocxExporting: boolean;
  onExportPdf: (projectId: string, e: React.MouseEvent) => void;
  onExportDocx: (projectId: string, e: React.MouseEvent) => void;
}

const iconButtonStyle: React.CSSProperties = {
  padding: spacing[1],
  background: 'transparent',
  border: 'none',
  borderRadius: borderRadius.sm,
  fontSize: typography.fontSize.base,
  color: colors.text.tertiary,
  cursor: 'pointer',
  transition: transitions.all,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
};

export default function ExportDropdown({
  projectId,
  isPdfExporting,
  isDocxExporting,
  onExportPdf,
  onExportDocx,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Export options"
        aria-expanded={isOpen}
        style={{
          ...iconButtonStyle,
          color: isOpen ? colors.brand.primary : colors.text.tertiary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.background.secondary;
          e.currentTarget.style.color = colors.brand.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = isOpen ? colors.brand.primary : colors.text.tertiary;
        }}
        title="Export"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: spacing[1],
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            boxShadow: shadows.lg,
            zIndex: zIndex.dropdown,
            minWidth: '100px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={(e) => {
              onExportPdf(projectId, e);
              setIsOpen(false);
            }}
            disabled={isPdfExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              width: '100%',
              padding: `${spacing[2]} ${spacing[3]}`,
              background: 'transparent',
              border: 'none',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              cursor: isPdfExporting ? 'not-allowed' : 'pointer',
              opacity: isPdfExporting ? 0.6 : 1,
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isPdfExporting) {
                e.currentTarget.style.background = colors.background.secondary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {isPdfExporting ? 'Exporting...' : 'PDF'}
          </button>
          <button
            onClick={(e) => {
              onExportDocx(projectId, e);
              setIsOpen(false);
            }}
            disabled={isDocxExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              width: '100%',
              padding: `${spacing[2]} ${spacing[3]}`,
              background: 'transparent',
              border: 'none',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              cursor: isDocxExporting ? 'not-allowed' : 'pointer',
              opacity: isDocxExporting ? 0.6 : 1,
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isDocxExporting) {
                e.currentTarget.style.background = colors.background.secondary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {isDocxExporting ? 'Exporting...' : 'DOCX'}
          </button>
        </div>
      )}
    </div>
  );
}
