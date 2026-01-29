'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/fetch-utils';
import type { NavigationCounts } from '../../shared/types';

/**
 * Fetch navigation badge counts from the optimised API endpoint
 *
 * This uses a single API call instead of 3 separate calls, which helps
 * prevent rate limiting when navigating between pages.
 */
async function fetchNavigationCounts(): Promise<NavigationCounts> {
  const response = await fetchWithAuth('/api/navigation/counts');

  if (!response.ok) {
    throw new Error('Failed to fetch navigation counts');
  }

  const data = await response.json();

  // API returns { success: true, counts: { storyIdeas, savedConcepts, activeProjects } }
  return data.counts || {
    storyIdeas: 0,
    savedConcepts: 0,
    activeProjects: 0,
  };
}

/**
 * Hook to fetch navigation badge counts
 *
 * Returns counts for:
 * - Story Ideas (saved status)
 * - Saved Concepts (saved status)
 * - Active Projects (not completed)
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
    retry: 1,
  });
}
