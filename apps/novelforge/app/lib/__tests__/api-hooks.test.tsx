import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useProjects,
  useProject,
  useBooksWithChapters,
  useChapters,
  useBooks,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  queryKeys,
} from '../api-hooks';
import * as auth from '../auth';

// Mock the auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(),
}));

describe('api-hooks', () => {
  const mockToken = 'mock-jwt-token';
  const mockApiBaseUrl = 'http://localhost:3001';
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.mocked(auth.getToken).mockReturnValue(mockToken);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryKeys', () => {
    it('should generate correct query keys for projects', () => {
      expect(queryKeys.projects).toEqual(['projects']);
    });

    it('should generate correct query keys for project', () => {
      expect(queryKeys.project('proj-123')).toEqual(['projects', 'proj-123']);
    });

    it('should generate correct query keys for projectWithBooks', () => {
      expect(queryKeys.projectWithBooks('proj-123')).toEqual([
        'projects',
        'proj-123',
        'books-with-chapters',
      ]);
    });

    it('should generate correct query keys for chapters', () => {
      expect(queryKeys.chapters('book-456')).toEqual(['chapters', 'book-456']);
    });

    it('should generate correct query keys for books', () => {
      expect(queryKeys.books('proj-123')).toEqual(['books', 'proj-123']);
    });
  });

  describe('useProjects', () => {
    it('should fetch all projects successfully', async () => {
      const mockProjects = [
        { id: 'proj-1', title: 'Project 1', type: 'standalone' },
        { id: 'proj-2', title: 'Project 2', type: 'series' },
      ];
      const mockResponse = new Response(
        JSON.stringify({ projects: mockProjects }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProjects);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should handle fetch error', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: { message: 'Failed to fetch projects' } }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should use correct query key', async () => {
      const mockResponse = new Response(
        JSON.stringify({ projects: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ queryKey: queryKeys.projects });
      expect(queries.length).toBe(1);
    });
  });

  describe('useProject', () => {
    it('should fetch single project successfully', async () => {
      const projectId = 'proj-123';
      const mockProject = { id: projectId, title: 'Test Project', type: 'standalone' };
      const mockResponse = new Response(JSON.stringify(mockProject), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProject(projectId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProject);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects/${projectId}`,
        expect.any(Object)
      );
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => useProject(undefined), {
        wrapper: createWrapper(),
      });

      // When enabled is false, the query stays in an idle state
      expect(result.current.fetchStatus).toBe('idle');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useBooksWithChapters', () => {
    it('should fetch books with chapters successfully', async () => {
      const projectId = 'proj-123';
      const mockData = {
        project: { id: projectId, title: 'Test Project' },
        books: [
          {
            id: 'book-1',
            book_number: 1,
            title: 'Book 1',
            chapters: [],
            chapterCount: 10,
            hasMoreChapters: false,
          },
        ],
        totalChapters: 10,
        pagination: {
          chapterLimit: 50,
          chapterOffset: 0,
          includeContent: false,
        },
      };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBooksWithChapters(projectId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects/${projectId}/books-with-chapters`,
        expect.any(Object)
      );
    });

    it('should include query parameters in request', async () => {
      const projectId = 'proj-123';
      const options = {
        chapterLimit: 10,
        chapterOffset: 5,
        includeContent: true,
      };
      const mockResponse = new Response(
        JSON.stringify({ project: {}, books: [], totalChapters: 0, pagination: {} }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useBooksWithChapters(projectId, options),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects/${projectId}/books-with-chapters?chapterLimit=10&chapterOffset=5&includeContent=true`,
        expect.any(Object)
      );
    });

    it('should not fetch when projectId is undefined', async () => {
      const { result } = renderHook(() => useBooksWithChapters(undefined), {
        wrapper: createWrapper(),
      });

      // When enabled is false, the query stays in an idle state
      expect(result.current.fetchStatus).toBe('idle');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should include options in query key', async () => {
      const projectId = 'proj-123';
      const options = { chapterLimit: 10 };
      const mockResponse = new Response(
        JSON.stringify({ project: {}, books: [], totalChapters: 0, pagination: {} }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useBooksWithChapters(projectId, options),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({
        queryKey: [...queryKeys.projectWithBooks(projectId), options],
      });
      expect(queries.length).toBe(1);
    });
  });

  describe('useChapters', () => {
    it('should fetch chapters for a book successfully', async () => {
      const bookId = 'book-456';
      const mockChapters = [
        { id: 'ch-1', chapter_number: 1, title: 'Chapter 1' },
        { id: 'ch-2', chapter_number: 2, title: 'Chapter 2' },
      ];
      const mockResponse = new Response(
        JSON.stringify({ chapters: mockChapters }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useChapters(bookId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockChapters);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/books/${bookId}/chapters`,
        expect.any(Object)
      );
    });

    it('should not fetch when bookId is undefined', async () => {
      const { result } = renderHook(() => useChapters(undefined), {
        wrapper: createWrapper(),
      });

      // When enabled is false, the query stays in an idle state
      expect(result.current.fetchStatus).toBe('idle');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useBooks', () => {
    it('should fetch books for a project successfully', async () => {
      const projectId = 'proj-123';
      const mockBooks = [
        { id: 'book-1', book_number: 1, title: 'Book 1' },
        { id: 'book-2', book_number: 2, title: 'Book 2' },
      ];
      const mockResponse = new Response(
        JSON.stringify({ books: mockBooks }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBooks(projectId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBooks);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/books?project_id=${projectId}`,
        expect.any(Object)
      );
    });

    it('should not fetch when projectId is undefined', async () => {
      const { result } = renderHook(() => useBooks(undefined), {
        wrapper: createWrapper(),
      });

      // When enabled is false, the query stays in an idle state
      expect(result.current.fetchStatus).toBe('idle');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProject', () => {
    it('should create a project successfully', async () => {
      const newProject = {
        title: 'New Project',
        type: 'standalone' as const,
        genre: 'Fantasy',
      };
      const mockResponse = new Response(
        JSON.stringify({ id: 'proj-new', ...newProject }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newProject);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProject),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should invalidate projects query on success', async () => {
      const mockResponse = new Response(
        JSON.stringify({ id: 'proj-new' }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // Set up initial projects query
      queryClient.setQueryData(queryKeys.projects, [
        { id: 'proj-1', title: 'Project 1' },
      ]);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      // Verify mutation calls invalidate
      const onSuccess = vi.fn();
      result.current.mutate(
        {
          title: 'New Project',
          type: 'standalone',
          genre: 'Fantasy',
        },
        {
          onSuccess,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the mutation completed successfully
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle creation error', async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: { message: 'Validation failed' } }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: 'New Project',
        type: 'standalone',
        genre: 'Fantasy',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUpdateProject', () => {
    it('should update a project successfully', async () => {
      const projectId = 'proj-123';
      const updateData = { title: 'Updated Title' };
      const mockResponse = new Response(
        JSON.stringify({ id: projectId, ...updateData }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUpdateProject(projectId), {
        wrapper: createWrapper(),
      });

      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects/${projectId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should invalidate project and projects queries on success', async () => {
      const projectId = 'proj-123';
      const mockResponse = new Response(
        JSON.stringify({ id: projectId }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // Set up initial query data
      queryClient.setQueryData(queryKeys.project(projectId), { id: projectId });
      queryClient.setQueryData(queryKeys.projects, [{ id: projectId }]);

      const { result } = renderHook(() => useUpdateProject(projectId), {
        wrapper: createWrapper(),
      });

      const onSuccess = vi.fn();
      result.current.mutate({ title: 'Updated' }, { onSuccess });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the mutation completed successfully
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      const projectId = 'proj-123';
      const mockResponse = new Response(
        JSON.stringify({ error: { message: 'Not found' } }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUpdateProject(projectId), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Updated' });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDeleteProject', () => {
    it('should delete a project successfully', async () => {
      const projectId = 'proj-123';
      const mockResponse = new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(projectId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/projects/${projectId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should invalidate projects query on success', async () => {
      const projectId = 'proj-123';
      const mockResponse = new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // Set up initial projects query
      queryClient.setQueryData(queryKeys.projects, [{ id: projectId }]);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      const onSuccess = vi.fn();
      result.current.mutate(projectId, { onSuccess });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the mutation completed successfully
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const projectId = 'proj-123';
      const mockResponse = new Response(
        JSON.stringify({ error: { message: 'Cannot delete' } }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(projectId);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });
});
