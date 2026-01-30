import express from 'express';
import { reflectionsService } from '../services/reflections.js';
import { createLogger } from '../services/logger.service.js';
import {
  createReflectionSchema,
  promoteReflectionSchema,
  validateRequest,
  type CreateReflectionInput,
  type PromoteReflectionInput,
} from '../utils/schemas.js';

const router = express.Router();
const logger = createLogger('routes:reflections');

/**
 * GET /api/reflections
 * Query reflections with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { agent_type, job_id, chapter_id, project_id, unpromoted, limit } = req.query;

    const reflections = await reflectionsService.query({
      agent_type: agent_type as string,
      job_id: job_id as string,
      chapter_id: chapter_id as string,
      project_id: project_id as string,
      unpromoted: unpromoted === 'true',
      limit: limit ? Number(limit) : 100,
    });

    res.json(reflections);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Query error');
    res.status(500).json({ error: 'Failed to query reflections' });
  }
});

/**
 * GET /api/reflections/:id
 * Get a single reflection by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const reflection = await reflectionsService.getById(req.params.id);

    if (!reflection) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    res.json(reflection);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, reflectionId: req.params.id }, 'Get error');
    res.status(500).json({ error: 'Failed to get reflection' });
  }
});

/**
 * POST /api/reflections
 * Create a new reflection
 */
router.post('/', async (req, res) => {
  try {
    const validation = validateRequest(createReflectionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.message,
      });
    }

    const { job_id, agent_type, chapter_id, project_id, reflection } = validation.data;

    const created = await reflectionsService.create({
      job_id,
      agent_type,
      chapter_id,
      project_id,
      reflection,
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Create error');
    res.status(500).json({ error: 'Failed to create reflection' });
  }
});

/**
 * PATCH /api/reflections/:id/promote
 * Link a reflection to a lesson
 */
router.patch('/:id/promote', async (req, res) => {
  try {
    const validation = validateRequest(promoteReflectionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    const { lesson_id } = validation.data;

    await reflectionsService.linkToLesson(req.params.id, lesson_id);

    const updated = await reflectionsService.getById(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, reflectionId: req.params.id }, 'Promote error');
    res.status(500).json({ error: 'Failed to promote reflection' });
  }
});

export default router;
