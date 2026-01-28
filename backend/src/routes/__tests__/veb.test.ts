import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Response } from 'express';

// =============================================================================
// Mock Setup
// =============================================================================

// Create mock database functions
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn(() => ({
  get: mockGet,
  all: mockAll,
  run: mockRun,
}));

// Mock database module
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: {
    prepare: mockPrepare,
  },
}));

// Mock logger
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock VEB service
const mockSubmitToVEB = jest.fn<() => Promise<{ reportId: string; status: string }>>();
jest.mock('../../services/veb.service.js', () => ({
  vebService: {
    submitToVEB: mockSubmitToVEB,
  },
}));

// Mock QueueWorker
const mockCreateJob = jest.fn();
jest.mock('../../queue/worker.js', () => ({
  QueueWorker: {
    createJob: mockCreateJob,
  },
}));

// Mock response helpers
const sendBadRequest = jest.fn((res: Response, message: string) =>
  res.status(400).json({ error: message })
);
const sendNotFound = jest.fn((res: Response, resource: string) =>
  res.status(404).json({ error: `${resource} not found` })
);
const sendInternalError = jest.fn((res: Response, error: Error | unknown, _context: string) => {
  const errorMessage = error instanceof Error ? error.message : 'Internal error';
  return res.status(500).json({ error: errorMessage });
});

jest.mock('../../utils/response-helpers.js', () => ({
  sendBadRequest,
  sendNotFound,
  sendInternalError,
}));

// Import router after mocks
import vebRouter from '../veb.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('VEB Routes', () => {
  let app: express.Application;

  // Helper to mock table existence checks
  const mockTablesExist = () => {
    let callCount = 0;
    mockGet.mockImplementation(() => {
      callCount++;
      // First two calls are for table existence checks (editorial_reports, veb_feedback)
      if (callCount <= 2) {
        return { name: 'table' };
      }
      // Subsequent calls return null by default
      return null;
    });
  };

  // Helper to mock table missing
  const mockTablesMissing = (missingTable: 'editorial_reports' | 'veb_feedback' = 'editorial_reports') => {
    let callCount = 0;
    mockGet.mockImplementation(() => {
      callCount++;
      if (missingTable === 'editorial_reports' && callCount === 1) {
        return null; // First table missing
      }
      if (missingTable === 'veb_feedback' && callCount === 2) {
        return null; // Second table missing
      }
      return { name: 'table' };
    });
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear(); // Use mockClear instead of mockReset to preserve implementation
    mockSubmitToVEB.mockReset();
    mockCreateJob.mockReset();

    // Setup default mock returns
    mockPrepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api', vebRouter);
  });

  // ===========================================================================
  // VEB Table Validation Middleware Tests
  // ===========================================================================

  describe('VEB Table Validation Middleware', () => {
    it('should return 503 when editorial_reports table is missing', async () => {
      mockTablesMissing('editorial_reports');

      const response = await request(app)
        .get('/api/projects/test-project/veb/status')
        .expect(503);

      expect(response.body).toHaveProperty('error', 'VEB feature unavailable');
      expect(response.body).toHaveProperty('code', 'VEB_TABLES_MISSING');
      expect(response.body.missingTables).toContain('editorial_reports');
    });

    it('should return 503 when veb_feedback table is missing', async () => {
      mockTablesMissing('veb_feedback');

      const response = await request(app)
        .get('/api/projects/test-project/veb/status')
        .expect(503);

      expect(response.body).toHaveProperty('error', 'VEB feature unavailable');
      expect(response.body).toHaveProperty('code', 'VEB_TABLES_MISSING');
      expect(response.body.missingTables).toContain('veb_feedback');
    });

    it('should allow request when all VEB tables exist', async () => {
      mockTablesExist();

      const response = await request(app)
        .get('/api/projects/test-project/veb/status')
        .expect(200);

      expect(response.body).toHaveProperty('hasReport', false);
    });

    it('should handle database errors during table check gracefully', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/projects/test-project/veb/status')
        .expect(503);

      expect(response.body).toHaveProperty('code', 'VEB_TABLES_MISSING');
    });
  });

  // ===========================================================================
  // POST /api/projects/:projectId/veb/submit
  // ===========================================================================

  describe('POST /api/projects/:projectId/veb/submit', () => {
    const projectId = 'project-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should successfully submit project to VEB', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' }; // Table checks
        if (callCount === 3) return { id: projectId, title: 'Test Project', status: 'writing' }; // Project
        if (callCount === 4) return { count: 5 }; // Chapter count
        if (callCount === 5) return null; // No existing report
        return null;
      });

      mockSubmitToVEB.mockImplementation(() => Promise.resolve({
        reportId: 'report-456',
        status: 'pending',
      }));

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        reportId: 'report-456',
        status: 'processing',
        message: 'Manuscript submitted to Virtual Editorial Board',
      });

      expect(mockSubmitToVEB).toHaveBeenCalledWith(projectId);

      // Verify jobs were queued
      expect(mockCreateJob).toHaveBeenCalledWith('veb_beta_swarm', 'report-456');
      expect(mockCreateJob).toHaveBeenCalledWith('veb_ruthless_editor', 'report-456');
      expect(mockCreateJob).toHaveBeenCalledWith('veb_market_analyst', 'report-456');
      expect(mockCreateJob).toHaveBeenCalledWith('veb_finalize', 'report-456');

      // Verify report status was updated to processing
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 when project not found', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' }; // Table checks
        return null; // Project not found
      });

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 400 when project has no completed chapters', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' }; // Table checks
        if (callCount === 3) return { id: projectId, title: 'Test Project', status: 'setup' }; // Project
        if (callCount === 4) return { count: 0 }; // No chapters
        return null;
      });

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(400);

      expect(response.body.error).toContain('no completed chapters');
    });

    it('should return 409 when VEB analysis already in progress', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' }; // Table checks
        if (callCount === 3) return { id: projectId, title: 'Test Project', status: 'writing' }; // Project
        if (callCount === 4) return { count: 5 }; // Chapter count
        if (callCount === 5) return { id: 'report-existing', status: 'processing' }; // Existing report
        return null;
      });

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('reportId', 'report-existing');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should handle pending status for existing report', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        if (callCount === 3) return { id: projectId, title: 'Test Project', status: 'writing' };
        if (callCount === 4) return { count: 5 };
        if (callCount === 5) return { id: 'report-pending', status: 'pending' };
        return null;
      });

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(409);

      expect(response.body.status).toBe('pending');
    });

    it('should return 500 when VEB service throws error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        if (callCount === 3) return { id: projectId, title: 'Test Project', status: 'writing' };
        if (callCount === 4) return { count: 5 };
        if (callCount === 5) return null;
        return null;
      });

      mockSubmitToVEB.mockImplementation(() => Promise.reject(new Error('VEB service unavailable')));

      const response = await request(app)
        .post(`/api/projects/${projectId}/veb/submit`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // GET /api/projects/:projectId/veb/status
  // ===========================================================================

  describe('GET /api/projects/:projectId/veb/status', () => {
    const projectId = 'project-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should return hasReport: false when no report exists', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body).toEqual({
        hasReport: false,
        status: null,
        modules: null,
        progress: 0,
      });
    });

    it('should return report status with pending state', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return {
          id: 'report-123',
          status: 'pending',
          beta_swarm_status: 'pending',
          ruthless_editor_status: 'pending',
          market_analyst_status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: null,
          error: null,
        };
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body).toEqual({
        hasReport: true,
        reportId: 'report-123',
        status: 'pending',
        modules: {
          betaSwarm: 'pending',
          ruthlessEditor: 'pending',
          marketAnalyst: 'pending',
        },
        progress: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
        error: null,
      });
    });

    it('should calculate progress correctly with one module complete', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return {
          id: 'report-123',
          status: 'processing',
          beta_swarm_status: 'completed',
          ruthless_editor_status: 'processing',
          market_analyst_status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: null,
          error: null,
        };
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body.progress).toBe(33); // 1 of 3 modules complete
    });

    it('should calculate progress correctly with two modules complete', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return {
          id: 'report-123',
          status: 'processing',
          beta_swarm_status: 'completed',
          ruthless_editor_status: 'completed',
          market_analyst_status: 'processing',
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: null,
          error: null,
        };
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body.progress).toBe(67); // 2 of 3 modules complete
    });

    it('should calculate progress as 100% when all modules complete', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return {
          id: 'report-123',
          status: 'completed',
          beta_swarm_status: 'completed',
          ruthless_editor_status: 'completed',
          market_analyst_status: 'completed',
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: '2024-01-01T01:00:00.000Z',
          error: null,
        };
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body.progress).toBe(100);
    });

    it('should include error information when present', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return {
          id: 'report-123',
          status: 'failed',
          beta_swarm_status: 'failed',
          ruthless_editor_status: 'pending',
          market_analyst_status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: null,
          error: 'Beta swarm analysis failed',
        };
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(200);

      expect(response.body.error).toBe('Beta swarm analysis failed');
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/status`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // GET /api/projects/:projectId/veb/report
  // ===========================================================================

  describe('GET /api/projects/:projectId/veb/report', () => {
    const projectId = 'project-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should return full editorial report', async () => {
      const mockReport = {
        id: 'report-123',
        project_id: projectId,
        status: 'completed',
        beta_swarm_status: 'completed',
        beta_swarm_results: JSON.stringify({
          overallEngagement: 8.5,
          wouldRecommend: true,
          chapterResults: [],
          summaryReaction: 'Great read!',
        }),
        beta_swarm_completed_at: '2024-01-01T00:30:00.000Z',
        ruthless_editor_status: 'completed',
        ruthless_editor_results: JSON.stringify({
          overallStructureScore: 7.8,
          majorIssuesCount: 2,
          chapterResults: [],
          summaryVerdict: 'Good structure',
        }),
        ruthless_editor_completed_at: '2024-01-01T00:45:00.000Z',
        market_analyst_status: 'completed',
        market_analyst_results: JSON.stringify({
          commercialViabilityScore: 8,
          agentRecommendation: 'yes_with_revisions',
          compTitles: [],
          hookAnalysis: {},
          tropeAnalysis: [],
          marketPositioning: {},
          summaryPitch: 'Compelling story',
        }),
        market_analyst_completed_at: '2024-01-01T01:00:00.000Z',
        overall_score: 81,
        summary: 'Overall Score: 81/100',
        recommendations: JSON.stringify(['Strengthen opening', 'Revise chapter 3']),
        total_input_tokens: 10000,
        total_output_tokens: 5000,
        created_at: '2024-01-01T00:00:00.000Z',
        completed_at: '2024-01-01T01:00:00.000Z',
        error: null,
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return mockReport;
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/report`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'report-123',
        projectId: projectId,
        status: 'completed',
        overallScore: 81,
        summary: 'Overall Score: 81/100',
      });

      expect(response.body.betaSwarm).toEqual({
        status: 'completed',
        results: {
          overallEngagement: 8.5,
          wouldRecommend: true,
          chapterResults: [],
          summaryReaction: 'Great read!',
        },
        completedAt: '2024-01-01T00:30:00.000Z',
      });

      expect(response.body.ruthlessEditor).toEqual({
        status: 'completed',
        results: {
          overallStructureScore: 7.8,
          majorIssuesCount: 2,
          chapterResults: [],
          summaryVerdict: 'Good structure',
        },
        completedAt: '2024-01-01T00:45:00.000Z',
      });

      expect(response.body.marketAnalyst).toEqual({
        status: 'completed',
        results: {
          commercialViabilityScore: 8,
          agentRecommendation: 'yes_with_revisions',
          compTitles: [],
          hookAnalysis: {},
          tropeAnalysis: [],
          marketPositioning: {},
          summaryPitch: 'Compelling story',
        },
        completedAt: '2024-01-01T01:00:00.000Z',
      });

      expect(response.body.recommendations).toEqual(['Strengthen opening', 'Revise chapter 3']);
    });

    it('should return 404 when no report exists', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/report`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should handle partial report with only beta swarm complete', async () => {
      const mockReport = {
        id: 'report-123',
        project_id: projectId,
        status: 'processing',
        beta_swarm_status: 'completed',
        beta_swarm_results: JSON.stringify({ overallEngagement: 8.5 }),
        beta_swarm_completed_at: '2024-01-01T00:30:00.000Z',
        ruthless_editor_status: 'processing',
        ruthless_editor_results: null,
        ruthless_editor_completed_at: null,
        market_analyst_status: 'pending',
        market_analyst_results: null,
        market_analyst_completed_at: null,
        overall_score: null,
        summary: null,
        recommendations: null,
        total_input_tokens: 5000,
        total_output_tokens: 2500,
        created_at: '2024-01-01T00:00:00.000Z',
        completed_at: null,
        error: null,
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return mockReport;
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/report`)
        .expect(200);

      expect(response.body.betaSwarm.status).toBe('completed');
      expect(response.body.ruthlessEditor.status).toBe('processing');
      expect(response.body.ruthlessEditor.results).toBeNull();
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/report`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // GET /api/projects/:projectId/veb/reports
  // ===========================================================================

  describe('GET /api/projects/:projectId/veb/reports', () => {
    const projectId = 'project-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should return all reports for a project', async () => {
      const mockReports = [
        {
          id: 'report-2',
          project_id: projectId,
          status: 'completed',
          beta_swarm_status: 'completed',
          beta_swarm_results: JSON.stringify({ overallEngagement: 8.5 }),
          beta_swarm_completed_at: '2024-01-02T00:30:00.000Z',
          ruthless_editor_status: 'completed',
          ruthless_editor_results: JSON.stringify({ overallStructureScore: 7.8 }),
          ruthless_editor_completed_at: '2024-01-02T00:45:00.000Z',
          market_analyst_status: 'completed',
          market_analyst_results: JSON.stringify({ commercialViabilityScore: 8 }),
          market_analyst_completed_at: '2024-01-02T01:00:00.000Z',
          overall_score: 82,
          summary: 'Latest report',
          recommendations: JSON.stringify(['Fix chapter 5']),
          total_input_tokens: 12000,
          total_output_tokens: 6000,
          created_at: '2024-01-02T00:00:00.000Z',
          completed_at: '2024-01-02T01:00:00.000Z',
          error: null,
        },
        {
          id: 'report-1',
          project_id: projectId,
          status: 'completed',
          beta_swarm_status: 'completed',
          beta_swarm_results: JSON.stringify({ overallEngagement: 7.2 }),
          beta_swarm_completed_at: '2024-01-01T00:30:00.000Z',
          ruthless_editor_status: 'completed',
          ruthless_editor_results: JSON.stringify({ overallStructureScore: 6.5 }),
          ruthless_editor_completed_at: '2024-01-01T00:45:00.000Z',
          market_analyst_status: 'completed',
          market_analyst_results: JSON.stringify({ commercialViabilityScore: 7 }),
          market_analyst_completed_at: '2024-01-01T01:00:00.000Z',
          overall_score: 72,
          summary: 'Earlier report',
          recommendations: JSON.stringify(['Revise opening']),
          total_input_tokens: 10000,
          total_output_tokens: 5000,
          created_at: '2024-01-01T00:00:00.000Z',
          completed_at: '2024-01-01T01:00:00.000Z',
          error: null,
        },
      ];

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockReturnValue(mockReports);

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/reports`)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.reports).toHaveLength(2);
      expect(response.body.reports[0].id).toBe('report-2'); // Most recent first
      expect(response.body.reports[1].id).toBe('report-1');
    });

    it('should return empty array when no reports exist', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/reports`)
        .expect(200);

      expect(response.body).toEqual({
        reports: [],
        total: 0,
      });
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/projects/${projectId}/veb/reports`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // GET /api/veb/reports/:reportId
  // ===========================================================================

  describe('GET /api/veb/reports/:reportId', () => {
    const reportId = 'report-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should return specific report by ID', async () => {
      const mockReport = {
        id: reportId,
        project_id: 'project-123',
        status: 'completed',
        beta_swarm_status: 'completed',
        beta_swarm_results: JSON.stringify({ overallEngagement: 8.5 }),
        beta_swarm_completed_at: '2024-01-01T00:30:00.000Z',
        ruthless_editor_status: 'completed',
        ruthless_editor_results: JSON.stringify({ overallStructureScore: 7.8 }),
        ruthless_editor_completed_at: '2024-01-01T00:45:00.000Z',
        market_analyst_status: 'completed',
        market_analyst_results: JSON.stringify({ commercialViabilityScore: 8 }),
        market_analyst_completed_at: '2024-01-01T01:00:00.000Z',
        overall_score: 81,
        summary: 'Overall Score: 81/100',
        recommendations: JSON.stringify(['Fix opening']),
        total_input_tokens: 10000,
        total_output_tokens: 5000,
        created_at: '2024-01-01T00:00:00.000Z',
        completed_at: '2024-01-01T01:00:00.000Z',
        error: null,
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return mockReport;
      });

      const response = await request(app)
        .get(`/api/veb/reports/${reportId}`)
        .expect(200);

      expect(response.body.id).toBe(reportId);
      expect(response.body.status).toBe('completed');
      expect(response.body.overallScore).toBe(81);
    });

    it('should return 404 when report not found', async () => {
      const response = await request(app)
        .get('/api/veb/reports/nonexistent-id')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/veb/reports/${reportId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // POST /api/veb/reports/:reportId/feedback
  // ===========================================================================

  describe('POST /api/veb/reports/:reportId/feedback', () => {
    const reportId = 'report-123';

    beforeEach(() => {
      mockTablesExist();
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should submit feedback successfully', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        if (callCount === 3) return { id: reportId }; // Report exists
        if (callCount === 4) return null; // No existing feedback
        return null;
      });

      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          chapterId: 'chapter-1',
          module: 'beta_swarm',
          findingIndex: 0,
          feedbackType: 'accept',
          notes: 'Agreed, this is an issue',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Feedback submitted successfully',
      });
      expect(response.body.feedbackId).toBeDefined();
    });

    it('should update existing feedback', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        if (callCount === 3) return { id: reportId };
        if (callCount === 4) return { id: 'feedback-existing' }; // Existing feedback
        return null;
      });

      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          chapterId: 'chapter-1',
          module: 'ruthless_editor',
          findingIndex: 2,
          feedbackType: 'reject',
          notes: 'Disagree with this assessment',
        })
        .expect(200);

      expect(response.body.feedbackId).toBe('feedback-existing');
    });

    it('should return 400 when module is missing', async () => {
      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          feedbackType: 'accept',
        })
        .expect(400);

      expect(response.body.error).toContain('module and feedbackType are required');
    });

    it('should return 400 when feedbackType is missing', async () => {
      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'beta_swarm',
        })
        .expect(400);

      expect(response.body.error).toContain('module and feedbackType are required');
    });

    it('should return 400 when module is invalid', async () => {
      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'invalid_module',
          feedbackType: 'accept',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid module');
    });

    it('should return 400 when feedbackType is invalid', async () => {
      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'beta_swarm',
          feedbackType: 'invalid_type',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid feedbackType');
    });

    it('should accept all valid modules', async () => {
      const validModules = ['beta_swarm', 'ruthless_editor', 'market_analyst'];

      for (const module of validModules) {
        jest.clearAllMocks();
        mockTablesExist();

        let callCount = 0;
        mockGet.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) return { name: 'table' };
          if (callCount === 3) return { id: reportId };
          return null;
        });

        mockRun.mockReturnValue({ changes: 1 });
        mockPrepare.mockReturnValue({
          get: mockGet,
          all: mockAll,
          run: mockRun,
        });

        const response = await request(app)
          .post(`/api/veb/reports/${reportId}/feedback`)
          .send({
            module,
            feedbackType: 'accept',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should accept all valid feedback types', async () => {
      const validTypes = ['accept', 'reject', 'rewrite_queued', 'rewrite_completed'];

      for (const feedbackType of validTypes) {
        jest.clearAllMocks();
        mockTablesExist();

        let callCount = 0;
        mockGet.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) return { name: 'table' };
          if (callCount === 3) return { id: reportId };
          return null;
        });

        mockRun.mockReturnValue({ changes: 1 });
        mockPrepare.mockReturnValue({
          get: mockGet,
          all: mockAll,
          run: mockRun,
        });

        const response = await request(app)
          .post(`/api/veb/reports/${reportId}/feedback`)
          .send({
            module: 'beta_swarm',
            feedbackType,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should return 404 when report not found', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null; // Report not found
      });

      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'beta_swarm',
          feedbackType: 'accept',
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should handle feedback without notes', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        if (callCount === 3) return { id: reportId };
        return null;
      });

      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'beta_swarm',
          feedbackType: 'accept',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        throw new Error('Database error');
      });

      const response = await request(app)
        .post(`/api/veb/reports/${reportId}/feedback`)
        .send({
          module: 'beta_swarm',
          feedbackType: 'accept',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // GET /api/veb/reports/:reportId/feedback
  // ===========================================================================

  describe('GET /api/veb/reports/:reportId/feedback', () => {
    const reportId = 'report-123';

    beforeEach(() => {
      mockTablesExist();
    });

    it('should return all feedback for a report', async () => {
      const mockFeedback = [
        {
          id: 'feedback-2',
          report_id: reportId,
          chapter_id: 'chapter-1',
          module: 'beta_swarm',
          finding_index: 0,
          feedback_type: 'accept',
          notes: 'Good catch',
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'feedback-1',
          report_id: reportId,
          chapter_id: 'chapter-2',
          module: 'ruthless_editor',
          finding_index: 1,
          feedback_type: 'reject',
          notes: 'Disagree',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockReturnValue(mockFeedback);

      const response = await request(app)
        .get(`/api/veb/reports/${reportId}/feedback`)
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.feedback).toHaveLength(2);
      expect(response.body.feedback[0]).toMatchObject({
        id: 'feedback-2',
        reportId: reportId,
        chapterId: 'chapter-1',
        module: 'beta_swarm',
        findingIndex: 0,
        feedbackType: 'accept',
        notes: 'Good catch',
      });
    });

    it('should return empty array when no feedback exists', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get(`/api/veb/reports/${reportId}/feedback`)
        .expect(200);

      expect(response.body).toEqual({
        feedback: [],
        total: 0,
      });
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return null;
      });

      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/veb/reports/${reportId}/feedback`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // DELETE /api/veb/reports/:reportId
  // ===========================================================================

  describe('DELETE /api/veb/reports/:reportId', () => {
    const reportId = 'report-123';

    beforeEach(() => {
      mockTablesExist();
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should delete report successfully', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        return { id: reportId }; // Report exists
      });

      const response = await request(app)
        .delete(`/api/veb/reports/${reportId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Editorial report deleted',
      });

      // Verify both delete statements were called
      expect(mockRun).toHaveBeenCalledTimes(2); // feedback delete + report delete
    });

    it('should return 404 when report not found', async () => {
      const response = await request(app)
        .delete('/api/veb/reports/nonexistent-id')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 500 on database error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return { name: 'table' };
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete(`/api/veb/reports/${reportId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
