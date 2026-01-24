import db from '../db/connection.js';
import type { GenerationProgress, ProgressEvent } from '../../../shared/types/index.js';

/**
 * ProgressTrackingService tracks chapter generation progress and provides estimates
 */
export class ProgressTrackingService {
  /**
   * Get progress for a book
   */
  getBookProgress(bookId: string): GenerationProgress {
    // Get book and chapter stats
    const statsStmt = db.prepare<[string], any>(`
      SELECT
        COUNT(*) as total_chapters,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
        SUM(word_count) as current_word_count
      FROM chapters
      WHERE book_id = ?
    `);

    const stats = statsStmt.get(bookId);

    if (!stats || stats.total_chapters === 0) {
      return this.getEmptyProgress();
    }

    const chaptersCompleted = stats.completed_chapters || 0;
    const chaptersTotal = stats.total_chapters;
    const percentComplete = Math.round((chaptersCompleted / chaptersTotal) * 100);
    const wordCount = stats.current_word_count || 0;

    // Get target word count from outline
    const outlineStmt = db.prepare<[string], { target_word_count: number }>(`
      SELECT target_word_count FROM outlines WHERE book_id = ?
    `);

    const outline = outlineStmt.get(bookId);
    const targetWordCount = outline?.target_word_count || chaptersTotal * 2500; // Default estimate

    // Calculate average chapter generation time
    const avgChapterTime = this.calculateAverageChapterTime(bookId);

    // Estimate time remaining
    const chaptersRemaining = chaptersTotal - chaptersCompleted;
    const estimatedTimeRemaining = chaptersRemaining * avgChapterTime;

    // Get sessions used (from session tracking)
    const sessionsUsed = this.getSessionsUsed();

    // Get current chapter
    const currentChapterStmt = db.prepare<[string], any>(`
      SELECT chapter_number, status FROM chapters
      WHERE book_id = ? AND status IN ('writing', 'editing')
      ORDER BY chapter_number ASC
      LIMIT 1
    `);

    const currentChapter = currentChapterStmt.get(bookId);

    // Get recent events
    const recentEvents = this.getRecentEvents(bookId);

    return {
      chaptersCompleted,
      chaptersTotal,
      percentComplete,
      wordCount,
      targetWordCount,
      avgChapterTime,
      estimatedTimeRemaining,
      sessionsUsed,
      currentChapter: currentChapter
        ? {
            number: currentChapter.chapter_number,
            status: currentChapter.status,
          }
        : undefined,
      recentEvents,
    };
  }

  /**
   * Get progress for a project (all books)
   */
  getProjectProgress(projectId: string): {
    totalBooks: number;
    completedBooks: number;
    overallProgress: GenerationProgress;
  } {
    const bookStatsStmt = db.prepare<[string], any>(`
      SELECT
        COUNT(*) as total_books,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_books
      FROM books
      WHERE project_id = ?
    `);

    const bookStats = bookStatsStmt.get(projectId);

    // Get overall chapter stats across all books
    const chapterStatsStmt = db.prepare<[string], any>(`
      SELECT
        COUNT(*) as total_chapters,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
        SUM(c.word_count) as current_word_count
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
    `);

    const chapterStats = chapterStatsStmt.get(projectId);

    if (!chapterStats || chapterStats.total_chapters === 0) {
      return {
        totalBooks: bookStats.total_books || 0,
        completedBooks: bookStats.completed_books || 0,
        overallProgress: this.getEmptyProgress(),
      };
    }

    const chaptersCompleted = chapterStats.completed_chapters || 0;
    const chaptersTotal = chapterStats.total_chapters;
    const percentComplete = Math.round((chaptersCompleted / chaptersTotal) * 100);
    const wordCount = chapterStats.current_word_count || 0;

    // Estimate target word count
    const targetWordCount = chaptersTotal * 2500;

    // Calculate average time
    const avgChapterTime = this.calculateAverageChapterTimeForProject(projectId);
    const chaptersRemaining = chaptersTotal - chaptersCompleted;
    const estimatedTimeRemaining = chaptersRemaining * avgChapterTime;

    const sessionsUsed = this.getSessionsUsed();

    // Get recent events across all books
    const recentEvents = this.getRecentEventsForProject(projectId);

    return {
      totalBooks: bookStats.total_books || 0,
      completedBooks: bookStats.completed_books || 0,
      overallProgress: {
        chaptersCompleted,
        chaptersTotal,
        percentComplete,
        wordCount,
        targetWordCount,
        avgChapterTime,
        estimatedTimeRemaining,
        sessionsUsed,
        recentEvents,
      },
    };
  }

  /**
   * Calculate average chapter generation time (in minutes)
   */
  private calculateAverageChapterTime(bookId: string): number {
    const stmt = db.prepare<[string], { avg_duration: number }>(`
      SELECT AVG(
        (julianday(completed_at) - julianday(started_at)) * 24 * 60
      ) as avg_duration
      FROM jobs
      WHERE type = 'generate_chapter'
        AND status = 'completed'
        AND target_id IN (
          SELECT id FROM chapters WHERE book_id = ?
        )
    `);

    const result = stmt.get(bookId);
    return result?.avg_duration || 5.0; // Default: 5 minutes per chapter
  }

  /**
   * Calculate average chapter generation time for entire project
   */
  private calculateAverageChapterTimeForProject(projectId: string): number {
    const stmt = db.prepare<[string], { avg_duration: number }>(`
      SELECT AVG(
        (julianday(completed_at) - julianday(started_at)) * 24 * 60
      ) as avg_duration
      FROM jobs
      WHERE type = 'generate_chapter'
        AND status = 'completed'
        AND target_id IN (
          SELECT c.id FROM chapters c
          JOIN books b ON c.book_id = b.id
          WHERE b.project_id = ?
        )
    `);

    const result = stmt.get(projectId);
    return result?.avg_duration || 5.0;
  }

  /**
   * Get sessions used from session tracking
   */
  private getSessionsUsed(): number {
    // Count distinct session start times
    const stmt = db.prepare<[], { sessions: number }>(`
      SELECT COUNT(DISTINCT DATE(session_started_at)) as sessions
      FROM session_tracking
      WHERE session_started_at IS NOT NULL
    `);

    const result = stmt.get();
    return result?.sessions || 0;
  }

  /**
   * Get recent events for a book
   */
  private getRecentEvents(bookId: string, limit: number = 10): ProgressEvent[] {
    const stmt = db.prepare<[string, number], any>(`
      SELECT
        j.completed_at as timestamp,
        j.type,
        c.chapter_number
      FROM jobs j
      JOIN chapters c ON j.target_id = c.id
      WHERE c.book_id = ? AND j.status = 'completed'
      ORDER BY j.completed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(bookId, limit);

    return rows.map((row) => ({
      timestamp: row.timestamp,
      type: this.formatJobType(row.type),
      description: this.formatEventDescription(row.type, row.chapter_number),
      chapterNumber: row.chapter_number,
    }));
  }

  /**
   * Get recent events for entire project
   */
  private getRecentEventsForProject(projectId: string, limit: number = 10): ProgressEvent[] {
    const stmt = db.prepare<[string, number], any>(`
      SELECT
        j.completed_at as timestamp,
        j.type,
        c.chapter_number,
        b.title as book_title
      FROM jobs j
      JOIN chapters c ON j.target_id = c.id
      JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ? AND j.status = 'completed'
      ORDER BY j.completed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectId, limit);

    return rows.map((row) => ({
      timestamp: row.timestamp,
      type: this.formatJobType(row.type),
      description: `${row.book_title} - ${this.formatEventDescription(row.type, row.chapter_number)}`,
      chapterNumber: row.chapter_number,
    }));
  }

  /**
   * Format job type for display
   */
  private formatJobType(jobType: string): string {
    const typeMap: Record<string, string> = {
      generate_chapter: 'Chapter Generated',
      generate_summary: 'Summary Created',
      update_states: 'States Updated',
      dev_edit: 'Dev Edit Complete',
      line_edit: 'Line Edit Complete',
      continuity_check: 'Continuity Check',
      copy_edit: 'Copy Edit Complete',
    };

    return typeMap[jobType] || jobType;
  }

  /**
   * Format event description
   */
  private formatEventDescription(jobType: string, chapterNumber: number): string {
    const typeMap: Record<string, string> = {
      generate_chapter: `Chapter ${chapterNumber} written`,
      generate_summary: `Chapter ${chapterNumber} summary created`,
      update_states: `Character states updated (Ch. ${chapterNumber})`,
      dev_edit: `Chapter ${chapterNumber} dev edit complete`,
      line_edit: `Chapter ${chapterNumber} line edit complete`,
      continuity_check: `Chapter ${chapterNumber} continuity checked`,
      copy_edit: `Chapter ${chapterNumber} copy edit complete`,
    };

    return typeMap[jobType] || `Chapter ${chapterNumber} processed`;
  }

  /**
   * Get empty progress object
   */
  private getEmptyProgress(): GenerationProgress {
    return {
      chaptersCompleted: 0,
      chaptersTotal: 0,
      percentComplete: 0,
      wordCount: 0,
      targetWordCount: 0,
      avgChapterTime: 0,
      estimatedTimeRemaining: 0,
      sessionsUsed: 0,
      recentEvents: [],
    };
  }

  /**
   * Record a progress event (for manual tracking if needed)
   */
  recordEvent(bookId: string, type: string, description: string, chapterNumber?: number): void {
    // This could be expanded to a dedicated events table if needed
    // For now, events are derived from job completions
    console.log(`[ProgressTracking] Event: ${description} (book: ${bookId})`);
  }
}

// Export singleton instance
export const progressTrackingService = new ProgressTrackingService();
