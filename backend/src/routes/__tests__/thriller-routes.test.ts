import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock database
const mockDb = {
  prepare: jest.fn(),
};

jest.mock('../../db/connection.js', () => mockDb);

// Mock logger
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock thriller commercial service
const mockThrillerService = {
  setPacingStyle: jest.fn() as any,
  getPacingConfig: jest.fn() as any,
  addChapterHook: jest.fn() as any,
  getChapterHooks: jest.fn() as any,
  addTwist: jest.fn() as any,
  getTwists: jest.fn() as any,
  validateTwistSetup: jest.fn() as any,
  addTickingClock: jest.fn() as any,
  getActiveTimePressure: jest.fn() as any,
  deactivateTickingClock: jest.fn() as any,
  calculateTensionCurve: jest.fn() as any,
  validatePacing: jest.fn() as any,
};

jest.mock('../../services/index.js', () => ({
  thrillerCommercialService: mockThrillerService,
}));

// Import router after mocks
import thrillerRouter from '../projects/thriller.js';

describe('Thriller Routes', () => {
  let app: express.Application;
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/projects', thrillerRouter);
  });

  describe('POST /api/projects/:id/thriller-pacing', () => {
    it('should set pacing configuration with complete data', async () => {
      const mockConfig = {
        project_id: mockProjectId,
        pacing_style: 'breakneck',
        chapter_hook_required: true,
        cliffhanger_frequency: 0.8,
        action_scene_ratio: 0.6,
        average_chapter_tension: 7,
      };

      mockThrillerService.setPacingStyle.mockResolvedValue(mockConfig);

      const requestData = {
        pacingStyle: 'breakneck',
        chapterHookRequired: true,
        cliffhangerFrequency: 0.8,
        actionSceneRatio: 0.6,
        averageChapterTension: 7,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-pacing`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockConfig);
      expect(mockThrillerService.setPacingStyle).toHaveBeenCalledWith(
        mockProjectId,
        'breakneck',
        {
          chapterHookRequired: true,
          cliffhangerFrequency: 0.8,
          actionSceneRatio: 0.6,
          averageChapterTension: 7,
        }
      );
    });

    it('should set pacing with minimal data', async () => {
      const mockConfig = {
        project_id: mockProjectId,
        pacing_style: 'steady',
      };

      mockThrillerService.setPacingStyle.mockResolvedValue(mockConfig);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-pacing`)
        .send({ pacingStyle: 'steady' })
        .expect(200);

      expect(response.body).toEqual(mockConfig);
    });

    it('should return 400 when pacingStyle is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-pacing`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Pacing style is required');
      expect(mockThrillerService.setPacingStyle).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.setPacingStyle.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-pacing`)
        .send({ pacingStyle: 'breakneck' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /api/projects/:id/thriller-pacing', () => {
    it('should return pacing configuration', async () => {
      const mockConfig = {
        project_id: mockProjectId,
        pacing_style: 'breakneck',
        chapter_hook_required: true,
        cliffhanger_frequency: 0.8,
      };

      mockThrillerService.getPacingConfig.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing`)
        .expect(200);

      expect(response.body).toEqual(mockConfig);
      expect(mockThrillerService.getPacingConfig).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 404 when no pacing found', async () => {
      mockThrillerService.getPacingConfig.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No thriller pacing found for this project');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.getPacingConfig.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('POST /api/projects/:id/thriller-hooks', () => {
    it('should add a chapter hook with complete data', async () => {
      const mockHook = {
        id: 'hook-1',
        project_id: mockProjectId,
        chapter_number: 5,
        hook_type: 'cliffhanger',
        hook_description: 'Protagonist trapped',
        tension_level: 8,
      };

      mockThrillerService.addChapterHook.mockResolvedValue(mockHook);

      const requestData = {
        chapterNumber: 5,
        hookType: 'cliffhanger',
        hookDescription: 'Protagonist trapped',
        tensionLevel: 8,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockHook);
      expect(mockThrillerService.addChapterHook).toHaveBeenCalledWith(
        mockProjectId,
        5,
        'cliffhanger',
        'Protagonist trapped',
        8
      );
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send({ chapterNumber: 5 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('chapterNumber, hookType, and tensionLevel are required');
    });

    it('should return 400 when hookType is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send({ chapterNumber: 5, tensionLevel: 8 })
        .expect(400);

      expect(response.body.error).toBe('chapterNumber, hookType, and tensionLevel are required');
    });

    it('should return 400 when tensionLevel is undefined', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send({ chapterNumber: 5, hookType: 'cliffhanger' })
        .expect(400);

      expect(response.body.error).toBe('chapterNumber, hookType, and tensionLevel are required');
    });

    it('should accept tensionLevel of 0', async () => {
      const mockHook = { id: 'hook-1', tension_level: 0 };
      mockThrillerService.addChapterHook.mockResolvedValue(mockHook);

      await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send({ chapterNumber: 1, hookType: 'question', tensionLevel: 0 })
        .expect(200);
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.addChapterHook.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-hooks`)
        .send({ chapterNumber: 5, hookType: 'cliffhanger', tensionLevel: 8 })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('GET /api/projects/:id/thriller-hooks', () => {
    it('should return all chapter hooks', async () => {
      const mockHooks = [
        {
          id: 'hook-1',
          project_id: mockProjectId,
          chapter_number: 1,
          hook_type: 'question',
        },
        {
          id: 'hook-2',
          project_id: mockProjectId,
          chapter_number: 5,
          hook_type: 'cliffhanger',
        },
      ];

      mockThrillerService.getChapterHooks.mockResolvedValue(mockHooks);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-hooks`)
        .expect(200);

      expect(response.body).toEqual(mockHooks);
      expect(mockThrillerService.getChapterHooks).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty array when no hooks exist', async () => {
      mockThrillerService.getChapterHooks.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-hooks`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.getChapterHooks.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-hooks`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('POST /api/projects/:id/thriller-twists', () => {
    it('should add a twist with complete data', async () => {
      const mockTwist = {
        id: 'twist-1',
        project_id: mockProjectId,
        chapter_number: 15,
        twist_type: 'betrayal',
        setup_chapters: [5, 10],
        description: 'Ally revealed as villain',
        impact_level: 9,
        foreshadowed: true,
      };

      mockThrillerService.addTwist.mockResolvedValue(mockTwist);

      const requestData = {
        chapterNumber: 15,
        twistType: 'betrayal',
        setupChapters: [5, 10],
        description: 'Ally revealed as villain',
        impactLevel: 9,
        foreshadowed: true,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-twists`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockTwist);
      expect(mockThrillerService.addTwist).toHaveBeenCalledWith(
        mockProjectId,
        15,
        'betrayal',
        [5, 10],
        'Ally revealed as villain',
        9,
        true
      );
    });

    it('should add twist without setupChapters', async () => {
      const mockTwist = { id: 'twist-1', twist_type: 'revelation' };
      mockThrillerService.addTwist.mockResolvedValue(mockTwist);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-twists`)
        .send({ twistType: 'revelation', description: 'Big reveal' })
        .expect(200);

      expect(mockThrillerService.addTwist).toHaveBeenCalledWith(
        mockProjectId,
        undefined,
        'revelation',
        [],
        'Big reveal',
        undefined,
        undefined
      );
    });

    it('should return 400 when twistType is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-twists`)
        .send({ description: 'A twist' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('twistType and description are required');
    });

    it('should return 400 when description is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-twists`)
        .send({ twistType: 'betrayal' })
        .expect(400);

      expect(response.body.error).toBe('twistType and description are required');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.addTwist.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-twists`)
        .send({ twistType: 'betrayal', description: 'Twist' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('GET /api/projects/:id/thriller-twists', () => {
    it('should return all twists', async () => {
      const mockTwists = [
        {
          id: 'twist-1',
          project_id: mockProjectId,
          twist_type: 'betrayal',
        },
        {
          id: 'twist-2',
          project_id: mockProjectId,
          twist_type: 'revelation',
        },
      ];

      mockThrillerService.getTwists.mockResolvedValue(mockTwists);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-twists`)
        .expect(200);

      expect(response.body).toEqual(mockTwists);
      expect(mockThrillerService.getTwists).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty array when no twists exist', async () => {
      mockThrillerService.getTwists.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-twists`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.getTwists.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-twists`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('GET /api/projects/:id/thriller-twists/:twistId/validate', () => {
    it('should validate twist setup', async () => {
      const mockValidation = {
        valid: true,
        setup_sufficient: true,
        foreshadowing_present: true,
      };

      mockThrillerService.validateTwistSetup.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-twists/twist-1/validate`)
        .expect(200);

      expect(response.body).toEqual(mockValidation);
      expect(mockThrillerService.validateTwistSetup).toHaveBeenCalledWith(
        mockProjectId,
        'twist-1'
      );
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.validateTwistSetup.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-twists/twist-1/validate`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /api/projects/:id/thriller-time-pressure', () => {
    it('should add a ticking clock with complete data', async () => {
      const mockClock = {
        id: 'clock-1',
        project_id: mockProjectId,
        clock_type: 'countdown',
        description: '24 hours to save the city',
        start_chapter: 1,
        resolution_chapter: 20,
        stakes: 'City destruction',
        time_remaining: '24 hours',
        reminder_frequency: 3,
        active: true,
      };

      mockThrillerService.addTickingClock.mockResolvedValue(mockClock);

      const requestData = {
        clockType: 'countdown',
        description: '24 hours to save the city',
        startChapter: 1,
        resolutionChapter: 20,
        stakes: 'City destruction',
        timeRemaining: '24 hours',
        reminderFrequency: 3,
        active: true,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockClock);
      expect(mockThrillerService.addTickingClock).toHaveBeenCalledWith(
        mockProjectId,
        'countdown',
        '24 hours to save the city',
        {
          startChapter: 1,
          resolutionChapter: 20,
          stakes: 'City destruction',
          timeRemaining: '24 hours',
          reminderFrequency: 3,
          active: true,
        }
      );
    });

    it('should add ticking clock with minimal data', async () => {
      const mockClock = { id: 'clock-1', clock_type: 'deadline' };
      mockThrillerService.addTickingClock.mockResolvedValue(mockClock);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .send({ clockType: 'deadline', description: 'Must escape' })
        .expect(200);

      expect(response.body).toEqual(mockClock);
    });

    it('should return 400 when clockType is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .send({ description: 'Time pressure' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('clockType and description are required');
    });

    it('should return 400 when description is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .send({ clockType: 'countdown' })
        .expect(400);

      expect(response.body.error).toBe('clockType and description are required');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.addTickingClock.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .send({ clockType: 'countdown', description: 'Time pressure' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('GET /api/projects/:id/thriller-time-pressure', () => {
    it('should return active time pressure elements', async () => {
      const mockClocks = [
        {
          id: 'clock-1',
          project_id: mockProjectId,
          clock_type: 'countdown',
          active: true,
        },
      ];

      mockThrillerService.getActiveTimePressure.mockResolvedValue(mockClocks);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .expect(200);

      expect(response.body).toEqual(mockClocks);
      expect(mockThrillerService.getActiveTimePressure).toHaveBeenCalledWith(mockProjectId);
    });

    it('should handle includeInactive query parameter', async () => {
      const mockClocks = [{ id: 'clock-1', active: false }];
      mockThrillerService.getActiveTimePressure.mockResolvedValue(mockClocks);

      await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-time-pressure?includeInactive=true`)
        .expect(200);

      expect(mockThrillerService.getActiveTimePressure).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.getActiveTimePressure.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-time-pressure`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('PUT /api/projects/:id/thriller-time-pressure/:clockId/deactivate', () => {
    it('should deactivate a ticking clock', async () => {
      mockThrillerService.deactivateTickingClock.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/thriller-time-pressure/clock-1/deactivate`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockThrillerService.deactivateTickingClock).toHaveBeenCalledWith('clock-1');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.deactivateTickingClock.mockRejectedValue(
        new Error('Update failed')
      );

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/thriller-time-pressure/clock-1/deactivate`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Update failed');
    });
  });

  describe('GET /api/projects/:id/thriller-tension-curve', () => {
    it('should calculate tension curve', async () => {
      const mockCurve = {
        chapters: [1, 2, 3],
        tension_levels: [5, 6, 8],
        average: 6.3,
      };

      mockThrillerService.calculateTensionCurve.mockResolvedValue(mockCurve);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-tension-curve?totalChapters=3`)
        .expect(200);

      expect(response.body).toEqual(mockCurve);
      expect(mockThrillerService.calculateTensionCurve).toHaveBeenCalledWith(mockProjectId, 3);
    });

    it('should return 400 when totalChapters is missing', async () => {
      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-tension-curve`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('totalChapters query parameter is required');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.calculateTensionCurve.mockRejectedValue(
        new Error('Calculation failed')
      );

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-tension-curve?totalChapters=20`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Calculation failed');
    });
  });

  describe('GET /api/projects/:id/thriller-pacing/validate', () => {
    it('should validate pacing requirements', async () => {
      const mockValidation = {
        valid: true,
        meets_requirements: true,
        warnings: [],
      };

      mockThrillerService.validatePacing.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing/validate?totalChapters=25`)
        .expect(200);

      expect(response.body).toEqual(mockValidation);
      expect(mockThrillerService.validatePacing).toHaveBeenCalledWith(mockProjectId, 25);
    });

    it('should return 400 when totalChapters is missing', async () => {
      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing/validate`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('totalChapters query parameter is required');
    });

    it('should return 500 on service error', async () => {
      mockThrillerService.validatePacing.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-pacing/validate?totalChapters=25`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid project ID gracefully', async () => {
      mockThrillerService.getPacingConfig.mockRejectedValue(new Error('Invalid UUID'));

      const response = await request(app)
        .get('/api/projects/invalid-id/thriller-pacing')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/thriller-pacing`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should parse totalChapters as integer', async () => {
      const mockCurve = { chapters: [], tension_levels: [] };
      mockThrillerService.calculateTensionCurve.mockResolvedValue(mockCurve);

      await request(app)
        .get(`/api/projects/${mockProjectId}/thriller-tension-curve?totalChapters=20.7`)
        .expect(200);

      expect(mockThrillerService.calculateTensionCurve).toHaveBeenCalledWith(mockProjectId, 20);
    });
  });
});
