import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Book } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';
import { cache } from '../services/cache.service.js';
import { createBookSchema, updateBookSchema, validateRequest } from '../utils/schemas.js';
import { bookCloningService } from '../services/book-cloning.service.js';
import { bookVersioningService } from '../services/book-versioning.service.js';

const router = Router();
const logger = createLogger('routes:books');

/**
 * GET /api/books/project/:projectId
 * Get all books for a project
 *
 * Note: word_count is calculated from the active version's completed chapters.
 * If no versions exist, falls back to all chapters (legacy behaviour).
 */
router.get('/project/:projectId', (req, res) => {
  try {
    // Fetch books with calculated word count from the version with the most chapters
    // This ensures we show the correct word count even when the active version is empty
    // (e.g., during a rewrite where version 2 is active but has no chapters yet)
    const stmt = db.prepare<[string], Book & { calculated_word_count: number }>(`
      SELECT
        b.*,
        COALESCE((
          SELECT SUM(c.word_count)
          FROM chapters c
          WHERE c.book_id = b.id
            AND c.status = 'completed'
            AND (
              -- Find the version with the most chapters and use that
              c.version_id = (
                SELECT bv.id
                FROM book_versions bv
                LEFT JOIN chapters ch ON ch.version_id = bv.id AND ch.status = 'completed'
                WHERE bv.book_id = b.id
                GROUP BY bv.id
                ORDER BY COUNT(ch.id) DESC, COALESCE(SUM(ch.word_count), 0) DESC
                LIMIT 1
              )
              OR
              -- If no versions exist, count all chapters with null version_id
              (c.version_id IS NULL AND NOT EXISTS (SELECT 1 FROM book_versions WHERE book_id = b.id))
            )
        ), 0) as calculated_word_count
      FROM books b
      WHERE b.project_id = ?
      ORDER BY b.book_number ASC
    `);

    const booksRaw = stmt.all(req.params.projectId);

    // Use calculated word count (from version with most chapters) as the authoritative count
    const books = booksRaw.map(book => ({
      ...book,
      word_count: book.calculated_word_count || 0,
    }));

    res.json({ books });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, projectId: req.params.projectId }, 'Error fetching books');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id
 * Get a specific book
 *
 * Note: word_count is calculated from the active version's completed chapters.
 * If no versions exist, falls back to all chapters (legacy behaviour).
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Book & { calculated_word_count: number }>(`
      SELECT
        b.*,
        COALESCE((
          SELECT SUM(c.word_count)
          FROM chapters c
          WHERE c.book_id = b.id
            AND c.status = 'completed'
            AND (
              -- Find the version with the most chapters and use that
              c.version_id = (
                SELECT bv.id
                FROM book_versions bv
                LEFT JOIN chapters ch ON ch.version_id = bv.id AND ch.status = 'completed'
                WHERE bv.book_id = b.id
                GROUP BY bv.id
                ORDER BY COUNT(ch.id) DESC, COALESCE(SUM(ch.word_count), 0) DESC
                LIMIT 1
              )
              OR
              -- If no versions exist, count all chapters with null version_id
              (c.version_id IS NULL AND NOT EXISTS (SELECT 1 FROM book_versions WHERE book_id = b.id))
            )
        ), 0) as calculated_word_count
      FROM books b
      WHERE b.id = ?
    `);

    const bookRaw = stmt.get(req.params.id);

    if (!bookRaw) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    // Use calculated word count (from version with most chapters) as the authoritative count
    const book = {
      ...bookRaw,
      word_count: bookRaw.calculated_word_count || 0,
    };

    res.json(book);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error fetching book');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * POST /api/books
 * Create a new book
 */
router.post('/', (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(createBookSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { projectId, title, bookNumber } = validation.data;

    const bookId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(bookId, projectId, bookNumber, title, 'setup', 0, now, now);

    res.status(201).json({
      id: bookId,
      project_id: projectId,
      book_number: bookNumber,
      title,
      status: 'setup',
      word_count: 0,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, projectId: req.body?.projectId, title: req.body?.title }, 'Error creating book');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * PUT /api/books/:id
 * Update a book
 */
router.put('/:id', (req, res) => {
  try {
    // Validate request body
    const validation = validateRequest(updateBookSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { title, status, wordCount } = validation.data;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (title) {
      updates.push('title = ?');
      params.push(title);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (wordCount !== undefined) {
      updates.push('word_count = ?');
      params.push(wordCount);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(req.params.id);

    const stmt = db.prepare(`
      UPDATE books SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    // Invalidate series bible cache when book is updated
    // Get book's project_id to invalidate the right cache
    const bookStmt = db.prepare<[string], Book & { book_number: number }>(`SELECT project_id, book_number FROM books WHERE id = ?`);
    const book = bookStmt.get(req.params.id);
    if (book) {
      cache.invalidate(`series-bible:${book.project_id}`);

      // Sync project title with book title for standalone projects
      // When first book's title changes, update the project title to match
      if (title && book.book_number === 1) {
        try {
          const projectStmt = db.prepare<[string], { type: string }>(`
            SELECT type FROM projects WHERE id = ?
          `);
          const project = projectStmt.get(book.project_id);

          if (project && project.type === 'standalone') {
            const updateProjectStmt = db.prepare(`
              UPDATE projects SET title = ?, updated_at = ?
              WHERE id = ?
            `);
            updateProjectStmt.run(title, new Date().toISOString(), book.project_id);
            logger.debug({ projectId: book.project_id, title }, 'Synced project title with book title');
          }
        } catch (syncError: any) {
          // Log but don't fail - title sync is secondary
          logger.warn({ error: syncError.message, bookId: req.params.id }, 'Failed to sync project title with book title');
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error updating book');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * POST /api/books/:id/clone
 * Clone a book within its project
 * Copies: concept, characters, world, story DNA
 * Does NOT copy: plot, outline, chapters
 */
router.post('/:id/clone', async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, reason } = req.body;

    logger.info({ bookId, title, reason }, 'Cloning book');

    const result = await bookCloningService.cloneBook(bookId, { title, reason });

    res.status(201).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error cloning book');

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: errorMessage },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id/clone-history
 * Get clone history for a book (as source and as clone)
 */
router.get('/:id/clone-history', async (req, res) => {
  try {
    const history = await bookCloningService.getCloneHistory(req.params.id);
    res.json(history);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error fetching clone history');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

// ============================================
// VERSIONING ENDPOINTS
// ============================================

/**
 * GET /api/books/:id/versions
 * Get all versions for a book
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await bookVersioningService.getVersions(req.params.id);
    res.json({ versions });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error fetching versions');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * POST /api/books/:id/versions
 * Create a new version for a book
 */
router.post('/:id/versions', async (req, res) => {
  try {
    const { name, autoCreated } = req.body;
    const version = await bookVersioningService.createVersion(req.params.id, { name, autoCreated });
    res.status(201).json(version);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error creating version');

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: errorMessage },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id/versions/active
 * Get the active version for a book
 */
router.get('/:id/versions/active', async (req, res) => {
  try {
    const version = await bookVersioningService.getActiveVersion(req.params.id);
    if (!version) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No active version found' },
      });
    }
    res.json(version);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error fetching active version');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * PUT /api/books/:id/versions/:versionId
 * Update version details (name, notes)
 */
router.put('/:id/versions/:versionId', async (req, res) => {
  try {
    const { name, notes } = req.body;
    const version = await bookVersioningService.updateVersion(
      req.params.id,
      req.params.versionId,
      { name, notes }
    );
    res.json(version);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id, versionId: req.params.versionId }, 'Error updating version');

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: errorMessage },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * PUT /api/books/:id/versions/:versionId/activate
 * Switch to a different version (make it active)
 */
router.put('/:id/versions/:versionId/activate', async (req, res) => {
  try {
    await bookVersioningService.activateVersion(req.params.id, req.params.versionId);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id, versionId: req.params.versionId }, 'Error activating version');

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: errorMessage },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id/versions/:versionId/chapters
 * Get chapters for a specific version
 */
router.get('/:id/versions/:versionId/chapters', async (req, res) => {
  try {
    const chapters = await bookVersioningService.getChaptersForVersion(req.params.versionId);
    res.json({ chapters });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, versionId: req.params.versionId }, 'Error fetching chapters for version');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * DELETE /api/books/:id/versions/:versionId
 * Delete a version and its chapters
 */
router.delete('/:id/versions/:versionId', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    await bookVersioningService.deleteVersion(req.params.id, req.params.versionId, force);
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id, versionId: req.params.versionId }, 'Error deleting version');

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: errorMessage },
      });
    }

    if (errorMessage.includes('Cannot delete')) {
      return res.status(400).json({
        error: { code: 'INVALID_OPERATION', message: errorMessage },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id/versioning-status
 * Check if versioning is needed before generation
 */
router.get('/:id/versioning-status', async (req, res) => {
  try {
    const status = await bookVersioningService.requiresVersioning(req.params.id);
    res.json(status);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error checking versioning status');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * POST /api/books/:id/migrate-chapters
 * Migrate existing chapters to version 1 (for legacy data)
 */
router.post('/:id/migrate-chapters', async (req, res) => {
  try {
    const version = await bookVersioningService.migrateExistingChapters(req.params.id);
    if (!version) {
      return res.json({ migrated: false, message: 'No legacy chapters to migrate' });
    }
    res.json({ migrated: true, version });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error migrating chapters');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * DELETE /api/books/:id
 * Delete a book
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM books WHERE id = ?
    `);

    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error deleting book');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

export default router;
