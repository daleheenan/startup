/**
 * Thriller commercial routes
 * API endpoints for thriller pacing, hooks, twists, and time pressure
 */

import { Router, Request, Response } from 'express';
import { thrillerCommercialService } from '../../services/index.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects:thriller');

// POST /api/projects/:id/thriller-pacing
// Set pacing configuration
router.post('/:id/thriller-pacing', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { pacingStyle, chapterHookRequired, cliffhangerFrequency, actionSceneRatio, averageChapterTension } =
      req.body;

    if (!pacingStyle) {
      return res.status(400).json({ error: 'Pacing style is required' });
    }

    const config = await thrillerCommercialService.setPacingStyle(projectId, pacingStyle, {
      chapterHookRequired,
      cliffhangerFrequency,
      actionSceneRatio,
      averageChapterTension,
    });

    logger.info({ projectId, pacingStyle }, 'Thriller pacing set');
    res.json(config);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error setting thriller pacing');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-pacing
// Get pacing configuration
router.get('/:id/thriller-pacing', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const config = await thrillerCommercialService.getPacingConfig(projectId);

    if (!config) {
      return res.status(404).json({ error: 'No thriller pacing found for this project' });
    }

    res.json(config);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting thriller pacing');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/thriller-hooks
// Add a chapter hook
router.post('/:id/thriller-hooks', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { chapterNumber, hookType, hookDescription, tensionLevel } = req.body;

    if (!chapterNumber || !hookType || tensionLevel === undefined) {
      return res.status(400).json({ error: 'chapterNumber, hookType, and tensionLevel are required' });
    }

    const hook = await thrillerCommercialService.addChapterHook(
      projectId,
      chapterNumber,
      hookType,
      hookDescription,
      tensionLevel
    );

    logger.info({ projectId, chapterNumber, hookType }, 'Chapter hook added');
    res.json(hook);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error adding chapter hook');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-hooks
// Get all chapter hooks
router.get('/:id/thriller-hooks', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const hooks = await thrillerCommercialService.getChapterHooks(projectId);

    res.json(hooks);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting chapter hooks');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/thriller-twists
// Add a twist/reveal
router.post('/:id/thriller-twists', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { chapterNumber, twistType, setupChapters, description, impactLevel, foreshadowed } = req.body;

    if (!twistType || !description) {
      return res.status(400).json({ error: 'twistType and description are required' });
    }

    const twist = await thrillerCommercialService.addTwist(
      projectId,
      chapterNumber,
      twistType,
      setupChapters || [],
      description,
      impactLevel,
      foreshadowed
    );

    logger.info({ projectId, twistType }, 'Twist added');
    res.json(twist);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error adding twist');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-twists
// Get all twists
router.get('/:id/thriller-twists', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const twists = await thrillerCommercialService.getTwists(projectId);

    res.json(twists);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting twists');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-twists/:twistId/validate
// Validate twist setup
router.get('/:id/thriller-twists/:twistId/validate', async (req: Request, res: Response) => {
  try {
    const { id: projectId, twistId } = req.params;
    const validation = await thrillerCommercialService.validateTwistSetup(projectId, twistId);

    res.json(validation);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error validating twist');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/thriller-time-pressure
// Add a ticking clock
router.post('/:id/thriller-time-pressure', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { clockType, description, startChapter, resolutionChapter, stakes, timeRemaining, reminderFrequency, active } =
      req.body;

    if (!clockType || !description) {
      return res.status(400).json({ error: 'clockType and description are required' });
    }

    const clock = await thrillerCommercialService.addTickingClock(projectId, clockType, description, {
      startChapter,
      resolutionChapter,
      stakes,
      timeRemaining,
      reminderFrequency,
      active,
    });

    logger.info({ projectId, clockType }, 'Ticking clock added');
    res.json(clock);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error adding ticking clock');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-time-pressure
// Get active time pressure elements
router.get('/:id/thriller-time-pressure', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { includeInactive } = req.query;

    let clocks;
    if (includeInactive === 'true') {
      // Return all clocks (need to add getAllTimePressure method)
      clocks = await thrillerCommercialService.getActiveTimePressure(projectId);
    } else {
      clocks = await thrillerCommercialService.getActiveTimePressure(projectId);
    }

    res.json(clocks);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting time pressure');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/thriller-time-pressure/:clockId/deactivate
// Deactivate a ticking clock
router.put('/:id/thriller-time-pressure/:clockId/deactivate', async (req: Request, res: Response) => {
  try {
    const { clockId } = req.params;
    await thrillerCommercialService.deactivateTickingClock(clockId);

    logger.info({ clockId }, 'Ticking clock deactivated');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, clockId: req.params.clockId }, 'Error deactivating ticking clock');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-tension-curve
// Calculate tension curve
router.get('/:id/thriller-tension-curve', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { totalChapters } = req.query;

    if (!totalChapters) {
      return res.status(400).json({ error: 'totalChapters query parameter is required' });
    }

    const curve = await thrillerCommercialService.calculateTensionCurve(
      projectId,
      parseInt(totalChapters as string, 10)
    );

    res.json(curve);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error calculating tension curve');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/thriller-pacing/validate
// Validate pacing meets requirements
router.get('/:id/thriller-pacing/validate', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { totalChapters } = req.query;

    if (!totalChapters) {
      return res.status(400).json({ error: 'totalChapters query parameter is required' });
    }

    const validation = await thrillerCommercialService.validatePacing(
      projectId,
      parseInt(totalChapters as string, 10)
    );

    res.json(validation);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error validating pacing');
    res.status(500).json({ error: error.message });
  }
});

export default router;
