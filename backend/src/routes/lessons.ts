import express from 'express';
import { lessonsService } from '../services/lessons.js';

const router = express.Router();

/**
 * GET /api/lessons
 * Query lessons with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { agent_type, scope, category, limit } = req.query;

    const lessons = await lessonsService.query({
      agent_type: agent_type as string,
      scope: scope as string,
      category: category as any,
      limit: limit ? Number(limit) : 100,
    });

    res.json(lessons);
  } catch (error) {
    console.error('[Lessons] Query error:', error);
    res.status(500).json({ error: 'Failed to query lessons' });
  }
});

/**
 * GET /api/lessons/:id
 * Get a single lesson by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const lesson = await lessonsService.getById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);
  } catch (error) {
    console.error('[Lessons] Get error:', error);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

/**
 * POST /api/lessons
 * Create a new lesson
 */
router.post('/', async (req, res) => {
  try {
    const { agent_type, scope, category, title, content, context, tags } = req.body;

    // Validation
    if (!agent_type || !scope || !category || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: agent_type, scope, category, title, content',
      });
    }

    const lesson = await lessonsService.create({
      agent_type,
      scope,
      category,
      title,
      content,
      context,
      tags,
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('[Lessons] Create error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

/**
 * PATCH /api/lessons/:id
 * Update a lesson
 */
router.patch('/:id', async (req, res) => {
  try {
    const { title, content, category, scope, context, tags } = req.body;

    await lessonsService.update(req.params.id, {
      title,
      content,
      category,
      scope,
      context,
      tags,
    });

    const updated = await lessonsService.getById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('[Lessons] Update error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

/**
 * PATCH /api/lessons/:id/score
 * Update lesson score
 */
router.patch('/:id/score', async (req, res) => {
  try {
    const { increment } = req.body;

    if (typeof increment !== 'number') {
      return res.status(400).json({ error: 'increment must be a number' });
    }

    await lessonsService.updateScore(req.params.id, increment);

    const updated = await lessonsService.getById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('[Lessons] Score update error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

/**
 * DELETE /api/lessons/:id
 * Delete a lesson
 */
router.delete('/:id', async (req, res) => {
  try {
    await lessonsService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Lessons] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

/**
 * POST /api/lessons/prune
 * Prune lessons with negative scores
 */
router.post('/prune', async (req, res) => {
  try {
    const { threshold } = req.body;
    const count = await lessonsService.pruneNegativeScores(threshold || -2);

    res.json({
      success: true,
      pruned: count,
    });
  } catch (error) {
    console.error('[Lessons] Prune error:', error);
    res.status(500).json({ error: 'Failed to prune lessons' });
  }
});

export default router;
