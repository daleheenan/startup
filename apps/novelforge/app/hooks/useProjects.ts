'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '../lib/fetch-utils';

// Types
interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  book_count: number;
  created_at: string;
  updated_at: string;
}

interface ProjectWithBooks extends Project {
  books: Array<{
    id: string;
    book_number: number;
    title: string;
    status: string;
    word_count: number;
    chapters: Array<{
      id: string;
      chapter_number: number;
      title: string | null;
      status: string;
      word_count: number;
    }>;
  }>;
}

// API functions
async function fetchProjects(): Promise<Project[]> {
  return fetchJson<Project[]>('/api/projects');
}

async function fetchProjectWithBooks(projectId: string): Promise<ProjectWithBooks> {
  return fetchJson<ProjectWithBooks>(`/api/projects/${projectId}?include=books,chapters`);
}

// Hooks
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectWithBooks(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes for individual project
  });
}

export function useInvalidateProjects() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    invalidateProject: (projectId: string) =>
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  };
}
