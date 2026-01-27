/**
 * Tests for useStoryIdeas hooks
 * Tests CRUD operations and filtering for story ideas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import {
  renderHookWithProviders,
  createTestQueryClient,
  createMockResponse,
  storyIdeaFactory,
} from '../../test/test-utils';
import {
  useStoryIdeas,
  useStoryIdea,
  useUpdateStoryIdea,
  useDeleteStoryIdea,
  useExpandStoryIdea,
  useFilteredStoryIdeas,
  useStoryIdeasByGenre,
} from '../useStoryIdeas';

// Mock fetch-utils module
vi.mock('../../lib/fetch-utils', () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from '../../lib/fetch-utils';

describe('useStoryIdeas hooks', () => {
  const mockFetchWithAuth = fetchWithAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useStoryIdeas()', () => {
    it('should fetch all story ideas', async () => {
      const mockIdeas = [
        storyIdeaFactory.create({ id: '1', title: 'Idea 1' }),
        storyIdeaFactory.create({ id: '2', title: 'Idea 2' }),
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: mockIdeas }),
      });

      const { result } = renderHookWithProviders(() => useStoryIdeas());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].title).toBe('Idea 1');
    });

    it('should return empty array when no ideas exist', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: [] }),
      });

      const { result } = renderHookWithProviders(() => useStoryIdeas());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle API returning empty response', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHookWithProviders(() => useStoryIdeas());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should default to empty array when ideas is undefined
      expect(result.current.data).toEqual([]);
    });

    it('should handle fetch error', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHookWithProviders(() => useStoryIdeas());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch story ideas');
    });
  });

  describe('useStoryIdea()', () => {
    it('should fetch single story idea by ID', async () => {
      const mockIdea = storyIdeaFactory.create({ id: 'idea-123', title: 'Test Idea' });

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, idea: mockIdea }),
      });

      const { result } = renderHookWithProviders(() => useStoryIdea('idea-123'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.id).toBe('idea-123');
      expect(result.current.data?.title).toBe('Test Idea');
    });

    it('should not fetch when ID is null', async () => {
      const { result } = renderHookWithProviders(() => useStoryIdea(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockFetchWithAuth).not.toHaveBeenCalled();
    });

    it('should use correct endpoint', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, idea: {} }),
      });

      renderHookWithProviders(() => useStoryIdea('test-id'));

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/story-ideas/saved/test-id');
      });
    });
  });

  describe('useUpdateStoryIdea()', () => {
    it('should update a story idea', async () => {
      const updatedIdea = storyIdeaFactory.create({ id: 'idea-1', title: 'Updated Title' });

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedIdea),
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHookWithProviders(() => useUpdateStoryIdea(), { queryClient });

      await act(async () => {
        result.current.mutate({ id: 'idea-1', updates: { title: 'Updated Title' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/story-ideas/saved/idea-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
        })
      );
    });

    it('should invalidate related queries on success', async () => {
      const updatedIdea = storyIdeaFactory.create({ id: 'idea-1' });

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedIdea),
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useUpdateStoryIdea(), { queryClient });

      await act(async () => {
        result.current.mutate({ id: 'idea-1', updates: { title: 'New' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['story-ideas'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['navigation-counts'] });
    });

    it('should handle update error', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { result } = renderHookWithProviders(() => useUpdateStoryIdea());

      await act(async () => {
        result.current.mutate({ id: 'idea-1', updates: { title: '' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to update story idea');
    });
  });

  describe('useDeleteStoryIdea()', () => {
    it('should delete a story idea', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHookWithProviders(() => useDeleteStoryIdea());

      await act(async () => {
        result.current.mutate('idea-to-delete');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/story-ideas/saved/idea-to-delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should remove query and invalidate lists on success', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const queryClient = createTestQueryClient();
      const removeSpy = vi.spyOn(queryClient, 'removeQueries');
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useDeleteStoryIdea(), { queryClient });

      await act(async () => {
        result.current.mutate('idea-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['story-idea', 'idea-123'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['story-ideas'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['navigation-counts'] });
    });
  });

  describe('useExpandStoryIdea()', () => {
    it('should expand story idea into concepts', async () => {
      const mockConcepts = [
        { id: 'concept-1', title: 'Concept 1' },
        { id: 'concept-2', title: 'Concept 2' },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: mockConcepts, sourceIdeaId: 'idea-1' }),
      });

      const { result } = renderHookWithProviders(() => useExpandStoryIdea());

      await act(async () => {
        result.current.mutate({ id: 'idea-1', mode: 'quick' as any });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.concepts).toHaveLength(2);
      expect(result.current.data?.sourceIdeaId).toBe('idea-1');
    });

    it('should use extended timeout for AI generation', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: [], sourceIdeaId: 'idea-1' }),
      });

      const { result } = renderHookWithProviders(() => useExpandStoryIdea());

      await act(async () => {
        result.current.mutate({ id: 'idea-1', mode: 'detailed' as any });
      });

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalled();
      });

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/story-ideas/idea-1/expand',
        expect.objectContaining({ timeout: 120000 })
      );
    });

    it('should invalidate related caches on success', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: [], sourceIdeaId: 'idea-1' }),
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHookWithProviders(() => useExpandStoryIdea(), { queryClient });

      await act(async () => {
        result.current.mutate({ id: 'idea-1', mode: 'quick' as any });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['story-ideas'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['saved-concepts'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['navigation-counts'] });
    });
  });

  describe('useFilteredStoryIdeas()', () => {
    it('should filter ideas by status', async () => {
      const mockIdeas = [
        storyIdeaFactory.create({ id: '1', status: 'saved' }),
        storyIdeaFactory.create({ id: '2', status: 'saved' }),
        storyIdeaFactory.create({ id: '3', status: 'used' }),
        storyIdeaFactory.create({ id: '4', status: 'archived' }),
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: mockIdeas }),
      });

      const { result } = renderHookWithProviders(() => useFilteredStoryIdeas('saved'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.every(idea => idea.status === 'saved')).toBe(true);
    });

    it('should return all ideas when no status filter', async () => {
      const mockIdeas = [
        storyIdeaFactory.create({ id: '1', status: 'saved' }),
        storyIdeaFactory.create({ id: '2', status: 'used' }),
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: mockIdeas }),
      });

      const { result } = renderHookWithProviders(() => useFilteredStoryIdeas());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useStoryIdeasByGenre()', () => {
    it('should filter ideas by genre (case insensitive)', async () => {
      const mockIdeas = [
        storyIdeaFactory.create({ id: '1', genre: 'Fantasy' }),
        storyIdeaFactory.create({ id: '2', genre: 'fantasy' }),
        storyIdeaFactory.create({ id: '3', genre: 'Sci-Fi' }),
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: mockIdeas }),
      });

      const { result } = renderHookWithProviders(() => useStoryIdeasByGenre('FANTASY'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it('should return all ideas when no genre filter', async () => {
      const mockIdeas = [
        storyIdeaFactory.create({ id: '1', genre: 'Fantasy' }),
        storyIdeaFactory.create({ id: '2', genre: 'Sci-Fi' }),
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ideas: mockIdeas }),
      });

      const { result } = renderHookWithProviders(() => useStoryIdeasByGenre());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });
  });
});
