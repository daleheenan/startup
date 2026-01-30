import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth, fetchJson, post, put, del } from '../fetch-utils';
import * as auth from '../auth';

// Mock the auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(),
  logout: vi.fn(),
}));

describe('fetch-utils', () => {
  const mockToken = 'mock-jwt-token';
  const mockEndpoint = '/api/test';
  const mockUrl = 'http://localhost:3001/api/test';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchWithAuth', () => {
    it('should make a fetch request with authentication token', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await fetchWithAuth(mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should make a fetch request without auth when skipAuth is true', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await fetchWithAuth(mockEndpoint, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should make a request without auth header when token is null', async () => {
      vi.mocked(auth.getToken).mockReturnValue(null);
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await fetchWithAuth(mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should handle absolute URLs', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const absoluteUrl = 'https://example.com/api/test';
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await fetchWithAuth(absoluteUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        absoluteUrl,
        expect.any(Object)
      );
    });

    it('should merge custom headers with default headers', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await fetchWithAuth(mockEndpoint, {
        headers: { 'X-Custom-Header': 'test-value' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('should handle 401 response and logout user', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('{}', {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '' } as any;

      await expect(fetchWithAuth(mockEndpoint)).rejects.toThrow(
        'Session expired. Please log in again.'
      );

      expect(auth.logout).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');

      // Restore window.location
      (window as any).location = originalLocation;
    });

    it('should handle AbortError from timeout', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);

      // Mock fetch to throw AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      // The code transforms AbortError into a user-friendly timeout message
      // With retries enabled (default 2), it will retry before finally throwing
      await expect(fetchWithAuth(mockEndpoint, { retries: 0 })).rejects.toThrow(
        'Request timed out. The server is taking too long to respond. Please try again.'
      );
    });

    it('should clear timeout on successful response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await fetchWithAuth(mockEndpoint);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout on error', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await expect(fetchWithAuth(mockEndpoint)).rejects.toThrow('Network error');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('fetchJson', () => {
    it('should fetch and parse JSON response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockData = { id: '123', name: 'Test' };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await fetchJson(mockEndpoint);

      expect(result).toEqual(mockData);
    });

    it('should throw error with message from error response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const errorMessage = 'Invalid request';
      const mockResponse = new Response(
        JSON.stringify({ error: { message: errorMessage } }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(fetchJson(mockEndpoint)).rejects.toThrow(errorMessage);
    });

    it('should throw error with fallback message when error response is not JSON', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Not JSON', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(fetchJson(mockEndpoint)).rejects.toThrow(
        'Request failed with status 500'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse error response JSON:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should use error message from error object', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const errorMessage = 'Custom error message';
      const mockResponse = new Response(
        JSON.stringify({ error: { message: errorMessage } }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(fetchJson(mockEndpoint)).rejects.toThrow(errorMessage);
    });
  });

  describe('post', () => {
    it('should make a POST request with JSON body', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const requestBody = { name: 'Test', value: 42 };
      const responseData = { id: '123', ...requestBody };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await post(mockEndpoint, requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should pass additional options to fetchJson', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const requestBody = { name: 'Test' };
      const mockResponse = new Response(JSON.stringify({ id: '123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await post(mockEndpoint, requestBody, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });

  describe('put', () => {
    it('should make a PUT request with JSON body', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const requestBody = { name: 'Updated Test', value: 100 };
      const responseData = { id: '123', ...requestBody };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await put(mockEndpoint, requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should pass additional options to fetchJson', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const requestBody = { name: 'Test' };
      const mockResponse = new Response(JSON.stringify({ id: '123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await put(mockEndpoint, requestBody, { timeout: 5000 });

      expect(global.fetch).toHaveBeenCalledWith(mockUrl, expect.any(Object));
    });
  });

  describe('del', () => {
    it('should make a DELETE request', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const responseData = { success: true };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await del(mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('should pass additional options to fetchJson', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await del(mockEndpoint, { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });
});
