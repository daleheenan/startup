import express from 'express';
import { genreConventionsService } from '../services/genre-conventions.service.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:genre-conventions');

/**
 * POST /api/genre-conventions/validate
 * Validate an outline against genre conventions
 */
router.post('/validate', (req, res) => {
  try {
    const { genre, outline } = req.body;

    if (!genre || !outline) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: genre and outline',
      });
    }

    const result = genreConventionsService.validateOutline(genre, outline);

    res.json({
      success: true,
      validation: result,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, genre: req.body.genre }, 'Error validating genre conventions');
    res.status(500).json({
      success: false,
      error: 'Failed to validate genre conventions',
    });
  }
});

/**
 * GET /api/genre-conventions/genres/:genre
 * Get conventions for a specific genre
 */
router.get('/genres/:genre', (req, res) => {
  try {
    const { genre } = req.params;
    const conventions = genreConventionsService.getGenreConventions(genre);

    if (conventions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No conventions defined for genre: ${genre}`,
      });
    }

    res.json({
      success: true,
      genre,
      conventions,
      count: conventions.length,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, genre: req.params.genre }, 'Error fetching genre conventions');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch genre conventions',
    });
  }
});

/**
 * GET /api/genre-conventions/genres
 * Get list of all genres with conventions
 */
router.get('/genres', (req, res) => {
  try {
    const genres = genreConventionsService.getAvailableGenres();

    res.json({
      success: true,
      genres,
      count: genres.length,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error fetching available genres');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available genres',
    });
  }
});

export default router;
