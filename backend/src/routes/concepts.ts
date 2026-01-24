import { Router } from 'express';
import { generateConcepts } from '../services/concept-generator.js';

const router = Router();

/**
 * POST /api/concepts/generate
 * Generate 5 story concepts based on user preferences
 */
router.post('/generate', async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing preferences in request body',
        },
      });
    }

    // Validate required fields
    const { genre, subgenre, tone, themes, targetLength } = preferences;
    if (!genre || !subgenre || !tone || !themes || !targetLength) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required preference fields',
        },
      });
    }

    if (!Array.isArray(themes) || themes.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Themes must be a non-empty array',
        },
      });
    }

    console.log('[API] Generating concepts for preferences:', {
      genre,
      subgenre,
      tone,
      themes: themes.length,
    });

    // Generate concepts using Claude AI
    const concepts = await generateConcepts(preferences);

    res.json({
      success: true,
      concepts,
    });
  } catch (error: any) {
    console.error('[API] Error generating concepts:', error);

    // Check if it's a rate limit error
    if (error.message?.includes('rate limit') || error.status === 429) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Claude API rate limit reached. Please try again in a few minutes.',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate concepts',
      },
    });
  }
});

export default router;
