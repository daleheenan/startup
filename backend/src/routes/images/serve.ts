/**
 * Images Serving Routes
 * Sprint 24: Visual Enhancements
 *
 * Handles image file serving:
 * - GET /api/images/file/:imageId - Serve image file by ID
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';
import { imageGenerationService } from '../../services/image-generation.service.js';
import { promises as fs } from 'fs';

const router = Router();
const logger = createLogger('routes:images:serve');

interface Image {
  id: string;
  file_path: string;
  status: string;
}

/**
 * GET /api/images/file/:imageId
 * Serve image file
 */
router.get('/file/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    // Get image metadata
    const stmt = db.prepare<[string], Image>('SELECT id, file_path, status FROM images WHERE id = ?');
    const image = stmt.get(imageId);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    if (image.status !== 'completed') {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: `Image is not ready (status: ${image.status})` },
      });
    }

    if (!image.file_path) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image file not found' },
      });
    }

    // Get full file path
    const fullPath = imageGenerationService.getImagePath(image.file_path);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      logger.error({ imageId, path: image.file_path }, 'Image file not found on filesystem');
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image file not found on filesystem' },
      });
    }

    // Set cache headers (images don't change)
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Type', 'image/png');

    // Stream file
    res.sendFile(fullPath);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error serving image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
