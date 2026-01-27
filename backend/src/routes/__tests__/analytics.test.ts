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

// Mock AnalyticsService
const mockAnalyzeChapter = jest.fn();
const mockCalculateBookAnalytics = jest.fn();

jest.mock('../../services/analyticsService.js', () => ({
  AnalyticsService: {
    analyzeChapter: mockAnalyzeChapter,
    calculateBookAnalytics: mockCalculateBookAnalytics,
  },
}));

describe('Analytics Router', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Reset all mocks
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockPrepare.mockClear();
    mockAnalyzeChapter.mockReset();
    mockCalculateBookAnalytics.mockReset();

    // Re-configure mockPrepare to return statement methods
    mockPrepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Setup Express app with route - import fresh each time
    app = express();
    app.use(express.json());

    const analyticsRouter = (await import('../analytics.js')).default;
    app.use('/api/analytics', analyticsRouter);
  });

  describe('GET /api/analytics/chapter/:chapterId', () => {
    // Function to create fresh mock data to avoid mutation issues
    const createMockAnalytics = () => ({
      id: 'analytics-1',
      chapter_id: 'chapter-123',
      pacing_score: 75,
      pacing_data: JSON.stringify({
        scene_pacing: [
          { scene: 'Opening', pace: 'fast', word_count: 500 },
          { scene: 'Revelation', pace: 'slow', word_count: 800 },
        ],
      }),
      character_screen_time: JSON.stringify({
        'John Smith': { appearances: 15, word_count: 1200, pov_time: 1200 },
        'Jane Doe': { appearances: 8, word_count: 600, pov_time: 0 },
      }),
      dialogue_percentage: 42.5,
      dialogue_word_count: 500,
      narrative_word_count: 700,
      readability_score: 65.3,
      avg_sentence_length: 18.5,
      complex_word_percentage: 12.3,
      tension_score: 68,
      tension_arc: JSON.stringify({
        points: [
          { position: 10, tension: 50 },
          { position: 50, tension: 75 },
          { position: 90, tension: 85 },
        ],
      }),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    it('should return analytics for a specific chapter', async () => {
      mockGet.mockReturnValueOnce(createMockAnalytics());

      const response = await request(app)
        .get('/api/analytics/chapter/chapter-123')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.chapter_id).toBe('chapter-123');
      expect(response.body.analytics.pacing_score).toBe(75);
      expect(response.body.analytics.dialogue_percentage).toBe(42.5);
      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should parse JSON fields correctly', async () => {
      mockGet.mockReturnValueOnce(createMockAnalytics());

      const response = await request(app)
        .get('/api/analytics/chapter/chapter-123')
        .expect(200);

      expect(response.body.analytics.pacing_data).toEqual({
        scene_pacing: [
          { scene: 'Opening', pace: 'fast', word_count: 500 },
          { scene: 'Revelation', pace: 'slow', word_count: 800 },
        ],
      });

      expect(response.body.analytics.character_screen_time).toEqual({
        'John Smith': { appearances: 15, word_count: 1200, pov_time: 1200 },
        'Jane Doe': { appearances: 8, word_count: 600, pov_time: 0 },
      });

      expect(response.body.analytics.tension_arc).toEqual({
        points: [
          { position: 10, tension: 50 },
          { position: 50, tension: 75 },
          { position: 90, tension: 85 },
        ],
      });
    });

    it('should return 404 if analytics not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/analytics/chapter/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Analytics');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/analytics/chapter/chapter-123')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBeTruthy();
    });
  });

  describe('POST /api/analytics/chapter/:chapterId/analyze', () => {
    const createMockChapter = () => ({
      id: 'chapter-123',
      content: 'This is chapter content with "dialogue" and narrative text.',
      scene_cards: JSON.stringify([
        { goal: 'Opening scene', characters: ['John'], povCharacter: 'John' },
      ]),
    });

    const createMockAnalyticsResult = () => ({
      chapter_id: 'chapter-123',
      pacing_score: 75,
      pacing_data: {
        scene_pacing: [{ scene: 'Opening scene', pace: 'fast', word_count: 100 }],
      },
      character_screen_time: {
        'John': { appearances: 5, word_count: 100, pov_time: 100 },
      },
      dialogue_percentage: 30,
      dialogue_word_count: 30,
      narrative_word_count: 70,
      readability_score: 65,
      avg_sentence_length: 15,
      complex_word_percentage: 10,
      tension_score: 60,
      tension_arc: {
        points: [{ position: 50, tension: 60 }],
      },
    });

    const createMockSavedAnalytics = () => {
      const result = createMockAnalyticsResult();
      return {
        id: 'analytics-1',
        chapter_id: 'chapter-123',
        pacing_score: 75,
        pacing_data: JSON.stringify(result.pacing_data),
        character_screen_time: JSON.stringify(result.character_screen_time),
        dialogue_percentage: 30,
        dialogue_word_count: 30,
        narrative_word_count: 70,
        readability_score: 65,
        avg_sentence_length: 15,
        complex_word_percentage: 10,
        tension_score: 60,
        tension_arc: JSON.stringify(result.tension_arc),
      };
    };

    it('should analyze a chapter and store analytics', async () => {
      const mockChapter = createMockChapter();
      const mockAnalyticsResult = createMockAnalyticsResult();
      const mockSavedAnalytics = createMockSavedAnalytics();

      mockGet
        .mockReturnValueOnce(mockChapter) // First call: get chapter
        .mockReturnValueOnce(null) // Second call: check existing analytics
        .mockReturnValueOnce(mockSavedAnalytics); // Third call: get saved analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockAnalyticsResult));
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(200);

      expect(mockAnalyzeChapter).toHaveBeenCalledWith(
        'chapter-123',
        mockChapter.content,
        [{ goal: 'Opening scene', characters: ['John'], povCharacter: 'John' }]
      );

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.pacing_score).toBe(75);
      expect(response.body.analytics.dialogue_percentage).toBe(30);
    });

    it('should update existing analytics if they exist', async () => {
      const mockChapter = createMockChapter();
      const mockAnalyticsResult = createMockAnalyticsResult();
      const mockSavedAnalytics = createMockSavedAnalytics();

      // The route calls db.prepare().get() three times:
      // 1. Get chapter (line 71-73)
      // 2. Check existing analytics (line 21 in upsertChapterAnalytics)
      // 3. Get saved analytics (line 88)
      mockGet
        .mockReturnValueOnce(mockChapter) // Get chapter
        .mockReturnValueOnce({ id: 'existing-analytics' }) // Check existing (line 21)
        .mockReturnValueOnce(mockSavedAnalytics); // Get saved (line 88)

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockAnalyticsResult));
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 404 if chapter not found', async () => {
      mockGet.mockReturnValueOnce(null);

      const response = await request(app)
        .post('/api/analytics/chapter/nonexistent/analyze')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Chapter');
      expect(mockAnalyzeChapter).not.toHaveBeenCalled();
    });

    it('should return 400 if chapter has no content', async () => {
      mockGet.mockReturnValueOnce({ id: 'chapter-123', content: null });

      const response = await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('no content');
      expect(mockAnalyzeChapter).not.toHaveBeenCalled();
    });

    it('should handle chapters with no scene cards', async () => {
      const mockAnalyticsResult = createMockAnalyticsResult();
      const mockSavedAnalytics = createMockSavedAnalytics();
      const chapterNoScenes = {
        id: 'chapter-123',
        content: 'Chapter content',
        scene_cards: null,
      };

      mockGet
        .mockReturnValueOnce(chapterNoScenes) // Get chapter
        .mockReturnValueOnce(null) // Check existing (no existing analytics)
        .mockReturnValueOnce(mockSavedAnalytics); // Get saved after insert

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockAnalyticsResult));
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(200);

      expect(mockAnalyzeChapter).toHaveBeenCalledWith(
        'chapter-123',
        'Chapter content',
        []
      );
    });

    it('should handle analytics service errors', async () => {
      const mockChapter = createMockChapter();

      mockGet.mockReturnValueOnce(mockChapter);
      mockAnalyzeChapter.mockImplementation(() => Promise.reject(new Error('Analysis failed')));

      const response = await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database errors when storing analytics', async () => {
      const mockChapter = createMockChapter();
      const mockAnalyticsResult = createMockAnalyticsResult();

      mockGet.mockReturnValueOnce(mockChapter);
      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockAnalyticsResult));
      mockRun.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/analytics/chapter/chapter-123/analyze')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/analytics/book/:bookId', () => {
    const createMockBookAnalytics = () => ({
      id: 'book-analytics-1',
      book_id: 'book-123',
      avg_pacing_score: 72.5,
      pacing_consistency: 85,
      character_balance: JSON.stringify({
        characters: [
          {
            name: 'John Smith',
            total_appearances: 45,
            total_word_count: 15000,
            chapters_appeared_in: [1, 2, 3],
          },
        ],
      }),
      avg_dialogue_percentage: 40.2,
      avg_readability_score: 67.8,
      overall_tension_arc: JSON.stringify({
        chapters: [
          { chapter_number: 1, avg_tension: 60 },
          { chapter_number: 2, avg_tension: 75 },
          { chapter_number: 3, avg_tension: 85 },
        ],
      }),
      genre_comparison: JSON.stringify({
        genre: 'thriller',
        pacing_vs_norm: 5.5,
        dialogue_vs_norm: -2.3,
        readability_vs_norm: 3.2,
      }),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    const createMockCompletion = () => ({
      book_id: 'book-123',
      completed_at: '2026-01-15T00:00:00.000Z',
      analytics_status: 'complete',
      analytics_completed_at: '2026-01-15T01:00:00.000Z',
    });

    it('should return book analytics', async () => {
      mockGet
        .mockReturnValueOnce(createMockBookAnalytics())
        .mockReturnValueOnce(createMockCompletion());

      const response = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.book_id).toBe('book-123');
      expect(response.body.analytics.avg_pacing_score).toBe(72.5);
      expect(response.body.analytics.pacing_consistency).toBe(85);
    });

    it('should parse JSON fields correctly', async () => {
      // Route calls db.prepare().get() twice: once for analytics, once for completion
      mockGet
        .mockReturnValueOnce(createMockBookAnalytics()) // Get book analytics (line 202)
        .mockReturnValueOnce(createMockCompletion()); // Get completion (line 209)

      const response = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(200);

      expect(response.body.analytics.character_balance).toEqual({
        characters: [
          {
            name: 'John Smith',
            total_appearances: 45,
            total_word_count: 15000,
            chapters_appeared_in: [1, 2, 3],
          },
        ],
      });

      expect(response.body.analytics.overall_tension_arc).toEqual({
        chapters: [
          { chapter_number: 1, avg_tension: 60 },
          { chapter_number: 2, avg_tension: 75 },
          { chapter_number: 3, avg_tension: 85 },
        ],
      });

      expect(response.body.analytics.genre_comparison).toEqual({
        genre: 'thriller',
        pacing_vs_norm: 5.5,
        dialogue_vs_norm: -2.3,
        readability_vs_norm: 3.2,
      });
    });

    it('should include completion status if available', async () => {
      mockGet
        .mockReturnValueOnce(createMockBookAnalytics()) // Get book analytics
        .mockReturnValueOnce(createMockCompletion()); // Get completion

      const response = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(200);

      expect(response.body).toHaveProperty('completion');
      expect(response.body.completion).toEqual({
        completedAt: '2026-01-15T00:00:00.000Z',
        analyticsStatus: 'complete',
        analyticsCompletedAt: '2026-01-15T01:00:00.000Z',
      });
    });

    it('should return null completion if not available', async () => {
      mockGet
        .mockReturnValueOnce(createMockBookAnalytics()) // Get book analytics
        .mockReturnValueOnce(null); // No completion data

      const response = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(200);

      expect(response.body.completion).toBeNull();
    });

    it('should return 404 if book analytics not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/analytics/book/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Book analytics');
    });

    it('should handle database errors', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/analytics/book/:bookId/analyze', () => {
    const createMockChapters = () => [
      {
        id: 'chapter-1',
        content: 'Chapter 1 content with "dialogue".',
        scene_cards: JSON.stringify([{ goal: 'Scene 1', characters: ['John'] }]),
      },
      {
        id: 'chapter-2',
        content: 'Chapter 2 content with more "dialogue" here.',
        scene_cards: JSON.stringify([{ goal: 'Scene 2', characters: ['Jane'] }]),
      },
      {
        id: 'chapter-3',
        content: null, // Chapter without content should be skipped
        scene_cards: null,
      },
    ];

    const createMockBook = () => ({
      id: 'book-123',
      genre: 'thriller',
    });

    const createMockBenchmark = () => ({
      genre: 'thriller',
      typical_pacing_score: 70,
      typical_dialogue_percentage: 42,
      typical_readability_score: 65,
      typical_tension_pattern: JSON.stringify([50, 60, 70, 80, 90]),
      typical_pov_structure: JSON.stringify({ single: 60, multiple: 40 }),
    });

    const createMockChapterAnalytics = () => ({
      chapter_id: 'chapter-1',
      pacing_score: 75,
      pacing_data: { scene_pacing: [] },
      character_screen_time: { John: { appearances: 5, word_count: 100, pov_time: 100 } },
      dialogue_percentage: 35,
      dialogue_word_count: 35,
      narrative_word_count: 65,
      readability_score: 68,
      avg_sentence_length: 16,
      complex_word_percentage: 11,
      tension_score: 65,
      tension_arc: { points: [{ position: 50, tension: 65 }] },
    });

    const createMockBookAnalytics = () => ({
      avg_pacing_score: 73,
      pacing_consistency: 88,
      character_balance: {
        characters: [
          { name: 'John', total_appearances: 10, total_word_count: 200, chapters_appeared_in: [1] },
        ],
      },
      avg_dialogue_percentage: 37,
      avg_readability_score: 67,
      overall_tension_arc: {
        chapters: [{ chapter_number: 1, avg_tension: 65 }],
      },
      genre_comparison: null,
    });

    const createMockSavedBookAnalytics = () => ({
      id: 'book-analytics-1',
      book_id: 'book-123',
      avg_pacing_score: 73,
      pacing_consistency: 88,
      character_balance: JSON.stringify(createMockBookAnalytics().character_balance),
      avg_dialogue_percentage: 37,
      avg_readability_score: 67,
      overall_tension_arc: JSON.stringify(createMockBookAnalytics().overall_tension_arc),
      genre_comparison: JSON.stringify({
        genre: 'thriller',
        pacing_vs_norm: 3,
        dialogue_vs_norm: -5,
        readability_vs_norm: 2,
      }),
    });

    it('should analyze all chapters and calculate book analytics', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockBenchmark = createMockBenchmark();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      mockAll.mockReturnValue(mockChapters);
      // For each chapter with content, upsertChapterAnalytics calls db.prepare().get() once
      // Then the route calls db.prepare().get() three more times at the end
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Chapter 1: check existing analytics
        .mockReturnValueOnce({ id: 'existing-2' }) // Chapter 2: check existing analytics
        .mockReturnValueOnce(mockBook) // Get book with genre (line 141-143)
        .mockReturnValueOnce(mockBenchmark) // Get genre benchmark (line 147)
        .mockReturnValueOnce(null) // Check existing book analytics (line 158)
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics (line 189)

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(mockAll).toHaveBeenCalled();
      expect(mockAnalyzeChapter).toHaveBeenCalledTimes(2); // Only chapters with content
      expect(mockCalculateBookAnalytics).toHaveBeenCalled();
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.avg_pacing_score).toBe(73);
    });

    it('should update existing book analytics', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockBenchmark = createMockBenchmark();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      mockAll.mockReturnValue([mockChapters[0]]);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Check existing chapter analytics
        .mockReturnValueOnce(mockBook) // Get book with genre
        .mockReturnValueOnce(mockBenchmark) // Get genre benchmark
        .mockReturnValueOnce({ id: 'existing-book-analytics' }) // Check existing book analytics (will update)
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(mockRun).toHaveBeenCalled();
    });

    it('should return 400 if no chapters found', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('No chapters found');
      expect(mockAnalyzeChapter).not.toHaveBeenCalled();
    });

    it('should skip chapters without content', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockBenchmark = createMockBenchmark();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      mockAll.mockReturnValue([
        mockChapters[0],
        mockChapters[2], // No content - will be skipped
      ]);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Check existing for chapter 1 (chapter 2 is skipped)
        .mockReturnValueOnce(mockBook) // Get book with genre
        .mockReturnValueOnce(mockBenchmark) // Get genre benchmark
        .mockReturnValueOnce(null) // Check existing book analytics
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(mockAnalyzeChapter).toHaveBeenCalledTimes(1); // Only one chapter has content
    });

    it('should handle chapters with null scene cards', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockBenchmark = createMockBenchmark();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      const chapterWithNullScenes = {
        ...mockChapters[0],
        scene_cards: null,
      };

      mockAll.mockReturnValue([chapterWithNullScenes]);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Check existing chapter analytics
        .mockReturnValueOnce(mockBook) // Get book with genre
        .mockReturnValueOnce(mockBenchmark) // Get genre benchmark
        .mockReturnValueOnce(null) // Check existing book analytics
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(mockAnalyzeChapter).toHaveBeenCalledWith(
        'chapter-1',
        expect.any(String),
        []
      );
    });

    it('should calculate genre comparison when benchmark exists', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockBenchmark = createMockBenchmark();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      mockAll.mockReturnValue([mockChapters[0]]);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Check existing chapter analytics
        .mockReturnValueOnce(mockBook) // Get book with genre
        .mockReturnValueOnce(mockBenchmark) // Get genre benchmark
        .mockReturnValueOnce(null) // Check existing book analytics
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(response.body.analytics.genre_comparison).toBeTruthy();
    });

    it('should handle missing genre benchmark', async () => {
      const mockChapters = createMockChapters();
      const mockBook = createMockBook();
      const mockChapterAnalytics = createMockChapterAnalytics();
      const mockBookAnalytics = createMockBookAnalytics();
      const mockSavedBookAnalytics = createMockSavedBookAnalytics();

      mockAll.mockReturnValue([mockChapters[0]]);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // Check existing chapter analytics
        .mockReturnValueOnce(mockBook) // Get book with genre
        .mockReturnValueOnce(null) // No genre benchmark found
        .mockReturnValueOnce(null) // Check existing book analytics
        .mockReturnValueOnce(mockSavedBookAnalytics); // Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      // Should still succeed without genre comparison
    });

    it('should handle analytics service errors', async () => {
      const mockChapters = createMockChapters();
      mockAll.mockReturnValue([mockChapters[0]]);
      mockAnalyzeChapter.mockImplementation(() => Promise.reject(new Error('Analysis failed')));

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/analytics/book/:bookId/chapters', () => {
    const createMockChapterAnalytics = () => [
      {
        id: 'analytics-1',
        chapter_id: 'chapter-1',
        pacing_score: 75,
        pacing_data: JSON.stringify({ scene_pacing: [] }),
        character_screen_time: JSON.stringify({ John: { appearances: 5 } }),
        dialogue_percentage: 40,
        dialogue_word_count: 400,
        narrative_word_count: 600,
        readability_score: 65,
        avg_sentence_length: 18,
        complex_word_percentage: 12,
        tension_score: 70,
        tension_arc: JSON.stringify({ points: [] }),
      },
      {
        id: 'analytics-2',
        chapter_id: 'chapter-2',
        pacing_score: 80,
        pacing_data: JSON.stringify({ scene_pacing: [] }),
        character_screen_time: JSON.stringify({ Jane: { appearances: 7 } }),
        dialogue_percentage: 45,
        dialogue_word_count: 450,
        narrative_word_count: 550,
        readability_score: 68,
        avg_sentence_length: 17,
        complex_word_percentage: 11,
        tension_score: 75,
        tension_arc: JSON.stringify({ points: [] }),
      },
    ];

    it('should return all chapter analytics for a book', async () => {
      const mockChapterAnalytics = createMockChapterAnalytics();
      mockAll.mockReturnValue(mockChapterAnalytics);

      const response = await request(app)
        .get('/api/analytics/book/book-123/chapters')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveLength(2);
      expect(response.body.analytics[0].chapter_id).toBe('chapter-1');
      expect(response.body.analytics[1].chapter_id).toBe('chapter-2');
    });

    it('should parse JSON fields in all chapter analytics', async () => {
      const mockChapterAnalytics = createMockChapterAnalytics();
      mockAll.mockReturnValue(mockChapterAnalytics);

      const response = await request(app)
        .get('/api/analytics/book/book-123/chapters')
        .expect(200);

      expect(response.body.analytics[0].pacing_data).toEqual({ scene_pacing: [] });
      expect(response.body.analytics[0].character_screen_time).toEqual({
        John: { appearances: 5 },
      });
      expect(response.body.analytics[1].character_screen_time).toEqual({
        Jane: { appearances: 7 },
      });
    });

    it('should return empty array if no analytics found', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/analytics/book/book-123/chapters')
        .expect(200);

      expect(response.body.analytics).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/analytics/book/book-123/chapters')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/analytics/benchmarks', () => {
    const createMockBenchmarks = () => [
      {
        genre: 'thriller',
        typical_pacing_score: 70,
        typical_dialogue_percentage: 42,
        typical_readability_score: 65,
        typical_tension_pattern: JSON.stringify([50, 60, 70, 80, 90]),
        typical_pov_structure: JSON.stringify({ single: 60, multiple: 40 }),
      },
      {
        genre: 'romance',
        typical_pacing_score: 60,
        typical_dialogue_percentage: 50,
        typical_readability_score: 70,
        typical_tension_pattern: JSON.stringify([40, 50, 60, 70, 80]),
        typical_pov_structure: JSON.stringify({ single: 40, multiple: 60 }),
      },
    ];

    it('should return all genre benchmarks', async () => {
      const mockBenchmarks = createMockBenchmarks();
      mockAll.mockReturnValue(mockBenchmarks);

      const response = await request(app)
        .get('/api/analytics/benchmarks')
        .expect(200);

      expect(response.body).toHaveProperty('benchmarks');
      expect(response.body.benchmarks).toHaveLength(2);
      expect(response.body.benchmarks[0].genre).toBe('thriller');
      expect(response.body.benchmarks[1].genre).toBe('romance');
    });

    it('should filter by genre when query parameter provided', async () => {
      const mockBenchmarks = createMockBenchmarks();
      mockAll.mockReturnValue([mockBenchmarks[0]]);

      const response = await request(app)
        .get('/api/analytics/benchmarks?genre=thriller')
        .expect(200);

      expect(response.body.benchmarks).toHaveLength(1);
      expect(response.body.benchmarks[0].genre).toBe('thriller');
    });

    it('should parse JSON fields in benchmarks', async () => {
      const mockBenchmarks = createMockBenchmarks();
      mockAll.mockReturnValue(mockBenchmarks);

      const response = await request(app)
        .get('/api/analytics/benchmarks')
        .expect(200);

      expect(response.body.benchmarks[0].typical_tension_pattern).toEqual([
        50, 60, 70, 80, 90,
      ]);
      expect(response.body.benchmarks[0].typical_pov_structure).toEqual({
        single: 60,
        multiple: 40,
      });
    });

    it('should return empty array if no benchmarks found', async () => {
      mockAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/analytics/benchmarks')
        .expect(200);

      expect(response.body.benchmarks).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/analytics/benchmarks')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Integration: Full Analytics Workflow', () => {
    it('should handle complete analytics workflow: analyze chapters, analyze book, retrieve analytics', async () => {
      // Setup chapter data
      const mockChapters = [
        {
          id: 'chapter-1',
          content: 'Chapter content',
          scene_cards: JSON.stringify([{ goal: 'Scene 1' }]),
        },
      ];

      const mockChapterAnalytics = {
        chapter_id: 'chapter-1',
        pacing_score: 75,
        pacing_data: { scene_pacing: [] },
        character_screen_time: {},
        dialogue_percentage: 40,
        dialogue_word_count: 400,
        narrative_word_count: 600,
        readability_score: 65,
        avg_sentence_length: 18,
        complex_word_percentage: 12,
        tension_score: 70,
        tension_arc: { points: [] },
      };

      const mockSavedChapterAnalytics = {
        id: 'analytics-1',
        chapter_id: 'chapter-1',
        pacing_score: 75,
        pacing_data: JSON.stringify({ scene_pacing: [] }),
        character_screen_time: JSON.stringify({}),
        dialogue_percentage: 40,
        dialogue_word_count: 400,
        narrative_word_count: 600,
        readability_score: 65,
        avg_sentence_length: 18,
        complex_word_percentage: 12,
        tension_score: 70,
        tension_arc: JSON.stringify({ points: [] }),
      };

      const mockBookAnalytics = {
        avg_pacing_score: 75,
        pacing_consistency: 90,
        character_balance: { characters: [] },
        avg_dialogue_percentage: 40,
        avg_readability_score: 65,
        overall_tension_arc: { chapters: [] },
        genre_comparison: null,
      };

      const mockSavedBookAnalytics = {
        id: 'book-analytics-1',
        book_id: 'book-123',
        avg_pacing_score: 75,
        pacing_consistency: 90,
        character_balance: JSON.stringify({ characters: [] }),
        avg_dialogue_percentage: 40,
        avg_readability_score: 65,
        overall_tension_arc: JSON.stringify({ chapters: [] }),
        genre_comparison: JSON.stringify(null),
      };

      // Analyze book (includes chapter analysis)
      mockAll.mockReturnValue(mockChapters);
      mockGet
        .mockReturnValueOnce({ id: 'existing-1' }) // 1. Check existing chapter analytics
        .mockReturnValueOnce({ id: 'book-123', genre: 'thriller' }) // 2. Get book with genre
        .mockReturnValueOnce(null) // 3. No benchmark
        .mockReturnValueOnce(null) // 4. No existing book analytics
        .mockReturnValueOnce(mockSavedBookAnalytics); // 5. Get saved book analytics

      mockAnalyzeChapter.mockImplementation(() => Promise.resolve(mockChapterAnalytics));
      mockCalculateBookAnalytics.mockReturnValue(mockBookAnalytics);
      mockRun.mockReturnValue({ changes: 1 });

      const analyzeResponse = await request(app)
        .post('/api/analytics/book/book-123/analyze')
        .expect(200);

      expect(analyzeResponse.body.analytics.avg_pacing_score).toBe(75);
    });

    it('should retrieve book analytics after analysis', async () => {
      const mockSavedBookAnalytics = {
        id: 'book-analytics-1',
        book_id: 'book-123',
        avg_pacing_score: 75,
        pacing_consistency: 90,
        character_balance: JSON.stringify({ characters: [] }),
        avg_dialogue_percentage: 40,
        avg_readability_score: 65,
        overall_tension_arc: JSON.stringify({ chapters: [] }),
        genre_comparison: JSON.stringify(null),
      };

      mockGet
        .mockReturnValueOnce(mockSavedBookAnalytics) // Get book analytics
        .mockReturnValueOnce(null); // No completion data

      const bookResponse = await request(app)
        .get('/api/analytics/book/book-123')
        .expect(200);

      expect(bookResponse.body.analytics.avg_pacing_score).toBe(75);
    });

    it('should retrieve chapter analytics after analysis', async () => {
      const mockSavedChapterAnalytics = {
        id: 'analytics-1',
        chapter_id: 'chapter-1',
        pacing_score: 75,
        pacing_data: JSON.stringify({ scene_pacing: [] }),
        character_screen_time: JSON.stringify({}),
        dialogue_percentage: 40,
        dialogue_word_count: 400,
        narrative_word_count: 600,
        readability_score: 65,
        avg_sentence_length: 18,
        complex_word_percentage: 12,
        tension_score: 70,
        tension_arc: JSON.stringify({ points: [] }),
      };

      mockGet.mockReturnValue(mockSavedChapterAnalytics);

      const chapterResponse = await request(app)
        .get('/api/analytics/chapter/chapter-1')
        .expect(200);

      expect(chapterResponse.body.analytics.pacing_score).toBe(75);
    });
  });
});
