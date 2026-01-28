/**
 * Editorial Board Aggregation Routes
 *
 * Provides a unified view across VEB (Virtual Editorial Board) and
 * Outline Editorial systems. These endpoints aggregate data from:
 * - editorial_reports (VEB)
 * - outline_editorial_reports (Outline Editorial)
 * - veb_feedback
 * - outline_editorial_feedback
 *
 * All routes require authentication (applied at registration in server.ts).
 */

import express from 'express';
import db from '../db/connection.js';
import { sendBadRequest, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:editorial-board');

// =============================================================================
// Database Table Validation
// =============================================================================

interface TableCheckResult {
  exists: boolean;
  missing: string[];
}

/**
 * Check which editorial tables exist in the database.
 * Returns information about both VEB and Outline Editorial tables.
 */
function checkEditorialTablesExist(): {
  veb: TableCheckResult;
  outlineEditorial: TableCheckResult;
  projects: boolean;
} {
  const vebTables = ['editorial_reports', 'veb_feedback'];
  const outlineEditorialTables = ['outline_editorial_reports', 'outline_editorial_feedback'];

  const checkTables = (tables: string[]): TableCheckResult => {
    const missing: string[] = [];
    try {
      for (const table of tables) {
        const result = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name = ?
        `).get(table);
        if (!result) {
          missing.push(table);
        }
      }
      return { exists: missing.length === 0, missing };
    } catch (error) {
      logger.error({ error, tables }, 'Error checking tables');
      return { exists: false, missing: tables };
    }
  };

  // Check if projects table exists (required for JOINs)
  let projectsExist = false;
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name = 'projects'
    `).get();
    projectsExist = !!result;
  } catch {
    projectsExist = false;
  }

  return {
    veb: checkTables(vebTables),
    outlineEditorial: checkTables(outlineEditorialTables),
    projects: projectsExist,
  };
}

// =============================================================================
// Types
// =============================================================================

interface EditorialQueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  reportType: 'veb' | 'outline_editorial';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overallScore: number | null;
  modulesCompleted: number;
  modulesTotal: number;
  createdAt: string;
  completedAt: string | null;
  summary: string | null;
  viewUrl: string;
}

interface EditorialStats {
  totalReports: number;
  byStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  byType: {
    veb: number;
    outline_editorial: number;
  };
  activeProjects: number;
}

interface ActivityEvent {
  timestamp: string;
  eventType: 'report_submitted' | 'report_completed' | 'report_failed' | 'feedback_submitted';
  reportType: 'veb' | 'outline_editorial';
  reportId: string;
  projectId: string;
  projectTitle: string;
  details: Record<string, unknown>;
}

// =============================================================================
// Query Parameter Validation
// =============================================================================

const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed', 'all'] as const;
const VALID_TYPES = ['veb', 'outline_editorial', 'all'] as const;
const VALID_SORT_FIELDS = ['created_at', 'overall_score', 'status'] as const;
const VALID_ORDER = ['asc', 'desc'] as const;

type ValidStatus = typeof VALID_STATUSES[number];
type ValidType = typeof VALID_TYPES[number];
type ValidSortField = typeof VALID_SORT_FIELDS[number];
type ValidOrder = typeof VALID_ORDER[number];

function parseQueueParams(query: Record<string, unknown>): {
  status: ValidStatus;
  type: ValidType;
  projectId: string | null;
  limit: number;
  offset: number;
  sort: ValidSortField;
  order: ValidOrder;
  errors: string[];
} {
  const errors: string[] = [];

  // Status
  const statusParam = (query.status as string || 'all').toLowerCase();
  const status: ValidStatus = VALID_STATUSES.includes(statusParam as ValidStatus)
    ? (statusParam as ValidStatus)
    : 'all';
  if (query.status && !VALID_STATUSES.includes(statusParam as ValidStatus)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Type
  const typeParam = (query.type as string || 'all').toLowerCase();
  const type: ValidType = VALID_TYPES.includes(typeParam as ValidType)
    ? (typeParam as ValidType)
    : 'all';
  if (query.type && !VALID_TYPES.includes(typeParam as ValidType)) {
    errors.push(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Project ID
  const projectId = typeof query.projectId === 'string' && query.projectId.trim()
    ? query.projectId.trim()
    : null;

  // Limit (1-100, default 20)
  let limit = 20;
  if (query.limit !== undefined) {
    const parsedLimit = parseInt(query.limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push('limit must be a number between 1 and 100');
    } else {
      limit = parsedLimit;
    }
  }

  // Offset (>= 0, default 0)
  let offset = 0;
  if (query.offset !== undefined) {
    const parsedOffset = parseInt(query.offset as string, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('offset must be a non-negative number');
    } else {
      offset = parsedOffset;
    }
  }

  // Sort field
  const sortParam = (query.sort as string || 'created_at').toLowerCase();
  const sort: ValidSortField = VALID_SORT_FIELDS.includes(sortParam as ValidSortField)
    ? (sortParam as ValidSortField)
    : 'created_at';
  if (query.sort && !VALID_SORT_FIELDS.includes(sortParam as ValidSortField)) {
    errors.push(`Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(', ')}`);
  }

  // Order
  const orderParam = (query.order as string || 'desc').toLowerCase();
  const order: ValidOrder = VALID_ORDER.includes(orderParam as ValidOrder)
    ? (orderParam as ValidOrder)
    : 'desc';
  if (query.order && !VALID_ORDER.includes(orderParam as ValidOrder)) {
    errors.push(`Invalid order. Must be one of: ${VALID_ORDER.join(', ')}`);
  }

  return { status, type, projectId, limit, offset, sort, order, errors };
}

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * GET /api/editorial/queue
 *
 * Returns a unified list of all editorial reports across all projects.
 * Combines data from VEB (editorial_reports) and Outline Editorial
 * (outline_editorial_reports) tables using UNION ALL.
 *
 * Query Parameters:
 * - status: pending | processing | completed | failed | all (default: all)
 * - type: veb | outline_editorial | all (default: all)
 * - projectId: UUID (optional)
 * - limit: 1-100 (default: 20)
 * - offset: >= 0 (default: 0)
 * - sort: created_at | overall_score | status (default: created_at)
 * - order: asc | desc (default: desc)
 */
router.get('/queue', (req, res) => {
  try {
    const params = parseQueueParams(req.query as Record<string, unknown>);

    if (params.errors.length > 0) {
      return sendBadRequest(res, params.errors.join('; '));
    }

    const tableCheck = checkEditorialTablesExist();

    // If projects table doesn't exist, return empty results
    if (!tableCheck.projects) {
      logger.warn('Projects table not found - returning empty queue');
      return res.json({
        items: [],
        total: 0,
        limit: params.limit,
        offset: params.offset,
      });
    }

    const queries: string[] = [];
    const countQueries: string[] = [];
    const queryParams: (string | number)[] = [];
    const countParams: (string | number)[] = [];

    // Build VEB subquery if tables exist and type includes VEB
    if (tableCheck.veb.exists && (params.type === 'all' || params.type === 'veb')) {
      let vebWhereClause = '1=1';
      if (params.status !== 'all') {
        vebWhereClause += ' AND er.status = ?';
        queryParams.push(params.status);
        countParams.push(params.status);
      }
      if (params.projectId) {
        vebWhereClause += ' AND er.project_id = ?';
        queryParams.push(params.projectId);
        countParams.push(params.projectId);
      }

      queries.push(`
        SELECT
          er.id,
          er.project_id,
          p.title AS project_title,
          'veb' AS report_type,
          er.status,
          er.overall_score,
          (CASE WHEN er.beta_swarm_status = 'completed' THEN 1 ELSE 0 END +
           CASE WHEN er.ruthless_editor_status = 'completed' THEN 1 ELSE 0 END +
           CASE WHEN er.market_analyst_status = 'completed' THEN 1 ELSE 0 END) AS modules_completed,
          3 AS modules_total,
          er.created_at,
          er.completed_at,
          er.summary
        FROM editorial_reports er
        JOIN projects p ON er.project_id = p.id
        WHERE ${vebWhereClause}
      `);

      countQueries.push(`
        SELECT COUNT(*) AS cnt
        FROM editorial_reports er
        WHERE ${vebWhereClause}
      `);
    }

    // Build Outline Editorial subquery if tables exist and type includes outline_editorial
    if (tableCheck.outlineEditorial.exists && (params.type === 'all' || params.type === 'outline_editorial')) {
      let outlineWhereClause = '1=1';
      if (params.status !== 'all') {
        outlineWhereClause += ' AND oer.status = ?';
        queryParams.push(params.status);
        countParams.push(params.status);
      }
      if (params.projectId) {
        outlineWhereClause += ' AND oer.project_id = ?';
        queryParams.push(params.projectId);
        countParams.push(params.projectId);
      }

      queries.push(`
        SELECT
          oer.id,
          oer.project_id,
          p.title AS project_title,
          'outline_editorial' AS report_type,
          oer.status,
          oer.overall_score,
          (CASE WHEN oer.structure_analyst_status = 'completed' THEN 1 ELSE 0 END +
           CASE WHEN oer.character_arc_status = 'completed' THEN 1 ELSE 0 END +
           CASE WHEN oer.market_fit_status = 'completed' THEN 1 ELSE 0 END) AS modules_completed,
          3 AS modules_total,
          oer.created_at,
          oer.completed_at,
          oer.summary
        FROM outline_editorial_reports oer
        JOIN projects p ON oer.project_id = p.id
        WHERE ${outlineWhereClause}
      `);

      countQueries.push(`
        SELECT COUNT(*) AS cnt
        FROM outline_editorial_reports oer
        WHERE ${outlineWhereClause}
      `);
    }

    // If no queries could be built (no tables available), return empty results
    if (queries.length === 0) {
      logger.info('No editorial tables available - returning empty queue');
      return res.json({
        items: [],
        total: 0,
        limit: params.limit,
        offset: params.offset,
      });
    }

    // Build the full UNION ALL query with ordering and pagination
    const unionQuery = queries.join(' UNION ALL ');

    // Map sort field to column name
    const sortColumn = params.sort === 'created_at' ? 'created_at'
      : params.sort === 'overall_score' ? 'overall_score'
      : 'status';

    const fullQuery = `
      SELECT * FROM (${unionQuery})
      ORDER BY ${sortColumn} ${params.order.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(params.limit, params.offset);

    // Execute main query
    const rows = db.prepare(fullQuery).all(...queryParams) as any[];

    // Execute count query
    let total = 0;
    for (const countQuery of countQueries) {
      const countResult = db.prepare(countQuery).get(...countParams.slice(0, countQuery.split('?').length - 1)) as any;
      total += countResult?.cnt || 0;
      // Remove used params for next query
      countParams.splice(0, countQuery.split('?').length - 1);
    }

    // Actually, let's fix the count calculation - use a simpler approach
    const countUnionQuery = queries.length > 0
      ? `SELECT COUNT(*) AS total FROM (${unionQuery})`
      : null;

    if (countUnionQuery) {
      // Create a fresh set of params for the count query (same as queryParams but without limit/offset)
      const countOnlyParams: (string | number)[] = [];

      // Rebuild params for count query
      if (tableCheck.veb.exists && (params.type === 'all' || params.type === 'veb')) {
        if (params.status !== 'all') countOnlyParams.push(params.status);
        if (params.projectId) countOnlyParams.push(params.projectId);
      }
      if (tableCheck.outlineEditorial.exists && (params.type === 'all' || params.type === 'outline_editorial')) {
        if (params.status !== 'all') countOnlyParams.push(params.status);
        if (params.projectId) countOnlyParams.push(params.projectId);
      }

      const countResult = db.prepare(countUnionQuery).get(...countOnlyParams) as any;
      total = countResult?.total || 0;
    }

    // Transform rows to response format
    const items: EditorialQueueItem[] = rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      projectTitle: row.project_title || 'Unknown Project',
      reportType: row.report_type as 'veb' | 'outline_editorial',
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      overallScore: row.overall_score,
      modulesCompleted: row.modules_completed,
      modulesTotal: row.modules_total,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      summary: row.summary,
      viewUrl: row.report_type === 'veb'
        ? `/projects/${row.project_id}/editorial-report`
        : `/projects/${row.project_id}/outline-review`,
    }));

    logger.debug({ count: items.length, total, params }, 'Editorial queue fetched');

    res.json({
      items,
      total,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching editorial queue');
    sendInternalError(res, error, 'Editorial board operation');
  }
});

/**
 * GET /api/editorial/stats
 *
 * Returns summary statistics for the editorial dashboard.
 */
router.get('/stats', (req, res) => {
  try {
    const tableCheck = checkEditorialTablesExist();

    const stats: EditorialStats = {
      totalReports: 0,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      byType: {
        veb: 0,
        outline_editorial: 0,
      },
      activeProjects: 0,
    };

    const activeProjectIds = new Set<string>();

    // Gather VEB stats if tables exist
    if (tableCheck.veb.exists) {
      try {
        const vebStats = db.prepare(`
          SELECT
            status,
            COUNT(*) AS count
          FROM editorial_reports
          GROUP BY status
        `).all() as any[];

        for (const row of vebStats) {
          const count = row.count || 0;
          stats.totalReports += count;
          stats.byType.veb += count;

          if (row.status in stats.byStatus) {
            stats.byStatus[row.status as keyof typeof stats.byStatus] += count;
          }
        }

        // Get active project IDs from VEB
        const vebProjects = db.prepare(`
          SELECT DISTINCT project_id FROM editorial_reports
        `).all() as any[];

        for (const row of vebProjects) {
          activeProjectIds.add(row.project_id);
        }
      } catch (error) {
        logger.warn({ error }, 'Error fetching VEB stats - tables may not exist');
      }
    }

    // Gather Outline Editorial stats if tables exist
    if (tableCheck.outlineEditorial.exists) {
      try {
        const outlineStats = db.prepare(`
          SELECT
            status,
            COUNT(*) AS count
          FROM outline_editorial_reports
          GROUP BY status
        `).all() as any[];

        for (const row of outlineStats) {
          const count = row.count || 0;
          stats.totalReports += count;
          stats.byType.outline_editorial += count;

          if (row.status in stats.byStatus) {
            stats.byStatus[row.status as keyof typeof stats.byStatus] += count;
          }
        }

        // Get active project IDs from Outline Editorial
        const outlineProjects = db.prepare(`
          SELECT DISTINCT project_id FROM outline_editorial_reports
        `).all() as any[];

        for (const row of outlineProjects) {
          activeProjectIds.add(row.project_id);
        }
      } catch (error) {
        logger.warn({ error }, 'Error fetching Outline Editorial stats - tables may not exist');
      }
    }

    stats.activeProjects = activeProjectIds.size;

    logger.debug({ stats }, 'Editorial stats fetched');

    res.json(stats);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching editorial stats');
    sendInternalError(res, error, 'Editorial board operation');
  }
});

/**
 * GET /api/editorial/activity
 *
 * Returns a chronological activity feed across all editorial work.
 * Includes report submissions, completions, failures, and feedback submissions.
 *
 * Query Parameters:
 * - limit: 1-100 (default: 30)
 * - offset: >= 0 (default: 0)
 * - projectId: UUID (optional)
 */
router.get('/activity', (req, res) => {
  try {
    const query = req.query as Record<string, unknown>;

    // Parse limit
    let limit = 30;
    if (query.limit !== undefined) {
      const parsedLimit = parseInt(query.limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return sendBadRequest(res, 'limit must be a number between 1 and 100');
      }
      limit = parsedLimit;
    }

    // Parse offset
    let offset = 0;
    if (query.offset !== undefined) {
      const parsedOffset = parseInt(query.offset as string, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return sendBadRequest(res, 'offset must be a non-negative number');
      }
      offset = parsedOffset;
    }

    // Parse projectId filter
    const projectId = typeof query.projectId === 'string' && query.projectId.trim()
      ? query.projectId.trim()
      : null;

    const tableCheck = checkEditorialTablesExist();

    // If projects table doesn't exist, return empty results
    if (!tableCheck.projects) {
      return res.json({
        events: [],
        total: 0,
        limit,
        offset,
      });
    }

    const events: ActivityEvent[] = [];
    const params: (string | number)[] = [];

    // Build project filter clause
    const projectFilter = projectId ? 'AND er.project_id = ?' : '';

    // Fetch VEB report events if tables exist
    if (tableCheck.veb.exists) {
      try {
        // Build dynamic params for VEB queries
        const vebParams = projectId ? [projectId] : [];

        // Report submissions (pending or processing, ordered by created_at)
        const vebReports = db.prepare(`
          SELECT
            er.id,
            er.project_id,
            p.title AS project_title,
            er.status,
            er.overall_score,
            er.summary,
            er.created_at,
            er.completed_at
          FROM editorial_reports er
          JOIN projects p ON er.project_id = p.id
          WHERE 1=1 ${projectFilter}
          ORDER BY er.created_at DESC
        `).all(...vebParams) as any[];

        for (const report of vebReports) {
          // Determine event type based on status
          if (report.status === 'completed' && report.completed_at) {
            events.push({
              timestamp: report.completed_at,
              eventType: 'report_completed',
              reportType: 'veb',
              reportId: report.id,
              projectId: report.project_id,
              projectTitle: report.project_title || 'Unknown Project',
              details: {
                overallScore: report.overall_score,
                summary: report.summary,
              },
            });
          } else if (report.status === 'failed') {
            events.push({
              timestamp: report.completed_at || report.created_at,
              eventType: 'report_failed',
              reportType: 'veb',
              reportId: report.id,
              projectId: report.project_id,
              projectTitle: report.project_title || 'Unknown Project',
              details: {},
            });
          }

          // Always add submission event
          events.push({
            timestamp: report.created_at,
            eventType: 'report_submitted',
            reportType: 'veb',
            reportId: report.id,
            projectId: report.project_id,
            projectTitle: report.project_title || 'Unknown Project',
            details: {},
          });
        }

        // Fetch VEB feedback events
        const feedbackFilter = projectId
          ? 'WHERE er.project_id = ?'
          : '';
        const feedbackParams = projectId ? [projectId] : [];

        const vebFeedback = db.prepare(`
          SELECT
            vf.id,
            vf.report_id,
            vf.module,
            vf.feedback_type,
            vf.notes,
            vf.created_at,
            er.project_id,
            p.title AS project_title
          FROM veb_feedback vf
          JOIN editorial_reports er ON vf.report_id = er.id
          JOIN projects p ON er.project_id = p.id
          ${feedbackFilter}
          ORDER BY vf.created_at DESC
        `).all(...feedbackParams) as any[];

        for (const feedback of vebFeedback) {
          events.push({
            timestamp: feedback.created_at,
            eventType: 'feedback_submitted',
            reportType: 'veb',
            reportId: feedback.report_id,
            projectId: feedback.project_id,
            projectTitle: feedback.project_title || 'Unknown Project',
            details: {
              module: feedback.module,
              feedbackType: feedback.feedback_type,
              notes: feedback.notes,
            },
          });
        }
      } catch (error) {
        logger.warn({ error }, 'Error fetching VEB activity - tables may not exist');
      }
    }

    // Fetch Outline Editorial report events if tables exist
    if (tableCheck.outlineEditorial.exists) {
      try {
        const outlineParams = projectId ? [projectId] : [];
        const outlineProjectFilter = projectId ? 'AND oer.project_id = ?' : '';

        const outlineReports = db.prepare(`
          SELECT
            oer.id,
            oer.project_id,
            p.title AS project_title,
            oer.status,
            oer.overall_score,
            oer.summary,
            oer.created_at,
            oer.completed_at
          FROM outline_editorial_reports oer
          JOIN projects p ON oer.project_id = p.id
          WHERE 1=1 ${outlineProjectFilter}
          ORDER BY oer.created_at DESC
        `).all(...outlineParams) as any[];

        for (const report of outlineReports) {
          if (report.status === 'completed' && report.completed_at) {
            events.push({
              timestamp: report.completed_at,
              eventType: 'report_completed',
              reportType: 'outline_editorial',
              reportId: report.id,
              projectId: report.project_id,
              projectTitle: report.project_title || 'Unknown Project',
              details: {
                overallScore: report.overall_score,
                summary: report.summary,
              },
            });
          } else if (report.status === 'failed') {
            events.push({
              timestamp: report.completed_at || report.created_at,
              eventType: 'report_failed',
              reportType: 'outline_editorial',
              reportId: report.id,
              projectId: report.project_id,
              projectTitle: report.project_title || 'Unknown Project',
              details: {},
            });
          }

          events.push({
            timestamp: report.created_at,
            eventType: 'report_submitted',
            reportType: 'outline_editorial',
            reportId: report.id,
            projectId: report.project_id,
            projectTitle: report.project_title || 'Unknown Project',
            details: {},
          });
        }

        // Fetch Outline Editorial feedback events
        const feedbackFilter = projectId
          ? 'WHERE oer.project_id = ?'
          : '';
        const feedbackParams = projectId ? [projectId] : [];

        const outlineFeedback = db.prepare(`
          SELECT
            oef.id,
            oef.report_id,
            oef.module,
            oef.feedback_type,
            oef.notes,
            oef.created_at,
            oer.project_id,
            p.title AS project_title
          FROM outline_editorial_feedback oef
          JOIN outline_editorial_reports oer ON oef.report_id = oer.id
          JOIN projects p ON oer.project_id = p.id
          ${feedbackFilter}
          ORDER BY oef.created_at DESC
        `).all(...feedbackParams) as any[];

        for (const feedback of outlineFeedback) {
          events.push({
            timestamp: feedback.created_at,
            eventType: 'feedback_submitted',
            reportType: 'outline_editorial',
            reportId: feedback.report_id,
            projectId: feedback.project_id,
            projectTitle: feedback.project_title || 'Unknown Project',
            details: {
              module: feedback.module,
              feedbackType: feedback.feedback_type,
              notes: feedback.notes,
            },
          });
        }
      } catch (error) {
        logger.warn({ error }, 'Error fetching Outline Editorial activity - tables may not exist');
      }
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    const total = events.length;

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    logger.debug({ count: paginatedEvents.length, total }, 'Editorial activity fetched');

    res.json({
      events: paginatedEvents,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching editorial activity');
    sendInternalError(res, error, 'Editorial board operation');
  }
});

export default router;
