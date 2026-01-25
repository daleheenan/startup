import { Router } from 'express';
import { generateConcepts, refineConcepts } from '../services/concept-generator.js';
import { sendBadRequest, sendInternalError, sendRateLimitError, isRateLimitError } from '../utils/response-helpers.js';
import { validateNonEmptyArray } from '../utils/validation.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:concepts');

/**
 * POST /api/concepts/generate
 * Generate 5 story concepts based on user preferences
 */
router.post('/generate', async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences) {
      return sendBadRequest(res, 'Missing preferences in request body');
    }

    const { genre, genres, subgenre, subgenres, tone, themes, targetLength } = preferences;

    const hasGenre = genre || (genres && genres.length > 0);
    const hasSubgenre = subgenre || (subgenres && subgenres.length > 0);

    if (!hasGenre || !hasSubgenre || !tone || !themes || !targetLength) {
      return sendBadRequest(res, 'Missing required preference fields');
    }

    const validationError = validateNonEmptyArray(themes, 'themes');
    if (validationError) {
      return sendBadRequest(res, validationError);
    }

    logger.info({
      genre: genre || genres?.join(' + '),
      subgenre: subgenre || subgenres?.join(', '),
      tone,
      themesCount: themes.length,
    }, 'Generating concepts for preferences');

    const concepts = await generateConcepts(preferences);

    res.json({ success: true, concepts });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'generating concepts');
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
      return sendBadRequest(res, 'Missing preferences, existingConcepts, or feedback in request body');
    }

    const validationError = validateNonEmptyArray(existingConcepts, 'existingConcepts');
    if (validationError) {
      return sendBadRequest(res, validationError);
    }

    if (typeof feedback !== 'string' || feedback.trim().length === 0) {
      return sendBadRequest(res, 'feedback must be a non-empty string');
    }

    logger.info({
      existingCount: existingConcepts.length,
      feedbackLength: feedback.length,
    }, 'Refining concepts with feedback');

    const concepts = await refineConcepts(preferences, existingConcepts, feedback.trim());

    res.json({ success: true, concepts });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'refining concepts');
  }
});

export default router;
