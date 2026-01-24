import db from '../db/connection.js';
import type { SessionTracking } from '../../shared/types/index.js';

/**
 * SessionTracker manages Claude Max subscription session tracking.
 *
 * A session lasts 5 hours from the first API request.
 * This class tracks when sessions start, calculates precise reset times,
 * and helps manage rate limits automatically.
 */
export class SessionTracker {
  private static readonly SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours

  /**
   * Track a new API request
   * If no active session exists or the current session has expired, starts a new session
   * Otherwise increments the request counter
   */
  trackRequest(): void {
    const session = this.getCurrentSession();

    if (!session || this.hasSessionReset()) {
      this.startNewSession();
    } else {
      this.incrementRequests();
    }
  }

  /**
   * Start a new session
   * Sets the session start time to now and calculates reset time (+5 hours)
   */
  private startNewSession(): void {
    const now = new Date();
    const resetTime = new Date(now.getTime() + SessionTracker.SESSION_DURATION_MS);

    console.log(`[SessionTracker] Starting new session. Resets at: ${resetTime.toISOString()}`);

    const stmt = db.prepare(`
      UPDATE session_tracking
      SET session_started_at = ?,
          session_resets_at = ?,
          is_active = 1,
          requests_this_session = 1
      WHERE id = 1
    `);

    stmt.run(now.toISOString(), resetTime.toISOString());
  }

  /**
   * Increment the request counter for the current session
   */
  private incrementRequests(): void {
    const stmt = db.prepare(`
      UPDATE session_tracking
      SET requests_this_session = requests_this_session + 1
      WHERE id = 1
    `);

    stmt.run();
  }

  /**
   * Get the current session data
   */
  getCurrentSession(): SessionTracking | null {
    const stmt = db.prepare<[], SessionTracking>(`
      SELECT * FROM session_tracking WHERE id = 1
    `);

    return stmt.get() || null;
  }

  /**
   * Get milliseconds until session reset
   * Returns 0 if session has already reset or no session exists
   */
  getTimeUntilReset(): number {
    const session = this.getCurrentSession();
    if (!session || !session.session_resets_at) return 0;

    const resetTime = new Date(session.session_resets_at);
    const now = new Date();

    return Math.max(0, resetTime.getTime() - now.getTime());
  }

  /**
   * Check if the current session has reset (expired)
   */
  hasSessionReset(): boolean {
    return this.getTimeUntilReset() === 0;
  }

  /**
   * Clear session data (used when session resets)
   */
  clearSession(): void {
    console.log('[SessionTracker] Clearing session data');

    const stmt = db.prepare(`
      UPDATE session_tracking
      SET session_started_at = NULL,
          session_resets_at = NULL,
          is_active = 0,
          requests_this_session = 0
      WHERE id = 1
    `);

    stmt.run();
  }

  /**
   * Get human-readable time remaining until reset
   */
  getTimeRemainingFormatted(): string {
    const ms = this.getTimeUntilReset();
    if (ms === 0) return 'Session reset';

    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  } {
    const session = this.getCurrentSession();

    return {
      isActive: session?.is_active === 1 || false,
      requestsThisSession: session?.requests_this_session || 0,
      timeRemaining: this.getTimeRemainingFormatted(),
      resetTime: session?.session_resets_at || null,
    };
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();
