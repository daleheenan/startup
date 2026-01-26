'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/fetch-utils';
import type { SavedStoryIdea, IdeaExpansionMode, SavedStoryConcept } from '../../shared/types';

/**
 * Fetch all saved story ideas
 */
async function fetchStoryIdeas(): Promise<SavedStoryIdea[]> {
  const response = await fetchWithAuth('/api/story-ideas/saved');
  if (!response.ok) {
    throw new Error('Failed to fetch story ideas');
  }
  const data = await response.json();
  // API returns { success: true, ideas: [...] }
  return data.ideas || [];
}

/**
 * Fetch a single story idea by ID
 */
async function fetchStoryIdeaById(id: string): Promise<SavedStoryIdea> {
  const response = await fetchWithAuth(`/api/story-ideas/saved/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch story idea');
  }
  const data = await response.json();
  // API returns { success: true, idea: {...} }
  return data.idea;
}

/**
 * Update a story idea
 */
async function updateStoryIdea(
  id: string,
  updates: Partial<SavedStoryIdea>
): Promise<SavedStoryIdea> {
  const response = await fetchWithAuth(`/api/story-ideas/saved/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update story idea');
  }
  return response.json();
}

/**
 * Delete a story idea
 */
async function deleteStoryIdea(id: string): Promise<void> {
  const response = await fetchWithAuth(`/api/story-ideas/saved/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete story idea');
  }
}

/**
 * Expand a story idea into full concepts
 * Note: Uses extended timeout (120s) because Claude Opus concept generation can take 60-90 seconds
 */
async function expandStoryIdea(
  id: string,
  mode: IdeaExpansionMode,
  preferences?: Record<string, any>
): Promise<{ concepts: SavedStoryConcept[]; sourceIdeaId: string }> {
  const response = await fetchWithAuth(`/api/story-ideas/${id}/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, preferences }),
    timeout: 120000, // 120 seconds for AI concept generation
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to expand story idea');
  }
  return response.json();
}

/**
 * Hook to fetch all saved story ideas
 */
export function useStoryIdeas() {
  return useQuery({
    queryKey: ['story-ideas'],
    queryFn: fetchStoryIdeas,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single story idea
 */
export function useStoryIdea(id: string | null) {
  return useQuery({
    queryKey: ['story-idea', id],
    queryFn: () => fetchStoryIdeaById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to update a story idea
 */
export function useUpdateStoryIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SavedStoryIdea> }) =>
      updateStoryIdea(id, updates),
    onSuccess: (data, variables) => {
      // Update the single idea cache
      queryClient.setQueryData(['story-idea', variables.id], data);
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: ['story-ideas'] });
      // Invalidate navigation counts
      queryClient.invalidateQueries({ queryKey: ['navigation-counts'] });
    },
  });
}

/**
 * Hook to delete a story idea
 */
export function useDeleteStoryIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStoryIdea(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['story-idea', id] });
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: ['story-ideas'] });
      // Invalidate navigation counts
      queryClient.invalidateQueries({ queryKey: ['navigation-counts'] });
    },
  });
}

/**
 * Hook to expand a story idea into concepts
 */
export function useExpandStoryIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      mode,
      preferences,
    }: {
      id: string;
      mode: IdeaExpansionMode;
      preferences?: Record<string, any>;
    }) => expandStoryIdea(id, mode, preferences),
    onSuccess: (data, variables) => {
      // Mark the idea as used
      queryClient.setQueryData(['story-idea', variables.id], (old: SavedStoryIdea | undefined) =>
        old ? { ...old, status: 'used' as const } : old
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['story-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['saved-concepts'] });
      queryClient.invalidateQueries({ queryKey: ['navigation-counts'] });
    },
  });
}

/**
 * Hook to filter story ideas by status
 */
export function useFilteredStoryIdeas(status?: 'saved' | 'used' | 'archived') {
  const { data: ideas, ...rest } = useStoryIdeas();

  const filteredIdeas = status
    ? ideas?.filter(idea => idea.status === status)
    : ideas;

  return {
    data: filteredIdeas,
    ...rest,
  };
}

/**
 * Hook to filter story ideas by genre
 */
export function useStoryIdeasByGenre(genre?: string) {
  const { data: ideas, ...rest } = useStoryIdeas();

  const filteredIdeas = genre
    ? ideas?.filter(idea => idea.genre?.toLowerCase() === genre.toLowerCase())
    : ideas;

  return {
    data: filteredIdeas,
    ...rest,
  };
}
