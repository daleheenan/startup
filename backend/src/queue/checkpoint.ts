import db from '../db/connection.js';
import type { Checkpoint, Job } from '../shared/types/index.js';

/**
 * CheckpointManager handles job state persistence for recovery.
 *
 * When a job is processing, checkpoints are saved at critical steps.
 * If the application crashes or is restarted, jobs can resume from the last checkpoint.
 */
export class CheckpointManager {
  /**
   * Save a checkpoint for a job
   */
  saveCheckpoint(jobId: string, step: string, data: any): void {
    const checkpoint: Checkpoint = {
      jobId,
      step,
      data,
      completedSteps: this.getCompletedSteps(jobId),
      timestamp: new Date().toISOString(),
    };

    console.log(`[Checkpoint] Saving checkpoint for job ${jobId} at step: ${step}`);

    const stmt = db.prepare(`
      UPDATE jobs SET checkpoint = ? WHERE id = ?
    `);

    stmt.run(JSON.stringify(checkpoint), jobId);
  }

  /**
   * Get the checkpoint for a job
   */
  getCheckpoint(jobId: string): Checkpoint | null {
    const stmt = db.prepare<[string], { checkpoint: string | null }>(`
      SELECT checkpoint FROM jobs WHERE id = ?
    `);

    const result = stmt.get(jobId);
    if (!result?.checkpoint) return null;

    try {
      return JSON.parse(result.checkpoint) as Checkpoint;
    } catch (error) {
      console.error(`[Checkpoint] Failed to parse checkpoint for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get completed steps from the checkpoint
   */
  getCompletedSteps(jobId: string): string[] {
    const checkpoint = this.getCheckpoint(jobId);
    return checkpoint?.completedSteps || [];
  }

  /**
   * Mark a step as completed
   */
  markStepCompleted(jobId: string, step: string): void {
    const checkpoint = this.getCheckpoint(jobId);
    if (!checkpoint) return;

    if (!checkpoint.completedSteps.includes(step)) {
      checkpoint.completedSteps.push(step);
    }

    const stmt = db.prepare(`
      UPDATE jobs SET checkpoint = ? WHERE id = ?
    `);

    stmt.run(JSON.stringify(checkpoint), jobId);
  }

  /**
   * Check if a step has been completed
   */
  isStepCompleted(jobId: string, step: string): boolean {
    const completedSteps = this.getCompletedSteps(jobId);
    return completedSteps.includes(step);
  }

  /**
   * Clear checkpoint (when job completes successfully)
   */
  clearCheckpoint(jobId: string): void {
    const stmt = db.prepare(`
      UPDATE jobs SET checkpoint = NULL WHERE id = ?
    `);

    stmt.run(jobId);
  }

  /**
   * Restore job state from checkpoint
   * Returns the step to resume from and any saved data
   */
  restoreFromCheckpoint(job: Job): {
    resumeFromStep: string;
    data: any;
    completedSteps: string[];
  } | null {
    if (!job.checkpoint) return null;

    try {
      const checkpoint: Checkpoint = JSON.parse(job.checkpoint);

      console.log(
        `[Checkpoint] Restoring job ${job.id} from step: ${checkpoint.step}`
      );

      return {
        resumeFromStep: checkpoint.step,
        data: checkpoint.data,
        completedSteps: checkpoint.completedSteps,
      };
    } catch (error) {
      console.error(`[Checkpoint] Failed to restore checkpoint for job ${job.id}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const checkpointManager = new CheckpointManager();
