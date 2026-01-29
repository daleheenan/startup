import { QueueWorker } from '../queue/worker.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { bookVersioningService } from './book-versioning.service.js';
import {
  chapterBriefGeneratorService,
  type DetailedChapterBrief,
} from './chapter-brief-generator.js';
import {
  commercialBeatValidatorService,
  type CommercialValidationReport,
} from './commercial-beat-validator.js';
import type { StoryStructure, StoryDNA } from '../shared/types/index.js';

const logger = createLogger('services:chapter-orchestrator');

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChapterDeviationWarning {
  chapterId: string;
  chapterNumber: number;
  warningType: 'word_count' | 'pacing' | 'beat_missing' | 'tone' | 'structure';
  severity: 'low' | 'medium' | 'high';
  message: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  recommendation: string;
}

export interface BookGenerationOptions {
  bookId: string;
  generateBriefs?: boolean; // Generate chapter briefs before content (default: true)
  validateCommercial?: boolean; // Run commercial validation first (default: true)
  stopOnCriticalIssues?: boolean; // Stop if critical commercial issues found (default: false)
}

export interface BookGenerationResult {
  chaptersQueued: number;
  jobsCreated: number;
  commercialValidation?: CommercialValidationReport;
  chapterBriefs?: DetailedChapterBrief[];
  warnings?: ChapterDeviationWarning[];
}

export interface ChapterCompletionValidation {
  chapterId: string;
  chapterNumber: number;
  isValid: boolean;
  wordCount: number;
  targetWordCount: number;
  wordCountDeviation: number;
  commercialBeatsHit: string[];
  commercialBeatsMissed: string[];
  warnings: ChapterDeviationWarning[];
}

/**
 * ChapterOrchestratorService orchestrates the full chapter generation workflow
 *
 * Enhanced with:
 * - Proactive chapter brief generation before content generation
 * - Commercial beat validation before and after generation
 * - Early warning system for chapter deviations
 * - Word count budget tracking per chapter
 *
 * For each chapter:
 * 0. generate_brief - Generate detailed chapter brief (NEW)
 * 1. generate_chapter - Author Agent writes initial draft using brief
 * 2. validate_chapter - Check against commercial requirements (NEW)
 * 3. dev_edit - Developmental Editor reviews structure and pacing
 * 4. line_edit - Line Editor polishes prose
 * 5. continuity_check - Continuity Editor checks consistency
 * 6. copy_edit - Copy Editor fixes grammar/style
 * 7. proofread - Proofreader final quality check
 * 8. generate_summary - Create summary for next chapter
 * 9. update_states - Update character states
 */
export class ChapterOrchestratorService {
  /**
   * Queue all chapters for a book with enhanced proactive controls
   */
  async queueBookGenerationWithValidation(options: BookGenerationOptions): Promise<BookGenerationResult> {
    const { bookId, generateBriefs = true, validateCommercial = true, stopOnCriticalIssues = false } = options;

    logger.info({ bookId, generateBriefs, validateCommercial }, '[ChapterOrchestrator] Starting enhanced book generation');

    const result: BookGenerationResult = {
      chaptersQueued: 0,
      jobsCreated: 0,
      warnings: [],
    };

    // Step 1: Run commercial validation if enabled
    if (validateCommercial) {
      try {
        const validation = await this.validateBookCommercialStructure(bookId);
        result.commercialValidation = validation;

        if (validation.criticalIssues.length > 0) {
          logger.warn({
            bookId,
            criticalIssues: validation.criticalIssues.length,
          }, '[ChapterOrchestrator] Critical commercial issues found');

          if (stopOnCriticalIssues) {
            logger.error({ bookId }, '[ChapterOrchestrator] Stopping generation due to critical issues');
            return result;
          }

          // Add warnings for critical issues
          for (const issue of validation.criticalIssues) {
            result.warnings!.push({
              chapterId: '',
              chapterNumber: issue.chapterNumber || 0,
              warningType: 'beat_missing',
              severity: 'high',
              message: issue.issue || `Missing critical beat: ${issue.beatName}`,
              recommendation: issue.recommendation || 'Review outline and adjust beat placement',
            });
          }
        }

        logger.info({
          bookId,
          overallScore: validation.overallScore,
          readyForGeneration: validation.readyForGeneration,
        }, '[ChapterOrchestrator] Commercial validation complete');
      } catch (error) {
        logger.error({ error, bookId }, '[ChapterOrchestrator] Commercial validation failed');
        // Continue with generation even if validation fails
      }
    }

    // Step 2: Generate chapter briefs if enabled
    if (generateBriefs) {
      try {
        const briefResult = await chapterBriefGeneratorService.generateAllChapterBriefs(bookId, false);
        result.chapterBriefs = briefResult.briefs;

        logger.info({
          bookId,
          briefCount: briefResult.briefs.length,
          totalWordCountBudget: briefResult.totalWordCountBudget,
        }, '[ChapterOrchestrator] Chapter briefs generated');
      } catch (error) {
        logger.error({ error, bookId }, '[ChapterOrchestrator] Chapter brief generation failed');
        // Continue with generation even if brief generation fails
      }
    }

    // Step 3: Queue generation for all chapters
    const queueResult = this.queueBookGeneration(bookId);
    result.chaptersQueued = queueResult.chaptersQueued;
    result.jobsCreated = queueResult.jobsCreated;

    return result;
  }

  /**
   * Queue all chapters for a book for generation (original method)
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
   * Validate a completed chapter against its brief and commercial requirements
   * This is the early warning system that catches issues before they compound
   */
  async validateCompletedChapter(chapterId: string): Promise<ChapterCompletionValidation> {
    logger.info({ chapterId }, '[ChapterOrchestrator] Validating completed chapter');

    // Get chapter data
    const chapterStmt = db.prepare<[string], any>(`
      SELECT c.*, b.id as book_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    // Get the chapter brief if available
    const briefStmt = db.prepare<[string, number], { brief_data: string }>(`
      SELECT brief_data FROM chapter_briefs
      WHERE book_id = ? AND chapter_number = ?
    `);
    const briefResult = briefStmt.get(chapter.book_id, chapter.chapter_number);
    const brief: DetailedChapterBrief | null = briefResult ? JSON.parse(briefResult.brief_data) : null;

    const warnings: ChapterDeviationWarning[] = [];
    const actualWordCount = chapter.word_count || 0;

    // Get target word count from brief or outline
    let targetWordCount = 2200; // Default
    if (brief) {
      targetWordCount = brief.wordCountTarget;
    } else {
      // Fall back to outline word count target
      const outlineStmt = db.prepare<[string], { structure: string }>(`
        SELECT structure FROM outlines WHERE book_id = ?
      `);
      const outline = outlineStmt.get(chapter.book_id);
      if (outline?.structure) {
        const structure: StoryStructure = JSON.parse(outline.structure);
        for (const act of structure.acts) {
          const chapterOutline = act.chapters.find(c => c.number === chapter.chapter_number);
          if (chapterOutline) {
            targetWordCount = chapterOutline.wordCountTarget;
            break;
          }
        }
      }
    }

    // Calculate word count deviation
    const wordCountDeviation = Math.abs(actualWordCount - targetWordCount) / targetWordCount * 100;

    // Check word count tolerance
    const tolerancePercent = 10;
    if (wordCountDeviation > tolerancePercent) {
      const isOver = actualWordCount > targetWordCount;
      warnings.push({
        chapterId,
        chapterNumber: chapter.chapter_number,
        warningType: 'word_count',
        severity: wordCountDeviation > 20 ? 'high' : 'medium',
        message: `Chapter is ${isOver ? 'over' : 'under'} word count target by ${wordCountDeviation.toFixed(1)}%`,
        expectedValue: targetWordCount,
        actualValue: actualWordCount,
        recommendation: isOver
          ? 'Consider trimming unnecessary exposition or descriptions'
          : 'Consider expanding key scenes or adding more detail',
      });
    }

    // Check commercial beats if brief available
    const commercialBeatsHit: string[] = [];
    const commercialBeatsMissed: string[] = [];

    if (brief && brief.commercialBeats && brief.commercialBeats.length > 0) {
      // This is a simplified check - in production you'd analyse the content
      // For now, we assume the chapter should mention these beats in its summary
      for (const beat of brief.commercialBeats) {
        // Check if the chapter summary mentions elements related to this beat
        const chapterSummary = (chapter.summary || '').toLowerCase();
        const beatIndicators = this.getBeatIndicators(beat.name);

        if (beatIndicators.some(indicator => chapterSummary.includes(indicator))) {
          commercialBeatsHit.push(beat.name);
        } else {
          commercialBeatsMissed.push(beat.name);
          warnings.push({
            chapterId,
            chapterNumber: chapter.chapter_number,
            warningType: 'beat_missing',
            severity: 'medium',
            message: `Expected commercial beat "${beat.name}" may not be present`,
            recommendation: beat.description,
          });
        }
      }
    }

    // Check pacing guidance if available
    if (brief && brief.pacingGuidance) {
      // Simple heuristic: fast pacing = more dialogue, slow = more description
      const content = chapter.content || '';
      const dialogueRatio = this.estimateDialogueRatio(content);

      if (brief.pacingGuidance === 'fast' && dialogueRatio < 0.3) {
        warnings.push({
          chapterId,
          chapterNumber: chapter.chapter_number,
          warningType: 'pacing',
          severity: 'low',
          message: 'Chapter may have slower pacing than recommended',
          expectedValue: 'fast',
          actualValue: `dialogue ratio: ${(dialogueRatio * 100).toFixed(1)}%`,
          recommendation: 'Consider adding more dialogue or action to increase pace',
        });
      } else if (brief.pacingGuidance === 'slow' && dialogueRatio > 0.6) {
        warnings.push({
          chapterId,
          chapterNumber: chapter.chapter_number,
          warningType: 'pacing',
          severity: 'low',
          message: 'Chapter may have faster pacing than recommended',
          expectedValue: 'slow',
          actualValue: `dialogue ratio: ${(dialogueRatio * 100).toFixed(1)}%`,
          recommendation: 'Consider adding more introspection or description to slow the pace',
        });
      }
    }

    const isValid = warnings.filter(w => w.severity === 'high').length === 0;

    logger.info({
      chapterId,
      chapterNumber: chapter.chapter_number,
      isValid,
      warningCount: warnings.length,
      wordCountDeviation: wordCountDeviation.toFixed(1),
    }, '[ChapterOrchestrator] Chapter validation complete');

    return {
      chapterId,
      chapterNumber: chapter.chapter_number,
      isValid,
      wordCount: actualWordCount,
      targetWordCount,
      wordCountDeviation,
      commercialBeatsHit,
      commercialBeatsMissed,
      warnings,
    };
  }

  /**
   * Validate commercial structure for a book's outline
   */
  async validateBookCommercialStructure(bookId: string): Promise<CommercialValidationReport> {
    // Get book and outline
    const bookStmt = db.prepare<[string], any>(`
      SELECT b.id, p.genre, o.structure, o.target_word_count
      FROM books b
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN outlines o ON o.book_id = b.id
      WHERE b.id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book || !book.structure) {
      throw new Error('Book outline not found');
    }

    const structure: StoryStructure = JSON.parse(book.structure);
    const targetWordCount = book.target_word_count || 80000;

    return commercialBeatValidatorService.validateStructure(
      structure,
      targetWordCount,
      book.genre
    );
  }

  /**
   * Get chapter brief for generation context
   */
  async getChapterBriefForGeneration(chapterId: string): Promise<DetailedChapterBrief | null> {
    const chapterStmt = db.prepare<[string], { book_id: string; chapter_number: number }>(`
      SELECT book_id, chapter_number FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      return null;
    }

    const briefStmt = db.prepare<[string, number], { brief_data: string }>(`
      SELECT brief_data FROM chapter_briefs
      WHERE book_id = ? AND chapter_number = ?
    `);
    const briefResult = briefStmt.get(chapter.book_id, chapter.chapter_number);

    if (!briefResult) {
      // Generate brief on the fly if not found
      try {
        return await chapterBriefGeneratorService.generateChapterBrief({
          bookId: chapter.book_id,
          chapterNumber: chapter.chapter_number,
        });
      } catch (error) {
        logger.error({ error, chapterId }, '[ChapterOrchestrator] Failed to generate chapter brief');
        return null;
      }
    }

    return JSON.parse(briefResult.brief_data);
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
   * Get generation statistics for a book (uses active version only)
   */
  async getBookGenerationStats(bookId: string): Promise<{
    totalChapters: number;
    pending: number;
    writing: number;
    editing: number;
    completed: number;
    failed: number;
  }> {
    // Get active version for this book
    const activeVersion = await bookVersioningService.getActiveVersion(bookId);

    let stats;
    let chapterIds: string[];

    if (activeVersion) {
      const statsStmt = db.prepare<[string], any>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'writing' THEN 1 ELSE 0 END) as writing,
          SUM(CASE WHEN status = 'editing' THEN 1 ELSE 0 END) as editing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM chapters
        WHERE version_id = ?
      `);
      stats = statsStmt.get(activeVersion.id);

      // Get chapter IDs for failed job count
      const chapterIdStmt = db.prepare<[string], { id: string }>(`
        SELECT id FROM chapters WHERE version_id = ?
      `);
      chapterIds = chapterIdStmt.all(activeVersion.id).map(c => c.id);
    } else {
      // Legacy: no versions exist
      const statsStmt = db.prepare<[string], any>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'writing' THEN 1 ELSE 0 END) as writing,
          SUM(CASE WHEN status = 'editing' THEN 1 ELSE 0 END) as editing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM chapters
        WHERE book_id = ? AND version_id IS NULL
      `);
      stats = statsStmt.get(bookId);

      // Get chapter IDs for failed job count
      const chapterIdStmt = db.prepare<[string], { id: string }>(`
        SELECT id FROM chapters WHERE book_id = ? AND version_id IS NULL
      `);
      chapterIds = chapterIdStmt.all(bookId).map(c => c.id);
    }

    // Count failed jobs for active version chapters only
    let failedCount = 0;
    if (chapterIds.length > 0) {
      const placeholders = chapterIds.map(() => '?').join(',');
      const failedStmt = db.prepare<string[], { failed: number }>(`
        SELECT COUNT(DISTINCT target_id) as failed
        FROM jobs
        WHERE status = 'failed' AND target_id IN (${placeholders})
      `);
      const failedJobs = failedStmt.get(...chapterIds);
      failedCount = failedJobs?.failed || 0;
    }

    return {
      totalChapters: stats.total || 0,
      pending: stats.pending || 0,
      writing: stats.writing || 0,
      editing: stats.editing || 0,
      completed: stats.completed || 0,
      failed: failedCount,
    };
  }

  /**
   * Get extended generation statistics including quality metrics (uses active version only)
   */
  async getBookGenerationStatsExtended(bookId: string): Promise<{
    totalChapters: number;
    pending: number;
    writing: number;
    editing: number;
    completed: number;
    failed: number;
    totalWordCount: number;
    targetWordCount: number;
    wordCountDeviation: number;
    chaptersWithWarnings: number;
    commercialValidation?: CommercialValidationReport;
  }> {
    const basicStats = await this.getBookGenerationStats(bookId);

    // Get active version for this book
    const activeVersion = await bookVersioningService.getActiveVersion(bookId);

    // Get word count totals for active version only
    let wordCountResult;
    if (activeVersion) {
      const wordCountStmt = db.prepare<[string], { total_words: number }>(`
        SELECT COALESCE(SUM(word_count), 0) as total_words
        FROM chapters
        WHERE version_id = ? AND status = 'completed'
      `);
      wordCountResult = wordCountStmt.get(activeVersion.id);
    } else {
      const wordCountStmt = db.prepare<[string], { total_words: number }>(`
        SELECT COALESCE(SUM(word_count), 0) as total_words
        FROM chapters
        WHERE book_id = ? AND version_id IS NULL AND status = 'completed'
      `);
      wordCountResult = wordCountStmt.get(bookId);
    }

    // Get target word count from outline
    const outlineStmt = db.prepare<[string], { target_word_count: number | null }>(`
      SELECT target_word_count FROM outlines WHERE book_id = ?
    `);
    const outlineResult = outlineStmt.get(bookId);

    const totalWordCount = wordCountResult?.total_words || 0;
    const targetWordCount = outlineResult?.target_word_count || 80000;
    const wordCountDeviation = Math.abs(totalWordCount - targetWordCount) / targetWordCount * 100;

    // Count chapters with warnings (this would need a warnings table in production)
    const chaptersWithWarnings = 0; // Placeholder

    // Get commercial validation
    let commercialValidation: CommercialValidationReport | undefined;
    try {
      commercialValidation = await this.validateBookCommercialStructure(bookId);
    } catch (error) {
      // Validation may fail if no outline exists yet
    }

    return {
      ...basicStats,
      totalWordCount,
      targetWordCount,
      wordCountDeviation,
      chaptersWithWarnings,
      commercialValidation,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get keywords that indicate a commercial beat is present
   */
  private getBeatIndicators(beatName: string): string[] {
    const indicators: Record<string, string[]> = {
      'Opening Hook': ['gripping', 'hook', 'intriguing', 'tension', 'mystery'],
      'Inciting Incident': ['discovers', 'learns', 'changes', 'disrupts', 'revelation'],
      'First Plot Point': ['decides', 'commits', 'embarks', 'journey', 'no turning back'],
      'Midpoint Twist': ['twist', 'revelation', 'truth', 'discovers', 'reversal'],
      'Dark Moment / All Is Lost': ['despair', 'hopeless', 'lost', 'fails', 'lowest'],
      'Climax': ['confronts', 'battle', 'final', 'showdown', 'climax'],
      'Resolution': ['resolves', 'peace', 'conclusion', 'aftermath', 'new beginning'],
    };

    return indicators[beatName] || [];
  }

  /**
   * Estimate dialogue ratio in content (simple heuristic)
   */
  private estimateDialogueRatio(content: string): number {
    if (!content) return 0;

    // Count dialogue markers (quotes)
    const dialogueMatches = content.match(/["'"'][^"'"']+["'"']/g) || [];
    const dialogueCharCount = dialogueMatches.reduce((sum, match) => sum + match.length, 0);

    return content.length > 0 ? dialogueCharCount / content.length : 0;
  }
}

// Export singleton instance
export const chapterOrchestratorService = new ChapterOrchestratorService();
