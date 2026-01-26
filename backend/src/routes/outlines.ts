import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Outline, StoryStructure, Project, Book, StoryStructureType } from '../shared/types/index.js';
import { generateOutline, type OutlineContext, type OutlineProgress } from '../services/outline-generator.js';
import { getAllStructureTemplates } from '../services/structure-templates.js';
import { generateStoryDNA } from '../services/story-dna-generator.js';
import { createLogger } from '../services/logger.service.js';
import {
  generateOutlineSchema,
  updateOutlineSchema,
  validateRequest,
  type GenerateOutlineInput,
  type UpdateOutlineInput,
} from '../utils/schemas.js';

// In-memory progress store for outline generation
// Key: bookId, Value: progress info
const outlineProgressStore = new Map<string, {
  progress: OutlineProgress;
  outlineId: string;
  updatedAt: Date;
}>();

// Clean up old progress entries every 30 minutes
setInterval(() => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  for (const [key, value] of outlineProgressStore.entries()) {
    if (value.updatedAt < thirtyMinutesAgo) {
      outlineProgressStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch {
    return fallback;
  }
}

const router = Router();
const logger = createLogger('routes:outlines');

/**
 * GET /api/outlines/templates
 * Get all available structure templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = getAllStructureTemplates();
    res.json({ templates });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching templates');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/outlines/book/:bookId
 * Get outline for a specific book
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const stmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE book_id = ?
    `);

    const outline = stmt.get(req.params.bookId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    // Parse JSON structure
    const parsedOutline = {
      ...outline,
      structure: JSON.parse(outline.structure as any),
    };

    res.json(parsedOutline);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching outline');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/outlines/generate
 * Generate a new outline for a book
 */
router.post('/generate', async (req, res) => {
  try {
    const validation = validateRequest(generateOutlineSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { projectId, bookId, structureType, targetWordCount, logline, synopsis } = validation.data;

    // Get project data
    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Get book data
    const bookStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    // Parse project data
    let storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);
    const plotStructure = safeJsonParse(project.plot_structure as any, null);

    // Auto-generate Story DNA if it doesn't exist
    if (!storyDNA) {
      logger.info({ projectId }, 'No Story DNA found, auto-generating...');
      storyDNA = await generateStoryDNA({
        title: project.title,
        logline: logline || synopsis || project.title,
        synopsis: synopsis || logline || 'A compelling story',
        genre: project.genre,
        subgenre: project.genre,
        tone: 'dramatic',
        themes: [],
      });

      // Save Story DNA immediately
      const dnaStmt = db.prepare(`
        UPDATE projects SET story_dna = ?, updated_at = ? WHERE id = ?
      `);
      dnaStmt.run(JSON.stringify(storyDNA), new Date().toISOString(), projectId);
      logger.info({ projectId }, 'Story DNA auto-generated and saved');
    }

    // Check Story Bible - it must have characters or world elements
    if (!storyBible || (!storyBible.characters?.length && !storyBible.world)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Project must have Story Bible with characters or world elements before generating outline. Please generate characters first.',
        },
      });
    }

    // Check Plot Structure - require at least a main plot for quality novel generation
    const hasMainPlot = plotStructure?.plot_layers?.some((layer: any) => layer.type === 'main');
    if (!plotStructure || !plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Project must have plot structure before generating outline. Please define your plots on the Plot page first. This ensures your novel has coherent, well-developed storylines.',
        },
      });
    }

    if (!hasMainPlot) {
      logger.warn({ projectId }, 'No main plot defined - outline may lack narrative focus');
    }

    // Create outline ID upfront for progress tracking
    const outlineId = randomUUID();
    const now = new Date().toISOString();

    // Build outline context with progress tracking and incremental saving
    const context: OutlineContext = {
      concept: {
        title: book.title,
        logline: logline || project.title,
        synopsis: synopsis || '',
      },
      storyDNA,
      characters: storyBible.characters || [],
      world: storyBible.world || { locations: [], factions: [], systems: [] },
      structureType: structureType as StoryStructureType,
      targetWordCount: targetWordCount || 80000,
      plotStructure, // Include plot structure for coherent outline generation

      // Progress callback - store progress for polling
      onProgress: (progress) => {
        outlineProgressStore.set(bookId, {
          progress,
          outlineId,
          updatedAt: new Date(),
        });
      },

      // Incremental save - save partial outline to DB for failsafe recovery
      onIncrementalSave: async (partialStructure) => {
        try {
          // Renumber chapters before saving
          let chapterNum = 1;
          for (const act of partialStructure.acts) {
            for (const chapter of act.chapters || []) {
              chapter.number = chapterNum++;
            }
          }

          const totalChaps = partialStructure.acts.reduce(
            (sum, act) => sum + (act.chapters?.length || 0),
            0
          );

          // Upsert the outline
          const upsertStmt = db.prepare(`
            INSERT INTO outlines (id, book_id, structure_type, structure, total_chapters, target_word_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              structure = excluded.structure,
              total_chapters = excluded.total_chapters,
              updated_at = excluded.updated_at
          `);

          upsertStmt.run(
            outlineId,
            bookId,
            structureType,
            JSON.stringify(partialStructure),
            totalChaps,
            targetWordCount || 80000,
            now,
            new Date().toISOString()
          );

          logger.info({ outlineId, chaptersGenerated: totalChaps }, 'Incremental outline save');
        } catch (e) {
          logger.error({ error: e }, 'Error in incremental outline save');
        }
      },
    };

    // Generate the outline
    logger.info({ bookId, bookTitle: book.title, outlineId }, 'Generating outline for book');
    const structure = await generateOutline(context);

    // Calculate total chapters
    const totalChapters = structure.acts.reduce(
      (sum, act) => sum + (act.chapters?.length || 0),
      0
    );

    // Renumber chapters sequentially across all acts
    let chapterNumber = 1;
    for (const act of structure.acts) {
      for (const chapter of act.chapters) {
        chapter.number = chapterNumber++;
      }
    }

    // Final save outline to database (using upsert since we may have incremental saves)
    const finalNow = new Date().toISOString();

    const upsertStmt = db.prepare(`
      INSERT INTO outlines (id, book_id, structure_type, structure, total_chapters, target_word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        structure = excluded.structure,
        total_chapters = excluded.total_chapters,
        updated_at = excluded.updated_at
    `);

    upsertStmt.run(
      outlineId,
      bookId,
      structureType,
      JSON.stringify(structure),
      totalChapters,
      targetWordCount || 80000,
      now,
      finalNow
    );

    // Clear progress from store
    outlineProgressStore.delete(bookId);

    res.status(201).json({
      id: outlineId,
      book_id: bookId,
      structure_type: structureType,
      structure,
      total_chapters: totalChapters,
      target_word_count: targetWordCount || 80000,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating outline');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/outlines/progress/:bookId
 * Poll for outline generation progress
 */
router.get('/progress/:bookId', (req, res) => {
  try {
    const { bookId } = req.params;

    const progressInfo = outlineProgressStore.get(bookId);

    if (!progressInfo) {
      // Check if there's an existing outline (generation might have completed)
      const outlineStmt = db.prepare<[string], any>(`
        SELECT id, total_chapters, updated_at FROM outlines WHERE book_id = ? ORDER BY created_at DESC LIMIT 1
      `);
      const existingOutline = outlineStmt.get(bookId);

      if (existingOutline) {
        return res.json({
          inProgress: false,
          complete: true,
          outlineId: existingOutline.id,
          progress: {
            phase: 'complete',
            message: 'Outline generation complete!',
            percentComplete: 100,
            totalChapters: existingOutline.total_chapters,
          },
        });
      }

      return res.json({
        inProgress: false,
        complete: false,
        progress: null,
      });
    }

    res.json({
      inProgress: true,
      complete: progressInfo.progress.phase === 'complete',
      outlineId: progressInfo.outlineId,
      progress: progressInfo.progress,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching outline progress');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/outlines/:id
 * Update an existing outline
 */
router.put('/:id', (req, res) => {
  try {
    const validation = validateRequest(updateOutlineSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { structure } = validation.data;

    // Calculate total chapters
    const totalChapters = structure.acts.reduce(
      (sum: number, act: any) => sum + (act.chapters?.length || 0),
      0
    );

    // Update outline
    const stmt = db.prepare(`
      UPDATE outlines
      SET structure = ?, total_chapters = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      JSON.stringify(structure),
      totalChapters,
      new Date().toISOString(),
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating outline');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/outlines/:id/start-generation
 * Create chapter rows and queue generation jobs for all chapters
 */
router.post('/:id/start-generation', (req, res) => {
  try {
    const outlineId = req.params.id;

    // Get outline
    const outlineStmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE id = ?
    `);
    const outline = outlineStmt.get(outlineId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    const structure: StoryStructure = JSON.parse(outline.structure as any);

    // Delete any existing chapters and their jobs before creating new ones
    // This prevents duplicate chapters if generation is restarted
    const deleteJobsStmt = db.prepare(`
      DELETE FROM jobs WHERE target_id IN (
        SELECT id FROM chapters WHERE book_id = ?
      )
    `);
    deleteJobsStmt.run(outline.book_id);

    const deleteChaptersStmt = db.prepare(`
      DELETE FROM chapters WHERE book_id = ?
    `);
    deleteChaptersStmt.run(outline.book_id);

    // Create chapter records for all chapters in the outline
    const now = new Date().toISOString();
    const chapterIds: string[] = [];

    for (const act of structure.acts) {
      for (const chapterOutline of act.chapters) {
        const chapterId = randomUUID();
        chapterIds.push(chapterId);

        const insertChapterStmt = db.prepare(`
          INSERT INTO chapters (id, book_id, chapter_number, title, scene_cards, content, summary, status, word_count, flags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 0, NULL, ?, ?)
        `);

        insertChapterStmt.run(
          chapterId,
          outline.book_id,
          chapterOutline.number,
          chapterOutline.title,
          JSON.stringify(chapterOutline.scenes || []),
          'pending',
          now,
          now
        );

        // Create job for chapter generation
        const jobId = randomUUID();
        const insertJobStmt = db.prepare(`
          INSERT INTO jobs (id, type, target_id, status, checkpoint, error, attempts, created_at)
          VALUES (?, ?, ?, ?, NULL, NULL, 0, ?)
        `);

        insertJobStmt.run(jobId, 'generate_chapter', chapterId, 'pending', now);
      }
    }

    // Update book status to generating
    const updateBookStmt = db.prepare(`
      UPDATE books SET status = ?, updated_at = ? WHERE id = ?
    `);
    updateBookStmt.run('generating', now, outline.book_id);

    res.json({
      success: true,
      chaptersCreated: chapterIds.length,
      jobsQueued: chapterIds.length,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error starting generation');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/outlines/:bookId/regenerate-act/:actNumber
 * Regenerate a single act while keeping others intact
 */
router.post('/:bookId/regenerate-act/:actNumber', async (req, res) => {
  try {
    const { bookId, actNumber } = req.params;
    const actNum = parseInt(actNumber, 10);

    if (isNaN(actNum) || actNum < 1) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Invalid act number' },
      });
    }

    // Get the outline for this book
    const outlineStmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE book_id = ?
    `);
    const outline = outlineStmt.get(bookId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found for this book' },
      });
    }

    const structure: StoryStructure = JSON.parse(outline.structure as any);

    // Validate act number
    if (actNum > structure.acts.length) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: `Act ${actNum} does not exist. Outline has ${structure.acts.length} acts.` },
      });
    }

    // Get book and project data for context
    const bookStmt = db.prepare<[string], Book>(`SELECT * FROM books WHERE id = ?`);
    const book = bookStmt.get(bookId);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
    }

    const projectStmt = db.prepare<[string], Project>(`SELECT * FROM projects WHERE id = ?`);
    const project = projectStmt.get(book.project_id);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Parse project data
    const storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);

    if (!storyDNA || !storyBible) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: 'Project must have Story DNA and Story Bible' },
      });
    }

    // Build context for regeneration
    const context: OutlineContext = {
      concept: {
        title: book.title,
        logline: book.title,
        synopsis: '',
      },
      storyDNA,
      characters: storyBible.characters || [],
      world: storyBible.world || { locations: [], factions: [], systems: [] },
      structureType: outline.structure_type as StoryStructureType,
      targetWordCount: outline.target_word_count,
    };

    // Regenerate the full outline (this will regenerate all acts)
    // In a production system, we'd have a more granular function
    logger.info({ bookId, actNumber: actNum }, 'Regenerating act');
    const newStructure = await generateOutline(context);

    // Replace only the specified act in the existing structure
    structure.acts[actNum - 1] = newStructure.acts[actNum - 1];

    // Renumber chapters sequentially across all acts
    let chapterNumber = 1;
    for (const act of structure.acts) {
      for (const chapter of act.chapters) {
        chapter.number = chapterNumber++;
      }
    }

    // Calculate total chapters
    const totalChapters = structure.acts.reduce(
      (sum, act) => sum + (act.chapters?.length || 0),
      0
    );

    // Update outline in database
    const updateStmt = db.prepare(`
      UPDATE outlines
      SET structure = ?, total_chapters = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(structure),
      totalChapters,
      new Date().toISOString(),
      outline.id
    );

    res.json({
      success: true,
      act: structure.acts[actNum - 1],
      totalChapters,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating act');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/outlines/:bookId/acts
 * Delete all acts from the outline and reset to empty state
 */
router.delete('/:bookId/acts', (req, res) => {
  try {
    const { bookId } = req.params;

    // Get the outline
    const outlineStmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE book_id = ?
    `);
    const outline = outlineStmt.get(bookId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    // Delete all chapters for this book
    const deleteChaptersStmt = db.prepare(`
      DELETE FROM chapters WHERE book_id = ?
    `);
    deleteChaptersStmt.run(bookId);

    // Reset outline structure to empty
    const emptyStructure: StoryStructure = {
      type: outline.structure_type as StoryStructureType,
      acts: [],
    };

    const updateStmt = db.prepare(`
      UPDATE outlines
      SET structure = ?, total_chapters = 0, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(emptyStructure),
      new Date().toISOString(),
      outline.id
    );

    res.json({ success: true, message: 'All acts deleted' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting acts');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/outlines/:bookId/acts/:actNumber
 * Delete a specific act and renumber remaining acts
 */
router.delete('/:bookId/acts/:actNumber', (req, res) => {
  try {
    const { bookId, actNumber } = req.params;
    const actNum = parseInt(actNumber, 10);

    if (isNaN(actNum) || actNum < 1) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Invalid act number' },
      });
    }

    // Get the outline
    const outlineStmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE book_id = ?
    `);
    const outline = outlineStmt.get(bookId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    const structure: StoryStructure = JSON.parse(outline.structure as any);

    // Validate act number
    if (actNum > structure.acts.length) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: `Act ${actNum} does not exist` },
      });
    }

    // Get chapter numbers that belong to this act
    const actToDelete = structure.acts[actNum - 1];
    const chapterNumbersToDelete = actToDelete.chapters.map(ch => ch.number);

    // Delete chapters belonging to this act
    if (chapterNumbersToDelete.length > 0) {
      const placeholders = chapterNumbersToDelete.map(() => '?').join(',');
      const deleteChaptersStmt = db.prepare(`
        DELETE FROM chapters WHERE book_id = ? AND chapter_number IN (${placeholders})
      `);
      deleteChaptersStmt.run(bookId, ...chapterNumbersToDelete);
    }

    // Remove the act
    structure.acts.splice(actNum - 1, 1);

    // Renumber remaining acts
    structure.acts.forEach((act, index) => {
      act.number = index + 1;
    });

    // Renumber chapters sequentially across all acts
    let chapterNumber = 1;
    for (const act of structure.acts) {
      for (const chapter of act.chapters) {
        chapter.number = chapterNumber++;
        chapter.actNumber = act.number;
      }
    }

    // Calculate total chapters
    const totalChapters = structure.acts.reduce(
      (sum, act) => sum + (act.chapters?.length || 0),
      0
    );

    // Update outline
    const updateStmt = db.prepare(`
      UPDATE outlines
      SET structure = ?, total_chapters = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(structure),
      totalChapters,
      new Date().toISOString(),
      outline.id
    );

    res.json({ success: true, structure, totalChapters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting act');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/outlines/:bookId/acts/:actNumber
 * Update an act's content without regenerating
 */
router.put('/:bookId/acts/:actNumber', (req, res) => {
  try {
    const { bookId, actNumber } = req.params;
    const actNum = parseInt(actNumber, 10);

    if (isNaN(actNum) || actNum < 1) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Invalid act number' },
      });
    }

    const { name, description, beats, targetWordCount, chapters } = req.body;

    // Get the outline
    const outlineStmt = db.prepare<[string], Outline>(`
      SELECT * FROM outlines WHERE book_id = ?
    `);
    const outline = outlineStmt.get(bookId);

    if (!outline) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    const structure: StoryStructure = JSON.parse(outline.structure as any);

    // Validate act number
    if (actNum > structure.acts.length) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: `Act ${actNum} does not exist` },
      });
    }

    // Update act properties
    const act = structure.acts[actNum - 1];
    if (name !== undefined) act.name = name;
    if (description !== undefined) act.description = description;
    if (beats !== undefined) act.beats = beats;
    if (targetWordCount !== undefined) act.targetWordCount = targetWordCount;
    if (chapters !== undefined) act.chapters = chapters;

    // Renumber chapters if they were updated
    if (chapters !== undefined) {
      let chapterNumber = 1;
      for (const act of structure.acts) {
        for (const chapter of act.chapters) {
          chapter.number = chapterNumber++;
          chapter.actNumber = act.number;
        }
      }
    }

    // Calculate total chapters
    const totalChapters = structure.acts.reduce(
      (sum, act) => sum + (act.chapters?.length || 0),
      0
    );

    // Update outline
    const updateStmt = db.prepare(`
      UPDATE outlines
      SET structure = ?, total_chapters = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(structure),
      totalChapters,
      new Date().toISOString(),
      outline.id
    );

    res.json({ success: true, act: structure.acts[actNum - 1] });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating act');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/outlines/:id
 * Delete an outline
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM outlines WHERE id = ?
    `);

    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Outline not found' },
      });
    }

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting outline');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
