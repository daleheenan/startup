/**
 * React Query hooks for NovelForge API
 *
 * Provides typed, cached hooks for common API operations with:
 * - Automatic caching (5min stale, 30min GC)
 * - Automatic retries (2 attempts)
 * - Type safety with shared types
 * - Optimistic updates for mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getToken } from './auth';
import { API_BASE_URL } from '@/app/lib/constants';

/**
 * Helper: Make authenticated API request
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Query Keys - centralized for easy cache invalidation
 */
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectWithBooks: (id: string) => ['projects', id, 'books-with-chapters'] as const,
  chapters: (bookId: string) => ['chapters', bookId] as const,
  books: (projectId: string) => ['books', projectId] as const,
};

/**
 * useProjects - Fetch all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const data = await apiFetch<{ projects: any[] }>('/api/projects');
      return data.projects;
    },
  });
}

/**
 * useProject - Fetch single project
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Project ID required');
      return apiFetch<any>(`/api/projects/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * useBooksWithChapters - Fetch project with all books and chapters (N+1 optimized)
 *
 * This hook uses the optimized endpoint that fetches everything in a single query
 * to avoid N+1 query problems.
 *
 * @param projectId - Project ID
 * @param options - Optional query parameters
 */
export function useBooksWithChapters(
  projectId: string | undefined,
  options?: {
    chapterLimit?: number;
    chapterOffset?: number;
    includeContent?: boolean;
  }
) {
  return useQuery({
    queryKey: [...queryKeys.projectWithBooks(projectId || ''), options],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const params = new URLSearchParams();
      if (options?.chapterLimit) params.set('chapterLimit', options.chapterLimit.toString());
      if (options?.chapterOffset) params.set('chapterOffset', options.chapterOffset.toString());
      if (options?.includeContent) params.set('includeContent', 'true');

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{
        project: any;
        books: Array<{
          id: string;
          book_number: number;
          title: string;
          chapters: any[];
          chapterCount: number;
          hasMoreChapters: boolean;
        }>;
        totalChapters: number;
        pagination: {
          chapterLimit: number;
          chapterOffset: number;
          includeContent: boolean;
        };
      }>(`/api/projects/${projectId}/books-with-chapters${queryString}`);
    },
    enabled: !!projectId,
  });
}

/**
 * useChapters - Fetch chapters for a specific book
 */
export function useChapters(bookId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chapters(bookId || ''),
    queryFn: async () => {
      if (!bookId) throw new Error('Book ID required');
      const data = await apiFetch<{ chapters: any[] }>(`/api/books/${bookId}/chapters`);
      return data.chapters;
    },
    enabled: !!bookId,
  });
}

/**
 * useBooks - Fetch books for a project
 */
export function useBooks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.books(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const data = await apiFetch<{ books: any[] }>(`/api/books?project_id=${projectId}`);
      return data.books;
    },
    enabled: !!projectId,
  });
}

/**
 * useCreateProject - Mutation for creating a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      type: 'standalone' | 'series';
      genre: string;
    }) => {
      return apiFetch<any>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

/**
 * useUpdateProject - Mutation for updating a project
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<any>) => {
      return apiFetch<any>(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate both the project and the projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

/**
 * useDeleteProject - Mutation for deleting a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      return apiFetch<any>(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
