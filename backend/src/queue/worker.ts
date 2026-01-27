import db from '../db/connection.js';
import { checkpointManager } from './checkpoint.js';
import { rateLimitHandler, RateLimitHandler } from './rate-limit-handler.js';
import type { Job, JobType, JobStatus } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { createLogger } from '../services/logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';

const logger = createLogger('queue:worker');

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

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.currentJob) {
          logger.warn(`[QueueWorker] Timeout waiting for job ${this.currentJob.id}, forcing shutdown`);
        }
        resolve();
      }, 60000);
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
      const context = contextAssemblyService.assembleChapterContext(chapterId);
      logger.info({ estimatedTokens: context.estimatedTokens }, 'generate_chapter: Context assembled');

      checkpointManager.saveCheckpoint(job.id, 'context_assembled', {
        chapterId,
        estimatedTokens: context.estimatedTokens,
      });

      // Step 3: Generate chapter with Claude (with token tracking)
      logger.info('generate_chapter: Generating chapter content with Claude');
      const response = await claudeService.createCompletionWithUsage({
        system: context.system,
        messages: [{ role: 'user', content: context.userPrompt }],
        maxTokens: 4096, // Max output length
        temperature: 1.0, // Creative writing benefits from higher temperature
      });

      const chapterContent = response.content;

      // Track token usage
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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
        const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];
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

      const apiResponse = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.7,
      });

      // Track token usage
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

      const storyBible = data.story_bible ? JSON.parse(data.story_bible) : null;
      const sceneCards = data.scene_cards ? JSON.parse(data.scene_cards) : [];

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

      const response = await claudeService.createCompletion({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1000,
        temperature: 0.5,
      });

      checkpointManager.saveCheckpoint(job.id, 'states_analyzed', { chapterId });

      // Parse the response
      let stateUpdates: Record<string, any>;
      try {
        stateUpdates = extractJsonObject(response);
      } catch (parseError: any) {
        logger.error({ error: parseError.message, response: response.substring(0, 500) }, 'update_states: Failed to parse state updates');
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
}

// Export singleton instance
export const queueWorker = new QueueWorker();
