/**
 * Projects Repository
 *
 * Repository for Project entity data access.
 * Extends BaseRepository with project-specific queries.
 */

import type Database from 'better-sqlite3';
import { BaseRepository, type FindOptions } from './base.repository.js';
import type { Project, ProjectStatus, ProjectType } from '../shared/types/index.js';
import { queryMonitor } from '../db/query-monitor.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('repositories:projects');

/**
 * Project entity as stored in database (with JSON strings)
 */
interface ProjectRow {
  id: string;
  title: string;
  type: ProjectType;
  genre: string;
  status: ProjectStatus;
  story_concept: string | null;
  story_dna: string | null;
  story_bible: string | null;
  series_bible: string | null;
  book_count: number;
  universe_id: string | null;
  is_universe_root: number;
  plot_structure: string | null;
  source_concept_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Project with parsed JSON fields
 */
export interface ParsedProject extends Omit<Project, 'is_universe_root'> {
  is_universe_root: boolean;
  plot_structure?: any;
  story_concept?: string | null;  // Story concept stored directly on project
  source_concept_id?: string | null;  // Reference to saved concept used as source
}

/**
 * Projects Repository
 *
 * Provides data access for Project entities with:
 * - JSON field parsing
 * - Universe-related queries
 * - Status-based filtering
 */
export class ProjectsRepository extends BaseRepository<ProjectRow> {
  constructor(db: Database.Database) {
    super(db, 'projects', 'Project');
  }

  /**
   * Parse JSON fields from database row
   */
  private parseProject(row: ProjectRow | null): ParsedProject | null {
    if (!row) return null;

    return {
      ...row,
      is_universe_root: row.is_universe_root === 1,
      story_concept: this.safeJsonParse(row.story_concept),
      story_dna: this.safeJsonParse(row.story_dna),
      story_bible: this.safeJsonParse(row.story_bible),
      series_bible: this.safeJsonParse(row.series_bible),
      plot_structure: this.safeJsonParse(row.plot_structure),
      source_concept_id: row.source_concept_id,
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
   * Find project by ID with parsed JSON fields
   */
  findByIdParsed(id: string): ParsedProject | null {
    const row = this.findById(id);
    return this.parseProject(row);
  }

  /**
   * Find all projects with parsed JSON fields
   */
  findAllParsed(options: FindOptions = {}): ParsedProject[] {
    const rows = this.findAll(options);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find projects by status
   */
  findByStatus(status: ProjectStatus): ParsedProject[] {
    const rows = this.findBy('status', status);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find projects by type
   */
  findByType(type: ProjectType): ParsedProject[] {
    const rows = this.findBy('type', type);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find projects by genre
   */
  findByGenre(genre: string): ParsedProject[] {
    const rows = this.findBy('genre', genre);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find projects by universe
   */
  findByUniverseId(universeId: string): ParsedProject[] {
    const rows = this.findBy('universe_id', universeId);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find recently updated projects
   */
  findRecentlyUpdated(limit: number = 10): ParsedProject[] {
    const rows = this.findAll({
      orderBy: 'updated_at DESC',
      limit,
    });
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Find projects with their book counts
   */
  findWithBookCounts(): Array<ParsedProject & { actual_book_count: number }> {
    const sql = `
      SELECT p.*, COUNT(b.id) as actual_book_count
      FROM projects p
      LEFT JOIN books b ON b.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;

    const rows = this.executeQuery<ProjectRow & { actual_book_count: number }>(sql);
    return rows.map(row => ({
      ...this.parseProject(row)!,
      actual_book_count: row.actual_book_count,
    }));
  }

  /**
   * Update story DNA
   */
  updateStoryDNA(id: string, storyDNA: any): boolean {
    const result = this.update(id, {
      story_dna: JSON.stringify(storyDNA),
    } as any);
    return result !== null;
  }

  /**
   * Update story bible
   */
  updateStoryBible(id: string, storyBible: any): boolean {
    const result = this.update(id, {
      story_bible: JSON.stringify(storyBible),
    } as any);
    return result !== null;
  }

  /**
   * Update series bible
   */
  updateSeriesBible(id: string, seriesBible: any): boolean {
    const result = this.update(id, {
      series_bible: JSON.stringify(seriesBible),
    } as any);
    return result !== null;
  }

  /**
   * Update project status
   */
  updateStatus(id: string, status: ProjectStatus): boolean {
    const result = this.update(id, { status } as any);
    return result !== null;
  }

  /**
   * Link project to universe
   */
  linkToUniverse(id: string, universeId: string): boolean {
    const result = this.update(id, { universe_id: universeId } as any);
    return result !== null;
  }

  /**
   * Set as universe root
   */
  setAsUniverseRoot(id: string, isRoot: boolean = true): boolean {
    const result = this.update(id, { is_universe_root: isRoot ? 1 : 0 } as any);
    return result !== null;
  }

  /**
   * Get total word count across all books in project
   */
  getTotalWordCount(projectId: string): number {
    const sql = `
      SELECT COALESCE(SUM(word_count), 0) as total
      FROM books
      WHERE project_id = ?
    `;

    const result = this.executeQuerySingle<{ total: number }>(sql, [projectId]);
    return result?.total || 0;
  }

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): {
    totalBooks: number;
    totalChapters: number;
    totalWordCount: number;
    completedChapters: number;
  } {
    const sql = `
      SELECT
        COUNT(DISTINCT b.id) as total_books,
        COUNT(c.id) as total_chapters,
        COALESCE(SUM(b.word_count), 0) as total_word_count,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters
      FROM projects p
      LEFT JOIN books b ON b.project_id = p.id
      LEFT JOIN chapters c ON c.book_id = b.id
      WHERE p.id = ?
      GROUP BY p.id
    `;

    const result = this.executeQuerySingle<{
      total_books: number;
      total_chapters: number;
      total_word_count: number;
      completed_chapters: number;
    }>(sql, [projectId]);

    return {
      totalBooks: result?.total_books || 0,
      totalChapters: result?.total_chapters || 0,
      totalWordCount: result?.total_word_count || 0,
      completedChapters: result?.completed_chapters || 0,
    };
  }

  /**
   * Search projects by title
   */
  searchByTitle(query: string): ParsedProject[] {
    const sql = `
      SELECT * FROM projects
      WHERE title LIKE ?
      ORDER BY updated_at DESC
    `;

    const rows = this.executeQuery<ProjectRow>(sql, [`%${query}%`]);
    return rows.map(row => this.parseProject(row)!);
  }

  /**
   * Get distinct genres
   */
  getDistinctGenres(): string[] {
    const sql = `SELECT DISTINCT genre FROM projects ORDER BY genre`;
    const rows = this.executeQuery<{ genre: string }>(sql);
    return rows.map(row => row.genre);
  }
}

/**
 * Factory function to create a ProjectsRepository instance
 */
export function createProjectsRepository(db: Database.Database): ProjectsRepository {
  return new ProjectsRepository(db);
}
