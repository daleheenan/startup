import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the services
jest.mock('../../services/chapter-orchestrator.service.js', () => ({
  chapterOrchestratorService: {
    queueBookGeneration: jest.fn(),
    getBookGenerationStats: jest.fn(),
  },
}));

jest.mock('../../services/progress-tracking.service.js', () => ({
  progressTrackingService: {
    getBookProgress: jest.fn(),
    getProjectProgress: jest.fn(),
  },
}));

describe('Generation API Routes', () => {
  let app: express.Application;
  let chapterOrchestratorService: any;
  let progressTrackingService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked services
    const orchestratorModule = await import('../../services/chapter-orchestrator.service.js');
    chapterOrchestratorService = orchestratorModule.chapterOrchestratorService;

    const progressModule = await import('../../services/progress-tracking.service.js');
    progressTrackingService = progressModule.progressTrackingService;

    // Setup Express app with route
    app = express();
    app.use(express.json());

    const generationRouter = (await import('../generation.js')).default;
    app.use('/api/generation', generationRouter);
  });

  describe('POST /api/generation/book/:bookId/start', () => {
    const bookId = 'book-123';
    const mockResult = {
      chaptersQueued: 12,
      jobsCreated: 168, // 12 chapters * 14 jobs per chapter
    };

    it('should start book generation successfully', async () => {
      chapterOrchestratorService.queueBookGeneration.mockReturnValue(mockResult);

      const response = await request(app)
        .post(`/api/generation/book/${bookId}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Queued 12 chapters for generation');
      expect(response.body.chaptersQueued).toBe(12);
      expect(response.body.jobsCreated).toBe(168);

      expect(chapterOrchestratorService.queueBookGeneration).toHaveBeenCalledWith(bookId);
    });

    it('should handle case when no chapters are queued', async () => {
      const emptyResult = { chaptersQueued: 0, jobsCreated: 0 };
      chapterOrchestratorService.queueBookGeneration.mockReturnValue(emptyResult);

      const response = await request(app)
        .post(`/api/generation/book/${bookId}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Queued 0 chapters for generation');
      expect(response.body.chaptersQueued).toBe(0);
      expect(response.body.jobsCreated).toBe(0);
    });

    it('should handle special characters in bookId', async () => {
      const specialBookId = 'book-123-abc-def';
      chapterOrchestratorService.queueBookGeneration.mockReturnValue(mockResult);

      const response = await request(app)
        .post(`/api/generation/book/${specialBookId}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(chapterOrchestratorService.queueBookGeneration).toHaveBeenCalledWith(specialBookId);
    });

    it('should return 500 when service throws an error', async () => {
      chapterOrchestratorService.queueBookGeneration.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .post(`/api/generation/book/${bookId}/start`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Database connection failed');
    });

    it('should return 500 when service throws error without message', async () => {
      chapterOrchestratorService.queueBookGeneration.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app)
        .post(`/api/generation/book/${bookId}/start`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to starting book generation');
    });

    it('should return 500 when service throws non-Error object', async () => {
      chapterOrchestratorService.queueBookGeneration.mockImplementation(() => {
        throw { message: 'Custom error object' };
      });

      const response = await request(app)
        .post(`/api/generation/book/${bookId}/start`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/generation/book/:bookId/progress', () => {
    const bookId = 'book-123';
    const mockProgress = {
      chaptersCompleted: 5,
      chaptersTotal: 12,
      percentComplete: 42,
      wordCount: 12500,
      targetWordCount: 30000,
      avgChapterTime: 4.5,
      estimatedTimeRemaining: 31.5,
      sessionsUsed: 3,
      currentChapter: {
        number: 6,
        status: 'writing',
      },
      recentEvents: [
        {
          timestamp: '2025-01-20T10:30:00.000Z',
          type: 'Chapter Generated',
          description: 'Chapter 5 written',
          chapterNumber: 5,
        },
        {
          timestamp: '2025-01-20T10:25:00.000Z',
          type: 'Dev Edit Complete',
          description: 'Chapter 4 dev edit complete',
          chapterNumber: 4,
        },
      ],
      rateLimitStatus: {
        currentSessions: 3,
        maxSessions: 5,
        isLimited: false,
        resetsAt: null,
      },
    };

    it('should get book progress successfully', async () => {
      progressTrackingService.getBookProgress.mockReturnValue(mockProgress);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(200);

      expect(response.body.chaptersCompleted).toBe(5);
      expect(response.body.chaptersTotal).toBe(12);
      expect(response.body.percentComplete).toBe(42);
      expect(response.body.wordCount).toBe(12500);
      expect(response.body.currentChapter).toEqual({
        number: 6,
        status: 'writing',
      });
      expect(response.body.recentEvents).toHaveLength(2);

      expect(progressTrackingService.getBookProgress).toHaveBeenCalledWith(bookId);
    });

    it('should get empty progress when no chapters exist', async () => {
      const emptyProgress = {
        chaptersCompleted: 0,
        chaptersTotal: 0,
        percentComplete: 0,
        wordCount: 0,
        targetWordCount: 0,
        avgChapterTime: 0,
        estimatedTimeRemaining: 0,
        sessionsUsed: 0,
        recentEvents: [],
        rateLimitStatus: {
          currentSessions: 0,
          maxSessions: 5,
          isLimited: false,
          resetsAt: null,
        },
      };

      progressTrackingService.getBookProgress.mockReturnValue(emptyProgress);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(200);

      expect(response.body.chaptersCompleted).toBe(0);
      expect(response.body.chaptersTotal).toBe(0);
      expect(response.body.percentComplete).toBe(0);
    });

    it('should handle progress with rate limiting', async () => {
      const limitedProgress = {
        ...mockProgress,
        rateLimitStatus: {
          currentSessions: 5,
          maxSessions: 5,
          isLimited: true,
          resetsAt: '2025-01-21T00:00:00.000Z',
        },
      };

      progressTrackingService.getBookProgress.mockReturnValue(limitedProgress);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(200);

      expect(response.body.rateLimitStatus.isLimited).toBe(true);
      expect(response.body.rateLimitStatus.currentSessions).toBe(5);
    });

    it('should handle progress without current chapter', async () => {
      const progressWithoutCurrent = {
        ...mockProgress,
        currentChapter: undefined,
      };

      progressTrackingService.getBookProgress.mockReturnValue(progressWithoutCurrent);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(200);

      expect(response.body.currentChapter).toBeUndefined();
    });

    it('should return 500 when service throws an error', async () => {
      progressTrackingService.getBookProgress.mockImplementation(() => {
        throw new Error('Failed to fetch progress');
      });

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to fetch progress');
    });

    it('should return 500 when service throws non-Error', async () => {
      progressTrackingService.getBookProgress.mockImplementation(() => {
        throw 'String error';
      });

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/progress`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/generation/book/:bookId/stats', () => {
    const bookId = 'book-123';
    const mockStats = {
      totalChapters: 12,
      pending: 4,
      writing: 2,
      editing: 3,
      completed: 3,
      failed: 0,
    };

    it('should get book generation stats successfully', async () => {
      chapterOrchestratorService.getBookGenerationStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(200);

      expect(response.body.totalChapters).toBe(12);
      expect(response.body.pending).toBe(4);
      expect(response.body.writing).toBe(2);
      expect(response.body.editing).toBe(3);
      expect(response.body.completed).toBe(3);
      expect(response.body.failed).toBe(0);

      expect(chapterOrchestratorService.getBookGenerationStats).toHaveBeenCalledWith(bookId);
    });

    it('should handle stats with failed chapters', async () => {
      const statsWithFailures = {
        ...mockStats,
        failed: 2,
        completed: 1,
      };

      chapterOrchestratorService.getBookGenerationStats.mockReturnValue(statsWithFailures);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(200);

      expect(response.body.failed).toBe(2);
      expect(response.body.completed).toBe(1);
    });

    it('should handle stats for book with no chapters', async () => {
      const emptyStats = {
        totalChapters: 0,
        pending: 0,
        writing: 0,
        editing: 0,
        completed: 0,
        failed: 0,
      };

      chapterOrchestratorService.getBookGenerationStats.mockReturnValue(emptyStats);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(200);

      expect(response.body.totalChapters).toBe(0);
      expect(response.body.pending).toBe(0);
      expect(response.body.completed).toBe(0);
    });

    it('should handle stats for fully completed book', async () => {
      const completedStats = {
        totalChapters: 12,
        pending: 0,
        writing: 0,
        editing: 0,
        completed: 12,
        failed: 0,
      };

      chapterOrchestratorService.getBookGenerationStats.mockReturnValue(completedStats);

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(200);

      expect(response.body.totalChapters).toBe(12);
      expect(response.body.completed).toBe(12);
      expect(response.body.pending).toBe(0);
    });

    it('should return 500 when service throws an error', async () => {
      chapterOrchestratorService.getBookGenerationStats.mockImplementation(() => {
        throw new Error('Stats retrieval failed');
      });

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Stats retrieval failed');
    });

    it('should return 500 when service throws without message', async () => {
      chapterOrchestratorService.getBookGenerationStats.mockImplementation(() => {
        throw {};
      });

      const response = await request(app)
        .get(`/api/generation/book/${bookId}/stats`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/generation/project/:projectId/progress', () => {
    const projectId = 'project-456';
    const mockProjectProgress = {
      totalBooks: 3,
      completedBooks: 1,
      overallProgress: {
        chaptersCompleted: 15,
        chaptersTotal: 36,
        percentComplete: 42,
        wordCount: 37500,
        targetWordCount: 90000,
        avgChapterTime: 4.8,
        estimatedTimeRemaining: 100.8,
        sessionsUsed: 8,
        recentEvents: [
          {
            timestamp: '2025-01-20T11:00:00.000Z',
            type: 'Chapter Generated',
            description: 'Book 1 - Chapter 5 written',
            chapterNumber: 5,
          },
          {
            timestamp: '2025-01-20T10:50:00.000Z',
            type: 'Chapter Generated',
            description: 'Book 2 - Chapter 3 written',
            chapterNumber: 3,
          },
        ],
        rateLimitStatus: {
          currentSessions: 4,
          maxSessions: 5,
          isLimited: false,
          resetsAt: null,
        },
      },
    };

    it('should get project progress successfully', async () => {
      progressTrackingService.getProjectProgress.mockReturnValue(mockProjectProgress);

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(200);

      expect(response.body.totalBooks).toBe(3);
      expect(response.body.completedBooks).toBe(1);
      expect(response.body.overallProgress.chaptersCompleted).toBe(15);
      expect(response.body.overallProgress.chaptersTotal).toBe(36);
      expect(response.body.overallProgress.percentComplete).toBe(42);
      expect(response.body.overallProgress.recentEvents).toHaveLength(2);

      expect(progressTrackingService.getProjectProgress).toHaveBeenCalledWith(projectId);
    });

    it('should handle project with no books', async () => {
      const emptyProjectProgress = {
        totalBooks: 0,
        completedBooks: 0,
        overallProgress: {
          chaptersCompleted: 0,
          chaptersTotal: 0,
          percentComplete: 0,
          wordCount: 0,
          targetWordCount: 0,
          avgChapterTime: 0,
          estimatedTimeRemaining: 0,
          sessionsUsed: 0,
          recentEvents: [],
          rateLimitStatus: {
            currentSessions: 0,
            maxSessions: 5,
            isLimited: false,
            resetsAt: null,
          },
        },
      };

      progressTrackingService.getProjectProgress.mockReturnValue(emptyProjectProgress);

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(200);

      expect(response.body.totalBooks).toBe(0);
      expect(response.body.completedBooks).toBe(0);
      expect(response.body.overallProgress.chaptersCompleted).toBe(0);
    });

    it('should handle project with all books completed', async () => {
      const completedProjectProgress = {
        totalBooks: 3,
        completedBooks: 3,
        overallProgress: {
          chaptersCompleted: 36,
          chaptersTotal: 36,
          percentComplete: 100,
          wordCount: 90000,
          targetWordCount: 90000,
          avgChapterTime: 5.0,
          estimatedTimeRemaining: 0,
          sessionsUsed: 15,
          recentEvents: [],
          rateLimitStatus: {
            currentSessions: 5,
            maxSessions: 5,
            isLimited: true,
            resetsAt: '2025-01-21T00:00:00.000Z',
          },
        },
      };

      progressTrackingService.getProjectProgress.mockReturnValue(completedProjectProgress);

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(200);

      expect(response.body.totalBooks).toBe(3);
      expect(response.body.completedBooks).toBe(3);
      expect(response.body.overallProgress.percentComplete).toBe(100);
      expect(response.body.overallProgress.estimatedTimeRemaining).toBe(0);
    });

    it('should handle partial progress across multiple books', async () => {
      const partialProgress = {
        totalBooks: 5,
        completedBooks: 2,
        overallProgress: {
          chaptersCompleted: 30,
          chaptersTotal: 60,
          percentComplete: 50,
          wordCount: 75000,
          targetWordCount: 150000,
          avgChapterTime: 5.2,
          estimatedTimeRemaining: 156,
          sessionsUsed: 10,
          recentEvents: [
            {
              timestamp: '2025-01-20T12:00:00.000Z',
              type: 'Chapter Generated',
              description: 'Book 3 - Chapter 6 written',
              chapterNumber: 6,
            },
          ],
          rateLimitStatus: {
            currentSessions: 5,
            maxSessions: 5,
            isLimited: false,
            resetsAt: null,
          },
        },
      };

      progressTrackingService.getProjectProgress.mockReturnValue(partialProgress);

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(200);

      expect(response.body.totalBooks).toBe(5);
      expect(response.body.completedBooks).toBe(2);
      expect(response.body.overallProgress.percentComplete).toBe(50);
    });

    it('should return 500 when service throws an error', async () => {
      progressTrackingService.getProjectProgress.mockImplementation(() => {
        throw new Error('Project progress fetch failed');
      });

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Project progress fetch failed');
    });

    it('should return 500 when service throws Error without message', async () => {
      progressTrackingService.getProjectProgress.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app)
        .get(`/api/generation/project/${projectId}/progress`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to fetching project progress');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long bookId in start endpoint', async () => {
      const longBookId = 'b'.repeat(255);
      const mockResult = { chaptersQueued: 1, jobsCreated: 14 };
      chapterOrchestratorService.queueBookGeneration.mockReturnValue(mockResult);

      const response = await request(app)
        .post(`/api/generation/book/${longBookId}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(chapterOrchestratorService.queueBookGeneration).toHaveBeenCalledWith(longBookId);
    });

    it('should handle UUID-style IDs', async () => {
      const uuidBookId = '550e8400-e29b-41d4-a716-446655440000';
      const mockStats = {
        totalChapters: 5,
        pending: 2,
        writing: 1,
        editing: 1,
        completed: 1,
        failed: 0,
      };

      chapterOrchestratorService.getBookGenerationStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get(`/api/generation/book/${uuidBookId}/stats`)
        .expect(200);

      expect(response.body.totalChapters).toBe(5);
    });

    it('should handle projectId with special characters', async () => {
      const specialProjectId = 'project-123-abc_def';
      const mockProjectProgress = {
        totalBooks: 1,
        completedBooks: 0,
        overallProgress: {
          chaptersCompleted: 0,
          chaptersTotal: 12,
          percentComplete: 0,
          wordCount: 0,
          targetWordCount: 30000,
          avgChapterTime: 0,
          estimatedTimeRemaining: 0,
          sessionsUsed: 0,
          recentEvents: [],
          rateLimitStatus: {
            currentSessions: 0,
            maxSessions: 5,
            isLimited: false,
            resetsAt: null,
          },
        },
      };

      progressTrackingService.getProjectProgress.mockReturnValue(mockProjectProgress);

      const response = await request(app)
        .get(`/api/generation/project/${specialProjectId}/progress`)
        .expect(200);

      expect(response.body.totalBooks).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous start requests', async () => {
      const bookId1 = 'book-111';
      const bookId2 = 'book-222';
      const mockResult = { chaptersQueued: 10, jobsCreated: 140 };

      chapterOrchestratorService.queueBookGeneration.mockReturnValue(mockResult);

      const [response1, response2] = await Promise.all([
        request(app).post(`/api/generation/book/${bookId1}/start`),
        request(app).post(`/api/generation/book/${bookId2}/start`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(chapterOrchestratorService.queueBookGeneration).toHaveBeenCalledTimes(2);
    });

    it('should handle simultaneous progress requests', async () => {
      const bookId = 'book-123';
      const mockProgress = {
        chaptersCompleted: 5,
        chaptersTotal: 12,
        percentComplete: 42,
        wordCount: 12500,
        targetWordCount: 30000,
        avgChapterTime: 4.5,
        estimatedTimeRemaining: 31.5,
        sessionsUsed: 3,
        recentEvents: [],
        rateLimitStatus: {
          currentSessions: 3,
          maxSessions: 5,
          isLimited: false,
          resetsAt: null,
        },
      };

      progressTrackingService.getBookProgress.mockReturnValue(mockProgress);

      const [response1, response2, response3] = await Promise.all([
        request(app).get(`/api/generation/book/${bookId}/progress`),
        request(app).get(`/api/generation/book/${bookId}/progress`),
        request(app).get(`/api/generation/book/${bookId}/progress`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
      expect(progressTrackingService.getBookProgress).toHaveBeenCalledTimes(3);
    });
  });
});
