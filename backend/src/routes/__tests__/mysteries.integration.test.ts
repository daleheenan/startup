import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the mystery tracking service
jest.mock('../../services/mystery-tracking.service.js', () => ({
  mysteryTrackingService: {
    getSeriesMysteries: jest.fn(),
    getOpenMysteries: jest.fn(),
    getMysteryTimeline: jest.fn(),
    extractMysteriesFromChapter: jest.fn(),
    findMysteryResolutions: jest.fn(),
    updateMysteryStatus: jest.fn(),
    deleteMystery: jest.fn(),
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

describe('Mysteries API Integration Tests', () => {
  let app: express.Application;
  let mysteryTrackingService: any;
  let authToken: string;

  beforeAll(() => {
    // Generate a valid JWT token for testing
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    authToken = jwt.sign({ userId: 'test-user-id' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked service
    const mysteryModule = await import('../../services/mystery-tracking.service.js');
    mysteryTrackingService = mysteryModule.mysteryTrackingService;

    // Setup Express app with routes
    app = express();
    app.use(express.json());

    const mysteriesRouter = (await import('../mysteries.js')).default;
    app.use('/api/mysteries', mysteriesRouter);
  });

  describe('GET /api/mysteries/series/:seriesId', () => {
    const mockMysteries = [
      {
        id: 'mystery-1',
        seriesId: 'series-1',
        question: 'Who killed the king?',
        raisedBook: 1,
        raisedChapter: 3,
        context: 'The king was found dead in his chambers...',
        status: 'open',
        importance: 'major',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'mystery-2',
        seriesId: 'series-1',
        question: 'What is the artifact?',
        raisedBook: 1,
        raisedChapter: 5,
        context: 'An ancient artifact was discovered...',
        answeredBook: 2,
        answeredChapter: 10,
        answer: 'It was the Sword of Light',
        status: 'resolved',
        importance: 'major',
        createdAt: new Date().toISOString(),
      },
    ];

    it('should get all mysteries for a series successfully', () => {
      mysteryTrackingService.getSeriesMysteries.mockReturnValue(mockMysteries);

      return request(app)
        .get('/api/mysteries/series/series-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.mysteries).toEqual(mockMysteries);
          expect(mysteryTrackingService.getSeriesMysteries).toHaveBeenCalledWith('series-1');
        });
    });

    it('should return empty array when no mysteries exist', () => {
      mysteryTrackingService.getSeriesMysteries.mockReturnValue([]);

      return request(app)
        .get('/api/mysteries/series/series-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.mysteries).toEqual([]);
        });
    });

    it('should return 500 on service error', () => {
      mysteryTrackingService.getSeriesMysteries.mockImplementation(() => {
        throw new Error('Database error');
      });

      return request(app)
        .get('/api/mysteries/series/series-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)
        .then((response) => {
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
          expect(response.body.error.message).toContain('Database error');
        });
    });
  });

  describe('GET /api/mysteries/series/:seriesId/open', () => {
    const mockOpenMysteries = [
      {
        id: 'mystery-1',
        seriesId: 'series-1',
        question: 'Who killed the king?',
        raisedBook: 1,
        raisedChapter: 3,
        status: 'open',
        importance: 'major',
      },
      {
        id: 'mystery-3',
        seriesId: 'series-1',
        question: 'Where is the princess?',
        raisedBook: 2,
        raisedChapter: 1,
        status: 'open',
        importance: 'minor',
      },
    ];

    it('should get only open mysteries successfully', () => {
      mysteryTrackingService.getOpenMysteries.mockReturnValue(mockOpenMysteries);

      return request(app)
        .get('/api/mysteries/series/series-1/open')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.mysteries).toEqual(mockOpenMysteries);
          expect(mysteryTrackingService.getOpenMysteries).toHaveBeenCalledWith('series-1');
          // Verify all returned mysteries have status 'open'
          response.body.mysteries.forEach((mystery: any) => {
            expect(mystery.status).toBe('open');
          });
        });
    });

    it('should return empty array when no open mysteries exist', () => {
      mysteryTrackingService.getOpenMysteries.mockReturnValue([]);

      return request(app)
        .get('/api/mysteries/series/series-1/open')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.mysteries).toEqual([]);
        });
    });

    it('should return 500 on service error', () => {
      mysteryTrackingService.getOpenMysteries.mockImplementation(() => {
        throw new Error('Service error');
      });

      return request(app)
        .get('/api/mysteries/series/series-1/open')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)
        .then((response) => {
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });
    });
  });

  describe('GET /api/mysteries/series/:seriesId/timeline', () => {
    const mockTimeline = [
      {
        book: 1,
        chapter: 3,
        mysteries: [
          {
            id: 'mystery-1',
            question: 'Who killed the king?',
            action: 'raised',
            importance: 'major',
          },
        ],
      },
      {
        book: 1,
        chapter: 5,
        mysteries: [
          {
            id: 'mystery-2',
            question: 'What is the artifact?',
            action: 'raised',
            importance: 'major',
          },
        ],
      },
      {
        book: 2,
        chapter: 10,
        mysteries: [
          {
            id: 'mystery-2',
            question: 'What is the artifact?',
            action: 'resolved',
            answer: 'It was the Sword of Light',
          },
        ],
      },
    ];

    it('should get mystery timeline successfully', () => {
      mysteryTrackingService.getMysteryTimeline.mockReturnValue(mockTimeline);

      return request(app)
        .get('/api/mysteries/series/series-1/timeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.timeline).toEqual(mockTimeline);
          expect(mysteryTrackingService.getMysteryTimeline).toHaveBeenCalledWith('series-1');
        });
    });

    it('should return empty timeline when no mysteries exist', () => {
      mysteryTrackingService.getMysteryTimeline.mockReturnValue([]);

      return request(app)
        .get('/api/mysteries/series/series-1/timeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.timeline).toEqual([]);
        });
    });

    it('should return 500 on service error', () => {
      mysteryTrackingService.getMysteryTimeline.mockImplementation(() => {
        throw new Error('Timeline generation failed');
      });

      return request(app)
        .get('/api/mysteries/series/series-1/timeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)
        .then((response) => {
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });
    });
  });

  describe('POST /api/mysteries/chapters/:chapterId/extract', () => {
    const mockExtractedMysteries = [
      {
        id: 'mystery-new-1',
        question: 'Why did the knight betray his lord?',
        context: 'The knight suddenly attacked without warning...',
        importance: 'major',
      },
      {
        id: 'mystery-new-2',
        question: 'What was in the sealed letter?',
        context: 'A sealed letter arrived from the capital...',
        importance: 'minor',
      },
    ];

    it('should extract mysteries from chapter successfully', async () => {
      mysteryTrackingService.extractMysteriesFromChapter.mockResolvedValue(
        mockExtractedMysteries
      );

      const requestBody = {
        content: 'Chapter content with mysteries...',
      };

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/extract')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.mysteries).toEqual(mockExtractedMysteries);
      expect(mysteryTrackingService.extractMysteriesFromChapter).toHaveBeenCalledWith(
        'chapter-123',
        'Chapter content with mysteries...'
      );
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/extract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Content is required');
    });

    it('should return 400 when content is empty string', async () => {
      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/extract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 500 on service error', async () => {
      mysteryTrackingService.extractMysteriesFromChapter.mockRejectedValue(
        new Error('Extraction failed')
      );

      const requestBody = {
        content: 'Chapter content...',
      };

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/extract')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/mysteries/chapters/:chapterId/find-resolutions', () => {
    const mockResolutions = [
      {
        mysteryId: 'mystery-1',
        question: 'Who killed the king?',
        resolvedInChapter: true,
        answer: 'The queen poisoned him',
        confidence: 'high',
      },
    ];

    it('should find mystery resolutions successfully', async () => {
      mysteryTrackingService.findMysteryResolutions.mockResolvedValue(mockResolutions);

      const requestBody = {
        content: 'Chapter content with resolution...',
      };

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/find-resolutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.resolutions).toEqual(mockResolutions);
      expect(mysteryTrackingService.findMysteryResolutions).toHaveBeenCalledWith(
        'chapter-123',
        'Chapter content with resolution...'
      );
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/find-resolutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Content is required');
    });

    it('should return empty resolutions when none found', async () => {
      mysteryTrackingService.findMysteryResolutions.mockResolvedValue([]);

      const requestBody = {
        content: 'Chapter content with no resolutions...',
      };

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/find-resolutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.resolutions).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mysteryTrackingService.findMysteryResolutions.mockRejectedValue(
        new Error('Resolution detection failed')
      );

      const requestBody = {
        content: 'Chapter content...',
      };

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/find-resolutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PATCH /api/mysteries/:id', () => {
    const mockUpdatedMystery = {
      id: 'mystery-1',
      seriesId: 'series-1',
      question: 'Who killed the king?',
      raisedBook: 1,
      raisedChapter: 3,
      answeredBook: 2,
      answeredChapter: 15,
      answer: 'The queen poisoned him',
      status: 'resolved',
      importance: 'major',
    };

    it('should update mystery status to resolved successfully', () => {
      mysteryTrackingService.updateMysteryStatus.mockReturnValue(mockUpdatedMystery);

      const requestBody = {
        status: 'resolved',
        answer: 'The queen poisoned him',
        answeredBook: 2,
        answeredChapter: 15,
      };

      return request(app)
        .patch('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200)
        .then((response) => {
          expect(response.body.mystery).toEqual(mockUpdatedMystery);
          expect(mysteryTrackingService.updateMysteryStatus).toHaveBeenCalledWith(
            'mystery-1',
            'resolved',
            'The queen poisoned him',
            2,
            15
          );
        });
    });

    it('should update mystery status to red_herring successfully', () => {
      const redHerringMystery = {
        ...mockUpdatedMystery,
        status: 'red_herring',
        answer: 'It was a misdirection',
      };

      mysteryTrackingService.updateMysteryStatus.mockReturnValue(redHerringMystery);

      const requestBody = {
        status: 'red_herring',
        answer: 'It was a misdirection',
      };

      return request(app)
        .patch('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200)
        .then((response) => {
          expect(response.body.mystery.status).toBe('red_herring');
        });
    });

    it('should return 400 when status is missing', () => {
      const requestBody = {
        answer: 'Some answer',
      };

      return request(app)
        .patch('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(400)
        .then((response) => {
          expect(response.body.error.code).toBe('INVALID_REQUEST');
          expect(response.body.error.message).toContain('Valid status is required');
        });
    });

    it('should return 400 when status is invalid', () => {
      const requestBody = {
        status: 'invalid_status',
      };

      return request(app)
        .patch('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(400)
        .then((response) => {
          expect(response.body.error.code).toBe('INVALID_REQUEST');
          expect(response.body.error.message).toContain('Valid status is required');
        });
    });

    it('should accept valid statuses: open, resolved, red_herring', async () => {
      const validStatuses = ['open', 'resolved', 'red_herring'];

      for (const status of validStatuses) {
        mysteryTrackingService.updateMysteryStatus.mockReturnValue({
          ...mockUpdatedMystery,
          status,
        });

        const requestBody = { status };

        const response = await request(app)
          .patch('/api/mysteries/mystery-1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestBody)
          .expect(200);

        expect(response.body.mystery.status).toBe(status);
      }
    });

    it('should return 500 on service error', () => {
      mysteryTrackingService.updateMysteryStatus.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const requestBody = {
        status: 'resolved',
        answer: 'The answer',
      };

      return request(app)
        .patch('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(500)
        .then((response) => {
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });
    });
  });

  describe('DELETE /api/mysteries/:id', () => {
    it('should delete mystery successfully', () => {
      mysteryTrackingService.deleteMystery.mockReturnValue(undefined);

      return request(app)
        .delete('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(mysteryTrackingService.deleteMystery).toHaveBeenCalledWith('mystery-1');
        });
    });

    it('should return 500 on service error', () => {
      mysteryTrackingService.deleteMystery.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      return request(app)
        .delete('/api/mysteries/mystery-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)
        .then((response) => {
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
          expect(response.body.error.message).toContain('Delete failed');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      mysteryTrackingService.extractMysteriesFromChapter.mockRejectedValue(
        new Error('Claude API timeout')
      );

      const response = await request(app)
        .post('/api/mysteries/chapters/chapter-123/extract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test content' })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Claude API timeout');
    });

    it('should handle missing chapter ID gracefully', () => {
      return request(app)
        .get('/api/mysteries/series/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
