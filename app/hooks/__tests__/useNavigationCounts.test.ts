/**
 * Tests for useNavigationCounts hook
 * Tests navigation badge count fetching and filtering logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithProviders,
  createMockResponse,
  storyIdeaFactory,
  projectFactory,
} from '../../test/test-utils';
import { useNavigationCounts } from '../useNavigationCounts';

// Mock fetch-utils module
vi.mock('../../lib/fetch-utils', () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from '../../lib/fetch-utils';

describe('useNavigationCounts', () => {
  const mockFetchWithAuth = fetchWithAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and calculate navigation counts correctly', async () => {
    // Setup mock data
    const mockIdeas = [
      { id: '1', status: 'saved' },
      { id: '2', status: 'saved' },
      { id: '3', status: 'expanded' }, // Should not count
    ];
    const mockConcepts = [
      { id: '1', status: 'saved' },
      { id: '2', status: 'used' }, // Should not count
    ];
    const mockProjects = [
      { id: '1', status: 'active' },
      { id: '2', status: 'active' },
      { id: '3', status: 'completed' }, // Should not count
    ];

    // Setup sequential mock responses
    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse(mockIdeas))
      .mockResolvedValueOnce(createMockResponse(mockConcepts))
      .mockResolvedValueOnce(createMockResponse(mockProjects));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify counts
    expect(result.current.data).toEqual({
      storyIdeas: 2,      // 2 with status 'saved'
      savedConcepts: 1,   // 1 with status 'saved'
      activeProjects: 2,  // 2 not completed
    });
  });

  it('should return zero counts when arrays are empty', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      storyIdeas: 0,
      savedConcepts: 0,
      activeProjects: 0,
    });
  });

  it('should handle non-array responses gracefully', async () => {
    // API returns unexpected format
    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse(null))
      .mockResolvedValueOnce(createMockResponse({ error: 'Not found' }))
      .mockResolvedValueOnce(createMockResponse('invalid'));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should default to 0 for non-array responses
    expect(result.current.data).toEqual({
      storyIdeas: 0,
      savedConcepts: 0,
      activeProjects: 0,
    });
  });

  it('should make parallel API calls to all three endpoints', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(3);
    });

    // Verify correct endpoints called
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/story-ideas/saved');
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/saved-concepts');
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/projects');
  });

  it('should handle API error gracefully', async () => {
    // Mock all retries to fail
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // Hook has retry: 1, so wait for both attempts to fail
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeDefined();
  });

  it('should only count saved story ideas', async () => {
    const mockIdeas = [
      { id: '1', status: 'saved' },
      { id: '2', status: 'saved' },
      { id: '3', status: 'expanded' },
      { id: '4', status: 'draft' },
      { id: '5', status: 'archived' },
    ];

    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse(mockIdeas))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.storyIdeas).toBe(2);
  });

  it('should only count saved concepts', async () => {
    const mockConcepts = [
      { id: '1', status: 'saved' },
      { id: '2', status: 'saved' },
      { id: '3', status: 'saved' },
      { id: '4', status: 'used' },
      { id: '5', status: 'archived' },
    ];

    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(mockConcepts))
      .mockResolvedValueOnce(createMockResponse([]));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.savedConcepts).toBe(3);
  });

  it('should count all non-completed projects as active', async () => {
    const mockProjects = [
      { id: '1', status: 'active' },
      { id: '2', status: 'in_progress' },
      { id: '3', status: 'draft' },
      { id: '4', status: 'completed' }, // Should not count
      { id: '5', status: 'completed' }, // Should not count
    ];

    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse(mockProjects));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.activeProjects).toBe(3);
  });

  it('should use query key navigation-counts', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]))
      .mockResolvedValueOnce(createMockResponse([]));

    const { queryClient } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(queryClient.getQueryData(['navigation-counts'])).toBeDefined();
    });
  });
});
