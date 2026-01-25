/**
 * Books Repository
 *
 * Repository for Book entity data access.
 * Extends BaseRepository with book-specific queries.
 */

import type Database from 'better-sqlite3';
import { BaseRepository, type FindOptions } from './base.repository.js';
import type { Book, BookStatus, BookEndingState } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:books');

/**
 * Book entity as stored in database (with JSON strings)
 */
interface BookRow {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: BookStatus;
  word_count: number;
  ending_state: string | null;
  book_summary: string | null;
  timeline_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Book with parsed JSON fields
 */
export interface ParsedBook extends Omit<Book, 'ending_state'> {
  ending_state: BookEndingState | null;
}

/**
 * Book with chapter information
 */
export interface BookWithChapters extends ParsedBook {
  chapter_count: number;
  completed_chapters: number;
}

/**
 * Books Repository
 *
 * Provides data access for Book entities with:
 * - Project-scoped queries
 * - Chapter aggregation
 * - Status management
 */
export class BooksRepository extends BaseRepository<BookRow> {
  constructor(db: Database.Database) {
    super(db, 'books', 'Book');
  }

  /**
   * Parse JSON fields from database row
   */
  private parseBook(row: BookRow | null): ParsedBook | null {
    if (!row) return null;

    return {
      ...row,
      ending_state: this.safeJsonParse(row.ending_state),
    };
  }

  /**
   * Safe JSON parse helper
   */
  private safeJsonParse(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      logger.warn({ value: value.substring(0, 100) }, 'Failed to parse JSON');
      return null;
    }
  }

  /**
   * Find book by ID with parsed JSON fields
   */
  findByIdParsed(id: string): ParsedBook | null {
    const row = this.findById(id);
    return this.parseBook(row);
  }

  /**
   * Find all books for a project
   */
  findByProjectId(projectId: string, options: FindOptions = {}): ParsedBook[] {
    const rows = this.findBy('project_id', projectId, {
      ...options,
      orderBy: options.orderBy || 'book_number ASC',
    });
    return rows.map(row => this.parseBook(row)!);
  }

  /**
   * Find book by project and book number
   */
  findByProjectAndNumber(projectId: string, bookNumber: number): ParsedBook | null {
    const sql = `
      SELECT * FROM books
      WHERE project_id = ? AND book_number = ?
      LIMIT 1
    `;

    const row = this.executeQuerySingle<BookRow>(sql, [projectId, bookNumber]);
    return this.parseBook(row);
  }

  /**
   * Find books by status
   */
  findByStatus(status: BookStatus): ParsedBook[] {
    const rows = this.findBy('status', status);
    return rows.map(row => this.parseBook(row)!);
  }

  /**
   * Find books with chapter counts
   */
  findWithChapterCounts(projectId: string): BookWithChapters[] {
    const sql = `
      SELECT
        b.*,
        COUNT(c.id) as chapter_count,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters
      FROM books b
      LEFT JOIN chapters c ON c.book_id = b.id
      WHERE b.project_id = ?
      GROUP BY b.id
      ORDER BY b.book_number ASC
    `;

    const rows = this.executeQuery<BookRow & { chapter_count: number; completed_chapters: number }>(
      sql,
      [projectId]
    );

    return rows.map(row => ({
      ...this.parseBook(row)!,
      chapter_count: row.chapter_count,
      completed_chapters: row.completed_chapters,
    }));
  }

  /**
   * Get the next book number for a project
   */
  getNextBookNumber(projectId: string): number {
    const sql = `
      SELECT COALESCE(MAX(book_number), 0) + 1 as next_number
      FROM books
      WHERE project_id = ?
    `;

    const result = this.executeQuerySingle<{ next_number: number }>(sql, [projectId]);
    return result?.next_number || 1;
  }

  /**
   * Update book status
   */
  updateStatus(id: string, status: BookStatus): boolean {
    const result = this.update(id, { status } as any);
    return result !== null;
  }

  /**
   * Update word count
   */
  updateWordCount(id: string, wordCount: number): boolean {
    const result = this.update(id, { word_count: wordCount } as any);
    return result !== null;
  }

  /**
   * Recalculate word count from chapters
   */
  recalculateWordCount(id: string): number {
    const sql = `
      SELECT COALESCE(SUM(word_count), 0) as total
      FROM chapters
      WHERE book_id = ?
    `;

    const result = this.executeQuerySingle<{ total: number }>(sql, [id]);
    const total = result?.total || 0;

    this.updateWordCount(id, total);
    return total;
  }

  /**
   * Update ending state
   */
  updateEndingState(id: string, endingState: BookEndingState): boolean {
    const result = this.update(id, {
      ending_state: JSON.stringify(endingState),
    } as any);
    return result !== null;
  }

  /**
   * Update book summary
   */
  updateBookSummary(id: string, summary: string): boolean {
    const result = this.update(id, { book_summary: summary } as any);
    return result !== null;
  }

  /**
   * Update timeline end
   */
  updateTimelineEnd(id: string, timelineEnd: string): boolean {
    const result = this.update(id, { timeline_end: timelineEnd } as any);
    return result !== null;
  }

  /**
   * Get total word count for project
   */
  getTotalWordCountForProject(projectId: string): number {
    const sql = `
      SELECT COALESCE(SUM(word_count), 0) as total
      FROM books
      WHERE project_id = ?
    `;

    const result = this.executeQuerySingle<{ total: number }>(sql, [projectId]);
    return result?.total || 0;
  }

  /**
   * Get book count for project
   */
  getBookCountForProject(projectId: string): number {
    return this.countBy('project_id', projectId);
  }

  /**
   * Check if book is the last in series
   */
  isLastBook(id: string): boolean {
    const book = this.findById(id);
    if (!book) return false;

    const sql = `
      SELECT MAX(book_number) as max_number
      FROM books
      WHERE project_id = ?
    `;

    const result = this.executeQuerySingle<{ max_number: number }>(
      sql,
      [book.project_id]
    );

    return book.book_number === result?.max_number;
  }

  /**
   * Get previous book in series
   */
  getPreviousBook(id: string): ParsedBook | null {
    const book = this.findById(id);
    if (!book || book.book_number <= 1) return null;

    return this.findByProjectAndNumber(book.project_id, book.book_number - 1);
  }

  /**
   * Get next book in series
   */
  getNextBook(id: string): ParsedBook | null {
    const book = this.findById(id);
    if (!book) return null;

    return this.findByProjectAndNumber(book.project_id, book.book_number + 1);
  }

  /**
   * Get book statistics
   */
  getBookStats(id: string): {
    totalChapters: number;
    completedChapters: number;
    pendingChapters: number;
    wordCount: number;
  } {
    const sql = `
      SELECT
        COUNT(c.id) as total_chapters,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
        SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending_chapters,
        COALESCE(SUM(c.word_count), 0) as word_count
      FROM books b
      LEFT JOIN chapters c ON c.book_id = b.id
      WHERE b.id = ?
      GROUP BY b.id
    `;

    const result = this.executeQuerySingle<{
      total_chapters: number;
      completed_chapters: number;
      pending_chapters: number;
      word_count: number;
    }>(sql, [id]);

    return {
      totalChapters: result?.total_chapters || 0,
      completedChapters: result?.completed_chapters || 0,
      pendingChapters: result?.pending_chapters || 0,
      wordCount: result?.word_count || 0,
    };
  }

  /**
   * Delete book and cascade to chapters
   */
  deleteWithCascade(id: string): boolean {
    return this.transaction(() => {
      // Delete chapters first
      this.executeStatement(`DELETE FROM chapters WHERE book_id = ?`, [id]);

      // Then delete the book
      return this.delete(id);
    });
  }
}

/**
 * Factory function to create a BooksRepository instance
 */
export function createBooksRepository(db: Database.Database): BooksRepository {
  return new BooksRepository(db);
}
