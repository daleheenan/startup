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

// Mock sci-fi commercial service
const mockSciFiService = {
  setClassification: jest.fn() as any,
  getClassification: jest.fn() as any,
  deleteClassification: jest.fn() as any,
  addSpeculativeElement: jest.fn() as any,
  getSpeculativeElements: jest.fn() as any,
  setRealScienceBasis: jest.fn() as any,
  setHandwaveAreas: jest.fn() as any,
  validateConsistency: jest.fn() as any,
  getReaderExpectations: jest.fn() as any,
  suggestExplanationDepth: jest.fn() as any,
  getSubgenreDefaults: jest.fn() as any,
};

jest.mock('../../services/index.js', () => ({
  sciFiCommercialService: mockSciFiService,
}));

// Import router after mocks
import sciFiRouter from '../projects/scifi.js';

describe('Sci-Fi Routes', () => {
  let app: express.Application;
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/projects', sciFiRouter);
  });

  describe('POST /api/projects/:id/scifi-classification', () => {
    it('should set sci-fi classification with complete data', async () => {
      const mockClassification = {
        project_id: mockProjectId,
        hardness_level: 'hard',
        tech_explanation_depth: 'detailed',
        scientific_accuracy_priority: 9,
      };

      mockSciFiService.setClassification.mockResolvedValue(mockClassification);

      const requestData = {
        hardnessLevel: 'hard',
        techExplanationDepth: 'detailed',
        scientificAccuracyPriority: 9,
      };

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockClassification);
      expect(mockSciFiService.setClassification).toHaveBeenCalledWith(
        mockProjectId,
        'hard',
        'detailed',
        9
      );
    });

    it('should accept scientificAccuracyPriority of 0', async () => {
      const mockClassification = {
        project_id: mockProjectId,
        hardness_level: 'science_fantasy',
        tech_explanation_depth: 'minimal',
        scientific_accuracy_priority: 0,
      };

      mockSciFiService.setClassification.mockResolvedValue(mockClassification);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({
          hardnessLevel: 'science_fantasy',
          techExplanationDepth: 'minimal',
          scientificAccuracyPriority: 0,
        })
        .expect(200);

      expect(response.body).toEqual(mockClassification);
    });

    it('should return 400 when hardnessLevel is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({
          techExplanationDepth: 'detailed',
          scientificAccuracyPriority: 8,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(
        'hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required'
      );
      expect(mockSciFiService.setClassification).not.toHaveBeenCalled();
    });

    it('should return 400 when techExplanationDepth is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({
          hardnessLevel: 'hard',
          scientificAccuracyPriority: 8,
        })
        .expect(400);

      expect(response.body.error).toBe(
        'hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required'
      );
    });

    it('should return 400 when scientificAccuracyPriority is undefined', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({
          hardnessLevel: 'hard',
          techExplanationDepth: 'detailed',
        })
        .expect(400);

      expect(response.body.error).toBe(
        'hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required'
      );
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.setClassification.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({
          hardnessLevel: 'hard',
          techExplanationDepth: 'detailed',
          scientificAccuracyPriority: 9,
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /api/projects/:id/scifi-classification', () => {
    it('should return sci-fi classification', async () => {
      const mockClassification = {
        project_id: mockProjectId,
        hardness_level: 'firm',
        tech_explanation_depth: 'moderate',
        scientific_accuracy_priority: 7,
      };

      mockSciFiService.getClassification.mockResolvedValue(mockClassification);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-classification`)
        .expect(200);

      expect(response.body).toEqual(mockClassification);
      expect(mockSciFiService.getClassification).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 404 when no classification found', async () => {
      mockSciFiService.getClassification.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-classification`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No sci-fi classification found for this project');
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.getClassification.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-classification`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('DELETE /api/projects/:id/scifi-classification', () => {
    it('should delete sci-fi classification', async () => {
      mockSciFiService.deleteClassification.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/scifi-classification`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSciFiService.deleteClassification).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.deleteClassification.mockRejectedValue(new Error('Deletion failed'));

      const response = await request(app)
        .delete(`/api/projects/${mockProjectId}/scifi-classification`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Deletion failed');
    });
  });

  describe('POST /api/projects/:id/scifi-speculative-elements', () => {
    it('should add a speculative element', async () => {
      mockSciFiService.addSpeculativeElement.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .send({ element: 'FTL travel' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSciFiService.addSpeculativeElement).toHaveBeenCalledWith(
        mockProjectId,
        'FTL travel'
      );
    });

    it('should return 400 when element is missing', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'element is required');
      expect(mockSciFiService.addSpeculativeElement).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.addSpeculativeElement.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .send({ element: 'Time travel' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('GET /api/projects/:id/scifi-speculative-elements', () => {
    it('should return all speculative elements', async () => {
      const mockElements = ['FTL travel', 'Teleportation', 'AI consciousness'];

      mockSciFiService.getSpeculativeElements.mockResolvedValue(mockElements);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .expect(200);

      expect(response.body).toEqual(mockElements);
      expect(mockSciFiService.getSpeculativeElements).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return empty array when no elements exist', async () => {
      mockSciFiService.getSpeculativeElements.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.getSpeculativeElements.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-speculative-elements`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Query failed');
    });
  });

  describe('PUT /api/projects/:id/scifi-real-science-basis', () => {
    it('should set real science basis', async () => {
      mockSciFiService.setRealScienceBasis.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({ scienceAreas: ['physics', 'biology', 'astronomy'] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSciFiService.setRealScienceBasis).toHaveBeenCalledWith(mockProjectId, [
        'physics',
        'biology',
        'astronomy',
      ]);
    });

    it('should accept empty array', async () => {
      mockSciFiService.setRealScienceBasis.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({ scienceAreas: [] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSciFiService.setRealScienceBasis).toHaveBeenCalledWith(mockProjectId, []);
    });

    it('should return 400 when scienceAreas is not an array', async () => {
      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({ scienceAreas: 'physics' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'scienceAreas must be an array');
      expect(mockSciFiService.setRealScienceBasis).not.toHaveBeenCalled();
    });

    it('should return 400 when scienceAreas is missing', async () => {
      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('scienceAreas must be an array');
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.setRealScienceBasis.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({ scienceAreas: ['physics'] })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Update failed');
    });
  });

  describe('PUT /api/projects/:id/scifi-handwave-areas', () => {
    it('should set handwave areas', async () => {
      mockSciFiService.setHandwaveAreas.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-handwave-areas`)
        .send({ areas: ['FTL', 'artificial gravity'] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSciFiService.setHandwaveAreas).toHaveBeenCalledWith(mockProjectId, [
        'FTL',
        'artificial gravity',
      ]);
    });

    it('should accept empty array', async () => {
      mockSciFiService.setHandwaveAreas.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-handwave-areas`)
        .send({ areas: [] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should return 400 when areas is not an array', async () => {
      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-handwave-areas`)
        .send({ areas: 'FTL' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'areas must be an array');
      expect(mockSciFiService.setHandwaveAreas).not.toHaveBeenCalled();
    });

    it('should return 400 when areas is missing', async () => {
      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-handwave-areas`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('areas must be an array');
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.setHandwaveAreas.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-handwave-areas`)
        .send({ areas: ['FTL'] })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Update failed');
    });
  });

  describe('GET /api/projects/:id/scifi-classification/validate', () => {
    it('should validate classification consistency', async () => {
      const mockValidation = {
        consistent: true,
        warnings: [],
        hardness_match: true,
      };

      mockSciFiService.validateConsistency.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-classification/validate`)
        .expect(200);

      expect(response.body).toEqual(mockValidation);
      expect(mockSciFiService.validateConsistency).toHaveBeenCalledWith(mockProjectId);
    });

    it('should return 500 on service error', async () => {
      mockSciFiService.validateConsistency.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .get(`/api/projects/${mockProjectId}/scifi-classification/validate`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('GET /api/scifi-reader-expectations/:hardnessLevel', () => {
    it('should get reader expectations for valid hardness level', async () => {
      const mockExpectations = {
        scientific_accuracy: 'very high',
        explanation_detail: 'thorough',
        speculation_allowed: 'minimal',
      };

      mockSciFiService.getReaderExpectations.mockReturnValue(mockExpectations);

      const response = await request(app)
        .get('/api/projects/scifi-reader-expectations/hard')
        .expect(200);

      expect(response.body).toEqual(mockExpectations);
      expect(mockSciFiService.getReaderExpectations).toHaveBeenCalledWith('hard');
    });

    it('should accept all valid hardness levels', async () => {
      const validLevels = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];
      mockSciFiService.getReaderExpectations.mockReturnValue({});

      for (const level of validLevels) {
        await request(app)
          .get(`/api/projects/scifi-reader-expectations/${level}`)
          .expect(200);
      }

      expect(mockSciFiService.getReaderExpectations).toHaveBeenCalledTimes(validLevels.length);
    });

    it('should return 400 for invalid hardness level', async () => {
      const response = await request(app)
        .get('/api/projects/scifi-reader-expectations/invalid-level')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid hardness level');
      expect(mockSciFiService.getReaderExpectations).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockSciFiService.getReaderExpectations.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/projects/scifi-reader-expectations/hard')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Service error');
    });
  });

  describe('GET /api/scifi-explanation-depth-suggestion/:hardnessLevel', () => {
    it('should get explanation depth suggestion', async () => {
      const mockSuggestion = {
        depth: 'detailed',
        detail_level: 8,
        reader_tolerance: 'high',
      };

      mockSciFiService.suggestExplanationDepth.mockReturnValue(mockSuggestion);

      const response = await request(app)
        .get('/api/projects/scifi-explanation-depth-suggestion/hard')
        .expect(200);

      expect(response.body).toEqual(mockSuggestion);
      expect(mockSciFiService.suggestExplanationDepth).toHaveBeenCalledWith('hard');
    });

    it('should accept all valid hardness levels', async () => {
      const validLevels = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];
      mockSciFiService.suggestExplanationDepth.mockReturnValue({});

      for (const level of validLevels) {
        await request(app)
          .get(`/api/projects/scifi-explanation-depth-suggestion/${level}`)
          .expect(200);
      }
    });

    it('should return 400 for invalid hardness level', async () => {
      const response = await request(app)
        .get('/api/projects/scifi-explanation-depth-suggestion/ultra-hard')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid hardness level');
    });

    it('should handle service errors', async () => {
      mockSciFiService.suggestExplanationDepth.mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const response = await request(app)
        .get('/api/projects/scifi-explanation-depth-suggestion/hard')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Calculation error');
    });
  });

  describe('GET /api/scifi-subgenre-defaults/:subgenre', () => {
    it('should get default classification for subgenre', async () => {
      const mockDefaults = {
        hardness_level: 'hard',
        tech_explanation_depth: 'detailed',
        scientific_accuracy_priority: 9,
      };

      mockSciFiService.getSubgenreDefaults.mockReturnValue(mockDefaults);

      const response = await request(app)
        .get('/api/projects/scifi-subgenre-defaults/hard-sci-fi')
        .expect(200);

      expect(response.body).toEqual(mockDefaults);
      expect(mockSciFiService.getSubgenreDefaults).toHaveBeenCalledWith('hard-sci-fi');
    });

    it('should handle various subgenre names', async () => {
      const subgenres = ['space-opera', 'cyberpunk', 'military-sf', 'post-apocalyptic'];
      mockSciFiService.getSubgenreDefaults.mockReturnValue({});

      for (const subgenre of subgenres) {
        await request(app).get(`/api/projects/scifi-subgenre-defaults/${subgenre}`).expect(200);
      }

      expect(mockSciFiService.getSubgenreDefaults).toHaveBeenCalledTimes(subgenres.length);
    });

    it('should handle service errors', async () => {
      mockSciFiService.getSubgenreDefaults.mockImplementation(() => {
        throw new Error('Unknown subgenre');
      });

      const response = await request(app)
        .get('/api/projects/scifi-subgenre-defaults/unknown')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Unknown subgenre');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid project ID gracefully', async () => {
      mockSciFiService.getClassification.mockRejectedValue(new Error('Invalid UUID'));

      const response = await request(app)
        .get('/api/projects/invalid-id/scifi-classification')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(app)
        .post(`/api/projects/${mockProjectId}/scifi-classification`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle null values in arrays', async () => {
      mockSciFiService.setRealScienceBasis.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/projects/${mockProjectId}/scifi-real-science-basis`)
        .send({ scienceAreas: ['physics', null, 'biology'] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });
});
