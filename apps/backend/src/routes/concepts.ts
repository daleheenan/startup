import { Router } from 'express';
import { generateConcepts, refineConcepts, generateConceptSummaries, expandSummariesToConcepts } from '../services/concept-generator.js';
import { sendBadRequest, sendInternalError, sendRateLimitError, isRateLimitError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { generateConceptsSchema, refineConceptsSchema, validateRequest } from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:concepts');

/**
 * POST /api/concepts/generate
 * Generate story concepts based on user preferences
 * Supports count parameter (default: 5, max: 10)
 */
router.post('/generate', async (req, res) => {
  try {
    // Validate request body with Zod
    const validation = validateRequest(generateConceptsSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { preferences, count = 5 } = validation.data;

    // Normalize preferences: ensure genre is set from genres array if needed
    const normalizedPreferences = {
      ...preferences,
      genre: preferences.genre || (preferences.genres && preferences.genres[0]) || '',
      targetLength: typeof preferences.targetLength === 'string'
        ? parseInt(preferences.targetLength, 10)
        : preferences.targetLength,
    };

    logger.info({
      genre: normalizedPreferences.genre || preferences.genres?.join(' + '),
      subgenre: preferences.subgenre || preferences.subgenres?.join(', '),
      tone: preferences.tone,
      themesCount: preferences.themes.length,
      count,
    }, 'Generating concepts for preferences');

    const concepts = await generateConcepts(normalizedPreferences as any, count);

    res.json({ success: true, concepts });
  } catch (error) {
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
    // Validate request body with Zod
    const validation = validateRequest(refineConceptsSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { preferences, existingConcepts, feedback } = validation.data;

    logger.info({
      existingCount: existingConcepts.length,
      feedbackLength: feedback.length,
    }, 'Refining concepts with feedback');

    const concepts = await refineConcepts(preferences as any, existingConcepts, feedback);

    res.json({ success: true, concepts });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'refining concepts');
  }
});

/**
 * POST /api/concepts/summaries
 * Generate short concept summaries (Stage 1 of two-stage workflow)
 * Supports count parameter (default: 10, can be 20 for quick mode)
 */
router.post('/summaries', async (req, res) => {
  try {
    const { preferences, count = 10 } = req.body;

    if (!preferences) {
      return sendBadRequest(res, 'Missing preferences');
    }

    // Validate count
    const summaryCount = typeof count === 'number' && count > 0 && count <= 20 ? count : 10;

    // Normalize preferences
    const normalizedPreferences = {
      ...preferences,
      genre: preferences.genre || (preferences.genres && preferences.genres[0]) || '',
      targetLength: typeof preferences.targetLength === 'string'
        ? parseInt(preferences.targetLength, 10)
        : preferences.targetLength,
    };

    logger.info({
      genre: normalizedPreferences.genre || preferences.genres?.join(' + '),
      count: summaryCount,
    }, 'Generating concept summaries');

    const summaries = await generateConceptSummaries(normalizedPreferences as any, summaryCount);

    res.json({ success: true, summaries });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'generating summaries');
  }
});

/**
 * POST /api/concepts/expand
 * Expand selected summaries into full concepts (Stage 2 of two-stage workflow)
 */
router.post('/expand', async (req, res) => {
  try {
    const { preferences, selectedSummaries } = req.body;

    if (!preferences || !selectedSummaries) {
      return sendBadRequest(res, 'Missing preferences or selectedSummaries');
    }

    if (!Array.isArray(selectedSummaries) || selectedSummaries.length === 0) {
      return sendBadRequest(res, 'selectedSummaries must be a non-empty array');
    }

    // Normalize preferences
    const normalizedPreferences = {
      ...preferences,
      genre: preferences.genre || (preferences.genres && preferences.genres[0]) || '',
      targetLength: typeof preferences.targetLength === 'string'
        ? parseInt(preferences.targetLength, 10)
        : preferences.targetLength,
    };

    logger.info({
      selectedCount: selectedSummaries.length,
    }, 'Expanding summaries to full concepts');

    const concepts = await expandSummariesToConcepts(normalizedPreferences as any, selectedSummaries);

    res.json({ success: true, concepts });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'expanding concepts');
  }
});

export default router;
