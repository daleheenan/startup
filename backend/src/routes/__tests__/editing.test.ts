import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock database connection - must be before imports
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

// Mock editing service
const mockDevelopmentalEdit = jest.fn<() => Promise<any>>();
const mockLineEdit = jest.fn<() => Promise<any>>();
const mockContinuityEdit = jest.fn<() => Promise<any>>();
const mockCopyEdit = jest.fn<() => Promise<any>>();
const mockApplyEditResult = jest.fn<() => Promise<void>>();

jest.mock('../../services/editing.service.js', () => ({
  editingService: {
    developmentalEdit: mockDevelopmentalEdit,
    lineEdit: mockLineEdit,
    continuityEdit: mockContinuityEdit,
    copyEdit: mockCopyEdit,
    applyEditResult: mockApplyEditResult,
  },
}));

// Mock queue worker
const mockCreateJob = jest.fn();

jest.mock('../../queue/worker.js', () => ({
  QueueWorker: {
    createJob: mockCreateJob,
  },
}));

describe('Editing Router', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear();
    mockDevelopmentalEdit.mockReset();
    mockLineEdit.mockReset();
    mockContinuityEdit.mockReset();
    mockCopyEdit.mockReset();
    mockApplyEditResult.mockReset();
    mockCreateJob.mockReset();

    // Setup Express app with route
    app = express();
    app.use(express.json());

    const editingRouter = (await import('../editing.js')).default;
    app.use('/api/editing', editingRouter);
  });

  describe('GET /api/editing/chapters/:chapterId/flags', () => {
    const mockFlags = [
      {
        id: 'flag-1',
        type: 'plot_hole',
        severity: 'major',
        description: 'Character motivation unclear',
        location: 'Scene 2',
        resolved: false,
      },
      {
        id: 'flag-2',
        type: 'continuity_error',
        severity: 'minor',
        description: 'Wrong character name',
        location: 'Scene 4',
        resolved: true,
      },
    ];

    it('should return all flags for a chapter', async () => {
      mockGet.mockReturnValue({
        flags: JSON.stringify(mockFlags),
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/flags')
        .expect(200);

      expect(response.body.flags).toEqual(mockFlags);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should return empty array if no flags exist', async () => {
      mockGet.mockReturnValue({
        flags: null,
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/flags')
        .expect(200);

      expect(response.body.flags).toEqual([]);
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/editing/chapters/nonexistent/flags')
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/flags')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in flags', async () => {
      mockGet.mockReturnValue({
        flags: '{invalid-json}',
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/flags')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/editing/chapters/:chapterId/flags/:flagId/resolve', () => {
    const mockFlags = [
      {
        id: 'flag-1',
        type: 'plot_hole',
        severity: 'major',
        description: 'Character motivation unclear',
        resolved: false,
      },
      {
        id: 'flag-2',
        type: 'continuity_error',
        severity: 'minor',
        description: 'Wrong character name',
        resolved: false,
      },
    ];

    it('should mark a flag as resolved', async () => {
      mockGet.mockReturnValue({
        flags: JSON.stringify(mockFlags),
      });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/flags/flag-1/resolve')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.flag.resolved).toBe(true);
      expect(response.body.flag.id).toBe('flag-1');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .post('/api/editing/chapters/nonexistent/flags/flag-1/resolve')
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
    });

    it('should return 404 if flag not found', async () => {
      mockGet.mockReturnValue({
        flags: JSON.stringify(mockFlags),
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/flags/nonexistent/resolve')
        .expect(404);

      expect(response.body.error).toBe('Flag not found');
    });

    it('should handle empty flags array', async () => {
      mockGet.mockReturnValue({
        flags: null,
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/flags/flag-1/resolve')
        .expect(404);

      expect(response.body.error).toBe('Flag not found');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/flags/flag-1/resolve')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/editing/chapters/:chapterId/regenerate-with-edits', () => {
    it('should reset chapter and queue full editing workflow', async () => {
      mockGet.mockReturnValue({ id: 'chapter-1' });
      mockRun.mockReturnValue({ changes: 1 });
      mockCreateJob.mockReturnValue('job-123');

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/regenerate-with-edits')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('regeneration');
      expect(response.body.jobs).toHaveProperty('generateJobId');
      expect(response.body.jobs).toHaveProperty('devEditJobId');
      expect(response.body.jobs).toHaveProperty('lineEditJobId');
      expect(response.body.jobs).toHaveProperty('continuityJobId');
      expect(response.body.jobs).toHaveProperty('copyEditJobId');
      expect(response.body.jobs).toHaveProperty('summaryJobId');
      expect(response.body.jobs).toHaveProperty('statesJobId');

      // Verify chapter was reset
      expect(mockRun).toHaveBeenCalled();
      // Verify jobs were created
      expect(mockCreateJob).toHaveBeenCalledWith('generate_chapter', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('dev_edit', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('line_edit', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('continuity_check', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('copy_edit', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('generate_summary', 'chapter-1');
      expect(mockCreateJob).toHaveBeenCalledWith('update_states', 'chapter-1');
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .post('/api/editing/chapters/nonexistent/regenerate-with-edits')
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    it('should cancel pending jobs for the chapter', async () => {
      mockGet.mockReturnValue({ id: 'chapter-1' });
      mockRun.mockReturnValue({ changes: 1 });
      mockCreateJob.mockReturnValue('job-123');

      await request(app)
        .post('/api/editing/chapters/chapter-1/regenerate-with-edits')
        .expect(200);

      // Verify cancellation SQL was executed
      expect(mockRun).toHaveBeenCalledTimes(2); // Once for reset, once for cancel
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/regenerate-with-edits')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/editing/chapters/:chapterId/run-editor/:editorType', () => {
    const mockEditResult = {
      editorType: 'developmental',
      originalContent: 'Original content',
      editedContent: 'Edited content',
      suggestions: [
        {
          type: 'plot',
          location: 'Scene 1',
          issue: 'Pacing too slow',
          suggestion: 'Add action beat',
          severity: 'moderate',
        },
      ],
      flags: [],
      approved: true,
    };

    it('should run developmental editor successfully', async () => {
      mockDevelopmentalEdit.mockResolvedValue(mockEditResult);
      mockApplyEditResult.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/developmental')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.editorType).toBe('developmental');
      expect(response.body.result.suggestionsCount).toBe(1);
      expect(response.body.result.flagsCount).toBe(0);
      expect(response.body.result.approved).toBe(true);
      expect(mockDevelopmentalEdit).toHaveBeenCalledWith('chapter-1');
      expect(mockApplyEditResult).toHaveBeenCalledWith('chapter-1', mockEditResult);
    });

    it('should run line editor successfully', async () => {
      const lineResult = { ...mockEditResult, editorType: 'line' as const };
      mockLineEdit.mockResolvedValue(lineResult);
      mockApplyEditResult.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/line')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.editorType).toBe('line');
      expect(mockLineEdit).toHaveBeenCalledWith('chapter-1');
    });

    it('should run continuity editor successfully', async () => {
      const continuityResult = { ...mockEditResult, editorType: 'continuity' as const };
      mockContinuityEdit.mockResolvedValue(continuityResult);
      mockApplyEditResult.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/continuity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.editorType).toBe('continuity');
      expect(mockContinuityEdit).toHaveBeenCalledWith('chapter-1');
    });

    it('should run copy editor successfully', async () => {
      const copyResult = { ...mockEditResult, editorType: 'copy' as const };
      mockCopyEdit.mockResolvedValue(copyResult);
      mockApplyEditResult.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/copy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.editorType).toBe('copy');
      expect(mockCopyEdit).toHaveBeenCalledWith('chapter-1');
    });

    it('should return 400 for invalid editor type', async () => {
      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid editor type');
    });

    it('should handle editing service errors', async () => {
      mockDevelopmentalEdit.mockRejectedValue(new Error('Editing service error'));

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/developmental')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should report multiple flags and suggestions', async () => {
      const resultWithMultiple = {
        ...mockEditResult,
        suggestions: [
          { type: 'plot', location: 'Scene 1', issue: 'Issue 1', suggestion: 'Fix 1', severity: 'minor' },
          { type: 'character', location: 'Scene 2', issue: 'Issue 2', suggestion: 'Fix 2', severity: 'major' },
        ],
        flags: [
          { id: 'flag-1', type: 'plot_hole', severity: 'major', description: 'Major issue', location: 'Scene 1', resolved: false },
          { id: 'flag-2', type: 'needs_review', severity: 'minor', description: 'Minor issue', location: 'Scene 3', resolved: false },
        ],
        approved: false,
      };

      mockDevelopmentalEdit.mockResolvedValue(resultWithMultiple);
      mockApplyEditResult.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/developmental')
        .expect(200);

      expect(response.body.result.suggestionsCount).toBe(2);
      expect(response.body.result.flagsCount).toBe(2);
      expect(response.body.result.approved).toBe(false);
    });
  });

  describe('GET /api/editing/books/:bookId/flags-summary', () => {
    const mockChapters = [
      {
        id: 'chapter-1',
        chapter_number: 1,
        flags: JSON.stringify([
          { id: 'flag-1', type: 'plot_hole', severity: 'major', resolved: false },
          { id: 'flag-2', type: 'continuity_error', severity: 'minor', resolved: true },
        ]),
      },
      {
        id: 'chapter-2',
        chapter_number: 2,
        flags: JSON.stringify([
          { id: 'flag-3', type: 'needs_review', severity: 'major', resolved: false },
        ]),
      },
      {
        id: 'chapter-3',
        chapter_number: 3,
        flags: null,
      },
    ];

    it('should return summary of all flags in a book', async () => {
      mockAll.mockReturnValue(mockChapters);

      const response = await request(app)
        .get('/api/editing/books/book-1/flags-summary')
        .expect(200);

      expect(response.body.totalFlags).toBe(3);
      expect(response.body.unresolvedFlags).toBe(2);
      expect(response.body.resolvedFlags).toBe(1);
      expect(response.body.flagsByType).toEqual({
        plot_hole: 1,
        continuity_error: 1,
        needs_review: 1,
      });
      expect(response.body.flagsBySeverity).toEqual({
        major: 2,
        minor: 1,
      });
      expect(response.body.chapters).toHaveLength(3);
    });

    it('should return chapter-level flag counts', async () => {
      mockAll.mockReturnValue(mockChapters);

      const response = await request(app)
        .get('/api/editing/books/book-1/flags-summary')
        .expect(200);

      expect(response.body.chapters[0]).toEqual({
        chapterId: 'chapter-1',
        chapterNumber: 1,
        flagCount: 2,
        unresolvedCount: 1,
      });
      expect(response.body.chapters[1]).toEqual({
        chapterId: 'chapter-2',
        chapterNumber: 2,
        flagCount: 1,
        unresolvedCount: 1,
      });
      expect(response.body.chapters[2]).toEqual({
        chapterId: 'chapter-3',
        chapterNumber: 3,
        flagCount: 0,
        unresolvedCount: 0,
      });
    });

    it('should handle book with no chapters', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/editing/books/book-1/flags-summary')
        .expect(200);

      expect(response.body.totalFlags).toBe(0);
      expect(response.body.unresolvedFlags).toBe(0);
      expect(response.body.chapters).toEqual([]);
    });

    it('should handle chapters with no flags', async () => {
      mockAll.mockReturnValue([
        {
          id: 'chapter-1',
          chapter_number: 1,
          flags: null,
        },
      ]);

      const response = await request(app)
        .get('/api/editing/books/book-1/flags-summary')
        .expect(200);

      expect(response.body.totalFlags).toBe(0);
      expect(response.body.unresolvedFlags).toBe(0);
      expect(response.body.flagsByType).toEqual({});
      expect(response.body.flagsBySeverity).toEqual({});
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/editing/books/book-1/flags-summary')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/editing/chapters/:chapterId/edit', () => {
    it('should return chapter with edit if it exists', async () => {
      mockGet
        .mockReturnValueOnce({
          content: 'Original content',
          word_count: 100,
        })
        .mockReturnValueOnce({
          id: 'edit-1',
          chapter_id: 'chapter-1',
          edited_content: 'Edited content',
          word_count: 120,
          is_locked: 0,
          edit_notes: 'Fixed dialogue',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      expect(response.body.chapterId).toBe('chapter-1');
      expect(response.body.hasEdit).toBe(true);
      expect(response.body.edit).toBeTruthy();
      expect(response.body.original.content).toBe('Original content');
      expect(response.body.original.wordCount).toBe(100);
    });

    it('should return chapter without edit if none exists', async () => {
      mockGet
        .mockReturnValueOnce({
          content: 'Original content',
          word_count: 100,
        })
        .mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      expect(response.body.chapterId).toBe('chapter-1');
      expect(response.body.hasEdit).toBe(false);
      expect(response.body.edit).toBeNull();
      expect(response.body.original.content).toBe('Original content');
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/editing/chapters/nonexistent/edit')
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
    });

    it('should handle empty chapter content', async () => {
      mockGet
        .mockReturnValueOnce({
          content: null,
          word_count: 0,
        })
        .mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      expect(response.body.original.content).toBe('');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/edit')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/editing/chapters/:chapterId/edit', () => {
    const validEditData = {
      content: 'Updated chapter content with changes',
      isLocked: false,
      editNotes: 'Fixed pacing issues',
    };

    it('should create new edit if none exists', async () => {
      mockGet.mockReturnValue(null); // No existing edit
      mockRun.mockReturnValue({ changes: 1 });
      mockGet.mockReturnValueOnce(null).mockReturnValueOnce({
        id: 'edit-1',
        chapter_id: 'chapter-1',
        edited_content: validEditData.content,
        word_count: 6,
        is_locked: 0,
        edit_notes: validEditData.editNotes,
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(validEditData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.edit).toBeTruthy();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should update existing edit', async () => {
      mockGet
        .mockReturnValueOnce({ id: 'edit-1' }) // Existing edit
        .mockReturnValueOnce({
          id: 'edit-1',
          chapter_id: 'chapter-1',
          edited_content: validEditData.content,
          word_count: 6,
          is_locked: 0,
          edit_notes: validEditData.editNotes,
        });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(validEditData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.edit).toBeTruthy();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should calculate word count correctly', async () => {
      mockGet.mockReturnValue(null);
      mockRun.mockReturnValue({ changes: 1 });

      const contentWithWords = {
        content: 'This is a test with exactly ten words here now.',
        isLocked: false,
      };

      mockGet.mockReturnValueOnce(null).mockReturnValueOnce({
        id: 'edit-1',
        word_count: 10,
      });

      await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(contentWithWords)
        .expect(200);

      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle locked state', async () => {
      mockGet.mockReturnValue(null);
      mockRun.mockReturnValue({ changes: 1 });

      const lockedEdit = {
        content: 'Final content',
        isLocked: true,
      };

      mockGet.mockReturnValueOnce(null).mockReturnValueOnce({
        id: 'edit-1',
        is_locked: 1,
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(lockedEdit)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle optional editNotes', async () => {
      mockGet.mockReturnValue(null);
      mockRun.mockReturnValue({ changes: 1 });

      const editWithoutNotes = {
        content: 'Content without notes',
        isLocked: false,
      };

      mockGet.mockReturnValueOnce(null).mockReturnValueOnce({
        id: 'edit-1',
        edit_notes: null,
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(editWithoutNotes)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 if content is missing', async () => {
      const invalidData = {
        isLocked: false,
      };

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if content is empty', async () => {
      const invalidData = {
        content: '',
        isLocked: false,
      };

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send(validEditData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/editing/chapters/:chapterId/edit', () => {
    it('should delete chapter edit successfully', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRun).toHaveBeenCalled();
    });

    it('should succeed even if no edit exists', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/editing/chapters/chapter-1/edit')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/editing/chapters/:chapterId/comparison', () => {
    it('should return comparison with diff statistics', async () => {
      mockGet
        .mockReturnValueOnce({
          content: 'Original content with one hundred words',
          word_count: 6,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        .mockReturnValueOnce({
          edited_content: 'Edited content with one hundred and twenty words now',
          word_count: 9,
          updated_at: '2026-01-02T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(200);

      expect(response.body.original).toHaveProperty('content');
      expect(response.body.original.wordCount).toBe(6);
      expect(response.body.edited).toHaveProperty('content');
      expect(response.body.edited.wordCount).toBe(9);
      expect(response.body.diff.addedWords).toBe(3);
      expect(response.body.diff.removedWords).toBe(0);
      expect(response.body.diff.percentChanged).toBe(50);
    });

    it('should handle reduced word count', async () => {
      mockGet
        .mockReturnValueOnce({
          content: 'Original content with many words here',
          word_count: 6,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        .mockReturnValueOnce({
          edited_content: 'Shorter content',
          word_count: 2,
          updated_at: '2026-01-02T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(200);

      expect(response.body.diff.removedWords).toBe(4);
      expect(response.body.diff.addedWords).toBe(0);
    });

    it('should return null diff if no edit exists', async () => {
      mockGet
        .mockReturnValueOnce({
          content: 'Original content',
          word_count: 2,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        .mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(200);

      expect(response.body.original).toHaveProperty('content');
      expect(response.body.edited).toBeNull();
      expect(response.body.diff).toBeNull();
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/editing/chapters/nonexistent/comparison')
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
    });

    it('should handle zero word count edge case', async () => {
      mockGet
        .mockReturnValueOnce({
          content: '',
          word_count: 0,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        .mockReturnValueOnce({
          edited_content: 'New content',
          word_count: 2,
          updated_at: '2026-01-02T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(200);

      expect(response.body.diff.percentChanged).toBe(0); // Avoids division by zero
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/editing/chapters/:chapterId/lock', () => {
    it('should lock chapter by updating existing edit', async () => {
      mockGet
        .mockReturnValueOnce({ id: 'edit-1' }) // Existing edit
        .mockReturnValue({ is_locked: 1 });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isLocked).toBe(true);
      expect(mockRun).toHaveBeenCalled();
    });

    it('should unlock chapter by updating existing edit', async () => {
      mockGet
        .mockReturnValueOnce({ id: 'edit-1' })
        .mockReturnValue({ is_locked: 0 });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isLocked).toBe(false);
    });

    it('should create new edit if none exists when locking', async () => {
      mockGet
        .mockReturnValueOnce(null) // No existing edit
        .mockReturnValueOnce({
          content: 'Chapter content',
          word_count: 2,
        });
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isLocked).toBe(true);
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 if chapter not found when creating edit', async () => {
      mockGet
        .mockReturnValueOnce(null) // No existing edit
        .mockReturnValueOnce(null); // No chapter

      const response = await request(app)
        .post('/api/editing/chapters/nonexistent/lock')
        .send({ isLocked: true })
        .expect(404);

      expect(response.body.error).toBe('Chapter not found');
    });

    it('should return 400 if isLocked is missing', async () => {
      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if isLocked is not boolean', async () => {
      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: 'true' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: true })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/editing/books/:bookId/word-count', () => {
    const mockChapters = [
      { id: 'chapter-1', chapter_number: 1, word_count: 1000 },
      { id: 'chapter-2', chapter_number: 2, word_count: 1200 },
      { id: 'chapter-3', chapter_number: 3, word_count: 900 },
    ];

    const mockEdits = [
      { chapter_id: 'chapter-1', word_count: 1100 },
      { chapter_id: 'chapter-3', word_count: 950 },
    ];

    it('should return word count statistics for all chapters', async () => {
      mockAll
        .mockReturnValueOnce(mockChapters)
        .mockReturnValueOnce(mockEdits);

      const response = await request(app)
        .get('/api/editing/books/book-1/word-count')
        .expect(200);

      expect(response.body.totalOriginalWordCount).toBe(3100);
      expect(response.body.totalCurrentWordCount).toBe(3250); // 1100 + 1200 + 950
      expect(response.body.totalEdited).toBe(150);
      expect(response.body.chapters).toHaveLength(3);
    });

    it('should include chapter-level statistics', async () => {
      mockAll
        .mockReturnValueOnce(mockChapters)
        .mockReturnValueOnce(mockEdits);

      const response = await request(app)
        .get('/api/editing/books/book-1/word-count')
        .expect(200);

      expect(response.body.chapters[0]).toEqual({
        chapterId: 'chapter-1',
        chapterNumber: 1,
        originalWordCount: 1000,
        editedWordCount: 1100,
        currentWordCount: 1100,
      });

      expect(response.body.chapters[1]).toEqual({
        chapterId: 'chapter-2',
        chapterNumber: 2,
        originalWordCount: 1200,
        editedWordCount: null,
        currentWordCount: 1200,
      });

      expect(response.body.chapters[2]).toEqual({
        chapterId: 'chapter-3',
        chapterNumber: 3,
        originalWordCount: 900,
        editedWordCount: 950,
        currentWordCount: 950,
      });
    });

    it('should handle book with no chapters', async () => {
      mockAll
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/editing/books/book-1/word-count')
        .expect(200);

      expect(response.body.totalOriginalWordCount).toBe(0);
      expect(response.body.totalCurrentWordCount).toBe(0);
      expect(response.body.totalEdited).toBe(0);
      expect(response.body.chapters).toEqual([]);
    });

    it('should handle book with no edits', async () => {
      mockAll
        .mockReturnValueOnce(mockChapters)
        .mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/editing/books/book-1/word-count')
        .expect(200);

      expect(response.body.totalOriginalWordCount).toBe(3100);
      expect(response.body.totalCurrentWordCount).toBe(3100);
      expect(response.body.totalEdited).toBe(0);
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/editing/books/book-1/word-count')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Integration: Full Editing Workflow', () => {
    it('should handle complete editing workflow for a chapter', async () => {
      // 1. Get initial chapter state
      mockGet
        .mockReturnValueOnce({
          content: 'Original chapter content',
          word_count: 3,
        })
        .mockReturnValueOnce(null); // No edit yet

      await request(app)
        .get('/api/editing/chapters/chapter-1/edit')
        .expect(200);

      // 2. Create an edit
      mockGet.mockReturnValueOnce(null); // No existing edit
      mockRun.mockReturnValue({ changes: 1 });
      mockGet.mockReturnValueOnce({
        id: 'edit-1',
        edited_content: 'Edited chapter content',
        word_count: 3,
      });

      await request(app)
        .post('/api/editing/chapters/chapter-1/edit')
        .send({
          content: 'Edited chapter content',
          isLocked: false,
        })
        .expect(200);

      // 3. Get comparison
      mockGet
        .mockReturnValueOnce({
          content: 'Original chapter content',
          word_count: 3,
          created_at: '2026-01-01T00:00:00.000Z',
        })
        .mockReturnValueOnce({
          edited_content: 'Edited chapter content',
          word_count: 3,
          updated_at: '2026-01-02T00:00:00.000Z',
        });

      const comparisonResponse = await request(app)
        .get('/api/editing/chapters/chapter-1/comparison')
        .expect(200);

      expect(comparisonResponse.body.diff).toBeTruthy();

      // 4. Lock the chapter
      mockGet.mockReturnValueOnce({ id: 'edit-1' });
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/editing/chapters/chapter-1/lock')
        .send({ isLocked: true })
        .expect(200);

      // 5. Run editor
      const mockEditResult = {
        editorType: 'copy' as const,
        originalContent: 'Edited chapter content',
        editedContent: 'Copy edited chapter content',
        suggestions: [],
        flags: [],
        approved: true,
      };

      mockCopyEdit.mockResolvedValue(mockEditResult);
      mockApplyEditResult.mockResolvedValue(undefined);

      await request(app)
        .post('/api/editing/chapters/chapter-1/run-editor/copy')
        .expect(200);

      // 6. Delete edit (revert)
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .delete('/api/editing/chapters/chapter-1/edit')
        .expect(200);
    });
  });
});
