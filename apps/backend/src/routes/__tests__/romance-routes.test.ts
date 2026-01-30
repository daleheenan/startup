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

// Mock romance commercial service
const mockRomanceService = {
  setHeatLevel: jest.fn() as any,
  getHeatLevel: jest.fn() as any,
  deleteHeatLevel: jest.fn() as any,
  trackBeat: jest.fn() as any,
  getBeatTracking: jest.fn() as any,
  deleteBeat: jest.fn() as any,
  validateBeats: jest.fn() as any,
  getSuggestedBeats: jest.fn() as any,
  isHeartbreaker: jest.fn() as any,
};

jest.mock('../../services/index.js', () => ({
  romanceCommercialService: mockRomanceService,
}));

// Import router after mocks
import romanceRouter from '../projects/romance.js';

describe('Romance Routes', () => {
  let app: express.Application;
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/projects', romanceRouter);
  });

  describe('POST /api/projects/:id/romance-settings', () => {
    it('should set heat level configuration with valid data', async () => {
      const mockConfig = {
        project_id: mockProjectId,
        heat_level: 3,
        content_warnings: ['explicit'],
        fade_to_black: false,
        on_page_intimacy: true,
        sensuality_focus: 'moderate',
      };

      mockRomanceService.setHeatLevel.mockResolvedValue(mockConfig);

      const requestData = {
        heatLevel: 3,
        contentWarnings: ['explicit'],
        fadeToBlack: false,
        onPageIntimacy: true,
        sensualityFocus: 'moderate',
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockConfig);
      expect(mockRomanceService.setHeatLevel).toHaveBeenCalledWith(
        mockProjectId,
        3,
        {
          contentWarnings: ['explicit'],
          fadeToBlack: false,
          onPageIntimacy: true,
          sensualityFocus: 'moderate',
        }
      );
    });

    it('should return 400 when heatLevel is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Heat level must be between 1 and 5');
      expect(mockRomanceService.setHeatLevel).not.toHaveBeenCalled();
    });

    it('should return 400 when heatLevel is below 1', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({ heatLevel: 0 })
        .expect(400);

      expect(response.body.error).toBe('Heat level must be between 1 and 5');
    });

    it('should return 400 when heatLevel is above 5', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({ heatLevel: 6 })
        .expect(400);

      expect(response.body.error).toBe('Heat level must be between 1 and 5');
    });

    it('should accept minimum heat level (1)', async () => {
      const mockConfig = { project_id: mockProjectId, heat_level: 1 };
      mockRomanceService.setHeatLevel.mockResolvedValue(mockConfig);

      await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({ heatLevel: 1 })
        .expect(200);
    });

    it('should accept maximum heat level (5)', async () => {
      const mockConfig = { project_id: mockProjectId, heat_level: 5 };
      mockRomanceService.setHeatLevel.mockResolvedValue(mockConfig);

      await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({ heatLevel: 5 })
        .expect(200);
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.setHeatLevel.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .send({ heatLevel: 3 })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /api/projects/:id/romance-settings', () => {
    it('should return heat level configuration', async () => {
      const mockConfig = {
        project_id: mockProjectId,
        heat_level: 4,
        content_warnings: ['explicit', 'graphic'],
        fade_to_black: false,
        on_page_intimacy: true,
        sensuality_focus: 'high',
      };

      mockRomanceService.getHeatLevel.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-settings`)
        .expect(200);

      expect(response.body).toEqual(mockConfig);
      expect(mockRomanceService.getHeatLevel).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 404 when no settings found', async () => {
      mockRomanceService.getHeatLevel.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-settings`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No romance settings found for this project');
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.getHeatLevel.mockRejectedValue(new Error('Database read error'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-settings`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database read error');
    });
  });

  describe('DELETE /api/projects/:id/romance-settings', () => {
    it('should delete heat level configuration', async () => {
      mockRomanceService.deleteHeatLevel.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/romance-settings`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockRomanceService.deleteHeatLevel).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.deleteHeatLevel.mockRejectedValue(new Error('Deletion failed'));

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/romance-settings`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Deletion failed');
    });
  });

  describe('POST /api/projects/:id/romance-beats', () => {
    it('should track a romance beat with complete data', async () => {
      const mockBeat = {
        id: 'beat-1',
        project_id: mockProjectId,
        beat_type: 'first_kiss',
        chapter_number: 10,
        scene_description: 'First kiss scene',
        emotional_intensity: 8,
        notes: 'Important milestone',
        completed: true,
      };

      mockRomanceService.trackBeat.mockResolvedValue(mockBeat);

      const requestData = {
        beatType: 'first_kiss',
        chapterNumber: 10,
        sceneDescription: 'First kiss scene',
        emotionalIntensity: 8,
        notes: 'Important milestone',
        completed: true,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-beats`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockBeat);
      expect(mockRomanceService.trackBeat).toHaveBeenCalledWith(
        mockProjectId,
        'first_kiss',
        10,
        {
          sceneDescription: 'First kiss scene',
          emotionalIntensity: 8,
          notes: 'Important milestone',
          completed: true,
        }
      );
    });

    it('should track a beat with minimal data', async () => {
      const mockBeat = {
        id: 'beat-2',
        project_id: mockProjectId,
        beat_type: 'meet_cute',
      };

      mockRomanceService.trackBeat.mockResolvedValue(mockBeat);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-beats`)
        .send({ beatType: 'meet_cute' })
        .expect(200);

      expect(response.body).toEqual(mockBeat);
      expect(mockRomanceService.trackBeat).toHaveBeenCalledWith(
        mockProjectId,
        'meet_cute',
        undefined,
        {
          sceneDescription: undefined,
          emotionalIntensity: undefined,
          notes: undefined,
          completed: undefined,
        }
      );
    });

    it('should return 400 when beatType is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-beats`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Beat type is required');
      expect(mockRomanceService.trackBeat).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.trackBeat.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-beats`)
        .send({ beatType: 'first_kiss' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('GET /api/projects/:id/romance-beats', () => {
    it('should return all romance beats', async () => {
      const mockBeats = [
        {
          id: 'beat-1',
          project_id: mockProjectId,
          beat_type: 'meet_cute',
          chapter_number: 1,
        },
        {
          id: 'beat-2',
          project_id: mockProjectId,
          beat_type: 'first_kiss',
          chapter_number: 10,
        },
      ];

      mockRomanceService.getBeatTracking.mockResolvedValue(mockBeats);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats`)
        .expect(200);

      expect(response.body).toEqual(mockBeats);
      expect(mockRomanceService.getBeatTracking).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty array when no beats tracked', async () => {
      mockRomanceService.getBeatTracking.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.getBeatTracking.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('DELETE /api/projects/:id/romance-beats/:beatType', () => {
    it('should delete a tracked beat', async () => {
      mockRomanceService.deleteBeat.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/romance-beats/first_kiss`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockRomanceService.deleteBeat).toHaveBeenCalledWith(mockProjectId, 'first_kiss');
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.deleteBeat.mockRejectedValue(new Error('Deletion failed'));

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/romance-beats/meet_cute`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Deletion failed');
    });
  });

  describe('GET /api/projects/:id/romance-beats/validate', () => {
    it('should validate beat placement with totalChapters', async () => {
      const mockValidation = {
        valid: true,
        warnings: [],
        missing_beats: [],
      };

      mockRomanceService.validateBeats.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/validate?totalChapters=30`)
        .expect(200);

      expect(response.body).toEqual(mockValidation);
      expect(mockRomanceService.validateBeats).toHaveBeenCalledWith(mockProjectId, 30);
    });

    it('should return 400 when totalChapters is missing', async () => {
      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/validate`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('totalChapters query parameter is required');
      expect(mockRomanceService.validateBeats).not.toHaveBeenCalled();
    });

    it('should parse totalChapters as integer', async () => {
      const mockValidation = { valid: true };
      mockRomanceService.validateBeats.mockResolvedValue(mockValidation);

      await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/validate?totalChapters=25`)
        .expect(200);

      expect(mockRomanceService.validateBeats).toHaveBeenCalledWith(mockProjectId, 25);
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.validateBeats.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/validate?totalChapters=30`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('GET /api/projects/:id/romance-beats/suggestions', () => {
    it('should get suggested beat placement', async () => {
      const mockSuggestions = [
        { beat: 'meet_cute', suggested_chapter: 1 },
        { beat: 'first_kiss', suggested_chapter: 10 },
        { beat: 'dark_moment', suggested_chapter: 20 },
        { beat: 'happily_ever_after', suggested_chapter: 25 },
      ];

      mockRomanceService.getSuggestedBeats.mockReturnValue(mockSuggestions);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/suggestions?totalChapters=25`)
        .expect(200);

      expect(response.body).toEqual(mockSuggestions);
      expect(mockRomanceService.getSuggestedBeats).toHaveBeenCalledWith(25);
    });

    it('should return 400 when totalChapters is missing', async () => {
      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/suggestions`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('totalChapters query parameter is required');
    });

    it('should handle service errors', async () => {
      mockRomanceService.getSuggestedBeats.mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/suggestions?totalChapters=25`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Calculation error');
    });
  });

  describe('GET /api/projects/:id/romance-beats/heartbreaker-check', () => {
    it('should check if story meets romance requirements', async () => {
      const mockCheck = {
        is_heartbreaker: false,
        meets_requirements: true,
        missing_beats: [],
      };

      mockRomanceService.isHeartbreaker.mockResolvedValue(mockCheck);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/heartbreaker-check?totalChapters=30`)
        .expect(200);

      expect(response.body).toEqual(mockCheck);
      expect(mockRomanceService.isHeartbreaker).toHaveBeenCalledWith(mockProjectId, 30);
    });

    it('should return 400 when totalChapters is missing', async () => {
      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/heartbreaker-check`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('totalChapters query parameter is required');
    });

    it('should return 500 on service error', async () => {
      mockRomanceService.isHeartbreaker.mockRejectedValue(new Error('Check failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/heartbreaker-check?totalChapters=30`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Check failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid project ID format gracefully', async () => {
      mockRomanceService.getHeatLevel.mockRejectedValue(new Error('Invalid UUID'));

      const response = await request(app)
        .get('/api/projects/invalid-id/romance-settings')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/romance-settings`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle non-integer totalChapters', async () => {
      const mockValidation = { valid: true };
      mockRomanceService.validateBeats.mockResolvedValue(mockValidation);

      await request(app)
        .get(`/api/projects/${mockProjectId}/romance-beats/validate?totalChapters=25.5`)
        .expect(200);

      // parseInt should convert 25.5 to 25
      expect(mockRomanceService.validateBeats).toHaveBeenCalledWith(mockProjectId, 25);
    });
  });
});
