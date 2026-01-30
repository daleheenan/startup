'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/fetch-utils';
import type { NavigationCounts } from '../../shared/types';

/** Default counts returned when fetch fails - ensures UI always works */
const DEFAULT_COUNTS: NavigationCounts = {
  storyIdeas: 0,
  savedConcepts: 0,
  activeProjects: 0,
};

/**
 * Fetch navigation badge counts from the optimised API endpoint
 *
 * This uses a single API call instead of 3 separate calls, which helps
 * prevent rate limiting when navigating between pages.
 *
 * SINGLE-USER FIX: Returns default counts on error instead of throwing,
 * preventing "Failed to fetch" errors from breaking navigation.
 */
async function fetchNavigationCounts(): Promise<NavigationCounts> {
  try {
    const response = await fetchWithAuth('/api/navigation/counts', {
      // Navigation counts are non-critical, use minimal retries
      retries: 1,
      timeout: 10000, // 10 second timeout for fast failure
    });

    if (!response.ok) {
      // Log but don't throw - navigation counts are non-critical
      console.warn(`Navigation counts fetch returned ${response.status}`);
      return DEFAULT_COUNTS;
    }

    const data = await response.json();

    // API returns { success: true, counts: { storyIdeas, savedConcepts, activeProjects } }
    return data.counts || DEFAULT_COUNTS;
  } catch (error) {
    // Log but don't throw - navigation counts are non-critical
    // This prevents "Failed to fetch" from breaking the entire navigation bar
    console.warn('Navigation counts fetch failed, using defaults:', error);
    return DEFAULT_COUNTS;
  }
}

/**
 * Hook to fetch navigation badge counts
 *
 * Returns counts for:
 * - Story Ideas (saved status)
 * - Saved Concepts (saved status)
 * - Active Projects (not completed)
 *
 * SINGLE-USER FIX: This hook is designed to never throw errors that would
 * break the navigation UI. Failures are logged and default counts are returned.
 *
 * Uses a 5-minute cache TTL to avoid excessive API calls
 */
export function useNavigationCounts() {
  return useQuery({
    queryKey: ['navigation-counts'],
    queryFn: fetchNavigationCounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    // Don't retry on failure - the function already handles errors gracefully
    retry: false,
    // Return default counts as placeholder data while loading
    placeholderData: DEFAULT_COUNTS,
  });
}
