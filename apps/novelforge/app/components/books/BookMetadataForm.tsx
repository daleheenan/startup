'use client';

import { type CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import { PUBLICATION_STATUSES } from '@/app/lib/book-data';
import KeywordsEditor from './KeywordsEditor';
import PlatformsChecklist, { type PlatformEntry } from './PlatformsChecklist';

// ==================== TYPES ====================

export interface BookMetadata {
  isbn?: string | null;
  publicationDate?: string | null;
  publicationStatus: string;
  blurb?: string | null;
  keywords?: string[] | null;
  platforms?: PlatformEntry[];
}

export interface BookMetadataFormProps {
  /** Current metadata values */
  metadata: BookMetadata;
  /** Callback when any field changes */
  onChange: (updates: Partial<BookMetadata>) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
}

// ==================== COMPONENT ====================

/**
 * BookMetadataForm provides editing for book publishing metadata.
 *
 * Fields:
 * - ISBN (text input with format hint)
 * - Publication Date (date picker)
 * - Publication Status (dropdown)
 * - Blurb (textarea, 500 char limit)
 * - Keywords (KeywordsEditor component)
 * - Platforms (PlatformsChecklist component)
 */
export default function BookMetadataForm({
  metadata,
  onChange,
  disabled = false,
}: BookMetadataFormProps) {
  const handleFieldChange = (field: keyof BookMetadata, value: any) => {
    onChange({ [field]: value });
  };

  const blurbLength = metadata.blurb?.length || 0;
  const blurbMaxLength = 500;

  // ---- Styles ----

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[6],
  };

  const fieldGroupStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  const labelStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  };

  const inputStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[4]}`,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.base,
    color: colors.text.primary,
    transition: transitions.colors,
    outline: 'none',
  };

  const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: typography.fontFamily.base,
  };

  const helpTextStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  const charCountStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: blurbLength > blurbMaxLength ? colors.semantic.error : colors.text.tertiary,
    textAlign: 'right',
  };

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing[4],
  };

  // ---- Render ----

  return (
    <form style={formStyle} onSubmit={(e) => e.preventDefault()}>
      {/* ISBN and Publication Date Row */}
      <div style={rowStyle}>
        {/* ISBN */}
        <div style={fieldGroupStyle}>
          <label htmlFor="isbn" style={labelStyle}>
            ISBN
          </label>
          <input
            id="isbn"
            type="text"
            value={metadata.isbn || ''}
            onChange={(e) => handleFieldChange('isbn', e.target.value)}
            disabled={disabled}
            placeholder="978-3-16-148410-0"
            style={{
              ...inputStyle,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.borderColor = colors.border.focus;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border.default;
            }}
          />
          <p style={helpTextStyle}>Format: 978-X-XX-XXXXXX-X</p>
        </div>

        {/* Publication Date */}
        <div style={fieldGroupStyle}>
          <label htmlFor="publicationDate" style={labelStyle}>
            Publication Date
          </label>
          <input
            id="publicationDate"
            type="date"
            value={metadata.publicationDate || ''}
            onChange={(e) => handleFieldChange('publicationDate', e.target.value)}
            disabled={disabled}
            style={{
              ...inputStyle,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.borderColor = colors.border.focus;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border.default;
            }}
          />
          <p style={helpTextStyle}>Actual or planned publication date</p>
        </div>
      </div>

      {/* Publication Status */}
      <div style={fieldGroupStyle}>
        <label htmlFor="publicationStatus" style={labelStyle}>
          Publication Status
        </label>
        <select
          id="publicationStatus"
          value={metadata.publicationStatus}
          onChange={(e) => handleFieldChange('publicationStatus', e.target.value)}
          disabled={disabled}
          style={{
            ...inputStyle,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = colors.border.focus;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border.default;
          }}
        >
          {PUBLICATION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <p style={helpTextStyle}>Current stage in your publishing workflow</p>
      </div>

      {/* Blurb */}
      <div style={fieldGroupStyle}>
        <label htmlFor="blurb" style={labelStyle}>
          Blurb
        </label>
        <textarea
          id="blurb"
          value={metadata.blurb || ''}
          onChange={(e) => handleFieldChange('blurb', e.target.value)}
          disabled={disabled}
          placeholder="A compelling description of your book that will entice readers..."
          maxLength={blurbMaxLength}
          style={{
            ...textareaStyle,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = colors.border.focus;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border.default;
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={helpTextStyle}>Back cover or product page description</p>
          <p style={charCountStyle}>
            {blurbLength}/{blurbMaxLength}
          </p>
        </div>
      </div>

      {/* Keywords */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Keywords</label>
        <KeywordsEditor
          keywords={metadata.keywords || []}
          onChange={(keywords) => handleFieldChange('keywords', keywords)}
          disabled={disabled}
          maxKeywords={7}
        />
        <p style={helpTextStyle}>
          Search keywords for discoverability (Amazon KDP, etc.)
        </p>
      </div>

      {/* Platforms */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Publishing Platforms</label>
        <PlatformsChecklist
          platforms={metadata.platforms || []}
          onChange={(platforms) => handleFieldChange('platforms', platforms)}
          disabled={disabled}
        />
        <p style={helpTextStyle}>
          Select platforms where your book is or will be published
        </p>
      </div>
    </form>
  );
}
