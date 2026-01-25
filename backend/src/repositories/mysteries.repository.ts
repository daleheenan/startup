/**
 * Mysteries Repository
 *
 * Repository for SeriesMystery entity data access.
 * Extends BaseRepository with mystery-specific queries.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Handles only mystery data access
 * - Open/Closed: Extendable through inheritance without modification
 * - Dependency Inversion: Depends on BaseRepository abstraction
 */

import type Database from 'better-sqlite3';
import { BaseRepository, type FindOptions } from './base.repository.js';
import type { SeriesMystery } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:mysteries');

/**
 * Mystery status type
 */
export type MysteryStatus = 'open' | 'resolved' | 'red_herring';

/**
 * Mystery importance type
 */
export type MysteryImportance = 'major' | 'minor' | 'subplot';

/**
 * Mystery entity as stored in database
 */
interface MysteryRow {
  id: string;
  series_id: string;
  question: string;
  raised_book: number;
  raised_chapter: number;
  context: string;
  answered_book: number | null;
  answered_chapter: number | null;
  answer: string | null;
  status: MysteryStatus;
  importance: MysteryImportance;
  created_at: string;
  updated_at: string;
}

/**
 * Parsed mystery entity matching the SeriesMystery interface
 */
export interface ParsedMystery extends SeriesMystery {}

/**
 * Mystery with timeline information for display
 */
export interface MysteryWithTimeline extends ParsedMystery {
  raisedAt: string;
  resolvedAt?: string;
}

/**
 * Mystery statistics
 */
export interface MysteryStats {
  total: number;
  open: number;
  resolved: number;
  redHerring: number;
  majorMysteries: number;
  minorMysteries: number;
  subplotMysteries: number;
}

/**
 * Mysteries Repository
 *
 * Provides data access for SeriesMystery entities with:
 * - Series-scoped queries
 * - Status-based filtering
 * - Timeline and statistics calculations
 */
export class MysteriesRepository extends BaseRepository<MysteryRow> {
  constructor(db: Database.Database) {
    super(db, 'series_mysteries', 'Mystery');
  }

  /**
   * Convert database row to SeriesMystery
   */
  private parseMystery(row: MysteryRow | null): ParsedMystery | null {
    if (!row) return null;

    return {
      id: row.id,
      question: row.question,
      raisedIn: {
        bookNumber: row.raised_book,
        chapterNumber: row.raised_chapter,
        context: row.context,
      },
      answeredIn: row.answered_book
        ? {
            bookNumber: row.answered_book,
            chapterNumber: row.answered_chapter!,
            answer: row.answer || '',
          }
        : undefined,
      status: row.status,
      importance: row.importance,
      seriesId: row.series_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Find mystery by ID with parsed fields
   */
  findByIdParsed(id: string): ParsedMystery | null {
    const row = this.findById(id);
    return this.parseMystery(row);
  }

  /**
   * Find all mysteries for a series
   */
  findBySeriesId(seriesId: string, options: FindOptions = {}): ParsedMystery[] {
    const rows = this.findBy('series_id', seriesId, {
      ...options,
      orderBy: options.orderBy || 'raised_book ASC, raised_chapter ASC',
    });
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find mysteries by status
   */
  findByStatus(status: MysteryStatus): ParsedMystery[] {
    const rows = this.findBy('status', status);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find mysteries by status for a series
   */
  findBySeriesAndStatus(seriesId: string, status: MysteryStatus): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND status = ?
      ORDER BY raised_book ASC, raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, status]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find open mysteries only for a series
   */
  findOpenMysteries(seriesId: string): ParsedMystery[] {
    return this.findBySeriesAndStatus(seriesId, 'open');
  }

  /**
   * Find resolved mysteries for a series
   */
  findResolvedMysteries(seriesId: string): ParsedMystery[] {
    return this.findBySeriesAndStatus(seriesId, 'resolved');
  }

  /**
   * Find mysteries by importance
   */
  findByImportance(seriesId: string, importance: MysteryImportance): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND importance = ?
      ORDER BY raised_book ASC, raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, importance]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find major mysteries only
   */
  findMajorMysteries(seriesId: string): ParsedMystery[] {
    return this.findByImportance(seriesId, 'major');
  }

  /**
   * Find mysteries raised in a specific book
   */
  findByRaisedBook(seriesId: string, bookNumber: number): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND raised_book = ?
      ORDER BY raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, bookNumber]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find mysteries raised in a specific chapter
   */
  findByRaisedChapter(seriesId: string, bookNumber: number, chapterNumber: number): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND raised_book = ? AND raised_chapter = ?
      ORDER BY created_at ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, bookNumber, chapterNumber]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Find mysteries answered in a specific book
   */
  findByAnsweredBook(seriesId: string, bookNumber: number): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND answered_book = ?
      ORDER BY answered_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, bookNumber]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Create a new mystery
   */
  createMystery(data: {
    id: string;
    seriesId: string;
    question: string;
    raisedBook: number;
    raisedChapter: number;
    context: string;
    importance?: MysteryImportance;
  }): ParsedMystery {
    const row = this.create({
      id: data.id,
      series_id: data.seriesId,
      question: data.question,
      raised_book: data.raisedBook,
      raised_chapter: data.raisedChapter,
      context: data.context,
      status: 'open',
      importance: data.importance || 'minor',
      answered_book: null,
      answered_chapter: null,
      answer: null,
    } as any);

    return this.parseMystery(row)!;
  }

  /**
   * Update mystery status
   */
  updateStatus(id: string, status: MysteryStatus): boolean {
    const result = this.update(id, { status } as any);
    return result !== null;
  }

  /**
   * Resolve a mystery
   */
  resolveMystery(
    id: string,
    answeredBook: number,
    answeredChapter: number,
    answer: string
  ): ParsedMystery | null {
    const result = this.update(id, {
      status: 'resolved',
      answered_book: answeredBook,
      answered_chapter: answeredChapter,
      answer,
    } as any);

    return result ? this.parseMystery(result) : null;
  }

  /**
   * Mark mystery as red herring
   */
  markAsRedHerring(id: string): boolean {
    return this.updateStatus(id, 'red_herring');
  }

  /**
   * Reopen a resolved mystery
   */
  reopenMystery(id: string): boolean {
    const result = this.update(id, {
      status: 'open',
      answered_book: null,
      answered_chapter: null,
      answer: null,
    } as any);
    return result !== null;
  }

  /**
   * Update mystery importance
   */
  updateImportance(id: string, importance: MysteryImportance): boolean {
    const result = this.update(id, { importance } as any);
    return result !== null;
  }

  /**
   * Update mystery question
   */
  updateQuestion(id: string, question: string): boolean {
    const result = this.update(id, { question } as any);
    return result !== null;
  }

  /**
   * Update mystery context
   */
  updateContext(id: string, context: string): boolean {
    const result = this.update(id, { context } as any);
    return result !== null;
  }

  /**
   * Get mystery statistics for a series
   */
  getSeriesStats(seriesId: string): MysteryStats {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'red_herring' THEN 1 ELSE 0 END) as red_herring,
        SUM(CASE WHEN importance = 'major' THEN 1 ELSE 0 END) as major_mysteries,
        SUM(CASE WHEN importance = 'minor' THEN 1 ELSE 0 END) as minor_mysteries,
        SUM(CASE WHEN importance = 'subplot' THEN 1 ELSE 0 END) as subplot_mysteries
      FROM series_mysteries
      WHERE series_id = ?
    `;

    const result = this.executeQuerySingle<{
      total: number;
      open: number;
      resolved: number;
      red_herring: number;
      major_mysteries: number;
      minor_mysteries: number;
      subplot_mysteries: number;
    }>(sql, [seriesId]);

    return {
      total: result?.total || 0,
      open: result?.open || 0,
      resolved: result?.resolved || 0,
      redHerring: result?.red_herring || 0,
      majorMysteries: result?.major_mysteries || 0,
      minorMysteries: result?.minor_mysteries || 0,
      subplotMysteries: result?.subplot_mysteries || 0,
    };
  }

  /**
   * Get mystery timeline for a series
   */
  getMysteryTimeline(seriesId: string): MysteryWithTimeline[] {
    const mysteries = this.findBySeriesId(seriesId);

    return mysteries.map(mystery => ({
      ...mystery,
      raisedAt: `Book ${mystery.raisedIn.bookNumber}, Chapter ${mystery.raisedIn.chapterNumber}`,
      resolvedAt: mystery.answeredIn
        ? `Book ${mystery.answeredIn.bookNumber}, Chapter ${mystery.answeredIn.chapterNumber}`
        : undefined,
    }));
  }

  /**
   * Count open mysteries for a series
   */
  countOpenMysteries(seriesId: string): number {
    const sql = `
      SELECT COUNT(*) as count FROM series_mysteries
      WHERE series_id = ? AND status = 'open'
    `;

    const result = this.executeQuerySingle<{ count: number }>(sql, [seriesId]);
    return result?.count || 0;
  }

  /**
   * Count mysteries by book where raised
   */
  countByRaisedBook(seriesId: string): Array<{ bookNumber: number; count: number }> {
    const sql = `
      SELECT raised_book as book_number, COUNT(*) as count
      FROM series_mysteries
      WHERE series_id = ?
      GROUP BY raised_book
      ORDER BY raised_book ASC
    `;

    return this.executeQuery<{ book_number: number; count: number }>(sql, [seriesId])
      .map(row => ({ bookNumber: row.book_number, count: row.count }));
  }

  /**
   * Search mysteries by question text
   */
  searchByQuestion(seriesId: string, query: string): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND question LIKE ?
      ORDER BY raised_book ASC, raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId, `%${query}%`]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Get unresolved major mysteries (potential plot holes)
   */
  getUnresolvedMajorMysteries(seriesId: string): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND status = 'open' AND importance = 'major'
      ORDER BY raised_book ASC, raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Delete all mysteries for a series
   */
  deleteBySeriesId(seriesId: string): number {
    return this.deleteBy('series_id', seriesId);
  }

  /**
   * Get mysteries that span multiple books (raised in one, answered in another)
   */
  findLongRunningMysteries(seriesId: string): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ?
        AND status = 'resolved'
        AND answered_book > raised_book
      ORDER BY (answered_book - raised_book) DESC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId]);
    return rows.map(row => this.parseMystery(row)!);
  }

  /**
   * Get mysteries that were never resolved (for completed series analysis)
   */
  findNeverResolvedMysteries(seriesId: string): ParsedMystery[] {
    const sql = `
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND status = 'open'
      ORDER BY importance DESC, raised_book ASC, raised_chapter ASC
    `;

    const rows = this.executeQuery<MysteryRow>(sql, [seriesId]);
    return rows.map(row => this.parseMystery(row)!);
  }
}

/**
 * Factory function to create a MysteriesRepository instance
 */
export function createMysteriesRepository(db: Database.Database): MysteriesRepository {
  return new MysteriesRepository(db);
}
