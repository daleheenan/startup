'use client';

import { colors, typography, spacing, transitions } from '@/app/lib/design-tokens';

export type SortColumn = 'name' | 'updated_at' | 'chapterCost' | 'totalCost' | 'type' | 'words' | 'chapters' | 'versions';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  label: string;
  column: SortColumn;
  currentSort: SortConfig;
  onSort: (column: SortColumn) => void;
}

export default function SortableTableHeader({
  label,
  column,
  currentSort,
  onSort,
}: SortableTableHeaderProps) {
  const isActive = currentSort.column === column;
  const ariaSort = isActive
    ? currentSort.direction === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  const handleClick = () => {
    onSort(column);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(column);
    }
  };

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      style={{
        padding: `${spacing[2]} ${spacing[3]}`,
        textAlign: 'left',
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.xs,
        color: isActive ? colors.brand.primary : colors.text.secondary,
        background: colors.background.secondary,
        borderBottom: `2px solid ${colors.border.default}`,
        cursor: 'pointer',
        userSelect: 'none',
        transition: transitions.colors,
        whiteSpace: 'nowrap',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
        {label}
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            fontSize: '0.5rem',
            lineHeight: 1,
            opacity: isActive ? 1 : 0.3,
          }}
        >
          <span style={{ color: isActive && currentSort.direction === 'asc' ? colors.brand.primary : colors.text.disabled }}>
            ▲
          </span>
          <span style={{ color: isActive && currentSort.direction === 'desc' ? colors.brand.primary : colors.text.disabled }}>
            ▼
          </span>
        </span>
      </span>
    </th>
  );
}
