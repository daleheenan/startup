import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Chapter } from '../../shared/types/index.js';
import { chapterOrchestratorService } from '../services/chapter-orchestrator.service.js';

const router = Router();

/**
 * GET /api/chapters/book/:bookId
 * Get all chapters for a book
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_number ASC
    `);

    const rows = stmt.all(req.params.bookId);

    const chapters = rows.map((row) => ({
      ...row,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
      flags: row.flags ? JSON.parse(row.flags) : [],
    }));

    res.json({ chapters });
  } catch (error: any) {
    console.error('[API] Error fetching chapters:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/chapters/:id
 * Get a specific chapter
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM chapters WHERE id = ?
    `);

    const row = stmt.get(req.params.id);

    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Chapter not found' },
      });
    }

    const chapter = {
      ...row,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
      flags: row.flags ? JSON.parse(row.flags) : [],
    };

    res.json(chapter);
  } catch (error: any) {
    console.error('[API] Error fetching chapter:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/chapters
 * Create a new chapter
 */
router.post('/', (req, res) => {
  try {
    const { bookId, chapterNumber, title, sceneCards } = req.body;

    if (!bookId || !chapterNumber) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
      });
    }

    const chapterId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO chapters (id, book_id, chapter_number, title, scene_cards, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chapterId,
      bookId,
      chapterNumber,
      title || null,
      sceneCards ? JSON.stringify(sceneCards) : null,
      'pending',
      0,
      now,
      now
    );

    res.status(201).json({
      id: chapterId,
      book_id: bookId,
      chapter_number: chapterNumber,
      title: title || null,
      scene_cards: sceneCards || [],
      content: null,
      summary: null,
      status: 'pending',
      word_count: 0,
      flags: [],
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    console.error('[API] Error creating chapter:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/chapters/:id
 * Update a chapter
 */
router.put('/:id', (req, res) => {
  try {
    const { title, sceneCards, content, summary, status, flags } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (sceneCards !== undefined) {
      updates.push('scene_cards = ?');
      params.push(JSON.stringify(sceneCards));
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);

      // Update word count if content is provided
      if (content) {
        const wordCount = content.split(/\s+/).length;
        updates.push('word_count = ?');
        params.push(wordCount);
      }
    }

    if (summary !== undefined) {
      updates.push('summary = ?');
      params.push(summary);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (flags !== undefined) {
      updates.push('flags = ?');
      params.push(JSON.stringify(flags));
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(req.params.id);

    const stmt = db.prepare(`
      UPDATE chapters SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Chapter not found' },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error updating chapter:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/chapters/:id
 * Delete a chapter
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM chapters WHERE id = ?
    `);

    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Chapter not found' },
      });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[API] Error deleting chapter:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/chapters/:id/regenerate
 * Regenerate a specific chapter
 */
router.post('/:id/regenerate', (req, res) => {
  try {
    const jobIds = chapterOrchestratorService.regenerateChapter(req.params.id);

    res.json({
      success: true,
      message: 'Chapter queued for regeneration',
      jobs: jobIds,
    });
  } catch (error: any) {
    console.error('[API] Error regenerating chapter:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/chapters/:id/workflow-status
 * Get workflow status for a chapter
 */
router.get('/:id/workflow-status', (req, res) => {
  try {
    const status = chapterOrchestratorService.getChapterWorkflowStatus(req.params.id);

    res.json(status);
  } catch (error: any) {
    console.error('[API] Error fetching workflow status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
