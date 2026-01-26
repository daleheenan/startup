import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

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
  total_chapters: number;
  total_word_count: number;
  reading_time_minutes: number;
  updated_at: string;
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
    display: string; // "$12.34 / £9.75"
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
   * Track token usage for a chapter
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
        this.updateProjectTokens(result.project_id, inputTokens, outputTokens);
      }
    } catch (error) {
      logger.error({ error, chapterId }, 'Error tracking chapter tokens');
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
        usd: formatCurrency(metrics.total_cost_usd, '$'),
        gbp: formatCurrency(metrics.total_cost_gbp, '£'),
        display: formatCurrency(metrics.total_cost_gbp, '£'),
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
}

export const metricsService = new MetricsService();
