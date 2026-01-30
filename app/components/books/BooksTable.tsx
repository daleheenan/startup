'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import StatusBadge from './StatusBadge';

// ==================== TYPES ====================

export type SortColumn = 'title' | 'penName' | 'series' | 'status' | 'words';
export type SortDirection = 'asc' | 'desc';

export interface BookTableRow {
  id: string;
  title: string;
  penName?: string;
  series?: string;
  status: string;
  words: number;
  projectId: string;
}

export interface BooksTableProps {
  books: BookTableRow[];
  onSort?: (column: SortColumn, direction: SortDirection) => void;
  selectedBooks?: string[];
  onSelectBook?: (bookId: string, selected: boolean) => void;
}

// ==================== COMPONENT ====================

/**
 * BooksTable displays a sortable data table of books.
 *
 * Features:
 * - Sortable columns (click header to sort)
 * - Row checkboxes for bulk actions
 * - Click row to navigate to book
 * - Status badges with colour coding
 * - Empty state message
 */
export default function BooksTable({
  books,
  onSort,
  selectedBooks = [],
  onSelectBook,
}: BooksTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleHeaderClick = (column: SortColumn) => {
    const newDirection =
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

  const formatWords = (words: number | undefined | null): string => {
    if (words == null) {
      return '0';
    }
    if (words >= 1000) {
      return `${Math.floor(words / 1000)}K`;
    }
    return words.toLocaleString();
  };

  // ---- Styles ----

  const tableContainerStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  };

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const thStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'left',
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    background: colors.background.secondary,
    borderBottom: `2px solid ${colors.border.default}`,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const tdStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    borderBottom: `1px solid ${colors.border.default}`,
  };

  const emptyStateStyle: CSSProperties = {
    textAlign: 'center',
    padding: `${spacing[12]} ${spacing[8]}`,
    color: colors.text.tertiary,
  };

  // ---- Empty State ----

  if (books.length === 0) {
    return (
      <div style={tableContainerStyle}>
        <div style={emptyStateStyle}>
          <div
            style={{
              fontSize: '3rem',
              marginBottom: spacing[4],
            }}
            aria-hidden="true"
          >
            📚
          </div>
          <p
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}
          >
            No books found
          </p>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            Try adjusting your filters or create a new project
          </p>
        </div>
      </div>
    );
  }

  // ---- Table Render ----

  return (
    <div style={tableContainerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {/* Checkbox column */}
            <th
              style={{
                ...thStyle,
                width: '40px',
                cursor: 'default',
              }}
            >
              <input
                type="checkbox"
                checked={selectedBooks.length === books.length && books.length > 0}
                onChange={(e) => {
                  if (onSelectBook) {
                    books.forEach((book) => onSelectBook(book.id, e.target.checked));
                  }
                }}
                aria-label="Select all books"
                style={{ cursor: 'pointer' }}
              />
            </th>

            {/* Title */}
            <th
              style={thStyle}
              onClick={() => handleHeaderClick('title')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.background.secondary;
              }}
            >
              Title{' '}
              {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>

            {/* Pen Name */}
            <th
              style={thStyle}
              onClick={() => handleHeaderClick('penName')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.background.secondary;
              }}
            >
              Pen Name{' '}
              {sortColumn === 'penName' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>

            {/* Series */}
            <th
              style={thStyle}
              onClick={() => handleHeaderClick('series')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.background.secondary;
              }}
            >
              Series{' '}
              {sortColumn === 'series' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>

            {/* Status */}
            <th
              style={thStyle}
              onClick={() => handleHeaderClick('status')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.background.secondary;
              }}
            >
              Status{' '}
              {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>

            {/* Words */}
            <th
              style={thStyle}
              onClick={() => handleHeaderClick('words')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.background.secondary;
              }}
            >
              Words{' '}
              {sortColumn === 'words' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>

            {/* Actions */}
            <th
              style={{
                ...thStyle,
                cursor: 'default',
                textAlign: 'right',
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr
              key={book.id}
              style={{
                transition: transitions.colors,
                cursor: 'pointer',
              }}
              onClick={() => {
                window.location.href = `/books/${book.id}`;
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Checkbox */}
              <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedBooks.includes(book.id)}
                  onChange={(e) => {
                    onSelectBook?.(book.id, e.target.checked);
                  }}
                  aria-label={`Select ${book.title}`}
                  style={{ cursor: 'pointer' }}
                />
              </td>

              {/* Title */}
              <td style={tdStyle}>
                <Link
                  href={`/books/${book.id}`}
                  style={{
                    color: colors.text.primary,
                    textDecoration: 'none',
                    fontWeight: typography.fontWeight.medium,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.brand.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.text.primary;
                  }}
                >
                  {book.title}
                </Link>
              </td>

              {/* Pen Name */}
              <td style={tdStyle}>{book.penName || '—'}</td>

              {/* Series */}
              <td style={tdStyle}>{book.series || '—'}</td>

              {/* Status */}
              <td style={tdStyle}>
                <StatusBadge status={book.status} size="sm" />
              </td>

              {/* Words */}
              <td style={tdStyle}>{formatWords(book.words)}</td>

              {/* Actions */}
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <Link
                  href={`/books/${book.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    textDecoration: 'none',
                    display: 'inline-block',
                    transition: transitions.all,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.brand.primaryLight;
                    e.currentTarget.style.borderColor = colors.brand.primary;
                    e.currentTarget.style.color = colors.brand.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.background.secondary;
                    e.currentTarget.style.borderColor = colors.border.default;
                    e.currentTarget.style.color = colors.text.secondary;
                  }}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
