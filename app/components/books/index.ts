/**
 * Barrel export for books components
 * Provides clean imports for the Books Dashboard
 */

export { default as StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { default as BooksDashboardStats } from './BooksDashboardStats';
export type { BookStats, BooksDashboardStatsProps } from './BooksDashboardStats';

export { default as BooksFilters } from './BooksFilters';
export type { BookFilters, BooksFiltersProps } from './BooksFilters';

export { default as BooksTable } from './BooksTable';
export type {
  SortColumn,
  SortDirection,
  BookTableRow,
  BooksTableProps,
} from './BooksTable';
