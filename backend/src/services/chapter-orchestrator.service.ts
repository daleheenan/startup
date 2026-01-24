import { QueueWorker } from '../queue/worker.js';
import db from '../db/connection.js';

/**
 * ChapterOrchestratorService orchestrates the full chapter generation workflow
 *
 * For each chapter:
 * 1. generate_chapter - Write the chapter content
 * 2. generate_summary - Create summary for next chapter
 * 3. update_states - Update character states
 */
export class ChapterOrchestratorService {
  /**
   * Queue all chapters for a book for generation
   */
  queueBookGeneration(bookId: string): {
    chaptersQueued: number;
    jobsCreated: number;
  } {
    // Get all pending chapters
    const getChaptersStmt = db.prepare<[string], { id: string; chapter_number: number }>(`
      SELECT id, chapter_number FROM chapters
      WHERE book_id = ? AND status = 'pending'
      ORDER BY chapter_number ASC
    `);

    const chapters = getChaptersStmt.all(bookId);

    if (chapters.length === 0) {
      return { chaptersQueued: 0, jobsCreated: 0 };
    }

    let jobsCreated = 0;

    // Queue jobs for each chapter
    for (const chapter of chapters) {
      this.queueChapterWorkflow(chapter.id);
      jobsCreated += 3; // generate_chapter, generate_summary, update_states
    }

    console.log(`[ChapterOrchestrator] Queued ${chapters.length} chapters (${jobsCreated} jobs) for book ${bookId}`);

    return {
      chaptersQueued: chapters.length,
      jobsCreated,
    };
  }

  /**
   * Queue the complete workflow for a single chapter
   */
  queueChapterWorkflow(chapterId: string): {
    generateJobId: string;
    summaryJobId: string;
    statesJobId: string;
  } {
    // Create jobs in sequence
    const generateJobId = QueueWorker.createJob('generate_chapter', chapterId);
    const summaryJobId = QueueWorker.createJob('generate_summary', chapterId);
    const statesJobId = QueueWorker.createJob('update_states', chapterId);

    console.log(`[ChapterOrchestrator] Queued workflow for chapter ${chapterId}`);
    console.log(`  - Generate: ${generateJobId}`);
    console.log(`  - Summary: ${summaryJobId}`);
    console.log(`  - States: ${statesJobId}`);

    return {
      generateJobId,
      summaryJobId,
      statesJobId,
    };
  }

  /**
   * Queue regeneration of a specific chapter
   */
  regenerateChapter(chapterId: string): {
    generateJobId: string;
    summaryJobId: string;
    statesJobId: string;
  } {
    // Reset chapter status
    const resetStmt = db.prepare(`
      UPDATE chapters
      SET status = 'pending', content = NULL, summary = NULL, updated_at = ?
      WHERE id = ?
    `);

    resetStmt.run(new Date().toISOString(), chapterId);

    console.log(`[ChapterOrchestrator] Reset chapter ${chapterId} for regeneration`);

    // Queue the workflow
    return this.queueChapterWorkflow(chapterId);
  }

  /**
   * Get workflow status for a chapter
   */
  getChapterWorkflowStatus(chapterId: string): {
    chapterStatus: string;
    jobs: Array<{
      type: string;
      status: string;
      error: string | null;
    }>;
  } {
    // Get chapter status
    const chapterStmt = db.prepare<[string], { status: string }>(`
      SELECT status FROM chapters WHERE id = ?
    `);

    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    // Get all jobs for this chapter
    const jobsStmt = db.prepare<[string], any>(`
      SELECT type, status, error FROM jobs
      WHERE target_id = ?
      ORDER BY created_at DESC
    `);

    const jobs = jobsStmt.all(chapterId);

    return {
      chapterStatus: chapter.status,
      jobs: jobs.map((job) => ({
        type: job.type,
        status: job.status,
        error: job.error,
      })),
    };
  }

  /**
   * Get generation statistics for a book
   */
  getBookGenerationStats(bookId: string): {
    totalChapters: number;
    pending: number;
    writing: number;
    editing: number;
    completed: number;
    failed: number;
  } {
    const statsStmt = db.prepare<[string], any>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'writing' THEN 1 ELSE 0 END) as writing,
        SUM(CASE WHEN status = 'editing' THEN 1 ELSE 0 END) as editing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM chapters
      WHERE book_id = ?
    `);

    const stats = statsStmt.get(bookId);

    // Count failed jobs
    const failedStmt = db.prepare<[string], { failed: number }>(`
      SELECT COUNT(DISTINCT target_id) as failed
      FROM jobs
      WHERE status = 'failed' AND target_id IN (
        SELECT id FROM chapters WHERE book_id = ?
      )
    `);

    const failedJobs = failedStmt.get(bookId);

    return {
      totalChapters: stats.total || 0,
      pending: stats.pending || 0,
      writing: stats.writing || 0,
      editing: stats.editing || 0,
      completed: stats.completed || 0,
      failed: failedJobs?.failed || 0,
    };
  }
}

// Export singleton instance
export const chapterOrchestratorService = new ChapterOrchestratorService();
