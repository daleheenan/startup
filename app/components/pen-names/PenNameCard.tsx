'use client';

import Link from 'next/link';
import { colors, borderRadius, spacing, typography, shadows } from '@/app/lib/design-tokens';
import type { PenName } from '@/app/hooks/usePenNames';

interface PenNameCardProps {
  penName: PenName;
}

export default function PenNameCard({ penName }: PenNameCardProps) {
  return (
    <div
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        boxShadow: shadows.sm,
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.md;
        e.currentTarget.style.borderColor = colors.border.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadows.sm;
        e.currentTarget.style.borderColor = colors.border.default;
      }}
    >
      {/* Default Badge */}
      {penName.is_default && (
        <div
          style={{
            position: 'absolute',
            top: spacing[4],
            right: spacing[4],
            padding: `${spacing[1]} ${spacing[3]}`,
            background: colors.brand.gradient,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.inverse,
          }}
        >
          Default
        </div>
      )}

      {/* Photo and Name Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
        {/* Photo or Placeholder */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: borderRadius.full,
            background: penName.photo_url
              ? `url(${penName.photo_url}) center/cover`
              : colors.brand.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.inverse,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            flexShrink: 0,
          }}
        >
          {!penName.photo_url && penName.pen_name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              margin: 0,
              marginBottom: spacing[1],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {penName.pen_name}
          </h3>
          {penName.display_name && (
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {penName.display_name}
            </p>
          )}
        </div>
      </div>

      {/* Genres */}
      {penName.genres && penName.genres.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
          {penName.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              style={{
                padding: `${spacing[1]} ${spacing[3]}`,
                background: colors.background.surfaceHover,
                borderRadius: borderRadius.full,
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              {genre}
            </span>
          ))}
          {penName.genres.length > 3 && (
            <span
              style={{
                padding: `${spacing[1]} ${spacing[3]}`,
                background: colors.background.surfaceHover,
                borderRadius: borderRadius.full,
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
              }}
            >
              +{penName.genres.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        <span>{penName.book_count} {penName.book_count === 1 ? 'book' : 'books'}</span>
        <span style={{ color: colors.text.tertiary }}>•</span>
        <span>{penName.word_count.toLocaleString()} words</span>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: spacing[3],
          marginTop: 'auto',
          paddingTop: spacing[2],
        }}
      >
        <Link
          href={`/pen-names/${penName.id}`}
          style={{
            flex: 1,
            padding: `${spacing[2]} ${spacing[4]}`,
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.background.surfaceHover;
            e.currentTarget.style.borderColor = colors.border.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.background.surface;
            e.currentTarget.style.borderColor = colors.border.default;
          }}
        >
          View
        </Link>
        <Link
          href={`/pen-names/${penName.id}/edit`}
          style={{
            flex: 1,
            padding: `${spacing[2]} ${spacing[4]}`,
            background: colors.brand.gradient,
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.text.inverse,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all 0.2s',
            boxShadow: shadows.sm,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = shadows.brand;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
