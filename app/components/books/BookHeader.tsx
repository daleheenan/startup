'use client';

import Link from 'next/link';
import { type CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';
import StatusBadge from './StatusBadge';

// ==================== TYPES ====================

export interface BookHeaderProps {
  /** Book title */
  title: string;
  /** Series name (if book is part of series) */
  seriesName?: string | null;
  /** Series ID for linking */
  seriesId?: string | null;
  /** Pen name */
  penName?: string | null;
  /** Pen name ID for linking */
  penNameId?: string | null;
  /** Publication status */
  status: string;
  /** Total word count */
  wordCount: number;
  /** Cover image (base64 or URL) */
  coverImage?: string | null;
  /** Cover image MIME type */
  coverImageType?: string | null;
  /** Callback for edit button click */
  onEditClick?: () => void;
}

// ==================== COMPONENT ====================

/**
 * BookHeader displays book information at the top of the detail page.
 *
 * Shows:
 * - Cover image (or placeholder)
 * - Title as h1
 * - Series name with link (if in series)
 * - Pen name with link to portfolio
 * - Status badge
 * - Word count
 * - Edit button
 */
export default function BookHeader({
  title,
  seriesName,
  seriesId,
  penName,
  penNameId,
  status,
  wordCount,
  coverImage,
  coverImageType,
  onEditClick,
}: BookHeaderProps) {
  // Build image source
  const imageSource = coverImage
    ? coverImage.startsWith('data:')
      ? coverImage
      : `data:${coverImageType || 'image/jpeg'};base64,${coverImage}`
    : null;

  const formatWordCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K words`;
    }
    return `${count.toLocaleString()} words`;
  };

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[6],
    padding: spacing[6],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  };

  const coverContainerStyle: CSSProperties = {
    flexShrink: 0,
    width: '180px',
    aspectRatio: '2/3',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    background: colors.background.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${colors.border.default}`,
  };

  const coverImageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const placeholderStyle: CSSProperties = {
    fontSize: '4rem',
    color: colors.text.tertiary,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
  };

  const titleStyle: CSSProperties = {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[3],
  };

  const linkStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.brand.primary,
    textDecoration: 'none',
    fontWeight: typography.fontWeight.medium,
  };

  const textStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  };

  const separatorStyle: CSSProperties = {
    color: colors.text.tertiary,
  };

  const wordCountStyle: CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  };

  const editButtonStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.brand.gradient,
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: shadows.brand,
    alignSelf: 'flex-start',
  };

  // ---- Render ----

  return (
    <div style={containerStyle}>
      {/* Cover Image */}
      <div style={coverContainerStyle}>
        {imageSource ? (
          <img src={imageSource} alt={`${title} cover`} style={coverImageStyle} />
        ) : (
          <div style={placeholderStyle} aria-hidden="true">
            📚
          </div>
        )}
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Title */}
        <h1 style={titleStyle}>{title}</h1>

        {/* Metadata Row */}
        <div style={metaRowStyle}>
          {/* Series */}
          {seriesName && seriesId && (
            <>
              <Link
                href={`/series/${seriesId}`}
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {seriesName}
              </Link>
              <span style={separatorStyle}>•</span>
            </>
          )}

          {/* Pen Name */}
          {penName && penNameId && (
            <>
              <Link
                href={`/pen-names/${penNameId}`}
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {penName}
              </Link>
              <span style={separatorStyle}>•</span>
            </>
          )}

          {/* Status Badge */}
          <StatusBadge status={status} />
        </div>

        {/* Word Count */}
        <div style={wordCountStyle}>{formatWordCount(wordCount)}</div>

        {/* Edit Button */}
        {onEditClick && (
          <button
            onClick={onEditClick}
            style={editButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = shadows.brandHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = shadows.brand;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Edit Cover & Metadata
          </button>
        )}
      </div>
    </div>
  );
}
