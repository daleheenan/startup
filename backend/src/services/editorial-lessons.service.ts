/**
 * Editorial Lessons Service
 *
 * Manages lessons learned from editorial reviews for future book generations.
 * Captures insights from VEB findings, word count revisions, and user feedback
 * to improve future content generation.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:editorial-lessons');

export type LessonCategory =
  | 'pacing'
  | 'exposition'
  | 'dialogue'
  | 'character'
  | 'plot'
  | 'scene_structure'
  | 'word_economy'
  | 'style'
  | 'market'
  | 'other';

export type SourceModule = 'beta_swarm' | 'ruthless_editor' | 'market_analyst' | 'word_count_revision';

export type SeverityLevel = 'minor' | 'moderate' | 'major';

export interface EditorialLesson {
  id: string;
  projectId: string;
  bookId: string | null;
  category: LessonCategory;
  title: string;
  description: string;
  sourceModule: SourceModule | null;
  originalIssue: string | null;
  resolution: string | null;
  wordCountImpact: number;
  severityLevel: SeverityLevel | null;
  appliesToGenre: string | null;
  appliesToTone: string | null;
  isActive: boolean;
  timesApplied: number;
  effectivenessScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonInput {
  projectId: string;
  bookId?: string;
  category: LessonCategory;
  title: string;
  description: string;
  sourceModule?: SourceModule;
  originalIssue?: string;
  resolution?: string;
  wordCountImpact?: number;
  severityLevel?: SeverityLevel;
  appliesToGenre?: string;
  appliesToTone?: string;
}

export interface LessonApplication {
  id: string;
  lessonId: string;
  bookId: string;
  chapterId: string | null;
  appliedAt: string;
  wasEffective: number | null;
  notes: string | null;
}

interface DBLesson {
  id: string;
  project_id: string;
  book_id: string | null;
  category: string;
  title: string;
  description: string;
  source_module: string | null;
  original_issue: string | null;
  resolution: string | null;
  word_count_impact: number;
  severity_level: string | null;
  applies_to_genre: string | null;
  applies_to_tone: string | null;
  is_active: number;
  times_applied: number;
  effectiveness_score: number;
  created_at: string;
  updated_at: string;
}

interface DBApplication {
  id: string;
  lesson_id: string;
  book_id: string;
  chapter_id: string | null;
  applied_at: string;
  was_effective: number | null;
  notes: string | null;
}

/**
 * Map database row to EditorialLesson
 */
function mapDBToLesson(row: DBLesson): EditorialLesson {
  return {
    id: row.id,
    projectId: row.project_id,
    bookId: row.book_id,
    category: row.category as LessonCategory,
    title: row.title,
    description: row.description,
    sourceModule: row.source_module as SourceModule | null,
    originalIssue: row.original_issue,
    resolution: row.resolution,
    wordCountImpact: row.word_count_impact,
    severityLevel: row.severity_level as SeverityLevel | null,
    appliesToGenre: row.applies_to_genre,
    appliesToTone: row.applies_to_tone,
    isActive: row.is_active === 1,
    timesApplied: row.times_applied,
    effectivenessScore: row.effectiveness_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to LessonApplication
 */
function mapDBToApplication(row: DBApplication): LessonApplication {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    appliedAt: row.applied_at,
    wasEffective: row.was_effective,
    notes: row.notes,
  };
}

class EditorialLessonsService {
  /**
   * Create a new lesson
   */
  createLesson(input: CreateLessonInput): EditorialLesson {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO editorial_lessons (
        id, project_id, book_id, category, title, description,
        source_module, original_issue, resolution, word_count_impact,
        severity_level, applies_to_genre, applies_to_tone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.bookId || null,
      input.category,
      input.title,
      input.description,
      input.sourceModule || null,
      input.originalIssue || null,
      input.resolution || null,
      input.wordCountImpact || 0,
      input.severityLevel || null,
      input.appliesToGenre || null,
      input.appliesToTone || null,
      now,
      now
    );

    logger.info({ id, projectId: input.projectId, category: input.category }, 'Editorial lesson created');

    return this.getLesson(id);
  }

  /**
   * Get a lesson by ID
   */
  getLesson(id: string): EditorialLesson {
    const stmt = db.prepare<[string], DBLesson>(`
      SELECT * FROM editorial_lessons WHERE id = ?
    `);

    const row = stmt.get(id);
    if (!row) {
      throw new Error(`Lesson not found: ${id}`);
    }

    return mapDBToLesson(row);
  }

  /**
   * Get all lessons for a project
   */
  getLessonsForProject(projectId: string, options?: {
    activeOnly?: boolean;
    category?: LessonCategory;
    genre?: string;
    tone?: string;
  }): EditorialLesson[] {
    let query = 'SELECT * FROM editorial_lessons WHERE project_id = ?';
    const params: (string | number)[] = [projectId];

    if (options?.activeOnly) {
      query += ' AND is_active = 1';
    }

    if (options?.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options?.genre) {
      query += ' AND (applies_to_genre IS NULL OR applies_to_genre = ?)';
      params.push(options.genre);
    }

    if (options?.tone) {
      query += ' AND (applies_to_tone IS NULL OR applies_to_tone = ?)';
      params.push(options.tone);
    }

    query += ' ORDER BY effectiveness_score DESC, times_applied DESC, created_at DESC';

    const stmt = db.prepare<(string | number)[], DBLesson>(query);
    const rows = stmt.all(...params);

    return rows.map(mapDBToLesson);
  }

  /**
   * Get lessons applicable to a specific book based on genre and tone
   */
  getApplicableLessons(projectId: string, genre?: string, tone?: string): EditorialLesson[] {
    return this.getLessonsForProject(projectId, {
      activeOnly: true,
      genre,
      tone,
    });
  }

  /**
   * Update a lesson
   */
  updateLesson(id: string, updates: Partial<CreateLessonInput> & { isActive?: boolean }): EditorialLesson {
    const lesson = this.getLesson(id);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE editorial_lessons SET
        category = COALESCE(?, category),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        source_module = COALESCE(?, source_module),
        original_issue = COALESCE(?, original_issue),
        resolution = COALESCE(?, resolution),
        word_count_impact = COALESCE(?, word_count_impact),
        severity_level = COALESCE(?, severity_level),
        applies_to_genre = COALESCE(?, applies_to_genre),
        applies_to_tone = COALESCE(?, applies_to_tone),
        is_active = COALESCE(?, is_active),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.category || null,
      updates.title || null,
      updates.description || null,
      updates.sourceModule || null,
      updates.originalIssue || null,
      updates.resolution || null,
      updates.wordCountImpact !== undefined ? updates.wordCountImpact : null,
      updates.severityLevel || null,
      updates.appliesToGenre || null,
      updates.appliesToTone || null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      now,
      id
    );

    logger.info({ id }, 'Editorial lesson updated');

    return this.getLesson(id);
  }

  /**
   * Delete a lesson
   */
  deleteLesson(id: string): void {
    const stmt = db.prepare('DELETE FROM editorial_lessons WHERE id = ?');
    stmt.run(id);

    logger.info({ id }, 'Editorial lesson deleted');
  }

  /**
   * Record that a lesson was applied to a book/chapter
   */
  recordApplication(lessonId: string, bookId: string, chapterId?: string): LessonApplication {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO editorial_lesson_applications (id, lesson_id, book_id, chapter_id, applied_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(lesson_id, book_id, chapter_id) DO UPDATE SET applied_at = ?
    `);

    stmt.run(id, lessonId, bookId, chapterId || null, now, now);

    const getStmt = db.prepare<[string, string], DBApplication>(`
      SELECT * FROM editorial_lesson_applications
      WHERE lesson_id = ? AND book_id = ? ORDER BY applied_at DESC LIMIT 1
    `);

    const row = getStmt.get(lessonId, bookId);
    if (!row) {
      throw new Error('Failed to record application');
    }

    logger.info({ lessonId, bookId, chapterId }, 'Lesson application recorded');

    return mapDBToApplication(row);
  }

  /**
   * Record feedback on whether a lesson was effective
   */
  recordEffectiveness(applicationId: string, wasEffective: number, notes?: string): void {
    const stmt = db.prepare(`
      UPDATE editorial_lesson_applications
      SET was_effective = ?, notes = ?
      WHERE id = ?
    `);

    stmt.run(wasEffective, notes || null, applicationId);

    logger.info({ applicationId, wasEffective }, 'Lesson effectiveness recorded');
  }

  /**
   * Extract lessons from VEB findings
   * Call this after a comprehensive rewrite to capture what was learned
   */
  extractLessonsFromVEB(projectId: string, bookId: string, vebReport: {
    ruthlessEditor?: {
      chapterResults?: Array<{
        chapterNumber: number;
        expositionIssues?: Array<{ issue: string; suggestion: string; severity: string }>;
        pacingIssues?: Array<{ issue: string; suggestion: string; severity: string }>;
        scenePurpose?: { earned: boolean; reasoning: string; recommendation?: string };
      }>;
      summaryVerdict?: string;
    };
    betaSwarm?: {
      chapterResults?: Array<{
        chapterNumber: number;
        dnfRiskPoints?: Array<{ reason: string; severity: string }>;
      }>;
      summaryReaction?: string;
    };
    marketAnalyst?: {
      hookAnalysis?: { weaknesses?: string[] };
      marketPositioning?: { potentialChallenges?: string[] };
      agentNotes?: string;
    };
    recommendations?: string[];
    summary?: string;
  }): EditorialLesson[] {
    const lessons: EditorialLesson[] = [];

    // Extract from Ruthless Editor
    if (vebReport.ruthlessEditor?.chapterResults) {
      const expositionCounts: Record<string, number> = {};
      const pacingCounts: Record<string, number> = {};
      let sceneIssuesCount = 0;

      for (const chapter of vebReport.ruthlessEditor.chapterResults) {
        // Count exposition issue types
        for (const issue of chapter.expositionIssues || []) {
          expositionCounts[issue.issue] = (expositionCounts[issue.issue] || 0) + 1;
        }

        // Count pacing issue types
        for (const issue of chapter.pacingIssues || []) {
          pacingCounts[issue.issue] = (pacingCounts[issue.issue] || 0) + 1;
        }

        // Count scene purpose failures
        if (chapter.scenePurpose && !chapter.scenePurpose.earned) {
          sceneIssuesCount++;
        }
      }

      // Create lessons for frequent exposition issues
      for (const [issue, count] of Object.entries(expositionCounts)) {
        if (count >= 3) {
          lessons.push(this.createLesson({
            projectId,
            bookId,
            category: 'exposition',
            title: `Avoid ${issue.replace(/_/g, ' ')}`,
            description: `This issue appeared ${count} times across chapters. Focus on showing rather than telling and integrate information naturally into the narrative.`,
            sourceModule: 'ruthless_editor',
            originalIssue: issue,
            severityLevel: count >= 5 ? 'major' : 'moderate',
          }));
        }
      }

      // Create lessons for frequent pacing issues
      for (const [issue, count] of Object.entries(pacingCounts)) {
        if (count >= 3) {
          lessons.push(this.createLesson({
            projectId,
            bookId,
            category: 'pacing',
            title: `Address ${issue.replace(/_/g, ' ')} issues`,
            description: `This pacing issue appeared ${count} times. Ensure each scene advances the plot and maintains reader engagement.`,
            sourceModule: 'ruthless_editor',
            originalIssue: issue,
            severityLevel: count >= 5 ? 'major' : 'moderate',
          }));
        }
      }

      // Create lesson for scene purpose issues
      if (sceneIssuesCount >= 3) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: 'scene_structure',
          title: 'Ensure every scene earns its place',
          description: `${sceneIssuesCount} scenes failed to justify their inclusion. Each scene should advance plot, develop character, or provide essential information.`,
          sourceModule: 'ruthless_editor',
          severityLevel: 'major',
        }));
      }
    }

    // Extract from Beta Swarm
    if (vebReport.betaSwarm?.chapterResults) {
      let dnfRiskCount = 0;

      for (const chapter of vebReport.betaSwarm.chapterResults) {
        dnfRiskCount += (chapter.dnfRiskPoints || []).length;
      }

      if (dnfRiskCount >= 5) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: 'pacing',
          title: 'Reduce DNF risk points',
          description: `${dnfRiskCount} DNF risk points identified. Focus on maintaining reader engagement and avoiding common put-down triggers.`,
          sourceModule: 'beta_swarm',
          severityLevel: 'major',
        }));
      }
    }

    // Extract from Market Analyst
    if (vebReport.marketAnalyst) {
      const { hookAnalysis, marketPositioning } = vebReport.marketAnalyst;

      if (hookAnalysis?.weaknesses && hookAnalysis.weaknesses.length >= 2) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: 'market',
          title: 'Strengthen opening hook',
          description: `Multiple weaknesses identified in the opening hook. Focus on immediate engagement and clear genre signalling.`,
          sourceModule: 'market_analyst',
          severityLevel: 'major',
        }));
      }

      if (marketPositioning?.potentialChallenges && marketPositioning.potentialChallenges.length >= 2) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: 'market',
          title: 'Address market positioning',
          description: `${marketPositioning.potentialChallenges.length} market positioning challenges identified. Consider genre expectations and target audience preferences.`,
          sourceModule: 'market_analyst',
          severityLevel: 'moderate',
        }));
      }

      // Extract agent notes as a lesson
      if (vebReport.marketAnalyst?.agentNotes) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: 'market',
          title: 'Agent feedback on manuscript',
          description: vebReport.marketAnalyst.agentNotes,
          sourceModule: 'market_analyst',
          severityLevel: 'major',
        }));
      }
    }

    // Extract key recommendations as individual lessons
    // These are the prioritised action items from the full VEB report
    if (vebReport.recommendations && vebReport.recommendations.length > 0) {
      for (const rec of vebReport.recommendations) {
        // Parse the recommendation to determine category
        const recLower = rec.toLowerCase();
        let category: LessonCategory = 'other';
        let sourceModule: SourceModule = 'ruthless_editor';

        if (recLower.includes('pacing') || recLower.includes('slow') || recLower.includes('drag')) {
          category = 'pacing';
        } else if (recLower.includes('exposition') || recLower.includes('info dump') || recLower.includes('telling')) {
          category = 'exposition';
        } else if (recLower.includes('dialogue') || recLower.includes('conversation')) {
          category = 'dialogue';
        } else if (recLower.includes('character') || recLower.includes('motivation') || recLower.includes('arc')) {
          category = 'character';
        } else if (recLower.includes('plot') || recLower.includes('story') || recLower.includes('twist')) {
          category = 'plot';
        } else if (recLower.includes('scene') || recLower.includes('chapter')) {
          category = 'scene_structure';
        } else if (recLower.includes('word') || recLower.includes('cut') || recLower.includes('trim')) {
          category = 'word_economy';
        } else if (recLower.includes('style') || recLower.includes('voice') || recLower.includes('prose')) {
          category = 'style';
        } else if (recLower.includes('market') || recLower.includes('hook') || recLower.includes('commercial') || recLower.includes('agent')) {
          category = 'market';
          sourceModule = 'market_analyst';
        } else if (recLower.includes('engagement') || recLower.includes('reader') || recLower.includes('dnf')) {
          sourceModule = 'beta_swarm';
        }

        // Extract title from recommendation (first part before colon or first sentence)
        let title = rec;
        const colonIdx = rec.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          title = rec.substring(0, colonIdx).trim();
        } else if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }

        lessons.push(this.createLesson({
          projectId,
          bookId,
          category,
          title,
          description: rec,
          sourceModule,
          severityLevel: 'moderate',
        }));
      }

      logger.info({ projectId, bookId, keyRecommendations: vebReport.recommendations.length }, 'Extracted key recommendations from VEB');
    }

    logger.info({ projectId, bookId, lessonsCreated: lessons.length }, 'Extracted lessons from VEB');

    return lessons;
  }

  /**
   * Extract lessons from word count revision
   */
  extractLessonsFromRevision(projectId: string, bookId: string, revision: {
    originalWordCount: number;
    finalWordCount: number;
    cutsExplanations: Array<{ whatWasCut: string; why: string; wordsRemoved: number }>;
  }): EditorialLesson[] {
    const lessons: EditorialLesson[] = [];

    const wordsCut = revision.originalWordCount - revision.finalWordCount;
    const percentReduction = (wordsCut / revision.originalWordCount) * 100;

    // Create overall lesson about word economy
    if (percentReduction >= 10) {
      lessons.push(this.createLesson({
        projectId,
        bookId,
        category: 'word_economy',
        title: `Aim for tighter prose (${percentReduction.toFixed(0)}% reduction achieved)`,
        description: `The book was reduced from ${revision.originalWordCount.toLocaleString()} to ${revision.finalWordCount.toLocaleString()} words. Future generations should be more economical from the start.`,
        sourceModule: 'word_count_revision',
        wordCountImpact: -wordsCut,
        severityLevel: percentReduction >= 20 ? 'major' : 'moderate',
      }));
    }

    // Analyse cut types
    const cutCategories: Record<string, { count: number; words: number }> = {};

    for (const cut of revision.cutsExplanations) {
      // Categorise cuts by type
      const category = cut.whatWasCut.toLowerCase().includes('exposition') ? 'exposition'
        : cut.whatWasCut.toLowerCase().includes('description') ? 'style'
        : cut.whatWasCut.toLowerCase().includes('dialogue') ? 'dialogue'
        : cut.whatWasCut.toLowerCase().includes('repeat') ? 'word_economy'
        : 'other';

      if (!cutCategories[category]) {
        cutCategories[category] = { count: 0, words: 0 };
      }
      cutCategories[category].count++;
      cutCategories[category].words += cut.wordsRemoved;
    }

    // Create lessons for significant cut categories
    for (const [category, stats] of Object.entries(cutCategories)) {
      if (stats.count >= 3 || stats.words >= 1000) {
        lessons.push(this.createLesson({
          projectId,
          bookId,
          category: category as LessonCategory,
          title: `Reduce ${category.replace(/_/g, ' ')} bloat`,
          description: `${stats.words.toLocaleString()} words were cut from ${stats.count} instances of ${category} issues. Be more economical in future generations.`,
          sourceModule: 'word_count_revision',
          wordCountImpact: -stats.words,
          severityLevel: stats.words >= 2000 ? 'major' : 'moderate',
        }));
      }
    }

    logger.info({ projectId, bookId, lessonsCreated: lessons.length, percentReduction }, 'Extracted lessons from revision');

    return lessons;
  }

  /**
   * Get a summary of lessons for prompting AI generation
   */
  getLessonsSummaryForPrompt(projectId: string, genre?: string, tone?: string): string {
    const lessons = this.getApplicableLessons(projectId, genre, tone);

    if (lessons.length === 0) {
      return '';
    }

    // Group by category
    const byCategory: Record<string, EditorialLesson[]> = {};
    for (const lesson of lessons) {
      if (!byCategory[lesson.category]) {
        byCategory[lesson.category] = [];
      }
      byCategory[lesson.category].push(lesson);
    }

    // Format for prompt
    let summary = '## Lessons Learned from Previous Books\n\n';
    summary += 'Based on editorial feedback from previous books, please keep the following in mind:\n\n';

    for (const [category, categoryLessons] of Object.entries(byCategory)) {
      summary += `### ${category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}\n`;
      for (const lesson of categoryLessons.slice(0, 3)) { // Limit to top 3 per category
        summary += `- ${lesson.title}: ${lesson.description}\n`;
      }
      summary += '\n';
    }

    return summary;
  }
}

export const editorialLessonsService = new EditorialLessonsService();
