import { QueueWorker } from '../queue/worker.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:chapter-orchestrator');

/**
 * ChapterOrchestratorService orchestrates the full chapter generation workflow
 *
 * For each chapter:
 * 1. generate_chapter - Author Agent writes initial draft
 * 2. dev_edit - Developmental Editor reviews structure and pacing
 * 3. line_edit - Line Editor polishes prose
 * 4. continuity_check - Continuity Editor checks consistency
 * 5. copy_edit - Copy Editor fixes grammar/style
 * 6. proofread - Proofreader final quality check
 * 7. generate_summary - Create summary for next chapter
 * 8. update_states - Update character states
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
      jobsCreated += 14; // Core: generate, dev_edit, line_edit, continuity, copy_edit, proofread
                         // Specialists: sensitivity, research, beta_reader, opening, dialogue, hook
                         // Finalization: summary, states
      // Note: +1 additional job (author_revision) may be created dynamically if dev editor requires it
    }

    logger.info(`[ChapterOrchestrator] Queued ${chapters.length} chapters (${jobsCreated} jobs) for book ${bookId}`);

    return {
      chaptersQueued: chapters.length,
      jobsCreated,
    };
  }

  /**
   * Queue the complete workflow for a single chapter
   *
   * Pipeline (14 steps):
   * 1. generate_chapter - Author Agent writes initial draft
   * 2. dev_edit - Developmental Editor reviews (may queue author_revision)
   * 3. line_edit - Line Editor polishes prose
   * 4. continuity_check - Continuity Editor checks consistency
   * 5. copy_edit - Copy Editor fixes grammar/style
   * 6. proofread - Proofreader final quality check
   * 7. sensitivity_review - Sensitivity Reader checks representation
   * 8. research_review - Researcher validates facts/history
   * 9. beta_reader_review - Beta Reader simulates reader engagement
   * 10. opening_review - Opening Specialist (chapter 1 only)
   * 11. dialogue_review - Dialogue Coach ensures natural dialogue
   * 12. hook_review - Hook Specialist ensures chapter ending momentum
   * 13. generate_summary - Create summary for next chapter
   * 14. update_states - Update character states
   */
  queueChapterWorkflow(chapterId: string): {
    generateJobId: string;
    devEditJobId: string;
    lineEditJobId: string;
    continuityJobId: string;
    copyEditJobId: string;
    proofreadJobId: string;
    sensitivityJobId: string;
    researchJobId: string;
    betaReaderJobId: string;
    openingJobId: string;
    dialogueJobId: string;
    hookJobId: string;
    summaryJobId: string;
    statesJobId: string;
  } {
    // Create jobs in sequence (worker processes them in order)
    // Core editing pipeline
    const generateJobId = QueueWorker.createJob('generate_chapter', chapterId);
    const devEditJobId = QueueWorker.createJob('dev_edit', chapterId);
    // Note: author_revision job may be created dynamically by dev_edit if needed
    const lineEditJobId = QueueWorker.createJob('line_edit', chapterId);
    const continuityJobId = QueueWorker.createJob('continuity_check', chapterId);
    const copyEditJobId = QueueWorker.createJob('copy_edit', chapterId);
    const proofreadJobId = QueueWorker.createJob('proofread', chapterId);

    // Specialist agents (publication quality)
    const sensitivityJobId = QueueWorker.createJob('sensitivity_review', chapterId);
    const researchJobId = QueueWorker.createJob('research_review', chapterId);
    const betaReaderJobId = QueueWorker.createJob('beta_reader_review', chapterId);
    const openingJobId = QueueWorker.createJob('opening_review', chapterId);
    const dialogueJobId = QueueWorker.createJob('dialogue_review', chapterId);
    const hookJobId = QueueWorker.createJob('hook_review', chapterId);

    // Finalization
    const summaryJobId = QueueWorker.createJob('generate_summary', chapterId);
    const statesJobId = QueueWorker.createJob('update_states', chapterId);

    logger.info(`[ChapterOrchestrator] Queued full workflow for chapter ${chapterId}`);
    logger.info(`  - Generate: ${generateJobId}`);
    logger.info(`  - Dev Edit: ${devEditJobId}`);
    logger.info(`  - Line Edit: ${lineEditJobId}`);
    logger.info(`  - Continuity: ${continuityJobId}`);
    logger.info(`  - Copy Edit: ${copyEditJobId}`);
    logger.info(`  - Proofread: ${proofreadJobId}`);
    logger.info(`  - Sensitivity: ${sensitivityJobId}`);
    logger.info(`  - Research: ${researchJobId}`);
    logger.info(`  - Beta Reader: ${betaReaderJobId}`);
    logger.info(`  - Opening: ${openingJobId}`);
    logger.info(`  - Dialogue: ${dialogueJobId}`);
    logger.info(`  - Hook: ${hookJobId}`);
    logger.info(`  - Summary: ${summaryJobId}`);
    logger.info(`  - States: ${statesJobId}`);

    return {
      generateJobId,
      devEditJobId,
      lineEditJobId,
      continuityJobId,
      copyEditJobId,
      proofreadJobId,
      sensitivityJobId,
      researchJobId,
      betaReaderJobId,
      openingJobId,
      dialogueJobId,
      hookJobId,
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

    logger.info(`[ChapterOrchestrator] Reset chapter ${chapterId} for regeneration`);

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
