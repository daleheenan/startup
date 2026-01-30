'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import { PUBLICATION_STATUSES } from '@/app/lib/book-data';

// ==================== TYPES ====================

export interface BookFilters {
  penName?: string;
  statuses: string[];
  genre?: string;
  search?: string;
}

export interface BooksFiltersProps {
  filters: BookFilters;
  onChange: (filters: BookFilters) => void;
  /** Available pen names for dropdown */
  penNames: string[];
  /** Available genres for dropdown */
  genres: string[];
}

// ==================== COMPONENT ====================

/**
 * BooksFilters provides a filter bar for the books dashboard.
 *
 * Features:
 * - Pen name dropdown
 * - Status multi-select dropdown
 * - Genre dropdown
 * - Search input with debounce
 * - Clear filters button
 */
export default function BooksFilters({
  filters,
  onChange,
  penNames,
  genres,
}: BooksFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounce search input (500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange({ ...filters, search: searchValue });
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: newStatuses });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onChange({
      penName: undefined,
      statuses: [],
      genre: undefined,
      search: undefined,
    });
  };

  const hasActiveFilters =
    filters.penName || filters.statuses.length > 0 || filters.genre || filters.search;

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
    alignItems: 'center',
  };

  const selectStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[3]}`,
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.base,
    cursor: 'pointer',
    transition: transitions.colors,
    minWidth: '140px',
  };

  const inputStyle: CSSProperties = {
    ...selectStyle,
    minWidth: '200px',
    flex: 1,
  };

  const buttonStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: transitions.all,
  };

  const statusDropdownContainerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const dropdownStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: spacing[1],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    minWidth: '180px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
  };

  const checkboxLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[2],
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    borderRadius: borderRadius.sm,
  };

  return (
    <div style={containerStyle}>
      {/* Pen Name Dropdown */}
      <select
        value={filters.penName || ''}
        onChange={(e) =>
          onChange({ ...filters, penName: e.target.value || undefined })
        }
        style={selectStyle}
        aria-label="Filter by pen name"
      >
        <option value="">All Pen Names</option>
        {penNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {/* Status Multi-Select Dropdown */}
      <div style={statusDropdownContainerStyle}>
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          style={selectStyle}
          type="button"
          aria-label="Filter by status"
          aria-expanded={statusDropdownOpen}
        >
          {filters.statuses.length === 0
            ? 'All Statuses'
            : `${filters.statuses.length} Selected`}
        </button>
        {statusDropdownOpen && (
          <div style={dropdownStyle}>
            {PUBLICATION_STATUSES.map((status) => (
              <label
                key={status.value}
                style={checkboxLabelStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(status.value)}
                  onChange={() => handleStatusToggle(status.value)}
                  style={{ cursor: 'pointer' }}
                />
                {status.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Genre Dropdown */}
      <select
        value={filters.genre || ''}
        onChange={(e) =>
          onChange({ ...filters, genre: e.target.value || undefined })
        }
        style={selectStyle}
        aria-label="Filter by genre"
      >
        <option value="">All Genres</option>
        {genres.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </select>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search books..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={inputStyle}
        aria-label="Search books"
      />

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          style={buttonStyle}
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.semantic.errorLight;
            e.currentTarget.style.borderColor = colors.semantic.errorBorder;
            e.currentTarget.style.color = colors.semantic.error;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.background.secondary;
            e.currentTarget.style.borderColor = colors.border.default;
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
