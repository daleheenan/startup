// Utility functions for API fetching with common error handling
import { getToken, logout } from './auth';
import { API_BASE_URL } from './constants';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  timeout?: number; // BUG-012 FIX: Allow custom timeout
  retries?: number; // Number of retries for transient errors
  retryDelay?: number; // Delay between retries in ms
}

// BUG-001 FIX: Singleton flag to prevent multiple logout operations
let isLoggingOut = false;

// BUG-012 FIX: Default timeout for all fetch requests
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Default retry configuration for transient network errors
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 500; // 500ms

/**
 * Check if an error is retryable (transient network issue)
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('net::err_') ||
    message.includes('aborted') ||
    message.includes('timeout')
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with authentication and standardized error handling
 *
 * BUG-012 FIX: Added AbortController for request timeouts
 * SINGLE-USER FIX: Added automatic retries for transient network errors
 */
export async function fetchWithAuth(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    skipAuth,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;

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

  // Attempt the request with retries for transient errors
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // BUG-012 FIX: Create AbortController for timeout
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
        // BUG-001 FIX: Only logout once even with multiple simultaneous 401s
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

      // BUG-012 FIX: Handle AbortError from timeout
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timed out. The server is taking too long to respond. Please try again.`);
      } else if (error.message === 'Failed to fetch' || error.message?.includes('NetworkError')) {
        // Handle network errors (Failed to fetch) with a more helpful message
        lastError = new Error('Unable to connect to the server. Please check your connection and try again.');
      } else {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Check if we should retry
      if (attempt < retries && isRetryableError(error)) {
        // Exponential backoff: delay * 2^attempt
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        await sleep(backoffDelay);
        continue;
      }

      // No more retries, throw the last error
      throw lastError;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('Request failed after retries');
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
