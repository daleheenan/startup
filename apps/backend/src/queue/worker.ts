import db from '../db/connection.js';
import { checkpointManager } from './checkpoint.js';
import { rateLimitHandler, RateLimitHandler } from './rate-limit-handler.js';
import type { Job, JobType, JobStatus } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { createLogger } from '../services/logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { QueueConfig } from '../config/queue.config.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('queue:worker');

/**
 * Safely parse JSON with a fallback value
 * Prevents worker crashes from malformed database data
 */
function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn({ jsonString: jsonString.substring(0, 100) }, 'safeJsonParse: Failed to parse JSON, using fallback');
    return fallback;
  }
}

/**
 * Get project ID from chapter ID
 */
function getProjectIdFromChapter(chapterId: string): string | null {
  try {
    const stmt = db.prepare<[string], { project_id: string }>(`
      SELECT b.project_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);
    const result = stmt.get(chapterId);
    return result?.project_id || null;
  } catch (error) {
    logger.warn({ chapterId, error }, 'getProjectIdFromChapter: Failed to get project ID');
    return null;
  }
}

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
  private pollIntervalMs = QueueConfig.POLL_INTERVAL_MS;
  private shutdownPromise: Promise<void> | null = null;
  private shutdownResolve: (() => void) | null = null;

  /**
   * Start the queue worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('[QueueWorker] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[QueueWorker] Starting...');

    while (this.isRunning) {
      try {
        await this.processNextJob();
      } catch (error) {
        logger.error({ error }, 'Unexpected error in worker loop');
      }

      // Wait before checking for next job
      await this.sleep(this.pollIntervalMs);
    }
  }

  /**
   * Stop the queue worker gracefully
   * Waits for the current job to complete before resolving
   */
  stop(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.isRunning = false;
    logger.info('[QueueWorker] Stopping...');

    // If no job is running, resolve immediately
    if (!this.currentJob) {
      logger.info('[QueueWorker] No active job, stopped immediately');
      return Promise.resolve();
    }

    // Wait for current job to finish
    this.shutdownPromise = new Promise((resolve) => {
      this.shutdownResolve = resolve;
      logger.info({ jobId: this.currentJob?.id }, 'Waiting for job to complete...');

      // Timeout after configured period
      setTimeout(() => {
        if (this.currentJob) {
          logger.warn(`[QueueWorker] Timeout waiting for job ${this.currentJob.id}, forcing shutdown`);
        }
        resolve();
      }, QueueConfig.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    });

    return this.shutdownPromise;
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
      logger.info({ jobId: job.id, type: job.type }, 'Starting job');

      // Execute the job
      await this.executeJob(job);

      // Mark as completed
      this.markCompleted(job.id);
      logger.info({ jobId: job.id }, 'Completed job');
    } catch (error) {
      if (RateLimitHandler.isRateLimitError(error)) {
        // Handle rate limit
        logger.info('[QueueWorker] Rate limit detected, pausing queue');
        await rateLimitHandler.handleRateLimit(job);
      } else {
        // Handle other errors
        await this.retryOrFail(job, error);
      }
    } finally {
      this.currentJob = null;
      // Signal shutdown if waiting
      if (this.shutdownResolve && !this.isRunning) {
        logger.info('[QueueWorker] Job complete, shutdown proceeding');
        this.shutdownResolve();
      }
    }
  }

  /**
   * Pick up the next pending job from the queue atomically
   * Uses a transaction with status check to prevent race conditions
   * Sprint 16: Skip jobs for locked chapters
   */
  private pickupJob(): Job | null {
    const now = new Date().toISOString();

    // Use transaction to ensure atomic SELECT + UPDATE
    const transaction = db.transaction(() => {
      const stmt = db.prepare<[], Job>(`
        SELECT j.* FROM jobs j
        LEFT JOIN chapter_edits ce ON j.target_id = ce.chapter_id
        WHERE j.status = 'pending'
        AND (ce.is_locked IS NULL OR ce.is_locked = 0)
        ORDER BY j.created_at ASC
        LIMIT 1
      `);

      const job = stmt.get();
      if (!job) return null;

      // Atomically update only if status is still 'pending'
      // This prevents race conditions with other workers
      const updateStmt = db.prepare(`
        UPDATE jobs
        SET status = 'running', started_at = ?
        WHERE id = ? AND status = 'pending'
      `);

      const result = updateStmt.run(now, job.id);

      // If no rows updated, another worker got it first
      if (result.changes === 0) return null;

      // Return updated job
      return { ...job, status: 'running' as const, started_at: now };
    });

    return transaction();
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
      case 'author_revision':
        return await this.authorRevision(job);
      case 'line_edit':
        return await this.lineEdit(job);
      case 'continuity_check':
        return await this.continuityCheck(job);
      case 'copy_edit':
        return await this.copyEdit(job);
      case 'proofread':
        return await this.proofread(job);
      case 'sensitivity_review':
        return await this.sensitivityReview(job);
      case 'research_review':
        return await this.researchReview(job);
      case 'beta_reader_review':
        return await this.betaReaderReview(job);
      case 'opening_review':
        return await this.openingReview(job);
      case 'dialogue_review':
        return await this.dialogueReview(job);
      case 'hook_review':
        return await this.hookReview(job);
      case 'generate_summary':
        return await this.generateSummary(job);
      case 'update_states':
        return await this.updateStates(job);
      // VEB (Virtual Editorial Board) job types
      case 'veb_beta_swarm':
        return await this.vebBetaSwarm(job);
      case 'veb_ruthless_editor':
        return await this.vebRuthlessEditor(job);
      case 'veb_market_analyst':
        return await this.vebMarketAnalyst(job);
      case 'veb_finalize':
        return await this.vebFinalize(job);
      // Sprint 38: Post-Completion Features (TODO: implement methods)
      // case 'analyze_book':
      //   return await this.analyzeBook(job);
      // case 'generate_follow_up':
      //   return await this.generateFollowUp(job);
      // Background validation checks
      case 'coherence_check':
        return await this.coherenceCheck(job);
      case 'originality_check':
        return await this.originalityCheck(job);
      // Sprint 39: Outline Editorial Board job types
      case 'outline_structure_analyst':
        return await this.outlineStructureAnalyst(job);
      case 'outline_character_arc':
        return await this.outlineCharacterArc(job);
      case 'outline_market_fit':
        return await this.outlineMarketFit(job);
      case 'outline_editorial_finalize':
        return await this.outlineEditorialFinalize(job);
      // AI Rewrite - rewrites plot and outline based on editorial recommendations
      case 'outline_rewrite':
        return await this.outlineRewrite(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Generate a chapter
   */
  private async generateChapter(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'generate_chapter: Processing chapter');
    const chapterId = job.target_id;

    // Import services (dynamic to avoid circular dependencies)
    const { contextAssemblyService } = await import('../services/context-assembly.service.js');
    const { claudeService } = await import('../services/claude.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    // Save checkpoint: started
    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Step 1: Update chapter status to 'writing'
      logger.info('generate_chapter: Updating status to writing');
      const updateStatusStmt = db.prepare(`
        UPDATE chapters
        SET status = 'writing', updated_at = ?
        WHERE id = ?
      `);
      updateStatusStmt.run(new Date().toISOString(), chapterId);

      checkpointManager.saveCheckpoint(job.id, 'status_updated', { chapterId });

      // Step 2: Assemble context
      logger.info('generate_chapter: Assembling context');
      const context = await contextAssemblyService.assembleChapterContext(chapterId);
      logger.info({ estimatedTokens: context.estimatedTokens }, 'generate_chapter: Context assembled');

      checkpointManager.saveCheckpoint(job.id, 'context_assembled', {
        chapterId,
        estimatedTokens: context.estimatedTokens,
      });

      // Get project ID for tracking
      const projectId = getProjectIdFromChapter(chapterId);

      // Step 3: Generate chapter with Claude (with token tracking)
      logger.info('generate_chapter: Generating chapter content with Claude');
      const response = await claudeService.createCompletionWithUsage({
        system: context.system,
        messages: [{ role: 'user', content: context.userPrompt }],
        maxTokens: 4096, // Max output length
        temperature: 1.0, // Creative writing benefits from higher temperature
        tracking: {
          requestType: AI_REQUEST_TYPES.CHAPTER_GENERATION,
          projectId,
          chapterId,
          contextSummary: `Generating chapter content`,
        },
      });

      const chapterContent = response.content;

      // Track token usage (for chapter-specific aggregation)
      logger.info({ inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }, 'generate_chapter: Tracking tokens');
      metricsService.trackChapterTokens(chapterId, response.usage.input_tokens, response.usage.output_tokens);

      checkpointManager.saveCheckpoint(job.id, 'content_generated', {
        chapterId,
        wordCount: chapterContent.split(/\s+/).length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      // Step 4: Save chapter content
      logger.info('generate_chapter: Saving chapter content');
      const wordCount = chapterContent.split(/\s+/).length;

      const updateContentStmt = db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, status = 'editing', updated_at = ?
        WHERE id = ?
      `);
      updateContentStmt.run(chapterContent, wordCount, new Date().toISOString(), chapterId);

      logger.info({ wordCount }, 'generate_chapter: Chapter generated');

      checkpointManager.saveCheckpoint(job.id, 'completed', {
        chapterId,
        wordCount,
      });
    } catch (error) {
      logger.error({ error }, 'generate_chapter: Error generating chapter');
      // Update chapter status to failed
      const updateErrorStmt = db.prepare(`
        UPDATE chapters
        SET status = 'pending', updated_at = ?
        WHERE id = ?
      `);
      updateErrorStmt.run(new Date().toISOString(), chapterId);
      throw error;
    }
  }

  /**
   * Developmental edit - Analyze chapter structure, pacing, character arcs
   */
  private async developmentalEdit(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'dev_edit: Processing chapter');
    const chapterId = job.target_id;

    // Import editing service
    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Run developmental edit
      const result = await editingService.developmentalEdit(chapterId);

      // Track token usage
      if (result.usage) {
        logger.info({ inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }, 'dev_edit: Tracking tokens');
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      checkpointManager.saveCheckpoint(job.id, 'dev_edit_complete', {
        chapterId,
        suggestionsCount: result.suggestions.length,
        flagsCount: result.flags.length,
        needsRevision: !result.approved,
      });

      // Apply the result (update flags)
      await editingService.applyEditResult(chapterId, result);

      // If developmental editor says revision needed, queue author revision
      if (!result.approved) {
        logger.info('dev_edit: Chapter needs revision, queueing author_revision job');

        // Queue author revision job
        QueueWorker.createJob('author_revision' as any, chapterId);

        // Store dev edit result for revision job to use
        const storeStmt = db.prepare(`
          UPDATE jobs
          SET checkpoint = ?
          WHERE id = ?
        `);
        storeStmt.run(JSON.stringify({ devEditResult: result }), job.id);
      }

      logger.info({ flagsCount: result.flags.length, approved: result.approved }, 'dev_edit: Complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'dev_edit: Error');
      throw error;
    }
  }

  /**
   * Author revision - Revise chapter based on developmental feedback
   */
  private async authorRevision(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'author_revision: Processing chapter');
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Get dev edit result from previous job
      const getDevEditStmt = db.prepare<[string], { checkpoint: string | null }>(`
        SELECT checkpoint FROM jobs
        WHERE target_id = ? AND type = 'dev_edit'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const devEditJob = getDevEditStmt.get(chapterId);
      if (!devEditJob || !devEditJob.checkpoint) {
        throw new Error('No developmental edit feedback found for revision');
      }

      const { devEditResult } = JSON.parse(devEditJob.checkpoint);

      // Run author revision
      const revisionResult = await editingService.authorRevision(chapterId, devEditResult);

      // Track token usage
      logger.info({ inputTokens: revisionResult.usage.input_tokens, outputTokens: revisionResult.usage.output_tokens }, 'author_revision: Tracking tokens');
      metricsService.trackChapterTokens(chapterId, revisionResult.usage.input_tokens, revisionResult.usage.output_tokens);

      checkpointManager.saveCheckpoint(job.id, 'revision_complete', { chapterId });

      // Update chapter with revised content
      const updateStmt = db.prepare(`
        UPDATE chapters
        SET content = ?, updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(revisionResult.content, new Date().toISOString(), chapterId);

      logger.info('author_revision: Revision complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'author_revision: Error');
      throw error;
    }
  }

  /**
   * Line edit - Polish prose, dialogue, sensory details
   */
  private async lineEdit(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'line_edit: Processing chapter');
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.lineEdit(chapterId);

      // Track token usage
      if (result.usage) {
        logger.info({ inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }, 'line_edit: Tracking tokens');
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      checkpointManager.saveCheckpoint(job.id, 'line_edit_complete', {
        chapterId,
        flagsCount: result.flags.length,
      });

      await editingService.applyEditResult(chapterId, result);

      logger.info({ flagsCount: result.flags.length }, 'line_edit: Complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'line_edit: Error');
      throw error;
    }
  }

  /**
   * Continuity check - Verify consistency with story bible and previous chapters
   */
  private async continuityCheck(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'continuity_check: Processing chapter');
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.continuityEdit(chapterId);

      // Track token usage
      if (result.usage) {
        logger.info({ inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }, 'continuity_check: Tracking tokens');
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      checkpointManager.saveCheckpoint(job.id, 'continuity_check_complete', {
        chapterId,
        suggestionsCount: result.suggestions.length,
        flagsCount: result.flags.length,
      });

      await editingService.applyEditResult(chapterId, result);

      logger.info({ suggestionsCount: result.suggestions.length, flagsCount: result.flags.length }, 'continuity_check: Complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'continuity_check: Error');
      throw error;
    }
  }

  /**
   * Copy edit - Grammar, punctuation, style consistency
   */
  private async copyEdit(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'copy_edit: Processing chapter');
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.copyEdit(chapterId);

      // Track token usage
      if (result.usage) {
        logger.info({ inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }, 'copy_edit: Tracking tokens');
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      checkpointManager.saveCheckpoint(job.id, 'copy_edit_complete', { chapterId });

      await editingService.applyEditResult(chapterId, result);

      logger.info('copy_edit: Complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'copy_edit: Error');
      throw error;
    }
  }

  /**
   * Proofread - Final quality check before export
   */
  private async proofread(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'proofread: Processing chapter');
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.proofread(chapterId);

      // Track token usage
      if (result.usage) {
        logger.info({ inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }, 'proofread: Tracking tokens');
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      checkpointManager.saveCheckpoint(job.id, 'proofread_complete', { chapterId });

      await editingService.applyEditResult(chapterId, result);

      // After proofread (final editing step), update word count
      const getContentStmt = db.prepare<[string], { content: string }>(`
        SELECT content FROM chapters WHERE id = ?
      `);
      const chapter = getContentStmt.get(chapterId);
      if (chapter && chapter.content) {
        const wordCount = chapter.content.split(/\s+/).length;
        const updateWordCountStmt = db.prepare(`
          UPDATE chapters
          SET word_count = ?, updated_at = ?
          WHERE id = ?
        `);
        updateWordCountStmt.run(wordCount, new Date().toISOString(), chapterId);
      }

      logger.info('proofread: Complete');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'proofread: Error');
      throw error;
    }
  }

  /**
   * Sensitivity review for a chapter
   */
  private async sensitivityReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'sensitivity_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.sensitivityReview(chapterId);

      if (result.usage) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      // Apply edits if content was changed
      if (result.editedContent !== result.originalContent) {
        const updateStmt = db.prepare(`
          UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
        `);
        updateStmt.run(result.editedContent, new Date().toISOString(), chapterId);
      }

      // Store flags
      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ findingsCount: result.findings.length }, 'sensitivity_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'sensitivity_review: Error');
      throw error;
    }
  }

  /**
   * Research review for a chapter
   */
  private async researchReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'research_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.researchReview(chapterId);

      if (result.usage) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      if (result.editedContent !== result.originalContent) {
        const updateStmt = db.prepare(`
          UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
        `);
        updateStmt.run(result.editedContent, new Date().toISOString(), chapterId);
      }

      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ findingsCount: result.findings.length }, 'research_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'research_review: Error');
      throw error;
    }
  }

  /**
   * Beta reader review for a chapter
   */
  private async betaReaderReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'beta_reader_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.betaReaderReview(chapterId);

      if (result.usage) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      // Beta reader doesn't edit content, just flags issues
      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ engagementScore: result.score, findingsCount: result.findings.length }, 'beta_reader_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'beta_reader_review: Error');
      throw error;
    }
  }

  /**
   * Opening specialist review for chapter 1
   */
  private async openingReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'opening_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.openingReview(chapterId);

      if (result.usage && result.usage.input_tokens > 0) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      if (result.editedContent !== result.originalContent) {
        const updateStmt = db.prepare(`
          UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
        `);
        updateStmt.run(result.editedContent, new Date().toISOString(), chapterId);
      }

      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ firstLineScore: result.score }, 'opening_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'opening_review: Error');
      throw error;
    }
  }

  /**
   * Dialogue coach review for a chapter
   */
  private async dialogueReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'dialogue_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.dialogueReview(chapterId);

      if (result.usage) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      if (result.editedContent !== result.originalContent) {
        const updateStmt = db.prepare(`
          UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
        `);
        updateStmt.run(result.editedContent, new Date().toISOString(), chapterId);
      }

      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ dialogueScore: result.score, findingsCount: result.findings.length }, 'dialogue_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'dialogue_review: Error');
      throw error;
    }
  }

  /**
   * Chapter hook specialist review
   */
  private async hookReview(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'hook_review: Processing chapter');
    const chapterId = job.target_id;

    const { specialistAgentsService } = await import('../services/specialist-agents.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await specialistAgentsService.hookReview(chapterId);

      if (result.usage) {
        metricsService.trackChapterTokens(chapterId, result.usage.input_tokens, result.usage.output_tokens);
      }

      if (result.editedContent !== result.originalContent) {
        const updateStmt = db.prepare(`
          UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?
        `);
        updateStmt.run(result.editedContent, new Date().toISOString(), chapterId);
      }

      if (result.flags.length > 0) {
        const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
        const chapter = chapterStmt.get(chapterId) as any;
        const existingFlags = safeJsonParse<string[]>(chapter?.flags, []);
        const updateFlagsStmt = db.prepare(`UPDATE chapters SET flags = ? WHERE id = ?`);
        updateFlagsStmt.run(JSON.stringify([...existingFlags, ...result.flags]), chapterId);
      }

      logger.info({ hookScore: result.score }, 'hook_review: Complete');
      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'hook_review: Error');
      throw error;
    }
  }

  /**
   * Generate summary for a chapter (used as context for next chapter)
   */
  private async generateSummary(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'generate_summary: Processing chapter');
    const chapterId = job.target_id;

    // Import services
    const { claudeService } = await import('../services/claude.service.js');
    const { metricsService } = await import('../services/metrics.service.js');

    // Save checkpoint
    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Get chapter content
      const getChapterStmt = db.prepare<[string], { content: string; chapter_number: number }>(`
        SELECT content, chapter_number FROM chapters WHERE id = ?
      `);

      const chapter = getChapterStmt.get(chapterId);
      if (!chapter || !chapter.content) {
        throw new Error('Chapter content not found');
      }

      logger.info({ chapterNumber: chapter.chapter_number }, 'generate_summary: Generating summary');

      // Generate summary with Claude
      const systemPrompt = `You are a professional story analyst. Your task is to create concise, informative chapter summaries for use as context in subsequent chapters.`;

      const userPrompt = `Read the following chapter and create a summary in approximately 200 words.

Focus on:
1. Key plot events that happened
2. Character emotional states and changes
3. Important revelations or information learned
4. Relationships that changed
5. Setup for future events

Write the summary in past tense, third person.

CHAPTER CONTENT:
${chapter.content}

Write the summary now:`;

      // Get project ID for tracking
      const projectId = getProjectIdFromChapter(chapterId);

      const apiResponse = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.7,
        tracking: {
          requestType: AI_REQUEST_TYPES.GENERATE_SUMMARY,
          projectId,
          chapterId,
          contextSummary: `Generating chapter ${chapter.chapter_number} summary`,
        },
      });

      // Track token usage (for chapter-specific aggregation)
      logger.info({ inputTokens: apiResponse.usage.input_tokens, outputTokens: apiResponse.usage.output_tokens }, 'generate_summary: Tracking tokens');
      metricsService.trackChapterTokens(chapterId, apiResponse.usage.input_tokens, apiResponse.usage.output_tokens);

      checkpointManager.saveCheckpoint(job.id, 'summary_generated', { chapterId });

      // Save summary to database
      const updateSummaryStmt = db.prepare(`
        UPDATE chapters
        SET summary = ?, updated_at = ?
        WHERE id = ?
      `);

      updateSummaryStmt.run(apiResponse.content.trim(), new Date().toISOString(), chapterId);

      logger.info({ chapterNumber: chapter.chapter_number }, 'generate_summary: Summary saved');

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'generate_summary: Error generating summary');
      throw error;
    }
  }

  /**
   * Update character states after chapter generation
   */
  private async updateStates(job: Job): Promise<void> {
    logger.info({ chapterId: job.target_id }, 'update_states: Processing chapter');
    const chapterId = job.target_id;

    // Import services
    const { claudeService } = await import('../services/claude.service.js');

    // Save checkpoint
    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Get chapter and project data
      const getChapterDataStmt = db.prepare<[string], any>(`
        SELECT
          c.content,
          c.chapter_number,
          c.scene_cards,
          b.id as book_id,
          b.project_id,
          p.story_bible
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE c.id = ?
      `);

      const data = getChapterDataStmt.get(chapterId);
      if (!data || !data.content) {
        throw new Error('Chapter data not found');
      }

      const storyBible = safeJsonParse<any>(data.story_bible, null);
      const sceneCards = safeJsonParse<any[]>(data.scene_cards, []);

      if (!storyBible || !storyBible.characters) {
        logger.info('update_states: No story bible found, skipping state update');
        // Still mark chapter as completed
        this.markChapterComplete(chapterId);
        return;
      }

      // Get characters who appeared in this chapter
      const characterNames = new Set<string>();
      sceneCards.forEach((scene: any) => {
        scene.characters?.forEach((name: string) => characterNames.add(name));
      });

      if (characterNames.size === 0) {
        logger.info('update_states: No characters to update');
        // Still mark chapter as completed
        this.markChapterComplete(chapterId);
        return;
      }

      logger.info({ characters: Array.from(characterNames) }, 'update_states: Updating character states');

      // Generate state update with Claude
      const systemPrompt = `You are a continuity tracker for a novel. Your task is to update character states based on what happened in a chapter.`;

      const userPrompt = `Read this chapter and update the states for the following characters: ${Array.from(characterNames).join(', ')}

For each character, determine:
1. Their current location (where they are at the end of the chapter)
2. Their emotional state (how they're feeling)
3. Their current goals (what they want now)
4. Their current conflicts (what's opposing them)

CHAPTER CONTENT:
${data.content}

Respond with a JSON object with this structure:
{
  "Character Name": {
    "location": "where they are",
    "emotionalState": "how they feel",
    "goals": ["goal 1", "goal 2"],
    "conflicts": ["conflict 1", "conflict 2"]
  }
}

Output only valid JSON, no commentary:`;

      const response = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1000,
        temperature: 0.5,
        tracking: {
          requestType: AI_REQUEST_TYPES.UPDATE_STATES,
          projectId: data.project_id,
          bookId: data.book_id,
          chapterId: chapterId,
          contextSummary: `Character state update for chapter ${data.chapter_number}`,
        },
      });

      checkpointManager.saveCheckpoint(job.id, 'states_analyzed', { chapterId });

      // Parse the response
      let stateUpdates: Record<string, any>;
      try {
        stateUpdates = extractJsonObject(response.content);
      } catch (parseError: any) {
        logger.error({ error: parseError.message, response: response.content.substring(0, 500) }, 'update_states: Failed to parse state updates');
        // Don't fail the job, just skip the update and mark chapter complete
        this.markChapterComplete(chapterId);
        return;
      }

      // Update story bible with new character states
      for (const character of storyBible.characters) {
        if (stateUpdates[character.name]) {
          character.currentState = stateUpdates[character.name];
          logger.info({
            characterName: character.name,
            emotionalState: character.currentState.emotionalState,
            location: character.currentState.location
          }, 'update_states: Character updated');
        }
      }

      // Save updated story bible
      const updateStoryBibleStmt = db.prepare(`
        UPDATE projects
        SET story_bible = ?, updated_at = ?
        WHERE id = ?
      `);

      updateStoryBibleStmt.run(
        JSON.stringify(storyBible),
        new Date().toISOString(),
        data.project_id
      );

      logger.info('update_states: Character states updated');

      // Mark chapter as completed (this is the final job in the pipeline)
      this.markChapterComplete(chapterId);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      logger.error({ error }, 'update_states: Error updating states');
      throw error;
    }
  }

  /**
   * Mark a chapter as completed
   */
  private markChapterComplete(chapterId: string): void {
    const stmt = db.prepare(`
      UPDATE chapters
      SET status = 'completed', updated_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), chapterId);
    logger.info({ chapterId }, 'Chapter marked as completed');
  }

  // ==========================================================================
  // VEB (Virtual Editorial Board) Handlers
  // ==========================================================================

  /**
   * VEB Module A: Beta Swarm - Reader engagement analysis
   * target_id = report ID
   */
  private async vebBetaSwarm(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'veb_beta_swarm: Starting Beta Swarm analysis');

    try {
      // Import VEB service dynamically
      const { vebService } = await import('../services/veb.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      // Run the Beta Swarm analysis
      const result = await vebService.runBetaSwarm(reportId);

      logger.info({
        reportId,
        overallEngagement: result.overallEngagement,
        chaptersAnalyzed: result.chapterResults.length
      }, 'veb_beta_swarm: Completed Beta Swarm analysis');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueVebFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'veb_beta_swarm: Error in Beta Swarm analysis');
      throw error;
    }
  }

  /**
   * VEB Module B: Ruthless Editor - Structural analysis
   * target_id = report ID
   */
  private async vebRuthlessEditor(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'veb_ruthless_editor: Starting Ruthless Editor analysis');

    try {
      const { vebService } = await import('../services/veb.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const result = await vebService.runRuthlessEditor(reportId);

      logger.info({
        reportId,
        overallStructureScore: result.overallStructureScore,
        chaptersAnalyzed: result.chapterResults.length
      }, 'veb_ruthless_editor: Completed Ruthless Editor analysis');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueVebFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'veb_ruthless_editor: Error in Ruthless Editor analysis');
      throw error;
    }
  }

  /**
   * VEB Module C: Market Analyst - Commercial viability
   * target_id = report ID
   */
  private async vebMarketAnalyst(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'veb_market_analyst: Starting Market Analyst analysis');

    try {
      const { vebService } = await import('../services/veb.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const result = await vebService.runMarketAnalyst(reportId);

      logger.info({
        reportId,
        commercialViabilityScore: result.commercialViabilityScore,
        compTitles: result.compTitles.length
      }, 'veb_market_analyst: Completed Market Analyst analysis');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueVebFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'veb_market_analyst: Error in Market Analyst analysis');
      throw error;
    }
  }

  /**
   * Check if all VEB modules are complete and queue the finalize job if so.
   * This is called after each module completes to ensure finalize runs only
   * after all 3 modules have finished.
   */
  private maybeQueueVebFinalize(reportId: string): void {
    try {
      // Check if all 3 modules are complete
      const report = db.prepare(`
        SELECT beta_swarm_status, ruthless_editor_status, market_analyst_status, status
        FROM editorial_reports WHERE id = ?
      `).get(reportId) as any;

      if (!report) {
        logger.warn({ reportId }, 'maybeQueueVebFinalize: Report not found');
        return;
      }

      const allComplete =
        report.beta_swarm_status === 'completed' &&
        report.ruthless_editor_status === 'completed' &&
        report.market_analyst_status === 'completed';

      if (!allComplete) {
        logger.debug({
          reportId,
          beta: report.beta_swarm_status,
          editor: report.ruthless_editor_status,
          market: report.market_analyst_status
        }, 'maybeQueueVebFinalize: Not all modules complete yet');
        return;
      }

      // Check if finalize job already exists for this report
      const existingJob = db.prepare(`
        SELECT id FROM jobs
        WHERE type = 'veb_finalize' AND target_id = ? AND status IN ('pending', 'running')
      `).get(reportId);

      if (existingJob) {
        logger.debug({ reportId }, 'maybeQueueVebFinalize: Finalize job already exists');
        return;
      }

      // Queue the finalize job
      logger.info({ reportId }, 'maybeQueueVebFinalize: All modules complete, queuing finalize job');
      QueueWorker.createJob('veb_finalize', reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'maybeQueueVebFinalize: Error checking/queuing finalize');
    }
  }

  /**
   * VEB Finalize - Aggregate results and generate overall report
   * target_id = report ID
   */
  private async vebFinalize(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'veb_finalize: Starting report finalization');

    try {
      const { vebService } = await import('../services/veb.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const report = await vebService.finalizeReport(reportId);

      logger.info({
        reportId,
        overallScore: report.overallScore,
        status: report.status
      }, 'veb_finalize: Completed report finalization');

      // Extract lessons learned from the VEB report for future book generation
      try {
        const { editorialLessonsService } = await import('../services/editorial-lessons.service.js');

        // Get book ID for this project
        const bookRow = db.prepare<[string], { id: string }>(`
          SELECT b.id FROM books b WHERE b.project_id = ? ORDER BY b.book_number LIMIT 1
        `).get(report.projectId);

        if (bookRow) {
          const vebReportData = {
            ruthlessEditor: report.ruthlessEditor ? {
              chapterResults: report.ruthlessEditor.chapterResults,
              summaryVerdict: report.ruthlessEditor.summaryVerdict,
            } : undefined,
            betaSwarm: report.betaSwarm ? {
              chapterResults: report.betaSwarm.chapterResults,
              summaryReaction: report.betaSwarm.summaryReaction,
            } : undefined,
            marketAnalyst: report.marketAnalyst ? {
              hookAnalysis: report.marketAnalyst.hookAnalysis,
              marketPositioning: report.marketAnalyst.marketPositioning,
              agentNotes: report.marketAnalyst.summaryPitch,
            } : undefined,
            recommendations: report.recommendations,
            summary: report.summary,
          };

          const lessons = editorialLessonsService.extractLessonsFromVEB(
            report.projectId,
            bookRow.id,
            vebReportData
          );

          logger.info({
            reportId,
            projectId: report.projectId,
            lessonsExtracted: lessons.length
          }, 'veb_finalize: Extracted lessons from VEB report');
        }
      } catch (lessonError) {
        // Log but don't fail the job if lesson extraction fails
        logger.warn({ error: lessonError, reportId }, 'veb_finalize: Failed to extract lessons (non-fatal)');
      }

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });
    } catch (error) {
      logger.error({ error, reportId }, 'veb_finalize: Error finalizing report');
      throw error;
    }
  }

  // ==========================================================================
  // Background Validation Checks (triggered when plot layers saved)
  // ==========================================================================

  /**
   * Coherence check - validates plots align with story concept
   * target_id = project ID
   */
  private async coherenceCheck(job: Job): Promise<void> {
    const projectId = job.target_id;
    logger.info({ projectId }, 'coherence_check: Starting coherence validation');

    // Get book and version info early so it's available in catch block
    const bookData = db.prepare<[string], { book_id: string }>(`
      SELECT b.id as book_id FROM books b WHERE b.project_id = ? ORDER BY b.book_number LIMIT 1
    `).get(projectId);
    const bookId = bookData?.book_id || null;

    let versionId: string | null = null;
    if (bookId) {
      const activeVersion = db.prepare<[string], { id: string }>(`
        SELECT id FROM book_versions WHERE book_id = ? AND is_active = 1
      `).get(bookId);
      versionId = activeVersion?.id || null;
    }

    try {
      checkpointManager.saveCheckpoint(job.id, 'started', { projectId });

      // Get project data
      const projectStmt = db.prepare<[string], any>(`
        SELECT title, genre, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
      `);
      const project = projectStmt.get(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      const storyDNA = safeJsonParse<any>(project.story_dna, null);
      const storyBible = safeJsonParse<any>(project.story_bible, null);
      const plotStructure = safeJsonParse<any>(project.plot_structure, { plot_layers: [] });

      // If no plot layers, save a simple result
      if (!plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
        const checkId = randomUUID();
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO coherence_checks (id, project_id, book_id, version_id, checked_at, status, is_coherent, warnings, suggestions, plot_analysis)
          VALUES (?, ?, ?, ?, ?, 'completed', 0, ?, ?, '[]')
        `).run(
          checkId, projectId, bookId, versionId, now,
          JSON.stringify(['No plots defined. Your story needs at least a main plot to generate a quality outline.']),
          JSON.stringify([{
            issue: 'No plots defined for this story.',
            remediation: 'Visit the Plot page to define your main plot (golden thread) and any subplots that weave through your narrative.',
          }])
        );

        logger.info({ projectId, checkId }, 'coherence_check: No plots to validate');
        checkpointManager.saveCheckpoint(job.id, 'completed', { projectId, checkId });
        return;
      }

      // Check for main plot
      const hasMainPlot = plotStructure.plot_layers.some((l: any) => l.type === 'main');
      const warnings: string[] = [];
      const suggestions: Array<{ issue: string; remediation: string }> = [];

      if (!hasMainPlot) {
        warnings.push('No main plot (golden thread) defined. Every novel needs a central narrative arc.');
        suggestions.push({
          issue: 'No main plot (golden thread) defined.',
          remediation: 'Convert one of your subplots to main plot type, or create a new main plot that ties all the narrative threads together as the central story arc.',
        });
      }

      // Build context for AI validation
      const storyContext = `
Title: ${project.title}
Genre: ${project.genre}
${storyDNA?.themes?.length > 0 ? `Themes: ${storyDNA.themes.join(', ')}` : ''}
${storyDNA?.tone ? `Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length > 0 ? `Main Characters: ${storyBible.characters.slice(0, 5).map((c: any) => c.name).join(', ')}` : ''}
      `.trim();

      const plotSummaries = plotStructure.plot_layers.map((p: any) =>
        `- ${p.name} (${p.type}): ${p.description}`
      ).join('\n');

      checkpointManager.saveCheckpoint(job.id, 'context_built', { projectId });

      // Use Claude to validate coherence
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic();

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `You are a story coherence validator. Analyse whether these plots fit the story concept.

**Story Context:**
${storyContext}

**Defined Plots:**
${plotSummaries}

Evaluate:
1. Does each plot fit the genre (${project.genre})?
2. Are plots thematically consistent with the story?
3. Are there any plots that seem out of place or contradictory?
4. Are character arcs connected to characters in the story?

Return ONLY a JSON object:
{
  "isCoherent": true/false,
  "plotAnalysis": [
    {
      "plotName": "Plot name",
      "isCoherent": true/false,
      "reason": "Brief explanation"
    }
  ],
  "overallWarnings": ["Any warnings about the plot structure"],
  "suggestions": [
    {
      "issue": "Brief description of the coherence issue (1 sentence)",
      "remediation": "Specific way the AI would fix this (1-2 sentences explaining the approach)"
    }
  ]
}`,
        }],
      });

      // Track AI cost
      if (message.usage) {
        const { metricsService } = await import('../services/metrics.service.js');
        metricsService.logAIRequest({
          requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
          projectId: projectId,
          bookId: bookId || null,
          chapterId: null,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          model: 'claude-sonnet-4-20250514',
          success: true,
          contextSummary: 'Coherence check - plot validation',
        });
      }

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      let analysis: any = { isCoherent: hasMainPlot, plotAnalysis: [], overallWarnings: [], suggestions: [] };
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (e) {
          logger.warn({ projectId }, 'coherence_check: Failed to parse AI response');
        }
      }

      // Merge AI analysis with basic checks
      const finalWarnings = [...warnings, ...(analysis.overallWarnings || [])];
      const finalSuggestions = [...suggestions, ...(analysis.suggestions || [])];

      // Check for incoherent individual plots
      const incoherentPlots = (analysis.plotAnalysis || []).filter((p: any) => !p.isCoherent);
      incoherentPlots.forEach((p: any) => {
        finalWarnings.push(`"${p.plotName}" may not fit: ${p.reason}`);
      });

      const isCoherent = hasMainPlot && (analysis.isCoherent ?? true) && incoherentPlots.length === 0;

      // Save the result
      const checkId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO coherence_checks (id, project_id, book_id, version_id, checked_at, status, is_coherent, warnings, suggestions, plot_analysis)
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
      `).run(
        checkId, projectId, bookId, versionId, now, isCoherent ? 1 : 0,
        JSON.stringify(finalWarnings),
        JSON.stringify(finalSuggestions),
        JSON.stringify(analysis.plotAnalysis || [])
      );

      logger.info({ projectId, checkId, isCoherent, warningCount: finalWarnings.length }, 'coherence_check: Completed');
      checkpointManager.saveCheckpoint(job.id, 'completed', { projectId, checkId });
    } catch (error) {
      // Save failed check
      const checkId = randomUUID();
      const now = new Date().toISOString();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      db.prepare(`
        INSERT INTO coherence_checks (id, project_id, book_id, version_id, checked_at, status, is_coherent, warnings, suggestions, plot_analysis, error)
        VALUES (?, ?, ?, ?, ?, 'failed', 0, '[]', '[]', '[]', ?)
      `).run(checkId, projectId, bookId, versionId, now, errorMsg);

      logger.error({ error, projectId }, 'coherence_check: Error');
      throw error;
    }
  }

  /**
   * Originality check - validates story concept for originality
   * target_id = project ID
   */
  private async originalityCheck(job: Job): Promise<void> {
    const projectId = job.target_id;
    logger.info({ projectId }, 'originality_check: Starting originality validation');

    try {
      checkpointManager.saveCheckpoint(job.id, 'started', { projectId });

      // Import plagiarism service
      const { plagiarismCheckerService } = await import('../services/plagiarism-checker.service.js');

      // Get project data
      const projectStmt = db.prepare<[string], any>(`
        SELECT title, story_concept, source_concept_id FROM projects WHERE id = ?
      `);
      const project = projectStmt.get(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      const storyConcept = safeJsonParse<any>(project.story_concept, null);

      if (!storyConcept) {
        logger.info({ projectId }, 'originality_check: No story concept, skipping');
        checkpointManager.saveCheckpoint(job.id, 'completed', { projectId, skipped: true });
        return;
      }

      // Run the plagiarism/originality check using checkRawContent
      const result = await plagiarismCheckerService.checkRawContent({
        title: project.title || storyConcept.title,
        logline: storyConcept.logline,
        synopsis: storyConcept.synopsis,
        hook: storyConcept.hook,
        protagonistHint: storyConcept.protagonistHint,
      });

      // Save result to plagiarism_checks table (using project_id as content_id)
      const checkId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO plagiarism_checks (id, content_type, content_id, checked_at, status, originality_score, similar_works, flags, recommendations, analysis_details)
        VALUES (?, 'concept', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkId,
        projectId,
        now,
        result.status,
        JSON.stringify(result.originalityScore),
        JSON.stringify(result.similarWorks),
        JSON.stringify(result.flags),
        JSON.stringify(result.recommendations),
        JSON.stringify(result.analysisDetails)
      );

      logger.info({
        projectId,
        checkId,
        overallScore: result.originalityScore.overall,
        status: result.status
      }, 'originality_check: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', { projectId, checkId });
    } catch (error) {
      logger.error({ error, projectId }, 'originality_check: Error');
      throw error;
    }
  }

  // ==========================================================================
  // Sprint 38: Post-Completion Features Handlers
  // ==========================================================================

  /**
   * Analyze a completed book and cache the results
   * target_id = book ID
   */
  private async analyzeBook(job: Job): Promise<void> {
    const bookId = job.target_id;
    logger.info({ bookId }, 'analyze_book: Starting book analysis');

    try {
      // Import services dynamically
      const { AnalyticsService } = await import('../services/analyticsService.js');
      const { completionDetectionService } = await import('../services/completion-detection.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { bookId });

      // Get all chapters for this book
      const chaptersStmt = db.prepare<[string], any>(`
        SELECT id, content, scene_cards FROM chapters WHERE book_id = ? ORDER BY chapter_number
      `);
      const chapters = chaptersStmt.all(bookId);

      if (chapters.length === 0) {
        throw new Error('No chapters found for this book');
      }

      logger.info({ bookId, chapterCount: chapters.length }, 'analyze_book: Analyzing chapters');

      // Analyse each chapter
      const chapterAnalytics: any[] = [];

      for (const chapter of chapters) {
        if (!chapter.content) continue;

        const sceneCards = safeJsonParse<any[]>(chapter.scene_cards, []);
        const analytics = await AnalyticsService.analyzeChapter(chapter.id, chapter.content, sceneCards);

        // Upsert chapter analytics
        const existingAnalytics = db.prepare('SELECT id FROM chapter_analytics WHERE chapter_id = ?').get(chapter.id);

        if (existingAnalytics) {
          db.prepare(`
            UPDATE chapter_analytics
            SET pacing_score = ?, pacing_data = ?, character_screen_time = ?,
                dialogue_percentage = ?, dialogue_word_count = ?, narrative_word_count = ?,
                readability_score = ?, avg_sentence_length = ?, complex_word_percentage = ?,
                tension_score = ?, tension_arc = ?, updated_at = datetime('now')
            WHERE chapter_id = ?
          `).run(
            analytics.pacing_score,
            JSON.stringify(analytics.pacing_data),
            JSON.stringify(analytics.character_screen_time),
            analytics.dialogue_percentage,
            analytics.dialogue_word_count,
            analytics.narrative_word_count,
            analytics.readability_score,
            analytics.avg_sentence_length,
            analytics.complex_word_percentage,
            analytics.tension_score,
            JSON.stringify(analytics.tension_arc),
            chapter.id
          );
        } else {
          db.prepare(`
            INSERT INTO chapter_analytics (
              id, chapter_id, pacing_score, pacing_data, character_screen_time,
              dialogue_percentage, dialogue_word_count, narrative_word_count,
              readability_score, avg_sentence_length, complex_word_percentage,
              tension_score, tension_arc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            randomUUID(), chapter.id,
            analytics.pacing_score, JSON.stringify(analytics.pacing_data),
            JSON.stringify(analytics.character_screen_time),
            analytics.dialogue_percentage, analytics.dialogue_word_count, analytics.narrative_word_count,
            analytics.readability_score, analytics.avg_sentence_length, analytics.complex_word_percentage,
            analytics.tension_score, JSON.stringify(analytics.tension_arc)
          );
        }

        chapterAnalytics.push(analytics);
      }

      checkpointManager.saveCheckpoint(job.id, 'chapters_analyzed', { bookId, chapterCount: chapterAnalytics.length });

      // Calculate book-level analytics
      const bookStmt = db.prepare<[string], { genre: string }>(`
        SELECT p.genre FROM books b JOIN projects p ON b.project_id = p.id WHERE b.id = ?
      `);
      const book = bookStmt.get(bookId);
      const genre = book?.genre || 'general';

      const bookAnalytics = AnalyticsService.calculateBookAnalytics(chapterAnalytics, genre);

      // Get genre benchmark for comparison
      const benchmark = db.prepare('SELECT * FROM genre_benchmarks WHERE genre = ?').get(genre) as any;
      if (bookAnalytics && benchmark) {
        bookAnalytics.genre_comparison = {
          genre,
          pacing_vs_norm: bookAnalytics.avg_pacing_score - benchmark.typical_pacing_score,
          dialogue_vs_norm: bookAnalytics.avg_dialogue_percentage - benchmark.typical_dialogue_percentage,
          readability_vs_norm: bookAnalytics.avg_readability_score - benchmark.typical_readability_score,
        };
      }

      // Upsert book analytics
      const existingBookAnalytics = db.prepare('SELECT id FROM book_analytics WHERE book_id = ?').get(bookId);

      if (existingBookAnalytics) {
        db.prepare(`
          UPDATE book_analytics
          SET avg_pacing_score = ?, pacing_consistency = ?, character_balance = ?,
              avg_dialogue_percentage = ?, avg_readability_score = ?,
              overall_tension_arc = ?, genre_comparison = ?, updated_at = datetime('now')
          WHERE book_id = ?
        `).run(
          bookAnalytics.avg_pacing_score, bookAnalytics.pacing_consistency,
          JSON.stringify(bookAnalytics.character_balance),
          bookAnalytics.avg_dialogue_percentage, bookAnalytics.avg_readability_score,
          JSON.stringify(bookAnalytics.overall_tension_arc),
          JSON.stringify(bookAnalytics.genre_comparison), bookId
        );
      } else {
        db.prepare(`
          INSERT INTO book_analytics (
            id, book_id, avg_pacing_score, pacing_consistency, character_balance,
            avg_dialogue_percentage, avg_readability_score, overall_tension_arc, genre_comparison
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(), bookId, bookAnalytics.avg_pacing_score, bookAnalytics.pacing_consistency,
          JSON.stringify(bookAnalytics.character_balance),
          bookAnalytics.avg_dialogue_percentage, bookAnalytics.avg_readability_score,
          JSON.stringify(bookAnalytics.overall_tension_arc),
          JSON.stringify(bookAnalytics.genre_comparison)
        );
      }

      // Cache analytics in completion record
      completionDetectionService.cacheAnalyticsResults(bookId, JSON.stringify(bookAnalytics));

      logger.info({
        bookId,
        avgPacing: bookAnalytics.avg_pacing_score,
        avgDialogue: bookAnalytics.avg_dialogue_percentage
      }, 'analyze_book: Completed book analysis');

      checkpointManager.saveCheckpoint(job.id, 'completed', { bookId });
    } catch (error) {
      // Update completion record to failed
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE book_completion SET analytics_status = 'failed', updated_at = ? WHERE book_id = ?
      `).run(now, bookId);

      logger.error({ error, bookId }, 'analyze_book: Error analysing book');
      throw error;
    }
  }

  // TODO: Sprint 38 - Implement follow-up service first
  // /**
  //  * Generate follow-up recommendations (sequel ideas, series arcs)
  //  * target_id = book ID
  //  */
  // private async generateFollowUp(job: Job): Promise<void> {
  //   const bookId = job.target_id;
  //   logger.info({ bookId }, 'generate_follow_up: Starting follow-up generation');
  //
  //   try {
  //     // Import services dynamically
  //     const { followUpService } = await import('../services/follow-up.service.js');
  //
  //     checkpointManager.saveCheckpoint(job.id, 'started', { bookId });
  //
  //     // Generate all follow-up content
  //     await followUpService.generateFollowUpRecommendations(bookId);
  //
  //     logger.info({ bookId }, 'generate_follow_up: Completed follow-up generation');
  //     checkpointManager.saveCheckpoint(job.id, 'completed', { bookId });
  //   } catch (error) {
  //     logger.error({ error, bookId }, 'generate_follow_up: Error generating follow-up');
  //     throw error;
  //   }
  // }

  // ==========================================================================
  // Sprint 39: Outline Editorial Board Handlers
  // ==========================================================================

  /**
   * Outline Editorial Module A: Story Structure Analyst
   * target_id = report ID
   */
  private async outlineStructureAnalyst(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'outline_structure_analyst: Starting Structure Analyst');

    try {
      const { outlineEditorialService } = await import('../services/outline-editorial.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const result = await outlineEditorialService.runStructureAnalyst(reportId);

      logger.info({
        reportId,
        plotStructureScore: result.plotStructureScore
      }, 'outline_structure_analyst: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueOutlineEditorialFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'outline_structure_analyst: Error');
      throw error;
    }
  }

  /**
   * Outline Editorial Module B: Character Arc Reviewer
   * target_id = report ID
   */
  private async outlineCharacterArc(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'outline_character_arc: Starting Character Arc Reviewer');

    try {
      const { outlineEditorialService } = await import('../services/outline-editorial.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const result = await outlineEditorialService.runCharacterArcReviewer(reportId);

      logger.info({
        reportId,
        overallCharacterScore: result.overallCharacterScore
      }, 'outline_character_arc: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueOutlineEditorialFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'outline_character_arc: Error');
      throw error;
    }
  }

  /**
   * Outline Editorial Module C: Market Fit Analyst
   * target_id = report ID
   */
  private async outlineMarketFit(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'outline_market_fit: Starting Market Fit Analyst');

    try {
      const { outlineEditorialService } = await import('../services/outline-editorial.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const result = await outlineEditorialService.runMarketFitAnalyst(reportId);

      logger.info({
        reportId,
        marketViabilityScore: result.marketViabilityScore
      }, 'outline_market_fit: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });

      // Check if all modules are complete and queue finalize if so
      this.maybeQueueOutlineEditorialFinalize(reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'outline_market_fit: Error');
      throw error;
    }
  }

  /**
   * Check if all Outline Editorial modules are complete and queue the finalize job if so.
   * This is called after each module completes to ensure finalize runs only
   * after all 3 modules have finished.
   */
  private maybeQueueOutlineEditorialFinalize(reportId: string): void {
    try {
      // Check if all 3 modules are complete
      const report = db.prepare(`
        SELECT structure_analyst_status, character_arc_status, market_fit_status, status
        FROM outline_editorial_reports WHERE id = ?
      `).get(reportId) as any;

      if (!report) {
        logger.warn({ reportId }, 'maybeQueueOutlineEditorialFinalize: Report not found');
        return;
      }

      const allComplete =
        report.structure_analyst_status === 'completed' &&
        report.character_arc_status === 'completed' &&
        report.market_fit_status === 'completed';

      if (!allComplete) {
        logger.debug({
          reportId,
          structure: report.structure_analyst_status,
          character: report.character_arc_status,
          market: report.market_fit_status
        }, 'maybeQueueOutlineEditorialFinalize: Not all modules complete yet');
        return;
      }

      // Check if finalize job already exists for this report
      const existingJob = db.prepare(`
        SELECT id FROM jobs
        WHERE type = 'outline_editorial_finalize' AND target_id = ? AND status IN ('pending', 'running')
      `).get(reportId);

      if (existingJob) {
        logger.debug({ reportId }, 'maybeQueueOutlineEditorialFinalize: Finalize job already exists');
        return;
      }

      // Queue the finalize job
      logger.info({ reportId }, 'maybeQueueOutlineEditorialFinalize: All modules complete, queuing finalize job');
      QueueWorker.createJob('outline_editorial_finalize', reportId);
    } catch (error) {
      logger.error({ error, reportId }, 'maybeQueueOutlineEditorialFinalize: Error checking/queuing finalize');
    }
  }

  /**
   * Outline Editorial Finalise - Aggregate results and generate overall report
   * target_id = report ID
   */
  private async outlineEditorialFinalize(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'outline_editorial_finalize: Starting report finalisation');

    try {
      const { outlineEditorialService } = await import('../services/outline-editorial.service.js');

      checkpointManager.saveCheckpoint(job.id, 'started', { reportId });

      const report = await outlineEditorialService.finaliseReport(reportId);

      logger.info({
        reportId,
        overallScore: report.overallScore,
        readyForGeneration: report.readyForGeneration
      }, 'outline_editorial_finalize: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', { reportId });
    } catch (error) {
      logger.error({ error, reportId }, 'outline_editorial_finalize: Error');
      throw error;
    }
  }

  /**
   * Outline AI Rewrite - Rewrites plot and outline based on editorial recommendations
   * target_id = report ID
   */
  private async outlineRewrite(job: Job): Promise<void> {
    const reportId = job.target_id;
    logger.info({ reportId }, 'outline_rewrite: Starting AI rewrite');

    try {
      const { outlineRewriteService } = await import('../services/outline-rewrite.service.js');

      // Step 1: Started
      checkpointManager.saveCheckpoint(job.id, 'started', {
        reportId,
        step: 'started',
        progress: 5,
        message: 'Initialising rewrite...',
      });

      // Step 2: Fetching data
      checkpointManager.saveCheckpoint(job.id, 'fetching_data', {
        reportId,
        step: 'fetching_data',
        progress: 10,
        message: 'Fetching project data...',
      });

      // Step 3: Creating version
      checkpointManager.saveCheckpoint(job.id, 'creating_version', {
        reportId,
        step: 'creating_version',
        progress: 20,
        message: 'Creating new version...',
      });

      // Step 4: Rewriting plot (service will handle the actual work)
      checkpointManager.saveCheckpoint(job.id, 'rewriting_plot', {
        reportId,
        step: 'rewriting_plot',
        progress: 40,
        message: 'Rewriting plot structure...',
      });

      // Execute the full rewrite (includes all steps internally)
      const result = await outlineRewriteService.rewritePlotAndOutline(reportId);

      // Step 5: Completed
      logger.info({
        reportId,
        newVersionId: result.newVersionId,
        changesCount: result.changes.length,
        inputTokens: result.tokenUsage.input,
        outputTokens: result.tokenUsage.output,
      }, 'outline_rewrite: Completed');

      checkpointManager.saveCheckpoint(job.id, 'completed', {
        reportId,
        step: 'completed',
        progress: 100,
        message: 'Rewrite completed successfully',
        newVersionId: result.newVersionId,
        changes: result.changes,
        tokenUsage: result.tokenUsage,
      });
    } catch (error: any) {
      logger.error({ error: error.message, reportId }, 'outline_rewrite: Error');

      checkpointManager.saveCheckpoint(job.id, 'failed', {
        reportId,
        step: 'failed',
        progress: 0,
        message: 'Rewrite failed',
        error: error.message,
      });

      throw error;
    }
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
    const maxAttempts = QueueConfig.MAX_JOB_RETRY_ATTEMPTS;
    const newAttempts = job.attempts + 1;

    // Build detailed error message with stack trace and code
    const errorDetails = this.formatErrorDetails(error);

    if (newAttempts < maxAttempts) {
      logger.warn({ jobId: job.id, attempts: newAttempts, maxAttempts, error: errorDetails }, 'Job failed, retrying');

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'pending', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, errorDetails, job.id);
    } else {
      logger.error({ jobId: job.id, attempts: maxAttempts, error: errorDetails }, 'Job failed after maximum attempts');

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'failed', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, errorDetails, job.id);
    }
  }

  /**
   * Format error details for storage and display
   */
  private formatErrorDetails(error: any): string {
    if (!error) return 'Unknown error';

    const parts: string[] = [];

    // Error code (e.g., SQLITE_ERROR)
    if (error.code) {
      parts.push(`[${error.code}]`);
    }

    // Main error message
    if (error.message) {
      parts.push(error.message);
    } else if (typeof error === 'string') {
      parts.push(error);
    }

    // SQL query that caused the error (for SQLite errors)
    if (error.sql) {
      parts.push(`\n\nSQL: ${error.sql}`);
    }

    // Stack trace (first 5 lines for brevity)
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1, 6).join('\n');
      parts.push(`\n\nStack:\n${stackLines}`);
    }

    return parts.join(' ') || 'Unknown error';
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

    logger.info({ jobId, type, targetId }, 'Created job');
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

  /**
   * Recover stale jobs on server startup.
   * Jobs that were 'running' when the server crashed/restarted are reset to 'pending'.
   * Also marks VEB modules as 'failed' if their jobs were interrupted.
   *
   * This should be called before starting the queue worker.
   */
  static recoverStaleJobs(): void {
    try {
      // Find jobs that were running (likely from before a crash/restart)
      const staleJobs = db.prepare(`
        SELECT id, type, target_id, started_at FROM jobs
        WHERE status = 'running'
      `).all() as any[];

      if (staleJobs.length === 0) {
        logger.info('[QueueWorker] No stale running jobs found on startup');
        return;
      }

      logger.warn({ count: staleJobs.length }, '[QueueWorker] Found stale running jobs from previous session - resetting to pending');

      // Reset stale jobs to pending and increment attempts
      const resetStmt = db.prepare(`
        UPDATE jobs
        SET status = 'pending',
            error = 'Reset after server restart - job was running when server stopped',
            started_at = NULL
        WHERE id = ?
      `);

      for (const job of staleJobs) {
        logger.info({
          jobId: job.id,
          type: job.type,
          targetId: job.target_id,
          startedAt: job.started_at
        }, '[QueueWorker] Resetting stale job to pending');

        resetStmt.run(job.id);

        // For VEB jobs, mark the corresponding module as failed so UI shows correctly
        if (job.type === 'veb_beta_swarm') {
          db.prepare(`
            UPDATE editorial_reports
            SET beta_swarm_status = 'pending'
            WHERE id = ? AND beta_swarm_status = 'processing'
          `).run(job.target_id);
        } else if (job.type === 'veb_ruthless_editor') {
          db.prepare(`
            UPDATE editorial_reports
            SET ruthless_editor_status = 'pending'
            WHERE id = ? AND ruthless_editor_status = 'processing'
          `).run(job.target_id);
        } else if (job.type === 'veb_market_analyst') {
          db.prepare(`
            UPDATE editorial_reports
            SET market_analyst_status = 'pending'
            WHERE id = ? AND market_analyst_status = 'processing'
          `).run(job.target_id);
        }
        // Similar for outline editorial jobs
        else if (job.type === 'outline_structure_analyst') {
          db.prepare(`
            UPDATE outline_editorial_reports
            SET structure_analyst_status = 'pending'
            WHERE id = ? AND structure_analyst_status = 'processing'
          `).run(job.target_id);
        } else if (job.type === 'outline_character_arc') {
          db.prepare(`
            UPDATE outline_editorial_reports
            SET character_arc_status = 'pending'
            WHERE id = ? AND character_arc_status = 'processing'
          `).run(job.target_id);
        } else if (job.type === 'outline_market_fit') {
          db.prepare(`
            UPDATE outline_editorial_reports
            SET market_fit_status = 'pending'
            WHERE id = ? AND market_fit_status = 'processing'
          `).run(job.target_id);
        }
      }

      logger.info({ count: staleJobs.length }, '[QueueWorker] Stale jobs recovered and reset to pending');
    } catch (error) {
      logger.error({ error }, '[QueueWorker] Error recovering stale jobs');
    }
  }
}

// Export singleton instance
export const queueWorker = new QueueWorker();
