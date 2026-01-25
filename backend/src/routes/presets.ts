import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { cache } from '../services/cache.service.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:presets');

// Cache TTL in seconds
const CACHE_TTL = 3600; // 1 hour for presets (changes infrequently)

interface BookStylePreset {
  id: string;
  name: string;
  description?: string;
  genres: string[];
  subgenres: string[];
  modifiers: string[];
  tones: string[];
  themes: string[];
  custom_theme?: string;
  target_length: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = []): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/presets
 * List all book style presets
 */
router.get('/', (req, res) => {
  try {
    const cacheKey = 'presets:all';

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const stmt = db.prepare(`
      SELECT * FROM book_style_presets ORDER BY is_default DESC, name ASC
    `);

    const presets = stmt.all();

    // Parse JSON fields
    const parsedPresets = presets.map((p: any) => ({
      ...p,
      genres: safeJsonParse(p.genres, []),
      subgenres: safeJsonParse(p.subgenres, []),
      modifiers: safeJsonParse(p.modifiers, []),
      tones: safeJsonParse(p.tones, []),
      themes: safeJsonParse(p.themes, []),
      is_default: p.is_default === 1,
    }));

    const response = { presets: parsedPresets };

    // Cache the result
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching presets');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/presets/:id
 * Get a single preset
 */
router.get('/:id', (req, res) => {
  try {
    const cacheKey = `presets:${req.params.id}`;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const stmt = db.prepare(`
      SELECT * FROM book_style_presets WHERE id = ?
    `);

    const preset = stmt.get(req.params.id) as any;

    if (!preset) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Preset not found' },
      });
    }

    const parsedPreset = {
      ...preset,
      genres: safeJsonParse(preset.genres, []),
      subgenres: safeJsonParse(preset.subgenres, []),
      modifiers: safeJsonParse(preset.modifiers, []),
      tones: safeJsonParse(preset.tones, []),
      themes: safeJsonParse(preset.themes, []),
      is_default: preset.is_default === 1,
    };

    // Cache the result
    cache.set(cacheKey, parsedPreset, CACHE_TTL);

    res.json(parsedPreset);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching preset');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/presets
 * Create a new book style preset
 */
router.post('/', (req, res) => {
  try {
    const { name, description, genres, subgenres, modifiers, tones, themes, customTheme, targetLength } = req.body;

    if (!name || !genres || !subgenres) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Name, genres, and subgenres are required' },
      });
    }

    const presetId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO book_style_presets (id, name, description, genres, subgenres, modifiers, tones, themes, custom_theme, target_length, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      presetId,
      name,
      description || null,
      JSON.stringify(genres),
      JSON.stringify(subgenres),
      JSON.stringify(modifiers || []),
      JSON.stringify(tones || []),
      JSON.stringify(themes || []),
      customTheme || null,
      targetLength || 80000,
      now,
      now
    );

    // Invalidate presets cache
    cache.invalidate('presets:');

    res.status(201).json({
      id: presetId,
      name,
      description,
      genres,
      subgenres,
      modifiers: modifiers || [],
      tones: tones || [],
      themes: themes || [],
      custom_theme: customTheme,
      target_length: targetLength || 80000,
      is_default: false,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating preset');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/presets/:id
 * Update a preset (only user-created, not defaults)
 */
router.put('/:id', (req, res) => {
  try {
    const { name, description, genres, subgenres, modifiers, tones, themes, customTheme, targetLength } = req.body;

    // Check if preset exists and is not a default
    const checkStmt = db.prepare(`SELECT is_default FROM book_style_presets WHERE id = ?`);
    const existing = checkStmt.get(req.params.id) as any;

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Preset not found' },
      });
    }

    if (existing.is_default === 1) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Cannot modify default presets' },
      });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE book_style_presets
      SET name = ?, description = ?, genres = ?, subgenres = ?, modifiers = ?, tones = ?, themes = ?, custom_theme = ?, target_length = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      description || null,
      JSON.stringify(genres),
      JSON.stringify(subgenres),
      JSON.stringify(modifiers || []),
      JSON.stringify(tones || []),
      JSON.stringify(themes || []),
      customTheme || null,
      targetLength || 80000,
      now,
      req.params.id
    );

    // Invalidate presets cache
    cache.invalidate('presets:');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating preset');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/presets/:id
 * Delete a preset (only user-created, not defaults)
 */
router.delete('/:id', (req, res) => {
  try {
    // Check if preset exists and is not a default
    const checkStmt = db.prepare(`SELECT is_default FROM book_style_presets WHERE id = ?`);
    const existing = checkStmt.get(req.params.id) as any;

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Preset not found' },
      });
    }

    if (existing.is_default === 1) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Cannot delete default presets' },
      });
    }

    const stmt = db.prepare(`DELETE FROM book_style_presets WHERE id = ?`);
    stmt.run(req.params.id);

    // Invalidate presets cache
    cache.invalidate('presets:');

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting preset');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
