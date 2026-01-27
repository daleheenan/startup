import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock the database connection - must be at top level for hoisting
jest.mock('../../db/connection.js');

// Mock services
jest.mock('../../services/story-dna-generator.js', () => ({
  generateStoryDNA: jest.fn(),
}));

jest.mock('../../services/character-generator.js', () => ({
  generateProtagonist: jest.fn(),
  generateSupportingCast: jest.fn(),
  assignNationalities: jest.fn(),
}));

jest.mock('../../services/world-generator.js', () => ({
  generateWorldElements: jest.fn(),
}));

jest.mock('../../services/metrics.service.js', () => ({
  metricsService: {
    getAllProjectMetrics: jest.fn(),
    getFormattedMetrics: jest.fn(),
  },
}));

jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../services/universe.service.js', () => ({
  universeService: {
    getOrCreateUniverse: jest.fn(),
  },
}));

// Mock authentication middleware
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

describe('Projects API Routes', () => {
  let app: express.Application;
  let authToken: string;
  let metricsService: any;
  let universeService: any;
  let mockDb: any;

  // Helper to create a mock database statement
  const createMockStmt = (options: {
    all?: any;
    get?: any;
    run?: any;
  } = {}) => ({
    all: options.all || jest.fn().mockReturnValue([]),
    get: options.get || jest.fn().mockReturnValue(null),
    run: options.run || jest.fn().mockReturnValue({ changes: 0 }),
  });

  beforeAll(() => {
    // Generate a valid JWT token for testing
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    authToken = jwt.sign({ userId: 'test-user-id' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import and setup the mocked database
    const dbModule = await import('../../db/connection.js');
    mockDb = dbModule.default as any;

    // Reset mock database implementation
    mockDb.prepare = jest.fn(() => ({
      run: jest.fn(() => ({ changes: 0 })),
      get: jest.fn(() => null),
      all: jest.fn(() => []),
    }));

    // Import mocked services
    const metricsModule = await import('../../services/metrics.service.js');
    metricsService = metricsModule.metricsService;

    const universeModule = await import('../../services/universe.service.js');
    universeService = universeModule.universeService;

    // Setup default mock implementations
    metricsService.getAllProjectMetrics.mockReturnValue(new Map());
    metricsService.getFormattedMetrics.mockReturnValue({
      totalWords: 0,
      completionPercentage: 0,
    });

    // Setup Express app with routes
    app = express();
    app.use(express.json());

    const projectsRouter = (await import('../projects.js')).default;
    app.use('/api/projects', projectsRouter);
  });

  describe('GET /api/projects', () => {
    it('should return all projects successfully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project 1',
          type: 'standalone',
          genre: 'Fantasy',
          status: 'setup',
          book_count: 1,
          story_bible: null,
          plot_structure: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'project-2',
          title: 'Test Project 2',
          type: 'trilogy',
          genre: 'Science Fiction',
          status: 'planning',
          book_count: 3,
          story_bible: '{"characters":[]}',
          plot_structure: '{"acts":[]}',
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      // Mock all database calls made by GET /api/projects
      // First call is for projects.all(), subsequent calls are for .get() on outlines, chapters, etc.
      let callCount = 0;
      mockDb.prepare.mockImplementation((() => {
        callCount++;
        if (callCount === 1) {
          // First call: get all projects
          return {
            all: jest.fn().mockReturnValue(mockProjects),
            get: jest.fn(),
            run: jest.fn(),
          };
        } else {
          // Subsequent calls: get outlines, chapters, generation status for each project
          return {
            all: jest.fn(),
            get: jest.fn().mockReturnValue(null),
            run: jest.fn(),
          };
        }
      }) as any);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].id).toBe('project-1');
      expect(response.body[1].id).toBe('project-2');
    });

    it('should return empty array when no projects exist', async () => {
      (mockDb.prepare as any).mockImplementation(() => ({
        all: jest.fn(() => []),
        get: jest.fn(),
        run: jest.fn(),
      }));

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should parse JSON fields correctly', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          type: 'standalone',
          genre: 'Fantasy',
          status: 'setup',
          book_count: 1,
          story_bible: '{"characters":[{"name":"Hero"}],"world":[{"name":"Castle"}]}',
          plot_structure: '{"acts":[{"name":"Act 1"}]}',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      (mockDb.prepare.mockImplementation as any)(() => {
        callCount++;
        if (callCount === 1) {
          return {
            all: jest.fn().mockReturnValue(mockProjects),
            get: jest.fn(),
            run: jest.fn(),
          };
        } else {
          return {
            all: jest.fn(),
            get: jest.fn().mockReturnValue(null),
            run: jest.fn(),
          };
        }
      });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body[0].story_bible).toEqual({
        characters: [{ name: 'Hero' }],
        world: [{ name: 'Castle' }],
      });
      expect(response.body[0].plot_structure).toEqual({
        acts: [{ name: 'Act 1' }],
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          type: 'standalone',
          genre: 'Fantasy',
          status: 'setup',
          book_count: 1,
          story_bible: 'invalid-json',
          plot_structure: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      (mockDb.prepare.mockImplementation as any)(() => {
        callCount++;
        if (callCount === 1) {
          return {
            all: jest.fn().mockReturnValue(mockProjects),
            get: jest.fn(),
            run: jest.fn(),
          };
        } else {
          return {
            all: jest.fn(),
            get: jest.fn().mockReturnValue(null),
            run: jest.fn(),
          };
        }
      });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return null for invalid JSON
      expect(response.body[0].story_bible).toBeNull();
    });

    it('should return 500 on database error', async () => {
      (mockDb.prepare as any).mockImplementation(() => ({
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database connection error');
        }),
        get: jest.fn(),
        run: jest.fn(),
      }));

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Database connection error');
    });
  });

  describe('GET /api/projects/:id', () => {
    const mockProject = {
      id: 'project-123',
      title: 'Test Project',
      type: 'standalone',
      genre: 'Fantasy',
      status: 'setup',
      book_count: 1,
      story_dna: '{"theme":"revenge"}',
      story_bible: '{"characters":[]}',
      story_concept: '{"logline":"A hero rises"}',
      plot_structure: '{"acts":[]}',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    it('should return single project successfully', async () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(mockProject),
        run: jest.fn(() => ({ changes: 0 })),
        all: jest.fn(() => []),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .get('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe('project-123');
      expect(response.body.title).toBe('Test Project');
      expect(response.body.story_dna).toEqual({ theme: 'revenge' });
      expect(response.body.metrics).toBeDefined();
    });

    it('should return 404 when project not found', async () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .get('/api/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Project not found');
    });

    it('should include books when requested', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          project_id: 'project-123',
          book_number: 1,
          title: 'Book One',
          status: 'planning',
          word_count: 50000,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      (mockDb.prepare.mockImplementation as any)(() => {
        callCount++;
        if (callCount === 1) {
          return { get: jest.fn().mockReturnValue(mockProject) };
        } else {
          return { all: jest.fn().mockReturnValue(mockBooks) };
        }
      });

      const response = await request(app)
        .get('/api/projects/project-123?include=books')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.books).toBeDefined();
      expect(response.body.books.length).toBe(1);
      expect(response.body.books[0].title).toBe('Book One');
    });

    it('should include chapters when requested', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          project_id: 'project-123',
          book_number: 1,
          title: 'Book One',
          status: 'planning',
          word_count: 50000,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockChapters = [
        {
          id: 'chapter-1',
          book_id: 'book-1',
          chapter_number: 1,
          title: 'Chapter One',
          status: 'complete',
          word_count: 5000,
        },
        {
          id: 'chapter-2',
          book_id: 'book-1',
          chapter_number: 2,
          title: 'Chapter Two',
          status: 'writing',
          word_count: 3000,
        },
      ];

      let callCount = 0;
      (mockDb.prepare.mockImplementation as any)(() => {
        callCount++;
        if (callCount === 1) {
          return { get: jest.fn().mockReturnValue(mockProject) };
        } else if (callCount === 2) {
          return { all: jest.fn().mockReturnValue(mockBooks) };
        } else {
          return { all: jest.fn().mockReturnValue(mockChapters) };
        }
      });

      const response = await request(app)
        .get('/api/projects/project-123?include=books,chapters')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.books).toBeDefined();
      expect(response.body.books[0].chapters).toBeDefined();
      expect(response.body.books[0].chapters.length).toBe(2);
      expect(response.body.books[0].chapters[0].title).toBe('Chapter One');
    });

    it('should return 500 on database error', async () => {
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database read error');
        }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .get('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/projects', () => {
    const validProjectData = {
      concept: {
        title: 'New Fantasy Novel',
        logline: 'A hero rises to save the kingdom',
        synopsis: 'An epic tale of courage and sacrifice',
      },
      preferences: {
        genre: 'Fantasy',
        subgenre: 'Epic Fantasy',
        tone: 'Dark',
        themes: ['redemption', 'power'],
        targetLength: 90000,
      },
    };

    it('should create project successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProjectData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('New Fantasy Novel');
      expect(response.body.type).toBe('standalone');
      expect(response.body.book_count).toBe(1);
      expect(response.body.status).toBe('setup');
    });

    it('should create trilogy project with correct book count', async () => {
      const trilogyData = {
        ...validProjectData,
        preferences: {
          ...validProjectData.preferences,
          projectType: 'trilogy',
        },
      };

      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trilogyData)
        .expect(201);

      expect(response.body.type).toBe('trilogy');
      expect(response.body.book_count).toBe(3);
    });

    it('should create series project with custom book count', async () => {
      const seriesData = {
        ...validProjectData,
        preferences: {
          ...validProjectData.preferences,
          projectType: 'series',
          bookCount: 5,
        },
      };

      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(seriesData)
        .expect(201);

      expect(response.body.type).toBe('series');
      expect(response.body.book_count).toBe(5);
    });

    it('should link to universe when universeId provided', async () => {
      const universeData = {
        ...validProjectData,
        preferences: {
          ...validProjectData.preferences,
          universeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      };

      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(universeData)
        .expect(201);

      expect(response.body.universe_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should create universe from source project', async () => {
      const sourceData = {
        ...validProjectData,
        preferences: {
          ...validProjectData.preferences,
          sourceProjectId: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      universeService.getOrCreateUniverse.mockReturnValue('universe-123');

      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sourceData)
        .expect(201);

      expect(universeService.getOrCreateUniverse).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001'
      );
      expect(response.body.universe_id).toBe('universe-123');
    });

    it('should handle time period settings', async () => {
      const timePeriodData = {
        ...validProjectData,
        preferences: {
          ...validProjectData.preferences,
          timePeriod: {
            type: 'past',
            year: 1850,
            description: 'Victorian Era',
          },
        },
      };

      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(timePeriodData)
        .expect(201);

      expect(response.body.time_period_type).toBe('past');
      expect(response.body.specific_year).toBe(1850);
    });

    it('should return 400 when concept is missing', async () => {
      const invalidData = {
        preferences: validProjectData.preferences,
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when concept title is missing', async () => {
      const invalidData = {
        concept: {
          logline: 'A hero rises',
        },
        preferences: validProjectData.preferences,
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when preferences are missing', async () => {
      const invalidData = {
        concept: validProjectData.concept,
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when genre is missing', async () => {
      const invalidData = {
        concept: validProjectData.concept,
        preferences: {
          subgenre: 'Epic Fantasy',
          tone: 'Dark',
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when concept title is too long', async () => {
      const invalidData = {
        concept: {
          title: 'A'.repeat(501), // Exceeds 500 character limit
          logline: 'A hero rises',
        },
        preferences: validProjectData.preferences,
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.issues).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database insert error');
        }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProjectData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Database insert error');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project title successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update project status successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'planning' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update story DNA successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const storyDNA = {
        theme: 'redemption',
        protagonist: 'Hero',
        conflict: 'internal',
      };

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storyDNA })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update story bible successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const storyBible = {
        characters: [{ name: 'Hero' }],
        world: [{ name: 'Kingdom' }],
      };

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storyBible })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update author name successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ authorName: 'John Doe' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update multiple fields simultaneously', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Title',
          status: 'writing',
          authorName: 'Jane Smith',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 when project not found', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 0 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Project not found');
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is too long', async () => {
      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'A'.repeat(501) })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is empty', async () => {
      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when author name is too long', async () => {
      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ authorName: 'A'.repeat(201) })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept null for author name', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ authorName: null })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['setup', 'planning', 'writing', 'editing', 'complete'];

      for (const status of validStatuses) {
        const mockStmt = {
          run: jest.fn().mockReturnValue({ changes: 1 }),
        };

        (mockDb.prepare as any).mockImplementation(() => mockStmt);

        const response = await request(app)
          .put('/api/projects/project-123')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should return 500 on database error', async () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database update error');
        }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Database update error');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      await request(app)
        .delete('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when project not found', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 0 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .delete('/api/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Project not found');
    });

    it('should return 500 on database error', async () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database delete error');
        }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .delete('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Database delete error');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will catch this before it reaches the route handler
      expect(response.status).toBe(400);
    });

    it('should handle missing Authorization header', async () => {
      // This test depends on the auth middleware implementation
      // Since we mocked it to always call next(), this test documents expected behavior
      // In production, this would return 401 Unauthorized
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      // With mocked auth, this passes. In production with real auth, it would be 401
      expect(response.status).toBe(200);
    });

    it('should handle concurrent modifications gracefully', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      // Simulate concurrent updates
      const update1 = request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Title 1' });

      const update2 = request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Title 2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle Unicode characters in title', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const unicodeData = {
        concept: {
          title: '龍の物語 - The Dragon Story',
          logline: 'A tale of ancient magic',
        },
        preferences: {
          genre: 'Fantasy',
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(unicodeData)
        .expect(201);

      expect(response.body.title).toBe('龍の物語 - The Dragon Story');
    });

    it('should handle special characters in title', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const specialCharData = {
        concept: {
          title: "The Hero's Journey: A Tale of <Courage> & \"Sacrifice\"",
          logline: 'A hero rises',
        },
        preferences: {
          genre: 'Fantasy',
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(specialCharData)
        .expect(201);

      expect(response.body.title).toContain('Courage');
    });

    it('should handle very large story bible objects', async () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ changes: 1 }),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const largeStoryBible = {
        characters: new Array(100).fill(null).map((_, i) => ({
          name: `Character ${i}`,
          backstory: 'Long backstory here'.repeat(10),
        })),
        world: new Array(50).fill(null).map((_, i) => ({
          name: `Location ${i}`,
          description: 'Detailed description'.repeat(10),
        })),
      };

      const response = await request(app)
        .put('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ storyBible: largeStoryBible })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid UUID format in universeId', async () => {
      const invalidData = {
        concept: {
          title: 'Test Project',
        },
        preferences: {
          genre: 'Fantasy',
          universeId: 'not-a-uuid',
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid UUID format in sourceProjectId', async () => {
      const invalidData = {
        concept: {
          title: 'Test Project',
        },
        preferences: {
          genre: 'Fantasy',
          sourceProjectId: 'invalid-uuid-format',
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle negative book count', async () => {
      const invalidData = {
        concept: {
          title: 'Test Project',
        },
        preferences: {
          genre: 'Fantasy',
          projectType: 'series',
          bookCount: -5,
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle zero book count', async () => {
      const invalidData = {
        concept: {
          title: 'Test Project',
        },
        preferences: {
          genre: 'Fantasy',
          projectType: 'series',
          bookCount: 0,
        },
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('JSON Parsing Edge Cases', () => {
    it('should handle null JSON fields in database', async () => {
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        type: 'standalone',
        genre: 'Fantasy',
        status: 'setup',
        book_count: 1,
        story_dna: null,
        story_bible: null,
        story_concept: null,
        plot_structure: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockProject),
        run: jest.fn(() => ({ changes: 0 })),
        all: jest.fn(() => []),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .get('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.story_dna).toBeNull();
      expect(response.body.story_bible).toBeNull();
      expect(response.body.story_concept).toBeNull();
      expect(response.body.plot_structure).toBeNull();
    });

    it('should handle empty string JSON fields', async () => {
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        type: 'standalone',
        genre: 'Fantasy',
        status: 'setup',
        book_count: 1,
        story_dna: '',
        story_bible: '',
        story_concept: '',
        plot_structure: '',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockProject),
        run: jest.fn(() => ({ changes: 0 })),
        all: jest.fn(() => []),
      };

      (mockDb.prepare as any).mockImplementation(() => mockStmt);

      const response = await request(app)
        .get('/api/projects/project-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Empty strings should be treated as null fallback
      expect(response.body.story_dna).toBeNull();
    });

    it('should handle corrupted JSON gracefully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          type: 'standalone',
          genre: 'Fantasy',
          status: 'setup',
          book_count: 1,
          story_bible: '{corrupted:json:data',
          plot_structure: '{"incomplete":',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      let callCount = 0;
      (mockDb.prepare.mockImplementation as any)(() => {
        callCount++;
        if (callCount === 1) {
          return {
            all: jest.fn().mockReturnValue(mockProjects),
            get: jest.fn(),
            run: jest.fn(),
          };
        } else {
          return {
            all: jest.fn(),
            get: jest.fn().mockReturnValue(null),
            run: jest.fn(),
          };
        }
      });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return null for corrupted JSON
      expect(response.body[0].story_bible).toBeNull();
      expect(response.body[0].plot_structure).toBeNull();
    });
  });
});
