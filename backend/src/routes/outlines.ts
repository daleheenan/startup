import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type { Outline, StoryStructure, Project, Book } from '../shared/types/index.js';
import { generateOutline, type OutlineContext } from '../services/outline-generator.js';
import { getAllStructureTemplates } from '../services/structure-templates.js';

const router = Router();

/**
 * GET /api/outlines/templates
 * Get all available structure templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = getAllStructureTemplates();
    res.json({ templates });
  } catch (error: any) {
    console.error('[API] Error fetching templates:', error);
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
    console.error('[API] Error fetching outline:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/outlines/generate
 * Generate a new outline for a book
 */
router.post('/generate', async (req, res) => {
  try {
    const { projectId, bookId, structureType, targetWordCount } = req.body;

    if (!projectId || !bookId || !structureType) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
      });
    }

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
    const storyDNA = project.story_dna ? JSON.parse(project.story_dna as any) : null;
    const storyBible = project.story_bible ? JSON.parse(project.story_bible as any) : null;

    if (!storyDNA || !storyBible) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Project must have Story DNA and Story Bible before generating outline',
        },
      });
    }

    // Build outline context
    const context: OutlineContext = {
      concept: {
        title: book.title,
        logline: req.body.logline || project.title,
        synopsis: req.body.synopsis || '',
      },
      storyDNA,
      characters: storyBible.characters || [],
      world: storyBible.world || { locations: [], factions: [], systems: [] },
      structureType,
      targetWordCount: targetWordCount || 80000,
    };

    // Generate the outline
    console.log(`[API] Generating outline for book: ${book.title}`);
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

    // Save outline to database
    const outlineId = randomUUID();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO outlines (id, book_id, structure_type, structure, total_chapters, target_word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      outlineId,
      bookId,
      structureType,
      JSON.stringify(structure),
      totalChapters,
      targetWordCount || 80000,
      now,
      now
    );

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
    console.error('[API] Error generating outline:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/outlines/:id
 * Update an existing outline
 */
router.put('/:id', (req, res) => {
  try {
    const { structure } = req.body;

    if (!structure) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Structure is required' },
      });
    }

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
    console.error('[API] Error updating outline:', error);
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
    console.error('[API] Error starting generation:', error);
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
    console.error('[API] Error deleting outline:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
