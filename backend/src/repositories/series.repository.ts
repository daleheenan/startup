/**
 * Series Repository
 *
 * Repository for Series entity data access.
 * Extends BaseRepository with series-specific queries.
 */

import type Database from 'better-sqlite3';
import { BaseRepository, type FindOptions } from './base.repository.js';
import type { Series, SeriesStatus, SeriesBible } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:series');

/**
 * Series entity as stored in database (with JSON strings)
 */
interface SeriesRow {
  id: string;
  title: string;
  description: string | null;
  series_bible: string | null;
  status: SeriesStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Series with parsed JSON fields
 */
export interface ParsedSeries extends Omit<Series, 'series_bible'> {
  series_bible: SeriesBible | null;
}

/**
 * Simplified project info for series listing
 */
export interface SeriesProjectInfo {
  id: string;
  title: string;
  genre: string;
  status: string;
  series_book_number: number | null;
  word_count: number;
}

/**
 * Series with its projects/books
 */
export interface SeriesWithProjects extends Omit<ParsedSeries, 'projects'> {
  projects: SeriesProjectInfo[];
}

/**
 * Series Repository
 *
 * Provides data access for Series entities with:
 * - JSON field parsing
 * - Project relationship queries
 * - Status-based filtering
 */
export class SeriesRepository extends BaseRepository<SeriesRow> {
  constructor(db: Database.Database) {
    super(db, 'series', 'Series');
  }

  /**
   * Parse JSON fields from database row
   */
  private parseSeries(row: SeriesRow | null): ParsedSeries | null {
    if (!row) return null;

    const { series_bible: _series_bible, ...rest } = row;

    return {
      ...rest,
      series_bible: this.safeJsonParse(_series_bible),
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
   * Find series by ID with parsed JSON fields
   */
  findByIdParsed(id: string): ParsedSeries | null {
    const row = this.findById(id);
    return this.parseSeries(row);
  }

  /**
   * Find all series with parsed JSON fields
   */
  findAllParsed(options: FindOptions = {}): ParsedSeries[] {
    const rows = this.findAll(options);
    return rows.map(row => this.parseSeries(row)!);
  }

  /**
   * Find series by status
   */
  findByStatus(status: SeriesStatus): ParsedSeries[] {
    const rows = this.findBy('status', status);
    return rows.map(row => this.parseSeries(row)!);
  }

  /**
   * Find series with all their projects/books
   */
  findWithProjects(seriesId: string): SeriesWithProjects | null {
    const series = this.findByIdParsed(seriesId);
    if (!series) return null;

    const sql = `
      SELECT
        p.id,
        p.title,
        p.genre,
        p.status,
        p.series_book_number,
        COALESCE(
          (SELECT SUM(b.word_count) FROM books b WHERE b.project_id = p.id),
          0
        ) as word_count
      FROM projects p
      WHERE p.series_id = ?
      ORDER BY p.series_book_number ASC, p.created_at ASC
    `;

    const projects = this.executeQuery<{
      id: string;
      title: string;
      genre: string;
      status: string;
      series_book_number: number | null;
      word_count: number;
    }>(sql, [seriesId]);

    return {
      ...series,
      projects,
    };
  }

  /**
   * Find all series with their projects
   */
  findAllWithProjects(options: FindOptions = {}): SeriesWithProjects[] {
    const allSeries = this.findAllParsed(options);

    return allSeries.map(series => {
      const sql = `
        SELECT
          p.id,
          p.title,
          p.genre,
          p.status,
          p.series_book_number,
          COALESCE(
            (SELECT SUM(b.word_count) FROM books b WHERE b.project_id = p.id),
            0
          ) as word_count
        FROM projects p
        WHERE p.series_id = ?
        ORDER BY p.series_book_number ASC, p.created_at ASC
      `;

      const projects = this.executeQuery<{
        id: string;
        title: string;
        genre: string;
        status: string;
        series_book_number: number | null;
        word_count: number;
      }>(sql, [series.id]);

      return {
        ...series,
        projects,
      };
    });
  }

  /**
   * Update series bible
   */
  updateSeriesBible(id: string, seriesBible: SeriesBible): boolean {
    const result = this.update(id, {
      series_bible: JSON.stringify(seriesBible),
    } as any);
    return result !== null;
  }

  /**
   * Update series status
   */
  updateStatus(id: string, status: SeriesStatus): boolean {
    const result = this.update(id, { status } as any);
    return result !== null;
  }

  /**
   * Add a project to the series
   */
  addProjectToSeries(seriesId: string, projectId: string, bookNumber?: number): boolean {
    // Get next book number if not provided
    let assignedNumber = bookNumber;
    if (assignedNumber === undefined) {
      const sql = `
        SELECT COALESCE(MAX(series_book_number), 0) + 1 as next_number
        FROM projects
        WHERE series_id = ?
      `;
      const result = this.executeQuerySingle<{ next_number: number }>(sql, [seriesId]);
      assignedNumber = result?.next_number || 1;
    }

    const sql = `
      UPDATE projects
      SET series_id = ?, series_book_number = ?, updated_at = datetime('now')
      WHERE id = ?
    `;

    try {
      this.db.prepare(sql).run(seriesId, assignedNumber, projectId);
      return true;
    } catch (error) {
      logger.error({ error, seriesId, projectId }, 'Failed to add project to series');
      return false;
    }
  }

  /**
   * Remove a project from the series
   */
  removeProjectFromSeries(projectId: string): boolean {
    const sql = `
      UPDATE projects
      SET series_id = NULL, series_book_number = NULL, updated_at = datetime('now')
      WHERE id = ?
    `;

    try {
      this.db.prepare(sql).run(projectId);
      return true;
    } catch (error) {
      logger.error({ error, projectId }, 'Failed to remove project from series');
      return false;
    }
  }

  /**
   * Reorder a project within the series
   */
  reorderProject(projectId: string, newBookNumber: number): boolean {
    const sql = `
      UPDATE projects
      SET series_book_number = ?, updated_at = datetime('now')
      WHERE id = ?
    `;

    try {
      this.db.prepare(sql).run(newBookNumber, projectId);
      return true;
    } catch (error) {
      logger.error({ error, projectId, newBookNumber }, 'Failed to reorder project');
      return false;
    }
  }

  /**
   * Get series statistics
   */
  getSeriesStats(seriesId: string): {
    totalProjects: number;
    totalWordCount: number;
    completedProjects: number;
  } {
    const sql = `
      SELECT
        COUNT(p.id) as total_projects,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(b.word_count), 0) FROM books b WHERE b.project_id = p.id)
        ), 0) as total_word_count,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_projects
      FROM projects p
      WHERE p.series_id = ?
    `;

    const result = this.executeQuerySingle<{
      total_projects: number;
      total_word_count: number;
      completed_projects: number;
    }>(sql, [seriesId]);

    return {
      totalProjects: result?.total_projects || 0,
      totalWordCount: result?.total_word_count || 0,
      completedProjects: result?.completed_projects || 0,
    };
  }

  /**
   * Search series by title
   */
  searchByTitle(query: string): ParsedSeries[] {
    const sql = `
      SELECT * FROM series
      WHERE title LIKE ?
      ORDER BY updated_at DESC
    `;

    const rows = this.executeQuery<SeriesRow>(sql, [`%${query}%`]);
    return rows.map(row => this.parseSeries(row)!);
  }
}

/**
 * Factory function to create a SeriesRepository instance
 */
export function createSeriesRepository(db: Database.Database): SeriesRepository {
  return new SeriesRepository(db);
}
