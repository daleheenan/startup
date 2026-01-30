import { describe, it, expect } from '@jest/globals';
import {
  createProjectSchema,
  updateProjectSchema,
  createBookSchema,
  updateBookSchema,
  createChapterSchema,
  updateChapterSchema,
  generateConceptsSchema,
  validateRequest,
  validateUuid,
  uuidSchema,
  loginSchema,
  createLessonSchema,
  updateLessonSchema,
  chapterLockSchema,
} from '../schemas.js';

describe('schemas', () => {
  describe('createProjectSchema', () => {
    it('should validate valid project creation data', () => {
      // Arrange
      const validData = {
        concept: {
          title: 'The Dark Tower',
          logline: 'A gunslinger seeks the Dark Tower',
          synopsis: 'An epic journey across dimensions',
        },
        preferences: {
          genre: 'Fantasy',
          subgenre: 'Epic Fantasy',
          tone: 'Dark',
          themes: ['redemption', 'destiny'],
        },
      };

      // Act
      const result = createProjectSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      // Arrange
      const invalidData = {
        concept: {
          title: '',
          synopsis: 'A story',
        },
        preferences: {
          genre: 'Fantasy',
        },
      };

      // Act
      const result = createProjectSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title is required');
      }
    });

    it('should reject missing genre', () => {
      // Arrange
      const invalidData = {
        concept: {
          title: 'Test Novel',
        },
        preferences: {
          genre: '',
        },
      };

      // Act
      const result = createProjectSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      // Arrange
      const minimalData = {
        concept: {
          title: 'Minimal Novel',
        },
        preferences: {
          genre: 'Science Fiction',
        },
      };

      // Act
      const result = createProjectSchema.safeParse(minimalData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate project type enum', () => {
      // Arrange
      const validData = {
        concept: {
          title: 'Trilogy Book 1',
        },
        preferences: {
          genre: 'Fantasy',
          projectType: 'trilogy',
        },
      };

      // Act
      const result = createProjectSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid project type', () => {
      // Arrange
      const invalidData = {
        concept: {
          title: 'Test',
        },
        preferences: {
          genre: 'Fantasy',
          projectType: 'invalid-type',
        },
      };

      // Act
      const result = createProjectSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate time period structure', () => {
      // Arrange
      const dataWithTimePeriod = {
        concept: {
          title: 'Historical Novel',
        },
        preferences: {
          genre: 'Historical Fiction',
          timePeriod: {
            type: 'past',
            year: 1945,
            description: 'Post-WW2 era',
          },
        },
      };

      // Act
      const result = createProjectSchema.safeParse(dataWithTimePeriod);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('updateProjectSchema', () => {
    it('should validate update with storyDNA', () => {
      // Arrange
      const updateData = {
        storyDNA: {
          acts: [],
          themes: ['love', 'loss'],
        },
      };

      // Act
      const result = updateProjectSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate status update', () => {
      // Arrange
      const updateData = {
        status: 'planning',
      };

      // Act
      const result = updateProjectSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      // Arrange
      const invalidData = {
        status: 'invalid-status',
      };

      // Act
      const result = updateProjectSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject empty update object', () => {
      // Arrange
      const emptyData = {};

      // Act
      const result = updateProjectSchema.safeParse(emptyData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one field');
      }
    });

    it('should validate title update', () => {
      // Arrange
      const updateData = {
        title: 'Updated Title',
      };

      // Act
      const result = updateProjectSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject title that is too long', () => {
      // Arrange
      const updateData = {
        title: 'a'.repeat(501),
      };

      // Act
      const result = updateProjectSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('createBookSchema', () => {
    it('should validate valid book creation data', () => {
      // Arrange
      const validData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Book One: The Beginning',
        bookNumber: 1,
      };

      // Act
      const result = createBookSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      // Arrange
      const invalidData = {
        projectId: 'not-a-uuid',
        title: 'Test Book',
      };

      // Act
      const result = createBookSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should default bookNumber to 1', () => {
      // Arrange
      const dataWithoutBookNumber = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'First Book',
      };

      // Act
      const result = createBookSchema.safeParse(dataWithoutBookNumber);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookNumber).toBe(1);
      }
    });
  });

  describe('updateBookSchema', () => {
    it('should validate title update', () => {
      // Arrange
      const updateData = {
        title: 'Updated Book Title',
      };

      // Act
      const result = updateBookSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate word count update', () => {
      // Arrange
      const updateData = {
        wordCount: 75000,
      };

      // Act
      const result = updateBookSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject negative word count', () => {
      // Arrange
      const invalidData = {
        wordCount: -100,
      };

      // Act
      const result = updateBookSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('createChapterSchema', () => {
    it('should validate valid chapter creation data', () => {
      // Arrange
      const validData = {
        bookId: '550e8400-e29b-41d4-a716-446655440000',
        chapterNumber: 1,
        title: 'Chapter One',
      };

      // Act
      const result = createChapterSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject non-positive chapter number', () => {
      // Arrange
      const invalidData = {
        bookId: '550e8400-e29b-41d4-a716-446655440000',
        chapterNumber: 0,
      };

      // Act
      const result = createChapterSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept null title', () => {
      // Arrange
      const validData = {
        bookId: '550e8400-e29b-41d4-a716-446655440000',
        chapterNumber: 5,
        title: null,
      };

      // Act
      const result = createChapterSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('updateChapterSchema', () => {
    it('should validate content update', () => {
      // Arrange
      const updateData = {
        content: 'Chapter content goes here...',
      };

      // Act
      const result = updateChapterSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate status update', () => {
      // Arrange
      const updateData = {
        status: 'complete',
      };

      // Act
      const result = updateChapterSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      // Arrange
      const invalidData = {
        status: 'invalid',
      };

      // Act
      const result = updateChapterSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('generateConceptsSchema', () => {
    it('should validate with single genre and tone', () => {
      // Arrange
      const validData = {
        preferences: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: ['redemption', 'power'],
          targetLength: 80000,
        },
        count: 5,
      };

      // Act
      const result = generateConceptsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate with genres array', () => {
      // Arrange
      const validData = {
        preferences: {
          genres: ['Fantasy', 'Science Fiction'],
          tone: 'Epic',
          themes: ['exploration'],
          targetLength: '90000',
        },
      };

      // Act
      const result = generateConceptsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate with tones array', () => {
      // Arrange
      const validData = {
        preferences: {
          genre: 'Mystery',
          tones: ['Suspenseful', 'Dark'],
          themes: ['justice'],
          targetLength: 70000,
        },
      };

      // Act
      const result = generateConceptsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject when no genre or genres provided', () => {
      // Arrange
      const invalidData = {
        preferences: {
          tone: 'Dark',
          themes: ['love'],
          targetLength: 80000,
        },
      };

      // Act
      const result = generateConceptsSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when themes array is empty', () => {
      // Arrange
      const invalidData = {
        preferences: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: [],
          targetLength: 80000,
        },
      };

      // Act
      const result = generateConceptsSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should default count to 5', () => {
      // Arrange
      const validData = {
        preferences: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: ['magic'],
          targetLength: 80000,
        },
      };

      // Act
      const result = generateConceptsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
      }
    });

    it('should accept count up to 10', () => {
      // Arrange
      const validData = {
        preferences: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: ['magic'],
          targetLength: 80000,
        },
        count: 10,
      };

      // Act
      const result = generateConceptsSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject count over 10', () => {
      // Arrange
      const invalidData = {
        preferences: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: ['magic'],
          targetLength: 80000,
        },
        count: 11,
      };

      // Act
      const result = generateConceptsSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate password', () => {
      // Arrange
      const validData = {
        password: 'securePassword123',
      };

      // Act
      const result = loginSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      // Arrange
      const invalidData = {
        password: '',
      };

      // Act
      const result = loginSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = loginSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('createLessonSchema', () => {
    it('should validate valid lesson creation data', () => {
      // Arrange
      const validData = {
        agent_type: 'writer',
        scope: 'dialogue',
        category: 'technique',
        title: 'Natural dialogue flow',
        content: 'Avoid on-the-nose dialogue',
        context: 'Chapter 5 dialogue improvements',
        tags: ['dialogue', 'naturalness'],
      };

      // Act
      const result = createLessonSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      // Arrange
      const invalidData = {
        agent_type: 'writer',
        scope: 'dialogue',
        category: 'invalid-category',
        title: 'Test',
        content: 'Test content',
      };

      // Act
      const result = createLessonSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      // Arrange
      const minimalData = {
        agent_type: 'writer',
        scope: 'prose',
        category: 'pattern',
        title: 'Show dont tell',
        content: 'Use sensory details',
      };

      // Act
      const result = createLessonSchema.safeParse(minimalData);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('updateLessonSchema', () => {
    it('should validate lesson update', () => {
      // Arrange
      const updateData = {
        title: 'Updated title',
        content: 'Updated content',
      };

      // Act
      const result = updateLessonSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
      // Arrange
      const emptyData = {};

      // Act
      const result = updateLessonSchema.safeParse(emptyData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('chapterLockSchema', () => {
    it('should validate boolean true', () => {
      // Arrange
      const validData = {
        isLocked: true,
      };

      // Act
      const result = chapterLockSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate boolean false', () => {
      // Arrange
      const validData = {
        isLocked: false,
      };

      // Act
      const result = chapterLockSchema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean value', () => {
      // Arrange
      const invalidData = {
        isLocked: 'true',
      };

      // Act
      const result = chapterLockSchema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('should return success for valid data', () => {
      // Arrange
      const data = {
        password: 'test123',
      };

      // Act
      const result = validateRequest(loginSchema, data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('test123');
      }
    });

    it('should return error for invalid data', () => {
      // Arrange
      const data = {
        password: '',
      };

      // Act
      const result = validateRequest(loginSchema, data);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('Request validation failed');
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues!.length).toBeGreaterThan(0);
      }
    });

    it('should include Zod issues in error response', () => {
      // Arrange
      const data = {};

      // Act
      const result = validateRequest(loginSchema, data);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toBeDefined();
      }
    });
  });

  describe('validateUuid', () => {
    it('should return true for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const result = validateUuid(validUuid);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      // Arrange
      const invalidUuid = 'not-a-uuid';

      // Act
      const result = validateUuid(invalidUuid);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      // Arrange
      const emptyString = '';

      // Act
      const result = validateUuid(emptyString);

      // Assert
      expect(result).toBe(false);
    });

    it('should accept custom field name', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const result = validateUuid(validUuid, 'projectId');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('uuidSchema', () => {
    it('should validate valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const result = uuidSchema.safeParse(validUuid);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      // Arrange
      const invalidUuid = '550e8400-e29b-41d4-a716';

      // Act
      const result = uuidSchema.safeParse(invalidUuid);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
