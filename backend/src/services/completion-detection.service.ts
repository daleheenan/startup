import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import { QueueWorker } from '../queue/worker.js';
import type { Book, Chapter } from '../shared/types/index.js';

const logger = createLogger('services:completion-detection');

/**
 * Book Completion Detection Service
 * Sprint 38: Detects when all chapters are written and triggers auto-analysis
 * Sprint 39: Added automatic VEB (Virtual Editorial Board) trigger on book completion
 */

export interface BookCompletionStatus {
  bookId: string;
  isComplete: boolean;
  totalChapters: number;
  completedChapters: number;
  totalWordCount: number;
  completedAt: string | null;
  analyticsStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
  vebStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
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
  veb_status: string | null;
  veb_triggered_at: string | null;
  veb_report_id: string | null;
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
      vebStatus: completionRecord?.veb_status as any || null,
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
   *
   * When a book is completed, this method:
   * 1. Creates a completion record
   * 2. Triggers auto-analytics
   * 3. Triggers auto-VEB (Virtual Editorial Board) analysis
   */
  async checkAndTriggerCompletion(chapterId: string): Promise<{
    isNowComplete: boolean;
    completionRecord: CompletionRecord | null;
    vebTriggered: boolean;
    vebReportId?: string;
  }> {
    // Get book ID from chapter
    const chapterStmt = db.prepare<[string], { book_id: string }>(`
      SELECT book_id FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      return { isNowComplete: false, completionRecord: null, vebTriggered: false };
    }

    const status = this.checkBookCompletion(chapter.book_id);

    // Check if book just became complete
    if (status.isComplete && !status.completedAt) {
      try {
        const record = await this.markBookComplete(chapter.book_id);

        // Trigger auto-analysis (analytics)
        this.triggerAutoAnalysis(chapter.book_id);

        // Trigger auto-VEB (Virtual Editorial Board)
        const vebResult = await this.triggerAutoVEB(chapter.book_id);

        logger.info({
          chapterId,
          bookId: chapter.book_id,
          analyticsTriggered: true,
          vebTriggered: vebResult.success,
          vebReportId: vebResult.reportId
        }, 'Book completion triggered - analytics and VEB started');

        return {
          isNowComplete: true,
          completionRecord: record,
          vebTriggered: vebResult.success,
          vebReportId: vebResult.reportId
        };
      } catch (error) {
        logger.error({ chapterId, bookId: chapter.book_id, error }, 'Error triggering completion');
        return { isNowComplete: false, completionRecord: null, vebTriggered: false };
      }
    }

    return { isNowComplete: false, completionRecord: null, vebTriggered: false };
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

  /**
   * Trigger automatic VEB (Virtual Editorial Board) analysis for a completed book
   * This submits the manuscript to the VEB for comprehensive editorial review
   */
  async triggerAutoVEB(bookId: string): Promise<{ success: boolean; message: string; reportId?: string }> {
    // Get completion record
    const completionStmt = db.prepare<[string], CompletionRecord>(`
      SELECT * FROM book_completion WHERE book_id = ?
    `);
    const completion = completionStmt.get(bookId);

    if (!completion) {
      return { success: false, message: 'Book has no completion record. Call markBookComplete first.' };
    }

    // Check if VEB is already in progress or completed
    if (completion.veb_status === 'processing') {
      return { success: false, message: 'VEB analysis already in progress.' };
    }

    if (completion.veb_status === 'completed' && completion.veb_report_id) {
      return { success: false, message: 'VEB analysis already completed.', reportId: completion.veb_report_id };
    }

    const now = new Date().toISOString();

    try {
      // Import VEB service dynamically to avoid circular dependency
      const { vebService } = await import('./veb.service.js');

      // Update status to processing
      const updateStmt = db.prepare(`
        UPDATE book_completion
        SET veb_status = 'processing', veb_triggered_at = ?, updated_at = ?
        WHERE book_id = ?
      `);
      updateStmt.run(now, now, bookId);

      // Submit to VEB (this creates the report and queues jobs)
      const result = await vebService.submitToVEB(completion.project_id);

      // Store the report ID in completion record
      const linkStmt = db.prepare(`
        UPDATE book_completion
        SET veb_report_id = ?, updated_at = ?
        WHERE book_id = ?
      `);
      linkStmt.run(result.reportId, now, bookId);

      logger.info({
        bookId,
        projectId: completion.project_id,
        reportId: result.reportId
      }, 'Auto-VEB triggered for completed book');

      return { success: true, message: 'VEB analysis started.', reportId: result.reportId };
    } catch (error) {
      // Mark as failed
      const failStmt = db.prepare(`
        UPDATE book_completion
        SET veb_status = 'failed', updated_at = ?
        WHERE book_id = ?
      `);
      failStmt.run(now, bookId);

      logger.error({ bookId, error }, 'Failed to trigger auto-VEB');
      return { success: false, message: `Failed to start VEB analysis: ${(error as Error).message}` };
    }
  }

  /**
   * Update VEB status when the report is completed
   * Called by the VEB finalise job handler
   */
  updateVEBStatus(bookId: string, status: 'completed' | 'failed', reportId?: string): void {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE book_completion
      SET veb_status = ?, veb_report_id = COALESCE(?, veb_report_id), updated_at = ?
      WHERE book_id = ?
    `);
    stmt.run(status, reportId || null, now, bookId);

    logger.info({ bookId, status, reportId }, 'VEB status updated in completion record');
  }

  /**
   * Re-run VEB analysis for a completed book
   */
  async rerunVEB(bookId: string): Promise<{ success: boolean; message: string; reportId?: string }> {
    const completion = this.getCompletionRecord(bookId);

    if (!completion) {
      return { success: false, message: 'Book has no completion record.' };
    }

    const now = new Date().toISOString();

    // Reset VEB status
    const updateStmt = db.prepare(`
      UPDATE book_completion
      SET veb_status = 'pending', veb_report_id = NULL, veb_triggered_at = NULL, updated_at = ?
      WHERE book_id = ?
    `);
    updateStmt.run(now, bookId);

    // Trigger VEB
    return this.triggerAutoVEB(bookId);
  }
}

export const completionDetectionService = new CompletionDetectionService();
