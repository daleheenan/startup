'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson, post, put, del } from '../lib/fetch-utils';

// Types
export interface PenName {
  id: string;
  user_id: string;
  pen_name: string;
  display_name: string | null;
  bio: string | null;
  bio_short: string | null;
  website: string | null;
  social_media: Record<string, string> | null;
  genres: string[];
  photo_url: string | null;
  is_public: boolean;
  is_default: boolean;
  book_count: number;
  word_count: number;
  series_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePenNameData {
  pen_name: string;
  display_name?: string;
  bio?: string;
  bio_short?: string;
  website?: string;
  social_media?: Record<string, string>;
  genres?: string[];
  photo_url?: string;
  is_public?: boolean;
  is_default?: boolean;
}

export interface UpdatePenNameData extends Partial<CreatePenNameData> {}

// API functions
async function fetchPenNames(): Promise<PenName[]> {
  const response = await fetchJson<{ penNames: PenName[] }>('/api/pen-names');
  return response.penNames;
}

async function fetchPenName(id: string): Promise<PenName> {
  return fetchJson<PenName>(`/api/pen-names/${id}`);
}

async function createPenName(data: CreatePenNameData): Promise<PenName> {
  const response = await post<{ penName: PenName }>('/api/pen-names', data);
  return response.penName;
}

async function updatePenName(id: string, data: UpdatePenNameData): Promise<PenName> {
  const response = await put<{ penName: PenName }>(`/api/pen-names/${id}`, data);
  return response.penName;
}

async function deletePenName(id: string): Promise<void> {
  await del(`/api/pen-names/${id}`);
}

// Hooks
export function usePenNames() {
  return useQuery({
    queryKey: ['pen-names'],
    queryFn: fetchPenNames,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePenName(id: string | null) {
  return useQuery({
    queryKey: ['pen-name', id],
    queryFn: () => fetchPenName(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreatePenName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPenName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pen-names'] });
    },
  });
}

export function useUpdatePenName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePenNameData }) =>
      updatePenName(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pen-names'] });
      queryClient.invalidateQueries({ queryKey: ['pen-name', variables.id] });
    },
  });
}

export function useDeletePenName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePenName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pen-names'] });
    },
  });
}
