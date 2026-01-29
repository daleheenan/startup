import { Router } from 'express';
import { QueueWorker } from '../queue/worker.js';
import { sessionTracker } from '../services/session-tracker.js';
import { createLogger } from '../services/logger.service.js';
import type { JobType } from '../shared/types/index.js';
import db from '../db/connection.js';
import {
  createQueueJobSchema,
  validateRequest,
  type CreateQueueJobInput,
} from '../utils/schemas.js';
import { progressEmitter } from './progress.js';

const router = Router();
const logger = createLogger('routes:queue');

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', (req, res) => {
  try {
    const queueStats = QueueWorker.getQueueStats();
    const sessionStats = sessionTracker.getSessionStats();

    res.json({
      queue: queueStats,
      session: sessionStats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching queue stats');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/queue/jobs
 * List all jobs with optional filtering
 */
router.get('/jobs', (req, res) => {
  try {
    const { status, projectId, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT
        j.id,
        j.type,
        j.target_id,
        j.status,
        j.attempts,
        j.error,
        j.checkpoint,
        j.created_at,
        j.started_at,
        j.completed_at,
        c.chapter_number,
        c.title as chapter_title,
        b.book_number,
        b.title as book_title,
        p.id as project_id,
        p.title as project_title
      FROM jobs j
      LEFT JOIN chapters c ON j.target_id = c.id
      LEFT JOIN books b ON c.book_id = b.id
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND j.status = ?';
      params.push(status);
    }

    if (projectId) {
      query += ' AND p.id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const stmt = db.prepare(query);
    const jobs = stmt.all(...params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM jobs j
      LEFT JOIN chapters c ON j.target_id = c.id
      LEFT JOIN books b ON c.book_id = b.id
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE 1=1
    `;

    const countParams: any[] = [];

    if (status && status !== 'all') {
      countQuery += ' AND j.status = ?';
      countParams.push(status);
    }

    if (projectId) {
      countQuery += ' AND p.id = ?';
      countParams.push(projectId);
    }

    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countParams) as any;

    res.json({
      jobs,
      total: countResult?.total || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching jobs');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/queue/jobs/:id
 * Delete a single job
 */
router.delete('/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get job details before deleting for SSE notification
    const jobStmt = db.prepare(`SELECT id, type, target_id FROM jobs WHERE id = ?`);
    const job = jobStmt.get(id) as { id: string; type: string; target_id: string } | undefined;

    const stmt = db.prepare(`DELETE FROM jobs WHERE id = ?`);
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    }

    // Emit job deleted event so frontend can clear the state
    if (job) {
      progressEmitter.emit('job:update', {
        id: job.id,
        type: job.type,
        target_id: job.target_id,
        status: 'deleted',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ jobId: id }, 'Job deleted');
    res.json({ success: true, deleted: 1 });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting job');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/queue/jobs
 * Delete multiple jobs by status or IDs
 * Query params: status (pending|failed|completed|all), ids (comma-separated)
 */
router.delete('/jobs', (req, res) => {
  try {
    const { status, ids } = req.query;

    if (ids) {
      // Delete specific jobs by ID
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const rawIds = (ids as string).split(',').map(id => id.trim());
      const jobIds = rawIds.filter(id => UUID_REGEX.test(id));

      if (jobIds.length === 0) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'No valid job IDs provided' }
        });
      }

      if (jobIds.length !== rawIds.length) {
        logger.warn({ provided: rawIds.length, valid: jobIds.length }, 'Some job IDs were invalid and ignored');
      }

      const placeholders = jobIds.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM jobs WHERE id IN (${placeholders})`);
      const result = stmt.run(...jobIds);

      logger.info({ count: result.changes, jobIds }, 'Jobs deleted by ID');
      return res.json({ success: true, deleted: result.changes });
    }

    if (!status || status === 'all') {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Must specify status or ids to delete jobs' }
      });
    }

    // Delete jobs by status
    const validStatuses = ['pending', 'failed', 'completed', 'paused'];
    if (!validStatuses.includes(status as string)) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
      });
    }

    const stmt = db.prepare(`DELETE FROM jobs WHERE status = ?`);
    const result = stmt.run(status);

    logger.info({ count: result.changes, status }, 'Jobs deleted by status');
    res.json({ success: true, deleted: result.changes });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting jobs');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/queue/test
 * Create a test job
 */
router.post('/test', (req, res) => {
  try {
    const validation = validateRequest(createQueueJobSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { type, targetId } = validation.data;

    const jobId = QueueWorker.createJob(type as JobType, targetId);

    res.status(201).json({
      jobId,
      type,
      targetId,
      status: 'pending',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, type: req.body.type, targetId: req.body.targetId }, 'Error creating test job');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
