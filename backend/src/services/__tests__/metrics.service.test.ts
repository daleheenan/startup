/**
 * Metrics Service Tests
 * Tests for token tracking, cost calculation, and metrics formatting
 */

import { jest } from '@jest/globals';
import type { ProjectMetrics } from '../metrics.service.js';

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

describe('MetricsService', () => {
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

  describe('formatMetrics', () => {
    it('should format token counts correctly', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 123456,
        total_output_tokens: 2_345_678,
        total_cost_usd: 100,
        total_cost_gbp: 79,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 100,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.tokens.input).toBe('123K');
      expect(formatted.tokens.output).toBe('2.3M');
      expect(formatted.tokens.display).toBe('123K in / 2.3M out');
    });

    it('should format costs correctly', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 100,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.cost.usd).toBe('$16.50');
      expect(formatted.cost.gbp).toBe('£13.04');
      expect(formatted.cost.display).toBe('£13.04'); // Only displays GBP
    });

    it('should format content metrics correctly', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 24,
        total_word_count: 87500,
        reading_time_minutes: 350,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.content.chapters).toBe(24);
      expect(formatted.content.words).toBe(87500);
      expect(formatted.content.display).toBe('24 chapters • 87,500 words');
    });

    it('should handle singular chapter correctly', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 1,
        total_word_count: 5000,
        reading_time_minutes: 20,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.content.display).toBe('1 chapter • 5,000 words');
    });

    it('should format reading time correctly for hours and minutes', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 350,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.reading.minutes).toBe(350);
      expect(formatted.reading.display).toBe('~5h 50m read time');
    });

    it('should format reading time correctly for hours only', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 180,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.reading.display).toBe('~3h read time');
    });

    it('should format reading time correctly for minutes only', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 45,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.reading.display).toBe('~45m read time');
    });
  });

  describe('getProjectMetrics', () => {
    it('should return project metrics when found', () => {
      const projectId = 'project-123';
      const mockMetrics: ProjectMetrics = {
        project_id: projectId,
        total_input_tokens: 100000,
        total_output_tokens: 200000,
        total_cost_usd: 16.5,
        total_cost_gbp: 13.04,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 100,
        updated_at: '2025-01-25T10:00:00Z',
      };

      mockStatement.get.mockReturnValue(mockMetrics);

      const result = metricsService.getProjectMetrics(projectId);

      expect(result).toEqual(mockMetrics);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should return null when project not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = metricsService.getProjectMetrics('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', () => {
      mockStatement.get.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = metricsService.getProjectMetrics('project-123');

      expect(result).toBeNull();
      // Logger handles error logging - no need to verify console calls
    });
  });

  describe('getFormattedMetrics', () => {
    it('should return formatted metrics for a project', () => {
      const projectId = 'project-123';
      const mockMetrics: ProjectMetrics = {
        project_id: projectId,
        total_input_tokens: 123456,
        total_output_tokens: 2_345_678,
        total_cost_usd: 100,
        total_cost_gbp: 79,
        total_chapters: 10,
        total_word_count: 25000,
        reading_time_minutes: 100,
        updated_at: '2025-01-25T10:00:00Z',
      };

      mockStatement.get.mockReturnValue(mockMetrics);

      const result = metricsService.getFormattedMetrics(projectId);

      expect(result).toBeDefined();
      expect(result?.tokens.input).toBe('123K');
      expect(result?.tokens.output).toBe('2.3M');
    });

    it('should return null when project not found', () => {
      mockStatement.get.mockReturnValue(undefined);

      const result = metricsService.getFormattedMetrics('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllProjectMetrics', () => {
    it('should return formatted metrics for all projects', () => {
      const mockMetrics: ProjectMetrics[] = [
        {
          project_id: 'project-1',
          total_input_tokens: 100000,
          total_output_tokens: 200000,
          total_cost_usd: 16.5,
          total_cost_gbp: 13.04,
          total_chapters: 10,
          total_word_count: 25000,
          reading_time_minutes: 100,
          updated_at: '2025-01-25T10:00:00Z',
        },
        {
          project_id: 'project-2',
          total_input_tokens: 50000,
          total_output_tokens: 100000,
          total_cost_usd: 8.25,
          total_cost_gbp: 6.52,
          total_chapters: 5,
          total_word_count: 12500,
          reading_time_minutes: 50,
          updated_at: '2025-01-25T10:00:00Z',
        },
      ];

      mockStatement.all.mockReturnValue(mockMetrics);

      const result = metricsService.getAllProjectMetrics();

      expect(result.size).toBe(2);
      expect(result.has('project-1')).toBe(true);
      expect(result.has('project-2')).toBe(true);

      const project1Metrics = result.get('project-1');
      expect(project1Metrics?.tokens.input).toBe('100K');
    });

    it('should return empty map on error', () => {
      mockStatement.all.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = metricsService.getAllProjectMetrics();

      expect(result.size).toBe(0);
      // Logger handles error logging - no need to verify console calls
    });
  });

  describe('trackChapterTokens', () => {
    it('should update chapter token counts', () => {
      const chapterId = 'chapter-123';
      const inputTokens = 1000;
      const outputTokens = 2000;

      mockStatement.get.mockReturnValue({ project_id: 'project-456' });

      metricsService.trackChapterTokens(chapterId, inputTokens, outputTokens);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => {
        metricsService.trackChapterTokens('chapter-123', 1000, 2000);
      }).not.toThrow();

      // Logger handles error logging - no need to verify console calls
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero token counts', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_cost_gbp: 0,
        total_chapters: 0,
        total_word_count: 0,
        reading_time_minutes: 0,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.tokens.input).toBe('0');
      expect(formatted.tokens.output).toBe('0');
      expect(formatted.cost.usd).toBe('$0.00');
      expect(formatted.cost.gbp).toBe('£0.00');
    });

    it('should handle very large token counts', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 150_000_000,
        total_output_tokens: 250_000_000,
        total_cost_usd: 20000,
        total_cost_gbp: 15800,
        total_chapters: 100,
        total_word_count: 500000,
        reading_time_minutes: 2000,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.tokens.input).toBe('150.0M');
      expect(formatted.tokens.output).toBe('250.0M');
    });

    it('should handle small token counts (under 1000)', () => {
      const metrics: ProjectMetrics = {
        project_id: 'project-123',
        total_input_tokens: 456,
        total_output_tokens: 789,
        total_cost_usd: 0.05,
        total_cost_gbp: 0.04,
        total_chapters: 1,
        total_word_count: 100,
        reading_time_minutes: 1,
        updated_at: '2025-01-25T10:00:00Z',
      };

      const formatted = metricsService.formatMetrics(metrics);

      expect(formatted.tokens.input).toBe('456');
      expect(formatted.tokens.output).toBe('789');
      expect(formatted.tokens.display).toBe('456 in / 789 out');
    });
  });
});
