import db from '../db/connection.js';
import { checkpointManager } from './checkpoint.js';
import { rateLimitHandler, RateLimitHandler } from './rate-limit-handler.js';
import type { Job, JobType, JobStatus } from '../shared/types/index.js';
import { randomUUID } from 'crypto';

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
      console.log('[QueueWorker] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[QueueWorker] Starting...');

    while (this.isRunning) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('[QueueWorker] Unexpected error in worker loop:', error);
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
    console.log('[QueueWorker] Stopping...');

    // If no job is running, resolve immediately
    if (!this.currentJob) {
      console.log('[QueueWorker] No active job, stopped immediately');
      return Promise.resolve();
    }

    // Wait for current job to finish
    this.shutdownPromise = new Promise((resolve) => {
      this.shutdownResolve = resolve;
      console.log(`[QueueWorker] Waiting for job ${this.currentJob?.id} to complete...`);

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.currentJob) {
          console.warn(`[QueueWorker] Timeout waiting for job ${this.currentJob.id}, forcing shutdown`);
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
      console.log(`[QueueWorker] Starting job ${job.id} (${job.type})`);

      // Execute the job
      await this.executeJob(job);

      // Mark as completed
      this.markCompleted(job.id);
      console.log(`[QueueWorker] Completed job ${job.id}`);
    } catch (error) {
      if (RateLimitHandler.isRateLimitError(error)) {
        // Handle rate limit
        console.log('[QueueWorker] Rate limit detected, pausing queue');
        await rateLimitHandler.handleRateLimit(job);
      } else {
        // Handle other errors
        await this.retryOrFail(job, error);
      }
    } finally {
      this.currentJob = null;
      // Signal shutdown if waiting
      if (this.shutdownResolve && !this.isRunning) {
        console.log('[QueueWorker] Job complete, shutdown proceeding');
        this.shutdownResolve();
      }
    }
  }

  /**
   * Pick up the next pending job from the queue atomically
   * Uses a transaction with status check to prevent race conditions
   */
  private pickupJob(): Job | null {
    const now = new Date().toISOString();

    // Use transaction to ensure atomic SELECT + UPDATE
    const transaction = db.transaction(() => {
      const stmt = db.prepare<[], Job>(`
        SELECT * FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
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
    console.log(`[Job:generate_chapter] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    // Import services (dynamic to avoid circular dependencies)
    const { contextAssemblyService } = await import('../services/context-assembly.service.js');
    const { claudeService } = await import('../services/claude.service.js');

    // Save checkpoint: started
    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Step 1: Update chapter status to 'writing'
      console.log(`[Job:generate_chapter] Updating status to 'writing'`);
      const updateStatusStmt = db.prepare(`
        UPDATE chapters
        SET status = 'writing', updated_at = ?
        WHERE id = ?
      `);
      updateStatusStmt.run(new Date().toISOString(), chapterId);

      checkpointManager.saveCheckpoint(job.id, 'status_updated', { chapterId });

      // Step 2: Assemble context
      console.log(`[Job:generate_chapter] Assembling context`);
      const context = contextAssemblyService.assembleChapterContext(chapterId);
      console.log(`[Job:generate_chapter] Context assembled: ~${context.estimatedTokens} tokens`);

      checkpointManager.saveCheckpoint(job.id, 'context_assembled', {
        chapterId,
        estimatedTokens: context.estimatedTokens,
      });

      // Step 3: Generate chapter with Claude
      console.log(`[Job:generate_chapter] Generating chapter content with Claude`);
      const chapterContent = await claudeService.createCompletion({
        system: context.system,
        messages: [{ role: 'user', content: context.userPrompt }],
        maxTokens: 4096, // Max output length
        temperature: 1.0, // Creative writing benefits from higher temperature
      });

      checkpointManager.saveCheckpoint(job.id, 'content_generated', {
        chapterId,
        wordCount: chapterContent.split(/\s+/).length,
      });

      // Step 4: Save chapter content
      console.log(`[Job:generate_chapter] Saving chapter content`);
      const wordCount = chapterContent.split(/\s+/).length;

      const updateContentStmt = db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, status = 'editing', updated_at = ?
        WHERE id = ?
      `);
      updateContentStmt.run(chapterContent, wordCount, new Date().toISOString(), chapterId);

      console.log(`[Job:generate_chapter] Chapter generated: ${wordCount} words`);

      checkpointManager.saveCheckpoint(job.id, 'completed', {
        chapterId,
        wordCount,
      });
    } catch (error) {
      console.error(`[Job:generate_chapter] Error generating chapter:`, error);
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
    console.log(`[Job:dev_edit] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    // Import editing service
    const { editingService } = await import('../services/editing.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      // Run developmental edit
      const result = await editingService.developmentalEdit(chapterId);

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
        console.log(`[Job:dev_edit] Chapter needs revision, queueing author_revision job`);

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

      console.log(`[Job:dev_edit] Complete: ${result.flags.length} flags, approved: ${result.approved}`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:dev_edit] Error:`, error);
      throw error;
    }
  }

  /**
   * Author revision - Revise chapter based on developmental feedback
   */
  private async authorRevision(job: Job): Promise<void> {
    console.log(`[Job:author_revision] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');

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
      const revisedContent = await editingService.authorRevision(chapterId, devEditResult);

      checkpointManager.saveCheckpoint(job.id, 'revision_complete', { chapterId });

      // Update chapter with revised content
      const updateStmt = db.prepare(`
        UPDATE chapters
        SET content = ?, updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(revisedContent, new Date().toISOString(), chapterId);

      console.log(`[Job:author_revision] Revision complete`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:author_revision] Error:`, error);
      throw error;
    }
  }

  /**
   * Line edit - Polish prose, dialogue, sensory details
   */
  private async lineEdit(job: Job): Promise<void> {
    console.log(`[Job:line_edit] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.lineEdit(chapterId);

      checkpointManager.saveCheckpoint(job.id, 'line_edit_complete', {
        chapterId,
        flagsCount: result.flags.length,
      });

      await editingService.applyEditResult(chapterId, result);

      console.log(`[Job:line_edit] Complete: ${result.flags.length} flags`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:line_edit] Error:`, error);
      throw error;
    }
  }

  /**
   * Continuity check - Verify consistency with story bible and previous chapters
   */
  private async continuityCheck(job: Job): Promise<void> {
    console.log(`[Job:continuity_check] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.continuityEdit(chapterId);

      checkpointManager.saveCheckpoint(job.id, 'continuity_check_complete', {
        chapterId,
        suggestionsCount: result.suggestions.length,
        flagsCount: result.flags.length,
      });

      await editingService.applyEditResult(chapterId, result);

      console.log(`[Job:continuity_check] Complete: ${result.suggestions.length} issues, ${result.flags.length} flags`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:continuity_check] Error:`, error);
      throw error;
    }
  }

  /**
   * Copy edit - Grammar, punctuation, style consistency
   */
  private async copyEdit(job: Job): Promise<void> {
    console.log(`[Job:copy_edit] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    const { editingService } = await import('../services/editing.service.js');

    checkpointManager.saveCheckpoint(job.id, 'started', { chapterId });

    try {
      const result = await editingService.copyEdit(chapterId);

      checkpointManager.saveCheckpoint(job.id, 'copy_edit_complete', { chapterId });

      await editingService.applyEditResult(chapterId, result);

      // After copy edit (final editing step), update word count
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

      console.log(`[Job:copy_edit] Complete`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:copy_edit] Error:`, error);
      throw error;
    }
  }

  /**
   * Generate summary for a chapter (used as context for next chapter)
   */
  private async generateSummary(job: Job): Promise<void> {
    console.log(`[Job:generate_summary] Processing chapter ${job.target_id}`);
    const chapterId = job.target_id;

    // Import services
    const { claudeService } = await import('../services/claude.service.js');

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

      console.log(`[Job:generate_summary] Generating summary for chapter ${chapter.chapter_number}`);

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

      const summary = await claudeService.createCompletion({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.7,
      });

      checkpointManager.saveCheckpoint(job.id, 'summary_generated', { chapterId });

      // Save summary to database
      const updateSummaryStmt = db.prepare(`
        UPDATE chapters
        SET summary = ?, updated_at = ?
        WHERE id = ?
      `);

      updateSummaryStmt.run(summary.trim(), new Date().toISOString(), chapterId);

      console.log(`[Job:generate_summary] Summary saved for chapter ${chapter.chapter_number}`);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:generate_summary] Error generating summary:`, error);
      throw error;
    }
  }

  /**
   * Update character states after chapter generation
   */
  private async updateStates(job: Job): Promise<void> {
    console.log(`[Job:update_states] Processing chapter ${job.target_id}`);
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
        console.log(`[Job:update_states] No story bible found, skipping state update`);
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
        console.log(`[Job:update_states] No characters to update`);
        // Still mark chapter as completed
        this.markChapterComplete(chapterId);
        return;
      }

      console.log(
        `[Job:update_states] Updating states for: ${Array.from(characterNames).join(', ')}`
      );

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
        // Extract JSON from response (Claude might add markdown)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        stateUpdates = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error(`[Job:update_states] Failed to parse state updates:`, parseError);
        console.log(`[Job:update_states] Raw response:`, response);
        // Don't fail the job, just skip the update and mark chapter complete
        this.markChapterComplete(chapterId);
        return;
      }

      // Update story bible with new character states
      for (const character of storyBible.characters) {
        if (stateUpdates[character.name]) {
          character.currentState = stateUpdates[character.name];
          console.log(`[Job:update_states] Updated ${character.name}: ${character.currentState.emotionalState} in ${character.currentState.location}`);
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

      console.log(`[Job:update_states] Character states updated`);

      // Mark chapter as completed (this is the final job in the pipeline)
      this.markChapterComplete(chapterId);

      checkpointManager.saveCheckpoint(job.id, 'completed', { chapterId });
    } catch (error) {
      console.error(`[Job:update_states] Error updating states:`, error);
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
    console.log(`[Worker] Chapter ${chapterId} marked as completed`);
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

    if (newAttempts < maxAttempts) {
      console.log(`[QueueWorker] Job ${job.id} failed, retrying (${newAttempts}/${maxAttempts})`);

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'pending', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, error.message, job.id);
    } else {
      console.error(`[QueueWorker] Job ${job.id} failed after ${maxAttempts} attempts`);

      const stmt = db.prepare(`
        UPDATE jobs
        SET status = 'failed', attempts = ?, error = ?
        WHERE id = ?
      `);

      stmt.run(newAttempts, error.message, job.id);
    }
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

    console.log(`[QueueWorker] Created job ${jobId} (${type}) for ${targetId}`);
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
