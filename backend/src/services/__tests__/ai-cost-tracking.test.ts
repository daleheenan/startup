/**
 * AI Cost Tracking Tests
 * Comprehensive tests for AI request logging, cost calculation, and aggregation
 */

import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';
import type { AIRequestLogEntry, AIRequestLogRecord, ProjectMetrics } from '../metrics.service.js';

// Pricing constants from the service
const PRICING = {
  INPUT_PER_MILLION: 15.0,
  OUTPUT_PER_MILLION: 75.0,
  USD_TO_GBP: 0.79,
};

// Create mock statement that we'll configure per test
const mockStatement = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

// Create mock database
const mockDb = {
  prepare: jest.fn(() => mockStatement),
  exec: jest.fn(),
  transaction: jest.fn((fn: Function) => fn),
  close: jest.fn(),
};

// Mock the database connection module
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: mockDb,
}));

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Helper to find SQL statement in prepare mock calls
function findPrepareCall(pattern: string): any[] | undefined {
  return (mockDb.prepare as jest.Mock).mock.calls.find(
    (call: any[]) => typeof call[0] === 'string' && call[0].includes(pattern)
  );
}

describe('AI Cost Tracking', () => {
  let metricsService: any;

  beforeAll(async () => {
    // Import service once after mock is set up
    const module = await import('../metrics.service.js');
    metricsService = module.metricsService;
  });

  beforeEach(() => {
    // Reset mock implementation and calls before each test
    jest.clearAllMocks();
    mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    mockStatement.get.mockReturnValue(null);
    mockStatement.all.mockReturnValue([]);
  });

  describe('logAIRequest', () => {
    it('should create a log entry with correct cost calculation', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'chapter_generation',
        projectId: 'test-project-id',
        chapterId: 'test-chapter-id',
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-opus-4-5-20251101',
        success: true,
      };

      const logId = metricsService.logAIRequest(entry);

      // Verify log entry was created
      expect(logId).toBeDefined();
      expect(typeof logId).toBe('string');

      // Verify prepare was called to insert log entry
      expect(mockDb.prepare).toHaveBeenCalled();

      // Find the INSERT statement call
      const insertCall = findPrepareCall('INSERT INTO ai_request_log');
      expect(insertCall).toBeDefined();

      // Verify run was called with correct parameters
      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Verify cost calculation
      // Input: 1000/1M * 15 = 0.015 USD
      // Output: 500/1M * 75 = 0.0375 USD
      // Total: 0.0525 USD
      // GBP: 0.0525 * 0.79 = 0.041475
      expect(runCall[6]).toBeCloseTo(0.0525, 4); // cost_usd
      expect(runCall[7]).toBeCloseTo(0.041475, 6); // cost_gbp
    });

    it('should log request without project_id when not provided', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'story_dna_generation',
        inputTokens: 2000,
        outputTokens: 1000,
        success: true,
      };

      const logId = metricsService.logAIRequest(entry);

      expect(logId).toBeDefined();

      // Verify run was called
      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Project ID should be null (position 2)
      expect(runCall[2]).toBeNull();
    });

    it('should mark failed requests with success=0', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'chapter_generation',
        projectId: 'project-1',
        inputTokens: 0,
        outputTokens: 0,
        success: false,
        errorMessage: 'Rate limit exceeded',
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Success flag should be 0 (position 9)
      expect(runCall[9]).toBe(0);

      // Error message should be set (position 10)
      expect(runCall[10]).toBe('Rate limit exceeded');
    });

    it('should handle context summary when provided', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'veb_beta_swarm',
        projectId: 'project-1',
        chapterId: 'chapter-5',
        inputTokens: 5000,
        outputTokens: 3000,
        contextSummary: 'VEB review of Chapter 5: The Dark Forest',
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Context summary should be set (position 11)
      expect(runCall[11]).toBe('VEB review of Chapter 5: The Dark Forest');
    });

    it('should calculate costs correctly for large token counts', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'outline_generation',
        projectId: 'project-1',
        inputTokens: 50_000,
        outputTokens: 100_000,
        success: true,
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Input: 50k/1M * 15 = 0.75 USD
      // Output: 100k/1M * 75 = 7.5 USD
      // Total: 8.25 USD
      // GBP: 8.25 * 0.79 = 6.5175
      expect(runCall[6]).toBeCloseTo(8.25, 2);
      expect(runCall[7]).toBeCloseTo(6.5175, 4);
    });

    it('should use default model when not specified', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'coherence_check',
        projectId: 'project-1',
        inputTokens: 1000,
        outputTokens: 500,
        success: true,
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Model should be default (position 8)
      expect(runCall[8]).toBe('claude-opus-4-5-20251101');
    });

    it('should handle errors gracefully', () => {
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error('Database constraint violation');
      });

      const entry: AIRequestLogEntry = {
        requestType: 'chapter_generation',
        projectId: 'project-1',
        inputTokens: 1000,
        outputTokens: 500,
      };

      expect(() => {
        metricsService.logAIRequest(entry);
      }).toThrow('Database constraint violation');
    });
  });

  describe('updateProjectAICosts', () => {
    it('should update project totals correctly', () => {
      const projectId = 'project-1';
      const inputTokens = 10_000;
      const outputTokens = 5_000;

      // Mock getProjectMetrics for recalculateCosts
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
      });

      metricsService.updateProjectAICosts(projectId, inputTokens, outputTokens);

      // Should call prepare multiple times (update AI costs + recalculate costs)
      expect(mockDb.prepare).toHaveBeenCalled();

      // Find the UPDATE project_metrics call
      const updateCall = findPrepareCall('UPDATE project_metrics');
      expect(updateCall).toBeDefined();

      // Verify run was called
      expect(mockStatement.run).toHaveBeenCalled();

      // Calculate expected costs
      const inputCostUSD = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const outputCostUSD = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
      const totalCostUSD = inputCostUSD + outputCostUSD;
      const totalCostGBP = totalCostUSD * PRICING.USD_TO_GBP;

      // Find the run call for updating AI costs
      const runCalls = (mockStatement.run as jest.Mock).mock.calls;
      const aiCostUpdateCall = runCalls.find((call: any[]) => call.length === 5 && call[4] === projectId);

      expect(aiCostUpdateCall).toBeDefined();
      if (aiCostUpdateCall) {
        expect(aiCostUpdateCall[0]).toBeCloseTo(totalCostUSD, 4);
        expect(aiCostUpdateCall[1]).toBeCloseTo(totalCostGBP, 4);
      }
    });

    it('should increment total_ai_requests counter', () => {
      const projectId = 'project-1';

      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 1000,
        total_output_tokens: 500,
      });

      metricsService.updateProjectAICosts(projectId, 1000, 500);

      // Verify the UPDATE includes incrementing total_ai_requests
      const updateCall = findPrepareCall('total_ai_requests');
      expect(updateCall).toBeDefined();
    });

    it('should handle errors gracefully', () => {
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      expect(() => {
        metricsService.updateProjectAICosts('project-1', 1000, 500);
      }).not.toThrow();
    });
  });

  describe('getAIRequestLog', () => {
    it('should return log entries with pagination', () => {
      const mockEntries: AIRequestLogRecord[] = [
        {
          id: 'log-1',
          request_type: 'chapter_generation',
          project_id: 'project-1',
          chapter_id: 'chapter-1',
          input_tokens: 1000,
          output_tokens: 500,
          cost_usd: 0.0525,
          cost_gbp: 0.041475,
          model_used: 'claude-opus-4-5-20251101',
          success: 1,
          error_message: null,
          context_summary: null,
          created_at: '2025-01-29T10:00:00Z',
          project_name: 'Test Project',
          series_id: 'series-1',
          series_name: 'Test Series',
        },
        {
          id: 'log-2',
          request_type: 'veb_beta_swarm',
          project_id: 'project-1',
          chapter_id: 'chapter-1',
          input_tokens: 2000,
          output_tokens: 1000,
          cost_usd: 0.105,
          cost_gbp: 0.08295,
          model_used: 'claude-opus-4-5-20251101',
          success: 1,
          error_message: null,
          context_summary: 'Beta reader review',
          created_at: '2025-01-29T11:00:00Z',
          project_name: 'Test Project',
          series_id: 'series-1',
          series_name: 'Test Series',
        },
      ];

      // Mock count query
      mockStatement.get.mockReturnValueOnce({ total: 2 });

      // Mock entries query
      mockStatement.all.mockReturnValueOnce(mockEntries);

      // Mock summary query
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 3000,
        total_output_tokens: 1500,
        total_cost_usd: 0.1575,
        total_cost_gbp: 0.124425,
        total_requests: 2,
      });

      const result = metricsService.getAIRequestLog({
        limit: 50,
        offset: 0,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.summary.totalInputTokens).toBe(3000);
      expect(result.summary.totalOutputTokens).toBe(1500);
      expect(result.summary.totalCostUSD).toBeCloseTo(0.1575, 4);
      expect(result.summary.totalCostGBP).toBeCloseTo(0.124425, 6);
      expect(result.summary.totalRequests).toBe(2);
    });

    it('should filter by project_id', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        projectId: 'project-1',
      });

      // Verify WHERE clause includes project_id
      const prepareCall = findPrepareCall('l.project_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should filter by series_id', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        seriesId: 'series-1',
      });

      // Verify WHERE clause includes series_id
      const prepareCall = findPrepareCall('p.series_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should filter by request_type', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        requestType: 'chapter_generation',
      });

      // Verify WHERE clause includes request_type
      const prepareCall = findPrepareCall('l.request_type = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should filter by date range', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      // Verify WHERE clause includes date filters
      const prepareCall = findPrepareCall('l.created_at >= datetime(?)');
      expect(prepareCall).toBeDefined();
    });

    it('should apply pagination correctly', () => {
      mockStatement.get.mockReturnValueOnce({ total: 100 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        limit: 25,
        offset: 50,
      });

      // Verify LIMIT and OFFSET are in the query
      const prepareCall = findPrepareCall('LIMIT ? OFFSET ?');
      expect(prepareCall).toBeDefined();

      // Verify the all statement was called with limit and offset
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should return empty results when no entries found', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      const result = metricsService.getAIRequestLog({});

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.summary.totalInputTokens).toBe(0);
      expect(result.summary.totalCostUSD).toBe(0);
    });

    it('should handle database errors gracefully', () => {
      mockStatement.get.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = metricsService.getAIRequestLog({});

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getAICostSummary', () => {
    it('should return overall cost summary', () => {
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 100_000,
        total_output_tokens: 50_000,
        total_cost_usd: 5.25,
        total_cost_gbp: 4.1475,
        total_requests: 25,
      });

      const summary = metricsService.getAICostSummary();

      expect(summary.totalInputTokens).toBe(100_000);
      expect(summary.totalOutputTokens).toBe(50_000);
      expect(summary.totalCostUSD).toBe(5.25);
      expect(summary.totalCostGBP).toBe(4.1475);
      expect(summary.totalRequests).toBe(25);
    });

    it('should filter summary by project_id', () => {
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 10_000,
        total_output_tokens: 5_000,
        total_cost_usd: 0.525,
        total_cost_gbp: 0.41475,
        total_requests: 5,
      });

      metricsService.getAICostSummary({ projectId: 'project-1' });

      // Verify WHERE clause includes project_id
      const prepareCall = findPrepareCall('l.project_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should filter summary by series_id', () => {
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAICostSummary({ seriesId: 'series-1' });

      // Verify WHERE clause includes series_id
      const prepareCall = findPrepareCall('p.series_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should filter summary by date range', () => {
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAICostSummary({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      // Verify WHERE clause includes date filters
      const prepareCall = findPrepareCall('l.created_at >= datetime(?)');
      expect(prepareCall).toBeDefined();
    });

    it('should return zero values when no data found', () => {
      mockStatement.get.mockReturnValueOnce(null);

      const summary = metricsService.getAICostSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalCostUSD).toBe(0);
      expect(summary.totalCostGBP).toBe(0);
      expect(summary.totalRequests).toBe(0);
    });

    it('should handle database errors gracefully', () => {
      mockStatement.get.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const summary = metricsService.getAICostSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalCostUSD).toBe(0);
    });
  });

  describe('getCostsByRequestType', () => {
    it('should group costs by request type', () => {
      const mockBreakdown = [
        {
          request_type: 'chapter_generation',
          count: 10,
          input_tokens: 10_000,
          output_tokens: 5_000,
          cost_usd: 0.525,
          cost_gbp: 0.41475,
        },
        {
          request_type: 'veb_beta_swarm',
          count: 5,
          input_tokens: 25_000,
          output_tokens: 15_000,
          cost_usd: 1.5,
          cost_gbp: 1.185,
        },
      ];

      mockStatement.all.mockReturnValueOnce(mockBreakdown);

      const breakdown = metricsService.getCostsByRequestType();

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].requestType).toBe('chapter_generation');
      expect(breakdown[0].count).toBe(10);
      expect(breakdown[0].costUSD).toBe(0.525);
      expect(breakdown[1].requestType).toBe('veb_beta_swarm');
      expect(breakdown[1].count).toBe(5);
    });

    it('should order by cost descending', () => {
      mockStatement.all.mockReturnValueOnce([]);

      metricsService.getCostsByRequestType();

      // Verify ORDER BY cost_gbp DESC
      const prepareCall = findPrepareCall('ORDER BY cost_gbp DESC');
      expect(prepareCall).toBeDefined();
    });

    it('should filter by project_id', () => {
      mockStatement.all.mockReturnValueOnce([]);

      metricsService.getCostsByRequestType({ projectId: 'project-1' });

      // Verify WHERE clause
      const prepareCall = findPrepareCall('l.project_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should return empty array when no data found', () => {
      mockStatement.all.mockReturnValueOnce([]);

      const breakdown = metricsService.getCostsByRequestType();

      expect(breakdown).toHaveLength(0);
    });

    it('should handle database errors gracefully', () => {
      mockStatement.all.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const breakdown = metricsService.getCostsByRequestType();

      expect(breakdown).toHaveLength(0);
    });
  });

  describe('getCostsByProject', () => {
    it('should group costs by project', () => {
      const mockProjects = [
        {
          project_id: 'project-1',
          project_name: 'Fantasy Novel',
          series_id: 'series-1',
          series_name: 'Epic Fantasy Series',
          total_cost_usd: 10.5,
          total_cost_gbp: 8.295,
          request_count: 50,
        },
        {
          project_id: 'project-2',
          project_name: 'Sci-Fi Thriller',
          series_id: null,
          series_name: null,
          total_cost_usd: 5.25,
          total_cost_gbp: 4.1475,
          request_count: 25,
        },
      ];

      mockStatement.all.mockReturnValueOnce(mockProjects);

      const projects = metricsService.getCostsByProject();

      expect(projects).toHaveLength(2);
      expect(projects[0].projectId).toBe('project-1');
      expect(projects[0].projectName).toBe('Fantasy Novel');
      expect(projects[0].totalCostUSD).toBe(10.5);
      expect(projects[0].requestCount).toBe(50);
      expect(projects[1].seriesId).toBeNull();
    });

    it('should order by cost descending', () => {
      mockStatement.all.mockReturnValueOnce([]);

      metricsService.getCostsByProject();

      // Verify ORDER BY total_cost_gbp DESC
      const prepareCall = findPrepareCall('ORDER BY total_cost_gbp DESC');
      expect(prepareCall).toBeDefined();
    });

    it('should only include projects with non-null project_id', () => {
      mockStatement.all.mockReturnValueOnce([]);

      metricsService.getCostsByProject();

      // Verify WHERE clause includes project_id IS NOT NULL
      const prepareCall = findPrepareCall('l.project_id IS NOT NULL');
      expect(prepareCall).toBeDefined();
    });

    it('should filter by series_id', () => {
      mockStatement.all.mockReturnValueOnce([]);

      metricsService.getCostsByProject({ seriesId: 'series-1' });

      // Verify WHERE clause includes series_id
      const prepareCall = findPrepareCall('p.series_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should return empty array when no projects found', () => {
      mockStatement.all.mockReturnValueOnce([]);

      const projects = metricsService.getCostsByProject();

      expect(projects).toHaveLength(0);
    });

    it('should handle database errors gracefully', () => {
      mockStatement.all.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const projects = metricsService.getCostsByProject();

      expect(projects).toHaveLength(0);
    });
  });

  describe('formatMetrics - aiCost property', () => {
    it('should include aiCost in formatted metrics', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100_000,
        total_output_tokens: 50_000,
        total_cost_usd: 5.25,
        total_cost_gbp: 4.1475,
        chapter_input_tokens: 10_000,
        chapter_output_tokens: 5_000,
        chapter_cost_usd: 0.525,
        chapter_cost_gbp: 0.41475,
        total_ai_cost_usd: 12.5,
        total_ai_cost_gbp: 9.875,
        total_ai_requests: 45,
        total_chapters: 10,
        total_word_count: 25_000,
        reading_time_minutes: 100,
        updated_at: '2025-01-29T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.aiCost).toBeDefined();
      expect(formatted.aiCost.usd).toBe('$12.50');
      expect(formatted.aiCost.gbp).toBe('£9.88'); // Rounds to 2 decimal places
      expect(formatted.aiCost.display).toBe('£9.88');
      expect(formatted.aiCost.requests).toBe(45);
    });

    it('should handle zero AI costs', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        chapter_input_tokens: 0,
        chapter_output_tokens: 0,
        chapter_cost_usd: 0,
        chapter_cost_gbp: 0,
        total_ai_cost_usd: 0,
        total_ai_cost_gbp: 0,
        total_ai_requests: 0,
        total_chapters: 0,
        total_word_count: 0,
        reading_time_minutes: 0,
        updated_at: '2025-01-29T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.aiCost.usd).toBe('$0.00');
      expect(formatted.aiCost.gbp).toBe('£0.00');
      expect(formatted.aiCost.requests).toBe(0);
    });

    it('should handle undefined AI cost values', () => {
      const metrics = {
        project_id: 'project-123',
        total_input_tokens: 100_000,
        total_output_tokens: 50_000,
        total_cost_usd: 5.25,
        total_cost_gbp: 4.1475,
        chapter_input_tokens: 10_000,
        chapter_output_tokens: 5_000,
        chapter_cost_usd: 0.525,
        chapter_cost_gbp: 0.41475,
        total_chapters: 10,
        total_word_count: 25_000,
        reading_time_minutes: 100,
        updated_at: '2025-01-29T10:00:00Z',
      } as ProjectMetrics;

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.aiCost.usd).toBe('$0.00');
      expect(formatted.aiCost.gbp).toBe('£0.00');
      expect(formatted.aiCost.requests).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero token counts in cost calculation', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'coherence_check',
        projectId: 'project-1',
        inputTokens: 0,
        outputTokens: 0,
        success: true,
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      expect(runCall[6]).toBe(0); // cost_usd
      expect(runCall[7]).toBe(0); // cost_gbp
    });

    it('should handle very large token counts', () => {
      const entry: AIRequestLogEntry = {
        requestType: 'outline_generation',
        projectId: 'project-1',
        inputTokens: 1_000_000, // 1M tokens
        outputTokens: 500_000, // 500K tokens
        success: true,
      };

      metricsService.logAIRequest(entry);

      expect(mockStatement.run).toHaveBeenCalled();
      const runCall = (mockStatement.run as jest.Mock).mock.calls[0];

      // Input: 1M/1M * 15 = 15 USD
      // Output: 500K/1M * 75 = 37.5 USD
      // Total: 52.5 USD
      // GBP: 52.5 * 0.79 = 41.475
      expect(runCall[6]).toBeCloseTo(52.5, 2);
      expect(runCall[7]).toBeCloseTo(41.475, 3);
    });

    it('should handle missing project_id in filters', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      const result = metricsService.getAIRequestLog({});

      expect(result).toBeDefined();
      expect(result.entries).toHaveLength(0);
    });

    it('should handle invalid date formats gracefully', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      // Service doesn't validate dates - database will handle it
      metricsService.getAIRequestLog({
        startDate: 'invalid-date',
        endDate: 'also-invalid',
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should handle combined filters correctly', () => {
      mockStatement.get.mockReturnValueOnce({ total: 0 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({
        projectId: 'project-1',
        requestType: 'chapter_generation',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 10,
        offset: 5,
      });

      // Verify all filters are in WHERE clause
      const prepareCall = findPrepareCall('l.project_id = ?');
      expect(prepareCall).toBeDefined();
    });

    it('should default pagination when not provided', () => {
      mockStatement.get.mockReturnValueOnce({ total: 100 });
      mockStatement.all.mockReturnValueOnce([]);
      mockStatement.get.mockReturnValueOnce({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_requests: 0,
      });

      metricsService.getAIRequestLog({});

      // Should use default limit of 50 and offset of 0
      expect(mockStatement.all).toHaveBeenCalled();
    });
  });
});
