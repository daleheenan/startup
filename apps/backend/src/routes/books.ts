import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Book } from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';
import { cache } from '../services/cache.service.js';
import { createBookSchema, updateBookSchema, validateRequest } from '../utils/schemas.js';
import { bookCloningService } from '../services/book-cloning.service.js';
import { bookVersioningService } from '../services/book-versioning.service.js';
import multer from 'multer';

const router = Router();
const logger = createLogger('routes:books');

// Configure multer for cover image uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/books/all
 * List ALL books across all projects with filtering and pagination
 * Query params: pen_name_id, publication_status, genre, series_id, search, sort, order, page, pageSize
 */
router.get('/all', (req, res) => {
  try {
    const {
      pen_name_id,
      publication_status,
      genre,
      series_id,
      search,
      sort = 'updated_at',
      order = 'desc',
      page = '1',
      pageSize = '20',
    } = req.query;

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const offset = (pageNum - 1) * pageSizeNum;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (pen_name_id) {
      conditions.push('b.pen_name_id = ?');
      params.push(pen_name_id as string);
    }

    if (publication_status) {
      // Handle comma-separated multiple statuses
      const statuses = (publication_status as string).split(',');
      conditions.push(`b.publication_status IN (${statuses.map(() => '?').join(', ')})`);
      params.push(...statuses);
    }

    if (genre) {
      conditions.push('p.genre = ?');
      params.push(genre as string);
    }

    if (series_id) {
      conditions.push('p.series_id = ?');
      params.push(series_id as string);
    }

    if (search) {
      conditions.push('(b.title LIKE ? OR s.title LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['title', 'publication_status', 'word_count', 'publication_date', 'updated_at'];
    const sortField = allowedSortFields.includes(sort as string) ? sort : 'updated_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countStmt = db.prepare<unknown[], { total: number }>(`
      SELECT COUNT(*) as total
      FROM books b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN series s ON p.series_id = s.id
      ${whereClause}
    `);
    const { total } = countStmt.get(...params) || { total: 0 };

    // Get paginated books with enriched data
    const booksStmt = db.prepare<unknown[], {
      id: string;
      title: string;
      project_id: string;
      project_title: string;
      series_id: string | null;
      series_name: string | null;
      pen_name_id: string | null;
      pen_name: string | null;
      genre: string;
      status: string;
      publication_status: string;
      word_count: number;
      publication_date: string | null;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT
        b.id,
        b.title,
        b.project_id,
        p.title as project_title,
        p.series_id,
        s.title as series_name,
        b.pen_name_id,
        pn.pen_name as pen_name,
        p.genre,
        b.status,
        b.publication_status,
        COALESCE((
          SELECT SUM(c.word_count)
          FROM chapters c
          WHERE c.book_id = b.id AND c.status = 'completed'
        ), 0) as word_count,
        b.publication_date,
        b.created_at,
        b.updated_at
      FROM books b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN series s ON p.series_id = s.id
      LEFT JOIN pen_names pn ON b.pen_name_id = pn.id
      ${whereClause}
      ORDER BY b.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    params.push(pageSizeNum, offset);
    const books = booksStmt.all(...params);

    const totalPages = Math.ceil(total / pageSizeNum);

    res.json({
      books,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Error fetching all books');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/stats
 * Dashboard statistics with same filters as /all
 * Query params: pen_name_id, publication_status, genre, series_id
 */
router.get('/stats', (req, res) => {
  try {
    const { pen_name_id, publication_status, genre, series_id } = req.query;

    // Build WHERE clause (same as /all endpoint)
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (pen_name_id) {
      conditions.push('b.pen_name_id = ?');
      params.push(pen_name_id as string);
    }

    if (publication_status) {
      const statuses = (publication_status as string).split(',');
      conditions.push(`b.publication_status IN (${statuses.map(() => '?').join(', ')})`);
      params.push(...statuses);
    }

    if (genre) {
      conditions.push('p.genre = ?');
      params.push(genre as string);
    }

    if (series_id) {
      conditions.push('p.series_id = ?');
      params.push(series_id as string);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get overall statistics
    const statsStmt = db.prepare<unknown[], { total_books: number; total_words: number }>(`
      SELECT
        COUNT(*) as total_books,
        COALESCE(SUM((
          SELECT SUM(c.word_count)
          FROM chapters c
          WHERE c.book_id = b.id AND c.status = 'completed'
        )), 0) as total_words
      FROM books b
      LEFT JOIN projects p ON b.project_id = p.id
      ${whereClause}
    `);
    const stats = statsStmt.get(...params) || { total_books: 0, total_words: 0 };

    // Get counts by status
    const statusStmt = db.prepare<unknown[], { publication_status: string; count: number }>(`
      SELECT b.publication_status, COUNT(*) as count
      FROM books b
      LEFT JOIN projects p ON b.project_id = p.id
      ${whereClause}
      GROUP BY b.publication_status
    `);
    const statusCounts = statusStmt.all(...params);
    const by_status: Record<string, number> = {};
    statusCounts.forEach((row) => {
      by_status[row.publication_status] = row.count;
    });

    // Get counts by pen name
    const penNameStmt = db.prepare<unknown[], { pen_name_id: string; pen_name: string; count: number }>(`
      SELECT b.pen_name_id, pn.pen_name, COUNT(*) as count
      FROM books b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN pen_names pn ON b.pen_name_id = pn.id
      ${whereClause}
      GROUP BY b.pen_name_id
      HAVING b.pen_name_id IS NOT NULL
    `);
    const penNameCounts = penNameStmt.all(...params);
    const by_pen_name: Record<string, { name: string; count: number }> = {};
    penNameCounts.forEach((row) => {
      by_pen_name[row.pen_name_id] = { name: row.pen_name, count: row.count };
    });

    res.json({
      total_books: stats.total_books,
      total_words: stats.total_words,
      by_status,
      by_pen_name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Error fetching book statistics');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

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
 * Get a specific book with full publishing metadata
 *
 * Note: word_count is calculated from the active version's completed chapters.
 * If no versions exist, falls back to all chapters (legacy behaviour).
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Book & {
      calculated_word_count: number;
      pen_name_id: string | null;
      pen_name: string | null;
      isbn: string | null;
      publication_date: string | null;
      publication_status: string;
      blurb: string | null;
      keywords: string | null;
      cover_image: string | null;
      cover_image_type: string | null;
    }>(`
      SELECT
        b.*,
        pn.pen_name,
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
      LEFT JOIN pen_names pn ON b.pen_name_id = pn.id
      WHERE b.id = ?
    `);

    const bookRaw = stmt.get(req.params.id);

    if (!bookRaw) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    // Get publishing platforms for this book
    const platformsStmt = db.prepare<[string], { platform: string; platform_url: string | null; status: string }>(`
      SELECT platform, platform_url, status
      FROM book_platforms
      WHERE book_id = ?
    `);
    const platforms = platformsStmt.all(req.params.id);

    // Parse JSON fields
    const keywords = bookRaw.keywords ? JSON.parse(bookRaw.keywords) : null;

    // Use calculated word count (from version with most chapters) as the authoritative count
    const book = {
      ...bookRaw,
      word_count: bookRaw.calculated_word_count || 0,
      keywords,
      platforms,
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
 * Update a book (includes publishing metadata fields)
 */
router.put('/:id', (req, res) => {
  try {
    const {
      title,
      status,
      wordCount,
      penNameId,
      isbn,
      publicationDate,
      publicationStatus,
      blurb,
      keywords,
    } = req.body;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (wordCount !== undefined) {
      updates.push('word_count = ?');
      params.push(wordCount);
    }

    if (penNameId !== undefined) {
      updates.push('pen_name_id = ?');
      params.push(penNameId);
    }

    if (isbn !== undefined) {
      updates.push('isbn = ?');
      params.push(isbn);
    }

    if (publicationDate !== undefined) {
      updates.push('publication_date = ?');
      params.push(publicationDate);
    }

    if (publicationStatus !== undefined) {
      // Validate publication status
      const validStatuses = ['draft', 'beta_readers', 'editing', 'submitted', 'published'];
      if (!validStatuses.includes(publicationStatus)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: `Invalid publication status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
      }
      updates.push('publication_status = ?');
      params.push(publicationStatus);
    }

    if (blurb !== undefined) {
      updates.push('blurb = ?');
      params.push(blurb);
    }

    if (keywords !== undefined) {
      updates.push('keywords = ?');
      params.push(keywords ? JSON.stringify(keywords) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'At least one field must be provided for update' },
      });
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

// ============================================
// PUBLISHING ENDPOINTS
// ============================================

/**
 * PATCH /api/books/:id/status
 * Quick status update with history logging
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { publication_status, notes } = req.body;

    // Validate publication status
    const validStatuses = ['draft', 'beta_readers', 'editing', 'submitted', 'published'];
    if (!publication_status || !validStatuses.includes(publication_status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: `Invalid publication status. Must be one of: ${validStatuses.join(', ')}`,
        },
      });
    }

    // Get current book status
    const bookStmt = db.prepare<[string], { publication_status: string }>(`
      SELECT publication_status FROM books WHERE id = ?
    `);
    const book = bookStmt.get(req.params.id);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    const oldStatus = book.publication_status;
    const now = new Date().toISOString();

    // Update book status
    const updateStmt = db.prepare(`
      UPDATE books
      SET publication_status = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(publication_status, now, req.params.id);

    // Record status change in history
    const historyStmt = db.prepare(`
      INSERT INTO book_status_history (id, book_id, old_status, new_status, changed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    historyStmt.run(randomUUID(), req.params.id, oldStatus, publication_status, now, notes || null);

    // Get updated book
    const updatedBookStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);
    const updatedBook = updatedBookStmt.get(req.params.id);

    logger.info(
      { bookId: req.params.id, oldStatus, newStatus: publication_status },
      'Book publication status updated'
    );

    res.json(updatedBook);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error updating book status');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * POST /api/books/:id/cover
 * Upload cover image
 */
router.post('/:id/cover', upload.single('cover'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'No image file provided' },
      });
    }

    // Validate image type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid image type. Only JPEG, PNG, and WebP are supported.',
        },
      });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');

    // Update book with cover image
    const updateStmt = db.prepare(`
      UPDATE books
      SET cover_image = ?, cover_image_type = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = updateStmt.run(
      base64Image,
      req.file.mimetype,
      new Date().toISOString(),
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    // Get updated book
    const bookStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);
    const updatedBook = bookStmt.get(req.params.id);

    logger.info(
      { bookId: req.params.id, mimeType: req.file.mimetype, size: req.file.size },
      'Book cover image uploaded'
    );

    res.json(updatedBook);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error uploading cover image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

/**
 * GET /api/books/:id/status-history
 * Get status change history for a book
 */
router.get('/:id/status-history', (req, res) => {
  try {
    const stmt = db.prepare<[string], {
      id: string;
      old_status: string;
      new_status: string;
      changed_at: string;
      notes: string | null;
    }>(`
      SELECT id, old_status, new_status, changed_at, notes
      FROM book_status_history
      WHERE book_id = ?
      ORDER BY changed_at DESC
    `);

    const history = stmt.all(req.params.id);

    res.json({ history });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, bookId: req.params.id }, 'Error fetching status history');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: errorMessage } });
  }
});

export default router;
