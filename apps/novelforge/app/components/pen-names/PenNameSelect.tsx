'use client';

import { usePenNames } from '@/app/hooks/usePenNames';
import { colors, borderRadius, spacing, typography } from '@/app/lib/design-tokens';
import Link from 'next/link';

interface PenNameSelectProps {
  value: string;
  onChange: (penNameId: string) => void;
  className?: string;
}

export default function PenNameSelect({ value, onChange, className }: PenNameSelectProps) {
  const { data: penNames, isLoading, error } = usePenNames();

  if (isLoading) {
    return (
      <select
        disabled
        style={{
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.base,
          color: colors.text.disabled,
          background: colors.background.surface,
        }}
        className={className}
      >
        <option>Loading pen names...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: `${spacing[3]} ${spacing[4]}`,
        border: `1px solid ${colors.semantic.errorBorder}`,
        borderRadius: borderRadius.md,
        background: colors.semantic.errorLight,
        color: colors.semantic.error,
        fontSize: typography.fontSize.sm,
      }}>
        Failed to load pen names
      </div>
    );
  }

  const sortedPenNames = [...(penNames || [])].sort((a, b) => {
    // Default pen name first
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    // Then alphabetically
    return a.pen_name.localeCompare(b.pen_name);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.base,
          color: colors.text.primary,
          background: colors.background.surface,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = colors.border.focus;
          e.target.style.outline = 'none';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = colors.border.default;
        }}
        className={className}
      >
        <option value="">Select a pen name...</option>

        {sortedPenNames.map((penName) => (
          <option key={penName.id} value={penName.id}>
            {penName.pen_name}
            {penName.is_default ? ' (Default)' : ''}
            {penName.display_name ? ` - ${penName.display_name}` : ''}
          </option>
        ))}

        <option value="__create_new__" disabled style={{ borderTop: '1px solid #E2E8F0' }}>
          ──────────────
        </option>
      </select>

      {/* Create new pen name link */}
      <Link
        href="/pen-names/new"
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.brand.primary,
          textDecoration: 'none',
          fontWeight: typography.fontWeight.medium,
        }}
      >
        + Create new pen name
      </Link>
    </div>
  );
}
