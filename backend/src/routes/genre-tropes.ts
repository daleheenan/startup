import express from 'express';
import { genreTropesService } from '../services/genre-tropes.service.js';
import { createLogger } from '../services/logger.service.js';
import { cache } from '../services/cache.service.js';

const router = express.Router();
const logger = createLogger('routes:genre-tropes');

// Cache TTL in seconds
const CACHE_TTL = 3600; // 1 hour for genre tropes (static/semi-static data)

/**
 * GET /api/genre-tropes
 * Get tropes with optional filters
 */
router.get('/', (req, res) => {
  try {
    const filters = {
      genre: req.query.genre as string | undefined,
      subgenre: req.query.subgenre as string | undefined,
      trope_type: req.query.trope_type as string | undefined,
      usage_frequency: req.query.usage_frequency as string | undefined,
    };

    // Create cache key from filter parameters
    const cacheKey = `genre-tropes:list:${JSON.stringify(filters)}`;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info({ filters }, 'Genre tropes cache hit');
      return res.json(cached);
    }

    const tropes = genreTropesService.getTropes(filters);

    const response = {
      success: true,
      tropes,
      count: tropes.length,
    };

    // Cache the result
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error fetching tropes');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tropes',
    });
  }
});

/**
 * GET /api/genre-tropes/genres/:genre
 * Get all tropes for a specific genre
 */
router.get('/genres/:genre', (req, res) => {
  try {
    const { genre } = req.params;
    const subgenre = req.query.subgenre as string | undefined;

    const cacheKey = `genre-tropes:genre:${genre}:${subgenre || 'all'}`;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info({ genre, subgenre }, 'Genre tropes by genre cache hit');
      return res.json(cached);
    }

    const tropes = genreTropesService.getTropesByGenre(genre, subgenre);

    const response = {
      success: true,
      genre,
      subgenre,
      tropes,
      count: tropes.length,
    };

    // Cache the result
    cache.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, genre: req.params.genre }, 'Error fetching tropes for genre');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tropes for genre',
    });
  }
});

/**
 * POST /api/genre-tropes/recommended
 * Get recommended tropes based on selected genres and subgenres
 */
router.post('/recommended', (req, res) => {
  try {
    const { genres = [], subgenres = [] } = req.body;

    if (!Array.isArray(genres)) {
      return res.status(400).json({
        success: false,
        error: 'Genres must be an array',
      });
    }

    const tropes = genreTropesService.getRecommendedTropes(genres, subgenres);

    res.json({
      success: true,
      genres,
      subgenres,
      tropes,
      count: tropes.length,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error fetching recommended tropes');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommended tropes',
    });
  }
});

/**
 * GET /api/genre-tropes/:id
 * Get a single trope by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const trope = genreTropesService.getTropeById(id);

    if (!trope) {
      return res.status(404).json({
        success: false,
        error: 'Trope not found',
      });
    }

    res.json({
      success: true,
      trope,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, tropeId: req.params.id }, 'Error fetching trope');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trope',
    });
  }
});

/**
 * POST /api/genre-tropes (admin only - not secured for now)
 * Create a new trope
 */
router.post('/', (req, res) => {
  try {
    const {
      trope_name,
      description,
      genre,
      subgenre,
      trope_type,
      usage_frequency = 'moderate',
      compatibility_tags = [],
      warning_tags = [],
      examples = [],
      subversions = [],
    } = req.body;

    // Validation
    if (!trope_name || !description || !genre || !trope_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: trope_name, description, genre, trope_type',
      });
    }

    const validTropeTypes = ['character', 'plot', 'setting', 'relationship', 'theme', 'device'];
    if (!validTropeTypes.includes(trope_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid trope_type. Must be one of: ${validTropeTypes.join(', ')}`,
      });
    }

    const validFrequencies = ['common', 'moderate', 'rare'];
    if (!validFrequencies.includes(usage_frequency)) {
      return res.status(400).json({
        success: false,
        error: `Invalid usage_frequency. Must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    const trope = genreTropesService.createTrope({
      trope_name,
      description,
      genre,
      subgenre,
      trope_type,
      usage_frequency,
      compatibility_tags,
      warning_tags,
      examples,
      subversions,
    });

    // Invalidate all genre-tropes caches since we added new data
    cache.invalidate('genre-tropes:');
    logger.info({ trope_name, genre }, 'Created new trope, invalidated cache');

    res.status(201).json({
      success: true,
      trope,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error creating trope');
    res.status(500).json({
      success: false,
      error: 'Failed to create trope',
    });
  }
});

export default router;
