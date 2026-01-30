/**
 * Images CRUD Routes
 * Sprint 24: Visual Enhancements
 *
 * Handles basic image metadata operations:
 * - GET /api/images - List all images for a project
 * - GET /api/images/:id - Get single image metadata
 * - DELETE /api/images/:id - Delete an image
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';
import { imageGenerationService } from '../../services/image-generation.service.js';

const router = Router();
const logger = createLogger('routes:images:crud');

interface Image {
  id: string;
  project_id: string;
  entity_type: 'character' | 'location' | 'cover' | 'scene';
  entity_id: string | null;
  image_type: 'portrait' | 'landscape' | 'cover' | 'scene_illustration';
  prompt: string;
  style_preset: string | null;
  file_path: string;
  file_size: number;
  width: number;
  height: number;
  generation_params: string;
  status: 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/images
 * Get all images for a project (requires projectId query param)
 */
router.get('/', (req, res) => {
  try {
    const { projectId, entityType, entityId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'projectId query parameter is required' },
      });
    }

    let query = 'SELECT * FROM images WHERE project_id = ?';
    const params: any[] = [projectId];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (entityId) {
      query += ' AND entity_id = ?';
      params.push(entityId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare<any[], Image>(query);
    const images = stmt.all(...params);

    // Parse generation_params JSON
    const imagesWithParsedParams = images.map(img => ({
      ...img,
      generation_params: img.generation_params ? JSON.parse(img.generation_params) : null,
    }));

    res.json({ images: imagesWithParsedParams });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching images');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/images/:id
 * Get single image metadata
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare<[string], Image>('SELECT * FROM images WHERE id = ?');
    const image = stmt.get(id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    // Parse generation_params JSON
    const imageWithParsedParams = {
      ...image,
      generation_params: image.generation_params ? JSON.parse(image.generation_params) : null,
    };

    res.json(imageWithParsedParams);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/images/:id
 * Delete an image (metadata and file)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get image metadata
    const getStmt = db.prepare<[string], Image>('SELECT * FROM images WHERE id = ?');
    const image = getStmt.get(id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    // Delete file if it exists
    if (image.file_path && image.status === 'completed') {
      try {
        await imageGenerationService.deleteImage(image.file_path);
      } catch (error: any) {
        logger.warn({ error: error.message, filePath: image.file_path }, 'Failed to delete image file (continuing with metadata deletion)');
      }
    }

    // Delete metadata
    const deleteStmt = db.prepare('DELETE FROM images WHERE id = ?');
    deleteStmt.run(id);

    logger.info({ imageId: id }, 'Image deleted successfully');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
