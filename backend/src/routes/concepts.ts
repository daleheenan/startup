import { Router } from 'express';
import { generateConcepts, refineConcepts } from '../services/concept-generator.js';

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

    // Validate required fields - support both old and new formats
    const { genre, genres, subgenre, subgenres, tone, themes, targetLength } = preferences;

    // Check for at least one genre format
    const hasGenre = genre || (genres && genres.length > 0);
    const hasSubgenre = subgenre || (subgenres && subgenres.length > 0);

    if (!hasGenre || !hasSubgenre || !tone || !themes || !targetLength) {
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
      genre: genre || genres?.join(' + '),
      subgenre: subgenre || subgenres?.join(', '),
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

/**
 * POST /api/concepts/refine
 * Refine concepts based on user feedback
 */
router.post('/refine', async (req, res) => {
  try {
    const { preferences, existingConcepts, feedback } = req.body;

    if (!preferences || !existingConcepts || !feedback) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing preferences, existingConcepts, or feedback in request body',
        },
      });
    }

    if (!Array.isArray(existingConcepts) || existingConcepts.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'existingConcepts must be a non-empty array',
        },
      });
    }

    if (typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'feedback must be a non-empty string',
        },
      });
    }

    console.log('[API] Refining concepts with feedback:', {
      existingCount: existingConcepts.length,
      feedbackLength: feedback.length,
    });

    // Refine concepts using Claude AI
    const concepts = await refineConcepts(preferences, existingConcepts, feedback.trim());

    res.json({
      success: true,
      concepts,
    });
  } catch (error: any) {
    console.error('[API] Error refining concepts:', error);

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
        message: error.message || 'Failed to refine concepts',
      },
    });
  }
});

export default router;
