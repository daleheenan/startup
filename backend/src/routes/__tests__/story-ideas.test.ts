import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions at module scope with explicit typing
const mockGet = jest.fn<() => any>();
const mockAll = jest.fn<() => any>();
const mockRun = jest.fn<() => any>();
const mockPrepare = jest.fn<() => any>();

// Configure mockPrepare to always return the statement methods
mockPrepare.mockReturnValue({
  get: mockGet,
  all: mockAll,
  run: mockRun,
});

// Mock database connection
jest.mock('../../db/connection.js', () => {
  const mockDb = {
    prepare: mockPrepare,
  };
  return {
    __esModule: true,
    default: mockDb,
  };
});

// Mock the story ideas generator service
const mockGenerateIdeas = jest.fn<() => Promise<any>>();
const mockRegenerateSection = jest.fn<() => Promise<any>>();
const mockExpandPremise = jest.fn<() => Promise<any>>();

jest.mock('../../services/story-ideas-generator.js', () => ({
  storyIdeasGenerator: {
    generateIdeas: mockGenerateIdeas,
    regenerateSection: mockRegenerateSection,
    expandPremise: mockExpandPremise,
  },
  StoryIdeasGenerator: jest.fn(),
}));

// Mock the genre inference service
const mockInferGenre = jest.fn<() => Promise<any>>();

jest.mock('../../services/genre-inference.service.js', () => ({
  genreInferenceService: {
    inferGenre: mockInferGenre,
  },
}));

// Mock the logger service
jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import storyIdeasRouter from '../story-ideas.js';

describe('Story Ideas API Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear();
    mockGenerateIdeas.mockReset();
    mockRegenerateSection.mockReset();
    mockExpandPremise.mockReset();
    mockInferGenre.mockReset();

    // Ensure mockPrepare returns the statement methods
    mockPrepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Setup Express app with route
    app = express();
    app.use(express.json());
    app.use('/api/story-ideas', storyIdeasRouter);
  });

  describe('POST /api/story-ideas/create', () => {
    const validPremise = 'A modern day action thriller which explores a hunt for five hidden technological marvels. Each marvel is a feature of an ancient lost civilisation in human history.';
    const validTimePeriod = 'Contemporary';

    const mockInferredGenre = {
      genre: 'Science Fiction',
      subgenre: 'Techno-Thriller',
      tone: 'Suspenseful',
      themes: ['Technology', 'Lost History', 'Adventure'],
      confidence: 'high' as const,
    };

    const mockInsertedRow = {
      id: 'test-uuid-123',
      story_idea: validPremise,
      character_concepts: '[]',
      plot_elements: '[]',
      unique_twists: '[]',
      genre: mockInferredGenre.genre,
      subgenre: mockInferredGenre.subgenre,
      tone: mockInferredGenre.tone,
      themes: JSON.stringify(mockInferredGenre.themes),
      notes: null,
      status: 'saved',
      created_at: '2026-01-29T12:00:00.000Z',
      updated_at: '2026-01-29T12:00:00.000Z',
    };

    it('should create a manual story idea with inferred genre', async () => {
      mockInferGenre.mockResolvedValue(mockInferredGenre);
      mockGet.mockReturnValue(mockInsertedRow);

      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: validPremise, timePeriod: validTimePeriod })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.idea).toBeDefined();
      expect(response.body.idea.story_idea).toBe(validPremise);
      expect(response.body.idea.genre).toBe('Science Fiction');
      expect(response.body.inference.confidence).toBe('high');

      expect(mockInferGenre).toHaveBeenCalledWith(
        validPremise,
        validTimePeriod
      );
    });

    it('should accept optional character concepts, plot elements, and unique twists', async () => {
      mockInferGenre.mockResolvedValue(mockInferredGenre);
      mockGet.mockReturnValue({
        ...mockInsertedRow,
        character_concepts: JSON.stringify(['Elena - archaeologist']),
        plot_elements: JSON.stringify(['Race against time']),
        unique_twists: JSON.stringify(['Hidden villain']),
      });

      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({
          premise: validPremise,
          timePeriod: validTimePeriod,
          characterConcepts: ['Elena - archaeologist'],
          plotElements: ['Race against time'],
          uniqueTwists: ['Hidden villain'],
          notes: 'Initial draft',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.idea.character_concepts).toContain('Elena - archaeologist');
      expect(response.body.idea.plot_elements).toContain('Race against time');
      expect(response.body.idea.unique_twists).toContain('Hidden villain');
    });

    it('should return 400 if premise is missing', async () => {
      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ timePeriod: validTimePeriod })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('at least 10 characters');
    });

    it('should return 400 if premise is too short', async () => {
      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: 'Short' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('at least 10 characters');
    });

    it('should return 400 if premise is only whitespace', async () => {
      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: '        ' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('at least 10 characters');
    });

    it('should use default genre when genre inference fails', async () => {
      mockInferGenre.mockRejectedValue(new Error('API error'));
      mockGet.mockReturnValue({
        ...mockInsertedRow,
        genre: 'Other',
        subgenre: null,
        tone: null,
        themes: '[]',
      });

      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: validPremise })
        .expect(200);

      // Should still succeed with default genre
      expect(response.body.success).toBe(true);
      expect(response.body.idea.genre).toBe('Other');
      expect(response.body.inference.confidence).toBe('low');
    });

    it('should return 429 when genre inference hits rate limit', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockInferGenre.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: validPremise })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('rate limit');
    });

    it('should return 500 on database error', async () => {
      mockInferGenre.mockResolvedValue(mockInferredGenre);
      mockPrepare.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: validPremise })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should trim premise whitespace', async () => {
      mockInferGenre.mockResolvedValue(mockInferredGenre);
      mockGet.mockReturnValue(mockInsertedRow);

      await request(app)
        .post('/api/story-ideas/create')
        .send({ premise: '  ' + validPremise + '  ' })
        .expect(200);

      // The INSERT should have trimmed the premise
      expect(mockRun).toHaveBeenCalled();
      const insertCall = mockRun.mock.calls[0] as unknown[];
      expect(insertCall[1]).toBe(validPremise); // Second arg is the trimmed premise
    });
  });

  describe('POST /api/story-ideas/expand-premise', () => {
    const validPremise = 'A modern day action thriller exploring hidden technological marvels.';

    const mockExpansion = {
      characterConcepts: [
        'Dr. Elena Chen - Brilliant archaeologist with a secret past',
        'Marcus Webb - Tech billionaire funding the expedition',
      ],
      plotElements: [
        'Race against a rival organisation to find the marvels',
        'Each discovery reveals more about a hidden conspiracy',
      ],
      uniqueTwists: [
        'The marvels are not from Earth',
        'The expedition leader is working for the enemy',
      ],
    };

    it('should expand a premise with AI-generated content', async () => {
      mockExpandPremise.mockResolvedValue(mockExpansion);

      const response = await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({ premise: validPremise })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expansion.characterConcepts).toHaveLength(2);
      expect(response.body.expansion.plotElements).toHaveLength(2);
      expect(response.body.expansion.uniqueTwists).toHaveLength(2);
    });

    it('should accept optional time period', async () => {
      mockExpandPremise.mockResolvedValue(mockExpansion);

      await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({ premise: validPremise, timePeriod: 'Victorian Era' })
        .expect(200);

      expect(mockExpandPremise).toHaveBeenCalledWith(
        validPremise,
        'Victorian Era'
      );
    });

    it('should return 400 if premise is missing', async () => {
      const response = await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if premise is too short', async () => {
      const response = await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({ premise: 'Short' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('at least 10 characters');
    });

    it('should return 429 on rate limit error', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockExpandPremise.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({ premise: validPremise })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should return 500 on other errors', async () => {
      mockExpandPremise.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/story-ideas/expand-premise')
        .send({ premise: validPremise })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/story-ideas/saved', () => {
    const mockIdeas = [
      {
        id: 'idea-1',
        story_idea: 'First story idea premise',
        character_concepts: '["Character A"]',
        plot_elements: '["Plot A"]',
        unique_twists: '["Twist A"]',
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: '["redemption"]',
        notes: null,
        status: 'saved',
        created_at: '2026-01-28T12:00:00.000Z',
        updated_at: '2026-01-28T12:00:00.000Z',
      },
      {
        id: 'idea-2',
        story_idea: 'Second story idea premise',
        character_concepts: '["Character B"]',
        plot_elements: '["Plot B"]',
        unique_twists: '["Twist B"]',
        genre: 'Science Fiction',
        subgenre: 'Space Opera',
        tone: 'Epic',
        themes: '["exploration"]',
        notes: 'Good potential',
        status: 'saved',
        created_at: '2026-01-29T12:00:00.000Z',
        updated_at: '2026-01-29T12:00:00.000Z',
      },
    ];

    it('should return all saved ideas (excluding archived)', async () => {
      mockAll.mockReturnValue(mockIdeas);

      const response = await request(app)
        .get('/api/story-ideas/saved')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.ideas).toHaveLength(2);
      expect(response.body.ideas[0].story_idea).toBe('First story idea premise');
    });

    it('should filter by status when provided', async () => {
      mockAll.mockReturnValue([mockIdeas[0]]);

      const response = await request(app)
        .get('/api/story-ideas/saved?status=saved')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAll).toHaveBeenCalledWith('saved');
    });

    it('should filter by genre when provided', async () => {
      mockAll.mockReturnValue([mockIdeas[0]]);

      const response = await request(app)
        .get('/api/story-ideas/saved?genre=Fantasy')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should parse JSON arrays in response', async () => {
      mockAll.mockReturnValue(mockIdeas);

      const response = await request(app)
        .get('/api/story-ideas/saved')
        .expect(200);

      // Arrays should be parsed from JSON strings
      expect(Array.isArray(response.body.ideas[0].character_concepts)).toBe(true);
      expect(response.body.ideas[0].character_concepts).toContain('Character A');
    });

    it('should return 500 on database error', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/story-ideas/saved')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/story-ideas/saved/:id', () => {
    const mockIdea = {
      id: 'idea-123',
      story_idea: 'A specific story idea',
      character_concepts: '["Character"]',
      plot_elements: '["Plot"]',
      unique_twists: '["Twist"]',
      genre: 'Mystery',
      subgenre: 'Cosy Mystery',
      tone: 'Light-hearted',
      themes: '["friendship"]',
      notes: 'Good idea',
      status: 'saved',
      created_at: '2026-01-29T12:00:00.000Z',
      updated_at: '2026-01-29T12:00:00.000Z',
    };

    it('should return a specific story idea by ID', async () => {
      mockGet.mockReturnValue(mockIdea);

      const response = await request(app)
        .get('/api/story-ideas/saved/idea-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.idea.id).toBe('idea-123');
      expect(response.body.idea.story_idea).toBe('A specific story idea');
    });

    it('should return 404 if idea not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/story-ideas/saved/non-existent-id')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Story idea not found');
    });
  });

  describe('PUT /api/story-ideas/saved/:id', () => {
    it('should update notes for a story idea', async () => {
      mockGet.mockReturnValue({ id: 'idea-123' });

      const response = await request(app)
        .put('/api/story-ideas/saved/idea-123')
        .send({ notes: 'Updated notes' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Story idea updated');
    });

    it('should update status for a story idea', async () => {
      mockGet.mockReturnValue({ id: 'idea-123' });

      const response = await request(app)
        .put('/api/story-ideas/saved/idea-123')
        .send({ status: 'used' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if idea not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .put('/api/story-ideas/saved/non-existent-id')
        .send({ notes: 'test' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 if status is invalid', async () => {
      mockGet.mockReturnValue({ id: 'idea-123' });

      const response = await request(app)
        .put('/api/story-ideas/saved/idea-123')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Invalid status');
    });

    it('should return 400 if no updates provided', async () => {
      mockGet.mockReturnValue({ id: 'idea-123' });

      const response = await request(app)
        .put('/api/story-ideas/saved/idea-123')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('No updates provided');
    });
  });

  describe('DELETE /api/story-ideas/saved/:id', () => {
    it('should delete a story idea', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/story-ideas/saved/idea-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Story idea deleted');
    });

    it('should return 404 if idea not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/story-ideas/saved/non-existent-id')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Story idea not found');
    });
  });

  describe('POST /api/story-ideas/generate', () => {
    const validParams = {
      genre: 'Science Fiction',
      subgenre: 'Space Opera',
      tone: 'Epic',
      themes: ['exploration', 'discovery'],
      timePeriod: 'Far Future',
      count: 3,
    };

    const mockGeneratedIdeas = [
      {
        id: 'gen-1',
        storyIdea: 'A spaceship crew discovers an ancient alien civilisation.',
        characterConcepts: ['Captain Elena - veteran explorer'],
        plotElements: ['First contact scenario'],
        uniqueTwists: ['The aliens are human descendants'],
      },
    ];

    it('should generate story ideas', async () => {
      mockGenerateIdeas.mockResolvedValue(mockGeneratedIdeas);

      const response = await request(app)
        .post('/api/story-ideas/generate')
        .send(validParams)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.ideas).toHaveLength(1);
    });

    it('should return 400 if genre is missing', async () => {
      const response = await request(app)
        .post('/api/story-ideas/generate')
        .send({ tone: 'Epic', count: 3 })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 429 on rate limit error', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockGenerateIdeas.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/story-ideas/generate')
        .send(validParams)
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
