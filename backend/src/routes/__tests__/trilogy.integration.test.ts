import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock database connection first
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn().mockReturnValue({ changes: 1 }),
    get: jest.fn().mockReturnValue(null),
    all: jest.fn().mockReturnValue([]),
  }),
};

jest.mock('../../db/connection.js', () => ({
  default: mockDb,
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

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementation
    mockDb.prepare.mockReturnValue({
      run: jest.fn().mockReturnValue({ changes: 1 }),
      get: jest.fn().mockReturnValue(null),
      all: jest.fn().mockReturnValue([]),
    });

    // Import mocked services
    const continuityModule = await import('../../services/cross-book-continuity.service.js');
    crossBookContinuityService = continuityModule.crossBookContinuityService;

    const bibleModule = await import('../../services/series-bible-generator.service.js');
    seriesBibleGeneratorService = bibleModule.seriesBibleGeneratorService;

    const transitionModule = await import('../../services/book-transition.service.js');
    bookTransitionService = transitionModule.bookTransitionService;

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
        crossBookContinuityService.generateBookEndingState.mockResolvedValue(mockEndingState);

        const response = await request(app)
          .post('/api/trilogy/books/book-123/ending-state')
          .expect(200);

        expect(response.body).toEqual(mockEndingState);
        expect(crossBookContinuityService.generateBookEndingState).toHaveBeenCalledWith('book-123');
      });

      it('should return 500 on service error', async () => {
        crossBookContinuityService.generateBookEndingState.mockRejectedValue(
          new Error('Service error')
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
        crossBookContinuityService.generateBookSummary.mockResolvedValue(
          'Book 1 summary: The hero begins their journey...'
        );

        const response = await request(app)
          .post('/api/trilogy/books/book-123/summary')
          .expect(200);

        expect(response.body.summary).toBe('Book 1 summary: The hero begins their journey...');
        expect(crossBookContinuityService.generateBookSummary).toHaveBeenCalledWith('book-123');
      });

      it('should return 500 on service error', async () => {
        crossBookContinuityService.generateBookSummary.mockRejectedValue(
          new Error('Failed to generate summary')
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

        mockDb.prepare.mockReturnValue({
          run: jest.fn(),
          get: jest.fn().mockReturnValue(mockBook),
          all: jest.fn(),
        });

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
        mockDb.prepare.mockReturnValue({
          run: jest.fn(),
          get: jest.fn().mockReturnValue(null),
          all: jest.fn(),
        });

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

        mockDb.prepare.mockReturnValue({
          run: jest.fn(),
          get: jest.fn().mockReturnValue(mockBook),
          all: jest.fn(),
        });

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
        seriesBibleGeneratorService.getSeriesBible.mockReturnValue(mockSeriesBible);

        return request(app)
          .get('/api/trilogy/projects/project-1/series-bible')
          .expect(200)
          .then((response) => {
            expect(response.body).toEqual(mockSeriesBible);
          });
      });

      it('should return 404 when series bible not found', () => {
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
      const mockTransition = {
        id: 'transition-1',
        projectId: 'project-1',
        fromBookId: 'book-1',
        toBookId: 'book-2',
        timeGap: '6 months',
      };

      it('should create book transition successfully', async () => {
        bookTransitionService.generateBookTransition.mockResolvedValue(mockTransition);

        const response = await request(app)
          .post('/api/trilogy/transitions')
          .send({
            projectId: 'project-1',
            fromBookId: 'book-1',
            toBookId: 'book-2',
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

        expect(response.body.error.code).toBe('INVALID_REQUEST');
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
      const updateStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn(),
        all: jest.fn(),
      };

      const getBookStmt = {
        run: jest.fn(),
        get: jest.fn().mockReturnValue({
          id: 'existing-book-1',
          project_id: 'project-1',
          book_number: 1,
        }),
        all: jest.fn(),
      };

      mockDb.prepare.mockImplementation((sql: any) => {
        if (typeof sql === 'string' && sql.includes('SELECT * FROM books')) {
          return getBookStmt;
        }
        return updateStmt;
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
          expect(response.body.error.code).toBe('INVALID_REQUEST');
        });
    });
  });
});
