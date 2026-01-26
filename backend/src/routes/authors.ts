/**
 * Author Management Routes
 *
 * Handles user custom authors and favorites from the predefined AUTHOR_STYLES library.
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { createLogger } from '../services/logger.service.js';
import { lookupAuthor } from '../services/author-lookup.service.js';
import { AUTHOR_STYLES } from '../services/author-styles.js';

const router = Router();
const logger = createLogger('routes:authors');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch {
    return fallback;
  }
}

/**
 * GET /api/authors
 * List all authors (predefined + custom)
 *
 * Query params:
 * - genre: Filter by genre
 * - search: Search by name
 */
router.get('/', (req, res) => {
  try {
    const userId = 'owner'; // Default user
    const { genre, search } = req.query;

    // Get custom authors from database
    const customStmt = db.prepare(`
      SELECT * FROM user_author_profiles
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const customAuthors = customStmt.all(userId) as any[];

    // Parse JSON fields for custom authors
    const parsedCustomAuthors = customAuthors.map((author) => ({
      id: author.id,
      name: author.name,
      type: 'custom',
      genres: safeJsonParse(author.genres, []),
      writingStyle: author.writing_style,
      notableWorks: safeJsonParse(author.notable_works, []),
      styleKeywords: safeJsonParse(author.style_keywords, []),
      source: author.source,
      createdAt: author.created_at,
      updatedAt: author.updated_at,
    }));

    // Map predefined authors to consistent format
    const predefinedAuthors = AUTHOR_STYLES.map((author: any) => ({
      id: author.id,
      name: author.fullName,
      type: 'predefined',
      genres: author.genres,
      writingStyle: author.styleDescription,
      notableWorks: author.knownFor,
      styleKeywords: author.characteristics.toneSignature,
      icon: author.icon,
      era: author.era,
      nationality: author.nationality,
      bestFor: author.bestFor,
    }));

    // Combine all authors
    let allAuthors = [...predefinedAuthors, ...parsedCustomAuthors];

    // Apply genre filter
    if (genre && typeof genre === 'string') {
      allAuthors = allAuthors.filter((author: any) =>
        author.genres.some((g: string) => g.toLowerCase() === genre.toLowerCase())
      );
    }

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      allAuthors = allAuthors.filter((author: any) =>
        author.name.toLowerCase().includes(searchLower)
      );
    }

    // Get user favorites
    const favoritesStmt = db.prepare(`
      SELECT author_id, author_type FROM user_favorite_authors
      WHERE user_id = ?
    `);
    const favorites = favoritesStmt.all(userId) as any[];
    const favoriteIds = new Set(favorites.map((f) => f.author_id));

    // Mark favorites
    allAuthors = allAuthors.map((author: any) => ({
      ...author,
      isFavorite: favoriteIds.has(author.id),
    }));

    logger.info({ count: allAuthors.length, genre, search }, 'Fetched authors list');

    res.json({ authors: allAuthors });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching authors');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/authors/favorites
 * List user's favorite authors
 */
router.get('/favorites', (req, res) => {
  try {
    const userId = 'owner';

    const stmt = db.prepare(`
      SELECT author_id, author_type, added_at FROM user_favorite_authors
      WHERE user_id = ?
      ORDER BY added_at DESC
    `);
    const favorites = stmt.all(userId) as any[];

    // Enrich with full author data
    const enrichedFavorites = favorites.map((fav) => {
      if (fav.author_type === 'predefined') {
        const author = AUTHOR_STYLES.find((a) => a.id === fav.author_id);
        if (!author) return null;

        return {
          id: author.id,
          name: author.fullName,
          type: 'predefined',
          genres: author.genres,
          writingStyle: author.styleDescription,
          notableWorks: author.knownFor,
          styleKeywords: author.characteristics.toneSignature,
          icon: author.icon,
          isFavorite: true,
          addedAt: fav.added_at,
        };
      } else {
        // Custom author
        const customStmt = db.prepare(`
          SELECT * FROM user_author_profiles WHERE id = ?
        `);
        const author = customStmt.get(fav.author_id) as any;
        if (!author) return null;

        return {
          id: author.id,
          name: author.name,
          type: 'custom',
          genres: safeJsonParse(author.genres, []),
          writingStyle: author.writing_style,
          notableWorks: safeJsonParse(author.notable_works, []),
          styleKeywords: safeJsonParse(author.style_keywords, []),
          source: author.source,
          isFavorite: true,
          addedAt: fav.added_at,
        };
      }
    }).filter(Boolean);

    res.json({ authors: enrichedFavorites });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching favorite authors');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/authors/favorites/:authorId
 * Add author to favorites
 */
router.post('/favorites/:authorId', (req, res) => {
  try {
    const userId = 'owner';
    const { authorId } = req.params;
    const { authorType = 'predefined' } = req.body;

    // Validate author exists
    if (authorType === 'predefined') {
      const exists = AUTHOR_STYLES.some((a) => a.id === authorId);
      if (!exists) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Author not found' },
        });
      }
    } else {
      const checkStmt = db.prepare(`
        SELECT id FROM user_author_profiles WHERE id = ?
      `);
      const exists = checkStmt.get(authorId);
      if (!exists) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Custom author not found' },
        });
      }
    }

    const favoriteId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO user_favorite_authors (id, user_id, author_id, author_type, added_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(favoriteId, userId, authorId, authorType, now);

    logger.info({ authorId, authorType }, 'Author added to favorites');

    res.status(201).json({ success: true, favoriteId });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error adding favorite');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/authors/favorites/:authorId
 * Remove author from favorites
 */
router.delete('/favorites/:authorId', (req, res) => {
  try {
    const userId = 'owner';
    const { authorId } = req.params;

    const stmt = db.prepare(`
      DELETE FROM user_favorite_authors
      WHERE user_id = ? AND author_id = ?
    `);

    const result = stmt.run(userId, authorId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Favorite not found' },
      });
    }

    logger.info({ authorId }, 'Author removed from favorites');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error removing favorite');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/authors/custom
 * List user's custom authors
 */
router.get('/custom', (req, res) => {
  try {
    const userId = 'owner';

    const stmt = db.prepare(`
      SELECT * FROM user_author_profiles
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const customAuthors = stmt.all(userId) as any[];

    const parsedAuthors = customAuthors.map((author) => ({
      id: author.id,
      name: author.name,
      genres: safeJsonParse(author.genres, []),
      writingStyle: author.writing_style,
      notableWorks: safeJsonParse(author.notable_works, []),
      styleKeywords: safeJsonParse(author.style_keywords, []),
      source: author.source,
      createdAt: author.created_at,
      updatedAt: author.updated_at,
    }));

    res.json({ authors: parsedAuthors });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching custom authors');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/authors/custom
 * Create custom author
 */
router.post('/custom', (req, res) => {
  try {
    const userId = 'owner';
    const { name, genres, writingStyle, notableWorks, styleKeywords, source = 'user' } = req.body;

    // Validate required fields
    if (!name || !genres || !writingStyle) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Name, genres, and writingStyle are required' },
      });
    }

    const authorId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_author_profiles (
        id, user_id, name, genres, writing_style, notable_works, style_keywords, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      authorId,
      userId,
      name,
      JSON.stringify(genres || []),
      writingStyle,
      JSON.stringify(notableWorks || []),
      JSON.stringify(styleKeywords || []),
      source,
      now,
      now
    );

    logger.info({ authorId, name, source }, 'Custom author created');

    res.status(201).json({
      id: authorId,
      name,
      genres,
      writingStyle,
      notableWorks,
      styleKeywords,
      source,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error: any) {
    // Check for unique constraint violation
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE_AUTHOR', message: 'An author with this name already exists' },
      });
    }

    logger.error({ error: error.message, stack: error.stack }, 'Error creating custom author');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/authors/custom/:id
 * Update custom author
 */
router.put('/custom/:id', (req, res) => {
  try {
    const userId = 'owner';
    const { id } = req.params;
    const { name, genres, writingStyle, notableWorks, styleKeywords } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (genres !== undefined) {
      updates.push('genres = ?');
      params.push(JSON.stringify(genres));
    }
    if (writingStyle !== undefined) {
      updates.push('writing_style = ?');
      params.push(writingStyle);
    }
    if (notableWorks !== undefined) {
      updates.push('notable_works = ?');
      params.push(JSON.stringify(notableWorks));
    }
    if (styleKeywords !== undefined) {
      updates.push('style_keywords = ?');
      params.push(JSON.stringify(styleKeywords));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    params.push(userId);

    const stmt = db.prepare(`
      UPDATE user_author_profiles
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Custom author not found' },
      });
    }

    logger.info({ authorId: id }, 'Custom author updated');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating custom author');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/authors/custom/:id
 * Delete custom author
 */
router.delete('/custom/:id', (req, res) => {
  try {
    const userId = 'owner';
    const { id } = req.params;

    // Also remove from favorites
    const deleteFavStmt = db.prepare(`
      DELETE FROM user_favorite_authors
      WHERE user_id = ? AND author_id = ? AND author_type = 'custom'
    `);
    deleteFavStmt.run(userId, id);

    // Delete the author
    const stmt = db.prepare(`
      DELETE FROM user_author_profiles
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Custom author not found' },
      });
    }

    logger.info({ authorId: id }, 'Custom author deleted');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting custom author');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/authors/lookup
 * Search for author info online using AI
 */
router.post('/lookup', async (req, res) => {
  try {
    const { authorName } = req.body;

    if (!authorName || typeof authorName !== 'string') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'authorName is required' },
      });
    }

    logger.info({ authorName }, 'Looking up author');

    const authorInfo = await lookupAuthor(authorName);

    res.json(authorInfo);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error looking up author');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
