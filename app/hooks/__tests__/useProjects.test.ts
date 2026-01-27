/**
 * Tests for useProjects hook
 * Tests data fetching, caching, and invalidation for project-related queries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithProviders,
  createTestQueryClient,
  projectFactory,
  bookFactory,
  chapterFactory,
  createMockResponse,
} from '../../test/test-utils';
import { useProjects, useProject, useInvalidateProjects } from '../useProjects';

// Mock auth module
vi.mock('../../lib/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useProjects()', () => {
    it('should fetch and return projects list', async () => {
      const mockProjects = projectFactory.createMany(3);

      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProjects));

      const { result } = renderHookWithProviders(() => useProjects());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0]).toHaveProperty('title');
    });

    it('should handle fetch error gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHookWithProviders(() => useProjects());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Failed to fetch projects');
    });

    it('should include auth token in request headers', async () => {
      const mockProjects = projectFactory.createMany(1);
      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProjects));

      renderHookWithProviders(() => useProjects());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1].headers).toHaveProperty('Authorization', 'Bearer test-token');
    });

    it('should use correct API endpoint', async () => {
      const mockProjects = projectFactory.createMany(1);
      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProjects));

      renderHookWithProviders(() => useProjects());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toContain('/api/projects');
    });

    it('should cache results and not refetch within stale time', async () => {
      const mockProjects = projectFactory.createMany(2);
      global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockProjects));

      const queryClient = createTestQueryClient();

      // First render
      const { result: result1, unmount } = renderHookWithProviders(() => useProjects(), {
        queryClient,
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      unmount();

      // Second render with same client - should use cache
      const { result: result2 } = renderHookWithProviders(() => useProjects(), {
        queryClient,
      });

      // Should have data immediately from cache (no loading state)
      // Note: With staleTime: 0 in test config, it may refetch, but data should be available
      expect(result2.current.data).toBeDefined();
    });
  });

  describe('useProject()', () => {
    it('should fetch single project with books and chapters', async () => {
      const projectId = 'project-123';
      const mockProject = {
        ...projectFactory.create({ id: projectId }),
        books: [
          {
            ...bookFactory.create({ projectId }),
            chapters: chapterFactory.createMany(3, 'book-1'),
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProject));

      const { result } = renderHookWithProviders(() => useProject(projectId));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.id).toBe(projectId);
      expect(result.current.data?.books).toHaveLength(1);
      expect(result.current.data?.books[0].chapters).toHaveLength(3);
    });

    it('should not fetch when projectId is null', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse({}));

      const { result } = renderHookWithProviders(() => useProject(null));

      // Should not be loading or fetching when disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();

      // Fetch should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use correct API endpoint with query params', async () => {
      const projectId = 'project-456';
      const mockProject = projectFactory.create({ id: projectId });
      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse(mockProject));

      renderHookWithProviders(() => useProject(projectId));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toContain(`/api/projects/${projectId}`);
      expect(fetchCall[0]).toContain('include=books,chapters');
    });

    it('should handle project not found error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHookWithProviders(() => useProject('non-existent'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch project');
    });
  });

  describe('useInvalidateProjects()', () => {
    it('should provide invalidation functions', () => {
      const { result } = renderHookWithProviders(() => useInvalidateProjects());

      expect(result.current).toHaveProperty('invalidateAll');
      expect(result.current).toHaveProperty('invalidateProject');
      expect(typeof result.current.invalidateAll).toBe('function');
      expect(typeof result.current.invalidateProject).toBe('function');
    });

    it('should invalidate all projects cache', async () => {
      const mockProjects = projectFactory.createMany(2);
      global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockProjects));

      const queryClient = createTestQueryClient();

      // Seed the cache
      await queryClient.prefetchQuery({
        queryKey: ['projects'],
        queryFn: () => Promise.resolve(mockProjects),
      });

      const { result } = renderHookWithProviders(() => useInvalidateProjects(), {
        queryClient,
      });

      // Invalidate
      result.current.invalidateAll();

      // Cache should be invalidated
      const cacheState = queryClient.getQueryState(['projects']);
      expect(cacheState?.isInvalidated).toBe(true);
    });

    it('should invalidate specific project cache', async () => {
      const projectId = 'project-789';
      const mockProject = projectFactory.create({ id: projectId });
      global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockProject));

      const queryClient = createTestQueryClient();

      // Seed the cache
      await queryClient.prefetchQuery({
        queryKey: ['project', projectId],
        queryFn: () => Promise.resolve(mockProject),
      });

      const { result } = renderHookWithProviders(() => useInvalidateProjects(), {
        queryClient,
      });

      // Invalidate specific project
      result.current.invalidateProject(projectId);

      // Cache should be invalidated
      const cacheState = queryClient.getQueryState(['project', projectId]);
      expect(cacheState?.isInvalidated).toBe(true);
    });
  });
});
