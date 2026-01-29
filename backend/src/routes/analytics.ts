import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { bookVersioningService } from '../services/book-versioning.service.js';
import type { ChapterAnalytics, BookAnalytics, GenreBenchmark } from '../shared/types/index.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';

const router = express.Router();

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
 */
router.get('/book/:bookId/chapters', (req, res) => {
  try {
    const chaptersAnalytics = db.prepare(`
      SELECT ca.* FROM chapter_analytics ca
      JOIN chapters c ON ca.chapter_id = c.id
      WHERE c.book_id = ? ORDER BY c.chapter_number
    `).all(req.params.bookId) as any[];

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
