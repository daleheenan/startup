'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface KeywordsEditorProps {
  /** Current keywords array */
  keywords: string[];
  /** Callback when keywords change */
  onChange: (keywords: string[]) => void;
  /** Maximum number of keywords allowed */
  maxKeywords?: number;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// ==================== COMPONENT ====================

/**
 * KeywordsEditor provides a tag-style input for managing book keywords.
 *
 * Features:
 * - Text input with Enter to add keyword
 * - Keywords shown as tags with X button to remove
 * - Maximum keyword limit (default 7)
 * - Validation for duplicates and empty keywords
 * - Visual feedback for errors
 */
export default function KeywordsEditor({
  keywords,
  onChange,
  maxKeywords = 7,
  disabled = false,
}: KeywordsEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddKeyword = () => {
    const trimmed = inputValue.trim();

    // Validation
    if (!trimmed) {
      setError('Keyword cannot be empty');
      return;
    }

    if (keywords.length >= maxKeywords) {
      setError(`Maximum ${maxKeywords} keywords allowed`);
      return;
    }

    if (keywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      setError('This keyword already exists');
      return;
    }

    // Add keyword
    onChange([...keywords, trimmed]);
    setInputValue('');
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      // Remove last keyword on backspace if input is empty
      onChange(keywords.slice(0, -1));
    }
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    onChange(keywords.filter((_, index) => index !== indexToRemove));
    setError(null);
  };

  // Clear error when user starts typing
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (error) setError(null);
  };

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  const tagsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    minHeight: spacing[10],
    padding: spacing[3],
    background: colors.background.secondary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
  };

  const tagStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    background: colors.brand.primaryLight,
    border: `1px solid ${colors.brand.primary}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.sm,
    color: colors.brand.primary,
    fontWeight: typography.fontWeight.medium,
  };

  const removeButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: colors.brand.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 1,
    transition: transitions.colors,
  };

  const inputStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[4]}`,
    border: `1px solid ${error ? colors.semantic.error : colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.base,
    color: colors.text.primary,
    transition: transitions.colors,
    outline: 'none',
  };

  const helpTextStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: error ? colors.semantic.error : colors.text.tertiary,
    marginTop: spacing[1],
  };

  // ---- Render ----

  return (
    <div style={containerStyle}>
      {/* Tags Display */}
      <div style={tagsContainerStyle}>
        {keywords.length === 0 ? (
          <span
            style={{
              color: colors.text.tertiary,
              fontSize: typography.fontSize.sm,
              fontStyle: 'italic',
            }}
          >
            No keywords yet. Add keywords below.
          </span>
        ) : (
          keywords.map((keyword, index) => (
            <div key={index} style={tagStyle}>
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(index)}
                disabled={disabled}
                style={removeButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.semantic.error;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.brand.primary;
                }}
                aria-label={`Remove ${keyword}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Input Field */}
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || keywords.length >= maxKeywords}
          placeholder={
            keywords.length >= maxKeywords
              ? `Maximum ${maxKeywords} keywords reached`
              : 'Type a keyword and press Enter'
          }
          style={{
            ...inputStyle,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          onFocus={(e) => {
            if (!error && !disabled) {
              e.currentTarget.style.borderColor = colors.border.focus;
            }
          }}
          onBlur={(e) => {
            handleAddKeyword();
            if (!error) {
              e.currentTarget.style.borderColor = colors.border.default;
            }
          }}
        />
        <p style={helpTextStyle}>
          {error || `${keywords.length}/${maxKeywords} keywords used. Press Enter to add.`}
        </p>
      </div>
    </div>
  );
}
