import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHealth, getQueueStats, createTestJob } from '../api';
import * as auth from '../auth';

// Mock the auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(),
  logout: vi.fn(),
}));

describe('api', () => {
  const mockToken = 'mock-jwt-token';
  const mockApiBaseUrl = 'http://localhost:3001';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should check backend health successfully', async () => {
      const mockHealthData = {
        status: 'ok',
        timestamp: '2026-01-27T10:00:00Z',
      };
      const mockResponse = new Response(JSON.stringify(mockHealthData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await checkHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/health`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockHealthData);
    });

    it('should throw error when backend is not responding', async () => {
      const mockResponse = new Response('Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(checkHealth()).rejects.toThrow(
        'Backend server is not responding'
      );
    });

    it('should throw error when fetch fails', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(checkHealth()).rejects.toThrow('Network error');
    });

    it('should handle 404 response', async () => {
      const mockResponse = new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(checkHealth()).rejects.toThrow(
        'Backend server is not responding'
      );
    });

    it('should handle 503 response', async () => {
      const mockResponse = new Response('Service Unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(checkHealth()).rejects.toThrow(
        'Backend server is not responding'
      );
    });
  });

  describe('getQueueStats', () => {
    it('should fetch queue statistics with authentication', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockStatsData = {
        queue: {
          pending: 5,
          running: 2,
          completed: 100,
          paused: 0,
          failed: 3,
          total: 110,
        },
        session: {
          isActive: true,
          requestsThisSession: 25,
          timeRemaining: '35 minutes',
          resetTime: '2026-01-27T11:00:00Z',
        },
      };
      const mockResponse = new Response(JSON.stringify(mockStatsData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await getQueueStats();

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/queue/stats`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(mockStatsData);
    });

    it('should include auth header when token is available', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response(JSON.stringify({ queue: {}, session: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await getQueueStats();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should not include auth header when token is null', async () => {
      vi.mocked(auth.getToken).mockReturnValue(null);
      const mockResponse = new Response(JSON.stringify({ queue: {}, session: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await getQueueStats();

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1]?.headers as Record<string, string>) || {};
      expect(headers.Authorization).toBeUndefined();
    });

    it('should throw error when request fails', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Bad Request', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(getQueueStats()).rejects.toThrow('Failed to fetch queue stats');
    });

    it('should handle network errors', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(getQueueStats()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // 401 triggers logout and session expired error
      await expect(getQueueStats()).rejects.toThrow('Session expired');
    });

    it('should parse response with all queue states', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockStatsData = {
        queue: {
          pending: 10,
          running: 5,
          completed: 200,
          paused: 2,
          failed: 8,
          total: 225,
        },
        session: {
          isActive: false,
          requestsThisSession: 0,
          timeRemaining: '0 minutes',
          resetTime: null,
        },
      };
      const mockResponse = new Response(JSON.stringify(mockStatsData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await getQueueStats();

      expect(result.queue.pending).toBe(10);
      expect(result.queue.running).toBe(5);
      expect(result.queue.completed).toBe(200);
      expect(result.queue.paused).toBe(2);
      expect(result.queue.failed).toBe(8);
      expect(result.queue.total).toBe(225);
      expect(result.session.isActive).toBe(false);
      expect(result.session.resetTime).toBeNull();
    });
  });

  describe('createTestJob', () => {
    it('should create a test job with type and target ID', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const jobType = 'test-job-type';
      const targetId = 'target-123';
      const mockResponseData = {
        jobId: 'job-456',
        status: 'pending',
        type: jobType,
        targetId: targetId,
      };
      const mockResponse = new Response(JSON.stringify(mockResponseData), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await createTestJob(jobType, targetId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/api/queue/test`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify({ type: jobType, targetId: targetId }),
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should include authentication token in request', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response(JSON.stringify({ jobId: 'job-456' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await createTestJob('test-type', 'test-id');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should send correct request body', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const jobType = 'chapter-generation';
      const targetId = 'chapter-789';
      const mockResponse = new Response(JSON.stringify({ jobId: 'job-456' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await createTestJob(jobType, targetId);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = fetchCall[1]?.body as string;
      expect(JSON.parse(body)).toEqual({
        type: jobType,
        targetId: targetId,
      });
    });

    it('should throw error when request fails', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(createTestJob('test-type', 'test-id')).rejects.toThrow(
        'Failed to create test job'
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'));

      await expect(createTestJob('test-type', 'test-id')).rejects.toThrow(
        'Connection refused'
      );
    });

    it('should handle 401 unauthorized response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // 401 triggers logout and session expired error
      await expect(createTestJob('test-type', 'test-id')).rejects.toThrow(
        'Session expired'
      );
    });

    it('should handle 400 bad request response', async () => {
      vi.mocked(auth.getToken).mockReturnValue(mockToken);
      const mockResponse = new Response('Bad Request', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(createTestJob('invalid-type', '')).rejects.toThrow(
        'Failed to create test job'
      );
    });

    it('should work without authentication token', async () => {
      vi.mocked(auth.getToken).mockReturnValue(null);
      const mockResponse = new Response(JSON.stringify({ jobId: 'job-456' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await createTestJob('test-type', 'test-id');

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1]?.headers as Record<string, string>) || {};
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
