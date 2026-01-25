import { Router } from 'express';
import { storyIdeasGenerator, GeneratedIdea, RegeneratableSection } from '../services/story-ideas-generator.js';
import { sendBadRequest, sendInternalError, sendRateLimitError, isRateLimitError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { generateStoryIdeasSchema, regenerateSectionSchema, validateRequest } from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:story-ideas');

/**
 * POST /api/story-ideas/generate
 * Generate a batch of creative story ideas based on genre/preferences
 */
router.post('/generate', async (req, res) => {
  try {
    // Validate request body with Zod
    const validation = validateRequest(generateStoryIdeasSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { genre, subgenre, tone, themes, count } = validation.data;

    logger.info({
      genre,
      subgenre,
      tone,
      themesCount: themes?.length || 0,
      count,
    }, 'Generating story ideas');

    const ideas = await storyIdeasGenerator.generateIdeas({
      genre,
      subgenre,
      tone,
      themes,
      count,
    });

    res.json({ success: true, ideas });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'generating story ideas');
  }
});

/**
 * POST /api/story-ideas/regenerate-section
 * Regenerate a specific section of an existing idea
 */
router.post('/regenerate-section', async (req, res) => {
  try {
    // Validate request body with Zod
    const validation = validateRequest(regenerateSectionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { ideaId, section, context } = validation.data;

    logger.info({
      ideaId,
      section,
    }, 'Regenerating idea section');

    const newItems = await storyIdeasGenerator.regenerateSection(
      ideaId,
      section as RegeneratableSection,
      context
    );

    res.json({
      success: true,
      section,
      items: newItems,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'regenerating section');
  }
});

export default router;
