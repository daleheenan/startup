'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/fetch-utils';
import type { NavigationCounts } from '../../shared/types';

/**
 * Fetch navigation badge counts from the API
 */
async function fetchNavigationCounts(): Promise<NavigationCounts> {
  const [ideasRes, conceptsRes, projectsRes] = await Promise.all([
    fetchWithAuth('/api/story-ideas/saved'),
    fetchWithAuth('/api/saved-concepts'),
    fetchWithAuth('/api/projects'),
  ]);

  const ideas = await ideasRes.json();
  const concepts = await conceptsRes.json();
  const projects = await projectsRes.json();

  return {
    storyIdeas: Array.isArray(ideas) ? ideas.filter((i: any) => i.status === 'saved').length : 0,
    savedConcepts: Array.isArray(concepts) ? concepts.filter((c: any) => c.status === 'saved').length : 0,
    activeProjects: Array.isArray(projects) ? projects.filter((p: any) => p.status !== 'completed').length : 0,
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
