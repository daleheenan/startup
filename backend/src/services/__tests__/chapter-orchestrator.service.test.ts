import { jest } from '@jest/globals';
import { ChapterOrchestratorService } from '../chapter-orchestrator.service.js';

jest.mock('../../db/connection.js');
jest.mock('../../queue/worker.js');

describe('ChapterOrchestratorService', () => {
  let service: ChapterOrchestratorService;
  let mockDb: any;
  let mockQueueWorker: any;

  beforeEach(async () => {
    const dbModule = await import('../../db/connection.js');
    const queueModule = await import('../../queue/worker.js');

    mockDb = dbModule.default;
    mockQueueWorker = queueModule.QueueWorker;

    service = new ChapterOrchestratorService();
    jest.clearAllMocks();
  });

  describe('queueBookGeneration', () => {
    it('should queue all pending chapters for a book', () => {
      const mockChapters = [
        { id: 'chapter-1', chapter_number: 1 },
        { id: 'chapter-2', chapter_number: 2 },
        { id: 'chapter-3', chapter_number: 3 },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      // First prepare() call - get chapters
      const getChaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };
      mockPrepare.mockReturnValueOnce(getChaptersStmt);

      // For each chapter, queueChapterWorkflow makes 2 prepare() calls
      // Chapter 1: chapter lookup + project lookup
      const chapterStmt1 = { get: jest.fn().mockReturnValue({ book_id: 'book-1' }) };
      const projectStmt1 = { get: jest.fn().mockReturnValue({ generation_mode: 'publication', selected_agents: null }) };
      mockPrepare.mockReturnValueOnce(chapterStmt1).mockReturnValueOnce(projectStmt1);

      // Chapter 2: chapter lookup + project lookup
      const chapterStmt2 = { get: jest.fn().mockReturnValue({ book_id: 'book-1' }) };
      const projectStmt2 = { get: jest.fn().mockReturnValue({ generation_mode: 'publication', selected_agents: null }) };
      mockPrepare.mockReturnValueOnce(chapterStmt2).mockReturnValueOnce(projectStmt2);

      // Chapter 3: chapter lookup + project lookup
      const chapterStmt3 = { get: jest.fn().mockReturnValue({ book_id: 'book-1' }) };
      const projectStmt3 = { get: jest.fn().mockReturnValue({ generation_mode: 'publication', selected_agents: null }) };
      mockPrepare.mockReturnValueOnce(chapterStmt3).mockReturnValueOnce(projectStmt3);

      mockQueueWorker.createJob = jest.fn().mockReturnValue('job-123');

      const result = service.queueBookGeneration('book-1');

      expect(result.chaptersQueued).toBe(3);
      expect(result.jobsCreated).toBe(42); // 3 chapters × 14 jobs each
      expect(mockQueueWorker.createJob).toHaveBeenCalledTimes(42);
    });

    it('should return zeros when no pending chapters', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const getChaptersStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(getChaptersStmt);

      const result = service.queueBookGeneration('book-1');

      expect(result.chaptersQueued).toBe(0);
      expect(result.jobsCreated).toBe(0);
    });
  });

  describe('queueChapterWorkflow', () => {
    it('should queue complete workflow for a chapter', () => {
      // Mock database prepare calls
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      // First prepare() call - chapter lookup
      const chapterStmt = { get: jest.fn().mockReturnValue({ book_id: 'book-1' }) };
      mockPrepare.mockReturnValueOnce(chapterStmt);

      // Second prepare() call - project lookup
      const projectStmt = { get: jest.fn().mockReturnValue({ generation_mode: 'publication', selected_agents: null }) };
      mockPrepare.mockReturnValueOnce(projectStmt);

      let jobIdCounter = 1;
      mockQueueWorker.createJob = jest.fn().mockImplementation(() => {
        return `job-${jobIdCounter++}`;
      });

      const result = service.queueChapterWorkflow('chapter-1');

      expect(result).toEqual({
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

      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(1, 'generate_chapter', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(2, 'dev_edit', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(3, 'line_edit', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(4, 'continuity_check', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(5, 'copy_edit', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(6, 'proofread', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(7, 'sensitivity_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(8, 'research_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(9, 'beta_reader_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(10, 'opening_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(11, 'dialogue_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(12, 'hook_review', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(13, 'generate_summary', 'chapter-1');
      expect(mockQueueWorker.createJob).toHaveBeenNthCalledWith(14, 'update_states', 'chapter-1');
    });
  });

  describe('regenerateChapter', () => {
    it('should reset chapter and queue workflow', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      // First prepare() call - reset chapter
      const resetStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(resetStmt);

      // Second prepare() call (from queueChapterWorkflow) - chapter lookup
      const chapterStmt = { get: jest.fn().mockReturnValue({ book_id: 'book-1' }) };
      mockPrepare.mockReturnValueOnce(chapterStmt);

      // Third prepare() call (from queueChapterWorkflow) - project lookup
      const projectStmt = { get: jest.fn().mockReturnValue({ generation_mode: 'publication', selected_agents: null }) };
      mockPrepare.mockReturnValueOnce(projectStmt);

      mockQueueWorker.createJob = jest.fn().mockReturnValue('job-123');

      const result = service.regenerateChapter('chapter-1');

      expect(resetStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'chapter-1'
      );

      expect(result).toHaveProperty('generateJobId');
      expect(result).toHaveProperty('summaryJobId');
      expect(result).toHaveProperty('statesJobId');
    });
  });

  describe('getChapterWorkflowStatus', () => {
    it('should return chapter status and jobs', () => {
      const mockChapter = { status: 'generating' };
      const mockJobs = [
        { type: 'generate_chapter', status: 'completed', error: null },
        { type: 'dev_edit', status: 'processing', error: null },
        { type: 'line_edit', status: 'pending', error: null },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const jobsStmt = { all: jest.fn().mockReturnValue(mockJobs) };

      mockPrepare
        .mockReturnValueOnce(chapterStmt)
        .mockReturnValueOnce(jobsStmt);

      const result = service.getChapterWorkflowStatus('chapter-1');

      expect(result.chapterStatus).toBe('generating');
      expect(result.jobs).toHaveLength(3);
      expect(result.jobs[0].type).toBe('generate_chapter');
    });

    it('should throw error if chapter not found', () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const chapterStmt = { get: jest.fn().mockReturnValue(null) };
      mockPrepare.mockReturnValueOnce(chapterStmt);

      expect(() => service.getChapterWorkflowStatus('nonexistent')).toThrow(
        'Chapter not found: nonexistent'
      );
    });
  });
});
