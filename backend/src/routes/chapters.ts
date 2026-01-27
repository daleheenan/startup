import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Chapter } from '../shared/types/index.js';
import { chapterOrchestratorService } from '../services/chapter-orchestrator.service.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { cache } from '../services/cache.service.js';
import {
  createChapterSchema,
  updateChapterSchema,
  validateRequest,
  type CreateChapterInput,
  type UpdateChapterInput,
} from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:chapters');

function safeJsonParse(jsonString: string | null | undefined, fallback: any = []): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, jsonString }, 'JSON parse error');
    return fallback;
  }
}

function parseChapterRow(row: any) {
  return {
    ...row,
    scene_cards: safeJsonParse(row.scene_cards, []),
    flags: safeJsonParse(row.flags, []),
  };
}

/**
 * GET /api/chapters/book/:bookId
 * Get all chapters for a book
 * Query params:
 * - versionId: Specific version to fetch (optional, defaults to active version)
 * - allVersions: Set to 'true' to get all chapters regardless of version (legacy behavior)
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const bookId = req.params.bookId;
    const versionId = req.query.versionId as string | undefined;
    const allVersions = req.query.allVersions === 'true';

    let rows: any[];

    if (allVersions) {
      // Legacy behavior - get all chapters regardless of version
      const stmt = db.prepare<[string], any>(`
        SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_number ASC
      `);
      rows = stmt.all(bookId);
    } else if (versionId) {
      // Get chapters for specific version
      const stmt = db.prepare<[string, string], any>(`
        SELECT * FROM chapters WHERE book_id = ? AND version_id = ? ORDER BY chapter_number ASC
      `);
      rows = stmt.all(bookId, versionId);
    } else {
      // Get chapters for active version (or legacy chapters without version)
      const stmt = db.prepare<[string], any>(`
        SELECT c.* FROM chapters c
        LEFT JOIN book_versions bv ON c.version_id = bv.id
        WHERE c.book_id = ?
          AND (
            c.version_id IS NULL
            OR bv.is_active = 1
          )
        ORDER BY c.chapter_number ASC
      `);
      rows = stmt.all(bookId);
    }

    const chapters = rows.map(parseChapterRow);
    res.json({ chapters });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching chapters');
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
      return sendNotFound(res, 'Chapter');
    }

    res.json(parseChapterRow(row));
  } catch (error: any) {
    sendInternalError(res, error, 'fetching chapter');
  }
});

/**
 * POST /api/chapters
 * Create a new chapter
 */
router.post('/', (req, res) => {
  try {
    const validation = validateRequest(createChapterSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { bookId, chapterNumber, title, sceneCards } = validation.data;

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
    sendInternalError(res, error, 'creating chapter');
  }
});

/**
 * PUT /api/chapters/:id
 * Update a chapter
 */
router.put('/:id', (req, res) => {
  try {
    const validation = validateRequest(updateChapterSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { title, sceneCards, content, summary, status, flags } = validation.data;

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

      // Calculate word count - handle empty/whitespace-only content correctly
      const wordCount = content
        ? content.split(/\s+/).filter((w: string) => w.length > 0).length
        : 0;
      updates.push('word_count = ?');
      params.push(wordCount);
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
      return sendNotFound(res, 'Chapter');
    }

    // Invalidate series bible cache when chapter is updated
    // Get chapter's project_id via book to invalidate the right cache
    const chapterStmt = db.prepare<[string], any>(`
      SELECT b.project_id FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);
    const chapter = chapterStmt.get(req.params.id);
    if (chapter) {
      cache.invalidate(`series-bible:${chapter.project_id}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    sendInternalError(res, error, 'updating chapter');
  }
});

/**
 * DELETE /api/chapters/:id
 * Delete a chapter
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`DELETE FROM chapters WHERE id = ?`);
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return sendNotFound(res, 'Chapter');
    }

    res.status(204).send();
  } catch (error: any) {
    sendInternalError(res, error, 'deleting chapter');
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
    sendInternalError(res, error, 'regenerating chapter');
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
    sendInternalError(res, error, 'fetching workflow status');
  }
});

export default router;
