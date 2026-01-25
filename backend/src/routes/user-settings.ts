import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { cache } from '../services/cache.service.js';
import { createLogger } from '../services/logger.service.js';
import {
  createUserGenreSchema,
  updateUserGenreSchema,
  createUserExclusionSchema,
  updateUserExclusionSchema,
  createGenreRecipeSchema,
  updateGenreRecipeSchema,
  validateRequest,
} from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:user-settings');

// Cache TTL in seconds
const CACHE_TTL = 1800; // 30 minutes

// Default user ID for single-user mode
const DEFAULT_USER_ID = 'owner';

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = []): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error: any) {
    logger.error({ error: error.message }, 'JSON parse error');
    return fallback;
  }
}

// ============================================================================
// USER GENRES
// ============================================================================

/**
 * GET /api/user-settings/genres
 * List all custom genres for the user
 */
router.get('/genres', (req, res) => {
  try {
    const cacheKey = `user-genres:${DEFAULT_USER_ID}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const stmt = db.prepare(`
      SELECT * FROM user_genres
      WHERE user_id = ?
      ORDER BY parent_genre, name ASC
    `);

    const genres = stmt.all(DEFAULT_USER_ID);

    const response = { genres };
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching user genres');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/user-settings/genres/:id
 * Get a single custom genre
 */
router.get('/genres/:id', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM user_genres WHERE id = ? AND user_id = ?`);
    const genre = stmt.get(req.params.id, DEFAULT_USER_ID);

    if (!genre) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Custom genre not found' }
      });
    }

    res.json(genre);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching user genre');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/user-settings/genres
 * Create a new custom genre
 */
router.post('/genres', (req, res) => {
  try {
    const validation = validateRequest(createUserGenreSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, parentGenre } = validation.data;

    const genreId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_genres (id, user_id, name, description, parent_genre, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(genreId, DEFAULT_USER_ID, name, description || null, parentGenre || null, now);

    // Invalidate cache
    cache.invalidate(`user-genres:${DEFAULT_USER_ID}`);

    res.status(201).json({
      id: genreId,
      user_id: DEFAULT_USER_ID,
      name,
      description,
      parent_genre: parentGenre,
      created_at: now,
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'A custom genre with this name already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error creating user genre');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/user-settings/genres/:id
 * Update a custom genre
 */
router.put('/genres/:id', (req, res) => {
  try {
    const validation = validateRequest(updateUserGenreSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, parentGenre } = validation.data;

    // Check existence
    const checkStmt = db.prepare(`SELECT id FROM user_genres WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Custom genre not found' }
      });
    }

    const stmt = db.prepare(`
      UPDATE user_genres
      SET name = ?, description = ?, parent_genre = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(name, description || null, parentGenre || null, req.params.id, DEFAULT_USER_ID);

    // Invalidate cache
    cache.invalidate(`user-genres:${DEFAULT_USER_ID}`);

    res.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'A custom genre with this name already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error updating user genre');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/user-settings/genres/:id
 * Delete a custom genre
 */
router.delete('/genres/:id', (req, res) => {
  try {
    const checkStmt = db.prepare(`SELECT id FROM user_genres WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Custom genre not found' }
      });
    }

    const stmt = db.prepare(`DELETE FROM user_genres WHERE id = ? AND user_id = ?`);
    stmt.run(req.params.id, DEFAULT_USER_ID);

    // Invalidate cache
    cache.invalidate(`user-genres:${DEFAULT_USER_ID}`);

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting user genre');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// USER EXCLUSIONS
// ============================================================================

/**
 * GET /api/user-settings/exclusions
 * List all exclusions for the user
 * Query params: type (optional filter by type)
 */
router.get('/exclusions', (req, res) => {
  try {
    const { type } = req.query;
    const cacheKey = type
      ? `user-exclusions:${DEFAULT_USER_ID}:${type}`
      : `user-exclusions:${DEFAULT_USER_ID}:all`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let sql = `SELECT * FROM user_exclusions WHERE user_id = ?`;
    const params: any[] = [DEFAULT_USER_ID];

    if (type && ['name', 'word', 'theme', 'trope'].includes(type as string)) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY type, value ASC`;

    const stmt = db.prepare(sql);
    const exclusions = stmt.all(...params);

    const response = { exclusions };
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching user exclusions');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/user-settings/exclusions/:id
 * Get a single exclusion
 */
router.get('/exclusions/:id', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM user_exclusions WHERE id = ? AND user_id = ?`);
    const exclusion = stmt.get(req.params.id, DEFAULT_USER_ID);

    if (!exclusion) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exclusion not found' }
      });
    }

    res.json(exclusion);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching exclusion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/user-settings/exclusions
 * Create a new exclusion
 */
router.post('/exclusions', (req, res) => {
  try {
    const validation = validateRequest(createUserExclusionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { type, value, reason } = validation.data;

    const exclusionId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_exclusions (id, user_id, type, value, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(exclusionId, DEFAULT_USER_ID, type, value, reason || null, now);

    // Invalidate all exclusion caches for this user
    cache.invalidate(`user-exclusions:${DEFAULT_USER_ID}`);

    res.status(201).json({
      id: exclusionId,
      user_id: DEFAULT_USER_ID,
      type,
      value,
      reason,
      created_at: now,
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'This exclusion already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error creating exclusion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/user-settings/exclusions/bulk
 * Create multiple exclusions at once
 */
router.post('/exclusions/bulk', (req, res) => {
  try {
    const { exclusions } = req.body;

    if (!Array.isArray(exclusions) || exclusions.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'exclusions array is required' }
      });
    }

    if (exclusions.length > 100) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Maximum 100 exclusions per request' }
      });
    }

    const created: any[] = [];
    const skipped: any[] = [];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO user_exclusions (id, user_id, type, value, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of exclusions) {
      if (!item.type || !item.value) {
        skipped.push({ ...item, reason: 'Missing type or value' });
        continue;
      }

      if (!['name', 'word', 'theme', 'trope'].includes(item.type)) {
        skipped.push({ ...item, reason: 'Invalid type' });
        continue;
      }

      const exclusionId = randomUUID();
      const result = insertStmt.run(
        exclusionId,
        DEFAULT_USER_ID,
        item.type,
        item.value,
        item.reason || null,
        now
      );

      if (result.changes > 0) {
        created.push({
          id: exclusionId,
          user_id: DEFAULT_USER_ID,
          type: item.type,
          value: item.value,
          reason: item.reason,
          created_at: now,
        });
      } else {
        skipped.push({ ...item, reason: 'Duplicate entry' });
      }
    }

    // Invalidate cache
    cache.invalidate(`user-exclusions:${DEFAULT_USER_ID}`);

    res.status(201).json({ created, skipped });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error bulk creating exclusions');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/user-settings/exclusions/:id
 * Update an exclusion
 */
router.put('/exclusions/:id', (req, res) => {
  try {
    const validation = validateRequest(updateUserExclusionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { type, value, reason } = validation.data;

    // Check existence
    const checkStmt = db.prepare(`SELECT id FROM user_exclusions WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exclusion not found' }
      });
    }

    const stmt = db.prepare(`
      UPDATE user_exclusions
      SET type = ?, value = ?, reason = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(type, value, reason || null, req.params.id, DEFAULT_USER_ID);

    // Invalidate cache
    cache.invalidate(`user-exclusions:${DEFAULT_USER_ID}`);

    res.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'This exclusion already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error updating exclusion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/user-settings/exclusions/:id
 * Delete an exclusion
 */
router.delete('/exclusions/:id', (req, res) => {
  try {
    const checkStmt = db.prepare(`SELECT id FROM user_exclusions WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Exclusion not found' }
      });
    }

    const stmt = db.prepare(`DELETE FROM user_exclusions WHERE id = ? AND user_id = ?`);
    stmt.run(req.params.id, DEFAULT_USER_ID);

    // Invalidate cache
    cache.invalidate(`user-exclusions:${DEFAULT_USER_ID}`);

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting exclusion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// GENRE RECIPES
// ============================================================================

/**
 * GET /api/user-settings/recipes
 * List all genre recipes for the user
 */
router.get('/recipes', (req, res) => {
  try {
    const cacheKey = `user-recipes:${DEFAULT_USER_ID}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const stmt = db.prepare(`
      SELECT * FROM user_genre_recipes
      WHERE user_id = ?
      ORDER BY name ASC
    `);

    const recipes = stmt.all(DEFAULT_USER_ID);

    // Parse JSON fields
    const parsedRecipes = recipes.map((r: any) => ({
      ...r,
      genres: safeJsonParse(r.genres, []),
      tones: safeJsonParse(r.tones, []),
      themes: safeJsonParse(r.themes, []),
      modifiers: safeJsonParse(r.modifiers, []),
    }));

    const response = { recipes: parsedRecipes };
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching genre recipes');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/user-settings/recipes/:id
 * Get a single genre recipe
 */
router.get('/recipes/:id', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM user_genre_recipes WHERE id = ? AND user_id = ?`);
    const recipe = stmt.get(req.params.id, DEFAULT_USER_ID) as any;

    if (!recipe) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Genre recipe not found' }
      });
    }

    const parsedRecipe = {
      ...recipe,
      genres: safeJsonParse(recipe.genres, []),
      tones: safeJsonParse(recipe.tones, []),
      themes: safeJsonParse(recipe.themes, []),
      modifiers: safeJsonParse(recipe.modifiers, []),
    };

    res.json(parsedRecipe);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching genre recipe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/user-settings/recipes
 * Create a new genre recipe
 */
router.post('/recipes', (req, res) => {
  try {
    const validation = validateRequest(createGenreRecipeSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, genres, tones, themes, modifiers, targetLength } = validation.data;

    const recipeId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_genre_recipes (id, user_id, name, description, genres, tones, themes, modifiers, target_length, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      recipeId,
      DEFAULT_USER_ID,
      name,
      description || null,
      JSON.stringify(genres),
      JSON.stringify(tones),
      JSON.stringify(themes || []),
      JSON.stringify(modifiers || []),
      targetLength || 80000,
      now,
      now
    );

    // Invalidate cache
    cache.invalidate(`user-recipes:${DEFAULT_USER_ID}`);

    res.status(201).json({
      id: recipeId,
      user_id: DEFAULT_USER_ID,
      name,
      description,
      genres,
      tones,
      themes: themes || [],
      modifiers: modifiers || [],
      target_length: targetLength || 80000,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'A recipe with this name already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error creating genre recipe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/user-settings/recipes/:id
 * Update a genre recipe
 */
router.put('/recipes/:id', (req, res) => {
  try {
    const validation = validateRequest(updateGenreRecipeSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, genres, tones, themes, modifiers, targetLength } = validation.data;

    // Check existence
    const checkStmt = db.prepare(`SELECT id FROM user_genre_recipes WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Genre recipe not found' }
      });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE user_genre_recipes
      SET name = ?, description = ?, genres = ?, tones = ?, themes = ?, modifiers = ?, target_length = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      name,
      description || null,
      JSON.stringify(genres),
      JSON.stringify(tones),
      JSON.stringify(themes || []),
      JSON.stringify(modifiers || []),
      targetLength || 80000,
      now,
      req.params.id,
      DEFAULT_USER_ID
    );

    // Invalidate cache
    cache.invalidate(`user-recipes:${DEFAULT_USER_ID}`);

    res.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: 'A recipe with this name already exists' }
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error updating genre recipe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/user-settings/recipes/:id
 * Delete a genre recipe
 */
router.delete('/recipes/:id', (req, res) => {
  try {
    const checkStmt = db.prepare(`SELECT id FROM user_genre_recipes WHERE id = ? AND user_id = ?`);
    const existing = checkStmt.get(req.params.id, DEFAULT_USER_ID);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Genre recipe not found' }
      });
    }

    const stmt = db.prepare(`DELETE FROM user_genre_recipes WHERE id = ? AND user_id = ?`);
    stmt.run(req.params.id, DEFAULT_USER_ID);

    // Invalidate cache
    cache.invalidate(`user-recipes:${DEFAULT_USER_ID}`);

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting genre recipe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
