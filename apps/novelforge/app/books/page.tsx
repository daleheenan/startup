'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import BooksDashboardStats from '@/app/components/books/BooksDashboardStats';
import BooksFilters, { type BookFilters } from '@/app/components/books/BooksFilters';
import BooksTable, { type SortColumn, type SortDirection } from '@/app/components/books/BooksTable';
import { useBooksData } from '@/app/hooks/useBooksData';
import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';

// ==================== PAGE COMPONENT ====================

/**
 * Books Dashboard Page
 *
 * Shows ALL books across all projects with:
 * - Aggregate stats at top
 * - Filters bar (pen name, status, genre, search)
 * - Sortable books table
 * - Pagination controls
 */
export default function BooksPage() {
  const [filters, setFilters] = useState<BookFilters>({
    penName: undefined,
    statuses: [],
    genre: undefined,
    search: undefined,
  });
  const [page, setPage] = useState(1);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const pageSize = 20;

  const { books, stats, isLoading, error, refetch, pagination } = useBooksData({
    filters,
    page,
    pageSize,
  });

  // Sort books locally (could be moved to backend later)
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortColumn) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'penName':
          aValue = (a.penName || '').toLowerCase();
          bValue = (b.penName || '').toLowerCase();
          break;
        case 'series':
          aValue = (a.series || '').toLowerCase();
          bValue = (b.series || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'words':
          aValue = a.words;
          bValue = b.words;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleSelectBook = (bookId: string, selected: boolean) => {
    setSelectedBooks((prev) =>
      selected ? [...prev, bookId] : prev.filter((id) => id !== bookId)
    );
  };

  // Extract unique pen names and genres from books for filter dropdowns
  const penNames = useMemo(() => {
    const unique = new Set(books.map((b) => b.penName).filter(Boolean) as string[]);
    return Array.from(unique).sort();
  }, [books]);

  const genres = useMemo(() => {
    const unique = new Set<string>();
    // In a real implementation, this would come from project.genre
    // For now, we'll return an empty array since we don't have genre on BookTableRow
    return Array.from(unique).sort();
  }, [books]);

  // ---- Loading State ----

  if (isLoading && books.length === 0) {
    return (
      <DashboardLayout
        header={{
          title: 'Books',
          subtitle: 'Manage and track all your books across all projects',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: '48px',
                height: '48px',
                border: `3px solid ${colors.border.default}`,
                borderTopColor: colors.brand.primary,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p
              style={{
                marginTop: spacing[4],
                color: colors.text.tertiary,
                fontSize: typography.fontSize.sm,
              }}
            >
              Loading books...
            </p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </DashboardLayout>
    );
  }

  // ---- Styles ----

  const paginationContainerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[6],
    padding: `${spacing[4]} 0`,
  };

  const paginationButtonStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    cursor: 'pointer',
  };

  const paginationInfoStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  // ---- Main Render ----

  return (
    <DashboardLayout
      header={{
        title: 'Books',
        subtitle: 'Manage and track all your books across all projects',
      }}
    >
      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: `${spacing[4]} ${spacing[6]}`,
            marginBottom: spacing[6],
            color: colors.semantic.error,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <BooksDashboardStats stats={stats} />

      {/* Filters Bar */}
      <BooksFilters
        filters={filters}
        onChange={setFilters}
        penNames={penNames}
        genres={genres}
      />

      {/* Books Table */}
      <BooksTable
        books={sortedBooks}
        onSort={handleSort}
        selectedBooks={selectedBooks}
        onSelectBook={handleSelectBook}
      />

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={paginationContainerStyle}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              ...paginationButtonStyle,
              opacity: page === 1 ? 0.5 : 1,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          <div style={paginationInfoStyle}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
            total)
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            style={{
              ...paginationButtonStyle,
              opacity: page === pagination.totalPages ? 0.5 : 1,
              cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
