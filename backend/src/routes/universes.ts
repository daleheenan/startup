import { Router } from 'express';
import { universeService } from '../services/universe.service.js';
import { createLogger } from '../services/logger.service.js';
import {
  createUniverseSchema,
  linkProjectToUniverseSchema,
  validateRequest,
  type CreateUniverseInput,
  type LinkProjectToUniverseInput,
} from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:universes');

/**
 * GET /api/universes
 * List all universes
 */
router.get('/', (req, res) => {
  try {
    const universes = universeService.getAll();
    res.json({ universes });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching universes');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/universes/source-projects
 * Get all projects that can serve as universe sources
 */
router.get('/source-projects', (req, res) => {
  try {
    const projects = universeService.getSourceProjects();
    res.json({ projects });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching source projects');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/universes/:id
 * Get universe details
 */
router.get('/:id', (req, res) => {
  try {
    const universe = universeService.getById(req.params.id);

    if (!universe) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Universe not found' },
      });
    }

    res.json(universe);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching universe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/universes/:id/projects
 * Get universe with all its projects
 */
router.get('/:id/projects', (req, res) => {
  try {
    const universeWithProjects = universeService.getWithProjects(req.params.id);

    if (!universeWithProjects) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Universe not found' },
      });
    }

    res.json(universeWithProjects);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching universe projects');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/universes/:id/inherit
 * Get inheritable elements from a universe
 */
router.get('/:id/inherit', (req, res) => {
  try {
    const elements = universeService.getInheritableElements(req.params.id);
    res.json(elements);
  } catch (error: any) {
    if (error.message === 'Universe not found') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Universe not found' },
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching inheritable elements');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/universes
 * Create a new universe from an existing project
 */
router.post('/', (req, res) => {
  try {
    const validation = validateRequest(createUniverseSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { sourceProjectId, name, description } = validation.data;

    const universe = universeService.createFromProject(sourceProjectId, name, description);
    res.status(201).json(universe);
  } catch (error: any) {
    if (error.message === 'Source project not found') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Source project not found' },
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error creating universe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/universes/:id/link
 * Link a project to an existing universe
 */
router.post('/:id/link', (req, res) => {
  try {
    const validation = validateRequest(linkProjectToUniverseSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { projectId } = validation.data;

    universeService.linkProjectToUniverse(projectId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Project not found') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error linking project to universe');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
