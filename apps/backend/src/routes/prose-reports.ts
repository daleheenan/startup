/**
 * Prose Reports Routes
 * Sprint 40: ProWritingAid-Style Reports
 *
 * Provides endpoints for prose quality analysis reports
 */
import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { createLogger } from '../services/logger.service.js';
import {
  ReadabilityService,
  SentenceVarietyService,
  PassiveVoiceService,
  AdverbsService
} from '../services/prose-reports/index.js';

const router = Router();
const logger = createLogger('routes:prose-reports');

/**
 * GET /api/prose-reports/:projectId/book/:bookId
 * Get all prose analysis reports for a book
 */
router.get('/:projectId/book/:bookId', async (req: Request, res: Response) => {
  try {
    const { projectId, bookId } = req.params;

    // Get all chapter content for the book
    const chapters = db.prepare(`
      SELECT id, title, content, chapter_number
      FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number
    `).all(bookId) as Array<{ id: string; title: string; content: string; chapter_number: number }>;

    if (chapters.length === 0) {
      return res.status(404).json({ error: 'No chapters found' });
    }

    // Combine all content for analysis
    const fullText = chapters.map(c => c.content || '').join('\n\n');

    // Run all analyses (these are static methods)
    const [readability, sentenceVariety, passiveVoice, adverbs] = await Promise.all([
      Promise.resolve(ReadabilityService.generateReport(fullText)),
      Promise.resolve(SentenceVarietyService.generateReport(fullText)),
      Promise.resolve(PassiveVoiceService.generateReport(fullText)),
      Promise.resolve(AdverbsService.generateReport(fullText))
    ]);

    res.json({
      projectId,
      bookId,
      chapterCount: chapters.length,
      reports: {
        readability,
        sentenceVariety,
        passiveVoice,
        adverbs
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating prose reports');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prose-reports/:projectId/chapter/:chapterId
 * Get prose analysis for a single chapter
 */
router.get('/:projectId/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { projectId, chapterId } = req.params;

    const chapter = db.prepare(`
      SELECT id, title, content, chapter_number
      FROM chapters
      WHERE id = ?
    `).get(chapterId) as { id: string; title: string; content: string; chapter_number: number } | undefined;

    if (!chapter || !chapter.content) {
      return res.status(404).json({ error: 'Chapter not found or has no content' });
    }

    // Run all analyses (these are static methods)
    const [readability, sentenceVariety, passiveVoice, adverbs] = await Promise.all([
      Promise.resolve(ReadabilityService.generateReport(chapter.content)),
      Promise.resolve(SentenceVarietyService.generateReport(chapter.content)),
      Promise.resolve(PassiveVoiceService.generateReport(chapter.content)),
      Promise.resolve(AdverbsService.generateReport(chapter.content))
    ]);

    res.json({
      projectId,
      chapterId,
      chapterTitle: chapter.title,
      chapterNumber: chapter.chapter_number,
      reports: {
        readability,
        sentenceVariety,
        passiveVoice,
        adverbs
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating chapter prose report');
    res.status(500).json({ error: error.message });
  }
});

export default router;
