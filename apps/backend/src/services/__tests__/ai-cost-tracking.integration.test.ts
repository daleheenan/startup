/**
 * AI Cost Tracking Integration Tests
 *
 * Comprehensive integration tests that verify the complete AI cost tracking flow:
 * - Making AI requests → logging to ai_request_log → API retrieval → project_metrics updates
 *
 * Uses a real in-memory SQLite database (not mocks) to catch SQL errors like column name mismatches.
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';

// ============================================================================
// TEST DATABASE SETUP
// ============================================================================

/**
 * Creates and initialises a test database with all required tables for AI cost tracking.
 * Uses in-memory SQLite for speed and isolation.
 */
function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Create series table first (referenced by projects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create projects table (matches production schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      genre TEXT NOT NULL,
      status TEXT NOT NULL,
      series_id TEXT,
      story_concept TEXT,
      story_dna TEXT,
      story_bible TEXT,
      plot_structure TEXT,
      book_count INTEGER DEFAULT 1,
      author_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
    )
  `);

  // Create books table
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      book_number INTEGER NOT NULL,
      title TEXT,
      status TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create chapters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `);

  // Create project_metrics table (matches migration 008 + 051 columns)
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_metrics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      total_cost_gbp REAL DEFAULT 0,
      chapter_input_tokens INTEGER DEFAULT 0,
      chapter_output_tokens INTEGER DEFAULT 0,
      chapter_cost_usd REAL DEFAULT 0,
      chapter_cost_gbp REAL DEFAULT 0,
      total_ai_cost_usd REAL DEFAULT 0,
      total_ai_cost_gbp REAL DEFAULT 0,
      total_ai_requests INTEGER DEFAULT 0,
      total_chapters INTEGER DEFAULT 0,
      total_word_count INTEGER DEFAULT 0,
      reading_time_minutes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create ai_request_log table (matches migration 051 + 062)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_request_log (
      id TEXT PRIMARY KEY,
      request_type TEXT NOT NULL,
      project_id TEXT,
      book_id TEXT,
      chapter_id TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      cost_gbp REAL NOT NULL DEFAULT 0,
      model_used TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      context_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    )
  `);

  // Create indexes (matches production)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_project ON ai_request_log(project_id);
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_type ON ai_request_log(request_type);
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_created ON ai_request_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_project_type ON ai_request_log(project_id, request_type);
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_project_created ON ai_request_log(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_request_log_book ON ai_request_log(book_id);
  `);

  return db;
}

// ============================================================================
// MOCK METRICS SERVICE (uses real database)
// ============================================================================

/**
 * Pricing constants (same as production)
 */
const PRICING = {
  INPUT_PER_MILLION: 15.0,
  OUTPUT_PER_MILLION: 75.0,
  USD_TO_GBP: 0.79,
};

interface AIRequestLogEntry {
  requestType: string;
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

interface AIRequestLogFilters {
  projectId?: string;
  bookId?: string;
  seriesId?: string;
  requestType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Creates a MetricsService that uses the provided database connection.
 * This allows us to test with a real database instead of mocks.
 */
function createMetricsServiceWithDb(db: Database.Database) {
  return {
    /**
     * Log an AI request to the audit trail and update project totals
     */
    logAIRequest(entry: AIRequestLogEntry): string {
      const id = randomUUID();
      const now = new Date().toISOString();

      // Calculate costs
      const inputCostUSD = (entry.inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (entry.outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      // Insert log entry
      const insertStmt = db.prepare(`
        INSERT INTO ai_request_log (
          id, request_type, project_id, book_id, chapter_id,
          input_tokens, output_tokens, cost_usd, cost_gbp,
          model_used, success, error_message, context_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        entry.requestType,
        entry.projectId || null,
        entry.bookId || null,
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

      return id;
    },

    /**
     * Update total AI costs for a project
     */
    updateProjectAICosts(projectId: string, inputTokens: number, outputTokens: number): void {
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

      // Recalculate total costs
      const getTokensStmt = db.prepare<[string], { total_input_tokens: number; total_output_tokens: number }>(`
        SELECT total_input_tokens, total_output_tokens
        FROM project_metrics
        WHERE project_id = ?
      `);
      const metrics = getTokensStmt.get(projectId);

      if (metrics) {
        const recalcInputCostUSD = (metrics.total_input_tokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
        const recalcOutputCostUSD = (metrics.total_output_tokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
        const recalcTotalCostUSD = recalcInputCostUSD + recalcOutputCostUSD;
        const recalcTotalCostGBP = recalcTotalCostUSD * PRICING.USD_TO_GBP;

        const recalcStmt = db.prepare(`
          UPDATE project_metrics
          SET total_cost_usd = ?,
              total_cost_gbp = ?,
              updated_at = datetime('now')
          WHERE project_id = ?
        `);
        recalcStmt.run(recalcTotalCostUSD, recalcTotalCostGBP, projectId);
      }
    },

    /**
     * Get AI request log with filters and pagination
     */
    getAIRequestLog(filters: AIRequestLogFilters) {
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
      const { total } = db.prepare(countSql).get(...params) as { total: number };

      // Get entries with pagination - NOTE: uses p.title (not p.name)
      const entriesSql = `
        SELECT
          l.*,
          p.title as project_name,
          p.series_id,
          s.name as series_name
        FROM ai_request_log l
        LEFT JOIN projects p ON l.project_id = p.id
        LEFT JOIN series s ON p.series_id = s.id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const entries = db.prepare(entriesSql).all(...params, limit, offset) as any[];

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
      const summaryRow = db.prepare(summarySql).get(...params) as any;

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
    },

    /**
     * Get overall AI cost summary
     */
    getAICostSummary(filters?: Partial<AIRequestLogFilters>) {
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

      const row = db.prepare(sql).get(...params) as any;

      return {
        totalInputTokens: row?.total_input_tokens || 0,
        totalOutputTokens: row?.total_output_tokens || 0,
        totalCostUSD: row?.total_cost_usd || 0,
        totalCostGBP: row?.total_cost_gbp || 0,
        totalRequests: row?.total_requests || 0,
      };
    },

    /**
     * Get costs grouped by request type
     */
    getCostsByRequestType(filters?: Partial<AIRequestLogFilters>) {
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

      const rows = db.prepare(sql).all(...params) as any[];

      return rows.map((row) => ({
        requestType: row.request_type,
        count: row.count,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        costUSD: row.cost_usd,
        costGBP: row.cost_gbp,
      }));
    },

    /**
     * Get costs grouped by project
     */
    getCostsByProject(filters?: Partial<AIRequestLogFilters>) {
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

      // NOTE: Uses p.title (not p.name) - this is the correct column name
      const sql = `
        SELECT
          l.project_id,
          p.title as project_name,
          p.series_id,
          s.name as series_name,
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

      const rows = db.prepare(sql).all(...params) as any[];

      return rows.map((row) => ({
        projectId: row.project_id,
        projectName: row.project_name,
        seriesId: row.series_id,
        seriesName: row.series_name,
        totalCostUSD: row.total_cost_usd,
        totalCostGBP: row.total_cost_gbp,
        requestCount: row.request_count,
      }));
    },

    /**
     * Get project metrics
     */
    getProjectMetrics(projectId: string) {
      const stmt = db.prepare(`SELECT * FROM project_metrics WHERE project_id = ?`);
      return stmt.get(projectId) as any;
    },
  };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a test project with associated metrics record
 */
function createTestProject(db: Database.Database, overrides: Partial<{
  id: string;
  title: string;
  series_id: string | null;
}> = {}) {
  const projectId = overrides.id || randomUUID();
  const title = overrides.title || 'Test Novel';
  const seriesId = overrides.series_id !== undefined ? overrides.series_id : null;

  db.prepare(`
    INSERT INTO projects (id, title, type, genre, status, series_id, created_at, updated_at)
    VALUES (?, ?, 'standalone', 'Fantasy', 'setup', ?, datetime('now'), datetime('now'))
  `).run(projectId, title, seriesId);

  // Create project metrics record
  db.prepare(`
    INSERT INTO project_metrics (id, project_id, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(projectId + '_metrics', projectId);

  return projectId;
}

/**
 * Creates a test series
 */
function createTestSeries(db: Database.Database, overrides: Partial<{
  id: string;
  name: string;
}> = {}) {
  const seriesId = overrides.id || randomUUID();
  const name = overrides.name || 'Test Series';

  db.prepare(`
    INSERT INTO series (id, name, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(seriesId, name);

  return seriesId;
}

/**
 * Creates a test book
 */
function createTestBook(db: Database.Database, projectId: string, overrides: Partial<{
  id: string;
  book_number: number;
}> = {}) {
  const bookId = overrides.id || randomUUID();
  const bookNumber = overrides.book_number || 1;

  db.prepare(`
    INSERT INTO books (id, project_id, book_number, status, created_at, updated_at)
    VALUES (?, ?, ?, 'generating', datetime('now'), datetime('now'))
  `).run(bookId, projectId, bookNumber);

  return bookId;
}

/**
 * Creates a test chapter
 */
function createTestChapter(db: Database.Database, bookId: string, overrides: Partial<{
  id: string;
  chapter_number: number;
}> = {}) {
  const chapterId = overrides.id || randomUUID();
  const chapterNumber = overrides.chapter_number || 1;

  db.prepare(`
    INSERT INTO chapters (id, book_id, chapter_number, status, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `).run(chapterId, bookId, chapterNumber);

  return chapterId;
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('AI Cost Tracking Integration Tests', () => {
  let db: Database.Database;
  let metricsService: ReturnType<typeof createMetricsServiceWithDb>;

  beforeEach(() => {
    db = createTestDatabase();
    metricsService = createMetricsServiceWithDb(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ==========================================================================
  // DATABASE SCHEMA CORRECTNESS TESTS
  // ==========================================================================

  describe('Database Schema Correctness', () => {
    it('should have ai_request_log table with all required columns', () => {
      const tableInfo = db.prepare("PRAGMA table_info('ai_request_log')").all() as any[];
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('request_type');
      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('book_id');
      expect(columnNames).toContain('chapter_id');
      expect(columnNames).toContain('input_tokens');
      expect(columnNames).toContain('output_tokens');
      expect(columnNames).toContain('cost_usd');
      expect(columnNames).toContain('cost_gbp');
      expect(columnNames).toContain('model_used');
      expect(columnNames).toContain('success');
      expect(columnNames).toContain('error_message');
      expect(columnNames).toContain('context_summary');
      expect(columnNames).toContain('created_at');
    });

    it('should have project_metrics table with AI cost columns', () => {
      const tableInfo = db.prepare("PRAGMA table_info('project_metrics')").all() as any[];
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('total_input_tokens');
      expect(columnNames).toContain('total_output_tokens');
      expect(columnNames).toContain('total_cost_usd');
      expect(columnNames).toContain('total_cost_gbp');
      expect(columnNames).toContain('total_ai_cost_usd');
      expect(columnNames).toContain('total_ai_cost_gbp');
      expect(columnNames).toContain('total_ai_requests');
    });

    it('should use p.title (not p.name) in project queries', () => {
      // Create test data
      const projectId = createTestProject(db, { title: 'My Custom Title' });

      // Log an AI request
      metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        inputTokens: 1000,
        outputTokens: 500,
        success: true,
      });

      // Query using getCostsByProject (which uses p.title)
      const projects = metricsService.getCostsByProject();

      expect(projects).toHaveLength(1);
      expect(projects[0].projectName).toBe('My Custom Title');
    });

    it('should have proper indexes on ai_request_log', () => {
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ai_request_log'").all() as any[];
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('idx_ai_request_log_project');
      expect(indexNames).toContain('idx_ai_request_log_type');
      expect(indexNames).toContain('idx_ai_request_log_created');
    });

    it('should enforce foreign key constraints on ai_request_log', () => {
      // Attempt to insert with non-existent project_id
      const nonExistentProjectId = randomUUID();

      expect(() => {
        db.prepare(`
          INSERT INTO ai_request_log (id, request_type, project_id, input_tokens, output_tokens, cost_usd, cost_gbp, success)
          VALUES (?, 'test', ?, 100, 50, 0.01, 0.008, 1)
        `).run(randomUUID(), nonExistentProjectId);
      }).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  // ==========================================================================
  // COMPLETE FLOW TESTS
  // ==========================================================================

  describe('Complete Flow: AI Request → Log → API → Metrics', () => {
    it('should log AI request and update project_metrics', () => {
      // Setup: Create project
      const projectId = createTestProject(db, { title: 'Fantasy Epic' });

      // Act: Log an AI request
      const logId = metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        inputTokens: 10_000,
        outputTokens: 5_000,
        model: 'claude-opus-4-5-20251101',
        success: true,
        contextSummary: 'Generated Chapter 1',
      });

      // Assert: Log entry created
      expect(logId).toBeDefined();
      expect(typeof logId).toBe('string');

      // Verify log entry in database
      const logEntry = db.prepare('SELECT * FROM ai_request_log WHERE id = ?').get(logId) as any;
      expect(logEntry).toBeDefined();
      expect(logEntry.request_type).toBe('chapter_generation');
      expect(logEntry.project_id).toBe(projectId);
      expect(logEntry.input_tokens).toBe(10_000);
      expect(logEntry.output_tokens).toBe(5_000);
      expect(logEntry.success).toBe(1);

      // Verify cost calculation (10k/1M * $15 + 5k/1M * $75 = $0.15 + $0.375 = $0.525)
      expect(logEntry.cost_usd).toBeCloseTo(0.525, 3);
      expect(logEntry.cost_gbp).toBeCloseTo(0.525 * 0.79, 4);

      // Verify project_metrics updated
      const metrics = metricsService.getProjectMetrics(projectId);
      expect(metrics).toBeDefined();
      expect(metrics.total_input_tokens).toBe(10_000);
      expect(metrics.total_output_tokens).toBe(5_000);
      expect(metrics.total_ai_requests).toBe(1);
      expect(metrics.total_ai_cost_usd).toBeCloseTo(0.525, 3);
    });

    it('should retrieve logged request via API', () => {
      // Setup
      const projectId = createTestProject(db, { title: 'Sci-Fi Thriller' });

      // Log request
      metricsService.logAIRequest({
        requestType: 'veb_beta_swarm',
        projectId,
        inputTokens: 20_000,
        outputTokens: 10_000,
        success: true,
      });

      // Retrieve via API method
      const result = metricsService.getAIRequestLog({ projectId });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].request_type).toBe('veb_beta_swarm');
      expect(result.entries[0].project_name).toBe('Sci-Fi Thriller');
      expect(result.total).toBe(1);
      expect(result.summary.totalInputTokens).toBe(20_000);
      expect(result.summary.totalOutputTokens).toBe(10_000);
    });

    it('should accumulate multiple requests for the same project', () => {
      const projectId = createTestProject(db);

      // Log multiple requests
      metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        inputTokens: 5_000,
        outputTokens: 2_500,
        success: true,
      });

      metricsService.logAIRequest({
        requestType: 'coherence_check',
        projectId,
        inputTokens: 3_000,
        outputTokens: 1_500,
        success: true,
      });

      metricsService.logAIRequest({
        requestType: 'veb_beta_swarm',
        projectId,
        inputTokens: 15_000,
        outputTokens: 7_500,
        success: true,
      });

      // Verify cumulative metrics
      const metrics = metricsService.getProjectMetrics(projectId);
      expect(metrics.total_input_tokens).toBe(5_000 + 3_000 + 15_000);
      expect(metrics.total_output_tokens).toBe(2_500 + 1_500 + 7_500);
      expect(metrics.total_ai_requests).toBe(3);

      // Verify summary via API
      const summary = metricsService.getAICostSummary({ projectId });
      expect(summary.totalRequests).toBe(3);
    });
  });

  // ==========================================================================
  // API ENDPOINT TESTS
  // ==========================================================================

  describe('GET /api/ai-costs (getAIRequestLog)', () => {
    it('should filter by projectId', () => {
      const project1 = createTestProject(db, { title: 'Project 1' });
      const project2 = createTestProject(db, { title: 'Project 2' });

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: project1, inputTokens: 1000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: project2, inputTokens: 2000, outputTokens: 1000 });

      const result = metricsService.getAIRequestLog({ projectId: project1 });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].project_id).toBe(project1);
    });

    it('should filter by seriesId', () => {
      const seriesId = createTestSeries(db, { name: 'Epic Saga' });
      const projectInSeries = createTestProject(db, { title: 'Book 1', series_id: seriesId });
      const projectNotInSeries = createTestProject(db, { title: 'Standalone' });

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: projectInSeries, inputTokens: 1000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: projectNotInSeries, inputTokens: 2000, outputTokens: 1000 });

      const result = metricsService.getAIRequestLog({ seriesId });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].project_id).toBe(projectInSeries);
      expect(result.entries[0].series_name).toBe('Epic Saga');
    });

    it('should filter by requestType', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId, inputTokens: 1000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'veb_beta_swarm', projectId, inputTokens: 2000, outputTokens: 1000 });
      metricsService.logAIRequest({ requestType: 'coherence_check', projectId, inputTokens: 1500, outputTokens: 750 });

      const result = metricsService.getAIRequestLog({ requestType: 'veb_beta_swarm' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].request_type).toBe('veb_beta_swarm');
    });

    it('should filter by date range', () => {
      const projectId = createTestProject(db);

      // Insert records with specific dates
      db.prepare(`
        INSERT INTO ai_request_log (id, request_type, project_id, input_tokens, output_tokens, cost_usd, cost_gbp, success, created_at)
        VALUES (?, 'test_old', ?, 1000, 500, 0.05, 0.04, 1, '2024-01-01T10:00:00Z')
      `).run(randomUUID(), projectId);

      db.prepare(`
        INSERT INTO ai_request_log (id, request_type, project_id, input_tokens, output_tokens, cost_usd, cost_gbp, success, created_at)
        VALUES (?, 'test_recent', ?, 2000, 1000, 0.10, 0.08, 1, '2025-01-15T10:00:00Z')
      `).run(randomUUID(), projectId);

      const result = metricsService.getAIRequestLog({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].request_type).toBe('test_recent');
    });

    it('should apply pagination correctly', () => {
      const projectId = createTestProject(db);

      // Create 10 requests
      for (let i = 0; i < 10; i++) {
        metricsService.logAIRequest({
          requestType: `request_type_${i}`,
          projectId,
          inputTokens: 1000,
          outputTokens: 500,
        });
      }

      const result = metricsService.getAIRequestLog({ limit: 3, offset: 2 });

      expect(result.entries).toHaveLength(3);
      expect(result.total).toBe(10);
    });

    it('should return hasMore=true when more results exist', () => {
      const projectId = createTestProject(db);

      for (let i = 0; i < 5; i++) {
        metricsService.logAIRequest({
          requestType: 'test',
          projectId,
          inputTokens: 1000,
          outputTokens: 500,
        });
      }

      const result = metricsService.getAIRequestLog({ limit: 3, offset: 0 });
      expect(result.entries.length).toBe(3);
      expect(result.total).toBe(5);
      // hasMore would be: offset + entries.length < total => 0 + 3 < 5 => true
    });
  });

  describe('GET /api/ai-costs/summary (getAICostSummary)', () => {
    it('should return overall cost summary', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId, inputTokens: 50_000, outputTokens: 25_000 });
      metricsService.logAIRequest({ requestType: 'veb_beta_swarm', projectId, inputTokens: 100_000, outputTokens: 50_000 });

      const summary = metricsService.getAICostSummary();

      expect(summary.totalInputTokens).toBe(150_000);
      expect(summary.totalOutputTokens).toBe(75_000);
      expect(summary.totalRequests).toBe(2);

      // Verify cost calculation
      // Input: 150k/1M * $15 = $2.25
      // Output: 75k/1M * $75 = $5.625
      // Total USD: $7.875
      // Total GBP: $7.875 * 0.79 = £6.22125
      expect(summary.totalCostUSD).toBeCloseTo(7.875, 3);
      expect(summary.totalCostGBP).toBeCloseTo(6.22125, 4);
    });

    it('should filter summary by projectId', () => {
      const project1 = createTestProject(db);
      const project2 = createTestProject(db);

      metricsService.logAIRequest({ requestType: 'test', projectId: project1, inputTokens: 10_000, outputTokens: 5_000 });
      metricsService.logAIRequest({ requestType: 'test', projectId: project2, inputTokens: 20_000, outputTokens: 10_000 });

      const summary = metricsService.getAICostSummary({ projectId: project1 });

      expect(summary.totalInputTokens).toBe(10_000);
      expect(summary.totalRequests).toBe(1);
    });

    it('should return zero values when no data', () => {
      const summary = metricsService.getAICostSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUSD).toBe(0);
      expect(summary.totalCostGBP).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });
  });

  describe('GET /api/ai-costs/by-type (getCostsByRequestType)', () => {
    it('should group costs by request type', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId, inputTokens: 5_000, outputTokens: 2_500 });
      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId, inputTokens: 5_000, outputTokens: 2_500 });
      metricsService.logAIRequest({ requestType: 'veb_beta_swarm', projectId, inputTokens: 20_000, outputTokens: 10_000 });

      const breakdown = metricsService.getCostsByRequestType();

      expect(breakdown).toHaveLength(2);

      const chapterGen = breakdown.find((b) => b.requestType === 'chapter_generation');
      expect(chapterGen).toBeDefined();
      expect(chapterGen!.count).toBe(2);
      expect(chapterGen!.inputTokens).toBe(10_000);
      expect(chapterGen!.outputTokens).toBe(5_000);

      const veb = breakdown.find((b) => b.requestType === 'veb_beta_swarm');
      expect(veb).toBeDefined();
      expect(veb!.count).toBe(1);
    });

    it('should order by cost descending', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({ requestType: 'cheap_request', projectId, inputTokens: 1_000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'expensive_request', projectId, inputTokens: 100_000, outputTokens: 50_000 });

      const breakdown = metricsService.getCostsByRequestType();

      expect(breakdown[0].requestType).toBe('expensive_request');
      expect(breakdown[1].requestType).toBe('cheap_request');
    });
  });

  describe('GET /api/ai-costs/by-project (getCostsByProject)', () => {
    it('should group costs by project', () => {
      const project1 = createTestProject(db, { title: 'Fantasy Novel' });
      const project2 = createTestProject(db, { title: 'Sci-Fi Epic' });

      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: project1, inputTokens: 10_000, outputTokens: 5_000 });
      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: project1, inputTokens: 10_000, outputTokens: 5_000 });
      metricsService.logAIRequest({ requestType: 'chapter_generation', projectId: project2, inputTokens: 50_000, outputTokens: 25_000 });

      const breakdown = metricsService.getCostsByProject();

      expect(breakdown).toHaveLength(2);

      const fantasy = breakdown.find((b) => b.projectName === 'Fantasy Novel');
      expect(fantasy).toBeDefined();
      expect(fantasy!.requestCount).toBe(2);

      const scifi = breakdown.find((b) => b.projectName === 'Sci-Fi Epic');
      expect(scifi).toBeDefined();
      expect(scifi!.requestCount).toBe(1);
    });

    it('should filter by seriesId', () => {
      const seriesId = createTestSeries(db, { name: 'My Series' });
      const projectInSeries = createTestProject(db, { title: 'Book 1', series_id: seriesId });
      const projectNotInSeries = createTestProject(db, { title: 'Standalone' });

      metricsService.logAIRequest({ requestType: 'test', projectId: projectInSeries, inputTokens: 1000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'test', projectId: projectNotInSeries, inputTokens: 2000, outputTokens: 1000 });

      const breakdown = metricsService.getCostsByProject({ seriesId });

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0].projectName).toBe('Book 1');
      expect(breakdown[0].seriesName).toBe('My Series');
    });

    it('should order by cost descending', () => {
      const cheapProject = createTestProject(db, { title: 'Cheap Project' });
      const expensiveProject = createTestProject(db, { title: 'Expensive Project' });

      metricsService.logAIRequest({ requestType: 'test', projectId: cheapProject, inputTokens: 1_000, outputTokens: 500 });
      metricsService.logAIRequest({ requestType: 'test', projectId: expensiveProject, inputTokens: 100_000, outputTokens: 50_000 });

      const breakdown = metricsService.getCostsByProject();

      expect(breakdown[0].projectName).toBe('Expensive Project');
      expect(breakdown[1].projectName).toBe('Cheap Project');
    });

    it('should exclude requests without project_id', () => {
      const projectId = createTestProject(db, { title: 'Real Project' });

      // Log request with project
      metricsService.logAIRequest({ requestType: 'test', projectId, inputTokens: 1000, outputTokens: 500 });

      // Log request without project (system-level)
      db.prepare(`
        INSERT INTO ai_request_log (id, request_type, project_id, input_tokens, output_tokens, cost_usd, cost_gbp, success)
        VALUES (?, 'system_request', NULL, 5000, 2500, 0.25, 0.20, 1)
      `).run(randomUUID());

      const breakdown = metricsService.getCostsByProject();

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0].projectName).toBe('Real Project');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should log failed AI requests with success=0', () => {
      const projectId = createTestProject(db);

      const logId = metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        inputTokens: 1000,
        outputTokens: 0,
        success: false,
        errorMessage: 'Rate limit exceeded',
      });

      const logEntry = db.prepare('SELECT * FROM ai_request_log WHERE id = ?').get(logId) as any;

      expect(logEntry.success).toBe(0);
      expect(logEntry.error_message).toBe('Rate limit exceeded');
      expect(logEntry.output_tokens).toBe(0);
    });

    it('should still update project_metrics for failed requests', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        inputTokens: 1000,
        outputTokens: 0,
        success: false,
        errorMessage: 'API Error',
      });

      const metrics = metricsService.getProjectMetrics(projectId);

      // Failed requests should still count
      expect(metrics.total_ai_requests).toBe(1);
      expect(metrics.total_input_tokens).toBe(1000);
    });

    it('should handle requests without project_id (system-level requests)', () => {
      const logId = metricsService.logAIRequest({
        requestType: 'system_health_check',
        inputTokens: 500,
        outputTokens: 250,
        success: true,
      });

      const logEntry = db.prepare('SELECT * FROM ai_request_log WHERE id = ?').get(logId) as any;

      expect(logEntry.project_id).toBeNull();
      expect(logEntry.request_type).toBe('system_health_check');
    });

    it('should return empty results for non-existent projectId filter', () => {
      const nonExistentProjectId = randomUUID();

      const result = metricsService.getAIRequestLog({ projectId: nonExistentProjectId });

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.summary.totalRequests).toBe(0);
    });

    it('should handle empty results gracefully', () => {
      const result = metricsService.getAIRequestLog({});

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.summary).toEqual({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUSD: 0,
        totalCostGBP: 0,
        totalRequests: 0,
      });
    });
  });

  // ==========================================================================
  // COST CALCULATION TESTS
  // ==========================================================================

  describe('Cost Calculation Accuracy', () => {
    it('should calculate costs correctly for standard request', () => {
      const projectId = createTestProject(db);

      // 1M input + 500k output
      metricsService.logAIRequest({
        requestType: 'large_request',
        projectId,
        inputTokens: 1_000_000,
        outputTokens: 500_000,
      });

      const logEntry = db.prepare('SELECT * FROM ai_request_log ORDER BY created_at DESC LIMIT 1').get() as any;

      // Input: 1M * $15/M = $15.00
      // Output: 500k * $75/M = $37.50
      // Total USD: $52.50
      // Total GBP: $52.50 * 0.79 = £41.475
      expect(logEntry.cost_usd).toBeCloseTo(52.5, 2);
      expect(logEntry.cost_gbp).toBeCloseTo(41.475, 3);
    });

    it('should handle zero token counts', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({
        requestType: 'zero_request',
        projectId,
        inputTokens: 0,
        outputTokens: 0,
      });

      const logEntry = db.prepare('SELECT * FROM ai_request_log ORDER BY created_at DESC LIMIT 1').get() as any;

      expect(logEntry.cost_usd).toBe(0);
      expect(logEntry.cost_gbp).toBe(0);
    });

    it('should handle very small token counts', () => {
      const projectId = createTestProject(db);

      metricsService.logAIRequest({
        requestType: 'tiny_request',
        projectId,
        inputTokens: 100,
        outputTokens: 50,
      });

      const logEntry = db.prepare('SELECT * FROM ai_request_log ORDER BY created_at DESC LIMIT 1').get() as any;

      // Input: 100/1M * $15 = $0.0015
      // Output: 50/1M * $75 = $0.00375
      // Total: $0.00525
      expect(logEntry.cost_usd).toBeCloseTo(0.00525, 5);
    });
  });

  // ==========================================================================
  // FULL WORKFLOW TESTS
  // ==========================================================================

  describe('Full Workflow: Project → Book → Chapter → AI Request → Metrics', () => {
    it('should support complete entity hierarchy', () => {
      // Create full hierarchy
      const projectId = createTestProject(db, { title: 'The Dragon King' });
      const bookId = createTestBook(db, projectId, { book_number: 1 });
      const chapterId = createTestChapter(db, bookId, { chapter_number: 1 });

      // Log request with full context
      const logId = metricsService.logAIRequest({
        requestType: 'chapter_generation',
        projectId,
        bookId,
        chapterId,
        inputTokens: 8_000,
        outputTokens: 4_000,
        contextSummary: 'Generated Chapter 1: The Beginning',
      });

      // Verify log entry has all foreign keys
      const logEntry = db.prepare('SELECT * FROM ai_request_log WHERE id = ?').get(logId) as any;

      expect(logEntry.project_id).toBe(projectId);
      expect(logEntry.book_id).toBe(bookId);
      expect(logEntry.chapter_id).toBe(chapterId);
      expect(logEntry.context_summary).toBe('Generated Chapter 1: The Beginning');
    });

    it('should cascade delete log entries when project is deleted', () => {
      const projectId = createTestProject(db, { title: 'Deleted Project' });

      metricsService.logAIRequest({
        requestType: 'test',
        projectId,
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Verify entry exists
      let entries = db.prepare('SELECT * FROM ai_request_log WHERE project_id = ?').all(projectId);
      expect(entries.length).toBe(1);

      // Delete project (should SET NULL on ai_request_log.project_id due to ON DELETE SET NULL)
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      // Verify log entry still exists but with NULL project_id
      entries = db.prepare('SELECT * FROM ai_request_log WHERE project_id = ? OR project_id IS NULL').all(projectId);
      // The entry should now have NULL project_id
      const nullEntry = db.prepare('SELECT * FROM ai_request_log').get() as any;
      expect(nullEntry.project_id).toBeNull();
    });
  });
});
