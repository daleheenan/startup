import { jest } from '@jest/globals';
import type { Job } from '../../shared/types/index.js';

// Mock database connection
jest.mock('../../db/connection.js', () => ({
  default: {
    prepare: jest.fn(),
  },
}));

// Mock session tracker
jest.mock('../../services/session-tracker.js', () => ({
  sessionTracker: {
    getTimeUntilReset: jest.fn(),
    getCurrentSession: jest.fn(),
    clearSession: jest.fn(),
  },
}));

// Mock logger service
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('RateLimitHandler', () => {
  let RateLimitHandler: any;
  let RateLimitError: any;
  let rateLimitHandler: any;
  let db: any;
  let sessionTracker: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Import mocked modules
    const dbModule = await import('../../db/connection.js');
    db = dbModule.default;

    const sessionTrackerModule = await import('../../services/session-tracker.js');
    sessionTracker = sessionTrackerModule.sessionTracker;

    // Import RateLimitHandler
    const rateLimitModule = await import('../rate-limit-handler.js');
    RateLimitHandler = rateLimitModule.RateLimitHandler;
    RateLimitError = rateLimitModule.RateLimitError;
    rateLimitHandler = rateLimitModule.rateLimitHandler;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rate Limit Detection', () => {
    it('should detect RateLimitError instance', () => {
      const resetTime = new Date('2026-01-25T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', resetTime);

      expect(RateLimitHandler.isRateLimitError(error)).toBe(true);
    });

    it('should detect 429 status code', () => {
      const error: any = new Error('Too many requests');
      error.status = 429;

      expect(RateLimitHandler.isRateLimitError(error)).toBe(true);
    });

    it('should detect rate_limit_error type from Anthropic SDK', () => {
      const error: any = new Error('Rate limit');
      error.error = { type: 'rate_limit_error' };

      expect(RateLimitHandler.isRateLimitError(error)).toBe(true);
    });

    it('should detect rate limit in error message', () => {
      const error = new Error('Request failed: rate limit exceeded');

      expect(RateLimitHandler.isRateLimitError(error)).toBe(true);
    });

    it('should not detect non-rate-limit errors', () => {
      const error = new Error('Network connection failed');

      expect(RateLimitHandler.isRateLimitError(error)).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(RateLimitHandler.isRateLimitError(null)).toBe(false);
      expect(RateLimitHandler.isRateLimitError(undefined)).toBe(false);
    });

    it('should handle errors with partial properties', () => {
      const error: any = new Error('Something');
      error.status = 500; // Not 429

      expect(RateLimitHandler.isRateLimitError(error)).toBe(false);
    });
  });

  describe('Auto-Resume Timing', () => {
    it('should wait for session reset before resuming', async () => {
      const mockJob: Job = {
        id: 'job-1',
        type: 'generate_chapter',
        target_id: 'chapter-1',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // Mock 30 minutes until reset
      sessionTracker.getTimeUntilReset.mockReturnValue(30 * 60 * 1000);
      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-25T10:30:00Z',
      });

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      // Verify job was paused
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('paused')
      );

      // Fast-forward 30 minutes
      await jest.advanceTimersByTimeAsync(30 * 60 * 1000);

      await handlePromise;

      // Verify session was cleared
      expect(sessionTracker.clearSession).toHaveBeenCalled();

      // Verify jobs were resumed
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('pending')
      );
    });

    it('should resume immediately if session already reset', async () => {
      const mockJob: Job = {
        id: 'job-2',
        type: 'dev_edit',
        target_id: 'chapter-2',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // Session already reset
      sessionTracker.getTimeUntilReset.mockReturnValue(0);

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await rateLimitHandler.handleRateLimit(mockJob);

      // Should resume immediately without waiting
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('pending')
      );
    });

    it('should use correct wait time calculations', async () => {
      const mockJob: Job = {
        id: 'job-3',
        type: 'line_edit',
        target_id: 'chapter-3',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // 15 minutes 30 seconds until reset
      const waitMs = 15 * 60 * 1000 + 30 * 1000;
      sessionTracker.getTimeUntilReset.mockReturnValue(waitMs);
      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-25T10:16:30Z',
      });

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      await jest.advanceTimersByTimeAsync(waitMs);
      await handlePromise;

      // Verify logger was called with correct wait time (16 minutes)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          waitMinutes: 16,
          sessionResetAt: '2026-01-25T10:16:30Z',
        }),
        'Pausing queue until session reset'
      );
    });

    it('should handle very short wait times', async () => {
      const mockJob: Job = {
        id: 'job-4',
        type: 'copy_edit',
        target_id: 'chapter-4',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // Only 30 seconds until reset
      sessionTracker.getTimeUntilReset.mockReturnValue(30 * 1000);
      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-25T10:01:30Z',
      });

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      await jest.advanceTimersByTimeAsync(30 * 1000);
      await handlePromise;

      expect(sessionTracker.clearSession).toHaveBeenCalled();
    });
  });

  describe('Job Pause and Resume', () => {
    it('should pause specific job', async () => {
      const mockJob: Job = {
        id: 'job-5',
        type: 'continuity_check',
        target_id: 'chapter-5',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(0);

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await rateLimitHandler.handleRateLimit(mockJob);

      // Verify pause query was executed
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('paused')
      );
      expect(mockRun).toHaveBeenCalledWith(mockJob.id);
    });

    it('should resume all paused jobs', async () => {
      const mockJob: Job = {
        id: 'job-6',
        type: 'generate_summary',
        target_id: 'chapter-6',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(0);

      const mockRun = jest.fn().mockReturnValue({ changes: 3 }); // 3 jobs resumed
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await rateLimitHandler.handleRateLimit(mockJob);

      // Verify resume query was executed
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('pending')
      );

      // Verify logger shows count
      expect(mockLogger.info).toHaveBeenCalledWith(
        { count: 3 },
        'Paused jobs resumed'
      );
    });

    it('should handle case where no jobs are resumed', async () => {
      const mockJob: Job = {
        id: 'job-7',
        type: 'update_states',
        target_id: 'chapter-7',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(0);

      const mockRun = jest.fn().mockReturnValue({ changes: 0 }); // No jobs to resume
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await rateLimitHandler.handleRateLimit(mockJob);

      // Should not throw error
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should get count of paused jobs', () => {
      const mockGet = jest.fn().mockReturnValue({ count: 5 });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const count = rateLimitHandler.getPausedJobsCount();

      expect(count).toBe(5);
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('paused')
      );
    });

    it('should return 0 if no paused jobs', () => {
      const mockGet = jest.fn().mockReturnValue({ count: 0 });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const count = rateLimitHandler.getPausedJobsCount();

      expect(count).toBe(0);
    });

    it('should handle null result from paused jobs query', () => {
      const mockGet = jest.fn().mockReturnValue(null);
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const count = rateLimitHandler.getPausedJobsCount();

      expect(count).toBe(0);
    });
  });

  describe('Fallback Handler', () => {
    it('should wait 30 minutes for conservative fallback', async () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const fallbackPromise = rateLimitHandler.handleRateLimitFallback();

      // Verify fallback message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { waitMinutes: 30 },
        'Using conservative fallback wait'
      );

      // Fast-forward 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      await fallbackPromise;

      // Verify session cleared and jobs resumed
      expect(sessionTracker.clearSession).toHaveBeenCalled();
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('pending')
      );
    });

    it('should use fallback when session tracking unavailable', async () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 2 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const fallbackPromise = rateLimitHandler.handleRateLimitFallback();

      jest.advanceTimersByTime(30 * 60 * 1000);

      await fallbackPromise;

      expect(sessionTracker.clearSession).toHaveBeenCalled();
    });
  });

  describe('RateLimitError Class', () => {
    it('should create RateLimitError with reset time', () => {
      const resetTime = new Date('2026-01-25T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', resetTime);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.resetTime).toEqual(resetTime);
      expect(error.name).toBe('RateLimitError');
    });

    it('should be instance of Error', () => {
      const resetTime = new Date();
      const error = new RateLimitError('Test', resetTime);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof RateLimitError).toBe(true);
    });

    it('should preserve stack trace', () => {
      const resetTime = new Date();
      const error = new RateLimitError('Test error', resetTime);

      expect(error.stack).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle session tracker returning null', async () => {
      const mockJob: Job = {
        id: 'job-8',
        type: 'author_revision',
        target_id: 'chapter-8',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(0);
      sessionTracker.getCurrentSession.mockReturnValue(null);

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await rateLimitHandler.handleRateLimit(mockJob);

      // Should still work, just resume immediately
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should handle database errors gracefully during pause', async () => {
      const mockJob: Job = {
        id: 'job-9',
        type: 'generate_chapter',
        target_id: 'chapter-9',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(0);

      const mockRun = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await expect(
        rateLimitHandler.handleRateLimit(mockJob)
      ).rejects.toThrow('Database error');
    });

    it('should handle very large wait times', async () => {
      const mockJob: Job = {
        id: 'job-10',
        type: 'dev_edit',
        target_id: 'chapter-10',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // 2 hours until reset
      sessionTracker.getTimeUntilReset.mockReturnValue(2 * 60 * 60 * 1000);
      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-25T12:00:00Z',
      });

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      await jest.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

      await handlePromise;

      expect(sessionTracker.clearSession).toHaveBeenCalled();
    });
  });

  describe('Jest Fake Timers Integration', () => {
    it('should work correctly with Jest fake timers', async () => {
      const mockJob: Job = {
        id: 'job-timer',
        type: 'line_edit',
        target_id: 'chapter-timer',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(10 * 60 * 1000); // 10 minutes

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      // Advance timers incrementally
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000); // 10 minutes total

      await handlePromise;

      expect(sessionTracker.clearSession).toHaveBeenCalled();
    });

    it('should handle advanceTimersByTimeAsync for async operations', async () => {
      const mockJob: Job = {
        id: 'job-async',
        type: 'copy_edit',
        target_id: 'chapter-async',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      sessionTracker.getTimeUntilReset.mockReturnValue(5 * 60 * 1000);

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const handlePromise = rateLimitHandler.handleRateLimit(mockJob);

      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

      await handlePromise;

      expect(sessionTracker.clearSession).toHaveBeenCalled();
    });
  });
});
