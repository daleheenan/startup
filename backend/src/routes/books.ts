import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Book } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';
import { cache } from '../services/cache.service.js';
import { createBookSchema, updateBookSchema, validateRequest } from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:books');

/**
 * GET /api/books/project/:projectId
 * Get all books for a project
 */
router.get('/project/:projectId', (req, res) => {
  try {
    const stmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE project_id = ? ORDER BY book_number ASC
    `);

    const books = stmt.all(req.params.projectId);

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
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);

    const book = stmt.get(req.params.id);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

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
    const bookStmt = db.prepare<[string], Book>(`SELECT project_id FROM books WHERE id = ?`);
    const book = bookStmt.get(req.params.id);
    if (book) {
      cache.invalidate(`series-bible:${book.project_id}`);
    }

    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error updating book');
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
