/**
 * Pen Names CRUD Routes
 * Handles basic Create, Read, Update, Delete operations for pen names
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:pen-names:crud');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/pen-names
 * List all pen names (excludes soft-deleted)
 */
router.get('/', (req, res) => {
  try {
    const userId = 'owner';

    const stmt = db.prepare<[string], any>(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM projects WHERE pen_name_id = p.id) as book_count,
        (SELECT COALESCE(SUM(b.word_count), 0)
         FROM books b
         JOIN projects pr ON b.project_id = pr.id
         WHERE pr.pen_name_id = p.id) as word_count
      FROM pen_names p
      WHERE p.user_id = ? AND p.deleted_at IS NULL
      ORDER BY p.is_default DESC, p.created_at DESC
    `);

    const penNames = stmt.all(userId);

    // Parse JSON fields
    const parsedPenNames = penNames.map((p) => ({
      ...p,
      social_media: safeJsonParse(p.social_media, {}),
      genres: safeJsonParse(p.genres, []),
      is_public: Boolean(p.is_public),
      is_default: Boolean(p.is_default),
    }));

    res.json({ penNames: parsedPenNames });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching pen names');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/pen-names/:id
 * Get single pen name by ID
 */
router.get('/:id', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    const stmt = db.prepare<[string, string], any>(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM projects WHERE pen_name_id = p.id) as book_count,
        (SELECT COALESCE(SUM(b.word_count), 0)
         FROM books b
         JOIN projects pr ON b.project_id = pr.id
         WHERE pr.pen_name_id = p.id) as word_count
      FROM pen_names p
      WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL
    `);

    const penName = stmt.get(penNameId, userId);

    if (!penName) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    // Parse JSON fields
    const parsedPenName = {
      ...penName,
      social_media: safeJsonParse(penName.social_media, {}),
      genres: safeJsonParse(penName.genres, []),
      is_public: Boolean(penName.is_public),
      is_default: Boolean(penName.is_default),
    };

    res.json(parsedPenName);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching pen name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/pen-names
 * Create new pen name
 */
router.post('/', (req, res) => {
  try {
    const userId = 'owner';
    const {
      pen_name,
      display_name,
      bio,
      bio_short,
      website,
      social_media,
      genres,
      is_public,
      is_default,
    } = req.body;

    // Validate required fields
    if (!pen_name || typeof pen_name !== 'string' || pen_name.trim() === '') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'pen_name is required' },
      });
    }

    // Check if pen name already exists for this user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE user_id = ? AND pen_name = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(userId, pen_name.trim());

    if (existing) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A pen name with this name already exists' },
      });
    }

    const penNameId = uuidv4();
    const now = new Date().toISOString();

    // If this is set as default, unset other defaults
    if (is_default) {
      const unsetDefaultStmt = db.prepare(`
        UPDATE pen_names SET is_default = 0, updated_at = ? WHERE user_id = ? AND is_default = 1
      `);
      unsetDefaultStmt.run(now, userId);
    }

    const stmt = db.prepare(`
      INSERT INTO pen_names (
        id, user_id, pen_name, display_name, bio, bio_short,
        website, social_media, genres, is_public, is_default,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      penNameId,
      userId,
      pen_name.trim(),
      display_name || null,
      bio || null,
      bio_short || null,
      website || null,
      social_media ? JSON.stringify(social_media) : null,
      genres ? JSON.stringify(genres) : null,
      is_public !== undefined ? (is_public ? 1 : 0) : 1,
      is_default ? 1 : 0,
      now,
      now
    );

    logger.info({ penNameId, pen_name: pen_name.trim() }, 'Created new pen name');

    res.status(201).json({
      id: penNameId,
      pen_name: pen_name.trim(),
      display_name: display_name || null,
      is_default: Boolean(is_default),
      created_at: now,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating pen name');

    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A pen name with this name already exists' },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/pen-names/:id
 * Update pen name
 */
router.put('/:id', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;
    const {
      pen_name,
      display_name,
      bio,
      bio_short,
      website,
      social_media,
      genres,
      is_public,
    } = req.body;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(penNameId, userId);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    // Check if new pen_name conflicts with another pen name
    if (pen_name) {
      const conflictStmt = db.prepare<[string, string, string], any>(`
        SELECT id FROM pen_names
        WHERE user_id = ? AND pen_name = ? AND id != ? AND deleted_at IS NULL
      `);
      const conflict = conflictStmt.get(userId, pen_name.trim(), penNameId);

      if (conflict) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'A pen name with this name already exists' },
        });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (pen_name !== undefined) {
      updates.push('pen_name = ?');
      params.push(pen_name.trim());
    }

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name || null);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio || null);
    }

    if (bio_short !== undefined) {
      updates.push('bio_short = ?');
      params.push(bio_short || null);
    }

    if (website !== undefined) {
      updates.push('website = ?');
      params.push(website || null);
    }

    if (social_media !== undefined) {
      updates.push('social_media = ?');
      params.push(social_media ? JSON.stringify(social_media) : null);
    }

    if (genres !== undefined) {
      updates.push('genres = ?');
      params.push(genres ? JSON.stringify(genres) : null);
    }

    if (is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(is_public ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
      });
    }

    updates.push('updated_at = ?');
    const now = new Date().toISOString();
    params.push(now);
    params.push(penNameId);

    const stmt = db.prepare(`
      UPDATE pen_names SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    logger.info({ penNameId }, 'Updated pen name');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating pen name');

    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A pen name with this name already exists' },
      });
    }

    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/pen-names/:id
 * Soft delete pen name (rejects if has books assigned)
 */
router.delete('/:id', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(penNameId, userId);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    // Check if pen name has books assigned
    const booksStmt = db.prepare<[string], { count: number }>(`
      SELECT COUNT(*) as count FROM projects WHERE pen_name_id = ?
    `);
    const booksCount = booksStmt.get(penNameId);

    if (booksCount && booksCount.count > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Cannot delete pen name with ${booksCount.count} book(s) assigned. Please reassign or delete the books first.`,
        },
      });
    }

    // Soft delete
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE pen_names SET deleted_at = ?, updated_at = ? WHERE id = ?
    `);

    const result = stmt.run(now, now, penNameId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    logger.info({ penNameId }, 'Soft deleted pen name');

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting pen name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/pen-names/:id/photo
 * Upload photo for pen name
 */
router.post('/:id/photo', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;
    const { photo, photoType } = req.body;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(penNameId, userId);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    if (!photo || !photoType) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'photo and photoType are required' },
      });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(photoType)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid image type. Allowed: jpeg, png, gif, webp' },
      });
    }

    // Validate base64 format
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    const dataUrlPattern = /^data:image\/(jpeg|png|gif|webp);base64,/;

    let photoData = photo;
    if (dataUrlPattern.test(photo)) {
      photoData = photo.split(',')[1];
    } else if (!base64Pattern.test(photo)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid image format. Expected base64 encoded data.' },
      });
    }

    // Check size (5MB limit)
    if (photoData.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Image too large. Maximum size is 5MB.' },
      });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE pen_names SET photo = ?, photo_type = ?, updated_at = ? WHERE id = ?
    `);

    const result = stmt.run(photoData, photoType, now, penNameId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    logger.info({ penNameId }, 'Uploaded photo for pen name');

    res.json({ success: true, message: 'Photo uploaded successfully' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error uploading photo');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/pen-names/:id/photo
 * Remove photo from pen name
 */
router.delete('/:id/photo', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(penNameId, userId);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE pen_names SET photo = NULL, photo_type = NULL, updated_at = ? WHERE id = ?
    `);

    const result = stmt.run(now, penNameId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    logger.info({ penNameId }, 'Removed photo from pen name');

    res.json({ success: true, message: 'Photo removed successfully' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error removing photo');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/pen-names/:id/default
 * Set pen name as default (unsets others)
 */
router.put('/:id/default', (req, res) => {
  try {
    const userId = 'owner';
    const penNameId = req.params.id;

    // Verify pen name exists and belongs to user
    const checkStmt = db.prepare<[string, string], any>(`
      SELECT id FROM pen_names WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    const existing = checkStmt.get(penNameId, userId);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    const now = new Date().toISOString();

    // Unset all other defaults
    const unsetStmt = db.prepare(`
      UPDATE pen_names SET is_default = 0, updated_at = ? WHERE user_id = ? AND is_default = 1
    `);
    unsetStmt.run(now, userId);

    // Set this one as default
    const setStmt = db.prepare(`
      UPDATE pen_names SET is_default = 1, updated_at = ? WHERE id = ?
    `);
    const result = setStmt.run(now, penNameId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pen name not found' },
      });
    }

    logger.info({ penNameId }, 'Set pen name as default');

    res.json({ success: true, message: 'Default pen name updated' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error setting default pen name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
