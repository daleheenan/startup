import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { PlagiarismCheckResult, BatchPlagiarismResult } from '../../shared/types/index.js';

// Mock the plagiarism checker service
jest.mock('../../services/plagiarism-checker.service.js', () => ({
  plagiarismCheckerService: {
    checkConcept: jest.fn(),
    checkConceptSummary: jest.fn(),
    checkStoryIdea: jest.fn(),
    checkChapter: jest.fn(),
    checkRawContent: jest.fn(),
    checkAllConcepts: jest.fn(),
    getCheckResults: jest.fn(),
    getLatestCheckResult: jest.fn(),
  },
}));

describe('Plagiarism API Routes', () => {
  let app: express.Application;
  let plagiarismCheckerService: any;

  // Mock data
  const mockPlagiarismResult: PlagiarismCheckResult = {
    id: 'check_123',
    contentType: 'concept',
    contentId: 'concept-1',
    checkedAt: '2026-01-27T10:00:00.000Z',
    status: 'passed',
    originalityScore: {
      overall: 85,
      plotOriginality: 88,
      characterOriginality: 82,
      settingOriginality: 90,
      themeOriginality: 80,
      premiseOriginality: 85,
    },
    similarWorks: [
      {
        title: 'The Shadow Chronicles',
        author: 'Jane Smith',
        similarity: 45,
        matchedElements: ['setting', 'theme'],
        description: 'Similar dark fantasy setting with redemption themes',
        publicationYear: 2018,
      },
    ],
    flags: [],
    recommendations: [
      'Consider emphasising the unique magical system',
      'Develop the protagonist\'s background further',
    ],
    analysisDetails: {
      tropesIdentified: ['chosen one', 'dark lord'],
      archetypesUsed: ['hero', 'mentor'],
      uniqueElements: ['time-bending magic', 'sentient cities'],
      concerningPatterns: [],
    },
    usage: {
      input_tokens: 1500,
      output_tokens: 800,
    },
  };

  const mockFlaggedResult: PlagiarismCheckResult = {
    ...mockPlagiarismResult,
    id: 'check_456',
    status: 'flagged',
    originalityScore: {
      overall: 45,
      plotOriginality: 40,
      characterOriginality: 50,
      settingOriginality: 45,
      themeOriginality: 48,
      premiseOriginality: 42,
    },
    flags: [
      {
        id: 'flag_1',
        type: 'plot_similarity',
        severity: 'high',
        description: 'Plot structure closely resembles existing work',
        similarTo: 'The Shadow Chronicles',
        suggestion: 'Modify the protagonist\'s journey to include more unique challenges',
      },
      {
        id: 'flag_2',
        type: 'premise_similarity',
        severity: 'medium',
        description: 'Core premise has significant overlap',
        similarTo: 'Dark Kingdom Rising',
        suggestion: 'Add a unique twist to the central conflict',
      },
    ],
  };

  const mockBatchResult: BatchPlagiarismResult = {
    totalChecked: 10,
    passedCount: 7,
    flaggedCount: 2,
    averageOriginalityScore: 78.5,
    results: [mockPlagiarismResult, mockFlaggedResult],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked service
    const plagiarismModule = await import('../../services/plagiarism-checker.service.js');
    plagiarismCheckerService = plagiarismModule.plagiarismCheckerService;

    // Setup Express app with route
    app = express();
    app.use(express.json());

    const plagiarismRouter = (await import('../plagiarism.js')).default;
    app.use('/api/plagiarism', plagiarismRouter);
  });

  describe('POST /api/plagiarism/check/concept/:id', () => {
    it('should check concept originality successfully', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(200);

      expect(response.body).toEqual(mockPlagiarismResult);
      expect(plagiarismCheckerService.checkConcept).toHaveBeenCalledWith('concept-1');
    });

    it('should return flagged status for derivative content', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockFlaggedResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-2')
        .expect(200);

      expect(response.body.status).toBe('flagged');
      expect(response.body.flags).toHaveLength(2);
      expect(response.body.flags[0].severity).toBe('high');
    });

    it('should return 404 when concept not found', async () => {
      plagiarismCheckerService.checkConcept.mockRejectedValue(
        new Error('Concept not found: concept-999')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Concept not found');
    });

    it('should handle service errors gracefully', async () => {
      plagiarismCheckerService.checkConcept.mockRejectedValue(
        new Error('Claude API error')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Claude API error');
    });
  });

  describe('POST /api/plagiarism/check/summary/:id', () => {
    it('should check summary originality successfully', async () => {
      const summaryResult = { ...mockPlagiarismResult, contentType: 'summary' as const };
      plagiarismCheckerService.checkConceptSummary.mockResolvedValue(summaryResult);

      const response = await request(app)
        .post('/api/plagiarism/check/summary/summary-1')
        .expect(200);

      expect(response.body.contentType).toBe('summary');
      expect(plagiarismCheckerService.checkConceptSummary).toHaveBeenCalledWith('summary-1');
    });

    it('should return 404 when summary not found', async () => {
      plagiarismCheckerService.checkConceptSummary.mockRejectedValue(
        new Error('Concept summary not found: summary-999')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/summary/summary-999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Concept summary not found');
    });
  });

  describe('POST /api/plagiarism/check/story-idea/:id', () => {
    it('should check story idea originality successfully', async () => {
      const ideaResult = { ...mockPlagiarismResult, contentType: 'story_idea' as const };
      plagiarismCheckerService.checkStoryIdea.mockResolvedValue(ideaResult);

      const response = await request(app)
        .post('/api/plagiarism/check/story-idea/idea-1')
        .expect(200);

      expect(response.body.contentType).toBe('story_idea');
      expect(plagiarismCheckerService.checkStoryIdea).toHaveBeenCalledWith('idea-1');
    });

    it('should return 404 when story idea not found', async () => {
      plagiarismCheckerService.checkStoryIdea.mockRejectedValue(
        new Error('Story idea not found: idea-999')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/story-idea/idea-999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Story idea not found');
    });
  });

  describe('POST /api/plagiarism/check/chapter/:id', () => {
    it('should check chapter originality successfully', async () => {
      const chapterResult = { ...mockPlagiarismResult, contentType: 'chapter' as const };
      plagiarismCheckerService.checkChapter.mockResolvedValue(chapterResult);

      const response = await request(app)
        .post('/api/plagiarism/check/chapter/chapter-1')
        .expect(200);

      expect(response.body.contentType).toBe('chapter');
      expect(plagiarismCheckerService.checkChapter).toHaveBeenCalledWith('chapter-1');
    });

    it('should return 404 when chapter not found', async () => {
      plagiarismCheckerService.checkChapter.mockRejectedValue(
        new Error('Chapter not found: chapter-999')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/chapter/chapter-999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Chapter not found');
    });

    it('should return 400 when chapter has no content', async () => {
      plagiarismCheckerService.checkChapter.mockRejectedValue(
        new Error('Chapter chapter-1 has no content to check')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/chapter/chapter-1')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Chapter has no content to check');
    });
  });

  describe('POST /api/plagiarism/check/raw', () => {
    const validRawContent = {
      title: 'The Shadow Realm',
      logline: 'A fallen prince must reclaim his throne',
      synopsis: 'An epic tale of redemption and power',
      storyIdea: 'A dark fantasy about political intrigue',
    };

    it('should check raw content successfully', async () => {
      plagiarismCheckerService.checkRawContent.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send(validRawContent)
        .expect(200);

      expect(response.body).toEqual(mockPlagiarismResult);
      expect(plagiarismCheckerService.checkRawContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Shadow Realm',
          logline: 'A fallen prince must reclaim his throne',
          synopsis: 'An epic tale of redemption and power',
          storyIdea: 'A dark fantasy about political intrigue',
        })
      );
    });

    it('should accept content with optional fields', async () => {
      plagiarismCheckerService.checkRawContent.mockResolvedValue(mockPlagiarismResult);

      const minimalContent = {
        title: 'Test Title',
        characterConcepts: ['Protagonist: warrior', 'Antagonist: sorcerer'],
        plotElements: ['inciting incident', 'climax'],
        uniqueTwists: ['unexpected betrayal'],
      };

      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send(minimalContent)
        .expect(200);

      expect(plagiarismCheckerService.checkRawContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          characterConcepts: ['Protagonist: warrior', 'Antagonist: sorcerer'],
        })
      );
    });

    it('should return 400 when no content fields provided', async () => {
      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('At least one content field is required');
    });

    it('should return 400 when only empty optional fields provided', async () => {
      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send({ hook: '', protagonistHint: '' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle service errors during raw content check', async () => {
      plagiarismCheckerService.checkRawContent.mockRejectedValue(
        new Error('Claude service unavailable')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send(validRawContent)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Claude service unavailable');
    });
  });

  describe('POST /api/plagiarism/check/all-concepts', () => {
    it('should batch check all concepts successfully', async () => {
      plagiarismCheckerService.checkAllConcepts.mockResolvedValue(mockBatchResult);

      const response = await request(app)
        .post('/api/plagiarism/check/all-concepts')
        .expect(200);

      expect(response.body).toEqual(mockBatchResult);
      expect(response.body.totalChecked).toBe(10);
      expect(response.body.passedCount).toBe(7);
      expect(response.body.flaggedCount).toBe(2);
      expect(response.body.averageOriginalityScore).toBe(78.5);
      expect(plagiarismCheckerService.checkAllConcepts).toHaveBeenCalled();
    });

    it('should handle empty result set', async () => {
      const emptyBatchResult: BatchPlagiarismResult = {
        totalChecked: 0,
        passedCount: 0,
        flaggedCount: 0,
        averageOriginalityScore: 0,
        results: [],
      };
      plagiarismCheckerService.checkAllConcepts.mockResolvedValue(emptyBatchResult);

      const response = await request(app)
        .post('/api/plagiarism/check/all-concepts')
        .expect(200);

      expect(response.body.totalChecked).toBe(0);
      expect(response.body.results).toEqual([]);
    });

    it('should handle batch check errors', async () => {
      plagiarismCheckerService.checkAllConcepts.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/all-concepts')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });
  });

  describe('GET /api/plagiarism/results/:contentId', () => {
    it('should retrieve check results for content', async () => {
      const mockResults = [mockPlagiarismResult, mockFlaggedResult];
      plagiarismCheckerService.getCheckResults.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/plagiarism/results/concept-1')
        .expect(200);

      expect(response.body.results).toEqual(mockResults);
      expect(response.body.results).toHaveLength(2);
      expect(plagiarismCheckerService.getCheckResults).toHaveBeenCalledWith('concept-1');
    });

    it('should return empty array when no results exist', async () => {
      plagiarismCheckerService.getCheckResults.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/plagiarism/results/concept-999')
        .expect(200);

      expect(response.body.results).toEqual([]);
    });

    it('should handle service errors when fetching results', async () => {
      plagiarismCheckerService.getCheckResults.mockRejectedValue(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/plagiarism/results/concept-1')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database query failed');
    });
  });

  describe('GET /api/plagiarism/results/:contentId/latest', () => {
    it('should retrieve latest check result for content', async () => {
      plagiarismCheckerService.getLatestCheckResult.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .get('/api/plagiarism/results/concept-1/latest')
        .expect(200);

      expect(response.body.result).toEqual(mockPlagiarismResult);
      expect(plagiarismCheckerService.getLatestCheckResult).toHaveBeenCalledWith('concept-1');
    });

    it('should return null result with message when no results exist', async () => {
      plagiarismCheckerService.getLatestCheckResult.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/plagiarism/results/concept-999/latest')
        .expect(200);

      expect(response.body.result).toBeNull();
      expect(response.body.message).toBe('No check results found for this content');
    });

    it('should handle service errors when fetching latest result', async () => {
      plagiarismCheckerService.getLatestCheckResult.mockRejectedValue(
        new Error('Database connection lost')
      );

      const response = await request(app)
        .get('/api/plagiarism/results/concept-1/latest')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection lost');
    });
  });

  describe('Input Validation', () => {
    it('should validate contentId parameter exists', async () => {
      plagiarismCheckerService.getCheckResults.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/plagiarism/results/')
        .expect(404);

      // Route doesn't match, returns 404
      expect(response.status).toBe(404);
    });

    it('should handle special characters in contentId', async () => {
      plagiarismCheckerService.getCheckResults.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/plagiarism/results/concept-123-abc_def')
        .expect(200);

      expect(plagiarismCheckerService.getCheckResults).toHaveBeenCalledWith('concept-123-abc_def');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for not found errors', async () => {
      plagiarismCheckerService.checkConcept.mockRejectedValue(
        new Error('Concept not found: test-id')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/concept/test-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String),
        },
      });
    });

    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/plagiarism/check/raw')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'INVALID_REQUEST',
          message: expect.any(String),
        },
      });
    });

    it('should return consistent error format for server errors', async () => {
      plagiarismCheckerService.checkConcept.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(500);

      expect(response.body).toMatchObject({
        error: {
          code: 'INTERNAL_ERROR',
          message: expect.any(String),
        },
      });
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all originality score fields', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(200);

      expect(response.body.originalityScore).toMatchObject({
        overall: expect.any(Number),
        plotOriginality: expect.any(Number),
        characterOriginality: expect.any(Number),
        settingOriginality: expect.any(Number),
        themeOriginality: expect.any(Number),
        premiseOriginality: expect.any(Number),
      });
    });

    it('should preserve similar works details', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(200);

      expect(response.body.similarWorks[0]).toMatchObject({
        title: expect.any(String),
        author: expect.any(String),
        similarity: expect.any(Number),
        matchedElements: expect.any(Array),
        description: expect.any(String),
      });
    });

    it('should preserve flag details when content is flagged', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockFlaggedResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-2')
        .expect(200);

      expect(response.body.flags[0]).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        severity: expect.any(String),
        description: expect.any(String),
        similarTo: expect.any(String),
        suggestion: expect.any(String),
      });
    });

    it('should preserve analysis details', async () => {
      plagiarismCheckerService.checkConcept.mockResolvedValue(mockPlagiarismResult);

      const response = await request(app)
        .post('/api/plagiarism/check/concept/concept-1')
        .expect(200);

      expect(response.body.analysisDetails).toMatchObject({
        tropesIdentified: expect.any(Array),
        archetypesUsed: expect.any(Array),
        uniqueElements: expect.any(Array),
        concerningPatterns: expect.any(Array),
      });
    });
  });
});
