import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Book } from '../../../shared/types/index.js';

const router = Router();

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
  } catch (error: any) {
    console.error('[API] Error fetching books:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
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
  } catch (error: any) {
    console.error('[API] Error fetching book:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/books
 * Create a new book
 */
router.post('/', (req, res) => {
  try {
    const { projectId, title, bookNumber } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
      });
    }

    const bookId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(bookId, projectId, bookNumber || 1, title, 'setup', 0, now, now);

    res.status(201).json({
      id: bookId,
      project_id: projectId,
      book_number: bookNumber || 1,
      title,
      status: 'setup',
      word_count: 0,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    console.error('[API] Error creating book:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/books/:id
 * Update a book
 */
router.put('/:id', (req, res) => {
  try {
    const { title, status, wordCount } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

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

    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error updating book:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
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
  } catch (error: any) {
    console.error('[API] Error deleting book:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
