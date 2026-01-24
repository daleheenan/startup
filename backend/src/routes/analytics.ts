import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { AnalyticsService } from '../services/analyticsService.js';
import type { ChapterAnalytics, BookAnalytics, GenreBenchmark } from '../shared/types/index.js';

const router = express.Router();

/**
 * Analyze a chapter and store analytics
 */
router.post('/chapter/:chapterId/analyze', async (req, res) => {
  try {
    const { chapterId } = req.params;

    // Get chapter data
    const chapter = db.prepare(`
      SELECT id, content, scene_cards
      FROM chapters
      WHERE id = ?
    `).get(chapterId) as any;

    if (!chapter) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Chapter not found' } });
    }

    if (!chapter.content) {
      return res.status(400).json({ error: { code: 'NO_CONTENT', message: 'Chapter has no content to analyze' } });
    }

    const sceneCards = chapter.scene_cards ? JSON.parse(chapter.scene_cards) : [];

    // Analyze the chapter
    const analytics = await AnalyticsService.analyzeChapter(chapterId, chapter.content, sceneCards);

    const id = randomUUID();

    // Check if analytics already exist
    const existing = db.prepare('SELECT id FROM chapter_analytics WHERE chapter_id = ?').get(chapterId) as any;

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE chapter_analytics
        SET pacing_score = ?,
            pacing_data = ?,
            character_screen_time = ?,
            dialogue_percentage = ?,
            dialogue_word_count = ?,
            narrative_word_count = ?,
            readability_score = ?,
            avg_sentence_length = ?,
            complex_word_percentage = ?,
            tension_score = ?,
            tension_arc = ?,
            updated_at = datetime('now')
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
      // Insert new
      db.prepare(`
        INSERT INTO chapter_analytics (
          id, chapter_id,
          pacing_score, pacing_data,
          character_screen_time,
          dialogue_percentage, dialogue_word_count, narrative_word_count,
          readability_score, avg_sentence_length, complex_word_percentage,
          tension_score, tension_arc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        chapterId,
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
        JSON.stringify(analytics.tension_arc)
      );
    }

    const savedAnalytics = db.prepare('SELECT * FROM chapter_analytics WHERE chapter_id = ?').get(chapterId) as any;

    // Parse JSON fields
    if (savedAnalytics) {
      if (savedAnalytics.pacing_data) savedAnalytics.pacing_data = JSON.parse(savedAnalytics.pacing_data);
      if (savedAnalytics.character_screen_time) savedAnalytics.character_screen_time = JSON.parse(savedAnalytics.character_screen_time);
      if (savedAnalytics.tension_arc) savedAnalytics.tension_arc = JSON.parse(savedAnalytics.tension_arc);
    }

    res.json({ analytics: savedAnalytics });
  } catch (error: any) {
    console.error('[Analytics] Error analyzing chapter:', error);
    res.status(500).json({ error: { code: 'ANALYZE_ERROR', message: error.message } });
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
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analytics not found' } });
    }

    // Parse JSON fields
    if (analytics.pacing_data) analytics.pacing_data = JSON.parse(analytics.pacing_data);
    if (analytics.character_screen_time) analytics.character_screen_time = JSON.parse(analytics.character_screen_time);
    if (analytics.tension_arc) analytics.tension_arc = JSON.parse(analytics.tension_arc);

    res.json({ analytics });
  } catch (error: any) {
    console.error('[Analytics] Error fetching chapter analytics:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Analyze all chapters in a book and calculate book-level analytics
 */
router.post('/book/:bookId/analyze', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Get all chapters in the book
    const chapters = db.prepare(`
      SELECT id, content, scene_cards
      FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number
    `).all(bookId) as any[];

    if (chapters.length === 0) {
      return res.status(404).json({ error: { code: 'NO_CHAPTERS', message: 'No chapters found for this book' } });
    }

    // Analyze each chapter
    const chapterAnalytics: ChapterAnalytics[] = [];

    for (const chapter of chapters) {
      if (!chapter.content) continue;

      const sceneCards = chapter.scene_cards ? JSON.parse(chapter.scene_cards) : [];
      const analytics = await AnalyticsService.analyzeChapter(chapter.id, chapter.content, sceneCards);

      const id = randomUUID();

      // Check if analytics exist
      const existing = db.prepare('SELECT id FROM chapter_analytics WHERE chapter_id = ?').get(chapter.id) as any;

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
          chapter.id
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
          id, chapter.id,
          analytics.pacing_score, JSON.stringify(analytics.pacing_data),
          JSON.stringify(analytics.character_screen_time),
          analytics.dialogue_percentage, analytics.dialogue_word_count, analytics.narrative_word_count,
          analytics.readability_score, analytics.avg_sentence_length, analytics.complex_word_percentage,
          analytics.tension_score, JSON.stringify(analytics.tension_arc)
        );
      }

      chapterAnalytics.push(analytics as ChapterAnalytics);
    }

    // Get book genre
    const book = db.prepare(`
      SELECT b.id, p.genre
      FROM books b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = ?
    `).get(bookId) as any;

    // Calculate book-level analytics
    const bookAnalytics = AnalyticsService.calculateBookAnalytics(chapterAnalytics, book.genre || 'general');

    // Get genre benchmark
    const benchmark = db.prepare('SELECT * FROM genre_benchmarks WHERE genre = ?').get(book.genre || 'general') as any;

    if (bookAnalytics && benchmark) {
      bookAnalytics.genre_comparison = {
        genre: book.genre,
        pacing_vs_norm: bookAnalytics.avg_pacing_score - benchmark.typical_pacing_score,
        dialogue_vs_norm: bookAnalytics.avg_dialogue_percentage - benchmark.typical_dialogue_percentage,
        readability_vs_norm: bookAnalytics.avg_readability_score - benchmark.typical_readability_score,
      };
    }

    const bookAnalyticsId = randomUUID();

    // Check if book analytics exist
    const existingBook = db.prepare('SELECT id FROM book_analytics WHERE book_id = ?').get(bookId) as any;

    if (existingBook) {
      db.prepare(`
        UPDATE book_analytics
        SET avg_pacing_score = ?, pacing_consistency = ?,
            character_balance = ?, avg_dialogue_percentage = ?,
            avg_readability_score = ?, overall_tension_arc = ?,
            genre_comparison = ?, updated_at = datetime('now')
        WHERE book_id = ?
      `).run(
        bookAnalytics.avg_pacing_score,
        bookAnalytics.pacing_consistency,
        JSON.stringify(bookAnalytics.character_balance),
        bookAnalytics.avg_dialogue_percentage,
        bookAnalytics.avg_readability_score,
        JSON.stringify(bookAnalytics.overall_tension_arc),
        JSON.stringify(bookAnalytics.genre_comparison),
        bookId
      );
    } else {
      db.prepare(`
        INSERT INTO book_analytics (
          id, book_id, avg_pacing_score, pacing_consistency,
          character_balance, avg_dialogue_percentage, avg_readability_score,
          overall_tension_arc, genre_comparison
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookAnalyticsId, bookId,
        bookAnalytics.avg_pacing_score, bookAnalytics.pacing_consistency,
        JSON.stringify(bookAnalytics.character_balance),
        bookAnalytics.avg_dialogue_percentage, bookAnalytics.avg_readability_score,
        JSON.stringify(bookAnalytics.overall_tension_arc),
        JSON.stringify(bookAnalytics.genre_comparison)
      );
    }

    const savedBookAnalytics = db.prepare('SELECT * FROM book_analytics WHERE book_id = ?').get(bookId) as any;

    // Parse JSON fields
    if (savedBookAnalytics) {
      if (savedBookAnalytics.character_balance) savedBookAnalytics.character_balance = JSON.parse(savedBookAnalytics.character_balance);
      if (savedBookAnalytics.overall_tension_arc) savedBookAnalytics.overall_tension_arc = JSON.parse(savedBookAnalytics.overall_tension_arc);
      if (savedBookAnalytics.genre_comparison) savedBookAnalytics.genre_comparison = JSON.parse(savedBookAnalytics.genre_comparison);
    }

    res.json({ analytics: savedBookAnalytics });
  } catch (error: any) {
    console.error('[Analytics] Error analyzing book:', error);
    res.status(500).json({ error: { code: 'ANALYZE_ERROR', message: error.message } });
  }
});

/**
 * Get analytics for a specific book
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const { bookId } = req.params;

    const analytics = db.prepare('SELECT * FROM book_analytics WHERE book_id = ?').get(bookId) as any;

    if (!analytics) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Book analytics not found' } });
    }

    // Parse JSON fields
    if (analytics.character_balance) analytics.character_balance = JSON.parse(analytics.character_balance);
    if (analytics.overall_tension_arc) analytics.overall_tension_arc = JSON.parse(analytics.overall_tension_arc);
    if (analytics.genre_comparison) analytics.genre_comparison = JSON.parse(analytics.genre_comparison);

    res.json({ analytics });
  } catch (error: any) {
    console.error('[Analytics] Error fetching book analytics:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Get all chapter analytics for a book
 */
router.get('/book/:bookId/chapters', (req, res) => {
  try {
    const { bookId } = req.params;

    const chaptersAnalytics = db.prepare(`
      SELECT ca.*
      FROM chapter_analytics ca
      JOIN chapters c ON ca.chapter_id = c.id
      WHERE c.book_id = ?
      ORDER BY c.chapter_number
    `).all(bookId) as any[];

    // Parse JSON fields
    chaptersAnalytics.forEach(analytics => {
      if (analytics.pacing_data) analytics.pacing_data = JSON.parse(analytics.pacing_data);
      if (analytics.character_screen_time) analytics.character_screen_time = JSON.parse(analytics.character_screen_time);
      if (analytics.tension_arc) analytics.tension_arc = JSON.parse(analytics.tension_arc);
    });

    res.json({ analytics: chaptersAnalytics });
  } catch (error: any) {
    console.error('[Analytics] Error fetching book chapter analytics:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Get genre benchmarks
 */
router.get('/benchmarks', (req, res) => {
  try {
    const { genre } = req.query;

    let query = 'SELECT * FROM genre_benchmarks';
    const params: any[] = [];

    if (genre) {
      query += ' WHERE genre = ?';
      params.push(genre);
    }

    const benchmarks = db.prepare(query).all(...params) as any[];

    // Parse JSON fields
    benchmarks.forEach(benchmark => {
      if (benchmark.typical_tension_pattern) benchmark.typical_tension_pattern = JSON.parse(benchmark.typical_tension_pattern);
      if (benchmark.typical_pov_structure) benchmark.typical_pov_structure = JSON.parse(benchmark.typical_pov_structure);
    });

    res.json({ benchmarks });
  } catch (error: any) {
    console.error('[Analytics] Error fetching benchmarks:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

export default router;
