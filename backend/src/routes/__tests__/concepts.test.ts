import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the concept generator service
jest.mock('../../services/concept-generator.js', () => ({
  generateConcepts: jest.fn(),
  refineConcepts: jest.fn(),
}));

describe('Concepts API Routes', () => {
  let app: express.Application;
  let generateConcepts: any;
  let refineConcepts: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked service
    const conceptModule = await import('../../services/concept-generator.js');
    generateConcepts = conceptModule.generateConcepts;
    refineConcepts = conceptModule.refineConcepts;

    // Setup Express app with route
    app = express();
    app.use(express.json());

    const conceptsRouter = (await import('../concepts.js')).default;
    app.use('/api/concepts', conceptsRouter);
  });

  describe('POST /api/concepts/generate', () => {
    const validPreferences = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark',
      themes: ['redemption', 'power'],
      targetLength: 90000,
    };

    const mockConcepts = [
      {
        id: 'concept-1',
        title: 'The Shadow King',
        logline: 'A fallen prince must reclaim his throne.',
        synopsis: 'A prince battles darkness to save his kingdom.',
        hook: 'Power and redemption collide.',
        protagonistHint: 'Aldric - fallen prince',
        conflictType: 'both',
      },
      {
        id: 'concept-2',
        title: 'Crown of Thorns',
        logline: 'A reluctant heir faces impossible choices.',
        synopsis: 'Leadership demands sacrifice.',
        hook: 'The price of power.',
        protagonistHint: 'Elena - reluctant heir',
        conflictType: 'internal',
      },
    ];

    it('should generate concepts successfully with valid preferences', async () => {
      generateConcepts.mockResolvedValue(mockConcepts);

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: validPreferences })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.concepts).toHaveLength(2);
      expect(response.body.concepts[0].title).toBe('The Shadow King');

      expect(generateConcepts).toHaveBeenCalledWith(validPreferences);
    });

    it('should accept multi-genre format', async () => {
      const multiGenrePreferences = {
        genres: ['Fantasy', 'Science Fiction'],
        subgenres: ['Epic Fantasy', 'Space Opera'],
        modifiers: ['Cyberpunk'],
        tone: 'Dark',
        themes: ['identity'],
        targetLength: 80000,
      };

      generateConcepts.mockResolvedValue(mockConcepts);

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: multiGenrePreferences })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(generateConcepts).toHaveBeenCalledWith(multiGenrePreferences);
    });

    it('should return 400 if preferences are missing', async () => {
      const response = await request(app)
        .post('/api/concepts/generate')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing preferences');
    });

    it('should return 400 if genre is missing', async () => {
      const invalidPreferences = {
        // No genre or genres
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: ['redemption'],
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing required preference fields');
    });

    it('should return 400 if subgenre is missing', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        // No subgenre
        tone: 'Dark',
        themes: ['redemption'],
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if tone is missing', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        // No tone
        themes: ['redemption'],
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if themes are missing', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        // No themes
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if themes is not an array', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: 'redemption', // Should be array
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.message).toContain('themes must be');
    });

    it('should return 400 if themes is empty array', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: [],
        targetLength: 90000,
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.message).toContain('themes must be');
    });

    it('should return 400 if targetLength is missing', async () => {
      const invalidPreferences = {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: ['redemption'],
        // No targetLength
      };

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 429 on rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      generateConcepts.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: validPreferences })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('rate limit');
    });

    it('should return 429 when error message contains rate limit', async () => {
      generateConcepts.mockRejectedValue(
        new Error('Claude API rate limit reached')
      );

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: validPreferences })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should return 500 on other errors', async () => {
      generateConcepts.mockRejectedValue(new Error('Internal service error'));

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: validPreferences })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Internal service error');
    });

    it('should return generic error message if error has no message', async () => {
      generateConcepts.mockRejectedValue({});

      const response = await request(app)
        .post('/api/concepts/generate')
        .send({ preferences: validPreferences })
        .expect(500);

      expect(response.body.error.message).toBe('Failed to generating concepts');
    });
  });

  describe('POST /api/concepts/refine', () => {
    const validPreferences = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark',
      themes: ['redemption'],
      targetLength: 90000,
    };

    const existingConcepts = [
      {
        id: 'concept-1',
        title: 'Old Concept',
        logline: 'An old logline.',
        synopsis: 'Old synopsis.',
        hook: 'Old hook.',
        protagonistHint: 'Old protagonist',
        conflictType: 'external',
      },
    ];

    const feedback = 'I want more focus on internal conflict.';

    const mockRefinedConcepts = [
      {
        id: 'concept-1',
        title: 'Inner Demons',
        logline: 'A warrior battles his own guilt.',
        synopsis: 'Internal conflict drives the story.',
        hook: 'The real enemy is within.',
        protagonistHint: 'Marcus - guilt-ridden warrior',
        conflictType: 'internal',
      },
    ];

    it('should refine concepts successfully', async () => {
      refineConcepts.mockResolvedValue(mockRefinedConcepts);

      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, existingConcepts, feedback })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.concepts).toHaveLength(1);
      expect(response.body.concepts[0].title).toBe('Inner Demons');

      expect(refineConcepts).toHaveBeenCalledWith(
        validPreferences,
        existingConcepts,
        feedback
      );
    });

    it('should return 400 if preferences are missing', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ existingConcepts, feedback })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing preferences');
    });

    it('should return 400 if existingConcepts are missing', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, feedback })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing');
    });

    it('should return 400 if feedback is missing', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, existingConcepts })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Missing');
    });

    it('should return 400 if existingConcepts is not an array', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({
          preferences: validPreferences,
          existingConcepts: 'not-an-array',
          feedback
        })
        .expect(400);

      expect(response.body.error.message).toContain('must be an array');
    });

    it('should return 400 if existingConcepts is empty array', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({
          preferences: validPreferences,
          existingConcepts: [],
          feedback
        })
        .expect(400);

      expect(response.body.error.message).toContain('must be a non-empty array');
    });

    it('should return 400 if feedback is not a string', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({
          preferences: validPreferences,
          existingConcepts,
          feedback: 123
        })
        .expect(400);

      expect(response.body.error.message).toContain('must be a non-empty string');
    });

    it('should return 400 if feedback is empty string', async () => {
      const response = await request(app)
        .post('/api/concepts/refine')
        .send({
          preferences: validPreferences,
          existingConcepts,
          feedback: '   '
        })
        .expect(400);

      expect(response.body.error.message).toContain('must be a non-empty string');
    });

    it('should trim feedback before processing', async () => {
      refineConcepts.mockResolvedValue(mockRefinedConcepts);

      await request(app)
        .post('/api/concepts/refine')
        .send({
          preferences: validPreferences,
          existingConcepts,
          feedback: '  ' + feedback + '  '
        })
        .expect(200);

      expect(refineConcepts).toHaveBeenCalledWith(
        validPreferences,
        existingConcepts,
        feedback // Should be trimmed
      );
    });

    it('should return 429 on rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      refineConcepts.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, existingConcepts, feedback })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should return 500 on other errors', async () => {
      refineConcepts.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, existingConcepts, feedback })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Service error');
    });

    it('should return generic error message if error has no message', async () => {
      refineConcepts.mockRejectedValue({});

      const response = await request(app)
        .post('/api/concepts/refine')
        .send({ preferences: validPreferences, existingConcepts, feedback })
        .expect(500);

      expect(response.body.error.message).toBe('Failed to refining concepts');
    });
  });
});
