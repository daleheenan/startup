/**
 * Pen Names Portfolio Routes
 * Handles portfolio-related queries for pen names (books, statistics)
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:pen-names:portfolio');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/pen-names/:id/books
 * Get all books (projects) for a pen name
 */
router.get('/:id/books', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const penName = checkStmt.get(penNameId, userId);

    if (!penName) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    // Get all projects for this pen name
    const projectsStmt = db.prepare<[string], any>(`
      SELECT
        id,
        title,
        type,
        genre,
        status,
        book_count,
        created_at,
        updated_at
      FROM projects
      WHERE pen_name_id = ?
      ORDER BY updated_at DESC
    `);

    const projects = projectsStmt.all(penNameId);

    // Get books for each project
    const booksStmt = db.prepare<[string], any>(`
      SELECT
        id,
        project_id,
        book_number,
        title,
        status,
        word_count,
        created_at,
        updated_at
      FROM books
      WHERE project_id = ?
      ORDER BY book_number ASC
    `);

    const enrichedProjects = projects.map((project) => {
      const books = booksStmt.all(project.id);
      return {
        ...project,
        books,
      };
    });

    res.json({
      pen_name_id: penNameId,
      projects: enrichedProjects,
      total_projects: enrichedProjects.length,
      total_books: enrichedProjects.reduce((sum, p) => sum + p.books.length, 0),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching books for pen name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/pen-names/:id/stats
 * Get comprehensive statistics for a pen name
 */
router.get('/:id/stats', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id, pen_name FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const penName = checkStmt.get(penNameId, userId);

    if (!penName) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    // Get project count and total word count
    const projectStatsStmt = db.prepare<[string], any>(`
      SELECT
        COUNT(DISTINCT p.id) as project_count,
        COALESCE(SUM(b.word_count), 0) as total_word_count,
        COUNT(DISTINCT b.id) as book_count
      FROM projects p
      LEFT JOIN books b ON p.id = b.project_id
      WHERE p.pen_name_id = ?
    `);
    const projectStats = projectStatsStmt.get(penNameId);

    // Get series count
    const seriesStmt = db.prepare<[string], { series_count: number }>(`
      SELECT COUNT(DISTINCT series_id) as series_count
      FROM projects
      WHERE pen_name_id = ? AND series_id IS NOT NULL
    `);
    const seriesCount = seriesStmt.get(penNameId);

    // Get breakdown by genre
    const genreStmt = db.prepare<[string], any>(`
      SELECT
        genre,
        COUNT(*) as count,
        COALESCE(SUM(b.word_count), 0) as word_count
      FROM projects p
      LEFT JOIN books b ON p.id = b.project_id
      WHERE p.pen_name_id = ?
      GROUP BY genre
      ORDER BY count DESC
    `);
    const byGenre = genreStmt.all(penNameId);

    // Get breakdown by year
    const yearStmt = db.prepare<[string], any>(`
      SELECT
        strftime('%Y', p.created_at) as year,
        COUNT(DISTINCT p.id) as count,
        COALESCE(SUM(b.word_count), 0) as word_count
      FROM projects p
      LEFT JOIN books b ON p.id = b.project_id
      WHERE p.pen_name_id = ?
      GROUP BY year
      ORDER BY year DESC
    `);
    const byYear = yearStmt.all(penNameId);

    // Get breakdown by status
    const statusStmt = db.prepare<[string], any>(`
      SELECT
        status,
        COUNT(*) as count
      FROM projects
      WHERE pen_name_id = ?
      GROUP BY status
      ORDER BY count DESC
    `);
    const byStatus = statusStmt.all(penNameId);

    // Get completed chapters count
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT COUNT(*) as completed_chapters
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      JOIN projects p ON b.project_id = p.id
      WHERE p.pen_name_id = ? AND c.status = 'completed'
    `);
    const chaptersCount = chaptersStmt.get(penNameId);

    res.json({
      pen_name_id: penNameId,
      pen_name: penName.pen_name,
      book_count: projectStats?.book_count || 0,
      project_count: projectStats?.project_count || 0,
      word_count: projectStats?.total_word_count || 0,
      series_count: seriesCount?.series_count || 0,
      completed_chapters: chaptersCount?.completed_chapters || 0,
      by_genre: byGenre.map((g) => ({
        genre: g.genre,
        count: g.count,
        word_count: g.word_count || 0,
      })),
      by_year: byYear.map((y) => ({
        year: y.year,
        count: y.count,
        word_count: y.word_count || 0,
      })),
      by_status: byStatus.map((s) => ({
        status: s.status,
        count: s.count,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching stats for pen name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
