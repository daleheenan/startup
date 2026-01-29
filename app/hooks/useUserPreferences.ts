'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../lib/fetch-utils';

/**
 * User preferences shape from the API
 */
export interface UserPreferences {
  showAICostsMenu?: boolean;
  // Add other preference fields as needed
}

/**
 * Fetch user preferences from the API
 */
async function fetchUserPreferences(): Promise<UserPreferences> {
  const response = await fetchWithAuth('/api/user-settings/preferences');

  if (!response.ok) {
    throw new Error('Failed to fetch user preferences');
  }

  const data = await response.json();
  return data.preferences || {};
}

/**
 * Update user preferences
 */
async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  const response = await fetchWithAuth('/api/user-settings/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error('Failed to update user preferences');
  }

  const data = await response.json();
  return data.preferences || {};
}

/**
 * Hook to fetch user preferences with caching
 *
 * Uses a 5-minute cache TTL to avoid excessive API calls.
 * This hook should be used instead of direct fetch calls to
 * /api/user-settings/preferences to prevent rate limiting.
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchUserPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      // Update the cache with the new preferences
      queryClient.setQueryData(['user-preferences'], data);
      // Dispatch event for components that may not use this hook yet
      window.dispatchEvent(new Event('preferencesUpdated'));
    },
  });
}
