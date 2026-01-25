import { z } from 'zod';

/**
 * Centralized Zod validation schemas for API requests
 * Provides type-safe validation with detailed error messages
 */

// ============================================================================
// PROJECTS
// ============================================================================

export const createProjectSchema = z.object({
  concept: z.object({
    title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
    logline: z.string().optional(),
    synopsis: z.string().optional(),
  }),
  preferences: z.object({
    genre: z.string().min(1, 'Genre is required'),
    subgenre: z.string().optional(),
    tone: z.string().optional(),
    themes: z.array(z.string()).optional(),
    projectType: z.enum(['standalone', 'trilogy', 'series']).optional(),
    bookCount: z.number().int().positive().optional(),
    universeId: z.string().uuid().optional(),
    sourceProjectId: z.string().uuid().optional(),
  }),
});

export const updateProjectSchema = z.object({
  storyDNA: z.any().optional(), // Complex nested object, validate structure separately
  storyBible: z.any().optional(), // Complex nested object, validate structure separately
  status: z.enum(['setup', 'planning', 'writing', 'editing', 'complete']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ============================================================================
// BOOKS
// ============================================================================

export const createBookSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  bookNumber: z.number().int().positive().optional().default(1),
});

export const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['setup', 'planning', 'writing', 'editing', 'complete']).optional(),
  wordCount: z.number().int().nonnegative().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ============================================================================
// CHAPTERS
// ============================================================================

export const createChapterSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  chapterNumber: z.number().int().positive('Chapter number must be positive'),
  title: z.string().max(500, 'Title too long').optional().nullable(),
  sceneCards: z.array(z.any()).optional(), // Complex nested structure
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  status: z.enum(['pending', 'planning', 'writing', 'editing', 'complete']).optional(),
  wordCount: z.number().int().nonnegative().optional(),
  sceneCards: z.array(z.any()).optional(),
  flags: z.array(z.any()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ============================================================================
// CONCEPTS
// ============================================================================

export const generateConceptsSchema = z.object({
  preferences: z.object({
    genre: z.string().optional(),
    genres: z.array(z.string()).optional(),
    subgenre: z.string().optional(),
    subgenres: z.array(z.string()).optional(),
    tone: z.string().min(1, 'Tone is required'),
    themes: z.array(z.string()).min(1, 'At least one theme is required'),
    targetLength: z.string().min(1, 'Target length is required'),
  }).refine(
    data => data.genre || (data.genres && data.genres.length > 0),
    { message: 'Genre or genres array is required' }
  ).refine(
    data => data.subgenre || (data.subgenres && data.subgenres.length > 0),
    { message: 'Subgenre or subgenres array is required' }
  ),
});

export const refineConceptsSchema = z.object({
  preferences: z.any(), // Same as above
  existingConcepts: z.array(z.any()).min(1, 'At least one existing concept required'),
  feedback: z.string().min(1, 'Feedback cannot be empty'),
});

// ============================================================================
// CHARACTERS
// ============================================================================

export const generateCharactersSchema = z.object({
  context: z.object({
    synopsis: z.string().optional(),
    genre: z.string().optional(),
    subgenre: z.string().optional(),
    tone: z.string().optional(),
    themes: z.array(z.string()).optional(),
  }),
});

export const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  backstory: z.string().optional(),
  personality: z.array(z.string()).optional(),
  ethnicity: z.string().optional(),
  nationality: z.string().optional(),
  relationships: z.array(z.any()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ============================================================================
// WORLD ELEMENTS
// ============================================================================

export const generateWorldSchema = z.object({
  context: z.object({
    synopsis: z.string().optional(),
    genre: z.string().optional(),
    themes: z.array(z.string()).optional(),
  }),
});

export const updateWorldElementSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  description: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns validated data or sends error response
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: { code: string; message: string; issues?: z.ZodIssue[] } } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: result.error.issues,
      },
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Validate UUID parameter
 */
export function validateUuid(value: string, fieldName: string = 'id'): boolean {
  return uuidSchema.safeParse(value).success;
}

// ============================================================================
// CHAPTER CONTENT
// ============================================================================

export const updateChapterContentSchema = z.object({
  content: z.string(),
}).refine(data => data.content !== undefined, {
  message: 'Content is required',
});

// ============================================================================
// GENERATION
// ============================================================================

export const startBookGenerationSchema = z.object({
  bookId: z.string().uuid('Invalid book ID').optional(),
});

// ============================================================================
// EDITING
// ============================================================================

export const editChapterContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  isLocked: z.boolean().optional(),
  editNotes: z.string().optional(),
});

export const chapterLockSchema = z.object({
  isLocked: z.boolean({ message: 'isLocked must be a boolean' }),
});

export const runEditorSchema = z.object({
  editorType: z.enum(['developmental', 'line', 'continuity', 'copy']),
});

// ============================================================================
// TRILOGY
// ============================================================================

export const createTransitionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  fromBookId: z.string().uuid('Invalid from book ID'),
  toBookId: z.string().uuid('Invalid to book ID'),
  timeGap: z.string().min(1, 'Time gap is required'),
});

export const convertToTrilogySchema = z.object({
  bookTitles: z.array(z.string().min(1)).min(2, 'Provide at least 2 book titles'),
});

// ============================================================================
// OUTLINES
// ============================================================================

export const generateOutlineSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  bookId: z.string().uuid('Invalid book ID'),
  structureType: z.string().min(1, 'Structure type is required'),
  targetWordCount: z.number().int().positive().optional().default(80000),
  logline: z.string().optional(),
  synopsis: z.string().optional(),
});

export const updateOutlineSchema = z.object({
  structure: z.object({
    acts: z.array(z.any()),
  }).refine(data => data.acts && Array.isArray(data.acts), {
    message: 'Structure must have an acts array',
  }),
});

// ============================================================================
// QUEUE
// ============================================================================

export const createQueueJobSchema = z.object({
  type: z.string().min(1, 'Job type is required'),
  targetId: z.string().min(1, 'Target ID is required'),
});

// ============================================================================
// AUTH
// ============================================================================

export const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// LESSONS
// ============================================================================

export const createLessonSchema = z.object({
  agent_type: z.string().min(1, 'Agent type is required'),
  scope: z.string().min(1, 'Scope is required'),
  category: z.enum(['technique', 'pitfall', 'pattern', 'preference', 'correction']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['technique', 'pitfall', 'pattern', 'preference', 'correction']).optional(),
  scope: z.string().min(1).optional(),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const updateLessonScoreSchema = z.object({
  increment: z.number({ message: 'increment must be a number' }),
});

export const pruneLessonsSchema = z.object({
  threshold: z.number().optional().default(-2),
});

// ============================================================================
// REFLECTIONS
// ============================================================================

export const createReflectionSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  agent_type: z.string().min(1, 'Agent type is required'),
  chapter_id: z.string().optional(),
  project_id: z.string().optional(),
  reflection: z.string().min(1, 'Reflection is required'),
});

export const promoteReflectionSchema = z.object({
  lesson_id: z.string().min(1, 'Lesson ID is required'),
});

// ============================================================================
// MYSTERIES
// ============================================================================

export const extractMysteriesSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

export const updateMysterySchema = z.object({
  status: z.enum(['open', 'resolved', 'red_herring']),
  answer: z.string().optional(),
  answeredBook: z.number().int().positive().optional(),
  answeredChapter: z.number().int().positive().optional(),
});

// ============================================================================
// UNIVERSES
// ============================================================================

export const createUniverseSchema = z.object({
  sourceProjectId: z.string().uuid('Invalid source project ID'),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const linkProjectToUniverseSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

// ============================================================================
// PRESETS
// ============================================================================

export const createPresetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  genres: z.array(z.string()).min(1, 'At least one genre is required'),
  subgenres: z.array(z.string()).min(1, 'At least one subgenre is required'),
  modifiers: z.array(z.string()).optional().default([]),
  tones: z.array(z.string()).optional().default([]),
  themes: z.array(z.string()).optional().default([]),
  customTheme: z.string().optional(),
  targetLength: z.number().int().positive().optional().default(80000),
});

export const updatePresetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  genres: z.array(z.string()).min(1, 'At least one genre is required'),
  subgenres: z.array(z.string()).min(1, 'At least one subgenre is required'),
  modifiers: z.array(z.string()).optional().default([]),
  tones: z.array(z.string()).optional().default([]),
  themes: z.array(z.string()).optional().default([]),
  customTheme: z.string().optional(),
  targetLength: z.number().int().positive().optional().default(80000),
});

// ============================================================================
// ANALYTICS
// ============================================================================

// Note: Analytics routes primarily use URL parameters and don't have complex request bodies
// The analyze endpoints don't require body validation as they fetch data from the database

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type GenerateConceptsInput = z.infer<typeof generateConceptsSchema>;
export type RefineConceptsInput = z.infer<typeof refineConceptsSchema>;
export type GenerateCharactersInput = z.infer<typeof generateCharactersSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type GenerateWorldInput = z.infer<typeof generateWorldSchema>;
export type UpdateWorldElementInput = z.infer<typeof updateWorldElementSchema>;
export type EditChapterContentInput = z.infer<typeof editChapterContentSchema>;
export type ChapterLockInput = z.infer<typeof chapterLockSchema>;
export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;
export type ConvertToTrilogyInput = z.infer<typeof convertToTrilogySchema>;
export type GenerateOutlineInput = z.infer<typeof generateOutlineSchema>;
export type UpdateOutlineInput = z.infer<typeof updateOutlineSchema>;
export type CreateQueueJobInput = z.infer<typeof createQueueJobSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type PromoteReflectionInput = z.infer<typeof promoteReflectionSchema>;
export type ExtractMysteriesInput = z.infer<typeof extractMysteriesSchema>;
export type UpdateMysteryInput = z.infer<typeof updateMysterySchema>;
export type CreateUniverseInput = z.infer<typeof createUniverseSchema>;
export type LinkProjectToUniverseInput = z.infer<typeof linkProjectToUniverseSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
