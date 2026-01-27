import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import { QueueWorker } from '../queue/worker.js';
import type { Book, Chapter } from '../shared/types/index.js';

const logger = createLogger('services:completion-detection');

/**
 * Book Completion Detection Service
 * Sprint 38: Detects when all chapters are written and triggers auto-analysis
 */

export interface BookCompletionStatus {
  bookId: string;
  isComplete: boolean;
  totalChapters: number;
  completedChapters: number;
  totalWordCount: number;
  completedAt: string | null;
  analyticsStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
}

export interface CompletionRecord {
  id: string;
  book_id: string;
  project_id: string;
  completed_at: string;
  total_chapters: number;
  total_word_count: number;
  analytics_status: string;
  analytics_triggered_at: string | null;
  analytics_completed_at: string | null;
  cached_analytics: string | null;
}

class CompletionDetectionService {
  /**
   * Check if a book is complete (all chapters have content)
   */
  checkBookCompletion(bookId: string): BookCompletionStatus {
    // Get book details
    const bookStmt = db.prepare<[string], Book & { is_complete: number; completed_at: string | null }>(`
      SELECT * FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // Get all chapters for this book
    const chaptersStmt = db.prepare<[string], Chapter>(`
      SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_number ASC
    `);
    const chapters = chaptersStmt.all(bookId);

    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(ch => ch.content && ch.content.trim().length > 0).length;
    const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const isComplete = totalChapters > 0 && completedChapters === totalChapters;

    // Check existing completion record
    const completionStmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE book_id = ?
    `);
    const completionRecord = completionStmt.get(bookId);

    return {
      bookId,
      isComplete,
      totalChapters,
      completedChapters,
      totalWordCount,
      completedAt: completionRecord?.completed_at || book.completed_at || null,
      analyticsStatus: completionRecord?.analytics_status as any || null,
    };
  }

  /**
   * Mark a book as complete and trigger auto-analysis
   */
  async markBookComplete(bookId: string): Promise<CompletionRecord> {
    const status = this.checkBookCompletion(bookId);

    if (!status.isComplete) {
      throw new Error(`Book ${bookId} is not complete. ${status.completedChapters}/${status.totalChapters} chapters written.`);
    }

    // Get book's project ID
    const bookStmt = db.prepare<[string], { project_id: string }>(`
      SELECT project_id FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const now = new Date().toISOString();
    const completionId = randomUUID();

    // Check if completion record already exists
    const existingStmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE book_id = ?
    `);
    const existing = existingStmt.get(bookId);

    if (existing) {
      logger.info({ bookId, existingId: existing.id }, 'Book completion record already exists');
      return existing;
    }

    // Create completion record
    const insertStmt = db.prepare(`
      INSERT INTO book_completion (id, book_id, project_id, completed_at, total_chapters, total_word_count, analytics_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);
    insertStmt.run(completionId, bookId, book.project_id, now, status.totalChapters, status.totalWordCount);

    // Update book's completion status
    const updateBookStmt = db.prepare(`
      UPDATE books SET is_complete = 1, completed_at = ?, updated_at = ? WHERE id = ?
    `);
    updateBookStmt.run(now, now, bookId);

    logger.info({
      bookId,
      completionId,
      totalChapters: status.totalChapters,
      totalWordCount: status.totalWordCount
    }, 'Book marked as complete');

    // Get the created record
    const recordStmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE id = ?
    `);
    const record = recordStmt.get(completionId);

    return record!;
  }

  /**
   * Trigger auto-analysis for a completed book
   * This creates jobs for the analytics pipeline
   */
  triggerAutoAnalysis(bookId: string): { success: boolean; message: string } {
    // Check completion status
    const completionStmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE book_id = ?
    `);
    const completion = completionStmt.get(bookId);

    if (!completion) {
      return { success: false, message: 'Book has no completion record. Call markBookComplete first.' };
    }

    if (completion.analytics_status === 'processing') {
      return { success: false, message: 'Analytics already in progress.' };
    }

    if (completion.analytics_status === 'completed') {
      return { success: false, message: 'Analytics already completed. Use re-analyse to run again.' };
    }

    const now = new Date().toISOString();

    // Update status to processing
    const updateStmt = db.prepare(`
      UPDATE book_completion
      SET analytics_status = 'processing', analytics_triggered_at = ?, updated_at = ?
      WHERE book_id = ?
    `);
    updateStmt.run(now, now, bookId);

    // Create an analyze_book job (we'll add this job type)
    // For now, we'll call the analytics service directly via a job
    try {
      // Queue the analytics job
      QueueWorker.createJob('analyze_book' as any, bookId);

      logger.info({ bookId }, 'Auto-analysis triggered');
      return { success: true, message: 'Analytics job queued successfully.' };
    } catch (error) {
      // If job type doesn't exist yet, mark as failed
      const failStmt = db.prepare(`
        UPDATE book_completion
        SET analytics_status = 'failed', updated_at = ?
        WHERE book_id = ?
      `);
      failStmt.run(now, bookId);

      logger.error({ bookId, error }, 'Failed to trigger auto-analysis');
      return { success: false, message: 'Failed to queue analytics job.' };
    }
  }

  /**
   * Check if a chapter update triggers book completion
   * Call this after chapter content is saved
   */
  async checkAndTriggerCompletion(chapterId: string): Promise<{ isNowComplete: boolean; completionRecord: CompletionRecord | null }> {
    // Get book ID from chapter
    const chapterStmt = db.prepare<[string], { book_id: string }>(`
      SELECT book_id FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      return { isNowComplete: false, completionRecord: null };
    }

    const status = this.checkBookCompletion(chapter.book_id);

    // Check if book just became complete
    if (status.isComplete && !status.completedAt) {
      try {
        const record = await this.markBookComplete(chapter.book_id);

        // Trigger auto-analysis
        this.triggerAutoAnalysis(chapter.book_id);

        return { isNowComplete: true, completionRecord: record };
      } catch (error) {
        logger.error({ chapterId, bookId: chapter.book_id, error }, 'Error triggering completion');
        return { isNowComplete: false, completionRecord: null };
      }
    }

    return { isNowComplete: false, completionRecord: null };
  }

  /**
   * Get completion record for a book
   */
  getCompletionRecord(bookId: string): CompletionRecord | null {
    const stmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE book_id = ?
    `);
    return stmt.get(bookId) || null;
  }

  /**
   * Get completion records for a project
   */
  getProjectCompletions(projectId: string): CompletionRecord[] {
    const stmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE project_id = ? ORDER BY completed_at DESC
    `);
    return stmt.all(projectId);
  }

  /**
   * Cache analytics results for quick access
   */
  cacheAnalyticsResults(bookId: string, analyticsJson: string): void {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE book_completion
      SET cached_analytics = ?, analytics_status = 'completed', analytics_completed_at = ?, updated_at = ?
      WHERE book_id = ?
    `);
    stmt.run(analyticsJson, now, now, bookId);

    logger.info({ bookId }, 'Analytics results cached');
  }

  /**
   * Re-analyse a completed book
   */
  reanalyse(bookId: string): { success: boolean; message: string } {
    const completion = this.getCompletionRecord(bookId);

    if (!completion) {
      return { success: false, message: 'Book has no completion record.' };
    }

    const now = new Date().toISOString();

    // Reset analytics status
    const updateStmt = db.prepare(`
      UPDATE book_completion
      SET analytics_status = 'pending', cached_analytics = NULL, analytics_completed_at = NULL, updated_at = ?
      WHERE book_id = ?
    `);
    updateStmt.run(now, bookId);

    // Trigger analysis
    return this.triggerAutoAnalysis(bookId);
  }
}

export const completionDetectionService = new CompletionDetectionService();
