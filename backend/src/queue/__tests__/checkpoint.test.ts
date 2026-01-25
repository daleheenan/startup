import { jest } from '@jest/globals';
import type { Job, Checkpoint } from '../../shared/types/index.js';

// Mock database connection
jest.mock('../../db/connection.js', () => ({
  default: {
    prepare: jest.fn(),
  },
}));

describe('CheckpointManager', () => {
  let CheckpointManager: any;
  let checkpointManager: any;
  let db: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked database
    const dbModule = await import('../../db/connection.js');
    db = dbModule.default;

    // Import CheckpointManager
    const checkpointModule = await import('../checkpoint.js');
    CheckpointManager = checkpointModule.CheckpointManager;
    checkpointManager = checkpointModule.checkpointManager;
  });

  describe('Checkpoint Persistence', () => {
    it('should save checkpoint with job state', () => {
      const jobId = 'job-1';
      const step = 'context_assembled';
      const data = {
        chapterId: 'chapter-1',
        estimatedTokens: 5000,
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      checkpointManager.saveCheckpoint(jobId, step, data);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs SET checkpoint = ?')
      );
      expect(mockRun).toHaveBeenCalled();

      // Verify the checkpoint JSON structure
      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      expect(checkpoint.jobId).toBe(jobId);
      expect(checkpoint.step).toBe(step);
      expect(checkpoint.data).toEqual(data);
      expect(checkpoint.timestamp).toBeDefined();
    });

    it('should include completed steps in checkpoint', () => {
      const jobId = 'job-2';
      const step = 'content_generated';
      const data = { wordCount: 3500 };

      // Mock existing checkpoint with previous steps
      const existingCheckpoint: Checkpoint = {
        jobId,
        step: 'context_assembled',
        data: {},
        completedSteps: ['started', 'context_assembled'],
        timestamp: '2026-01-25T10:00:00Z',
      };

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: JSON.stringify(existingCheckpoint),
      });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      checkpointManager.saveCheckpoint(jobId, step, data);

      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      expect(checkpoint.completedSteps).toEqual([
        'started',
        'context_assembled',
      ]);
    });

    it('should get checkpoint from database', () => {
      const jobId = 'job-3';
      const savedCheckpoint: Checkpoint = {
        jobId,
        step: 'dev_edit_complete',
        data: { suggestionsCount: 5 },
        completedSteps: ['started', 'dev_edit_complete'],
        timestamp: '2026-01-25T10:05:00Z',
      };

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: JSON.stringify(savedCheckpoint),
      });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const checkpoint = checkpointManager.getCheckpoint(jobId);

      expect(checkpoint).toEqual(savedCheckpoint);
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT checkpoint FROM jobs')
      );
    });

    it('should return null if no checkpoint exists', () => {
      const jobId = 'job-no-checkpoint';

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const checkpoint = checkpointManager.getCheckpoint(jobId);

      expect(checkpoint).toBeNull();
    });

    it('should clear checkpoint on job completion', () => {
      const jobId = 'job-4';

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      db.prepare = jest.fn(() => ({ run: mockRun }));

      checkpointManager.clearCheckpoint(jobId);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE jobs SET checkpoint = NULL')
      );
      expect(mockRun).toHaveBeenCalledWith(jobId);
    });
  });

  describe('Crash Recovery', () => {
    it('should restore job from checkpoint after crash', () => {
      const mockJob: Job = {
        id: 'job-crash-1',
        type: 'generate_chapter',
        target_id: 'chapter-crash-1',
        status: 'running',
        checkpoint: JSON.stringify({
          jobId: 'job-crash-1',
          step: 'content_generated',
          data: {
            chapterId: 'chapter-crash-1',
            wordCount: 3200,
            inputTokens: 4500,
            outputTokens: 2800,
          },
          completedSteps: ['started', 'status_updated', 'context_assembled', 'content_generated'],
          timestamp: '2026-01-25T10:10:00Z',
        }),
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const restored = checkpointManager.restoreFromCheckpoint(mockJob);

      expect(restored).not.toBeNull();
      expect(restored.resumeFromStep).toBe('content_generated');
      expect(restored.data.wordCount).toBe(3200);
      expect(restored.completedSteps).toContain('started');
      expect(restored.completedSteps).toContain('content_generated');
    });

    it('should return null if job has no checkpoint', () => {
      const mockJob: Job = {
        id: 'job-no-checkpoint',
        type: 'dev_edit',
        target_id: 'chapter-1',
        status: 'pending',
        checkpoint: null,
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: null,
        completed_at: null,
      };

      const restored = checkpointManager.restoreFromCheckpoint(mockJob);

      expect(restored).toBeNull();
    });

    it('should handle corrupted checkpoint data gracefully', () => {
      const mockJob: Job = {
        id: 'job-corrupt',
        type: 'line_edit',
        target_id: 'chapter-2',
        status: 'running',
        checkpoint: 'not-valid-json{{{',
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const restored = checkpointManager.restoreFromCheckpoint(mockJob);

      expect(restored).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restore checkpoint'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should track completed steps across multiple checkpoints', () => {
      const jobId = 'job-multi-step';

      const mockGet = jest.fn()
        .mockReturnValueOnce({ checkpoint: null })
        .mockReturnValueOnce({
          checkpoint: JSON.stringify({
            jobId,
            step: 'started',
            data: {},
            completedSteps: [],
            timestamp: '2026-01-25T10:00:00Z',
          }),
        })
        .mockReturnValueOnce({
          checkpoint: JSON.stringify({
            jobId,
            step: 'context_assembled',
            data: {},
            completedSteps: ['started'],
            timestamp: '2026-01-25T10:01:00Z',
          }),
        });

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      // Save first checkpoint
      checkpointManager.saveCheckpoint(jobId, 'started', {});

      // Save second checkpoint
      checkpointManager.saveCheckpoint(jobId, 'context_assembled', {});

      // Get completed steps
      const steps = checkpointManager.getCompletedSteps(jobId);

      expect(steps).toContain('started');
    });
  });

  describe('Partial Completion Handling', () => {
    it('should check if step is completed', () => {
      const jobId = 'job-check-step';
      const savedCheckpoint: Checkpoint = {
        jobId,
        step: 'content_generated',
        data: {},
        completedSteps: ['started', 'status_updated', 'context_assembled'],
        timestamp: '2026-01-25T10:05:00Z',
      };

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: JSON.stringify(savedCheckpoint),
      });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      expect(checkpointManager.isStepCompleted(jobId, 'started')).toBe(true);
      expect(checkpointManager.isStepCompleted(jobId, 'status_updated')).toBe(true);
      expect(checkpointManager.isStepCompleted(jobId, 'content_generated')).toBe(false);
      expect(checkpointManager.isStepCompleted(jobId, 'not_started_yet')).toBe(false);
    });

    it('should mark step as completed', () => {
      const jobId = 'job-mark-step';
      const initialCheckpoint: Checkpoint = {
        jobId,
        step: 'context_assembled',
        data: {},
        completedSteps: ['started'],
        timestamp: '2026-01-25T10:00:00Z',
      };

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: JSON.stringify(initialCheckpoint),
      });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      checkpointManager.markStepCompleted(jobId, 'context_assembled');

      // Verify the step was added to completedSteps
      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      expect(checkpoint.completedSteps).toContain('started');
      expect(checkpoint.completedSteps).toContain('context_assembled');
    });

    it('should not duplicate completed steps', () => {
      const jobId = 'job-no-duplicate';
      const initialCheckpoint: Checkpoint = {
        jobId,
        step: 'status_updated',
        data: {},
        completedSteps: ['started', 'status_updated'],
        timestamp: '2026-01-25T10:00:00Z',
      };

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: JSON.stringify(initialCheckpoint),
      });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      // Try to mark already completed step
      checkpointManager.markStepCompleted(jobId, 'started');

      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      // Should still only have one 'started' entry
      const startedCount = checkpoint.completedSteps.filter(
        (s: string) => s === 'started'
      ).length;
      expect(startedCount).toBe(1);
    });

    it('should handle marking step when no checkpoint exists', () => {
      const jobId = 'job-no-checkpoint-mark';

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      // Should not throw, just return early
      checkpointManager.markStepCompleted(jobId, 'some_step');

      // No update should be called
      expect(db.prepare).toHaveBeenCalledTimes(1); // Only SELECT, no UPDATE
    });

    it('should return empty array for completed steps when no checkpoint', () => {
      const jobId = 'job-no-steps';

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const steps = checkpointManager.getCompletedSteps(jobId);

      expect(steps).toEqual([]);
    });
  });

  describe('Complex Recovery Scenarios', () => {
    it('should recover from failure during chapter generation', () => {
      const mockJob: Job = {
        id: 'job-recovery-1',
        type: 'generate_chapter',
        target_id: 'chapter-recovery-1',
        status: 'running',
        checkpoint: JSON.stringify({
          jobId: 'job-recovery-1',
          step: 'context_assembled',
          data: {
            chapterId: 'chapter-recovery-1',
            estimatedTokens: 5500,
          },
          completedSteps: ['started', 'status_updated', 'context_assembled'],
          timestamp: '2026-01-25T10:05:00Z',
        }),
        error: 'Connection timeout',
        attempts: 1,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:01:00Z',
        completed_at: null,
      };

      const restored = checkpointManager.restoreFromCheckpoint(mockJob);

      // Should resume from where it left off
      expect(restored.resumeFromStep).toBe('context_assembled');
      expect(restored.data.chapterId).toBe('chapter-recovery-1');
      expect(restored.completedSteps).toContain('context_assembled');

      // Can skip already completed steps
      expect(restored.completedSteps).toContain('started');
      expect(restored.completedSteps).toContain('status_updated');
    });

    it('should handle checkpoint from multi-step editing pipeline', () => {
      const mockJob: Job = {
        id: 'job-editing-pipeline',
        type: 'dev_edit',
        target_id: 'chapter-edit',
        status: 'running',
        checkpoint: JSON.stringify({
          jobId: 'job-editing-pipeline',
          step: 'dev_edit_complete',
          data: {
            chapterId: 'chapter-edit',
            suggestionsCount: 12,
            flagsCount: 3,
            needsRevision: true,
          },
          completedSteps: ['started', 'dev_edit_complete'],
          timestamp: '2026-01-25T10:10:00Z',
        }),
        error: null,
        attempts: 0,
        created_at: '2026-01-25T10:00:00Z',
        started_at: '2026-01-25T10:05:00Z',
        completed_at: null,
      };

      const restored = checkpointManager.restoreFromCheckpoint(mockJob);

      expect(restored.resumeFromStep).toBe('dev_edit_complete');
      expect(restored.data.needsRevision).toBe(true);
      expect(restored.data.suggestionsCount).toBe(12);
    });

    it('should preserve checkpoint data types correctly', () => {
      const jobId = 'job-data-types';
      const complexData = {
        chapterId: 'chapter-1',
        wordCount: 3500,
        isComplete: true,
        metrics: {
          tokens: 4500,
          cost: 0.05,
        },
        tags: ['action', 'dialogue', 'climax'],
      };

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      checkpointManager.saveCheckpoint(jobId, 'test_step', complexData);

      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      expect(checkpoint.data.chapterId).toBe('chapter-1');
      expect(checkpoint.data.wordCount).toBe(3500);
      expect(checkpoint.data.isComplete).toBe(true);
      expect(checkpoint.data.metrics.tokens).toBe(4500);
      expect(checkpoint.data.tags).toEqual(['action', 'dialogue', 'climax']);
    });

    it('should handle empty data in checkpoint', () => {
      const jobId = 'job-empty-data';

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      checkpointManager.saveCheckpoint(jobId, 'started', {});

      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      expect(checkpoint.data).toEqual({});
      expect(checkpoint.step).toBe('started');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when saving checkpoint', () => {
      const jobId = 'job-db-error';

      const mockRun = jest.fn().mockImplementation(() => {
        throw new Error('Database write failed');
      });
      db.prepare = jest.fn(() => ({ run: mockRun, get: jest.fn() }));

      expect(() => {
        checkpointManager.saveCheckpoint(jobId, 'test', {});
      }).toThrow('Database write failed');
    });

    it('should handle invalid JSON when getting checkpoint', () => {
      const jobId = 'job-invalid-json';

      const mockGet = jest.fn().mockReturnValue({
        checkpoint: '{invalid json}',
      });
      db.prepare = jest.fn(() => ({ get: mockGet }));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const checkpoint = checkpointManager.getCheckpoint(jobId);

      expect(checkpoint).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle timestamp generation', () => {
      const jobId = 'job-timestamp';

      const mockGet = jest.fn().mockReturnValue({ checkpoint: null });
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      db.prepare = jest.fn((query: string) => {
        if (query.includes('SELECT')) {
          return { get: mockGet };
        }
        return { run: mockRun };
      });

      const beforeTime = new Date().toISOString();
      checkpointManager.saveCheckpoint(jobId, 'test', {});
      const afterTime = new Date().toISOString();

      const callArgs = mockRun.mock.calls[0];
      const checkpointJson = callArgs[0];
      const checkpoint = JSON.parse(checkpointJson as string);

      // Timestamp should be between before and after
      expect(checkpoint.timestamp).toBeDefined();
      expect(checkpoint.timestamp >= beforeTime).toBe(true);
      expect(checkpoint.timestamp <= afterTime).toBe(true);
    });
  });
});
