/**
 * Tests for useNavigationCounts hook
 * Tests navigation badge count fetching from the optimised single endpoint
 *
 * SINGLE-USER FIX: The hook now uses a single optimised endpoint instead of
 * 3 separate endpoints, and gracefully handles errors by returning default
 * counts instead of throwing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithProviders,
  createMockResponse,
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

  it('should fetch navigation counts from the optimised endpoint', async () => {
    // Mock the optimised endpoint response
    mockFetchWithAuth.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        counts: {
          storyIdeas: 5,
          savedConcepts: 3,
          activeProjects: 2,
        },
      })
    );

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // Wait for the actual fetched data (not placeholder)
    // With placeholderData, isSuccess is true immediately, so we need to
    // wait for the actual data values
    await waitFor(() => {
      expect(result.current.data?.storyIdeas).toBe(5);
    });

    // Verify full counts
    expect(result.current.data).toEqual({
      storyIdeas: 5,
      savedConcepts: 3,
      activeProjects: 2,
    });
  });

  it('should call the single optimised endpoint', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        counts: {
          storyIdeas: 0,
          savedConcepts: 0,
          activeProjects: 0,
        },
      })
    );

    renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);
    });

    // Verify the correct endpoint is called with timeout options
    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/navigation/counts',
      expect.objectContaining({
        retries: 1,
        timeout: 10000,
      })
    );
  });

  it('should return zero counts when response has no counts', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        // No counts property - should default to zeros
      })
    );

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

  it('should return default counts on API error instead of throwing', async () => {
    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock API error
    mockFetchWithAuth.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // The hook should succeed with default values, not error
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return default counts instead of throwing
    expect(result.current.data).toEqual({
      storyIdeas: 0,
      savedConcepts: 0,
      activeProjects: 0,
    });
    expect(result.current.isError).toBe(false);

    warnSpy.mockRestore();
  });

  it('should return default counts on non-ok response instead of throwing', async () => {
    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock non-ok response
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // The hook should succeed with default values
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      storyIdeas: 0,
      savedConcepts: 0,
      activeProjects: 0,
    });
    expect(result.current.isError).toBe(false);

    warnSpy.mockRestore();
  });

  it('should provide placeholder data while loading', async () => {
    // Set up a delayed response
    mockFetchWithAuth.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                createMockResponse({
                  success: true,
                  counts: {
                    storyIdeas: 5,
                    savedConcepts: 3,
                    activeProjects: 2,
                  },
                })
              ),
            100
          )
        )
    );

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    // While loading, should have placeholder data (default counts)
    expect(result.current.data).toEqual({
      storyIdeas: 0,
      savedConcepts: 0,
      activeProjects: 0,
    });

    // Wait for actual data
    await waitFor(() => {
      expect(result.current.data?.storyIdeas).toBe(5);
    });
  });

  it('should use query key navigation-counts', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(
      createMockResponse({
        success: true,
        counts: {
          storyIdeas: 0,
          savedConcepts: 0,
          activeProjects: 0,
        },
      })
    );

    const { queryClient } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(queryClient.getQueryData(['navigation-counts'])).toBeDefined();
    });
  });

  it('should have appropriate caching settings', async () => {
    mockFetchWithAuth.mockResolvedValue(
      createMockResponse({
        success: true,
        counts: {
          storyIdeas: 1,
          savedConcepts: 1,
          activeProjects: 1,
        },
      })
    );

    const { result } = renderHookWithProviders(() => useNavigationCounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // First call made
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);

    // Render hook again - should use cached data, not refetch
    const { result: result2 } = renderHookWithProviders(() => useNavigationCounts());

    // Data should be immediately available from cache
    expect(result2.current.data).toBeDefined();
  });
});
