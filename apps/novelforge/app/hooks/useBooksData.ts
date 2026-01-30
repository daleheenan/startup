/**
 * useBooksData hook
 * Fetches and manages books data from the backend with filtering support
 */

import { useState, useEffect } from 'react';
import { getToken } from '@/app/lib/auth';
import type { BookFilters } from '@/app/components/books/BooksFilters';
import type { BookStats } from '@/app/components/books/BooksDashboardStats';
import type { BookTableRow } from '@/app/components/books/BooksTable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

export interface BooksDataResult {
  books: BookTableRow[];
  stats: BookStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UseBooksDataParams {
  filters: BookFilters;
  page?: number;
  pageSize?: number;
}

// ==================== HOOK ====================

/**
 * Custom hook to fetch books data with filtering and pagination.
 *
 * @param params - Filters, page, and pageSize
 * @returns Books data, stats, loading state, error, refetch function, and pagination info
 *
 * @example
 * ```tsx
 * const { books, stats, isLoading } = useBooksData({
 *   filters: { statuses: ['published'], search: 'fantasy' },
 *   page: 1,
 *   pageSize: 20,
 * });
 * ```
 */
export function useBooksData({
  filters,
  page = 1,
  pageSize = 20,
}: UseBooksDataParams): BooksDataResult {
  const [books, setBooks] = useState<BookTableRow[]>([]);
  const [stats, setStats] = useState<BookStats>({
    totalBooks: 0,
    totalWords: 0,
    publishedCount: 0,
    inProgressCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchBooksData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());

        if (filters.penName) {
          params.set('penName', filters.penName);
        }
        if (filters.genre) {
          params.set('genre', filters.genre);
        }
        if (filters.search) {
          params.set('search', filters.search);
        }
        if (filters.statuses && filters.statuses.length > 0) {
          params.set('statuses', filters.statuses.join(','));
        }

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/books/all?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch books: ${response.statusText}`);
        }

        const data = await response.json();

        setBooks(data.books || []);
        setStats(data.stats || {
          totalBooks: 0,
          totalWords: 0,
          publishedCount: 0,
          inProgressCount: 0,
        });
        setPagination(data.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch books';
        console.error('Error fetching books:', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooksData();
  }, [filters, page, pageSize, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    books,
    stats,
    isLoading,
    error,
    refetch,
    pagination,
  };
}
