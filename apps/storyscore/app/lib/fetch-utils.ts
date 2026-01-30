// Fetch utilities with auth support for StoryScore

import { getToken, logout } from './auth';
import { API_BASE_URL } from './constants';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

let isLoggingOut = false;

/**
 * Fetch with authentication and error handling
 */
export async function fetchWithAuth(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    skipAuth,
    timeout = DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      if (!isLoggingOut) {
        isLoggingOut = true;
        logout();
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    if (error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to the server. Please check your connection.');
    }

    throw error;
  }
}

/**
 * Fetch and parse JSON
 */
export async function fetchJson<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { message: `Request failed with status ${response.status}` }
    }));
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
