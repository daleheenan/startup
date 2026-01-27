import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock database connection - must be before imports
// We create the mocks inside the factory to avoid hoisting issues
const createDbMock = () => {
  const mockGet = jest.fn();
  const mockAll = jest.fn();
  const mockRun = jest.fn();
  const mockPrepare = jest.fn(() => ({
    get: mockGet,
    all: mockAll,
    run: mockRun,
  }));

  return {
    mockGet,
    mockAll,
    mockRun,
    mockPrepare,
    db: {
      prepare: mockPrepare,
    },
  };
};

const dbMock = createDbMock();

jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: dbMock.db,
}));

// Export mocks for tests to use
const mockGet = dbMock.mockGet;
const mockAll = dbMock.mockAll;
const mockRun = dbMock.mockRun;
const mockPrepare = dbMock.mockPrepare;

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock cache service
const mockInvalidate = jest.fn();
jest.mock('../../services/cache.service.js', () => ({
  cache: {
    invalidate: mockInvalidate,
  },
}));

// Mock chapter orchestrator service
const mockQueueChapterWorkflow = jest.fn();
const mockRegenerateChapter = jest.fn();
const mockGetChapterWorkflowStatus = jest.fn();

jest.mock('../../services/chapter-orchestrator.service.js', () => ({
  chapterOrchestratorService: {
    queueChapterWorkflow: mockQueueChapterWorkflow,
    regenerateChapter: mockRegenerateChapter,
    getChapterWorkflowStatus: mockGetChapterWorkflowStatus,
  },
}));

describe('Chapters Router', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear(); // Use clear instead of reset to keep implementation
    mockInvalidate.mockReset();
    mockQueueChapterWorkflow.mockReset();
    mockRegenerateChapter.mockReset();
    mockGetChapterWorkflowStatus.mockReset();

    // Setup Express app with route - import fresh each time
    app = express();
    app.use(express.json());

    const chaptersRouter = (await import('../chapters.js')).default;
    app.use('/api/chapters', chaptersRouter);
  });

  describe('GET /api/chapters/book/:bookId', () => {
    const mockChapters = [
      {
        id: 'chapter-1',
        book_id: 'book-123',
        chapter_number: 1,
        title: 'The Beginning',
        content: 'Chapter content',
        summary: 'Summary',
        status: 'complete',
        word_count: 1000,
        scene_cards: JSON.stringify([{ id: 1, title: 'Scene 1' }]),
        flags: JSON.stringify(['reviewed']),
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'chapter-2',
        book_id: 'book-123',
        chapter_number: 2,
        title: 'The Journey',
        content: null,
        summary: null,
        status: 'pending',
        word_count: 0,
        scene_cards: null,
        flags: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    it('should return all chapters for a book ordered by chapter number', async () => {
      mockAll.mockReturnValue(mockChapters);

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(200);

      expect(response.body).toHaveProperty('chapters');
      expect(response.body.chapters).toHaveLength(2);
      expect(response.body.chapters[0].chapter_number).toBe(1);
      expect(response.body.chapters[1].chapter_number).toBe(2);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should parse JSON fields correctly', async () => {
      mockAll.mockReturnValue([mockChapters[0]]);

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(200);

      expect(response.body.chapters[0].scene_cards).toEqual([{ id: 1, title: 'Scene 1' }]);
      expect(response.body.chapters[0].flags).toEqual(['reviewed']);
    });

    it('should handle null JSON fields', async () => {
      mockAll.mockReturnValue([mockChapters[1]]);

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(200);

      expect(response.body.chapters[0].scene_cards).toEqual([]);
      expect(response.body.chapters[0].flags).toEqual([]);
    });

    it('should return empty array if no chapters exist', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(200);

      expect(response.body.chapters).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidChapter = {
        ...mockChapters[0],
        scene_cards: '{invalid-json}',
        flags: 'not-json',
      };

      mockAll.mockReturnValue([invalidChapter]);

      const response = await request(app)
        .get('/api/chapters/book/book-123')
        .expect(200);

      // Should fall back to empty arrays for invalid JSON
      expect(response.body.chapters[0].scene_cards).toEqual([]);
      expect(response.body.chapters[0].flags).toEqual([]);
    });
  });

  describe('GET /api/chapters/:id', () => {
    const mockChapter = {
      id: 'chapter-1',
      book_id: 'book-123',
      chapter_number: 1,
      title: 'The Beginning',
      content: 'Chapter content',
      summary: 'Summary',
      status: 'complete',
      word_count: 1000,
      scene_cards: JSON.stringify([{ id: 1, title: 'Scene 1' }]),
      flags: JSON.stringify(['reviewed']),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };

    it('should return a specific chapter by ID', async () => {
      mockGet.mockReturnValue(mockChapter);

      const response = await request(app)
        .get('/api/chapters/chapter-1')
        .expect(200);

      expect(response.body.id).toBe('chapter-1');
      expect(response.body.title).toBe('The Beginning');
      expect(response.body.chapter_number).toBe(1);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should parse JSON fields correctly', async () => {
      mockGet.mockReturnValue(mockChapter);

      const response = await request(app)
        .get('/api/chapters/chapter-1')
        .expect(200);

      expect(response.body.scene_cards).toEqual([{ id: 1, title: 'Scene 1' }]);
      expect(response.body.flags).toEqual(['reviewed']);
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/chapters/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Chapter');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/chapters/chapter-1')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('POST /api/chapters', () => {
    const validChapterData = {
      bookId: '550e8400-e29b-41d4-a716-446655440000',
      chapterNumber: 1,
      title: 'Chapter One',
      sceneCards: [{ id: 1, title: 'Opening scene' }],
    };

    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
    });

    it('should create a new chapter with valid data', async () => {
      const response = await request(app)
        .post('/api/chapters')
        .send(validChapterData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.book_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.chapter_number).toBe(1);
      expect(response.body.title).toBe('Chapter One');
      expect(response.body.status).toBe('pending');
      expect(response.body.word_count).toBe(0);
      expect(response.body.scene_cards).toEqual([{ id: 1, title: 'Opening scene' }]);
      expect(response.body.flags).toEqual([]);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should create chapter without optional fields', async () => {
      const minimalData = {
        bookId: '550e8400-e29b-41d4-a716-446655440000',
        chapterNumber: 1,
      };

      const response = await request(app)
        .post('/api/chapters')
        .send(minimalData)
        .expect(201);

      expect(response.body.title).toBeNull();
      expect(response.body.scene_cards).toEqual([]);
    });

    it('should return 400 if bookId is missing', async () => {
      const invalidData = {
        chapterNumber: 1,
        title: 'Chapter One',
      };

      const response = await request(app)
        .post('/api/chapters')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if chapterNumber is missing', async () => {
      const invalidData = {
        bookId: 'book-123',
        title: 'Chapter One',
      };

      const response = await request(app)
        .post('/api/chapters')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if chapterNumber is not positive', async () => {
      const invalidData = {
        bookId: 'book-123',
        chapterNumber: 0,
      };

      const response = await request(app)
        .post('/api/chapters')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if bookId is not a valid UUID', async () => {
      const invalidData = {
        bookId: 'invalid-uuid',
        chapterNumber: 1,
      };

      const response = await request(app)
        .post('/api/chapters')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/chapters')
        .send(validChapterData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('PUT /api/chapters/:id', () => {
    beforeEach(() => {
      mockRun.mockReturnValue({ changes: 1 });
      mockGet.mockReturnValue({ project_id: 'project-123' });
    });

    it('should update chapter title', async () => {
      const updateData = { title: 'New Title' };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should update chapter content and calculate word count', async () => {
      const updateData = {
        content: 'This is a test chapter with ten words total here.',
      };

      await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      // Verify the SQL update was called
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should handle empty content correctly', async () => {
      const updateData = { content: '' };

      await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should handle whitespace-only content', async () => {
      const updateData = { content: '   \n\t   ' };

      await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should update chapter status', async () => {
      const updateData = { status: 'complete' };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update scene cards', async () => {
      const updateData = {
        sceneCards: [
          { id: 1, title: 'Scene 1' },
          { id: 2, title: 'Scene 2' },
        ],
      };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update flags', async () => {
      const updateData = {
        flags: ['reviewed', 'edited', 'proofread'],
      };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update summary', async () => {
      const updateData = { summary: 'This chapter introduces the protagonist.' };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'New content',
        status: 'editing',
        summary: 'New summary',
      };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should invalidate series bible cache after update', async () => {
      const updateData = { title: 'New Title' };

      await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(200);

      expect(mockInvalidate).toHaveBeenCalledWith('series-bible:project-123');
    });

    it('should not invalidate cache if chapter not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const updateData = { title: 'New Title' };

      await request(app)
        .put('/api/chapters/nonexistent')
        .send(updateData)
        .expect(404);

      expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('should return 404 if chapter not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const updateData = { title: 'New Title' };

      const response = await request(app)
        .put('/api/chapters/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Chapter');
    });

    it('should return 400 for invalid status', async () => {
      const updateData = { status: 'invalid-status' };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database error');
      });

      const updateData = { title: 'New Title' };

      const response = await request(app)
        .put('/api/chapters/chapter-1')
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('DELETE /api/chapters/:id', () => {
    it('should delete a chapter successfully', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .delete('/api/chapters/chapter-1')
        .expect(204);

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should return 404 if chapter not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/chapters/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Chapter');
    });

    it('should handle database errors', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/chapters/chapter-1')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('POST /api/chapters/:id/regenerate', () => {
    const mockJobIds = {
      generateJobId: 'job-1',
      devEditJobId: 'job-2',
      lineEditJobId: 'job-3',
      continuityJobId: 'job-4',
      copyEditJobId: 'job-5',
      proofreadJobId: 'job-6',
      sensitivityJobId: 'job-7',
      researchJobId: 'job-8',
      betaReaderJobId: 'job-9',
      openingJobId: 'job-10',
      dialogueJobId: 'job-11',
      hookJobId: 'job-12',
      summaryJobId: 'job-13',
      statesJobId: 'job-14',
    };

    it('should regenerate a chapter successfully', async () => {
      mockRegenerateChapter.mockReturnValue(mockJobIds);

      const response = await request(app)
        .post('/api/chapters/chapter-1/regenerate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('queued for regeneration');
      expect(response.body.jobs).toEqual(mockJobIds);
      expect(mockRegenerateChapter).toHaveBeenCalledWith('chapter-1');
    });

    it('should handle orchestrator errors', async () => {
      mockRegenerateChapter.mockImplementation(() => {
        throw new Error('Orchestrator error');
      });

      const response = await request(app)
        .post('/api/chapters/chapter-1/regenerate')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('GET /api/chapters/:id/workflow-status', () => {
    const mockWorkflowStatus = {
      chapterStatus: 'writing',
      jobs: [
        {
          type: 'generate_chapter',
          status: 'completed',
          error: null,
        },
        {
          type: 'dev_edit',
          status: 'in_progress',
          error: null,
        },
        {
          type: 'line_edit',
          status: 'pending',
          error: null,
        },
      ],
    };

    it('should return workflow status for a chapter', async () => {
      mockGetChapterWorkflowStatus.mockReturnValue(mockWorkflowStatus);

      const response = await request(app)
        .get('/api/chapters/chapter-1/workflow-status')
        .expect(200);

      expect(response.body.chapterStatus).toBe('writing');
      expect(response.body.jobs).toHaveLength(3);
      expect(response.body.jobs[0].type).toBe('generate_chapter');
      expect(response.body.jobs[0].status).toBe('completed');
      expect(mockGetChapterWorkflowStatus).toHaveBeenCalledWith('chapter-1');
    });

    it('should handle workflow with errors', async () => {
      const statusWithError = {
        chapterStatus: 'writing',
        jobs: [
          {
            type: 'generate_chapter',
            status: 'failed',
            error: 'Generation failed: AI service error',
          },
        ],
      };

      mockGetChapterWorkflowStatus.mockReturnValue(statusWithError);

      const response = await request(app)
        .get('/api/chapters/chapter-1/workflow-status')
        .expect(200);

      expect(response.body.jobs[0].status).toBe('failed');
      expect(response.body.jobs[0].error).toBeTruthy();
    });

    it('should handle chapter not found error', async () => {
      mockGetChapterWorkflowStatus.mockImplementation(() => {
        throw new Error('Chapter not found: chapter-1');
      });

      const response = await request(app)
        .get('/api/chapters/nonexistent/workflow-status')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });

    it('should handle database errors', async () => {
      mockGetChapterWorkflowStatus.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/chapters/chapter-1/workflow-status')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('Integration: Full Chapter Lifecycle', () => {
    it('should handle complete chapter lifecycle: create, update, regenerate, delete', async () => {
      // Create
      mockRun.mockReturnValue({ changes: 1 });
      const createResponse = await request(app)
        .post('/api/chapters')
        .send({
          bookId: '550e8400-e29b-41d4-a716-446655440000',
          chapterNumber: 1,
          title: 'Test Chapter',
        })
        .expect(201);

      const chapterId = createResponse.body.id;
      expect(chapterId).toBeTruthy();

      // Update
      mockGet.mockReturnValue({ project_id: 'project-123' });
      await request(app)
        .put(`/api/chapters/${chapterId}`)
        .send({
          content: 'Updated content',
          status: 'writing',
        })
        .expect(200);

      // Regenerate
      mockRegenerateChapter.mockReturnValue({
        generateJobId: 'job-1',
        devEditJobId: 'job-2',
        lineEditJobId: 'job-3',
        continuityJobId: 'job-4',
        copyEditJobId: 'job-5',
        proofreadJobId: 'job-6',
        sensitivityJobId: 'job-7',
        researchJobId: 'job-8',
        betaReaderJobId: 'job-9',
        openingJobId: 'job-10',
        dialogueJobId: 'job-11',
        hookJobId: 'job-12',
        summaryJobId: 'job-13',
        statesJobId: 'job-14',
      });

      await request(app)
        .post(`/api/chapters/${chapterId}/regenerate`)
        .expect(200);

      // Delete
      await request(app)
        .delete(`/api/chapters/${chapterId}`)
        .expect(204);
    });
  });
});
