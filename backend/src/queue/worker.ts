import db from '../db/connection.js';
import { checkpointManager } from './checkpoint.js';
import { rateLimitHandler, RateLimitHandler } from './rate-limit-handler.js';
import type { Job, JobType, JobStatus } from '../../../shared/types/index.js';
import { randomUUID } from 'crypto';

/**
 * QueueWorker processes jobs sequentially from the queue.
 *
 * Features:
 * - Sequential job processing
 * - Automatic retry on failure (max 3 attempts)
 * - Checkpoint recovery for crash resilience
 * - Automatic pause/resume on rate limits
 */
export class QueueWorker {
  private isRunning = false;
  private currentJob: Job | null = null;
  private pollIntervalMs = 1000; // Check queue every second

  /**
   * Start the queue worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[QueueWorker] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[QueueWorker] Starting...');

    while (this.isRunning) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('[QueueWorker] Unexpected error in worker loop:', error);
      }

      // Wait before checking for next job
      await this.sleep(this.pollIntervalMs);
    }
  }

  /**
   * Stop the queue worker
   */
  stop(): void {
    this.isRunning = false;
    console.log('[QueueWorker] Stopping...');
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    // Pick up next pending job
    const job = this.pickupJob();
    if (!job) return;

    this.currentJob = job;

    try {
      console.log(`[QueueWorker] Starting job ${job.id} (${job.type})`);

      // Execute the job
      await this.executeJob(job);

      // Mark as completed
      this.markCompleted(job.id);
      console.log(`[QueueWorker] Completed job ${job.id}`);
    } catch (error) {
      if (RateLimitHandler.isRateLimitError(error)) {
        // Handle rate limit
        console.log('[QueueWorker] Rate limit detected, pausing queue');
        await rateLimitHandler.handleRateLimit(job);
      } else {
        // Handle other errors
        await this.retryOrFail(job, error);
      }
    } finally {
      this.currentJob = null;
    }
  }

  /**
   * Pick up the next pending job from the queue
   */
  private pickupJob(): Job | null {
    const stmt = db.prepare<[], Job>(`
      SELECT * FROM jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const job = stmt.get();
    if (!job) return null;

    // Mark as running
    const updateStmt = db.prepare(`
      UPDATE jobs
      SET status = 'running', started_at = ?
      WHERE id = ?
    `);

    updateStmt.run(new Date().toISOString(), job.id);

    // Return updated job
    return { ...job, status: 'running', started_at: new Date().toISOString() };
  }

  /**
   * Execute a job based on its type
   */
  private async executeJob(job: Job): Promise<void> {
    switch (job.type) {
      case 'generate_chapter':
        return await this.generateChapter(job);
      case 'dev_edit':
        return await this.developmentalEdit(job);
      case 'line_edit':
        return await this.lineEdit(job);
      case 'continuity_check':
        return await this.continuityCheck(job);
      case 'copy_edit':
        return await this.copyEdit(job);
      case 'generate_summary':
        return await this.generateSummary(job);
      case 'update_states':
        return await this.updateStates(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Generate a chapter (placeholder - will be implemented in Sprint 5)
   */
  private async generateChapter(job: Job): Promise<void> {
    console.log(`[Job:generate_chapter] Processing chapter ${job.target_id}`);

    // Save checkpoint
    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId: job.target_id });

    // Placeholder: Actual implementation in Sprint 5
    await this.sleep(100);

    checkpointManager.saveCheckpoint(job.id, 'completed', {});
  }

  /**
   * Developmental edit (placeholder - will be implemented in Sprint 6)
   */
  private async developmentalEdit(job: Job): Promise<void> {
    console.log(`[Job:dev_edit] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Line edit (placeholder - will be implemented in Sprint 6)
   */
  private async lineEdit(job: Job): Promise<void> {
    console.log(`[Job:line_edit] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Continuity check (placeholder - will be implemented in Sprint 6)
   */
  private async continuityCheck(job: Job): Promise<void> {
    console.log(`[Job:continuity_check] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Copy edit (placeholder - will be implemented in Sprint 6)
   */
  private async copyEdit(job: Job): Promise<void> {
    console.log(`[Job:copy_edit] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Generate summary (placeholder - will be implemented in Sprint 5)
   */
  private async generateSummary(job: Job): Promise<void> {
    console.log(`[Job:generate_summary] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Update character states (placeholder - will be implemented in Sprint 5)
   */
  private async updateStates(job: Job): Promise<void> {
    console.log(`[Job:update_states] Processing chapter ${job.target_id}`);
    await this.sleep(100);
  }

  /**
   * Mark job as completed
   */
  private markCompleted(jobId: string): void {
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), jobId);

    // Clear checkpoint
    checkpointManager.clearCheckpoint(jobId);
  }

  /**
   * Retry job or mark as failed
   */
  private async retryOrFail(job: Job, error: any): Promise<void> {
    const maxAttempts = 3;
    const newAttempts = job.attempts + 1;

    if (newAttempts < maxAttempts) {
      console.log(`[QueueWorker] Job ${job.id} failed, retrying (${newAttempts}/${maxAttempts})`);

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'pending', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, error.message, job.id);
    } else {
      console.error(`[QueueWorker] Job ${job.id} failed after ${maxAttempts} attempts`);

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'failed', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, error.message, job.id);
    }
  }

  /**
   * Create a new job
   */
  static createJob(type: JobType, targetId: string): string {
    const jobId = randomUUID();

    const stmt = db.prepare(`
      INSERT INTO jobs (id, type, target_id, status, attempts)
      VALUES (?, ?, ?, 'pending', 0)
    `);

    stmt.run(jobId, type, targetId);

    console.log(`[QueueWorker] Created job ${jobId} (${type}) for ${targetId}`);
    return jobId;
  }

  /**
   * Get queue statistics
   */
  static getQueueStats(): {
    pending: number;
    running: number;
    completed: number;
    paused: number;
    failed: number;
    total: number;
  } {
    const stmt = db.prepare<[], { status: JobStatus; count: number }>(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `);

    const results = stmt.all();

    const stats = {
      pending: 0,
      running: 0,
      completed: 0,
      paused: 0,
      failed: 0,
      total: 0,
    };

    for (const row of results) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const queueWorker = new QueueWorker();
