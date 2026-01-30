import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create the mock database with proper structure
const createMockStatement = () => ({
  run: jest.fn<() => { changes: number }>(() => ({ changes: 1 })),
  get: jest.fn<() => any>(() => null),
  all: jest.fn<() => any[]>(() => []),
});

const mockPrepare = jest.fn<(sql?: string) => ReturnType<typeof createMockStatement>>(() => createMockStatement());

const mockDb = {
  prepare: mockPrepare,
  pragma: jest.fn(),
  close: jest.fn(),
};

// Mock database connection - must be before other imports
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: mockDb,
}));

// Mock logger service
jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock cache service
jest.mock('../../services/cache.service.js', () => ({
  cache: {
    get: jest.fn(() => null),
    set: jest.fn(),
    invalidate: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock services
jest.mock('../../services/cross-book-continuity.service.js', () => ({
  crossBookContinuityService: {
    generateBookEndingState: jest.fn(),
    generateBookSummary: jest.fn(),
    loadPreviousBookState: jest.fn(),
  },
}));

jest.mock('../../services/series-bible-generator.service.js', () => ({
  seriesBibleGeneratorService: {
    generateSeriesBible: jest.fn(),
    getSeriesBible: jest.fn(),
  },
}));

jest.mock('../../services/book-transition.service.js', () => ({
  bookTransitionService: {
    generateBookTransition: jest.fn(),
    getTransition: jest.fn(),
    getProjectTransitions: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

describe('Trilogy API Integration Tests', () => {
  let app: express.Application;
  let crossBookContinuityService: any;
  let seriesBibleGeneratorService: any;
  let bookTransitionService: any;
  let cacheService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementation with default responses
    mockPrepare.mockImplementation(() => createMockStatement());

    // Import mocked services
    const continuityModule = await import('../../services/cross-book-continuity.service.js');
    crossBookContinuityService = continuityModule.crossBookContinuityService;

    const bibleModule = await import('../../services/series-bible-generator.service.js');
    seriesBibleGeneratorService = bibleModule.seriesBibleGeneratorService;

    const transitionModule = await import('../../services/book-transition.service.js');
    bookTransitionService = transitionModule.bookTransitionService;

    const cacheModule = await import('../../services/cache.service.js');
    cacheService = cacheModule.cache;

    // Reset cache mock
    cacheService.get.mockReturnValue(null);

    // Setup Express app with routes
    app = express();
    app.use(express.json());

    const trilogyRouter = (await import('../trilogy.js')).default;
    app.use('/api/trilogy', trilogyRouter);
  });

  describe('Book Ending State Management', () => {
    describe('POST /api/trilogy/books/:bookId/ending-state', () => {
      const mockEndingState = {
        bookId: 'book-123',
        characters: [
          {
            characterId: 'char-1',
            name: 'John Doe',
            status: 'alive',
            location: 'Castle',
            emotionalState: 'determined',
          },
        ],
        worldState: {
          politicalSituation: 'Kingdom at war',
        },
        timestamp: new Date().toISOString(),
      };

      it('should generate book ending state successfully', async () => {
        crossBookContinuityService.generateBookEndingState.mockImplementation(() =>
          Promise.resolve(mockEndingState)
        );

        const response = await request(app)
          .post('/api/trilogy/books/book-123/ending-state')
          .expect(200);

        expect(response.body).toEqual(mockEndingState);
        expect(crossBookContinuityService.generateBookEndingState).toHaveBeenCalledWith('book-123');
      });

      it('should return 500 on service error', async () => {
        crossBookContinuityService.generateBookEndingState.mockImplementation(() =>
          Promise.reject(new Error('Service error'))
        );

        const response = await request(app)
          .post('/api/trilogy/books/book-123/ending-state')
          .expect(500);

        expect(response.body.error.code).toBe('INTERNAL_ERROR');
        expect(response.body.error.message).toContain('Service error');
      });
    });

    describe('POST /api/trilogy/books/:bookId/summary', () => {
      it('should generate book summary successfully', async () => {
        crossBookContinuityService.generateBookSummary.mockImplementation(() =>
          Promise.resolve('Book 1 summary: The hero begins their journey...')
        );

        const response = await request(app)
          .post('/api/trilogy/books/book-123/summary')
          .expect(200);

        expect(response.body.summary).toBe('Book 1 summary: The hero begins their journey...');
        expect(crossBookContinuityService.generateBookSummary).toHaveBeenCalledWith('book-123');
      });

      it('should return 500 on service error', async () => {
        crossBookContinuityService.generateBookSummary.mockImplementation(() =>
          Promise.reject(new Error('Failed to generate summary'))
        );

        const response = await request(app)
          .post('/api/trilogy/books/book-123/summary')
          .expect(500);

        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /api/trilogy/books/:bookId/previous-state', () => {
      const mockPreviousState = {
        bookId: 'book-1',
        characters: [
          { characterId: 'char-1', name: 'John Doe', status: 'alive' },
        ],
      };

      it('should get previous book state successfully', () => {
        const mockBook = {
          id: 'book-123',
          project_id: 'project-1',
          book_number: 2,
        };

        const mockStmt = createMockStatement();
        mockStmt.get.mockReturnValue(mockBook);
        mockPrepare.mockReturnValue(mockStmt);

        crossBookContinuityService.loadPreviousBookState.mockReturnValue(mockPreviousState);

        return request(app)
          .get('/api/trilogy/books/book-123/previous-state')
          .expect(200)
          .then((response) => {
            expect(response.body).toEqual(mockPreviousState);
            expect(crossBookContinuityService.loadPreviousBookState).toHaveBeenCalledWith(
              'project-1',
              2
            );
          });
      });

      it('should return 404 when book not found', () => {
        const mockStmt = createMockStatement();
        mockStmt.get.mockReturnValue(null);
        mockPrepare.mockReturnValue(mockStmt);

        return request(app)
          .get('/api/trilogy/books/book-123/previous-state')
          .expect(404)
          .then((response) => {
            expect(response.body.error.code).toBe('NOT_FOUND');
            expect(response.body.error.message).toContain('Book not found');
          });
      });

      it('should return 404 when no previous book state exists', () => {
        const mockBook = {
          id: 'book-123',
          project_id: 'project-1',
          book_number: 1,
        };

        const mockStmt = createMockStatement();
        mockStmt.get.mockReturnValue(mockBook);
        mockPrepare.mockReturnValue(mockStmt);

        crossBookContinuityService.loadPreviousBookState.mockReturnValue(null);

        return request(app)
          .get('/api/trilogy/books/book-123/previous-state')
          .expect(404)
          .then((response) => {
            expect(response.body.error.code).toBe('NOT_FOUND');
            expect(response.body.error.message).toContain('No previous book state found');
          });
      });
    });
  });

  describe('Series Bible Management', () => {
    describe('POST /api/trilogy/projects/:projectId/series-bible', () => {
      const mockSeriesBible = {
        id: 'bible-1',
        projectId: 'project-1',
        seriesOverview: 'Epic trilogy about...',
        characters: [],
        themes: ['redemption', 'sacrifice'],
      };

      it('should generate series bible successfully', () => {
        seriesBibleGeneratorService.generateSeriesBible.mockReturnValue(mockSeriesBible);

        return request(app)
          .post('/api/trilogy/projects/project-1/series-bible')
          .expect(200)
          .then((response) => {
            expect(response.body).toEqual(mockSeriesBible);
            expect(seriesBibleGeneratorService.generateSeriesBible).toHaveBeenCalledWith('project-1');
          });
      });

      it('should return 500 on service error', () => {
        seriesBibleGeneratorService.generateSeriesBible.mockImplementation(() => {
          throw new Error('Generation failed');
        });

        return request(app)
          .post('/api/trilogy/projects/project-1/series-bible')
          .expect(500)
          .then((response) => {
            expect(response.body.error.code).toBe('INTERNAL_ERROR');
          });
      });
    });

    describe('GET /api/trilogy/projects/:projectId/series-bible', () => {
      const mockSeriesBible = {
        id: 'bible-1',
        projectId: 'project-1',
      };

      it('should get existing series bible successfully', () => {
        // Ensure cache returns null so DB lookup happens
        cacheService.get.mockReturnValue(null);
        seriesBibleGeneratorService.getSeriesBible.mockReturnValue(mockSeriesBible);

        return request(app)
          .get('/api/trilogy/projects/project-1/series-bible')
          .expect(200)
          .then((response) => {
            expect(response.body).toEqual(mockSeriesBible);
            expect(cacheService.set).toHaveBeenCalled();
          });
      });

      it('should return 404 when series bible not found', () => {
        cacheService.get.mockReturnValue(null);
        seriesBibleGeneratorService.getSeriesBible.mockReturnValue(null);

        return request(app)
          .get('/api/trilogy/projects/project-1/series-bible')
          .expect(404)
          .then((response) => {
            expect(response.body.error.code).toBe('NOT_FOUND');
          });
      });
    });
  });

  describe('Book Transitions', () => {
    describe('POST /api/trilogy/transitions', () => {
      const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
      const validFromBookId = '550e8400-e29b-41d4-a716-446655440001';
      const validToBookId = '550e8400-e29b-41d4-a716-446655440002';

      const mockTransition = {
        id: 'transition-1',
        projectId: validProjectId,
        fromBookId: validFromBookId,
        toBookId: validToBookId,
        timeGap: '6 months',
      };

      it('should create book transition successfully', async () => {
        bookTransitionService.generateBookTransition.mockImplementation(() =>
          Promise.resolve(mockTransition)
        );

        const response = await request(app)
          .post('/api/trilogy/transitions')
          .send({
            projectId: validProjectId,
            fromBookId: validFromBookId,
            toBookId: validToBookId,
            timeGap: '6 months',
          })
          .expect(201);

        expect(response.body).toEqual(mockTransition);
      });

      it('should return 400 when missing required fields', async () => {
        const response = await request(app)
          .post('/api/trilogy/transitions')
          .send({ fromBookId: 'book-1' })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/trilogy/transitions/:fromBookId/:toBookId', () => {
      it('should get specific transition successfully', () => {
        const mockTransition = { id: 'transition-1', timeGap: '6 months' };
        bookTransitionService.getTransition.mockReturnValue(mockTransition);

        return request(app)
          .get('/api/trilogy/transitions/book-1/book-2')
          .expect(200)
          .then((response) => {
            expect(response.body).toEqual(mockTransition);
          });
      });

      it('should return 404 when transition not found', () => {
        bookTransitionService.getTransition.mockReturnValue(null);

        return request(app)
          .get('/api/trilogy/transitions/book-1/book-2')
          .expect(404);
      });
    });

    describe('GET /api/trilogy/projects/:projectId/transitions', () => {
      it('should get all project transitions successfully', () => {
        const mockTransitions = [{ id: 'transition-1' }, { id: 'transition-2' }];
        bookTransitionService.getProjectTransitions.mockReturnValue(mockTransitions);

        return request(app)
          .get('/api/trilogy/projects/project-1/transitions')
          .expect(200)
          .then((response) => {
            expect(response.body.transitions).toEqual(mockTransitions);
          });
      });
    });
  });

  describe('Convert to Trilogy', () => {
    it('should convert standalone project to trilogy', () => {
      const existingBook = {
        id: 'existing-book-1',
        project_id: 'project-1',
        book_number: 1,
      };

      mockPrepare.mockImplementation((sql: any) => {
        const stmt = createMockStatement();

        if (typeof sql === 'string' && sql.includes('SELECT * FROM books')) {
          stmt.get.mockReturnValue(existingBook);
        } else {
          stmt.run.mockReturnValue({ changes: 1 });
        }

        return stmt;
      });

      return request(app)
        .post('/api/trilogy/projects/project-1/convert-to-trilogy')
        .send({
          bookTitles: ['Book One', 'Book Two', 'Book Three'],
        })
        .expect(200)
        .then((response) => {
          expect(response.body.success).toBe(true);
          expect(response.body.books).toHaveLength(3);
        });
    });

    it('should return 400 when bookTitles is missing', () => {
      return request(app)
        .post('/api/trilogy/projects/project-1/convert-to-trilogy')
        .send({})
        .expect(400)
        .then((response) => {
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
  });
});
