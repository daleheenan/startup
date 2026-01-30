/**
 * Lesson Curation Service
 *
 * AI-assisted curation of editorial lessons to:
 * 1. Detect duplicates - Find semantically similar lessons
 * 2. Detect book-specific content - Flag lessons with chapter numbers, character names, etc.
 * 3. Generalise lessons - Rewrite book-specific lessons into universal versions
 * 4. Manage curation workflow - Approve, archive, merge duplicates
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { claudeService } from './claude.service.js';
import { editorialLessonsService, EditorialLesson } from './editorial-lessons.service.js';

const logger = createLogger('services:lesson-curation');

export type CurationStatus =
  | 'pending_review'
  | 'approved'
  | 'archived'
  | 'duplicate'
  | 'needs_generalisation';

export interface CurationSuggestion {
  lessonId: string;
  suggestedStatus: CurationStatus;
  reason: string;
  duplicateOfId?: string;
  similarityScore?: number;
  generalisedTitle?: string;
  generalisedDescription?: string;
  isBookSpecific: boolean;
  bookSpecificElements?: string[];
}

export interface CurationAnalysisResult {
  totalLessons: number;
  analysed: number;
  suggestions: CurationSuggestion[];
  duplicateGroups: Array<{
    canonical: string;
    duplicates: Array<{ id: string; similarity: number }>;
  }>;
  bookSpecificCount: number;
  readyForApproval: number;
}

interface DBLessonCuration {
  id: string;
  title: string;
  description: string;
  category: string;
  curation_status: string | null;
  is_book_specific: number;
  generalised_title: string | null;
  generalised_description: string | null;
  duplicate_of_lesson_id: string | null;
  duplicate_similarity_score: number | null;
  curation_notes: string | null;
}

/**
 * Patterns that indicate book-specific content
 */
const BOOK_SPECIFIC_PATTERNS = [
  // Chapter references
  /chapter\s+\d+/gi,
  /chapters?\s+[\d,\s]+(?:and\s+\d+)?/gi,
  // Scene references
  /scene\s+\d+/gi,
  /scenes?\s+[\d,\s]+/gi,
  // Page references
  /page\s+\d+/gi,
  /pages?\s+[\d-]+/gi,
  // Specific counts that are too precise
  /(?:exactly\s+)?\d+\s+(?:scenes?|chapters?|instances?)\s+(?:of|in|with)/gi,
  // Character name patterns (capitalised words that look like names)
  /(?:character|protagonist|antagonist)\s+['"]?[A-Z][a-z]+['"]?/gi,
  // Location names (specific proper nouns)
  /(?:in|at|near)\s+(?:the\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:City|Town|Village|Kingdom|Forest|Mountain|River))?/gi,
];

class LessonCurationService {
  /**
   * Analyse all lessons and generate curation suggestions
   */
  async analyseLessons(projectId?: string): Promise<CurationAnalysisResult> {
    logger.info({ projectId }, 'Starting lesson curation analysis');

    // Get all lessons (optionally filtered by project)
    let query = 'SELECT * FROM editorial_lessons WHERE 1=1';
    const params: string[] = [];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare<string[], DBLessonCuration>(query);
    const lessons = params.length > 0 ? stmt.all(...params) : stmt.all();

    if (lessons.length === 0) {
      return {
        totalLessons: 0,
        analysed: 0,
        suggestions: [],
        duplicateGroups: [],
        bookSpecificCount: 0,
        readyForApproval: 0,
      };
    }

    const suggestions: CurationSuggestion[] = [];
    const duplicateGroups: Array<{
      canonical: string;
      duplicates: Array<{ id: string; similarity: number }>;
    }> = [];

    // Step 1: Detect book-specific lessons using pattern matching
    const bookSpecificLessons: string[] = [];
    for (const lesson of lessons) {
      const { isSpecific, elements } = this.detectBookSpecificContent(
        lesson.title,
        lesson.description
      );

      if (isSpecific) {
        bookSpecificLessons.push(lesson.id);
        suggestions.push({
          lessonId: lesson.id,
          suggestedStatus: 'needs_generalisation',
          reason: `Contains book-specific references: ${elements.join(', ')}`,
          isBookSpecific: true,
          bookSpecificElements: elements,
        });
      }
    }

    // Step 2: Detect duplicates using text similarity
    const processedPairs = new Set<string>();
    const duplicateMap = new Map<string, Array<{ id: string; similarity: number }>>();

    for (let i = 0; i < lessons.length; i++) {
      for (let j = i + 1; j < lessons.length; j++) {
        const pairKey = [lessons[i].id, lessons[j].id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const similarity = this.calculateSimilarity(
          `${lessons[i].title} ${lessons[i].description}`,
          `${lessons[j].title} ${lessons[j].description}`
        );

        // Threshold for considering duplicates
        if (similarity >= 0.7) {
          // Determine which is the "canonical" (older or higher effectiveness)
          const canonicalId = lessons[i].id;
          const duplicateId = lessons[j].id;

          if (!duplicateMap.has(canonicalId)) {
            duplicateMap.set(canonicalId, []);
          }
          duplicateMap.get(canonicalId)!.push({ id: duplicateId, similarity });

          // Only add suggestion if not already flagged as book-specific
          if (!bookSpecificLessons.includes(duplicateId)) {
            suggestions.push({
              lessonId: duplicateId,
              suggestedStatus: 'duplicate',
              reason: `Similar to existing lesson (${(similarity * 100).toFixed(0)}% match)`,
              duplicateOfId: canonicalId,
              similarityScore: similarity,
              isBookSpecific: false,
            });
          }
        }
      }
    }

    // Convert duplicate map to groups
    for (const [canonical, dupes] of duplicateMap) {
      if (dupes.length > 0) {
        duplicateGroups.push({ canonical, duplicates: dupes });
      }
    }

    // Count lessons ready for approval (not book-specific, not duplicate)
    const flaggedIds = new Set(suggestions.map(s => s.lessonId));
    const readyForApproval = lessons.filter(l => !flaggedIds.has(l.id)).length;

    const result: CurationAnalysisResult = {
      totalLessons: lessons.length,
      analysed: lessons.length,
      suggestions,
      duplicateGroups,
      bookSpecificCount: bookSpecificLessons.length,
      readyForApproval,
    };

    logger.info({
      totalLessons: result.totalLessons,
      suggestions: suggestions.length,
      duplicateGroups: duplicateGroups.length,
      bookSpecificCount: result.bookSpecificCount,
    }, 'Lesson curation analysis complete');

    return result;
  }

  /**
   * Detect book-specific content in lesson text
   */
  detectBookSpecificContent(title: string, description: string): {
    isSpecific: boolean;
    elements: string[];
  } {
    const text = `${title} ${description}`;
    const elements: string[] = [];

    for (const pattern of BOOK_SPECIFIC_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        elements.push(...matches.map(m => m.trim()));
      }
    }

    // Remove duplicates
    const uniqueElements = [...new Set(elements)];

    return {
      isSpecific: uniqueElements.length > 0,
      elements: uniqueElements,
    };
  }

  /**
   * Calculate text similarity using Jaccard similarity on word trigrams
   */
  calculateSimilarity(text1: string, text2: string): number {
    const getTrigrams = (text: string): Set<string> => {
      const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
      const trigrams = new Set<string>();
      for (let i = 0; i <= words.length - 3; i++) {
        trigrams.add(words.slice(i, i + 3).join(' '));
      }
      // Also add bigrams for shorter texts
      for (let i = 0; i <= words.length - 2; i++) {
        trigrams.add(words.slice(i, i + 2).join(' '));
      }
      return trigrams;
    };

    const set1 = getTrigrams(text1);
    const set2 = getTrigrams(text2);

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Use AI to generalise a book-specific lesson
   */
  async generaliseLesson(lessonId: string): Promise<{
    generalisedTitle: string;
    generalisedDescription: string;
  }> {
    const lesson = editorialLessonsService.getLesson(lessonId);

    const systemPrompt = `You are an editorial writing coach who helps create universal writing lessons from specific feedback.

Your task is to take a lesson that was learned from editing a specific book and generalise it so it applies to any novel.

RULES:
- Remove ALL specific references (chapter numbers, character names, scene numbers, page numbers)
- Keep the core insight and actionable advice
- Use British English spelling (e.g., 'generalise' not 'generalize')
- Make the advice applicable to any genre and any book
- Keep the title concise (under 60 characters)
- Keep the description focused and actionable (2-3 sentences max)

Respond in JSON format:
{
  "generalisedTitle": "the generalised title",
  "generalisedDescription": "the generalised description"
}`;

    const userPrompt = `Please generalise this book-specific lesson into a universal writing principle:

Original Title: ${lesson.title}
Original Description: ${lesson.description}
Category: ${lesson.category}

Remember to remove any specific chapter numbers, character names, or other book-specific references.`;

    try {
      const response = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.3,
        tracking: {
          requestType: 'lesson_curation',
          contextSummary: `Generalising lesson: ${lesson.title}`,
        },
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }

      const result = JSON.parse(jsonMatch[0]);

      logger.info({ lessonId, generalisedTitle: result.generalisedTitle }, 'Lesson generalised');

      return {
        generalisedTitle: result.generalisedTitle,
        generalisedDescription: result.generalisedDescription,
      };
    } catch (error) {
      logger.error({ error, lessonId }, 'Failed to generalise lesson');
      throw error;
    }
  }

  /**
   * Apply curation decision to a lesson
   */
  applyCurationDecision(
    lessonId: string,
    decision: {
      status: CurationStatus;
      notes?: string;
      duplicateOfId?: string;
      similarityScore?: number;
      generalisedTitle?: string;
      generalisedDescription?: string;
      isBookSpecific?: boolean;
    }
  ): void {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE editorial_lessons SET
        curation_status = ?,
        curation_notes = COALESCE(?, curation_notes),
        duplicate_of_lesson_id = COALESCE(?, duplicate_of_lesson_id),
        duplicate_similarity_score = COALESCE(?, duplicate_similarity_score),
        generalised_title = COALESCE(?, generalised_title),
        generalised_description = COALESCE(?, generalised_description),
        is_book_specific = COALESCE(?, is_book_specific),
        last_curated_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      decision.status,
      decision.notes || null,
      decision.duplicateOfId || null,
      decision.similarityScore || null,
      decision.generalisedTitle || null,
      decision.generalisedDescription || null,
      decision.isBookSpecific !== undefined ? (decision.isBookSpecific ? 1 : 0) : null,
      now,
      now,
      lessonId
    );

    // If marked as duplicate or archived, deactivate the lesson
    if (decision.status === 'duplicate' || decision.status === 'archived') {
      db.prepare('UPDATE editorial_lessons SET is_active = 0 WHERE id = ?').run(lessonId);
    }

    // If approved, ensure the lesson is active
    if (decision.status === 'approved') {
      db.prepare('UPDATE editorial_lessons SET is_active = 1 WHERE id = ?').run(lessonId);
    }

    logger.info({ lessonId, status: decision.status }, 'Curation decision applied');
  }

  /**
   * Batch approve lessons that pass automated checks
   */
  batchApprove(lessonIds: string[]): number {
    const now = new Date().toISOString();
    let approved = 0;

    const stmt = db.prepare(`
      UPDATE editorial_lessons SET
        curation_status = 'approved',
        is_active = 1,
        last_curated_at = ?,
        updated_at = ?
      WHERE id = ?
        AND (curation_status IS NULL OR curation_status = 'pending_review')
        AND is_book_specific = 0
    `);

    for (const id of lessonIds) {
      const result = stmt.run(now, now, id);
      if (result.changes > 0) approved++;
    }

    logger.info({ requested: lessonIds.length, approved }, 'Batch approval complete');
    return approved;
  }

  /**
   * Delete duplicate lessons, keeping the canonical version
   */
  mergeDuplicates(canonicalId: string, duplicateIds: string[]): number {
    let deleted = 0;

    for (const dupId of duplicateIds) {
      // Mark as duplicate before deleting (for audit trail)
      this.applyCurationDecision(dupId, {
        status: 'duplicate',
        duplicateOfId: canonicalId,
        notes: `Merged into ${canonicalId}`,
      });

      // Delete the duplicate
      db.prepare('DELETE FROM editorial_lessons WHERE id = ?').run(dupId);
      deleted++;
    }

    logger.info({ canonicalId, deleted }, 'Duplicates merged');
    return deleted;
  }

  /**
   * Apply generalised version to a lesson
   */
  async applyGeneralisation(lessonId: string): Promise<void> {
    // Generate generalised version
    const generalised = await this.generaliseLesson(lessonId);

    // Update the lesson with generalised content
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE editorial_lessons SET
        title = ?,
        description = ?,
        generalised_title = ?,
        generalised_description = ?,
        is_book_specific = 0,
        book_id = NULL,
        curation_status = 'approved',
        last_curated_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      generalised.generalisedTitle,
      generalised.generalisedDescription,
      generalised.generalisedTitle,
      generalised.generalisedDescription,
      now,
      now,
      lessonId
    );

    logger.info({ lessonId }, 'Generalisation applied');
  }

  /**
   * Get curation statistics
   */
  getCurationStats(): {
    total: number;
    pendingReview: number;
    approved: number;
    archived: number;
    duplicate: number;
    needsGeneralisation: number;
    bookSpecific: number;
  } {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN curation_status = 'pending_review' OR curation_status IS NULL THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN curation_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN curation_status = 'archived' THEN 1 ELSE 0 END) as archived,
        SUM(CASE WHEN curation_status = 'duplicate' THEN 1 ELSE 0 END) as duplicate,
        SUM(CASE WHEN curation_status = 'needs_generalisation' THEN 1 ELSE 0 END) as needs_generalisation,
        SUM(CASE WHEN is_book_specific = 1 THEN 1 ELSE 0 END) as book_specific
      FROM editorial_lessons
    `).get() as any;

    return {
      total: stats.total || 0,
      pendingReview: stats.pending_review || 0,
      approved: stats.approved || 0,
      archived: stats.archived || 0,
      duplicate: stats.duplicate || 0,
      needsGeneralisation: stats.needs_generalisation || 0,
      bookSpecific: stats.book_specific || 0,
    };
  }

  /**
   * Get lessons by curation status
   */
  getLessonsByCurationStatus(status: CurationStatus | 'all', limit = 100): any[] {
    let query = `
      SELECT
        el.*,
        p.title as project_title
      FROM editorial_lessons el
      LEFT JOIN projects p ON el.project_id = p.id
    `;

    if (status !== 'all') {
      if (status === 'pending_review') {
        query += ` WHERE (el.curation_status = 'pending_review' OR el.curation_status IS NULL)`;
      } else {
        query += ` WHERE el.curation_status = ?`;
      }
    }

    query += ` ORDER BY el.created_at DESC LIMIT ?`;

    const stmt = db.prepare(query);
    const params = status !== 'all' && status !== 'pending_review' ? [status, limit] : [limit];

    return stmt.all(...params);
  }
}

export const lessonCurationService = new LessonCurationService();
