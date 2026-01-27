/**
 * Chapters Repository
 *
 * Repository for Chapter entity data access.
 * Extends BaseRepository with chapter-specific queries.
 */

import type Database from 'better-sqlite3';
import { BaseRepository, type FindOptions } from './base.repository.js';
import type { Chapter, ChapterStatus, SceneCard, Flag } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:chapters');

/**
 * Chapter entity as stored in database (with JSON strings)
 */
interface ChapterRow {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  scene_cards: string | null;
  content: string | null;
  summary: string | null;
  status: ChapterStatus;
  word_count: number;
  flags: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chapter with parsed JSON fields
 */
export interface ParsedChapter extends Omit<Chapter, 'scene_cards' | 'flags'> {
  scene_cards: SceneCard[];
  flags: Flag[];
}

/**
 * Chapter with book context
 */
export interface ChapterWithContext extends ParsedChapter {
  book_title: string;
  book_number: number;
  project_id: string;
}

/**
 * Chapters Repository
 *
 * Provides data access for Chapter entities with:
 * - Book-scoped queries
 * - Content and scene management
 * - Status workflow support
 */
export class ChaptersRepository extends BaseRepository<ChapterRow> {
  constructor(db: Database.Database) {
    super(db, 'chapters', 'Chapter');
  }

  /**
   * Parse JSON fields from database row
   */
  private parseChapter(row: ChapterRow | null): ParsedChapter | null {
    if (!row) return null;

    return {
      ...row,
      scene_cards: this.safeJsonParse(row.scene_cards, []),
      flags: this.safeJsonParse(row.flags, []),
    };
  }

  /**
   * Safe JSON parse helper
   */
  private safeJsonParse(value: string | null, fallback: any = null): any {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      logger.warn({ value: value.substring(0, 100) }, 'Failed to parse JSON');
      return fallback;
    }
  }

  /**
   * Find chapter by ID with parsed JSON fields
   */
  findByIdParsed(id: string): ParsedChapter | null {
    const row = this.findById(id);
    return this.parseChapter(row);
  }

  /**
   * Find all chapters for a book
   */
  findByBookId(bookId: string, options: FindOptions = {}): ParsedChapter[] {
    const rows = this.findBy('book_id', bookId, {
      ...options,
      orderBy: options.orderBy || 'chapter_number ASC',
    });
    return rows.map(row => this.parseChapter(row)!);
  }

  /**
   * Find chapter by book and chapter number
   */
  findByBookAndNumber(bookId: string, chapterNumber: number): ParsedChapter | null {
    const sql = `
      SELECT * FROM chapters
      WHERE book_id = ? AND chapter_number = ?
      LIMIT 1
    `;

    const row = this.executeQuerySingle<ChapterRow>(sql, [bookId, chapterNumber]);
    return this.parseChapter(row);
  }

  /**
   * Find chapters by status
   */
  findByStatus(status: ChapterStatus): ParsedChapter[] {
    const rows = this.findBy('status', status);
    return rows.map(row => this.parseChapter(row)!);
  }

  /**
   * Find chapters by status for a book
   */
  findByBookAndStatus(bookId: string, status: ChapterStatus): ParsedChapter[] {
    const sql = `
      SELECT * FROM chapters
      WHERE book_id = ? AND status = ?
      ORDER BY chapter_number ASC
    `;

    const rows = this.executeQuery<ChapterRow>(sql, [bookId, status]);
    return rows.map(row => this.parseChapter(row)!);
  }

  /**
   * Find chapter with book and project context
   */
  findWithContext(id: string): ChapterWithContext | null {
    const sql = `
      SELECT
        c.*,
        b.title as book_title,
        b.book_number,
        b.project_id
      FROM chapters c
      INNER JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `;

    const row = this.executeQuerySingle<ChapterRow & {
      book_title: string;
      book_number: number;
      project_id: string;
    }>(sql, [id]);

    if (!row) return null;

    return {
      ...this.parseChapter(row)!,
      book_title: row.book_title,
      book_number: row.book_number,
      project_id: row.project_id,
    };
  }

  /**
   * Find all chapters for a project
   */
  findByProjectId(projectId: string): ChapterWithContext[] {
    const sql = `
      SELECT
        c.*,
        b.title as book_title,
        b.book_number,
        b.project_id
      FROM chapters c
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
      ORDER BY b.book_number ASC, c.chapter_number ASC
    `;

    const rows = this.executeQuery<ChapterRow & {
      book_title: string;
      book_number: number;
      project_id: string;
    }>(sql, [projectId]);

    return rows.map(row => ({
      ...this.parseChapter(row)!,
      book_title: row.book_title,
      book_number: row.book_number,
      project_id: row.project_id,
    }));
  }

  /**
   * Get the next chapter number for a book
   */
  getNextChapterNumber(bookId: string): number {
    const sql = `
      SELECT COALESCE(MAX(chapter_number), 0) + 1 as next_number
      FROM chapters
      WHERE book_id = ?
    `;

    const result = this.executeQuerySingle<{ next_number: number }>(sql, [bookId]);
    return result?.next_number || 1;
  }

  /**
   * Update chapter status
   */
  updateStatus(id: string, status: ChapterStatus): boolean {
    const result = this.update(id, { status } as any);
    return result !== null;
  }

  /**
   * Update chapter content
   */
  updateContent(id: string, content: string): boolean {
    const wordCount = this.calculateWordCount(content);
    const result = this.update(id, {
      content,
      word_count: wordCount,
    } as any);
    return result !== null;
  }

  /**
   * Update chapter summary
   */
  updateSummary(id: string, summary: string): boolean {
    const result = this.update(id, { summary } as any);
    return result !== null;
  }

  /**
   * Update scene cards
   */
  updateSceneCards(id: string, sceneCards: SceneCard[]): boolean {
    const result = this.update(id, {
      scene_cards: JSON.stringify(sceneCards),
    } as any);
    return result !== null;
  }

  /**
   * Update flags
   */
  updateFlags(id: string, flags: Flag[]): boolean {
    const result = this.update(id, {
      flags: JSON.stringify(flags),
    } as any);
    return result !== null;
  }

  /**
   * Add a flag to a chapter
   */
  addFlag(id: string, flag: Flag): boolean {
    const chapter = this.findByIdParsed(id);
    if (!chapter) return false;

    const flags = [...chapter.flags, flag];
    return this.updateFlags(id, flags);
  }

  /**
   * Remove a flag from a chapter
   */
  removeFlag(id: string, flagId: string): boolean {
    const chapter = this.findByIdParsed(id);
    if (!chapter) return false;

    const flags = chapter.flags.filter(f => f.id !== flagId);
    return this.updateFlags(id, flags);
  }

  /**
   * Resolve a flag
   */
  resolveFlag(id: string, flagId: string): boolean {
    const chapter = this.findByIdParsed(id);
    if (!chapter) return false;

    const flags = chapter.flags.map(f =>
      f.id === flagId ? { ...f, resolved: true } : f
    );
    return this.updateFlags(id, flags);
  }

  /**
   * Calculate word count from content
   */
  private calculateWordCount(content: string | null): number {
    if (!content) return 0;
    return content.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Get total word count for a book
   */
  getTotalWordCountForBook(bookId: string): number {
    const sql = `
      SELECT COALESCE(SUM(word_count), 0) as total
      FROM chapters
      WHERE book_id = ?
    `;

    const result = this.executeQuerySingle<{ total: number }>(sql, [bookId]);
    return result?.total || 0;
  }

  /**
   * Get chapter count for a book
   */
  getChapterCountForBook(bookId: string): number {
    return this.countBy('book_id', bookId);
  }

  /**
   * Get chapter statistics for a book
   */
  getBookChapterStats(bookId: string): {
    total: number;
    pending: number;
    writing: number;
    editing: number;
    completed: number;
    wordCount: number;
  } {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'writing' THEN 1 ELSE 0 END) as writing,
        SUM(CASE WHEN status = 'editing' THEN 1 ELSE 0 END) as editing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(SUM(word_count), 0) as word_count
      FROM chapters
      WHERE book_id = ?
    `;

    const result = this.executeQuerySingle<{
      total: number;
      pending: number;
      writing: number;
      editing: number;
      completed: number;
      word_count: number;
    }>(sql, [bookId]);

    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      writing: result?.writing || 0,
      editing: result?.editing || 0,
      completed: result?.completed || 0,
      wordCount: result?.word_count || 0,
    };
  }

  /**
   * Get previous chapter
   */
  getPreviousChapter(id: string): ParsedChapter | null {
    const chapter = this.findById(id);
    if (!chapter || chapter.chapter_number <= 1) return null;

    return this.findByBookAndNumber(chapter.book_id, chapter.chapter_number - 1);
  }

  /**
   * Get next chapter
   */
  getNextChapter(id: string): ParsedChapter | null {
    const chapter = this.findById(id);
    if (!chapter) return null;

    return this.findByBookAndNumber(chapter.book_id, chapter.chapter_number + 1);
  }

  /**
   * Get chapters with unresolved flags
   */
  findWithUnresolvedFlags(bookId: string): ParsedChapter[] {
    const chapters = this.findByBookId(bookId);
    return chapters.filter(c => c.flags.some(f => !f.resolved));
  }

  /**
   * Find chapters needing content (pending status)
   */
  findPendingChapters(bookId: string): ParsedChapter[] {
    return this.findByBookAndStatus(bookId, 'pending');
  }

  /**
   * Bulk update chapter status
   */
  bulkUpdateStatus(ids: string[], status: ChapterStatus): number {
    if (ids.length === 0) return 0;

    // Validate IDs are strings to prevent SQL injection
    const validatedIds = ids.map(id => {
      if (typeof id !== 'string' || id.length === 0) {
        throw new Error('Invalid chapter ID');
      }
      return id;
    });

    const placeholders = validatedIds.map(() => '?').join(', ');
    const sql = `
      UPDATE chapters
      SET status = ?, updated_at = ?
      WHERE id IN (${placeholders})
    `;

    const now = new Date().toISOString();
    const result = this.executeStatement(sql, [status, now, ...validatedIds]);
    return result.changes;
  }

  /**
   * Reorder chapters (renumber after deletion)
   */
  renumberChapters(bookId: string): void {
    const chapters = this.findByBookId(bookId);

    this.transaction(() => {
      chapters.forEach((chapter, index) => {
        const newNumber = index + 1;
        if (chapter.chapter_number !== newNumber) {
          this.executeStatement(
            `UPDATE chapters SET chapter_number = ?, updated_at = ? WHERE id = ?`,
            [newNumber, new Date().toISOString(), chapter.id]
          );
        }
      });
    });

    logger.info({ bookId, chapterCount: chapters.length }, 'Chapters renumbered');
  }
}

/**
 * Factory function to create a ChaptersRepository instance
 */
export function createChaptersRepository(db: Database.Database): ChaptersRepository {
  return new ChaptersRepository(db);
}
