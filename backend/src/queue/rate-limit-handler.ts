import db from '../db/connection.js';
import { sessionTracker } from '../services/session-tracker.js';
import type { Job } from '../shared/types/index.js';

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetTime: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * RateLimitHandler manages automatic pause/resume when hitting Claude API rate limits.
 *
 * When a rate limit is detected:
 * 1. Current job is paused
 * 2. Calculate precise wait time until session reset
 * 3. Wait for session reset
 * 4. Resume all paused jobs
 */
export class RateLimitHandler {
  /**
   * Handle a rate limit error
   * Pauses the current job and waits for session reset
   */
  async handleRateLimit(job: Job): Promise<void> {
    console.log(`[RateLimitHandler] Rate limit hit on job ${job.id}`);

    // Pause the job
    await this.pauseJob(job.id);

    // Calculate precise wait time
    const waitMs = sessionTracker.getTimeUntilReset();

    // If no wait time, session has already reset
    if (waitMs === 0) {
      console.log('[RateLimitHandler] Session has already reset, resuming immediately');
      await this.resumePausedJobs();
      return;
    }

    const waitMinutes = Math.round(waitMs / 1000 / 60);
    console.log(
      `[RateLimitHandler] Pausing queue. Waiting ${waitMinutes} minutes until session reset...`
    );
    console.log(
      `[RateLimitHandler] Session will reset at: ${sessionTracker.getCurrentSession()?.session_resets_at}`
    );

    // Wait until session resets
    await this.sleep(waitMs);

    console.log('[RateLimitHandler] Session has reset. Clearing session and resuming jobs...');

    // Clear session tracking
    sessionTracker.clearSession();

    // Resume all paused jobs
    await this.resumePausedJobs();
  }

  /**
   * Pause a specific job
   */
  private async pauseJob(jobId: string): Promise<void> {
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'paused'
      WHERE id = ?
    `);

    stmt.run(jobId);
    console.log(`[RateLimitHandler] Paused job ${jobId}`);
  }

  /**
   * Resume all paused jobs
   */
  private async resumePausedJobs(): Promise<void> {
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'pending'
      WHERE status = 'paused'
    `);

    const result = stmt.run();
    console.log(`[RateLimitHandler] Resumed ${result.changes} paused job(s)`);
  }

  /**
   * Check if an error is a rate limit error
   */
  static isRateLimitError(error: any): boolean {
    if (error instanceof RateLimitError) return true;

    // Check for Anthropic SDK rate limit error
    if (error?.status === 429) return true;
    if (error?.error?.type === 'rate_limit_error') return true;
    if (error?.message?.includes('rate limit')) return true;

    return false;
  }

  /**
   * Get count of paused jobs
   */
  getPausedJobsCount(): number {
    const stmt = db.prepare<[], { count: number }>(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'paused'
    `);

    const result = stmt.get();
    return result?.count || 0;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Conservative fallback: Wait 30 minutes if session tracking fails
   */
  async handleRateLimitFallback(): Promise<void> {
    const fallbackWaitMs = 30 * 60 * 1000; // 30 minutes
    console.log('[RateLimitHandler] Using conservative 30-minute fallback wait');

    await this.sleep(fallbackWaitMs);
    sessionTracker.clearSession();
    await this.resumePausedJobs();
  }
}

// Export singleton instance
export const rateLimitHandler = new RateLimitHandler();
