/**
 * Project Progress Routes
 * Handles progress tracking and statistics for projects
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import type { Project } from '../../shared/types/index.js';
import { createLogger } from '../../services/logger.service.js';
import { formatTimeRemaining } from './utils.js';

const router = Router();
const logger = createLogger('routes:projects:progress');

/**
 * GET /api/projects/:id/progress
 * Get comprehensive progress data for a project
 */
router.get('/:id/progress', (req, res) => {
  try {
    const projectId = req.params.id;

    // Step 1: Fetch project
    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Step 2: Fetch all books for the project and their active versions
    const booksStmt = db.prepare<[string], any>(`
      SELECT b.id, bv.id as active_version_id, bv.version_number, bv.version_name
      FROM books b
      LEFT JOIN book_versions bv ON b.id = bv.book_id AND bv.is_active = 1
      WHERE b.project_id = ?
    `);
    const books = booksStmt.all(projectId);

    // Step 3: Fetch chapters for ACTIVE VERSIONS ONLY
    const chaptersStmt = db.prepare(`
      SELECT
        c.id,
        c.book_id,
        c.version_id,
        c.chapter_number,
        c.title,
        c.status,
        c.word_count,
        c.flags,
        c.created_at,
        c.updated_at
      FROM chapters c
      INNER JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ?
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY b.book_number ASC, c.chapter_number ASC
    `);
    const allChapters = chaptersStmt.all(projectId) as any[];

    // Calculate chapter statistics
    const chapterStats = {
      total: allChapters.length,
      completed: allChapters.filter(ch => ch.status === 'completed' || (ch.word_count || 0) > 0).length,
      inProgress: allChapters.filter(ch => (ch.status === 'writing' || ch.status === 'editing') && (ch.word_count || 0) === 0).length,
      pending: allChapters.filter(ch => ch.status === 'pending').length,
    };

    logger.info({
      projectId,
      bookCount: books.length,
      bookIds: books.map((b: any) => b.id),
      total: chapterStats.total,
      completed: chapterStats.completed,
      inProgress: chapterStats.inProgress,
      pending: chapterStats.pending,
      sampleWordCounts: allChapters.slice(0, 5).map(ch => ({ num: ch.chapter_number, wc: ch.word_count, st: ch.status, bookId: ch.book_id })),
    }, 'Chapter stats calculation');

    // Calculate word count metrics
    const totalWordCount = allChapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const targetWordCount = 80000;
    const averagePerChapter = chapterStats.completed > 0
      ? Math.round(totalWordCount / chapterStats.completed)
      : 2250;

    // Step 4: Fetch queue statistics
    const queueStmt = db.prepare(`
      SELECT
        j.status,
        COUNT(*) as count
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ?
        AND (c.version_id IS NULL OR bv.is_active = 1)
      GROUP BY j.status
    `);
    const queueResults = queueStmt.all(projectId) as any[];

    const queueStats = {
      pending: 0,
      running: 0,
      completed: 0,
      paused: 0,
    };

    queueResults.forEach((row: any) => {
      if (row.status === 'pending') queueStats.pending = row.count;
      if (row.status === 'running') queueStats.running = row.count;
      if (row.status === 'completed') queueStats.completed = row.count;
      if (row.status === 'paused') queueStats.paused = row.count;
    });

    // Step 5: Get current activity
    const currentActivityStmt = db.prepare(`
      SELECT
        j.id as job_id,
        j.type as job_type,
        j.started_at,
        c.id as chapter_id,
        c.chapter_number
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ? AND j.status = 'running'
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY j.started_at DESC
      LIMIT 1
    `);
    const currentActivity = currentActivityStmt.get(projectId) as any;

    // Step 6: Get recent events
    const recentEventsStmt = db.prepare(`
      SELECT
        j.id,
        j.type,
        j.completed_at,
        c.chapter_number
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ? AND j.status = 'completed'
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY j.completed_at DESC
      LIMIT 10
    `);

    const formatJobType = (jobType: string): string => {
      const labels: Record<string, string> = {
        'generate_chapter': 'Writing completed',
        'dev_edit': 'Developmental edit completed',
        'author_revision': 'Author revision completed',
        'line_edit': 'Line edit completed',
        'continuity_check': 'Continuity check completed',
        'copy_edit': 'Copy edit completed',
        'generate_summary': 'Summary generated',
        'update_states': 'Character states updated',
      };
      return labels[jobType] || jobType.replace(/_/g, ' ');
    };

    const recentEvents = (recentEventsStmt.all(projectId) as any[]).map((event: any) => ({
      timestamp: event.completed_at,
      type: event.type,
      message: `${formatJobType(event.type)} for Chapter ${event.chapter_number}`,
    }));

    // Step 7: Calculate flag statistics
    let flagStats = {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const chapter of allChapters) {
      if (chapter.flags) {
        try {
          const flags = JSON.parse(chapter.flags);
          if (Array.isArray(flags)) {
            flagStats.total += flags.length;
            flags.forEach((flag: any) => {
              if (flag.severity === 'critical') flagStats.critical++;
              else if (flag.severity === 'warning') flagStats.warning++;
              else if (flag.severity === 'info') flagStats.info++;
            });
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Step 8: Calculate time estimates
    const completedJobsStmt = db.prepare(`
      SELECT
        j.started_at,
        j.completed_at
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
        AND j.type = 'generate_chapter'
        AND j.status = 'completed'
        AND j.started_at IS NOT NULL
        AND j.completed_at IS NOT NULL
      ORDER BY j.completed_at DESC
      LIMIT 20
    `);
    const completedJobs = completedJobsStmt.all(projectId) as any[];

    let averageChapterTime = 0;
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        const start = new Date(job.started_at).getTime();
        const end = new Date(job.completed_at).getTime();
        return sum + (end - start);
      }, 0);
      averageChapterTime = totalTime / completedJobs.length;
      logger.info({
        completedJobsCount: completedJobs.length,
        totalTimeMs: totalTime,
        averageChapterTimeMs: averageChapterTime,
        averageChapterTimeSec: Math.round(averageChapterTime / 1000),
      }, 'Time estimate calculation');
    }

    const remainingChapters = allChapters.length - chapterStats.completed;
    const estimatedRemaining = averageChapterTime * remainingChapters;

    logger.info({
      totalChapters: allChapters.length,
      completedChapters: chapterStats.completed,
      remainingChapters,
      estimatedRemainingMs: estimatedRemaining,
      estimatedRemainingMin: Math.round(estimatedRemaining / 60000),
    }, 'Progress calculation');

    // Step 9: Get rate limit status
    const rateLimitStmt = db.prepare(`
      SELECT
        is_active,
        requests_this_session,
        session_resets_at
      FROM session_tracking
      WHERE id = 1
    `);
    const rateLimitData = rateLimitStmt.get() as any;

    let rateLimitStatus = undefined;
    if (rateLimitData && rateLimitData.is_active) {
      const resetTime = rateLimitData.session_resets_at ? new Date(rateLimitData.session_resets_at) : null;
      const now = new Date();
      const timeRemaining = resetTime ? Math.max(0, resetTime.getTime() - now.getTime()) : 0;

      rateLimitStatus = {
        isActive: Boolean(rateLimitData.is_active),
        requestsThisSession: rateLimitData.requests_this_session || 0,
        timeRemaining: resetTime ? formatTimeRemaining(timeRemaining) : 'N/A',
        resetTime: resetTime ? resetTime.toISOString() : null,
      };
    }

    // Get active version info
    const firstBook = books[0];
    const activeVersion = firstBook?.active_version_id ? {
      id: firstBook.active_version_id,
      versionNumber: firstBook.version_number,
      versionName: firstBook.version_name,
    } : null;

    // Construct response
    const response = {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
      },
      chapters: chapterStats,
      wordCount: {
        current: totalWordCount,
        target: targetWordCount,
        averagePerChapter,
      },
      timeEstimates: {
        averageChapterTime: Math.round(averageChapterTime),
        estimatedRemaining: Math.round(estimatedRemaining),
      },
      queue: queueStats,
      currentActivity: currentActivity ? {
        chapterId: currentActivity.chapter_id,
        chapterNumber: currentActivity.chapter_number,
        jobType: currentActivity.job_type,
        startedAt: currentActivity.started_at,
      } : undefined,
      recentEvents,
      flags: flagStats,
      rateLimitStatus,
      activeVersion,
    };

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project progress');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
