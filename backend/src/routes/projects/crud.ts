/**
 * Project CRUD Routes
 * Handles basic Create, Read, Update, Delete operations for projects
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import type { Project } from '../../shared/types/index.js';
import { randomUUID } from 'crypto';
import { metricsService } from '../../services/metrics.service.js';
import { createLogger } from '../../services/logger.service.js';
import { universeService } from '../../services/universe.service.js';
import { safeJsonParse } from './utils.js';
import {
  createProjectSchema,
  updateProjectSchema,
  validateRequest,
} from '../../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:projects:crud');

/**
 * GET /api/projects
 * List all projects with progress statistics
 */
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare<[], Project>(`
      SELECT
        p.*,
        pn.id as pen_name_id_full,
        pn.pen_name,
        pn.display_name as pen_name_display,
        pn.is_default as pen_name_is_default
      FROM projects p
      LEFT JOIN pen_names pn ON p.pen_name_id = pn.id
      ORDER BY p.updated_at DESC
    `);

    const projects = stmt.all();

    // Get all metrics at once
    const allMetrics = metricsService.getAllProjectMetrics() || new Map();

    // Get outline and chapter counts for each project
    let outlineStmt: any = null;
    let chapterCountStmt: any = null;
    let generationStatusStmt: any = null;

    try {
      outlineStmt = db.prepare<[string], any>(`
        SELECT o.id, o.total_chapters
        FROM outlines o
        INNER JOIN books b ON o.book_id = b.id
        WHERE b.project_id = ?
        LIMIT 1
      `);
      chapterCountStmt = db.prepare<[string], any>(`
        SELECT COUNT(*) as count FROM chapters c
        INNER JOIN books b ON c.book_id = b.id
        LEFT JOIN book_versions bv ON c.version_id = bv.id
        WHERE b.project_id = ? AND c.content IS NOT NULL AND c.content != ''
          AND (c.version_id IS NULL OR bv.is_active = 1)
      `);

      generationStatusStmt = db.prepare<[string], any>(`
        SELECT
          SUM(CASE WHEN j.status IN ('pending', 'running') THEN 1 ELSE 0 END) as active_jobs,
          SUM(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) as failed_jobs
        FROM jobs j
        INNER JOIN chapters c ON j.target_id = c.id
        INNER JOIN books b ON c.book_id = b.id
        WHERE b.project_id = ?
      `);
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Could not prepare optional metric statements');
    }

    // Parse JSON fields and attach metrics
    const parsedProjects = projects.map((p) => {
      const storyBible = safeJsonParse(p.story_bible as any, null);
      const plotStructure = safeJsonParse(p.plot_structure as any, null);

      // Extract pen name data
      const penName = (p as any).pen_name ? {
        id: (p as any).pen_name_id_full || p.pen_name_id,
        pen_name: (p as any).pen_name,
        display_name: (p as any).pen_name_display,
        is_default: (p as any).pen_name_is_default === 1,
      } : null;

      let outline = null;
      let chapterCount = null;
      let genStatus = null;

      try {
        if (outlineStmt) outline = outlineStmt.get(p.id);
        if (chapterCountStmt) chapterCount = chapterCountStmt.get(p.id);
        if (generationStatusStmt) genStatus = generationStatusStmt.get(p.id);
      } catch (err: any) {
        logger.warn({ projectId: p.id, error: err.message }, 'Error fetching project metrics');
      }

      // Calculate world element count
      let worldCount = 0;
      if (storyBible?.world) {
        if (Array.isArray(storyBible.world)) {
          worldCount = storyBible.world.length;
        } else {
          worldCount = (storyBible.world.locations?.length || 0) +
                       (storyBible.world.factions?.length || 0) +
                       (storyBible.world.systems?.length || 0);
        }
      }

      // Determine generation status
      let generationStatus: 'idle' | 'generating' | 'completed' | 'failed' = 'idle';
      if (genStatus?.active_jobs > 0) {
        generationStatus = 'generating';
      } else if (genStatus?.failed_jobs > 0 && genStatus?.completed_jobs === 0) {
        generationStatus = 'failed';
      } else if (genStatus?.completed_jobs > 0) {
        generationStatus = 'completed';
      }

      // Remove temporary pen_name fields from response
      const { pen_name_id_full, pen_name, pen_name_display, pen_name_is_default, ...projectData } = p as any;

      return {
        ...projectData,
        story_dna: safeJsonParse(projectData.story_dna as any, null),
        story_bible: storyBible,
        plot_structure: plotStructure,
        pen_name: penName,
        metrics: (allMetrics instanceof Map) ? allMetrics.get(projectData.id) || null : null,
        progress: {
          characters: storyBible?.characters?.length || 0,
          worldElements: worldCount,
          plotLayers: plotStructure?.plot_layers?.length || 0,
          hasOutline: !!outline && (outline.total_chapters > 0),
          outlineChapters: outline?.total_chapters || 0,
          chaptersWritten: chapterCount?.count || 0,
          generationStatus,
        },
      };
    });

    res.json({ projects: parsedProjects });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching projects');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id
 * Get project details with optional related data
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Project>(`
      SELECT
        p.*,
        pn.id as pen_name_id_full,
        pn.pen_name,
        pn.display_name as pen_name_display,
        pn.is_default as pen_name_is_default
      FROM projects p
      LEFT JOIN pen_names pn ON p.pen_name_id = pn.id
      WHERE p.id = ?
    `);

    const project = stmt.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Extract pen name data
    const penName = (project as any).pen_name ? {
      id: (project as any).pen_name_id_full || project.pen_name_id,
      pen_name: (project as any).pen_name,
      display_name: (project as any).pen_name_display,
      is_default: (project as any).pen_name_is_default === 1,
    } : null;

    // Remove temporary pen_name fields
    const { pen_name_id_full, pen_name, pen_name_display, pen_name_is_default, ...projectData } = project as any;

    const parsedProject: any = {
      ...projectData,
      story_dna: safeJsonParse(projectData.story_dna as any, null),
      story_bible: safeJsonParse(projectData.story_bible as any, null),
      story_concept: safeJsonParse(projectData.story_concept, null),
      plot_structure: safeJsonParse(projectData.plot_structure, null),
      pen_name: penName,
      metrics: metricsService.getFormattedMetrics(projectData.id),
    };

    // Handle include query parameter for related data
    const includeParam = req.query.include as string | undefined;
    if (includeParam) {
      const includes = includeParam.split(',').map(s => s.trim().toLowerCase());

      if (includes.includes('books') || includes.includes('chapters')) {
        const booksStmt = db.prepare(`
          SELECT id, project_id, book_number, title, status, word_count, created_at, updated_at
          FROM books
          WHERE project_id = ?
          ORDER BY book_number ASC
        `);
        const books = booksStmt.all(req.params.id) as any[];

        if (includes.includes('chapters')) {
          const chaptersStmt = db.prepare(`
            SELECT c.id, c.book_id, c.chapter_number, c.title, c.status, c.word_count
            FROM chapters c
            INNER JOIN books b ON c.book_id = b.id
            WHERE b.project_id = ?
            ORDER BY b.book_number ASC, c.chapter_number ASC
          `);
          const allChapters = chaptersStmt.all(req.params.id) as any[];

          const chaptersByBook = new Map<string, any[]>();
          for (const chapter of allChapters) {
            if (!chaptersByBook.has(chapter.book_id)) {
              chaptersByBook.set(chapter.book_id, []);
            }
            chaptersByBook.get(chapter.book_id)!.push({
              id: chapter.id,
              chapter_number: chapter.chapter_number,
              title: chapter.title,
              status: chapter.status,
              word_count: chapter.word_count,
            });
          }

          for (const book of books) {
            book.chapters = chaptersByBook.get(book.id) || [];
          }
        }

        parsedProject.books = books;
      }
    }

    res.json(parsedProject);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', (req, res) => {
  try {
    const validation = validateRequest(createProjectSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { concept, preferences } = validation.data;

    const projectId = randomUUID();
    const now = new Date().toISOString();

    const projectType = preferences.projectType || 'standalone';
    let bookCount = 1;
    if (projectType === 'trilogy') {
      bookCount = 3;
    } else if (projectType === 'series') {
      bookCount = preferences.bookCount || 4;
    }

    let universeId: string | null = null;
    if (preferences.universeId) {
      universeId = preferences.universeId;
    } else if (preferences.sourceProjectId) {
      universeId = universeService.getOrCreateUniverse(preferences.sourceProjectId);
    }

    const timePeriodType = preferences.timePeriodType || preferences.timePeriod?.type || null;
    const specificYear = preferences.specificYear || preferences.timePeriod?.year || null;
    const penNameId = preferences.penNameId || null;

    const storyConcept = {
      title: concept.title,
      logline: concept.logline || null,
      synopsis: concept.synopsis || null,
      hook: (concept as any).hook || null,
      protagonistHint: (concept as any).protagonistHint || null,
      conflictType: (concept as any).conflictType || null,
    };

    const sourceConceptId = (concept as any).id || null;

    const stmt = db.prepare(`
      INSERT INTO projects (id, title, type, genre, status, book_count, universe_id, time_period_type, specific_year, pen_name_id, story_concept, source_concept_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      projectId,
      concept.title,
      projectType,
      preferences.genre,
      'setup',
      bookCount,
      universeId,
      timePeriodType,
      specificYear,
      penNameId,
      JSON.stringify(storyConcept),
      sourceConceptId,
      now,
      now
    );

    logger.info({
      projectId,
      projectType,
      bookCount,
      universeId,
      timePeriodType,
      specificYear,
    }, 'Created new project');

    res.status(201).json({
      id: projectId,
      title: concept.title,
      type: projectType,
      book_count: bookCount,
      universe_id: universeId,
      time_period_type: timePeriodType,
      specific_year: specificYear,
      status: 'setup',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', (req, res) => {
  try {
    const validation = validateRequest(updateProjectSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      storyDNA, storyBible, storyConcept, status, title, authorName, type, bookCount,
      seriesId, seriesBookNumber, penNameId,
      dedication, epigraph, epigraphAttribution, isbn, publisher, edition,
      copyrightYear, includeDramatisPersonae, includeAboutAuthor
    } = validation.data;

    const updates: string[] = [];
    const params: any[] = [];

    if (storyDNA !== undefined) {
      updates.push('story_dna = ?');
      params.push(JSON.stringify(storyDNA));
    }

    if (storyBible !== undefined) {
      updates.push('story_bible = ?');
      params.push(JSON.stringify(storyBible));
    }

    if (storyConcept !== undefined) {
      updates.push('story_concept = ?');
      params.push(JSON.stringify(storyConcept));
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (authorName !== undefined) {
      updates.push('author_name = ?');
      params.push(authorName);
    }

    if (type !== undefined) {
      updates.push('type = ?');
      params.push(type);
    }

    if (bookCount !== undefined) {
      updates.push('book_count = ?');
      params.push(bookCount);
    }

    if (seriesId !== undefined) {
      updates.push('series_id = ?');
      params.push(seriesId);
    }

    if (seriesBookNumber !== undefined) {
      updates.push('series_book_number = ?');
      params.push(seriesBookNumber);
    }

    if (penNameId !== undefined) {
      updates.push('pen_name_id = ?');
      params.push(penNameId);
    }

    if (dedication !== undefined) {
      updates.push('dedication = ?');
      params.push(dedication);
    }

    if (epigraph !== undefined) {
      updates.push('epigraph = ?');
      params.push(epigraph);
    }

    if (epigraphAttribution !== undefined) {
      updates.push('epigraph_attribution = ?');
      params.push(epigraphAttribution);
    }

    if (isbn !== undefined) {
      updates.push('isbn = ?');
      params.push(isbn);
    }

    if (publisher !== undefined) {
      updates.push('publisher = ?');
      params.push(publisher);
    }

    if (edition !== undefined) {
      updates.push('edition = ?');
      params.push(edition);
    }

    if (copyrightYear !== undefined) {
      updates.push('copyright_year = ?');
      params.push(copyrightYear);
    }

    if (includeDramatisPersonae !== undefined) {
      updates.push('include_dramatis_personae = ?');
      params.push(includeDramatisPersonae ? 1 : 0);
    }

    if (includeAboutAuthor !== undefined) {
      updates.push('include_about_author = ?');
      params.push(includeAboutAuthor ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(req.params.id);

    const stmt = db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Sync book title with project title for standalone projects
    if (title !== undefined) {
      try {
        const projectStmt = db.prepare<[string], { type: string }>(`
          SELECT type FROM projects WHERE id = ?
        `);
        const project = projectStmt.get(req.params.id);

        if (project && project.type === 'standalone') {
          const updateBookStmt = db.prepare(`
            UPDATE books SET title = ?, updated_at = ?
            WHERE project_id = ? AND book_number = 1
          `);
          updateBookStmt.run(title, new Date().toISOString(), req.params.id);
          logger.debug({ projectId: req.params.id, title }, 'Synced book title with project title');
        }
      } catch (syncError: any) {
        logger.warn({ error: syncError.message, projectId: req.params.id }, 'Failed to sync book title with project title');
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM projects WHERE id = ?
    `);

    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/duplicate
 * Duplicate a project with all its story details
 */
router.post('/:id/duplicate', (req, res) => {
  try {
    const sourceProjectId = req.params.id;
    const { title } = req.body;

    const sourceProject = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(sourceProjectId) as any;

    if (!sourceProject) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Source project not found' },
      });
    }

    const newProjectId = randomUUID();
    const now = new Date().toISOString();

    const sourceStoryConcept = safeJsonParse(sourceProject.story_concept, {});
    const duplicateTitle = title || `${sourceProject.title} (Copy)`;

    const newStoryConcept = {
      ...sourceStoryConcept,
      title: duplicateTitle,
    };

    const stmt = db.prepare(`
      INSERT INTO projects (
        id, title, type, genre, status, story_dna, story_bible, story_concept,
        book_count, time_period_type, specific_year, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newProjectId,
      duplicateTitle,
      'standalone',
      sourceProject.genre,
      'setup',
      sourceProject.story_dna,
      sourceProject.story_bible,
      JSON.stringify(newStoryConcept),
      1,
      sourceProject.time_period_type,
      sourceProject.specific_year,
      now,
      now
    );

    // Create the first book for standalone project
    const bookId = randomUUID();
    const bookStmt = db.prepare(`
      INSERT INTO books (id, project_id, book_number, title, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    bookStmt.run(bookId, newProjectId, 1, duplicateTitle, 'setup', 0, now, now);

    logger.info({ sourceProjectId, newProjectId, title: duplicateTitle }, 'Duplicated project');

    res.status(201).json({
      success: true,
      project: {
        id: newProjectId,
        title: duplicateTitle,
        type: 'standalone',
        genre: sourceProject.genre,
        status: 'setup',
        book_count: 1,
        story_concept: newStoryConcept,
        story_dna: safeJsonParse(sourceProject.story_dna, null),
        story_bible: safeJsonParse(sourceProject.story_bible, null),
        time_period_type: sourceProject.time_period_type,
        specific_year: sourceProject.specific_year,
        created_at: now,
        updated_at: now,
      },
      book: {
        id: bookId,
        book_number: 1,
        title: duplicateTitle,
        status: 'setup',
      },
      copied: [
        'Story concept (title, logline, synopsis, hook)',
        'Story DNA (genre, tone, themes, prose style)',
        'Story Bible (characters, world elements)',
        'Time period settings',
      ],
      notCopied: [
        'Plot structure',
        'Outlines',
        'Chapters',
        'Publishing settings',
      ],
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error duplicating project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/cover-image
 * Upload a cover image for the project
 */
router.post('/:id/cover-image', (req, res) => {
  try {
    const projectId = req.params.id;
    const { image, imageType } = req.body;

    if (!image || !imageType) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Image and imageType are required' },
      });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageType)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid image type. Allowed: jpeg, png, gif, webp' },
      });
    }

    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    const dataUrlPattern = /^data:image\/(jpeg|png|gif|webp);base64,/;

    let imageData = image;
    if (dataUrlPattern.test(image)) {
      imageData = image.split(',')[1];
    } else if (!base64Pattern.test(image)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid image format. Expected base64 encoded data.' },
      });
    }

    if (imageData.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Image too large. Maximum size is 5MB.' },
      });
    }

    const stmt = db.prepare(`
      UPDATE projects
      SET cover_image = ?, cover_image_type = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(imageData, imageType, new Date().toISOString(), projectId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.json({ success: true, message: 'Cover image uploaded successfully' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error uploading cover image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/projects/:id/cover-image
 * Remove the cover image from a project
 */
router.delete('/:id/cover-image', (req, res) => {
  try {
    const projectId = req.params.id;

    const stmt = db.prepare(`
      UPDATE projects
      SET cover_image = NULL, cover_image_type = NULL, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(new Date().toISOString(), projectId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.json({ success: true, message: 'Cover image removed successfully' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error removing cover image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/cover-image
 * Get the cover image for a project
 */
router.get('/:id/cover-image', (req, res) => {
  try {
    const projectId = req.params.id;

    const stmt = db.prepare<[string], { cover_image: string | null; cover_image_type: string | null }>(`
      SELECT cover_image, cover_image_type FROM projects WHERE id = ?
    `);

    const project = stmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    if (!project.cover_image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No cover image set' },
      });
    }

    res.json({
      image: project.cover_image,
      imageType: project.cover_image_type,
      dataUrl: `data:${project.cover_image_type};base64,${project.cover_image}`,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching cover image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/books-with-chapters
 * Fetch a project with all its books and chapters in a single optimised query
 */
router.get('/:id/books-with-chapters', (req, res) => {
  try {
    const projectId = req.params.id;

    const chapterLimit = Math.min(
      Math.max(1, parseInt(req.query.chapterLimit as string, 10) || 100),
      500
    );
    const chapterOffset = Math.max(0, parseInt(req.query.chapterOffset as string, 10) || 0);
    const includeContent = req.query.includeContent === 'true';

    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const booksStmt = db.prepare(`
      SELECT id, project_id, book_number, title, status, word_count, created_at, updated_at
      FROM books
      WHERE project_id = ?
      ORDER BY book_number ASC
    `);
    const books = booksStmt.all(projectId) as any[];

    const chapterFields = includeContent
      ? 'c.id, c.book_id, c.chapter_number, c.title, c.status, c.word_count, c.content, c.summary, c.scene_cards, c.flags, c.created_at, c.updated_at'
      : 'c.id, c.book_id, c.chapter_number, c.title, c.status, c.word_count, c.summary, c.created_at, c.updated_at';

    const chaptersStmt = db.prepare(`
      SELECT ${chapterFields}
      FROM chapters c
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
      ORDER BY b.book_number ASC, c.chapter_number ASC
    `);
    const allChapters = chaptersStmt.all(projectId) as any[];

    const chaptersByBook = new Map<string, any[]>();
    for (const chapter of allChapters) {
      if (!chaptersByBook.has(chapter.book_id)) {
        chaptersByBook.set(chapter.book_id, []);
      }
      chaptersByBook.get(chapter.book_id)!.push(chapter);
    }

    let totalChapters = 0;
    const booksWithChapters = books.map((book) => {
      const bookChapters = chaptersByBook.get(book.id) || [];
      totalChapters += bookChapters.length;

      const paginatedChapters = bookChapters.slice(
        chapterOffset,
        chapterOffset + chapterLimit
      );

      const parsedChapters = paginatedChapters.map((ch: any) => ({
        ...ch,
        scene_cards: ch.scene_cards ? safeJsonParse(ch.scene_cards, []) : undefined,
        flags: ch.flags ? safeJsonParse(ch.flags, []) : undefined,
      }));

      return {
        ...book,
        chapters: parsedChapters,
        chapterCount: bookChapters.length,
        hasMoreChapters: bookChapters.length > chapterOffset + chapterLimit,
      };
    });

    const parsedProject = {
      ...project,
      story_dna: safeJsonParse(project.story_dna as any, null),
      story_bible: safeJsonParse(project.story_bible as any, null),
    };

    res.json({
      project: parsedProject,
      books: booksWithChapters,
      totalChapters,
      pagination: {
        chapterLimit,
        chapterOffset,
        includeContent,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project with books and chapters');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
