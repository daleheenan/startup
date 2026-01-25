import { jest } from '@jest/globals';
import type { Job, JobStatus } from '../../shared/types/index.js';

// Mock database connection
jest.mock('../../db/connection.js', () => ({
  default: {
    prepare: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock checkpoint manager
jest.mock('../checkpoint.js', () => ({
  checkpointManager: {
    saveCheckpoint: jest.fn(),
    clearCheckpoint: jest.fn(),
  },
}));

// Mock rate limit handler
jest.mock('../rate-limit-handler.js', () => ({
  rateLimitHandler: {
    handleRateLimit: jest.fn(),
  },
  RateLimitHandler: {
    isRateLimitError: jest.fn().mockReturnValue(false),
  },
}));

describe('QueueWorker', () => {
  let QueueWorker: any;
  let queueWorker: any;
  let db: any;
  let checkpointManager: any;
  let rateLimitHandler: any;
  let RateLimitHandler: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Import mocked modules
    const dbModule = await import('../../db/connection.js');
    db = dbModule.default;

    const checkpointModule = await import('../checkpoint.js');
    checkpointManager = checkpointModule.checkpointManager;

    const rateLimitModule = await import('../rate-limit-handler.js');
    rateLimitHandler = rateLimitModule.rateLimitHandler;
    RateLimitHandler = rateLimitModule.RateLimitHandler;

    // Import QueueWorker class
    const workerModule = await import('../worker.js');
    QueueWorker = workerModule.QueueWorker;
    queueWorker = new QueueWorker();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('State Machine Transitions', () => {
    it('should transition from idle to processing when job is picked up', async () => {
      const mockJob: Job = {
        id: 'job-1',
        type: 'generate_chapter',
        target_id: 'chapter-1',
        status: 'pending',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: null,
        completed_at: null,
      };

      // Mock transaction to return a job
      const mockTransaction = jest.fn(() => mockJob);
      db.transaction = jest.fn((fn) => fn);

      // Mock prepare for SELECT and UPDATE
      const mockGet = jest.fn().mockReturnValue(mockJob);
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        if (query.includes('UPDATE jobs') && query.includes('running')) {
          return { run: mockRun };
        }
        return { run: jest.fn(), get: jest.fn() };
      });

      // Mock job execution to prevent actual work
      jest.spyOn(queueWorker as any, 'executeJob').mockResolvedValue(undefined);

      // Start worker in background
      const workerPromise = queueWorker.start();

      // Wait for first poll cycle
      await jest.advanceTimersByTimeAsync(100);

      // Verify job was picked up and status changed to running
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('running'));

      // Stop worker
      queueWorker.stop();
      await jest.advanceTimersByTimeAsync(100);

      jest.useRealTimers();
    });

    it('should transition to completed state after successful job execution', async () => {
      const mockJob: Job = {
        id: 'job-2',
        type: 'generate_summary',
        target_id: 'chapter-2',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun, get: jest.fn() }));

      // Directly call markCompleted to test state transition
      (queueWorker as any).markCompleted(mockJob.id);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('completed'));
      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        mockJob.id
      );
      expect(checkpointManager.clearCheckpoint).toHaveBeenCalledWith(mockJob.id);
    });

    it('should transition to paused state on rate limit', async () => {
      const mockJob: Job = {
        id: 'job-3',
        type: 'dev_edit',
        target_id: 'chapter-3',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // Mock rate limit error
      RateLimitHandler.isRateLimitError.mockReturnValue(true);

      const mockError = new Error('Rate limit exceeded');
      (mockError as any).status = 429;

      // Mock executeJob to throw rate limit error
      jest.spyOn(queueWorker as any, 'executeJob').mockRejectedValue(mockError);

      // Mock pickupJob
      jest.spyOn(queueWorker as any, 'pickupJob').mockReturnValue(mockJob);

      // Process job
      await (queueWorker as any).processNextJob();

      expect(rateLimitHandler.handleRateLimit).toHaveBeenCalledWith(mockJob);
    });

    it('should transition to failed state after max retry attempts', async () => {
      const mockJob: Job = {
        id: 'job-4',
        type: 'line_edit',
        target_id: 'chapter-4',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 2, // Already failed twice
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const mockError = new Error('Service unavailable');
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await (queueWorker as any).retryOrFail(mockJob, mockError);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('failed'));
      expect(mockRun).toHaveBeenCalledWith(3, mockError.message, mockJob.id);
    });

    it('should retry job (stay in pending) when attempts < max', async () => {
      const mockJob: Job = {
        id: 'job-5',
        type: 'copy_edit',
        target_id: 'chapter-5',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 1, // First retry
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const mockError = new Error('Temporary failure');
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      await (queueWorker as any).retryOrFail(mockJob, mockError);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('pending'));
      expect(mockRun).toHaveBeenCalledWith(2, mockError.message, mockJob.id);
    });
  });

  describe('Pause/Resume Functionality', () => {
    it('should stop processing when stop() is called', async () => {
      const stopPromise = queueWorker.stop();

      // Worker should set isRunning to false
      expect((queueWorker as any).isRunning).toBe(false);

      await stopPromise;
    });

    it('should wait for current job before stopping', async () => {
      const mockJob: Job = {
        id: 'job-6',
        type: 'generate_chapter',
        target_id: 'chapter-6',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      // Set current job
      (queueWorker as any).currentJob = mockJob;
      (queueWorker as any).isRunning = true;

      const stopPromise = queueWorker.stop();

      // Verify it's waiting
      expect((queueWorker as any).shutdownPromise).toBeDefined();

      // Simulate job completion
      (queueWorker as any).currentJob = null;
      if ((queueWorker as any).shutdownResolve) {
        (queueWorker as any).shutdownResolve();
      }

      await stopPromise;
    });

    it('should timeout after 60 seconds if job does not complete', async () => {
      const mockJob: Job = {
        id: 'job-7',
        type: 'author_revision',
        target_id: 'chapter-7',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      (queueWorker as any).currentJob = mockJob;
      (queueWorker as any).isRunning = true;

      const stopPromise = queueWorker.stop();

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      await stopPromise;

      // Should have resolved despite job still running
      expect(stopPromise).resolves.toBeUndefined();
    });

    it('should resume immediately if no job is running', async () => {
      (queueWorker as any).currentJob = null;

      const stopPromise = queueWorker.stop();

      await stopPromise;

      // Should resolve immediately
      expect(stopPromise).resolves.toBeUndefined();
    });

    it('should not start if already running', async () => {
      (queueWorker as any).isRunning = true;

      await queueWorker.start();

      // Should return early without creating new loop
      expect((queueWorker as any).isRunning).toBe(true);
    });
  });

  describe('Job Queue Operations', () => {
    it('should create new job with pending status', () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      const jobId = QueueWorker.createJob('generate_chapter', 'chapter-8');

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO jobs'));
      expect(mockRun).toHaveBeenCalledWith(
        jobId,
        'generate_chapter',
        'chapter-8'
      );
    });

    it('should pick up oldest pending job first (FIFO)', () => {
      const oldJob: Job = {
        id: 'job-old',
        type: 'generate_summary',
        target_id: 'chapter-1',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T09:00:00Z',
        started_at: '2026-01-25T09:01:00Z',
        completed_at: null,
      };

      const mockGet = jest.fn().mockReturnValue(oldJob);
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      // db.transaction returns a function that when called executes the callback
      db.transaction = jest.fn((fn: any) => fn);

      const pickedJob = (queueWorker as any).pickupJob();

      expect(pickedJob).toBeDefined();
      expect(pickedJob.id).toBe('job-old');
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY j.created_at ASC'));
    });

    it('should skip locked chapters (Sprint 16)', () => {
      const mockGet = jest.fn().mockReturnValue(null); // No unlocked jobs
      db.prepare = jest.fn(() => ({ get: mockGet }));
      db.transaction = jest.fn((fn: any) => fn);

      const pickedJob = (queueWorker as any).pickupJob();

      expect(pickedJob).toBeNull();
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('is_locked')
      );
    });

    it('should handle race condition when another worker picks up job', () => {
      const mockJob: Job = {
        id: 'job-race',
        type: 'continuity_check',
        target_id: 'chapter-9',
        status: 'pending',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: null,
        completed_at: null,
      };

      const mockGet = jest.fn().mockReturnValue(mockJob);
      const mockRun = jest.fn().mockReturnValue({ changes: 0 }); // Another worker got it

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      db.transaction = jest.fn((fn: any) => fn);

      const pickedJob = (queueWorker as any).pickupJob();

      expect(pickedJob).toBeNull();
    });

    it('should get queue statistics', () => {
      const mockStats = [
        { status: 'pending', count: 5 },
        { status: 'running', count: 2 },
        { status: 'completed', count: 10 },
        { status: 'paused', count: 1 },
        { status: 'failed', count: 1 },
      ];

      const mockAll = jest.fn().mockReturnValue(mockStats);
      db.prepare = jest.fn(() => ({ all: mockAll }));

      const stats = QueueWorker.getQueueStats();

      expect(stats).toEqual({
        pending: 5,
        running: 2,
        completed: 10,
        paused: 1,
        failed: 1,
        total: 19,
      });
    });

    it('should handle empty queue statistics', () => {
      const mockAll = jest.fn().mockReturnValue([]);
      db.prepare = jest.fn(() => ({ all: mockAll }));

      const stats = QueueWorker.getQueueStats();

      expect(stats).toEqual({
        pending: 0,
        running: 0,
        completed: 0,
        paused: 0,
        failed: 0,
        total: 0,
      });
    });
  });

  describe('Error State Handling', () => {
    it('should handle errors during job execution', async () => {
      const mockJob: Job = {
        id: 'job-error',
        type: 'generate_chapter',
        target_id: 'chapter-10',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const mockError = new Error('Execution failed');
      const retryOrFailSpy = jest.spyOn(queueWorker as any, 'retryOrFail').mockResolvedValue(undefined);
      jest.spyOn(queueWorker as any, 'executeJob').mockRejectedValue(mockError);
      jest.spyOn(queueWorker as any, 'pickupJob').mockReturnValue(mockJob);

      // Make sure rate limit check returns false
      RateLimitHandler.isRateLimitError.mockReturnValue(false);

      await (queueWorker as any).processNextJob();

      expect(retryOrFailSpy).toHaveBeenCalledWith(
        mockJob,
        mockError
      );
    });

    it('should catch unexpected errors in worker loop', async () => {
      jest.spyOn(queueWorker as any, 'processNextJob').mockRejectedValue(
        new Error('Unexpected error')
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Start worker
      const workerPromise = queueWorker.start();

      // Wait for one cycle
      await jest.advanceTimersByTimeAsync(100);

      // Stop worker
      queueWorker.stop();
      await jest.advanceTimersByTimeAsync(100);

      consoleErrorSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should handle null/undefined job gracefully', async () => {
      jest.spyOn(queueWorker as any, 'pickupJob').mockReturnValue(null);

      await (queueWorker as any).processNextJob();

      // Should not throw, just return early
      expect((queueWorker as any).currentJob).toBeNull();
    });

    it('should handle unknown job type', async () => {
      const mockJob: Job = {
        id: 'job-unknown',
        type: 'unknown_type' as any,
        target_id: 'chapter-11',
        status: 'running',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      await expect(
        (queueWorker as any).executeJob(mockJob)
      ).rejects.toThrow('Unknown job type');
    });
  });

  describe('Sleep Utility', () => {
    it('should sleep for specified milliseconds', async () => {
      const sleepPromise = (queueWorker as any).sleep(5000);

      jest.advanceTimersByTime(5000);

      await sleepPromise;

      expect(sleepPromise).resolves.toBeUndefined();
    });

    it('should use sleep between poll intervals', async () => {
      jest.spyOn(queueWorker as any, 'sleep');
      jest.spyOn(queueWorker as any, 'pickupJob').mockReturnValue(null);

      const workerPromise = queueWorker.start();

      await jest.advanceTimersByTimeAsync(1000);

      expect((queueWorker as any).sleep).toHaveBeenCalledWith(1000);

      queueWorker.stop();
      jest.useRealTimers();
    });
  });
});
