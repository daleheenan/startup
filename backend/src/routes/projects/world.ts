/**
 * Project World Routes
 * Handles world building elements generation and updates
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import type { Project } from '../../shared/types/index.js';
import { generateWorldElements } from '../../services/world-generator.js';
import { createLogger } from '../../services/logger.service.js';
import { safeJsonParse, propagateWorldNameChange } from './utils.js';

const router = Router();
const logger = createLogger('routes:projects:world');

/**
 * POST /api/projects/:id/world
 * Generate world elements for a project
 */
router.post('/:id/world', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Context is required' },
      });
    }

    // Generate world elements
    const worldElements = await generateWorldElements(context);

    // Get existing story bible or create new one
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    const storyBible = project?.story_bible
      ? safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] })
      : { characters: [], world: [], timeline: [] };

    // Update world elements
    storyBible.world = worldElements;

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ world: worldElements });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating world');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/world/:elementId
 * Update a world element
 * If name changes, propagates the change throughout the project
 */
router.put('/:id/world/:elementId', (req, res) => {
  try {
    const { id: projectId, elementId } = req.params;
    const updatedElement = req.body;
    const { propagateToContent } = req.query;

    // Get current story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find and update world element
    const elemIndex = storyBible.world.findIndex((w: any) => w.id === elementId);
    if (elemIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'World element not found' },
      });
    }

    const oldElement = storyBible.world[elemIndex];
    const oldName = oldElement.name;
    const newName = updatedElement.name;

    storyBible.world[elemIndex] = { ...storyBible.world[elemIndex], ...updatedElement };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    // If name changed, propagate to all references
    let propagationStats = null;
    if (oldName && newName && oldName !== newName) {
      propagationStats = propagateWorldNameChange(projectId, oldName, newName, {
        updateChapterContent: propagateToContent === 'true',
      });
      logger.info({ projectId, oldName, newName, stats: propagationStats }, 'World element name propagated');
    }

    res.json({
      element: storyBible.world[elemIndex],
      propagation: propagationStats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating world element');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
