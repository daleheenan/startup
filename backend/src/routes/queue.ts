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
