import { Router } from 'express';
import { sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import db from '../db/connection.js';

const router = Router();
const logger = createLogger('routes:navigation');

/**
 * GET /api/navigation/counts
 * Get counts for navigation badges in a single optimised query
 *
 * This endpoint consolidates what was previously 3 separate API calls:
 * - /api/story-ideas/saved (filtered by status)
 * - /api/saved-concepts
 * - /api/projects
 *
 * Reducing these to a single endpoint helps prevent rate limiting
 * when navigating between pages.
 */
router.get('/counts', async (req, res) => {
  try {
    // Single query with subqueries for all counts
    const stmt = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM saved_story_ideas WHERE status = 'saved') as story_ideas_saved,
        (SELECT COUNT(*) FROM saved_concepts WHERE status = 'saved') as concepts_saved,
        (SELECT COUNT(*) FROM projects WHERE status != 'completed') as projects_active
    `);

    const result = stmt.get() as {
      story_ideas_saved: number;
      concepts_saved: number;
      projects_active: number;
    };

    res.json({
      success: true,
      counts: {
        storyIdeas: result.story_ideas_saved,
        savedConcepts: result.concepts_saved,
        activeProjects: result.projects_active,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching navigation counts');
    sendInternalError(res, error, 'fetching navigation counts');
  }
});

export default router;
