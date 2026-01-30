/**
 * Series Routes
 *
 * API endpoints for managing book series.
 * Series are parents of projects/books.
 */

import { Router } from 'express';
import db from '../db/connection.js';
import type { Series, SeriesStatus } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { createLogger } from '../services/logger.service.js';
import { createSeriesRepository } from '../repositories/series.repository.js';

const router = Router();
const logger = createLogger('routes:series');

// Create repository instance
const seriesRepo = createSeriesRepository(db);

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/series
 * List all series with their projects
 */
router.get('/', (_req, res) => {
  try {
    const allSeries = seriesRepo.findAllWithProjects({
      orderBy: 'updated_at DESC',
    });

    // Calculate stats for each series
    const seriesWithStats = allSeries.map(series => {
      const stats = seriesRepo.getSeriesStats(series.id);
      return {
        ...series,
        stats,
      };
    });

    res.json({ series: seriesWithStats });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/series/:id
 * Get a single series with its projects
 */
router.get('/:id', (req, res) => {
  try {
    const seriesId = req.params.id;
    const series = seriesRepo.findWithProjects(seriesId);

    if (!series) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    const stats = seriesRepo.getSeriesStats(seriesId);

    res.json({
      series: {
        ...series,
        stats,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/series
 * Create a new series
 */
router.post('/', (req, res) => {
  try {
    const { title, description, penNameId } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Series title is required' },
      });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const newSeries = seriesRepo.create({
      id,
      title: title.trim(),
      description: description?.trim() || null,
      pen_name_id: penNameId || null,
      series_bible: null,
      status: 'active' as SeriesStatus,
      created_at: now,
      updated_at: now,
    } as any);

    if (!newSeries) {
      return res.status(500).json({
        error: { code: 'CREATE_FAILED', message: 'Failed to create series' },
      });
    }

    logger.info({ seriesId: id, title }, 'Series created');

    res.status(201).json({
      series: {
        id,
        title: title.trim(),
        description: description?.trim() || null,
        series_bible: null,
        status: 'active',
        created_at: now,
        updated_at: now,
        projects: [],
        stats: {
          totalProjects: 0,
          totalWordCount: 0,
          completedProjects: 0,
        },
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/series/:id
 * Update a series
 */
router.put('/:id', (req, res) => {
  try {
    const seriesId = req.params.id;
    const { title, description, status, penNameId } = req.body;

    const existing = seriesRepo.findByIdParsed(seriesId);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Series title cannot be empty' },
        });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (status !== undefined) {
      if (!['active', 'completed', 'on_hold'].includes(status)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid status. Must be active, completed, or on_hold' },
        });
      }
      updates.status = status;
    }

    if (penNameId !== undefined) {
      updates.pen_name_id = penNameId || null;
    }

    const updated = seriesRepo.update(seriesId, updates);
    if (!updated) {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update series' },
      });
    }

    const series = seriesRepo.findWithProjects(seriesId);
    const stats = seriesRepo.getSeriesStats(seriesId);

    logger.info({ seriesId, updates }, 'Series updated');

    res.json({
      series: {
        ...series,
        stats,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/series/:id
 * Delete a series (projects are not deleted, just unlinked)
 */
router.delete('/:id', (req, res) => {
  try {
    const seriesId = req.params.id;

    const existing = seriesRepo.findByIdParsed(seriesId);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    // Unlink all projects from this series first
    const unlinkStmt = db.prepare(`
      UPDATE projects
      SET series_id = NULL, series_book_number = NULL, updated_at = datetime('now')
      WHERE series_id = ?
    `);
    unlinkStmt.run(seriesId);

    // Delete the series
    const deleted = seriesRepo.delete(seriesId);
    if (!deleted) {
      return res.status(500).json({
        error: { code: 'DELETE_FAILED', message: 'Failed to delete series' },
      });
    }

    logger.info({ seriesId }, 'Series deleted');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/series/:id/projects
 * Add a project/book to the series
 */
router.post('/:id/projects', (req, res) => {
  try {
    const seriesId = req.params.id;
    const { projectId, bookNumber } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Project ID is required' },
      });
    }

    const series = seriesRepo.findByIdParsed(seriesId);
    if (!series) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    // Verify project exists
    const projectStmt = db.prepare(`SELECT id, title FROM projects WHERE id = ?`);
    const project = projectStmt.get(projectId) as { id: string; title: string } | undefined;
    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const success = seriesRepo.addProjectToSeries(seriesId, projectId, bookNumber);
    if (!success) {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to add project to series' },
      });
    }

    const updatedSeries = seriesRepo.findWithProjects(seriesId);
    const stats = seriesRepo.getSeriesStats(seriesId);

    logger.info({ seriesId, projectId, bookNumber }, 'Project added to series');

    res.json({
      series: {
        ...updatedSeries,
        stats,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error adding project to series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/series/:id/projects/:projectId
 * Remove a project/book from the series
 */
router.delete('/:id/projects/:projectId', (req, res) => {
  try {
    const seriesId = req.params.id;
    const projectId = req.params.projectId;

    const series = seriesRepo.findByIdParsed(seriesId);
    if (!series) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    const success = seriesRepo.removeProjectFromSeries(projectId);
    if (!success) {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to remove project from series' },
      });
    }

    const updatedSeries = seriesRepo.findWithProjects(seriesId);
    const stats = seriesRepo.getSeriesStats(seriesId);

    logger.info({ seriesId, projectId }, 'Project removed from series');

    res.json({
      series: {
        ...updatedSeries,
        stats,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error removing project from series');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/series/:id/projects/:projectId/order
 * Reorder a project within the series
 */
router.put('/:id/projects/:projectId/order', (req, res) => {
  try {
    const seriesId = req.params.id;
    const projectId = req.params.projectId;
    const { bookNumber } = req.body;

    if (typeof bookNumber !== 'number' || bookNumber < 1) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Book number must be a positive integer' },
      });
    }

    const series = seriesRepo.findByIdParsed(seriesId);
    if (!series) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    const success = seriesRepo.reorderProject(projectId, bookNumber);
    if (!success) {
      return res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: 'Failed to reorder project' },
      });
    }

    const updatedSeries = seriesRepo.findWithProjects(seriesId);
    const stats = seriesRepo.getSeriesStats(seriesId);

    logger.info({ seriesId, projectId, bookNumber }, 'Project reordered in series');

    res.json({
      series: {
        ...updatedSeries,
        stats,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error reordering project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/series/:id/stats
 * Get series statistics
 */
router.get('/:id/stats', (req, res) => {
  try {
    const seriesId = req.params.id;

    const series = seriesRepo.findByIdParsed(seriesId);
    if (!series) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Series not found' },
      });
    }

    const stats = seriesRepo.getSeriesStats(seriesId);

    res.json({ stats });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching series stats');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
