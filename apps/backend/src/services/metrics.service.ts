import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { randomUUID } from 'crypto';
import type { AIRequestType } from '../constants/ai-request-types.js';

const logger = createLogger('services:metrics');

/**
 * Claude Opus 4.5 pricing (as of Jan 2025)
 * Input: $15 per 1M tokens
 * Output: $75 per 1M tokens
 */
const PRICING = {
  INPUT_PER_MILLION: 15.0,
  OUTPUT_PER_MILLION: 75.0,
  USD_TO_GBP: 0.79, // Exchange rate
};

export interface ProjectMetrics {
  project_id: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_cost_gbp: number;
  chapter_input_tokens: number;
  chapter_output_tokens: number;
  chapter_cost_usd: number;
  chapter_cost_gbp: number;
  total_ai_cost_usd: number;
  total_ai_cost_gbp: number;
  total_ai_requests: number;
  total_chapters: number;
  total_word_count: number;
  reading_time_minutes: number;
  updated_at: string;
}

export interface AIRequestLogEntry {
  requestType: AIRequestType | string;
  projectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  success?: boolean;
  errorMessage?: string;
  contextSummary?: string;
}

export interface AIRequestLogRecord {
  id: string;
  request_type: string;
  project_id: string | null;
  chapter_id: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_gbp: number;
  model_used: string | null;
  success: number;
  error_message: string | null;
  context_summary: string | null;
  created_at: string;
  // Joined fields
  project_name?: string;
  series_id?: string;
  series_name?: string;
}

export interface AIRequestLogFilters {
  projectId?: string;
  seriesId?: string;
  requestType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AIRequestLogResult {
  entries: AIRequestLogRecord[];
  total: number;
  summary: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUSD: number;
    totalCostGBP: number;
    totalRequests: number;
  };
}

export interface AICostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostGBP: number;
  totalRequests: number;
}

export interface RequestTypeBreakdown {
  requestType: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  costGBP: number;
}

export interface FormattedMetrics {
  tokens: {
    input: string;
    output: string;
    display: string; // "123K in / 456K out"
  };
  cost: {
    usd: string;
    gbp: string;
    display: string; // "£9.75"
  };
  chapterCost: {
    usd: string;
    gbp: string;
    display: string; // "£7.50"
  };
  aiCost: {
    usd: string;
    gbp: string;
    display: string; // "£12.50" - Total AI cost (all requests)
    requests: number;
  };
  content: {
    chapters: number;
    words: number;
    display: string; // "24 chapters • 87,500 words"
  };
  reading: {
    minutes: number;
    display: string; // "~5h 50m read time"
  };
}

class MetricsService {
  /**
   * Track token usage for a chapter (updates both total and chapter-specific costs)
   */
  trackChapterTokens(chapterId: string, inputTokens: number, outputTokens: number): void {
    try {
      // Get project ID for this chapter and update project metrics directly
      // Note: chapters table doesn't have token columns - tokens are tracked at project level only
      const getProjectStmt = db.prepare<[string], { project_id: string }>(`
        SELECT b.project_id
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE c.id = ?
      `);
      const result = getProjectStmt.get(chapterId);

      if (result) {
        // Update both total and chapter-specific token counts
        this.updateProjectTokens(result.project_id, inputTokens, outputTokens);
        this.updateChapterTokens(result.project_id, inputTokens, outputTokens);
      }
    } catch (error) {
      logger.error({ error, chapterId }, 'Error tracking chapter tokens');
    }
  }

  /**
   * Update chapter-specific token counts and costs
   */
  updateChapterTokens(projectId: string, inputTokens: number, outputTokens: number): void {
    try {
      // Calculate chapter costs
      const inputCostUSD = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      const updateStmt = db.prepare(`
        UPDATE project_metrics
        SET chapter_input_tokens = COALESCE(chapter_input_tokens, 0) + ?,
            chapter_output_tokens = COALESCE(chapter_output_tokens, 0) + ?,
            chapter_cost_usd = COALESCE(chapter_cost_usd, 0) + ?,
            chapter_cost_gbp = COALESCE(chapter_cost_gbp, 0) + ?,
            updated_at = datetime('now')
        WHERE project_id = ?
      `);
      updateStmt.run(inputTokens, outputTokens, totalCostUSD, totalCostGBP, projectId);
    } catch (error) {
      logger.error({ error, projectId }, 'Error updating chapter tokens');
    }
  }

  /**
   * Update project token counts and recalculate costs
   */
  updateProjectTokens(projectId: string, inputTokens: number, outputTokens: number): void {
    try {
      const updateStmt = db.prepare(`
        UPDATE project_metrics
        SET total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?,
            updated_at = datetime('now')
        WHERE project_id = ?
      `);
      updateStmt.run(inputTokens, outputTokens, projectId);

      // Recalculate costs
      this.recalculateCosts(projectId);
    } catch (error) {
      logger.error({ error }, 'Error updating project tokens');
    }
  }

  /**
   * Recalculate cost metrics based on current token counts
   */
  recalculateCosts(projectId: string): void {
    try {
      const getTokensStmt = db.prepare<[string], { total_input_tokens: number; total_output_tokens: number }>(`
        SELECT total_input_tokens, total_output_tokens
        FROM project_metrics
        WHERE project_id = ?
      `);
      const metrics = getTokensStmt.get(projectId);

      if (!metrics) return;

      const inputCostUSD = (metrics.total_input_tokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (metrics.total_output_tokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      const updateStmt = db.prepare(`
        UPDATE project_metrics
        SET total_cost_usd = ?,
            total_cost_gbp = ?,
            updated_at = datetime('now')
        WHERE project_id = ?
      `);
      updateStmt.run(totalCostUSD, totalCostGBP, projectId);
    } catch (error) {
      logger.error({ error }, 'Error recalculating costs');
    }
  }

  /**
   * Get metrics for a project
   */
  getProjectMetrics(projectId: string): ProjectMetrics | null {
    try {
      const stmt = db.prepare<[string], ProjectMetrics>(`
        SELECT *
        FROM project_metrics
        WHERE project_id = ?
      `);
      return stmt.get(projectId) || null;
    } catch (error) {
      logger.error({ error }, 'Error getting project metrics');
      return null;
    }
  }

  /**
   * Get formatted metrics for display
   */
  getFormattedMetrics(projectId: string): FormattedMetrics | null {
    const metrics = this.getProjectMetrics(projectId);
    if (!metrics) return null;

    return this.formatMetrics(metrics);
  }

  /**
   * Format raw metrics for display
   */
  formatMetrics(metrics: ProjectMetrics): FormattedMetrics {
    // Format tokens (e.g., "123K" or "1.2M")
    const formatTokenCount = (count: number): string => {
      if (count >= 1_000_000) {
        return (count / 1_000_000).toFixed(1) + 'M';
      } else if (count >= 1_000) {
        return (count / 1_000).toFixed(0) + 'K';
      }
      return count.toString();
    };

    // Format currency
    const formatCurrency = (amount: number, symbol: string): string => {
      return `${symbol}${amount.toFixed(2)}`;
    };

    // Format word count with commas
    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US');
    };

    // Format reading time
    const formatReadingTime = (minutes: number): string => {
      if (minutes < 60) {
        return `~${minutes}m read time`;
      }
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `~${hours}h read time`;
      }
      return `~${hours}h ${mins}m read time`;
    };

    return {
      tokens: {
        input: formatTokenCount(metrics.total_input_tokens),
        output: formatTokenCount(metrics.total_output_tokens),
        display: `${formatTokenCount(metrics.total_input_tokens)} in / ${formatTokenCount(metrics.total_output_tokens)} out`,
      },
      cost: {
        usd: formatCurrency(metrics.total_cost_usd || 0, '$'),
        gbp: formatCurrency(metrics.total_cost_gbp || 0, '£'),
        display: formatCurrency(metrics.total_cost_gbp || 0, '£'),
      },
      chapterCost: {
        usd: formatCurrency(metrics.chapter_cost_usd || 0, '$'),
        gbp: formatCurrency(metrics.chapter_cost_gbp || 0, '£'),
        display: formatCurrency(metrics.chapter_cost_gbp || 0, '£'),
      },
      aiCost: {
        usd: formatCurrency(metrics.total_ai_cost_usd || 0, '$'),
        gbp: formatCurrency(metrics.total_ai_cost_gbp || 0, '£'),
        display: formatCurrency(metrics.total_ai_cost_gbp || 0, '£'),
        requests: metrics.total_ai_requests || 0,
      },
      content: {
        chapters: metrics.total_chapters,
        words: metrics.total_word_count,
        display: `${metrics.total_chapters} ${metrics.total_chapters === 1 ? 'chapter' : 'chapters'} • ${formatNumber(metrics.total_word_count)} words`,
      },
      reading: {
        minutes: metrics.reading_time_minutes,
        display: formatReadingTime(metrics.reading_time_minutes),
      },
    };
  }

  /**
   * Get metrics for all projects (for dashboard)
   */
  getAllProjectMetrics(): Map<string, FormattedMetrics> {
    try {
      const stmt = db.prepare<[], ProjectMetrics>(`
        SELECT * FROM project_metrics
      `);
      const allMetrics = stmt.all();

      const metricsMap = new Map<string, FormattedMetrics>();
      for (const metrics of allMetrics) {
        metricsMap.set(metrics.project_id, this.formatMetrics(metrics));
      }

      return metricsMap;
    } catch (error) {
      logger.error({ error }, 'Error getting all project metrics');
      return new Map();
    }
  }

  /**
   * Recalculate all content metrics for a project from chapters
   */
  recalculateContentMetrics(projectId: string): void {
    try {
      const statsStmt = db.prepare<[string], { total_chapters: number; total_word_count: number }>(`
        SELECT
          COUNT(*) as total_chapters,
          COALESCE(SUM(c.word_count), 0) as total_word_count
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE b.project_id = ?
        AND c.content IS NOT NULL
      `);
      const stats = statsStmt.get(projectId);

      if (!stats) return;

      const readingTimeMinutes = Math.floor(stats.total_word_count / 250); // 250 words per minute

      const updateStmt = db.prepare(`
        UPDATE project_metrics
        SET total_chapters = ?,
            total_word_count = ?,
            reading_time_minutes = ?,
            updated_at = datetime('now')
        WHERE project_id = ?
      `);
      updateStmt.run(stats.total_chapters, stats.total_word_count, readingTimeMinutes, projectId);
    } catch (error) {
      logger.error({ error }, 'Error recalculating content metrics');
    }
  }

  // ==================== AI REQUEST LOGGING ====================

  /**
   * Log an AI request to the audit trail and update project totals
   */
  logAIRequest(entry: AIRequestLogEntry): string {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();

      // Calculate costs
      const inputCostUSD = (entry.inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (entry.outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      // Insert log entry
      // Note: book_id column doesn't exist in migration 051 - only project_id and chapter_id
      const insertStmt = db.prepare(`
        INSERT INTO ai_request_log (
          id, request_type, project_id, chapter_id,
          input_tokens, output_tokens, cost_usd, cost_gbp,
          model_used, success, error_message, context_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        entry.requestType,
        entry.projectId || null,
        entry.chapterId || null,
        entry.inputTokens,
        entry.outputTokens,
        totalCostUSD,
        totalCostGBP,
        entry.model || 'claude-opus-4-5-20251101',
        entry.success !== false ? 1 : 0,
        entry.errorMessage || null,
        entry.contextSummary || null,
        now
      );

      // Update project totals if project_id is provided
      if (entry.projectId) {
        this.updateProjectAICosts(entry.projectId, entry.inputTokens, entry.outputTokens);
      }

      logger.debug(
        { id, requestType: entry.requestType, projectId: entry.projectId, costGBP: totalCostGBP },
        'AI request logged'
      );

      return id;
    } catch (error) {
      logger.error({ error, entry }, 'Error logging AI request');
      throw error;
    }
  }

  /**
   * Update total AI costs for a project
   */
  updateProjectAICosts(projectId: string, inputTokens: number, outputTokens: number): void {
    try {
      const inputCostUSD = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      const updateStmt = db.prepare(`
        UPDATE project_metrics
        SET total_ai_cost_usd = COALESCE(total_ai_cost_usd, 0) + ?,
            total_ai_cost_gbp = COALESCE(total_ai_cost_gbp, 0) + ?,
            total_ai_requests = COALESCE(total_ai_requests, 0) + 1,
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?,
            updated_at = datetime('now')
        WHERE project_id = ?
      `);

      updateStmt.run(totalCostUSD, totalCostGBP, inputTokens, outputTokens, projectId);
      this.recalculateCosts(projectId);
    } catch (error) {
      logger.error({ error, projectId }, 'Error updating project AI costs');
    }
  }

  /**
   * Get AI request log with filters and pagination
   */
  getAIRequestLog(filters: AIRequestLogFilters): AIRequestLogResult {
    try {
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filters.projectId) {
        conditions.push('l.project_id = ?');
        params.push(filters.projectId);
      }

      if (filters.seriesId) {
        conditions.push('p.series_id = ?');
        params.push(filters.seriesId);
      }

      if (filters.requestType) {
        conditions.push('l.request_type = ?');
        params.push(filters.requestType);
      }

      if (filters.startDate) {
        conditions.push("l.created_at >= datetime(?)");
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push("l.created_at <= datetime(?)");
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countSql = `
        SELECT COUNT(*) as total
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        ${whereClause}
      `;
      const countStmt = db.prepare<(string | number)[], { total: number }>(countSql);
      const { total } = countStmt.get(...params) || { total: 0 };

      // Get entries with pagination
      const entriesSql = `
        SELECT
          l.*,
          p.title as project_name,
          p.series_id,
          s.title as series_name
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        LEFT JOIN series s ON p.series_id = s.id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const entriesStmt = db.prepare<(string | number)[], AIRequestLogRecord>(entriesSql);
      const entries = entriesStmt.all(...params, limit, offset);

      // Get summary for filtered results
      const summarySql = `
        SELECT
          COALESCE(SUM(l.input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(l.output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(l.cost_usd), 0) as total_cost_usd,
          COALESCE(SUM(l.cost_gbp), 0) as total_cost_gbp,
          COUNT(*) as total_requests
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        ${whereClause}
      `;
      const summaryStmt = db.prepare<
        (string | number)[],
        {
          total_input_tokens: number;
          total_output_tokens: number;
          total_cost_usd: number;
          total_cost_gbp: number;
          total_requests: number;
        }
      >(summarySql);
      const summaryRow = summaryStmt.get(...params);

      return {
        entries,
        total,
        summary: {
          totalInputTokens: summaryRow?.total_input_tokens || 0,
          totalOutputTokens: summaryRow?.total_output_tokens || 0,
          totalCostUSD: summaryRow?.total_cost_usd || 0,
          totalCostGBP: summaryRow?.total_cost_gbp || 0,
          totalRequests: summaryRow?.total_requests || 0,
        },
      };
    } catch (error: any) {
      logger.error({
        error: error?.message || error,
        code: error?.code,
        filters
      }, 'Error getting AI request log');
      return {
        entries: [],
        total: 0,
        summary: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCostUSD: 0,
          totalCostGBP: 0,
          totalRequests: 0,
        },
      };
    }
  }

  /**
   * Get overall AI cost summary
   */
  getAICostSummary(filters?: Partial<AIRequestLogFilters>): AICostSummary {
    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filters?.projectId) {
        conditions.push('l.project_id = ?');
        params.push(filters.projectId);
      }

      if (filters?.seriesId) {
        conditions.push('p.series_id = ?');
        params.push(filters.seriesId);
      }

      if (filters?.startDate) {
        conditions.push("l.created_at >= datetime(?)");
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        conditions.push("l.created_at <= datetime(?)");
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT
          COALESCE(SUM(l.input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(l.output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(l.cost_usd), 0) as total_cost_usd,
          COALESCE(SUM(l.cost_gbp), 0) as total_cost_gbp,
          COUNT(*) as total_requests
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        ${whereClause}
      `;

      const stmt = db.prepare<
        (string | number)[],
        {
          total_input_tokens: number;
          total_output_tokens: number;
          total_cost_usd: number;
          total_cost_gbp: number;
          total_requests: number;
        }
      >(sql);
      const row = stmt.get(...params);

      return {
        totalInputTokens: row?.total_input_tokens || 0,
        totalOutputTokens: row?.total_output_tokens || 0,
        totalCostUSD: row?.total_cost_usd || 0,
        totalCostGBP: row?.total_cost_gbp || 0,
        totalRequests: row?.total_requests || 0,
      };
    } catch (error) {
      logger.error({ error, filters }, 'Error getting AI cost summary');
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUSD: 0,
        totalCostGBP: 0,
        totalRequests: 0,
      };
    }
  }

  /**
   * Get costs grouped by request type
   */
  getCostsByRequestType(filters?: Partial<AIRequestLogFilters>): RequestTypeBreakdown[] {
    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filters?.projectId) {
        conditions.push('l.project_id = ?');
        params.push(filters.projectId);
      }

      if (filters?.seriesId) {
        conditions.push('p.series_id = ?');
        params.push(filters.seriesId);
      }

      if (filters?.startDate) {
        conditions.push("l.created_at >= datetime(?)");
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        conditions.push("l.created_at <= datetime(?)");
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT
          l.request_type,
          COUNT(*) as count,
          COALESCE(SUM(l.input_tokens), 0) as input_tokens,
          COALESCE(SUM(l.output_tokens), 0) as output_tokens,
          COALESCE(SUM(l.cost_usd), 0) as cost_usd,
          COALESCE(SUM(l.cost_gbp), 0) as cost_gbp
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        ${whereClause}
        GROUP BY l.request_type
        ORDER BY cost_gbp DESC
      `;

      const stmt = db.prepare<
        (string | number)[],
        {
          request_type: string;
          count: number;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          cost_gbp: number;
        }
      >(sql);
      const rows = stmt.all(...params);

      return rows.map((row) => ({
        requestType: row.request_type,
        count: row.count,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        costUSD: row.cost_usd,
        costGBP: row.cost_gbp,
      }));
    } catch (error) {
      logger.error({ error, filters }, 'Error getting costs by request type');
      return [];
    }
  }

  /**
   * Get costs grouped by project
   */
  getCostsByProject(
    filters?: Partial<AIRequestLogFilters>
  ): Array<{
    projectId: string;
    projectName: string;
    seriesId: string | null;
    seriesName: string | null;
    totalCostUSD: number;
    totalCostGBP: number;
    requestCount: number;
  }> {
    try {
      const conditions: string[] = ['l.project_id IS NOT NULL'];
      const params: (string | number)[] = [];

      if (filters?.seriesId) {
        conditions.push('p.series_id = ?');
        params.push(filters.seriesId);
      }

      if (filters?.startDate) {
        conditions.push("l.created_at >= datetime(?)");
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        conditions.push("l.created_at <= datetime(?)");
        params.push(filters.endDate);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT
          l.project_id,
          p.title as project_name,
          p.series_id,
          s.title as series_name,
          COALESCE(SUM(l.cost_usd), 0) as total_cost_usd,
          COALESCE(SUM(l.cost_gbp), 0) as total_cost_gbp,
          COUNT(*) as request_count
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        LEFT JOIN series s ON p.series_id = s.id
        ${whereClause}
        GROUP BY l.project_id
        ORDER BY total_cost_gbp DESC
      `;

      const stmt = db.prepare<
        (string | number)[],
        {
          project_id: string;
          project_name: string;
          series_id: string | null;
          series_name: string | null;
          total_cost_usd: number;
          total_cost_gbp: number;
          request_count: number;
        }
      >(sql);
      const rows = stmt.all(...params);

      return rows.map((row) => ({
        projectId: row.project_id,
        projectName: row.project_name,
        seriesId: row.series_id,
        seriesName: row.series_name,
        totalCostUSD: row.total_cost_usd,
        totalCostGBP: row.total_cost_gbp,
        requestCount: row.request_count,
      }));
    } catch (error) {
      logger.error({ error, filters }, 'Error getting costs by project');
      return [];
    }
  }
}

export const metricsService = new MetricsService();
