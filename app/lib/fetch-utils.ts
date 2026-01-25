// Utility functions for API fetching with common error handling
import { getToken, logout } from './auth';
import { API_BASE_URL } from './constants';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// BUG-001 FIX: Singleton flag to prevent multiple logout operations
let isLoggingOut = false;

/**
 * Fetch with authentication and standardized error handling
 */
export async function fetchWithAuth(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (fetchOptions.headers) {
    const existingHeaders = fetchOptions.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    // BUG-001 FIX: Only logout once even with multiple simultaneous 401s
    if (!isLoggingOut) {
      isLoggingOut = true;
      logout();
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

/**
 * Fetch and parse JSON with error handling
 */
export async function fetchJson<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch((parseError) => {
      // BUG-003 FIX: Log JSON parse errors before providing fallback
      console.error('Failed to parse error response JSON:', parseError);
      return {
        error: { message: `Request failed with status ${response.status}` }
      };
    });
    throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function post<T>(
  endpoint: string,
  body: any,
  options: FetchOptions = {}
): Promise<T> {
  return fetchJson<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request helper
 */
export async function put<T>(
  endpoint: string,
  body: any,
  options: FetchOptions = {}
): Promise<T> {
  return fetchJson<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request helper
 */
export async function del<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return fetchJson<T>(endpoint, {
    ...options,
    method: 'DELETE',
  });
}
