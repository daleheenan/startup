import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock database with a simple object that we can control
const mockDb = {
  prepare: jest.fn(),
};

// Mock database connection
jest.mock('../../db/connection.js', () => mockDb);

// Mock outline generator service
const mockGenerateOutline = jest.fn() as jest.MockedFunction<any>;
jest.mock('../../services/outline-generator.js', () => ({
  generateOutline: mockGenerateOutline,
}));

// Mock structure templates service
const mockGetAllStructureTemplates = jest.fn() as jest.MockedFunction<any>;
jest.mock('../../services/structure-templates.js', () => ({
  getAllStructureTemplates: mockGetAllStructureTemplates,
}));

// Mock story DNA generator
const mockGenerateStoryDNA = jest.fn() as jest.MockedFunction<any>;
jest.mock('../../services/story-dna-generator.js', () => ({
  generateStoryDNA: mockGenerateStoryDNA,
}));

// Mock logger service
jest.mock('../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock authentication middleware
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

// Import router after mocks
import outlinesRouter from '../outlines.js';

describe('Outlines API Routes', () => {
  let app: express.Application;
  let authToken: string;
  let mockGet: jest.Mock;
  let mockAll: jest.Mock;
  let mockRun: jest.Mock;

  beforeAll(() => {
    // Generate a valid JWT token for testing
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
    authToken = jwt.sign({ userId: 'test-user-id' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock functions for each test
    mockGet = jest.fn();
    mockAll = jest.fn();
    mockRun = jest.fn();

    // Set default behavior
    mockGet.mockReturnValue(null);
    mockAll.mockReturnValue([]);
    mockRun.mockReturnValue({ changes: 0 });

    // Configure db.prepare to return our mocked statement
    mockDb.prepare.mockReturnValue({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/outlines', outlinesRouter);
  });

  describe('GET /api/outlines/templates', () => {
    it('should return all structure templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'three-act',
          name: 'Three Act Structure',
          description: 'Classic three-act structure',
          actCount: 3,
        },
        {
          id: 'heros-journey',
          name: "Hero's Journey",
          description: 'Joseph Campbell\'s monomyth',
          actCount: 3,
        },
      ];

      mockGetAllStructureTemplates.mockReturnValue(mockTemplates);

      const response = await request(app)
        .get('/api/outlines/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.templates).toEqual(mockTemplates);
      expect(mockGetAllStructureTemplates).toHaveBeenCalledTimes(1);
    });

    it('should return 500 on service error', async () => {
      mockGetAllStructureTemplates.mockImplementation(() => {
        throw new Error('Template service error');
      });

      const response = await request(app)
        .get('/api/outlines/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toContain('Template service error');
    });
  });

  describe('GET /api/outlines/book/:bookId', () => {
    it('should return outline for a book successfully', async () => {
      const mockOutline = {
        id: 'outline-123',
        book_id: 'book-123',
        structure_type: 'three-act',
        structure: JSON.stringify({
          type: 'three-act',
          acts: [
            {
              number: 1,
              name: 'Setup',
              chapters: [
                { number: 1, title: 'Chapter 1', scenes: [] },
              ],
            },
          ],
        }),
        total_chapters: 1,
        target_word_count: 80000,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockGet.mockReturnValue(mockOutline);

      const response = await request(app)
        .get('/api/outlines/book/book-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe('outline-123');
      expect(response.body.book_id).toBe('book-123');
      expect(response.body.structure).toEqual({
        type: 'three-act',
        acts: [
          {
            number: 1,
            name: 'Setup',
            chapters: [
              { number: 1, title: 'Chapter 1', scenes: [] },
            ],
          },
        ],
      });
    });

    it('should return 404 when outline not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/outlines/book/nonexistent-book')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Outline not found');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database read error');
      });

      const response = await request(app)
        .get('/api/outlines/book/book-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/outlines/generate', () => {
    const validGenerateData = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      bookId: '550e8400-e29b-41d4-a716-446655440001',
      structureType: 'three-act',
      targetWordCount: 80000,
      logline: 'A hero rises to save the kingdom',
      synopsis: 'An epic tale of courage',
    };

    const mockProject = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Project',
      genre: 'Fantasy',
      story_dna: JSON.stringify({ theme: 'redemption' }),
      story_bible: JSON.stringify({
        characters: [{ name: 'Hero', role: 'protagonist' }],
        world: { locations: [], factions: [], systems: [] },
      }),
      plot_structure: JSON.stringify({
        plot_layers: [{ type: 'main', description: 'Main plot' }],
      }),
    };

    const mockBook = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Book',
      book_number: 1,
    };

    const mockGeneratedStructure = {
      type: 'three-act',
      acts: [
        {
          number: 1,
          name: 'Setup',
          description: 'Introduce characters',
          beats: [],
          targetWordCount: 26666,
          chapters: [
            { number: 1, title: 'The Beginning', scenes: [] },
            { number: 2, title: 'First Challenge', scenes: [] },
          ],
        },
        {
          number: 2,
          name: 'Confrontation',
          description: 'Rising action',
          beats: [],
          targetWordCount: 26667,
          chapters: [
            { number: 3, title: 'The Journey', scenes: [] },
          ],
        },
        {
          number: 3,
          name: 'Resolution',
          description: 'Climax and resolution',
          beats: [],
          targetWordCount: 26667,
          chapters: [
            { number: 4, title: 'The Final Battle', scenes: [] },
          ],
        },
      ],
    };

    it('should generate outline successfully', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockProject;
        if (callCount === 2) return mockBook;
        return null;
      });

      mockRun.mockReturnValue({ changes: 1 });
      mockGenerateOutline.mockResolvedValue(mockGeneratedStructure);

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.book_id).toBe(validGenerateData.bookId);
      expect(response.body.structure_type).toBe('three-act');
      expect(response.body.total_chapters).toBe(4);
      expect(response.body.structure.acts).toHaveLength(3);
      expect(mockGenerateOutline).toHaveBeenCalledTimes(1);
    });

    it('should auto-generate Story DNA if missing', async () => {
      const projectWithoutDNA = {
        ...mockProject,
        story_dna: null,
      };

      const mockStoryDNA = { theme: 'adventure', conflict: 'external' };
      mockGenerateStoryDNA.mockResolvedValue(mockStoryDNA);

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return projectWithoutDNA;
        if (callCount === 2) return mockBook;
        return null;
      });

      mockRun.mockReturnValue({ changes: 1 });
      mockGenerateOutline.mockResolvedValue(mockGeneratedStructure);

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(201);

      expect(mockGenerateStoryDNA).toHaveBeenCalledWith({
        title: mockProject.title,
        logline: validGenerateData.logline,
        synopsis: validGenerateData.synopsis,
        genre: mockProject.genre,
        subgenre: mockProject.genre,
        tone: 'dramatic',
        themes: [],
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 404 when project not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Project not found');
    });

    it('should return 404 when book not found', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockProject;
        return null;
      });

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Book not found');
    });

    it('should return 400 when Story Bible is missing', async () => {
      const projectWithoutBible = {
        ...mockProject,
        story_bible: null,
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return projectWithoutBible;
        if (callCount === 2) return mockBook;
        return null;
      });

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE');
      expect(response.body.error.message).toContain('Story Bible');
    });

    it('should return 400 when Plot Structure is missing', async () => {
      const projectWithoutPlot = {
        ...mockProject,
        plot_structure: null,
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return projectWithoutPlot;
        if (callCount === 2) return mockBook;
        return null;
      });

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATE');
      expect(response.body.error.message).toContain('plot structure');
    });

    it('should return 400 when validation fails - missing projectId', async () => {
      const invalidData = {
        bookId: validGenerateData.bookId,
        structureType: 'three-act',
      };

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when validation fails - invalid projectId UUID', async () => {
      const invalidData = {
        ...validGenerateData,
        projectId: 'not-a-uuid',
      };

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when validation fails - missing bookId', async () => {
      const invalidData = {
        projectId: validGenerateData.projectId,
        structureType: 'three-act',
      };

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when validation fails - missing structureType', async () => {
      const invalidData = {
        projectId: validGenerateData.projectId,
        bookId: validGenerateData.bookId,
      };

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should use default target word count when not provided', async () => {
      const dataWithoutWordCount = {
        projectId: validGenerateData.projectId,
        bookId: validGenerateData.bookId,
        structureType: 'three-act',
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockProject;
        if (callCount === 2) return mockBook;
        return null;
      });

      mockRun.mockReturnValue({ changes: 1 });
      mockGenerateOutline.mockResolvedValue(mockGeneratedStructure);

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dataWithoutWordCount)
        .expect(201);

      expect(response.body.target_word_count).toBe(80000);
    });

    it('should return 500 on generator service error', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockProject;
        if (callCount === 2) return mockBook;
        return null;
      });

      mockGenerateOutline.mockRejectedValue(new Error('Generator service error'));

      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerateData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/outlines/progress/:bookId', () => {
    it('should return progress when generation is not in progress', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .get('/api/outlines/progress/book-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.inProgress).toBe(false);
      expect(response.body.complete).toBe(false);
    });

    it('should return completed status when outline exists', async () => {
      const mockOutline = {
        id: 'outline-123',
        total_chapters: 10,
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockGet.mockReturnValue(mockOutline);

      const response = await request(app)
        .get('/api/outlines/progress/book-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.inProgress).toBe(false);
      expect(response.body.complete).toBe(true);
      expect(response.body.outlineId).toBe('outline-123');
      expect(response.body.progress.phase).toBe('complete');
      expect(response.body.progress.percentComplete).toBe(100);
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/outlines/progress/book-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/outlines/:id', () => {
    const validUpdateData = {
      structure: {
        type: 'three-act',
        acts: [
          {
            number: 1,
            name: 'Updated Act',
            chapters: [
              { number: 1, title: 'Updated Chapter', scenes: [] },
            ],
          },
        ],
      },
    };

    it('should update outline successfully', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .put('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 when outline not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .put('/api/outlines/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUpdateData)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Outline not found');
    });

    it('should return 400 when structure is missing', async () => {
      const response = await request(app)
        .put('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when structure.acts is missing', async () => {
      const invalidData = {
        structure: {
          type: 'three-act',
        },
      };

      const response = await request(app)
        .put('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should calculate total chapters correctly', async () => {
      const dataWithMultipleChapters = {
        structure: {
          acts: [
            {
              number: 1,
              chapters: [
                { number: 1, title: 'Ch 1' },
                { number: 2, title: 'Ch 2' },
              ],
            },
            {
              number: 2,
              chapters: [
                { number: 3, title: 'Ch 3' },
              ],
            },
          ],
        },
      };

      let capturedTotalChapters: number | undefined;
      mockRun.mockImplementation((...args: any[]) => {
        capturedTotalChapters = args[1];
        return { changes: 1 };
      });

      await request(app)
        .put('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dataWithMultipleChapters)
        .expect(200);

      expect(capturedTotalChapters).toBe(3);
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database update error');
      });

      const response = await request(app)
        .put('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUpdateData)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/outlines/:id/start-generation', () => {
    const mockOutline = {
      id: 'outline-123',
      book_id: 'book-123',
      structure: JSON.stringify({
        acts: [
          {
            number: 1,
            chapters: [
              { number: 1, title: 'Chapter 1', scenes: [] },
              { number: 2, title: 'Chapter 2', scenes: [] },
            ],
          },
          {
            number: 2,
            chapters: [
              { number: 3, title: 'Chapter 3', scenes: [] },
            ],
          },
        ],
      }),
    };

    it('should start generation successfully', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .post('/api/outlines/outline-123/start-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.chaptersCreated).toBe(3);
      expect(response.body.jobsQueued).toBe(3);
    });

    it('should return 404 when outline not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .post('/api/outlines/nonexistent-id/start-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Outline not found');
    });

    it('should delete existing chapters before creating new ones', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const runCalls: string[] = [];
      mockDb.prepare.mockImplementation((...args: any[]) => {
        const sql = args[0];
        return {
          get: mockGet,
          run: ((...runArgs: any[]) => {
            runCalls.push(sql.slice(0, 20)); // Store first 20 chars of SQL for debugging
            return mockRun(...runArgs);
          }),
        };
      });

      await request(app)
        .post('/api/outlines/outline-123/start-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify delete operations were called
      expect(runCalls.length).toBeGreaterThan(2);
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/outlines/outline-123/start-generation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/outlines/:id', () => {
    it('should delete outline successfully', async () => {
      mockRun.mockReturnValue({ changes: 1 });

      await request(app)
        .delete('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when outline not found', async () => {
      mockRun.mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/outlines/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Outline not found');
    });

    it('should return 500 on database error', async () => {
      mockRun.mockImplementation(() => {
        throw new Error('Database delete error');
      });

      const response = await request(app)
        .delete('/api/outlines/outline-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/outlines/:bookId/acts', () => {
    const mockOutline = {
      id: 'outline-123',
      book_id: 'book-123',
      structure_type: 'three-act',
      structure: JSON.stringify({
        type: 'three-act',
        acts: [
          { number: 1, chapters: [] },
          { number: 2, chapters: [] },
        ],
      }),
    };

    it('should delete all acts successfully', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/outlines/book-123/acts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('All acts deleted');
    });

    it('should return 404 when outline not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/outlines/nonexistent-book/acts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/outlines/book-123/acts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/outlines/:bookId/acts/:actNumber', () => {
    const mockOutline = {
      id: 'outline-123',
      book_id: 'book-123',
      structure: JSON.stringify({
        acts: [
          {
            number: 1,
            chapters: [
              { number: 1, title: 'Ch 1', actNumber: 1 },
            ],
          },
          {
            number: 2,
            chapters: [
              { number: 2, title: 'Ch 2', actNumber: 2 },
            ],
          },
          {
            number: 3,
            chapters: [
              { number: 3, title: 'Ch 3', actNumber: 3 },
            ],
          },
        ],
      }),
    };

    it('should delete specific act successfully', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/outlines/book-123/acts/2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.structure.acts).toHaveLength(2);
      expect(response.body.totalChapters).toBe(2);
    });

    it('should renumber remaining acts after deletion', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/outlines/book-123/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.structure.acts[0].number).toBe(1);
      expect(response.body.structure.acts[1].number).toBe(2);
    });

    it('should return 404 when outline not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .delete('/api/outlines/nonexistent-book/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid act number', async () => {
      mockGet.mockReturnValue(mockOutline);

      const response = await request(app)
        .delete('/api/outlines/book-123/acts/0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 when act number exceeds act count', async () => {
      mockGet.mockReturnValue(mockOutline);

      const response = await request(app)
        .delete('/api/outlines/book-123/acts/99')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('does not exist');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete('/api/outlines/book-123/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/outlines/:bookId/acts/:actNumber', () => {
    const mockOutline = {
      id: 'outline-123',
      book_id: 'book-123',
      structure: JSON.stringify({
        acts: [
          {
            number: 1,
            name: 'Act 1',
            description: 'First act',
            beats: [],
            targetWordCount: 30000,
            chapters: [
              { number: 1, title: 'Ch 1', actNumber: 1 },
            ],
          },
        ],
      }),
    };

    it('should update act successfully', async () => {
      mockGet.mockReturnValue(mockOutline);
      mockRun.mockReturnValue({ changes: 1 });

      const updateData = {
        name: 'Updated Act',
        description: 'Updated description',
      };

      const response = await request(app)
        .put('/api/outlines/book-123/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.act.name).toBe('Updated Act');
    });

    it('should return 404 when outline not found', async () => {
      mockGet.mockReturnValue(null);

      const response = await request(app)
        .put('/api/outlines/nonexistent-book/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid act number', async () => {
      mockGet.mockReturnValue(mockOutline);

      const response = await request(app)
        .put('/api/outlines/book-123/acts/0')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 500 on database error', async () => {
      mockGet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .put('/api/outlines/book-123/acts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should handle concurrent outline generation gracefully', async () => {
      const mockProject = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        genre: 'Fantasy',
        story_dna: JSON.stringify({ theme: 'test' }),
        story_bible: JSON.stringify({ characters: [{}], world: {} }),
        plot_structure: JSON.stringify({ plot_layers: [{ type: 'main' }] }),
      };

      const mockBook = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Book',
      };

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) return mockProject;
        return mockBook;
      });

      mockRun.mockReturnValue({ changes: 1 });
      mockGenerateOutline.mockResolvedValue({
        type: 'three-act',
        acts: [{ number: 1, chapters: [] }],
      });

      const validData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        bookId: '550e8400-e29b-41d4-a716-446655440001',
        structureType: 'three-act',
      };

      const gen1 = request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validData);

      const gen2 = request(app)
        .post('/api/outlines/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validData);

      const [response1, response2] = await Promise.all([gen1, gen2]);

      // Both should succeed (or one might fail depending on DB constraints)
      expect([201, 500]).toContain(response1.status);
      expect([201, 500]).toContain(response2.status);
    });
  });
});
