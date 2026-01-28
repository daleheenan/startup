import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { randomUUID } from 'crypto';
import type {
  WordCountRevision,
  ChapterReductionProposal,
  ChapterTarget,
  RevisionProgress,
  ValidationResult,
  VEBIssueContext,
  CutExplanation,
  StoryStructure,
} from '../shared/types/index.js';
import type { RuthlessEditorChapterResult } from './veb.service.js';
import { bookVersioningService } from './book-versioning.service.js';
import {
  commercialBeatValidatorService,
  type CommercialValidationReport,
} from './commercial-beat-validator.js';
import {
  chapterBriefGeneratorService,
  type DetailedChapterBrief,
} from './chapter-brief-generator.js';

const logger = createLogger('services:word-count-revision');

/**
 * WordCountRevisionService
 *
 * Enables hybrid AI-assisted word count reduction with user approval workflow.
 * Uses VEB (Ruthless Editor) findings to prioritise chapters for cuts.
 */
export class WordCountRevisionService {
  /**
   * Start a new revision session for a book
   */
  async startRevision(
    bookId: string,
    targetWordCount: number,
    tolerancePercent: number = 5
  ): Promise<WordCountRevision> {
    logger.info({ bookId, targetWordCount, tolerancePercent }, 'Starting word count revision');

    // Get current book word count and chapter count
    const bookStats = this.getBookStats(bookId);

    // Check if there's already an active revision
    const existingRevision = this.getActiveRevision(bookId);
    if (existingRevision) {
      logger.info({ existingRevisionId: existingRevision.id }, 'Found existing active revision');
      return existingRevision;
    }

    // Get editorial report ID if available
    const reportId = this.getLatestEditorialReportId(bookId);

    // Get the current active version (source version for the revision)
    const sourceVersion = await bookVersioningService.getActiveVersion(bookId);
    const sourceVersionId = sourceVersion?.id || null;

    // Calculate targets
    const minAcceptable = Math.round(targetWordCount * (1 - tolerancePercent / 100));
    const maxAcceptable = Math.round(targetWordCount * (1 + tolerancePercent / 100));
    const wordsToCut = Math.max(0, bookStats.totalWordCount - targetWordCount);

    const revisionId = `wcr_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO word_count_revisions (
        id, book_id, editorial_report_id, source_version_id,
        current_word_count, target_word_count, tolerance_percent,
        min_acceptable, max_acceptable, words_to_cut,
        status, chapters_reviewed, chapters_total, words_cut_so_far,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      revisionId,
      bookId,
      reportId,
      sourceVersionId,
      bookStats.totalWordCount,
      targetWordCount,
      tolerancePercent,
      minAcceptable,
      maxAcceptable,
      wordsToCut,
      'calculating',
      0,
      bookStats.chapterCount,
      0,
      now,
      now
    );

    logger.info({ revisionId, wordsToCut, sourceVersionId }, 'Created revision session');

    // Calculate chapter targets and create proposals
    await this.calculateChapterTargets(revisionId);

    // Update status to ready
    const updateStmt = db.prepare(`
      UPDATE word_count_revisions SET status = 'ready', updated_at = ? WHERE id = ?
    `);
    updateStmt.run(now, revisionId);

    return this.getRevision(revisionId);
  }

  /**
   * Calculate per-chapter reduction targets based on proportional distribution
   * Prioritises chapters with more VEB issues
   */
  async calculateChapterTargets(revisionId: string): Promise<ChapterTarget[]> {
    const revision = this.getRevisionInternal(revisionId);

    // Get all chapters for the book
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT c.id, c.chapter_number, c.title, c.word_count, c.content
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.book_id = ? AND c.status = 'completed'
      ORDER BY c.chapter_number ASC
    `);
    const chapters = chaptersStmt.all(revision.book_id);

    // Get Ruthless Editor results if available
    let ruthlessEditorResults: any = null;
    if (revision.editorial_report_id) {
      const reportStmt = db.prepare<[string], { ruthless_editor_results: string | null }>(`
        SELECT ruthless_editor_results FROM editorial_reports WHERE id = ?
      `);
      const report = reportStmt.get(revision.editorial_report_id);
      if (report?.ruthless_editor_results) {
        try {
          ruthlessEditorResults = JSON.parse(report.ruthless_editor_results);
        } catch (e) {
          logger.warn('Failed to parse Ruthless Editor results');
        }
      }
    }

    const targets: ChapterTarget[] = [];
    const totalWordCount = chapters.reduce((sum: number, ch: any) => sum + (ch.word_count || 0), 0);
    const reductionRatio = revision.words_to_cut / totalWordCount;

    for (const chapter of chapters) {
      // Calculate priority score from VEB
      const vebIssues = this.extractVEBIssues(chapter.id, chapter.chapter_number, ruthlessEditorResults);
      const priorityScore = this.calculatePriorityScore(vebIssues);

      // Calculate proportional reduction with priority adjustment
      // Higher priority chapters get a slightly higher reduction target
      const priorityMultiplier = 1 + (priorityScore - 50) / 200; // Range: 0.75 to 1.25
      const baseReduction = Math.round(chapter.word_count * reductionRatio);
      const adjustedReduction = Math.round(baseReduction * priorityMultiplier);
      const targetWordCount = Math.max(
        Math.round(chapter.word_count * 0.7), // Never cut more than 30%
        chapter.word_count - adjustedReduction
      );
      const reductionPercent = ((chapter.word_count - targetWordCount) / chapter.word_count) * 100;

      const target: ChapterTarget = {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        chapterTitle: chapter.title,
        originalWordCount: chapter.word_count || 0,
        targetWordCount,
        reductionPercent,
        priorityScore,
        vebIssues,
      };
      targets.push(target);

      // Create proposal record
      const proposalId = `crp_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
      const now = new Date().toISOString();

      const insertProposalStmt = db.prepare(`
        INSERT INTO chapter_reduction_proposals (
          id, revision_id, chapter_id,
          original_word_count, target_word_count, reduction_percent, priority_score,
          veb_issues, status, user_decision,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertProposalStmt.run(
        proposalId,
        revisionId,
        chapter.id,
        chapter.word_count || 0,
        targetWordCount,
        reductionPercent,
        priorityScore,
        vebIssues ? JSON.stringify(vebIssues) : null,
        'pending',
        'pending',
        now,
        now
      );
    }

    logger.info({ revisionId, chapterCount: targets.length }, 'Calculated chapter targets');

    return targets;
  }

  /**
   * Extract VEB issues for a specific chapter
   */
  private extractVEBIssues(
    chapterId: string,
    chapterNumber: number,
    ruthlessEditorResults: any
  ): VEBIssueContext | null {
    if (!ruthlessEditorResults?.chapterResults) {
      return null;
    }

    const chapterResult = ruthlessEditorResults.chapterResults.find(
      (cr: RuthlessEditorChapterResult) =>
        cr.chapterId === chapterId || cr.chapterNumber === chapterNumber
    );

    if (!chapterResult) {
      return null;
    }

    return {
      scenePurpose: chapterResult.scenePurpose,
      expositionIssues: chapterResult.expositionIssues?.map((i: any) => ({
        issue: i.issue,
        quote: i.quote,
        suggestion: i.suggestion,
        severity: i.severity,
      })),
      pacingIssues: chapterResult.pacingIssues?.map((i: any) => ({
        issue: i.issue,
        location: i.location,
        suggestion: i.suggestion,
        severity: i.severity,
      })),
    };
  }

  /**
   * Calculate priority score from VEB findings (0-100, higher = more cuttable)
   */
  private calculatePriorityScore(vebIssues: VEBIssueContext | null): number {
    if (!vebIssues) {
      return 50; // Default mid-priority
    }

    let score = 0;

    // Scene not earned = high priority for cuts (max 30 points)
    if (vebIssues.scenePurpose && !vebIssues.scenePurpose.earned) {
      score += 30;
    }

    // Exposition issues (max 25 points)
    const expIssues = vebIssues.expositionIssues || [];
    score += Math.min(25, expIssues.length * 5);

    // Pacing issues - especially slow and no_plot_advancement (max 25 points)
    const pacingIssues = vebIssues.pacingIssues || [];
    for (const issue of pacingIssues) {
      if (issue.issue === 'too_slow') score += 8;
      else if (issue.issue === 'no_plot_advancement') score += 10;
      else if (issue.issue === 'repetitive') score += 7;
      else score += 5;
    }
    score = Math.min(score, 80); // Cap at 80 before low value shift bonus

    // Add base score so even chapters without issues have reasonable priority
    score = Math.max(20, score);

    return Math.min(100, score);
  }

  /**
   * Generate AI condensation proposal for a chapter
   */
  async generateProposal(revisionId: string, chapterId: string): Promise<ChapterReductionProposal> {
    logger.info({ revisionId, chapterId }, 'Generating condensation proposal');

    // Get proposal record
    const proposalStmt = db.prepare<[string, string], any>(`
      SELECT * FROM chapter_reduction_proposals
      WHERE revision_id = ? AND chapter_id = ?
    `);
    const proposal = proposalStmt.get(revisionId, chapterId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Update status to generating
    const updateStatusStmt = db.prepare(`
      UPDATE chapter_reduction_proposals SET status = 'generating', updated_at = ? WHERE id = ?
    `);
    updateStatusStmt.run(new Date().toISOString(), proposal.id);

    // Get chapter content
    const chapterStmt = db.prepare<[string], { content: string; chapter_number: number; title: string | null }>(`
      SELECT content, chapter_number, title FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter?.content) {
      throw new Error('Chapter content not found');
    }

    // Build prompt
    const vebIssues = proposal.veb_issues ? JSON.parse(proposal.veb_issues) : null;
    const { system, user } = this.buildCondensationPrompt(
      chapter.content,
      proposal.reduction_percent,
      proposal.target_word_count,
      vebIssues,
      chapter.chapter_number,
      chapter.title
    );

    try {
      // Call Claude
      const response = await claudeService.createCompletionWithUsage({
        system,
        messages: [{ role: 'user', content: user }],
        maxTokens: Math.max(4096, Math.round(chapter.content.length / 2)),
        temperature: 0.7,
      });

      // Parse response
      const result = extractJsonObject(response.content) as {
        condensedContent?: string;
        cutsExplanation?: CutExplanation[];
        preservedElements?: string[];
        wordCount?: number;
      };

      if (!result?.condensedContent || typeof result.condensedContent !== 'string') {
        throw new Error('Invalid AI response: missing condensedContent');
      }

      const condensedWordCount = result.condensedContent.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      const actualReduction = proposal.original_word_count - condensedWordCount;

      // Update proposal
      const now = new Date().toISOString();
      const updateStmt = db.prepare(`
        UPDATE chapter_reduction_proposals SET
          status = 'ready',
          condensed_content = ?,
          condensed_word_count = ?,
          actual_reduction = ?,
          cuts_explanation = ?,
          preserved_elements = ?,
          generated_at = ?,
          input_tokens = ?,
          output_tokens = ?,
          updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        result.condensedContent,
        condensedWordCount,
        actualReduction,
        JSON.stringify(result.cutsExplanation || []),
        JSON.stringify(result.preservedElements || []),
        now,
        response.usage.input_tokens,
        response.usage.output_tokens,
        now,
        proposal.id
      );

      logger.info({
        proposalId: proposal.id,
        originalWordCount: proposal.original_word_count,
        condensedWordCount,
        actualReduction,
      }, 'Proposal generated successfully');

      return this.getProposal(proposal.id);
    } catch (error) {
      // Update status to error
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const updateErrorStmt = db.prepare(`
        UPDATE chapter_reduction_proposals SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?
      `);
      updateErrorStmt.run(errorMsg, new Date().toISOString(), proposal.id);

      logger.error({ error, proposalId: proposal.id }, 'Failed to generate proposal');
      throw error;
    }
  }

  /**
   * Build the condensation prompt
   */
  private buildCondensationPrompt(
    content: string,
    reductionPercent: number,
    targetWordCount: number,
    vebIssues: VEBIssueContext | null,
    chapterNumber: number,
    chapterTitle: string | null
  ): { system: string; user: string } {
    const vebContext = vebIssues
      ? `
KNOWN ISSUES TO ADDRESS (from editorial analysis):
${vebIssues.scenePurpose ? `- Scene Purpose: ${vebIssues.scenePurpose.earned ? 'Earned' : 'NOT EARNED - ' + vebIssues.scenePurpose.reasoning}` : ''}
${vebIssues.expositionIssues?.length ? `- Exposition Issues:\n${vebIssues.expositionIssues.map(i => `  * ${i.issue}: "${i.quote}" - ${i.suggestion}`).join('\n')}` : ''}
${vebIssues.pacingIssues?.length ? `- Pacing Issues:\n${vebIssues.pacingIssues.map(i => `  * ${i.issue} at ${i.location}: ${i.suggestion}`).join('\n')}` : ''}
`
      : '';

    const systemPrompt = `You are a senior editor specialising in word count reduction without losing story essence.

Your task is to condense this chapter by approximately ${reductionPercent.toFixed(1)}% (target: ~${targetWordCount} words) whilst preserving:
- All plot-critical events and revelations
- Character development moments
- Essential dialogue and voice
- Narrative momentum and hooks

${vebContext}

Focus cuts on:
1. Exposition marked as "telling not showing" - remove or dramatise
2. Info dumps - cut or weave into action
3. Unnecessary backstory - cut unless plot-critical
4. Repetitive pacing sections - consolidate
5. Scenes not earning their place - trim or cut
6. Redundant descriptions and excessive modifiers
7. On-the-nose dialogue - let subtext do the work

CRITICAL FORMATTING REQUIREMENTS:
- Output PURE PROSE only - like a professionally published novel
- NO markdown formatting (#, ##, **, *, etc.)
- NO scene numbers or structural headers
- Scene breaks indicated by a blank line only

OUTPUT FORMAT (JSON):
{
  "condensedContent": "The full condensed chapter text as pure prose",
  "cutsExplanation": [
    { "whatWasCut": "Description of what was removed", "why": "Reason for cutting", "wordsRemoved": 150 }
  ],
  "preservedElements": ["List of critical elements deliberately kept"],
  "wordCount": ${targetWordCount}
}`;

    const userPrompt = `Condense this chapter to approximately ${targetWordCount} words.

CHAPTER ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ''}
CURRENT WORD COUNT: ${content.trim().split(/\s+/).length}
TARGET REDUCTION: ${reductionPercent.toFixed(1)}%

---
${content}
---

Return ONLY valid JSON with the condensed chapter and explanation:`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Approve a proposal - creates a new version if needed and applies the condensed content
   *
   * When the first proposal in a revision session is approved:
   * 1. Creates a new book version (Version N+1)
   * 2. Copies all chapters from the source version to the new version
   * 3. Updates the chapter in the new version with the condensed content
   *
   * Subsequent approvals in the same session update chapters in the already-created target version.
   */
  async approveProposal(proposalId: string): Promise<void> {
    logger.info({ proposalId }, 'Approving proposal');

    const proposal = this.getProposalInternal(proposalId);

    if (proposal.status !== 'ready') {
      throw new Error(`Cannot approve proposal with status: ${proposal.status}`);
    }

    if (!proposal.condensed_content) {
      throw new Error('No condensed content available');
    }

    const revision = this.getRevisionInternal(proposal.revision_id);
    const now = new Date().toISOString();

    // Check if we need to create a new version for this revision session
    let targetVersionId = revision.target_version_id;

    if (!targetVersionId) {
      // First approval in this revision - create a new version
      logger.info({ revisionId: revision.id, bookId: revision.book_id }, 'Creating new version for editorial rewrite');

      // Create the new version
      const newVersion = await bookVersioningService.createVersion(revision.book_id, {
        name: `Editorial Revision ${new Date().toLocaleDateString('en-GB')}`,
        autoCreated: true,
      });
      targetVersionId = newVersion.id;

      // Update the revision with the target version
      db.prepare(`
        UPDATE word_count_revisions SET target_version_id = ?, updated_at = ? WHERE id = ?
      `).run(targetVersionId, now, revision.id);

      // Copy all chapters from source version to the new version
      await this.copyChaptersToNewVersion(revision.book_id, revision.source_version_id, targetVersionId);

      logger.info({
        revisionId: revision.id,
        sourceVersionId: revision.source_version_id,
        targetVersionId,
        versionNumber: newVersion.version_number,
      }, 'Created new version and copied chapters for editorial rewrite');
    }

    // Find the chapter in the target version that corresponds to the original chapter
    const originalChapter = db.prepare<[string], { chapter_number: number; book_id: string }>(`
      SELECT chapter_number, book_id FROM chapters WHERE id = ?
    `).get(proposal.chapter_id);

    if (!originalChapter) {
      throw new Error(`Original chapter not found: ${proposal.chapter_id}`);
    }

    // Find the corresponding chapter in the target version
    const targetChapter = db.prepare<[string, number, string], { id: string }>(`
      SELECT id FROM chapters
      WHERE book_id = ? AND chapter_number = ? AND version_id = ?
    `).get(originalChapter.book_id, originalChapter.chapter_number, targetVersionId);

    if (!targetChapter) {
      throw new Error(`Target chapter not found for chapter_number ${originalChapter.chapter_number} in version ${targetVersionId}`);
    }

    // Update the chapter content in the target version
    db.prepare(`
      UPDATE chapters SET
        content = ?,
        word_count = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      proposal.condensed_content,
      proposal.condensed_word_count,
      now,
      targetChapter.id
    );

    // Create chapter_edit record for audit trail
    const editId = `edit_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    db.prepare(`
      INSERT INTO chapter_edits (
        id, chapter_id, version_id, edited_content, word_count, is_locked,
        edit_type, edit_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      editId,
      targetChapter.id,
      targetVersionId,
      proposal.condensed_content,
      proposal.condensed_word_count,
      0,
      'word_count_revision',
      `Word count revision: reduced by ${proposal.actual_reduction} words (from editorial rewrite)`,
      now,
      now
    );

    // Update proposal status
    db.prepare(`
      UPDATE chapter_reduction_proposals SET
        status = 'applied',
        user_decision = 'approved',
        decision_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(now, now, proposalId);

    // Update revision progress
    this.updateRevisionProgress(proposal.revision_id);

    // Update version stats
    await bookVersioningService.updateVersionStats(targetVersionId);

    logger.info({
      proposalId,
      wordsReduced: proposal.actual_reduction,
      targetVersionId,
      targetChapterId: targetChapter.id,
    }, 'Proposal approved and applied to new version');
  }

  /**
   * Copy all chapters from source version to target version
   * This preserves the original chapters whilst creating editable copies in the new version
   */
  private async copyChaptersToNewVersion(
    bookId: string,
    sourceVersionId: string | null,
    targetVersionId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Get all chapters from the source version (or legacy chapters if no source version)
    let chapters: any[];
    if (sourceVersionId) {
      chapters = db.prepare(`
        SELECT * FROM chapters WHERE version_id = ? ORDER BY chapter_number
      `).all(sourceVersionId);
    } else {
      // Legacy chapters without version_id
      chapters = db.prepare(`
        SELECT * FROM chapters WHERE book_id = ? AND version_id IS NULL ORDER BY chapter_number
      `).all(bookId);
    }

    logger.info({ bookId, sourceVersionId, targetVersionId, chapterCount: chapters.length }, 'Copying chapters to new version');

    for (const chapter of chapters) {
      const newChapterId = randomUUID();

      db.prepare(`
        INSERT INTO chapters (
          id, book_id, version_id, chapter_number, title, scene_cards,
          content, summary, status, word_count, flags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newChapterId,
        bookId,
        targetVersionId,
        chapter.chapter_number,
        chapter.title,
        chapter.scene_cards,
        chapter.content,
        chapter.summary,
        chapter.status,
        chapter.word_count,
        chapter.flags,
        now,
        now
      );
    }
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(proposalId: string, notes?: string): Promise<void> {
    logger.info({ proposalId, notes }, 'Rejecting proposal');

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE chapter_reduction_proposals SET
        status = 'rejected',
        user_decision = 'rejected',
        user_notes = ?,
        decision_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(notes || null, now, now, proposalId);

    // Get proposal to update revision progress
    const proposal = this.getProposalInternal(proposalId);
    this.updateRevisionProgress(proposal.revision_id);
  }

  /**
   * Update revision progress after approval/rejection
   */
  private updateRevisionProgress(revisionId: string): void {
    // Count reviewed chapters
    const countStmt = db.prepare<[string], { reviewed: number; applied: number; total_reduction: number }>(`
      SELECT
        COUNT(*) FILTER (WHERE user_decision != 'pending') as reviewed,
        COUNT(*) FILTER (WHERE status = 'applied') as applied,
        COALESCE(SUM(CASE WHEN status = 'applied' THEN actual_reduction ELSE 0 END), 0) as total_reduction
      FROM chapter_reduction_proposals
      WHERE revision_id = ?
    `);
    const stats = countStmt.get(revisionId);

    const updateStmt = db.prepare(`
      UPDATE word_count_revisions SET
        chapters_reviewed = ?,
        words_cut_so_far = ?,
        status = CASE
          WHEN ? >= chapters_total THEN 'completed'
          ELSE 'in_progress'
        END,
        updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(
      stats?.reviewed || 0,
      stats?.total_reduction || 0,
      stats?.reviewed || 0,
      new Date().toISOString(),
      revisionId
    );
  }

  /**
   * Get current progress toward target
   */
  async getProgress(revisionId: string): Promise<RevisionProgress> {
    const revision = this.getRevisionInternal(revisionId);

    // Get actual current word count (original minus applied reductions)
    const currentWordCount = revision.current_word_count - revision.words_cut_so_far;
    const wordsRemaining = currentWordCount - revision.target_word_count;
    const percentComplete = revision.words_to_cut > 0
      ? Math.min(100, (revision.words_cut_so_far / revision.words_to_cut) * 100)
      : 100;

    return {
      revisionId,
      currentWordCount,
      targetWordCount: revision.target_word_count,
      wordsReduced: revision.words_cut_so_far,
      wordsRemaining,
      percentComplete,
      chaptersReviewed: revision.chapters_reviewed,
      chaptersTotal: revision.chapters_total,
      isWithinTolerance: currentWordCount >= revision.min_acceptable && currentWordCount <= revision.max_acceptable,
      minAcceptable: revision.min_acceptable,
      maxAcceptable: revision.max_acceptable,
    };
  }

  /**
   * Validate final word count is within tolerance
   */
  async validateCompletion(revisionId: string): Promise<ValidationResult> {
    const revision = this.getRevisionInternal(revisionId);
    const currentWordCount = revision.current_word_count - revision.words_cut_so_far;
    const wordsRemaining = currentWordCount - revision.target_word_count;

    const isWithinTolerance = currentWordCount >= revision.min_acceptable &&
      currentWordCount <= revision.max_acceptable;

    let status: 'under_target' | 'over_target' | 'within_tolerance';
    if (currentWordCount < revision.min_acceptable) {
      status = 'under_target';
    } else if (currentWordCount > revision.max_acceptable) {
      status = 'over_target';
    } else {
      status = 'within_tolerance';
    }

    return {
      isValid: isWithinTolerance,
      currentWordCount,
      targetWordCount: revision.target_word_count,
      minAcceptable: revision.min_acceptable,
      maxAcceptable: revision.max_acceptable,
      wordsRemaining,
      status,
    };
  }

  /**
   * Get revision by ID (public interface)
   */
  getRevision(revisionId: string): WordCountRevision {
    const revision = this.getRevisionInternal(revisionId);
    return this.mapRevisionToPublic(revision);
  }

  /**
   * Get active revision for a book
   */
  getActiveRevision(bookId: string): WordCountRevision | null {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM word_count_revisions
      WHERE book_id = ? AND status NOT IN ('completed', 'abandoned')
      ORDER BY created_at DESC LIMIT 1
    `);
    const revision = stmt.get(bookId);
    return revision ? this.mapRevisionToPublic(revision) : null;
  }

  /**
   * Get proposal by ID (public interface)
   */
  getProposal(proposalId: string): ChapterReductionProposal {
    const proposal = this.getProposalInternal(proposalId);
    return this.mapProposalToPublic(proposal);
  }

  /**
   * Get all proposals for a revision
   */
  getProposals(revisionId: string): ChapterReductionProposal[] {
    const stmt = db.prepare<[string], any>(`
      SELECT crp.*, c.chapter_number, c.title as chapter_title
      FROM chapter_reduction_proposals crp
      JOIN chapters c ON crp.chapter_id = c.id
      WHERE crp.revision_id = ?
      ORDER BY crp.priority_score DESC, c.chapter_number ASC
    `);
    const proposals = stmt.all(revisionId);
    return proposals.map((p: any) => this.mapProposalToPublic(p));
  }

  /**
   * Abandon a revision session
   */
  abandonRevision(revisionId: string): void {
    const updateStmt = db.prepare(`
      UPDATE word_count_revisions SET status = 'abandoned', updated_at = ? WHERE id = ?
    `);
    updateStmt.run(new Date().toISOString(), revisionId);
    logger.info({ revisionId }, 'Revision abandoned');
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private getBookStats(bookId: string): { totalWordCount: number; chapterCount: number } {
    const stmt = db.prepare<[string], { total_words: number; chapter_count: number }>(`
      SELECT
        COALESCE(SUM(word_count), 0) as total_words,
        COUNT(*) as chapter_count
      FROM chapters
      WHERE book_id = ? AND status = 'completed'
    `);
    const result = stmt.get(bookId);
    return {
      totalWordCount: result?.total_words || 0,
      chapterCount: result?.chapter_count || 0,
    };
  }

  private getLatestEditorialReportId(bookId: string): string | null {
    const stmt = db.prepare<[string], { id: string }>(`
      SELECT er.id FROM editorial_reports er
      JOIN projects p ON er.project_id = p.id
      JOIN books b ON b.project_id = p.id
      WHERE b.id = ? AND er.status = 'completed'
      ORDER BY er.completed_at DESC LIMIT 1
    `);
    const result = stmt.get(bookId);
    return result?.id || null;
  }

  private getRevisionInternal(revisionId: string): any {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM word_count_revisions WHERE id = ?
    `);
    const revision = stmt.get(revisionId);
    if (!revision) {
      throw new Error(`Revision not found: ${revisionId}`);
    }
    return revision;
  }

  private getProposalInternal(proposalId: string): any {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM chapter_reduction_proposals WHERE id = ?
    `);
    const proposal = stmt.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    return proposal;
  }

  private mapRevisionToPublic(row: any): WordCountRevision {
    return {
      id: row.id,
      bookId: row.book_id,
      editorialReportId: row.editorial_report_id,
      sourceVersionId: row.source_version_id,
      targetVersionId: row.target_version_id,
      currentWordCount: row.current_word_count,
      targetWordCount: row.target_word_count,
      tolerancePercent: row.tolerance_percent,
      minAcceptable: row.min_acceptable,
      maxAcceptable: row.max_acceptable,
      wordsToCut: row.words_to_cut,
      status: row.status,
      chaptersReviewed: row.chapters_reviewed,
      chaptersTotal: row.chapters_total,
      wordsCutSoFar: row.words_cut_so_far,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }

  private mapProposalToPublic(row: any): ChapterReductionProposal {
    return {
      id: row.id,
      revisionId: row.revision_id,
      chapterId: row.chapter_id,
      originalWordCount: row.original_word_count,
      targetWordCount: row.target_word_count,
      reductionPercent: row.reduction_percent,
      priorityScore: row.priority_score,
      vebIssues: row.veb_issues ? JSON.parse(row.veb_issues) : null,
      status: row.status,
      condensedContent: row.condensed_content,
      condensedWordCount: row.condensed_word_count,
      actualReduction: row.actual_reduction,
      cutsExplanation: row.cuts_explanation ? JSON.parse(row.cuts_explanation) : null,
      preservedElements: row.preserved_elements ? JSON.parse(row.preserved_elements) : null,
      userDecision: row.user_decision,
      userNotes: row.user_notes,
      decisionAt: row.decision_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      generatedAt: row.generated_at,
      inputTokens: row.input_tokens || 0,
      outputTokens: row.output_tokens || 0,
    };
  }

  // ============================================================================
  // Commercial Beat Validation Methods
  // ============================================================================

  /**
   * Validate the book's outline against commercial beat structure requirements
   * Returns validation report with issues and recommendations
   */
  async validateCommercialBeats(bookId: string): Promise<CommercialValidationReport> {
    logger.info({ bookId }, 'Validating commercial beat structure');

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

    // Run commercial validation
    const report = commercialBeatValidatorService.validateStructure(
      structure,
      targetWordCount,
      book.genre
    );

    // Store the validation report
    const reportId = `cvr_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO commercial_validation_reports (
        id, book_id, validation_data, overall_score, is_valid,
        ready_for_generation, critical_issues_count, important_issues_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      reportId,
      bookId,
      JSON.stringify(report),
      report.overallScore,
      report.isValid ? 1 : 0,
      report.readyForGeneration ? 1 : 0,
      report.criticalIssues.length,
      report.importantIssues.length,
      now,
      now
    );

    logger.info({
      bookId,
      reportId,
      overallScore: report.overallScore,
      isValid: report.isValid,
      criticalIssues: report.criticalIssues.length,
    }, 'Commercial beat validation complete');

    return report;
  }

  /**
   * Get the latest commercial validation report for a book
   */
  getLatestCommercialValidation(bookId: string): CommercialValidationReport | null {
    const stmt = db.prepare<[string], { validation_data: string }>(`
      SELECT validation_data FROM commercial_validation_reports
      WHERE book_id = ?
      ORDER BY created_at DESC LIMIT 1
    `);

    const result = stmt.get(bookId);
    if (!result) return null;

    return JSON.parse(result.validation_data);
  }

  // ============================================================================
  // Chapter Brief Methods for Revision
  // ============================================================================

  /**
   * Generate a revision brief for a specific chapter
   * Includes editorial guidance and commercial beat context
   */
  async generateRevisionBrief(
    bookId: string,
    chapterNumber: number,
    vebIssues?: VEBIssueContext
  ): Promise<DetailedChapterBrief> {
    logger.info({ bookId, chapterNumber }, 'Generating revision brief');

    const brief = await chapterBriefGeneratorService.generateRevisionBrief(
      bookId,
      chapterNumber,
      vebIssues
    );

    return brief;
  }

  /**
   * Generate revision briefs for all chapters in a revision session
   */
  async generateAllRevisionBriefs(revisionId: string): Promise<DetailedChapterBrief[]> {
    logger.info({ revisionId }, 'Generating revision briefs for all chapters');

    const revision = this.getRevisionInternal(revisionId);
    const proposals = this.getProposals(revisionId);

    const briefs: DetailedChapterBrief[] = [];

    for (const proposal of proposals) {
      // Get chapter number
      const chapterStmt = db.prepare<[string], { chapter_number: number }>(`
        SELECT chapter_number FROM chapters WHERE id = ?
      `);
      const chapter = chapterStmt.get(proposal.chapterId);

      if (chapter) {
        const brief = await this.generateRevisionBrief(
          revision.book_id,
          chapter.chapter_number,
          proposal.vebIssues || undefined
        );
        briefs.push(brief);
      }
    }

    logger.info({ revisionId, briefCount: briefs.length }, 'Revision briefs generated');

    return briefs;
  }

  /**
   * Enhanced proposal generation that uses chapter briefs
   * Provides more context-aware condensation
   */
  async generateProposalWithBrief(
    revisionId: string,
    chapterId: string
  ): Promise<ChapterReductionProposal> {
    logger.info({ revisionId, chapterId }, 'Generating proposal with chapter brief');

    // Get the chapter number
    const chapterStmt = db.prepare<[string], { chapter_number: number; book_id: string }>(`
      SELECT chapter_number, book_id FROM chapters WHERE id = ?
    `);
    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Get proposal record
    const proposalStmt = db.prepare<[string, string], any>(`
      SELECT * FROM chapter_reduction_proposals
      WHERE revision_id = ? AND chapter_id = ?
    `);
    const proposal = proposalStmt.get(revisionId, chapterId);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Generate revision brief with editorial context
    const vebIssues = proposal.veb_issues ? JSON.parse(proposal.veb_issues) : null;
    const brief = await this.generateRevisionBrief(
      chapter.book_id,
      chapter.chapter_number,
      vebIssues
    );

    // Get story DNA for style context
    const storyDNAStmt = db.prepare<[string], { story_dna: string | null }>(`
      SELECT p.story_dna FROM projects p
      JOIN books b ON b.project_id = p.id
      WHERE b.id = ?
    `);
    const storyDNAResult = storyDNAStmt.get(chapter.book_id);
    const storyDNA = storyDNAResult?.story_dna ? JSON.parse(storyDNAResult.story_dna) : {
      genre: 'fiction',
      subgenre: '',
      tone: 'neutral',
      themes: [],
      proseStyle: 'standard',
    };

    // Build enhanced prompt using the brief
    const briefContext = chapterBriefGeneratorService.buildChapterPromptFromBrief(brief, storyDNA);

    // Update status to generating
    const updateStatusStmt = db.prepare(`
      UPDATE chapter_reduction_proposals SET status = 'generating', updated_at = ? WHERE id = ?
    `);
    updateStatusStmt.run(new Date().toISOString(), proposal.id);

    // Get chapter content
    const contentStmt = db.prepare<[string], { content: string; title: string | null }>(`
      SELECT content, title FROM chapters WHERE id = ?
    `);
    const chapterContent = contentStmt.get(chapterId);

    if (!chapterContent?.content) {
      throw new Error('Chapter content not found');
    }

    // Build enhanced condensation prompt
    const { system, user } = this.buildEnhancedCondensationPrompt(
      chapterContent.content,
      proposal.reduction_percent,
      proposal.target_word_count,
      vebIssues,
      chapter.chapter_number,
      chapterContent.title,
      briefContext
    );

    try {
      // Call Claude
      const response = await claudeService.createCompletionWithUsage({
        system,
        messages: [{ role: 'user', content: user }],
        maxTokens: Math.max(4096, Math.round(chapterContent.content.length / 2)),
        temperature: 0.7,
      });

      // Parse response
      const result = extractJsonObject(response.content) as {
        condensedContent?: string;
        cutsExplanation?: CutExplanation[];
        preservedElements?: string[];
        wordCount?: number;
      };

      if (!result?.condensedContent || typeof result.condensedContent !== 'string') {
        throw new Error('Invalid AI response: missing condensedContent');
      }

      const condensedWordCount = result.condensedContent.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      const actualReduction = proposal.original_word_count - condensedWordCount;

      // Update proposal
      const now = new Date().toISOString();
      const updateStmt = db.prepare(`
        UPDATE chapter_reduction_proposals SET
          status = 'ready',
          condensed_content = ?,
          condensed_word_count = ?,
          actual_reduction = ?,
          cuts_explanation = ?,
          preserved_elements = ?,
          generated_at = ?,
          input_tokens = ?,
          output_tokens = ?,
          updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        result.condensedContent,
        condensedWordCount,
        actualReduction,
        JSON.stringify(result.cutsExplanation || []),
        JSON.stringify(result.preservedElements || []),
        now,
        response.usage.input_tokens,
        response.usage.output_tokens,
        now,
        proposal.id
      );

      logger.info({
        proposalId: proposal.id,
        originalWordCount: proposal.original_word_count,
        condensedWordCount,
        actualReduction,
        usedBrief: true,
      }, 'Enhanced proposal generated successfully');

      return this.getProposal(proposal.id);
    } catch (error) {
      // Update status to error
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const updateErrorStmt = db.prepare(`
        UPDATE chapter_reduction_proposals SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?
      `);
      updateErrorStmt.run(errorMsg, new Date().toISOString(), proposal.id);

      logger.error({ error, proposalId: proposal.id }, 'Failed to generate enhanced proposal');
      throw error;
    }
  }

  /**
   * Build enhanced condensation prompt with chapter brief context
   */
  private buildEnhancedCondensationPrompt(
    content: string,
    reductionPercent: number,
    targetWordCount: number,
    vebIssues: VEBIssueContext | null,
    chapterNumber: number,
    chapterTitle: string | null,
    briefContext: string
  ): { system: string; user: string } {
    const vebContext = vebIssues
      ? `
KNOWN ISSUES TO ADDRESS (from editorial analysis):
${vebIssues.scenePurpose ? `- Scene Purpose: ${vebIssues.scenePurpose.earned ? 'Earned' : 'NOT EARNED - ' + vebIssues.scenePurpose.reasoning}` : ''}
${vebIssues.expositionIssues?.length ? `- Exposition Issues:\n${vebIssues.expositionIssues.map(i => `  * ${i.issue}: "${i.quote}" - ${i.suggestion}`).join('\n')}` : ''}
${vebIssues.pacingIssues?.length ? `- Pacing Issues:\n${vebIssues.pacingIssues.map(i => `  * ${i.issue} at ${i.location}: ${i.suggestion}`).join('\n')}` : ''}
`
      : '';

    const systemPrompt = `You are a senior editor specialising in word count reduction without losing story essence.

Your task is to condense this chapter by approximately ${reductionPercent.toFixed(1)}% (target: ~${targetWordCount} words) whilst preserving:
- All plot-critical events and revelations
- Character development moments
- Essential dialogue and voice
- Narrative momentum and hooks
- Commercial beat requirements

${vebContext}

CHAPTER BRIEF (Critical context for this revision):
${briefContext}

Focus cuts on:
1. Exposition marked as "telling not showing" - remove or dramatise
2. Info dumps - cut or weave into action
3. Unnecessary backstory - cut unless plot-critical
4. Repetitive pacing sections - consolidate
5. Scenes not earning their place - trim or cut
6. Redundant descriptions and excessive modifiers
7. On-the-nose dialogue - let subtext do the work

CRITICAL FORMATTING REQUIREMENTS:
- Output PURE PROSE only - like a professionally published novel
- NO markdown formatting (#, ##, **, *, etc.)
- NO scene numbers or structural headers
- Scene breaks indicated by a blank line only

OUTPUT FORMAT (JSON):
{
  "condensedContent": "The full condensed chapter text as pure prose",
  "cutsExplanation": [
    { "whatWasCut": "Description of what was removed", "why": "Reason for cutting", "wordsRemoved": 150 }
  ],
  "preservedElements": ["List of critical elements deliberately kept"],
  "wordCount": ${targetWordCount}
}`;

    const userPrompt = `Condense this chapter to approximately ${targetWordCount} words whilst maintaining all commercial beat requirements from the brief.

CHAPTER ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ''}
CURRENT WORD COUNT: ${content.trim().split(/\s+/).length}
TARGET REDUCTION: ${reductionPercent.toFixed(1)}%

---
${content}
---

Return ONLY valid JSON with the condensed chapter and explanation:`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Check if a book's outline meets commercial requirements before starting revision
   */
  async preRevisionValidation(bookId: string): Promise<{
    canProceed: boolean;
    validationReport: CommercialValidationReport | null;
    recommendations: string[];
  }> {
    logger.info({ bookId }, 'Running pre-revision commercial validation');

    try {
      const report = await this.validateCommercialBeats(bookId);

      const recommendations: string[] = [];

      if (!report.isValid) {
        recommendations.push('Consider addressing critical beat issues before revision');
      }

      if (report.criticalIssues.length > 0) {
        for (const issue of report.criticalIssues.slice(0, 3)) {
          recommendations.push(`[CRITICAL] ${issue.issue}`);
        }
      }

      if (report.pacingAnalysis.overall !== 'well_paced') {
        recommendations.push(`Pacing: ${report.pacingAnalysis.suggestions[0] || 'Review act balance'}`);
      }

      return {
        canProceed: report.overallScore >= 50, // Allow revision even with some issues
        validationReport: report,
        recommendations,
      };
    } catch (error) {
      logger.error({ error, bookId }, 'Pre-revision validation failed');
      return {
        canProceed: true, // Don't block on validation errors
        validationReport: null,
        recommendations: ['Unable to validate commercial structure - proceeding with standard revision'],
      };
    }
  }
}

// Export singleton instance
export const wordCountRevisionService = new WordCountRevisionService();
