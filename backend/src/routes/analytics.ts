import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { bookVersioningService } from '../services/book-versioning.service.js';
import type { ChapterAnalytics, BookAnalytics, GenreBenchmark } from '../shared/types/index.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:analytics');

/**
 * GET /api/analytics/overview
 * Returns aggregate statistics for the dashboard
 */
router.get('/overview', (req, res) => {
  try {
    // Check if pen_names table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='pen_names'
    `).get() as { name: string } | undefined;

    const hasPenNames = !!tableCheck;

    // Check if publication_status column exists in books table
    const columnCheck = db.prepare(`
      PRAGMA table_info(books)
    `).all() as Array<{ name: string }>;

    const hasPublicationStatus = columnCheck.some(col => col.name === 'publication_status');

    // Build query based on available schema
    let query = `
      SELECT
        (SELECT COUNT(*) FROM books) as total_books,
        (SELECT COALESCE(SUM(word_count), 0) FROM books) as total_words,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM series) as total_series
    `;

    if (hasPenNames) {
      query += `, (SELECT COUNT(*) FROM pen_names WHERE deleted_at IS NULL) as total_pen_names`;
    } else {
      query += `, 0 as total_pen_names`;
    }

    if (hasPublicationStatus) {
      query += `, (SELECT COUNT(*) FROM books WHERE publication_status = 'published') as published_books`;
    } else {
      query += `, 0 as published_books`;
    }

    const stats = db.prepare(query).get() as {
      total_books: number;
      total_words: number;
      total_projects: number;
      total_series: number;
      total_pen_names: number;
      published_books: number;
    };

    res.json(stats);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching overview statistics');
    sendInternalError(res, error, 'fetching overview statistics');
  }
});

/**
 * GET /api/analytics/by-pen-name
 * Returns book counts and word counts per pen name
 */
router.get('/by-pen-name', (req, res) => {
  try {
    // Check if pen_names table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='pen_names'
    `).get() as { name: string } | undefined;

    if (!tableCheck) {
      // Return empty data if table doesn't exist
      return res.json({ data: [] });
    }

    const data = db.prepare(`
      SELECT
        pn.id as pen_name_id,
        pn.pen_name,
        COUNT(b.id) as book_count,
        COALESCE(SUM(b.word_count), 0) as word_count
      FROM pen_names pn
      LEFT JOIN books b ON b.pen_name_id = pn.id
      WHERE pn.deleted_at IS NULL
      GROUP BY pn.id, pn.pen_name
      ORDER BY book_count DESC, word_count DESC
    `).all() as Array<{
      pen_name_id: string;
      pen_name: string;
      book_count: number;
      word_count: number;
    }>;

    res.json({ data });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching pen name analytics');
    sendInternalError(res, error, 'fetching pen name analytics');
  }
});

/**
 * GET /api/analytics/by-genre
 * Returns book counts per genre from projects table
 */
router.get('/by-genre', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT
        p.genre,
        COUNT(b.id) as book_count
      FROM projects p
      LEFT JOIN books b ON b.project_id = p.id
      WHERE p.genre IS NOT NULL
      GROUP BY p.genre
      ORDER BY book_count DESC
    `).all() as Array<{
      genre: string;
      book_count: number;
    }>;

    res.json({ data });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching genre analytics');
    sendInternalError(res, error, 'fetching genre analytics');
  }
});

/**
 * GET /api/analytics/by-status
 * Returns book counts per publication status
 */
router.get('/by-status', (req, res) => {
  try {
    // Check if publication_status column exists
    const columnCheck = db.prepare(`
      PRAGMA table_info(books)
    `).all() as Array<{ name: string }>;

    const hasPublicationStatus = columnCheck.some(col => col.name === 'publication_status');

    let data: Array<{ status: string; count: number }>;

    if (hasPublicationStatus) {
      data = db.prepare(`
        SELECT
          COALESCE(publication_status, 'draft') as status,
          COUNT(*) as count
        FROM books
        GROUP BY status
        ORDER BY count DESC
      `).all() as Array<{
        status: string;
        count: number;
      }>;
    } else {
      // Use book status as fallback
      data = db.prepare(`
        SELECT
          status,
          COUNT(*) as count
        FROM books
        GROUP BY status
        ORDER BY count DESC
      `).all() as Array<{
        status: string;
        count: number;
      }>;
    }

    res.json({ data });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching status analytics');
    sendInternalError(res, error, 'fetching status analytics');
  }
});

/**
 * GET /api/analytics/by-year
 * Returns words written and books created per year (based on created_at)
 */
router.get('/by-year', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT
        CAST(strftime('%Y', created_at) AS INTEGER) as year,
        COUNT(*) as book_count,
        COALESCE(SUM(word_count), 0) as word_count
      FROM books
      WHERE created_at IS NOT NULL
      GROUP BY year
      ORDER BY year DESC
    `).all() as Array<{
      year: number;
      book_count: number;
      word_count: number;
    }>;

    res.json({ data });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching yearly analytics');
    sendInternalError(res, error, 'fetching yearly analytics');
  }
});

function parseAnalyticsRow(analytics: any): any {
  if (analytics.pacing_data) analytics.pacing_data = JSON.parse(analytics.pacing_data);
  if (analytics.character_screen_time) analytics.character_screen_time = JSON.parse(analytics.character_screen_time);
  if (analytics.tension_arc) analytics.tension_arc = JSON.parse(analytics.tension_arc);
  if (analytics.character_balance) analytics.character_balance = JSON.parse(analytics.character_balance);
  if (analytics.overall_tension_arc) analytics.overall_tension_arc = JSON.parse(analytics.overall_tension_arc);
  if (analytics.genre_comparison) analytics.genre_comparison = JSON.parse(analytics.genre_comparison);
  return analytics;
}

function upsertChapterAnalytics(chapterId: string, analytics: any): void {
  const existing = db.prepare('SELECT id FROM chapter_analytics WHERE chapter_id = ?').get(chapterId);

  if (existing) {
    db.prepare(`
      UPDATE chapter_analytics
      SET pacing_score = ?, pacing_data = ?, character_screen_time = ?,
          dialogue_percentage = ?, dialogue_word_count = ?, narrative_word_count = ?,
          readability_score = ?, avg_sentence_length = ?, complex_word_percentage = ?,
          tension_score = ?, tension_arc = ?, updated_at = datetime('now')
      WHERE chapter_id = ?
    `).run(
      analytics.pacing_score,
      JSON.stringify(analytics.pacing_data),
      JSON.stringify(analytics.character_screen_time),
      analytics.dialogue_percentage,
      analytics.dialogue_word_count,
      analytics.narrative_word_count,
      analytics.readability_score,
      analytics.avg_sentence_length,
      analytics.complex_word_percentage,
      analytics.tension_score,
      JSON.stringify(analytics.tension_arc),
      chapterId
    );
  } else {
    db.prepare(`
      INSERT INTO chapter_analytics (
        id, chapter_id, pacing_score, pacing_data, character_screen_time,
        dialogue_percentage, dialogue_word_count, narrative_word_count,
        readability_score, avg_sentence_length, complex_word_percentage,
        tension_score, tension_arc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), chapterId,
      analytics.pacing_score, JSON.stringify(analytics.pacing_data),
      JSON.stringify(analytics.character_screen_time),
      analytics.dialogue_percentage, analytics.dialogue_word_count, analytics.narrative_word_count,
      analytics.readability_score, analytics.avg_sentence_length, analytics.complex_word_percentage,
      analytics.tension_score, JSON.stringify(analytics.tension_arc)
    );
  }
}

/**
 * Analyze a chapter and store analytics
 */
router.post('/chapter/:chapterId/analyze', async (req, res) => {
  try {
    const { chapterId } = req.params;

    const chapter = db.prepare(`
      SELECT id, content, scene_cards FROM chapters WHERE id = ?
    `).get(chapterId) as any;

    if (!chapter) {
      return sendNotFound(res, 'Chapter');
    }

    if (!chapter.content) {
      return sendBadRequest(res, 'Chapter has no content to analyze');
    }

    const sceneCards = chapter.scene_cards ? JSON.parse(chapter.scene_cards) : [];
    const analytics = await AnalyticsService.analyzeChapter(chapterId, chapter.content, sceneCards);

    upsertChapterAnalytics(chapterId, analytics);

    const savedAnalytics = db.prepare('SELECT * FROM chapter_analytics WHERE chapter_id = ?').get(chapterId) as any;

    res.json({ analytics: parseAnalyticsRow(savedAnalytics) });
  } catch (error: any) {
    sendInternalError(res, error, 'analyzing chapter');
  }
});

/**
 * Get analytics for a specific chapter
 */
router.get('/chapter/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;
    const analytics = db.prepare('SELECT * FROM chapter_analytics WHERE chapter_id = ?').get(chapterId) as any;

    if (!analytics) {
      return sendNotFound(res, 'Analytics');
    }

    res.json({ analytics: parseAnalyticsRow(analytics) });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching chapter analytics');
  }
});

/**
 * Analyze all chapters in a book and calculate book-level analytics
 * Uses active version's chapters only
 */
router.post('/book/:bookId/analyze', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Get active version for this book
    const activeVersion = await bookVersioningService.getActiveVersion(bookId);

    let chapters: any[];
    if (activeVersion) {
      chapters = db.prepare(`
        SELECT id, content, scene_cards FROM chapters WHERE version_id = ? ORDER BY chapter_number
      `).all(activeVersion.id) as any[];
    } else {
      // Legacy: no versions exist
      chapters = db.prepare(`
        SELECT id, content, scene_cards FROM chapters WHERE book_id = ? AND version_id IS NULL ORDER BY chapter_number
      `).all(bookId) as any[];
    }

    if (chapters.length === 0) {
      return sendBadRequest(res, 'No chapters found for this book');
    }

    const chapterAnalytics: ChapterAnalytics[] = [];

    for (const chapter of chapters) {
      if (!chapter.content) continue;

      const sceneCards = chapter.scene_cards ? JSON.parse(chapter.scene_cards) : [];
      const analytics = await AnalyticsService.analyzeChapter(chapter.id, chapter.content, sceneCards);

      upsertChapterAnalytics(chapter.id, analytics);
      chapterAnalytics.push(analytics as ChapterAnalytics);
    }

    const book = db.prepare(`
      SELECT b.id, p.genre FROM books b
      JOIN projects p ON b.project_id = p.id WHERE b.id = ?
    `).get(bookId) as any;

    const bookAnalytics = AnalyticsService.calculateBookAnalytics(chapterAnalytics, book.genre || 'general');
    const benchmark = db.prepare('SELECT * FROM genre_benchmarks WHERE genre = ?').get(book.genre || 'general') as any;

    if (bookAnalytics && benchmark) {
      bookAnalytics.genre_comparison = {
        genre: book.genre,
        pacing_vs_norm: bookAnalytics.avg_pacing_score - benchmark.typical_pacing_score,
        dialogue_vs_norm: bookAnalytics.avg_dialogue_percentage - benchmark.typical_dialogue_percentage,
        readability_vs_norm: bookAnalytics.avg_readability_score - benchmark.typical_readability_score,
      };
    }

    const existingBook = db.prepare('SELECT id FROM book_analytics WHERE book_id = ?').get(bookId);

    if (existingBook) {
      db.prepare(`
        UPDATE book_analytics
        SET avg_pacing_score = ?, pacing_consistency = ?, character_balance = ?,
            avg_dialogue_percentage = ?, avg_readability_score = ?,
            overall_tension_arc = ?, genre_comparison = ?, updated_at = datetime('now')
        WHERE book_id = ?
      `).run(
        bookAnalytics.avg_pacing_score, bookAnalytics.pacing_consistency,
        JSON.stringify(bookAnalytics.character_balance),
        bookAnalytics.avg_dialogue_percentage, bookAnalytics.avg_readability_score,
        JSON.stringify(bookAnalytics.overall_tension_arc),
        JSON.stringify(bookAnalytics.genre_comparison), bookId
      );
    } else {
      db.prepare(`
        INSERT INTO book_analytics (
          id, book_id, avg_pacing_score, pacing_consistency, character_balance,
          avg_dialogue_percentage, avg_readability_score, overall_tension_arc, genre_comparison
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(), bookId, bookAnalytics.avg_pacing_score, bookAnalytics.pacing_consistency,
        JSON.stringify(bookAnalytics.character_balance),
        bookAnalytics.avg_dialogue_percentage, bookAnalytics.avg_readability_score,
        JSON.stringify(bookAnalytics.overall_tension_arc),
        JSON.stringify(bookAnalytics.genre_comparison)
      );
    }

    const savedBookAnalytics = db.prepare('SELECT * FROM book_analytics WHERE book_id = ?').get(bookId) as any;

    res.json({ analytics: parseAnalyticsRow(savedBookAnalytics) });
  } catch (error: any) {
    sendInternalError(res, error, 'analyzing book');
  }
});

/**
 * Get analytics for a specific book
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const analytics = db.prepare('SELECT * FROM book_analytics WHERE book_id = ?').get(req.params.bookId) as any;

    if (!analytics) {
      return sendNotFound(res, 'Book analytics');
    }

    // Also get completion status to indicate if this is from auto-analysis
    const completion = db.prepare('SELECT * FROM book_completion WHERE book_id = ?').get(req.params.bookId) as any;

    res.json({
      analytics: parseAnalyticsRow(analytics),
      completion: completion ? {
        completedAt: completion.completed_at,
        analyticsStatus: completion.analytics_status,
        analyticsCompletedAt: completion.analytics_completed_at,
      } : null,
    });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching book analytics');
  }
});

/**
 * Get all chapter analytics for a book
 * Supports optional versionId query param to filter by version
 */
router.get('/book/:bookId/chapters', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { versionId } = req.query;

    let chaptersAnalytics: any[];

    if (versionId) {
      // Filter by specific version
      chaptersAnalytics = db.prepare(`
        SELECT ca.* FROM chapter_analytics ca
        JOIN chapters c ON ca.chapter_id = c.id
        WHERE c.book_id = ? AND c.version_id = ? ORDER BY c.chapter_number
      `).all(bookId, versionId) as any[];
    } else {
      // Get active version chapters
      const activeVersion = await bookVersioningService.getActiveVersion(bookId);
      if (activeVersion) {
        chaptersAnalytics = db.prepare(`
          SELECT ca.* FROM chapter_analytics ca
          JOIN chapters c ON ca.chapter_id = c.id
          WHERE c.version_id = ? ORDER BY c.chapter_number
        `).all(activeVersion.id) as any[];
      } else {
        // Legacy: no versions exist
        chaptersAnalytics = db.prepare(`
          SELECT ca.* FROM chapter_analytics ca
          JOIN chapters c ON ca.chapter_id = c.id
          WHERE c.book_id = ? AND c.version_id IS NULL ORDER BY c.chapter_number
        `).all(bookId) as any[];
      }
    }

    res.json({ analytics: chaptersAnalytics.map(parseAnalyticsRow) });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching book chapter analytics');
  }
});

/**
 * Get genre benchmarks
 */
router.get('/benchmarks', (req, res) => {
  try {
    const { genre } = req.query;
    const query = genre ? 'SELECT * FROM genre_benchmarks WHERE genre = ?' : 'SELECT * FROM genre_benchmarks';
    const params = genre ? [genre] : [];

    const benchmarks = db.prepare(query).all(...params) as any[];

    benchmarks.forEach(b => {
      if (b.typical_tension_pattern) b.typical_tension_pattern = JSON.parse(b.typical_tension_pattern);
      if (b.typical_pov_structure) b.typical_pov_structure = JSON.parse(b.typical_pov_structure);
    });

    res.json({ benchmarks });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching benchmarks');
  }
});

export default router;
