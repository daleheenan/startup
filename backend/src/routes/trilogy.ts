import { Router } from 'express';
import db from '../db/connection.js';
import { crossBookContinuityService } from '../services/cross-book-continuity.service.js';
import { seriesBibleGeneratorService } from '../services/series-bible-generator.service.js';
import { bookTransitionService } from '../services/book-transition.service.js';
import { cache } from '../services/cache.service.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:trilogy');

// Cache TTL in seconds
const SERIES_BIBLE_CACHE_TTL = 300; // 5 minutes for series bible (expensive but changes with book updates)

/**
 * POST /api/trilogy/books/:bookId/ending-state
 * Generate ending state snapshot for a book
 */
router.post('/books/:bookId/ending-state', async (req, res) => {
  try {
    const { bookId } = req.params;

    const endingState = await crossBookContinuityService.generateBookEndingState(bookId);

    res.json(endingState);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating book ending state');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/trilogy/books/:bookId/summary
 * Generate comprehensive book summary
 */
router.post('/books/:bookId/summary', async (req, res) => {
  try {
    const { bookId } = req.params;

    const summary = await crossBookContinuityService.generateBookSummary(bookId);

    res.json({ summary });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating book summary');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/trilogy/books/:bookId/previous-state
 * Get ending state from previous book
 */
router.get('/books/:bookId/previous-state', (req, res) => {
  try {
    const { bookId } = req.params;

    // Get book to find project and book number
    const bookStmt = db.prepare<[string], any>(`
      SELECT project_id, book_number FROM books WHERE id = ?
    `);

    const book = bookStmt.get(bookId);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    const previousState = crossBookContinuityService.loadPreviousBookState(
      book.project_id,
      book.book_number
    );

    if (!previousState) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No previous book state found' },
      });
    }

    res.json(previousState);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error loading previous book state');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/trilogy/projects/:projectId/series-bible
 * Generate series bible for entire trilogy
 */
router.post('/projects/:projectId/series-bible', (req, res) => {
  try {
    const { projectId } = req.params;

    const startTime = Date.now();
    const seriesBible = seriesBibleGeneratorService.generateSeriesBible(projectId);
    const duration = Date.now() - startTime;

    logger.info({ projectId, duration }, 'Series bible generation completed');

    // Cache the generated result
    const cacheKey = `series-bible:${projectId}`;
    cache.set(cacheKey, seriesBible, SERIES_BIBLE_CACHE_TTL);

    res.json(seriesBible);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating series bible');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/trilogy/projects/:projectId/series-bible
 * Get existing series bible
 */
router.get('/projects/:projectId/series-bible', (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `series-bible:${projectId}`;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info({ projectId }, 'Series bible cache hit');
      return res.json(cached);
    }

    const seriesBible = seriesBibleGeneratorService.getSeriesBible(projectId);

    if (!seriesBible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series bible not found. Generate it first.' },
      });
    }

    // Cache the result
    cache.set(cacheKey, seriesBible, SERIES_BIBLE_CACHE_TTL);

    res.json(seriesBible);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting series bible');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/trilogy/transitions
 * Create transition summary between books
 */
router.post('/transitions', async (req, res) => {
  try {
    const { projectId, fromBookId, toBookId, timeGap } = req.body;

    if (!projectId || !fromBookId || !toBookId || !timeGap) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
      });
    }

    const transition = await bookTransitionService.generateBookTransition(
      projectId,
      fromBookId,
      toBookId,
      timeGap
    );

    res.status(201).json(transition);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating book transition');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/trilogy/transitions/:fromBookId/:toBookId
 * Get transition between two books
 */
router.get('/transitions/:fromBookId/:toBookId', (req, res) => {
  try {
    const { fromBookId, toBookId } = req.params;

    const transition = bookTransitionService.getTransition(fromBookId, toBookId);

    if (!transition) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Transition not found' },
      });
    }

    res.json(transition);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting transition');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/trilogy/projects/:projectId/transitions
 * Get all transitions for a project
 */
router.get('/projects/:projectId/transitions', (req, res) => {
  try {
    const { projectId } = req.params;

    const transitions = bookTransitionService.getProjectTransitions(projectId);

    res.json({ transitions });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting project transitions');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/trilogy/projects/:projectId/convert-to-trilogy
 * Convert a standalone project to trilogy
 */
router.post('/projects/:projectId/convert-to-trilogy', (req, res) => {
  try {
    const { projectId } = req.params;
    const { bookTitles } = req.body;  // Array of book titles

    if (!bookTitles || !Array.isArray(bookTitles) || bookTitles.length < 2) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Provide at least 2 book titles' },
      });
    }

    // Update project type
    const updateProjectStmt = db.prepare(`
      UPDATE projects
      SET type = 'trilogy', book_count = ?, updated_at = ?
      WHERE id = ?
    `);

    updateProjectStmt.run(bookTitles.length, new Date().toISOString(), projectId);

    // Get existing book (if any)
    const existingBookStmt = db.prepare<[string], any>(`
      SELECT * FROM books WHERE project_id = ? ORDER BY book_number ASC LIMIT 1
    `);

    const existingBook = existingBookStmt.get(projectId);

    // Create book records
    const now = new Date().toISOString();
    const createBookStmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdBooks = bookTitles.map((title: string, index: number) => {
      // If first book exists, update it instead of creating
      if (index === 0 && existingBook) {
        const updateBookStmt = db.prepare(`
          UPDATE books SET title = ?, updated_at = ? WHERE id = ?
        `);
        updateBookStmt.run(title, now, existingBook.id);
        return existingBook;
      }

      const bookId = `book-${Date.now()}-${index}`;
      createBookStmt.run(
        bookId,
        projectId,
        index + 1,
        title,
        'setup',
        0,
        now,
        now
      );

      return { id: bookId, book_number: index + 1, title };
    });

    res.json({
      success: true,
      books: createdBooks,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error converting to trilogy');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export default router;
