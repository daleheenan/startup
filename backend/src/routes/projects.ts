import { Router } from 'express';
import db from '../db/connection.js';
import type { Project } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { generateStoryDNA } from '../services/story-dna-generator.js';
import { generateProtagonist, generateSupportingCast, assignNationalities } from '../services/character-generator.js';
import { generateWorldElements } from '../services/world-generator.js';
import { metricsService } from '../services/metrics.service.js';
import { createLogger } from '../services/logger.service.js';
import { universeService } from '../services/universe.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  validateRequest,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '../utils/schemas.js';

const router = Router();
const logger = createLogger('routes:projects');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare<[], Project>(`
      SELECT * FROM projects ORDER BY updated_at DESC
    `);

    const projects = stmt.all();

    // Get all metrics at once
    const allMetrics = metricsService.getAllProjectMetrics();

    // Parse JSON fields and attach metrics (with safe parsing)
    const parsedProjects = projects.map((p) => ({
      ...p,
      story_dna: safeJsonParse(p.story_dna as any, null),
      story_bible: safeJsonParse(p.story_bible as any, null),
      metrics: allMetrics.get(p.id) || null,
    }));

    res.json({ projects: parsedProjects });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching projects');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/progress
 * Get comprehensive progress data for a project
 *
 * Returns:
 * - Project details
 * - Chapter statistics (total, completed, in-progress, pending)
 * - Word count metrics
 * - Time estimates
 * - Queue statistics
 * - Current activity
 * - Recent events
 * - Flagged issues
 * - Rate limit status
 */
router.get('/:id/progress', (req, res) => {
  try {
    const projectId = req.params.id;

    // Step 1: Fetch project
    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Step 2: Fetch all books for the project
    const booksStmt = db.prepare<[string], any>(`
      SELECT id FROM books WHERE project_id = ?
    `);
    const books = booksStmt.all(projectId);

    // Step 3: Fetch all chapters for all books with status counts
    const chaptersStmt = db.prepare(`
      SELECT
        c.id,
        c.book_id,
        c.chapter_number,
        c.title,
        c.status,
        c.word_count,
        c.flags,
        c.created_at,
        c.updated_at
      FROM chapters c
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
      ORDER BY b.book_number ASC, c.chapter_number ASC
    `);
    const allChapters = chaptersStmt.all(projectId) as any[];

    // Calculate chapter statistics
    const chapterStats = {
      total: allChapters.length,
      completed: allChapters.filter(ch => ch.status === 'completed').length,
      inProgress: allChapters.filter(ch => ch.status === 'writing' || ch.status === 'editing').length,
      pending: allChapters.filter(ch => ch.status === 'pending').length,
    };

    // Calculate word count metrics
    const totalWordCount = allChapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const targetWordCount = 80000; // Default target
    const averagePerChapter = chapterStats.completed > 0
      ? Math.round(totalWordCount / chapterStats.completed)
      : 2250;

    // Step 4: Fetch queue statistics for this project
    const queueStmt = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
      GROUP BY status
    `);
    const queueResults = queueStmt.all(projectId) as any[];

    const queueStats = {
      pending: 0,
      running: 0,
      completed: 0,
      paused: 0,
    };

    queueResults.forEach((row: any) => {
      if (row.status === 'pending') queueStats.pending = row.count;
      if (row.status === 'running') queueStats.running = row.count;
      if (row.status === 'completed') queueStats.completed = row.count;
      if (row.status === 'paused') queueStats.paused = row.count;
    });

    // Step 5: Get current activity (most recent running job)
    const currentActivityStmt = db.prepare(`
      SELECT
        j.id as job_id,
        j.type as job_type,
        j.started_at,
        c.id as chapter_id,
        c.chapter_number
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ? AND j.status = 'running'
      ORDER BY j.started_at DESC
      LIMIT 1
    `);
    const currentActivity = currentActivityStmt.get(projectId) as any;

    // Step 6: Get recent events (last 10 completed jobs)
    const recentEventsStmt = db.prepare(`
      SELECT
        j.id,
        j.type,
        j.completed_at,
        c.chapter_number
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ? AND j.status = 'completed'
      ORDER BY j.completed_at DESC
      LIMIT 10
    `);
    const recentEvents = (recentEventsStmt.all(projectId) as any[]).map((event: any) => ({
      timestamp: event.completed_at,
      type: event.type,
      message: `${event.type} completed for Chapter ${event.chapter_number}`,
    }));

    // Step 7: Calculate flag statistics
    let flagStats = {
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const chapter of allChapters) {
      if (chapter.flags) {
        try {
          const flags = JSON.parse(chapter.flags);
          if (Array.isArray(flags)) {
            flagStats.total += flags.length;
            flags.forEach((flag: any) => {
              if (flag.severity === 'critical') flagStats.critical++;
              else if (flag.severity === 'warning') flagStats.warning++;
              else if (flag.severity === 'info') flagStats.info++;
            });
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Step 8: Calculate time estimates
    const completedJobsStmt = db.prepare(`
      SELECT
        j.started_at,
        j.completed_at
      FROM jobs j
      INNER JOIN chapters c ON j.target_id = c.id
      INNER JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
        AND j.status = 'completed'
        AND j.started_at IS NOT NULL
        AND j.completed_at IS NOT NULL
      ORDER BY j.completed_at DESC
      LIMIT 20
    `);
    const completedJobs = completedJobsStmt.all(projectId) as any[];

    let averageChapterTime = 0;
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        const start = new Date(job.started_at).getTime();
        const end = new Date(job.completed_at).getTime();
        return sum + (end - start);
      }, 0);
      averageChapterTime = totalTime / completedJobs.length;
    }

    const estimatedRemaining = averageChapterTime * chapterStats.pending;

    // Step 9: Get rate limit status
    const rateLimitStmt = db.prepare(`
      SELECT
        is_active,
        requests_this_session,
        session_resets_at
      FROM session_tracking
      WHERE id = 1
    `);
    const rateLimitData = rateLimitStmt.get() as any;

    let rateLimitStatus = undefined;
    if (rateLimitData && rateLimitData.is_active) {
      const resetTime = rateLimitData.session_resets_at ? new Date(rateLimitData.session_resets_at) : null;
      const now = new Date();
      const timeRemaining = resetTime ? Math.max(0, resetTime.getTime() - now.getTime()) : 0;

      rateLimitStatus = {
        isActive: Boolean(rateLimitData.is_active),
        requestsThisSession: rateLimitData.requests_this_session || 0,
        timeRemaining: resetTime ? formatTimeRemaining(timeRemaining) : 'N/A',
        resetTime: resetTime ? resetTime.toISOString() : null,
      };
    }

    // Construct response
    const response = {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
      },
      chapters: chapterStats,
      wordCount: {
        current: totalWordCount,
        target: targetWordCount,
        averagePerChapter,
      },
      timeEstimates: {
        averageChapterTime: Math.round(averageChapterTime),
        estimatedRemaining: Math.round(estimatedRemaining),
      },
      queue: queueStats,
      currentActivity: currentActivity ? {
        chapterId: currentActivity.chapter_id,
        chapterNumber: currentActivity.chapter_number,
        jobType: currentActivity.job_type,
        startedAt: currentActivity.started_at,
      } : undefined,
      recentEvents,
      flags: flagStats,
      rateLimitStatus,
    };

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project progress');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Helper: Format time remaining in a human-readable format
 */
function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * GET /api/projects/:id
 * Get project details
 *
 * Query params:
 * - include: Comma-separated list of related data to include
 *   - 'books': Include all books for this project
 *   - 'chapters': Include all chapters for all books (requires 'books')
 *
 * Performance: Uses JOINs to fetch related data in single queries
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);

    const project = stmt.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Parse JSON fields and attach metrics (with safe parsing)
    const parsedProject: any = {
      ...project,
      story_dna: safeJsonParse(project.story_dna as any, null),
      story_bible: safeJsonParse(project.story_bible as any, null),
      story_concept: safeJsonParse((project as any).story_concept, null),
      metrics: metricsService.getFormattedMetrics(project.id),
    };

    // Handle include query parameter for related data
    const includeParam = req.query.include as string | undefined;
    if (includeParam) {
      const includes = includeParam.split(',').map(s => s.trim().toLowerCase());

      // Include books
      if (includes.includes('books') || includes.includes('chapters')) {
        const booksStmt = db.prepare(`
          SELECT id, project_id, book_number, title, status, word_count, created_at, updated_at
          FROM books
          WHERE project_id = ?
          ORDER BY book_number ASC
        `);
        const books = booksStmt.all(req.params.id) as any[];

        // Include chapters for each book (uses single query with JOIN for efficiency)
        if (includes.includes('chapters')) {
          const chaptersStmt = db.prepare(`
            SELECT c.id, c.book_id, c.chapter_number, c.title, c.status, c.word_count
            FROM chapters c
            INNER JOIN books b ON c.book_id = b.id
            WHERE b.project_id = ?
            ORDER BY b.book_number ASC, c.chapter_number ASC
          `);
          const allChapters = chaptersStmt.all(req.params.id) as any[];

          // Group chapters by book_id
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

          // Attach chapters to books
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
 *
 * Supports:
 * - projectType: 'standalone' | 'trilogy' | 'series'
 * - bookCount: number of books (3 for trilogy, 4+ for series)
 * - universeId: ID of existing universe to link to
 * - sourceProjectId: ID of project to create universe from
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

    // Determine project type and book count
    const projectType = preferences.projectType || 'standalone';
    let bookCount = 1;
    if (projectType === 'trilogy') {
      bookCount = 3;
    } else if (projectType === 'series') {
      bookCount = preferences.bookCount || 4;
    }

    // Handle universe linking
    let universeId: string | null = null;

    if (preferences.universeId) {
      // Link to existing universe
      universeId = preferences.universeId;
    } else if (preferences.sourceProjectId) {
      // Create or get universe from source project
      universeId = universeService.getOrCreateUniverse(preferences.sourceProjectId);
    }

    // Extract time period settings (Phase 4)
    const timePeriodType = preferences.timePeriodType || preferences.timePeriod?.type || null;
    const specificYear = preferences.specificYear || preferences.timePeriod?.year || null;

    // Build story concept object for storage
    const storyConcept = {
      title: concept.title,
      logline: concept.logline || null,
      synopsis: concept.synopsis || null,
      hook: (concept as any).hook || null,
      protagonistHint: (concept as any).protagonistHint || null,
      conflictType: (concept as any).conflictType || null,
    };

    // Get source concept ID if provided
    const sourceConceptId = (concept as any).id || null;

    const stmt = db.prepare(`
      INSERT INTO projects (id, title, type, genre, status, book_count, universe_id, time_period_type, specific_year, story_concept, source_concept_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
 *
 * BUG FIX: Whitelisted allowed fields to prevent SQL injection
 */
router.put('/:id', (req, res) => {
  try {
    const validation = validateRequest(updateProjectSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { storyDNA, storyBible, status } = validation.data;

    // Whitelist of allowed update fields (prevents SQL injection)
    const updates: string[] = [];
    const params: any[] = [];

    // Validate and build update fields
    if (storyDNA !== undefined) {
      updates.push('story_dna = ?');
      params.push(JSON.stringify(storyDNA));
    }

    if (storyBible !== undefined) {
      updates.push('story_bible = ?');
      params.push(JSON.stringify(storyBible));
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'No valid fields to update' },
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
 * POST /api/projects/:id/story-dna
 * Generate Story DNA for a project
 */
router.post('/:id/story-dna', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { concept } = req.body;

    if (!concept) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Concept is required' },
      });
    }

    // Generate Story DNA
    const storyDNA = await generateStoryDNA(concept);

    // Save to database
    const stmt = db.prepare(`
      UPDATE projects
      SET story_dna = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(storyDNA), new Date().toISOString(), projectId);

    res.json(storyDNA);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating Story DNA');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters
 * Generate characters for a project
 * Also generates Story DNA if it doesn't exist
 */
router.post('/:id/characters', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Context is required' },
      });
    }

    // Get existing project data
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Generate Story DNA if it doesn't exist
    let storyDNA = safeJsonParse(project.story_dna as any, null);
    if (!storyDNA) {
      logger.info({ projectId }, 'No Story DNA found, generating...');
      storyDNA = await generateStoryDNA({
        title: project.title,
        logline: context.synopsis || 'A compelling story',
        synopsis: context.synopsis || 'A compelling story',
        genre: project.genre,
        subgenre: context.subgenre || project.genre,
        tone: context.tone || 'dramatic',
        themes: context.themes || [],
      });

      // Save Story DNA immediately
      const dnaStmt = db.prepare(`
        UPDATE projects SET story_dna = ?, updated_at = ? WHERE id = ?
      `);
      dnaStmt.run(JSON.stringify(storyDNA), new Date().toISOString(), projectId);
      logger.info({ projectId }, 'Story DNA generated and saved');
    }

    // Enrich context with Story DNA
    const enrichedContext = {
      ...context,
      tone: storyDNA.tone || context.tone,
      themes: storyDNA.themes || context.themes,
      proseStyle: storyDNA.proseStyle,
      nationalityConfig: context.nationalityConfig,
    };

    // Assign nationalities if configured
    const totalCharacters = 5; // 1 protagonist + ~4-6 supporting (estimate 5 total)
    const assignedNationalities = assignNationalities(totalCharacters, context.nationalityConfig);

    logger.info({ nationalityConfig: context.nationalityConfig, assignedNationalities }, 'Nationality configuration');

    // Generate protagonist first
    const protagonistNationality = assignedNationalities ? assignedNationalities[0] : undefined;
    const protagonist = await generateProtagonist(enrichedContext, protagonistNationality);

    // Generate supporting cast
    const supportingNationalities = assignedNationalities ? assignedNationalities.slice(1) : undefined;
    const supportingCast = await generateSupportingCast(enrichedContext, protagonist, supportingNationalities);

    // Combine all characters
    const allCharacters = [protagonist, ...supportingCast];

    // Link relationships
    allCharacters.forEach(char => {
      if (char.role !== 'protagonist') {
        // Update protagonist ID in relationships
        char.relationships = char.relationships.map(rel => ({
          ...rel,
          characterId: protagonist.id,
          characterName: protagonist.name,
        }));
      }
    });

    // Get existing story bible or create new one
    const storyBible = project?.story_bible
      ? safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] })
      : { characters: [], world: [], timeline: [] };

    // Update characters
    storyBible.characters = allCharacters;

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ characters: allCharacters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating characters');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/world
 * Generate world elements for a project
 */
router.post('/:id/world', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Context is required' },
      });
    }

    // Generate world elements
    const worldElements = await generateWorldElements(context);

    // Get existing story bible or create new one
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    const storyBible = project?.story_bible
      ? safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] })
      : { characters: [], world: [], timeline: [] };

    // Update world elements
    storyBible.world = worldElements;

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ world: worldElements });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating world');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Helper: Propagate character name changes throughout the project
 * Updates scene cards, relationships, timelines, and optionally chapter content
 */
function propagateCharacterNameChange(
  projectId: string,
  oldName: string,
  newName: string,
  options: { updateChapterContent?: boolean } = {}
): { updatedSceneCards: number; updatedRelationships: number; updatedTimeline: number; updatedChapters: number } {
  const stats = { updatedSceneCards: 0, updatedRelationships: 0, updatedTimeline: 0, updatedChapters: 0 };

  if (oldName === newName) return stats;

  // Get all books for this project
  const booksStmt = db.prepare<[string], any>(`
    SELECT id FROM books WHERE project_id = ?
  `);
  const books = booksStmt.all(projectId);

  // Update scene cards in all chapters
  for (const book of books) {
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT id, scene_cards, content, summary FROM chapters WHERE book_id = ?
    `);
    const chapters = chaptersStmt.all(book.id);

    for (const chapter of chapters) {
      let needsUpdate = false;
      let sceneCards = safeJsonParse(chapter.scene_cards, []);
      let content = chapter.content || '';
      let summary = chapter.summary || '';

      // Update scene cards
      for (const scene of sceneCards) {
        // Update characters array
        if (scene.characters && Array.isArray(scene.characters)) {
          const idx = scene.characters.indexOf(oldName);
          if (idx !== -1) {
            scene.characters[idx] = newName;
            stats.updatedSceneCards++;
            needsUpdate = true;
          }
        }
        // Update POV character
        if (scene.povCharacter === oldName) {
          scene.povCharacter = newName;
          stats.updatedSceneCards++;
          needsUpdate = true;
        }
      }

      // Optionally update chapter content (generated prose)
      if (options.updateChapterContent && content) {
        // Use word boundary regex to avoid partial replacements
        const nameRegex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
        if (nameRegex.test(content)) {
          content = content.replace(nameRegex, newName);
          stats.updatedChapters++;
          needsUpdate = true;
        }
        if (summary && nameRegex.test(summary)) {
          summary = summary.replace(nameRegex, newName);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const updateChapterStmt = db.prepare(`
          UPDATE chapters SET scene_cards = ?, content = ?, summary = ?, updated_at = ? WHERE id = ?
        `);
        updateChapterStmt.run(
          JSON.stringify(sceneCards),
          content,
          summary,
          new Date().toISOString(),
          chapter.id
        );
      }
    }
  }

  // Update story bible (relationships, timeline)
  const projectStmt = db.prepare<[string], any>(`
    SELECT story_bible, series_bible FROM projects WHERE id = ?
  `);
  const project = projectStmt.get(projectId);

  if (project?.story_bible) {
    const storyBible = safeJsonParse(project.story_bible, null);
    if (storyBible) {
      // Update relationships in all characters
      for (const character of storyBible.characters || []) {
        if (character.relationships && Array.isArray(character.relationships)) {
          for (const rel of character.relationships) {
            if (rel.characterName === oldName) {
              rel.characterName = newName;
              stats.updatedRelationships++;
            }
          }
        }
      }

      // Update timeline participants
      if (storyBible.timeline && Array.isArray(storyBible.timeline)) {
        for (const event of storyBible.timeline) {
          if (event.participants && Array.isArray(event.participants)) {
            const idx = event.participants.indexOf(oldName);
            if (idx !== -1) {
              event.participants[idx] = newName;
              stats.updatedTimeline++;
            }
          }
        }
      }

      // Save updated story bible
      const updateProjectStmt = db.prepare(`
        UPDATE projects SET story_bible = ?, updated_at = ? WHERE id = ?
      `);
      updateProjectStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);
    }
  }

  // Update series bible if exists
  if (project?.series_bible) {
    const seriesBible = safeJsonParse(project.series_bible, null);
    if (seriesBible) {
      // Update character entries
      if (seriesBible.characters && Array.isArray(seriesBible.characters)) {
        for (const entry of seriesBible.characters) {
          if (entry.name === oldName) {
            entry.name = newName;
          }
          // Update development text
          if (entry.development && Array.isArray(entry.development)) {
            for (const dev of entry.development) {
              if (dev.changes && typeof dev.changes === 'string') {
                const nameRegex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
                dev.changes = dev.changes.replace(nameRegex, newName);
              }
            }
          }
        }
      }

      const updateSeriesStmt = db.prepare(`
        UPDATE projects SET series_bible = ?, updated_at = ? WHERE id = ?
      `);
      updateSeriesStmt.run(JSON.stringify(seriesBible), new Date().toISOString(), projectId);
    }
  }

  return stats;
}

/**
 * Helper: Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * PUT /api/projects/:id/characters/:characterId
 * Update a character
 * If name changes, propagates the change to scene cards and relationships
 */
router.put('/:id/characters/:characterId', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const updatedCharacter = req.body;
    const { propagateToContent } = req.query; // Optional: also update chapter content

    // Get current story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find and update character
    const charIndex = storyBible.characters.findIndex((c: any) => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const oldCharacter = storyBible.characters[charIndex];
    const oldName = oldCharacter.name;
    const newName = updatedCharacter.name;

    storyBible.characters[charIndex] = { ...oldCharacter, ...updatedCharacter };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    // If name changed, propagate to scene cards and relationships
    let propagationStats: { updatedSceneCards: number; updatedRelationships: number; updatedTimeline: number; updatedChapters: number } | null = null;
    if (oldName && newName && oldName !== newName) {
      propagationStats = propagateCharacterNameChange(projectId, oldName, newName, {
        updateChapterContent: propagateToContent === 'true',
      });
      logger.info({ projectId, oldName, newName, stats: propagationStats }, 'Character name propagated');
    }

    res.json({
      character: storyBible.characters[charIndex],
      propagation: propagationStats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating character');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/propagate-name
 * Explicitly propagate a character's current name to all references
 * Useful after manual name edits or to fix inconsistencies
 */
router.post('/:id/characters/:characterId/propagate-name', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { oldName, updateChapterContent } = req.body;

    if (!oldName) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'oldName is required' },
      });
    }

    // Get current character name
    const getStmt = db.prepare<[string], any>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible, null);
    const character = storyBible?.characters?.find((c: any) => c.id === characterId);

    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const newName = character.name;

    // Propagate the name change
    const stats = propagateCharacterNameChange(projectId, oldName, newName, {
      updateChapterContent: updateChapterContent === true,
    });

    logger.info({ projectId, characterId, oldName, newName, stats }, 'Character name propagated');

    res.json({
      success: true,
      oldName,
      newName,
      stats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error propagating character name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/characters/:characterId/name-references
 * Get a preview of all places where a character name appears
 * Useful before changing a name to show impact
 */
router.get('/:id/characters/:characterId/name-references', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;

    // Get character
    const getStmt = db.prepare<[string], any>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible, null);
    const character = storyBible?.characters?.find((c: any) => c.id === characterId);

    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const characterName = character.name;
    const references: {
      sceneCards: number;
      povScenes: number;
      relationships: number;
      timelineEvents: number;
      chaptersWithContent: number;
    } = {
      sceneCards: 0,
      povScenes: 0,
      relationships: 0,
      timelineEvents: 0,
      chaptersWithContent: 0,
    };

    // Count scene card references
    const booksStmt = db.prepare<[string], any>(`SELECT id FROM books WHERE project_id = ?`);
    const books = booksStmt.all(projectId);

    for (const book of books) {
      const chaptersStmt = db.prepare<[string], any>(`
        SELECT scene_cards, content FROM chapters WHERE book_id = ?
      `);
      const chapters = chaptersStmt.all(book.id);

      for (const chapter of chapters) {
        const sceneCards = safeJsonParse(chapter.scene_cards, []);
        for (const scene of sceneCards) {
          if (scene.characters?.includes(characterName)) {
            references.sceneCards++;
          }
          if (scene.povCharacter === characterName) {
            references.povScenes++;
          }
        }
        // Check chapter content
        if (chapter.content && chapter.content.includes(characterName)) {
          references.chaptersWithContent++;
        }
      }
    }

    // Count relationship references
    for (const char of storyBible.characters || []) {
      if (char.id !== characterId && char.relationships) {
        for (const rel of char.relationships) {
          if (rel.characterName === characterName) {
            references.relationships++;
          }
        }
      }
    }

    // Count timeline references
    for (const event of storyBible.timeline || []) {
      if (event.participants?.includes(characterName)) {
        references.timelineEvents++;
      }
    }

    res.json({
      characterName,
      references,
      totalReferences: Object.values(references).reduce((a, b) => a + b, 0),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting name references');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/regenerate-name
 * Regenerate a character's name using AI
 * Accepts optional ethnicity/nationality in body to use current editor values
 */
router.post('/:id/characters/:characterId/regenerate-name', async (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { ethnicity: editedEthnicity, nationality: editedNationality } = req.body || {};

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find the character
    const charIndex = storyBible.characters.findIndex((c: any) => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const character = storyBible.characters[charIndex];

    // Use edited values if provided, otherwise fall back to stored values
    const ethnicity = editedEthnicity || character.ethnicity || 'not specified';
    const nationality = editedNationality || character.nationality || 'not specified';

    // Build prompt for name generation
    const prompt = `You are a creative naming expert. Generate a new name for this character that fits their background and the story's genre.

**Story Genre:** ${storyDNA?.genre || project.genre}
**Tone:** ${storyDNA?.tone || 'dramatic'}

**Character Details:**
- Role: ${character.role}
- Ethnicity/Background: ${ethnicity}
- Nationality: ${nationality}
- Personality: ${character.personality?.join(', ') || 'not specified'}

**Current Name:** ${character.name}

Generate a new, culturally appropriate name that:
1. Matches the character's ethnicity and nationality
2. Fits the genre and tone
3. Is memorable and distinct
4. Feels authentic to the character's background

Return ONLY the new name, nothing else. Just the full name.`;

    // Call Claude API
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 100,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const newName = responseText.trim();
    const oldName = character.name;

    // Import regenerateDependentFields for auto-update
    const { regenerateDependentFields } = await import('../services/character-generator.js');

    // Auto-regenerate backstory and character arc with the new name
    let updatedBackstory = character.backstory;
    let updatedCharacterArc = character.characterArc;

    try {
      const regeneratedFields = await regenerateDependentFields({
        projectId,
        characterId,
        newName,
        character: { ...character, name: newName },
        fieldsToUpdate: ['backstory', 'characterArc'],
        storyContext: {
          genre: storyDNA?.genre || project.genre,
          tone: storyDNA?.tone,
          themes: storyDNA?.themes,
        },
      });

      if (regeneratedFields.backstory) {
        updatedBackstory = regeneratedFields.backstory;
      }
      if (regeneratedFields.characterArc) {
        updatedCharacterArc = regeneratedFields.characterArc;
      }

      logger.info({ characterId, oldName, newName }, 'Auto-updated backstory and arc during name regeneration');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to auto-update dependent fields, using simple name replacement');
      // Fallback: simple name replacement
      const updateNameInText = (text: string | undefined): string | undefined => {
        if (!text || !oldName) return text;
        return text.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName);
      };
      updatedBackstory = updateNameInText(character.backstory);
      updatedCharacterArc = updateNameInText(character.characterArc);
    }

    // Update character with new name and regenerated fields
    storyBible.characters[charIndex] = {
      ...character,
      name: newName,
      // Save the edited ethnicity/nationality if provided
      ethnicity: editedEthnicity || character.ethnicity,
      nationality: editedNationality || character.nationality,
      // Use regenerated fields
      backstory: updatedBackstory,
      characterArc: updatedCharacterArc,
      voiceSample: character.voiceSample, // Keep voice sample as-is
      currentState: character.currentState, // Keep current state as-is
    };

    // Update relationships in other characters
    storyBible.characters.forEach((char: any, idx: number) => {
      if (idx !== charIndex && char.relationships) {
        char.relationships = char.relationships.map((rel: any) => ({
          ...rel,
          characterName: rel.characterId === characterId ? newName : rel.characterName,
        }));
      }
    });

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json(storyBible.characters[charIndex]);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating character name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/auto-update-dependent-fields
 * Auto-update backstory and character arc when name changes
 * Body: { newName: string, fieldsToUpdate: ('backstory' | 'characterArc')[] }
 */
router.post('/:id/characters/:characterId/auto-update-dependent-fields', async (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { newName, fieldsToUpdate } = req.body;

    if (!newName || !fieldsToUpdate || !Array.isArray(fieldsToUpdate)) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'newName and fieldsToUpdate array are required' },
      });
    }

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find the character
    const character = storyBible.characters.find((c: any) => c.id === characterId);
    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    // Import regenerateDependentFields
    const { regenerateDependentFields } = await import('../services/character-generator.js');

    // Regenerate the fields
    const updatedFields = await regenerateDependentFields({
      projectId,
      characterId,
      newName,
      character: { ...character, name: newName }, // Pass character with new name
      fieldsToUpdate: fieldsToUpdate.filter((f: string) => f === 'backstory' || f === 'characterArc'),
      storyContext: {
        genre: storyDNA?.genre || project.genre,
        tone: storyDNA?.tone,
        themes: storyDNA?.themes,
      },
    });

    logger.info({ projectId, characterId, newName, fieldsUpdated: Object.keys(updatedFields) }, 'Auto-updated dependent fields');

    res.json(updatedFields);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error auto-updating dependent fields');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/regenerate-all-names
 * Regenerate all character names using AI
 */
router.post('/:id/characters/regenerate-all-names', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    if (!storyBible.characters || storyBible.characters.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_CHARACTERS', message: 'No characters to regenerate names for' },
      });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Regenerate names for all characters
    const updatedCharacters: any[] = [];
    for (const character of storyBible.characters) {
      const prompt = `You are a creative naming expert. Generate a new name for this character that fits their background and the story's genre.

**Story Genre:** ${storyDNA?.genre || project.genre}
**Tone:** ${storyDNA?.tone || 'dramatic'}

**Character Details:**
- Role: ${character.role}
- Ethnicity/Background: ${character.ethnicity || 'not specified'}
- Nationality: ${character.nationality || 'not specified'}
- Personality: ${character.personality?.join(', ') || 'not specified'}

**Current Name:** ${character.name}

Generate a new, culturally appropriate name that:
1. Matches the character's ethnicity and nationality
2. Fits the genre and tone
3. Is memorable and distinct
4. Feels authentic to the character's background

Return ONLY the new name, nothing else. Just the full name.`;

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 100,
        temperature: 0.9,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const newName = responseText.trim();

      updatedCharacters.push({
        ...character,
        name: newName,
      });
    }

    // Update relationships with new names
    updatedCharacters.forEach((char, idx) => {
      if (char.relationships) {
        char.relationships = char.relationships.map((rel: any) => {
          const relatedChar = updatedCharacters.find((c: any) => c.id === rel.characterId);
          return {
            ...rel,
            characterName: relatedChar ? relatedChar.name : rel.characterName,
          };
        });
      }
    });

    // Save to database
    storyBible.characters = updatedCharacters;

    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ characters: updatedCharacters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating all character names');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/books-with-chapters
 * Fetch a project with all its books and chapters in a single optimized query
 *
 * This endpoint fixes the N+1 query problem by using JOINs to fetch:
 * - Project details
 * - All books for the project
 * - All chapters for all books
 *
 * Query parameters:
 * - chapterLimit: Max chapters per book (default: 100, max: 500)
 * - chapterOffset: Offset for chapter pagination per book (default: 0)
 * - includeContent: Whether to include chapter content (default: false, can be large)
 *
 * @returns {ProjectWithBooksAndChapters} Nested structure with project, books, and chapters
 */
router.get('/:id/books-with-chapters', (req, res) => {
  try {
    const projectId = req.params.id;

    // Parse pagination parameters with sensible defaults
    const chapterLimit = Math.min(
      Math.max(1, parseInt(req.query.chapterLimit as string, 10) || 100),
      500
    );
    const chapterOffset = Math.max(0, parseInt(req.query.chapterOffset as string, 10) || 0);
    const includeContent = req.query.includeContent === 'true';

    // Step 1: Fetch project
    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Step 2: Fetch all books for the project in a single query
    const booksStmt = db.prepare(`
      SELECT id, project_id, book_number, title, status, word_count, created_at, updated_at
      FROM books
      WHERE project_id = ?
      ORDER BY book_number ASC
    `);
    const books = booksStmt.all(projectId) as any[];

    // Step 3: Fetch all chapters for all books in a single query using JOIN
    // This is the key optimization - one query instead of N queries (one per book)
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

    // Step 4: Group chapters by book_id for efficient lookup
    const chaptersByBook = new Map<string, any[]>();
    for (const chapter of allChapters) {
      if (!chaptersByBook.has(chapter.book_id)) {
        chaptersByBook.set(chapter.book_id, []);
      }
      chaptersByBook.get(chapter.book_id)!.push(chapter);
    }

    // Step 5: Apply pagination to each book's chapters and attach to books
    let totalChapters = 0;
    const booksWithChapters = books.map((book) => {
      const bookChapters = chaptersByBook.get(book.id) || [];
      totalChapters += bookChapters.length;

      // Apply pagination per book
      const paginatedChapters = bookChapters.slice(
        chapterOffset,
        chapterOffset + chapterLimit
      );

      // Parse JSON fields in chapters
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

    // Step 6: Parse project JSON fields
    const parsedProject = {
      ...project,
      story_dna: safeJsonParse(project.story_dna as any, null),
      story_bible: safeJsonParse(project.story_bible as any, null),
    };

    // Return the nested structure
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

/**
 * GET /api/projects/:id/metrics
 * Get detailed metrics for a project
 */
router.get('/:id/metrics', (req, res) => {
  try {
    const metrics = metricsService.getFormattedMetrics(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project metrics not found' },
      });
    }

    res.json(metrics);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project metrics');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/world/:elementId
 * Update a world element
 */
router.put('/:id/world/:elementId', (req, res) => {
  try {
    const { id: projectId, elementId } = req.params;
    const updatedElement = req.body;

    // Get current story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find and update world element
    const elemIndex = storyBible.world.findIndex((w: any) => w.id === elementId);
    if (elemIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'World element not found' },
      });
    }

    storyBible.world[elemIndex] = { ...storyBible.world[elemIndex], ...updatedElement };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json(storyBible.world[elemIndex]);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating world element');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/plot-structure
 * Update plot structure for multi-layered story tracking
 */
router.put('/:id/plot-structure', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { plot_structure } = req.body;

    if (!plot_structure) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plot_structure is required' },
      });
    }

    // Validate structure
    if (plot_structure.plot_layers && !Array.isArray(plot_structure.plot_layers)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plot_layers must be an array' },
      });
    }

    const updateStmt = db.prepare(`
      UPDATE projects
      SET plot_structure = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(plot_structure), new Date().toISOString(), projectId);

    logger.info({ projectId, layerCount: plot_structure.plot_layers?.length || 0 }, 'Plot structure updated');

    res.json({ success: true, plot_structure });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating plot structure');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/validate-plot-coherence
 * Validate that plots are coherent with the story concept and DNA
 * Returns warnings (not errors) for plots that seem unrelated
 */
router.post('/:id/validate-plot-coherence', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get project with story concept/DNA
    const projectStmt = db.prepare<[string], any>(`
      SELECT title, genre, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna, null);
    const storyBible = safeJsonParse(project.story_bible, null);
    const plotStructure = safeJsonParse(project.plot_structure, { plot_layers: [] });

    if (!plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
      return res.json({
        isCoherent: false,
        warnings: ['No plots defined. Your story needs at least a main plot to generate a quality outline.'],
        suggestions: ['Visit the Plot page to define your main plot and subplots.'],
      });
    }

    // Check for main plot
    const hasMainPlot = plotStructure.plot_layers.some((l: any) => l.type === 'main');
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!hasMainPlot) {
      warnings.push('No main plot (golden thread) defined. Every novel needs a central narrative arc.');
      suggestions.push('Convert one of your subplots to main plot, or create a new main plot that ties everything together.');
    }

    // Build context for AI validation
    const storyContext = `
Title: ${project.title}
Genre: ${project.genre}
${storyDNA?.themes?.length > 0 ? `Themes: ${storyDNA.themes.join(', ')}` : ''}
${storyDNA?.tone ? `Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length > 0 ? `Main Characters: ${storyBible.characters.slice(0, 5).map((c: any) => c.name).join(', ')}` : ''}
    `.trim();

    const plotSummaries = plotStructure.plot_layers.map((p: any) =>
      `- ${p.name} (${p.type}): ${p.description}`
    ).join('\n');

    // Use Claude to validate coherence
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `You are a story coherence validator. Analyze whether these plots fit the story concept.

**Story Context:**
${storyContext}

**Defined Plots:**
${plotSummaries}

Evaluate:
1. Does each plot fit the genre (${project.genre})?
2. Are plots thematically consistent with the story?
3. Are there any plots that seem out of place or contradictory?
4. Are character arcs connected to characters in the story?

Return ONLY a JSON object:
{
  "isCoherent": true/false,
  "plotAnalysis": [
    {
      "plotName": "Plot name",
      "isCoherent": true/false,
      "reason": "Brief explanation"
    }
  ],
  "overallWarnings": ["Any warnings about the plot structure"],
  "suggestions": ["Actionable suggestions for improvement"]
}`,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // If parsing fails, return basic validation
      return res.json({
        isCoherent: hasMainPlot,
        warnings: warnings,
        suggestions: suggestions,
        plotAnalysis: [],
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Merge AI analysis with basic checks
    const finalWarnings = [...warnings, ...(analysis.overallWarnings || [])];
    const finalSuggestions = [...suggestions, ...(analysis.suggestions || [])];

    // Check for incoherent individual plots
    const incoherentPlots = (analysis.plotAnalysis || []).filter((p: any) => !p.isCoherent);
    incoherentPlots.forEach((p: any) => {
      finalWarnings.push(`"${p.plotName}" may not fit: ${p.reason}`);
    });

    res.json({
      isCoherent: hasMainPlot && (analysis.isCoherent ?? true) && incoherentPlots.length === 0,
      warnings: finalWarnings,
      suggestions: finalSuggestions,
      plotAnalysis: analysis.plotAnalysis || [],
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error validating plot coherence');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/plot-structure
 * Get plot structure for a project
 */
router.get('/:id/plot-structure', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const stmt = db.prepare<[string], any>(`
      SELECT plot_structure FROM projects WHERE id = ?
    `);
    const project = stmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const plotStructure = safeJsonParse(project.plot_structure, {
      plot_layers: [],
      act_structure: {
        act_one_end: 5,
        act_two_midpoint: 12,
        act_two_end: 20,
        act_three_climax: 23,
      },
      pacing_notes: '',
    });

    res.json(plotStructure);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching plot structure');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Helper: Calculate similarity between two strings (0-1, where 1 is identical)
 * Uses character-based overlap ratio
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1.length === 0 || s2.length === 0) return 0;

  // Count matching characters
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) {
      matches++;
    }
  }

  return matches / longer.length;
}

/**
 * Helper: Check if new value is too similar to existing values
 * Returns the similar value if found, null otherwise
 */
function findSimilarValue(newValue: string, existingValues: string[], threshold: number = 0.8): string | null {
  for (const existing of existingValues) {
    const similarity = calculateStringSimilarity(newValue, existing);
    if (similarity >= threshold) {
      return existing;
    }
  }
  return null;
}

/**
 * POST /api/projects/:id/generate-plot-layer-field
 * Generate a name or description for a plot layer using AI
 * Implements uniqueness validation with retry logic
 */
router.post('/:id/generate-plot-layer-field', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { field, layerType, existingValues: contextValues, existingNames, currentDescription } = req.body;

    if (!field || !['name', 'description'].includes(field)) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'field must be "name" or "description"' },
      });
    }

    if (!layerType) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'layerType is required' },
      });
    }

    // Get project context
    const projectStmt = db.prepare<[string], Project>(`
      SELECT title, genre, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);
    const plotStructure = safeJsonParse((project as any).plot_structure, null);

    // Get existing layer names to avoid duplicates
    const existingLayerNames = existingNames || plotStructure?.plot_layers?.map((l: any) => l.name) || [];

    // Get existing descriptions if generating description
    const existingDescriptions = field === 'description'
      ? plotStructure?.plot_layers?.map((l: any) => l.description).filter(Boolean) || []
      : [];

    // Import Anthropic client
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    let generatedValue = '';
    let attempts = 0;
    const maxAttempts = 3;
    let similarTo: string | null = null;

    // Retry loop for uniqueness
    while (attempts < maxAttempts) {
      attempts++;

      let prompt: string;

      if (field === 'name') {
        const attemptNote = attempts > 1
          ? `\n\nIMPORTANT: Previous attempt "${generatedValue}" was too similar to "${similarTo}". Generate something COMPLETELY DIFFERENT.`
          : '';

        prompt = `You are a creative story structure expert. Generate a unique, creative name for a ${layerType} plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Layer Type:** ${layerType}
${contextValues?.description ? `**Description Hint:** ${contextValues.description}` : ''}

**Existing Plot Names (MUST BE DIFFERENT FROM ALL OF THESE):** ${existingLayerNames.join(', ') || 'None'}

Generate a short, evocative name for this plot layer that:
1. Reflects the type of plot thread (${layerType})
2. Hints at the emotional or dramatic content
3. Is distinctly different from all existing names
4. Is 2-4 words maximum
5. Should be evocative and memorable
6. Should hint at the plot's theme without spoilers
7. Avoid adding 's' or minor word changes to create "variations"
8. Do NOT create names similar to: ${existingLayerNames.join(', ')}

Return ONLY the name, nothing else.${attemptNote}`;
      } else {
        const attemptNote = attempts > 1
          ? `\n\nIMPORTANT: Previous attempt was too similar to an existing description. Generate something COMPLETELY DIFFERENT with unique wording and focus.`
          : '';

        prompt = `You are a story structure expert. Generate a brief, unique description for a plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Layer:**
- Type: ${layerType}
${contextValues?.name ? `- Name: ${contextValues.name}` : ''}

${currentDescription ? `**Current Description (generate something DIFFERENT):** ${currentDescription}` : ''}

Generate a 1-2 sentence description for this plot layer that:
1. Explains what this thread will explore
2. Hints at the central conflict or tension
3. Connects to the genre and tone
4. Is specific enough to guide plot point creation
5. Is DISTINCTLY DIFFERENT from any existing plot descriptions
6. Uses unique wording and perspective

${existingDescriptions.length > 0 ? `**Existing Descriptions (MUST BE DIFFERENT):**\n${existingDescriptions.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}` : ''}

Return ONLY the description, nothing else.${attemptNote}`;
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0.8 + (attempts * 0.1), // Increase temperature on retries for more variety
        messages: [{ role: 'user', content: prompt }],
      });

      generatedValue = message.content[0].type === 'text'
        ? message.content[0].text.trim()
        : '';

      // Check uniqueness
      const existingValues = field === 'name' ? existingLayerNames : existingDescriptions;
      similarTo = findSimilarValue(generatedValue, existingValues);

      if (!similarTo) {
        // Success - unique value generated
        logger.info({
          projectId,
          field,
          layerType,
          generatedValue,
          attempts
        }, 'Plot layer field generated (unique)');

        res.json({
          field,
          value: generatedValue,
          attempts,
          isUnique: true
        });
        return;
      }

      // Log similarity issue and retry
      logger.warn({
        projectId,
        field,
        attempt: attempts,
        generatedValue,
        similarTo
      }, 'Generated value too similar, retrying');
    }

    // If we get here, we failed to generate a unique value after max attempts
    logger.warn({
      projectId,
      field,
      attempts,
      generatedValue,
      similarTo
    }, 'Failed to generate unique value after max attempts, returning best attempt');

    res.json({
      field,
      value: generatedValue,
      attempts,
      isUnique: false,
      warning: `Generated value may be similar to existing values. Consider editing manually.`
    });

  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating plot layer field');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/generate-plot-points
 * Generate plot points for a specific layer using AI
 */
router.post('/:id/generate-plot-points', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { layerId, layerName, layerType, layerDescription, totalChapters, actStructure } = req.body;

    if (!layerId || !layerName) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'layerId and layerName are required' },
      });
    }

    // Get project context for better generation
    const projectStmt = db.prepare<[string], Project>(`
      SELECT title, genre, story_dna, story_bible FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);

    // Import Anthropic client
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a story structure expert. Generate 5-7 plot points for a ${layerType} plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Plot Layer:**
- Name: ${layerName}
- Type: ${layerType}
${layerDescription ? `- Description: ${layerDescription}` : ''}

**Structure:**
- Total Chapters: ${totalChapters || 25}
- Act I ends: Chapter ${actStructure?.act_one_end || 5}
- Midpoint: Chapter ${actStructure?.act_two_midpoint || 12}
- Act II ends: Chapter ${actStructure?.act_two_end || 20}
- Climax: Chapter ${actStructure?.act_three_climax || 23}

Generate plot points that:
1. Follow the three-act structure
2. Build tension progressively
3. Have varied impact levels (1-5)
4. Cover setup, rising action, midpoint, crisis, climax, falling action, and resolution phases

Return ONLY a JSON array of plot points:
[
  {
    "id": "point-1",
    "chapter_number": 3,
    "description": "Brief description of what happens",
    "phase": "setup",
    "impact_level": 2
  }
]

Phase options: setup, rising, midpoint, crisis, climax, falling, resolution
Impact levels: 1 (minor) to 5 (critical turning point)`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse plot points from AI response');
    }

    const points = JSON.parse(jsonMatch[0]);

    // Validate and add unique IDs
    const validatedPoints = points.map((p: any, i: number) => ({
      id: `point-${Date.now()}-${i}`,
      chapter_number: Math.min(Math.max(1, p.chapter_number || 1), totalChapters || 25),
      description: p.description || 'Plot point',
      phase: ['setup', 'rising', 'midpoint', 'crisis', 'climax', 'falling', 'resolution'].includes(p.phase) ? p.phase : 'rising',
      impact_level: Math.min(Math.max(1, p.impact_level || 3), 5) as 1 | 2 | 3 | 4 | 5,
    }));

    logger.info({ projectId, layerId, pointsGenerated: validatedPoints.length }, 'Plot points generated');

    res.json({ points: validatedPoints });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating plot points');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/extract-plots-from-concept
 * Extract plot elements from story concept description
 */
router.post('/:id/extract-plots-from-concept', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get project and its story concept
    const projectStmt = db.prepare<[string], any>(`
      SELECT id, title, genre, story_dna, story_bible, story_concept, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna, null);
    const storyBible = safeJsonParse(project.story_bible, null);
    const storyConcept = safeJsonParse(project.story_concept, null);

    // Build rich concept description from stored story_concept
    let conceptDescription = '';

    if (storyConcept) {
      // Use the stored story concept (preferred source)
      const parts: string[] = [];
      if (storyConcept.synopsis) parts.push(storyConcept.synopsis);
      if (storyConcept.logline && !storyConcept.synopsis?.includes(storyConcept.logline)) {
        parts.push(`Logline: ${storyConcept.logline}`);
      }
      if (storyConcept.hook) parts.push(`Hook: ${storyConcept.hook}`);
      if (storyConcept.protagonistHint) parts.push(`Protagonist: ${storyConcept.protagonistHint}`);
      if (storyConcept.conflictType) parts.push(`Core Conflict: ${storyConcept.conflictType}`);
      conceptDescription = parts.join('\n\n');
    }

    // Fallback: check saved_concepts table by title match
    if (!conceptDescription) {
      const conceptStmt = db.prepare<[string], any>(`
        SELECT synopsis, logline FROM saved_concepts WHERE title = ? ORDER BY created_at DESC LIMIT 1
      `);
      const savedConcept = conceptStmt.get(project.title);
      conceptDescription = savedConcept?.synopsis || savedConcept?.logline || '';
    }

    // Final fallback: use story DNA themes
    if (!conceptDescription) {
      conceptDescription = storyDNA?.themes?.join('. ') || '';
    }

    if (!conceptDescription || conceptDescription === 'A compelling story') {
      return res.status(400).json({
        error: { code: 'NO_CONCEPT', message: 'No story concept found. Please create a story concept first.' },
      });
    }

    // Build prompt for plot extraction
    const prompt = `
Analyze this story concept and extract the key plot elements:

${conceptDescription}

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

Identify:
1. The MAIN PLOT (golden thread) - the primary narrative arc
2. KEY SUBPLOTS implied by the concept
3. CHARACTER ARC plots for main characters mentioned
4. THEMATIC plots (if any)

For each plot, provide:
- type: One of 'main_plot' | 'subplot' | 'character_arc' | 'mystery_thread' | 'romance_arc' | 'emotional_arc' | 'thematic_arc'
- name: A compelling, unique name for this plot thread (2-5 words)
- description: A detailed description of what this plot involves (1-2 sentences)
- isKeyPlot: true (all extracted plots are key plots)

Return ONLY a JSON array of plots with this structure:
[
  {
    "type": "main_plot",
    "name": "Plot name",
    "description": "Description of the plot thread",
    "isKeyPlot": true
  }
]

Extract 3-6 plot threads total. Focus on the most important narrative arcs.`;

    // Call Claude API
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse response - extract JSON array
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse plot extraction from AI response');
    }

    const extractedPlots = JSON.parse(jsonMatch[0]);

    // Map plot types to PlotLayer types
    const typeMapping: Record<string, 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc'> = {
      'main_plot': 'main',
      'subplot': 'subplot',
      'character_arc': 'character-arc',
      'mystery_thread': 'mystery',
      'romance_arc': 'romance',
      'emotional_arc': 'character-arc',
      'thematic_arc': 'subplot',
    };

    // Transform to response format
    const plots = extractedPlots.map((plot: any, index: number) => ({
      id: `extracted-${Date.now()}-${index}`,
      type: typeMapping[plot.type] || 'subplot',
      name: plot.name || 'Untitled Plot',
      description: plot.description || '',
      isKeyPlot: true,
      sourceType: 'story_concept',
      canDelete: false,
      canEdit: true,
      color: getPlotColor(typeMapping[plot.type] || 'subplot', index),
      points: [],
      status: 'active' as const,
    }));

    // Update project's plot structure if it exists
    const plotStructure = safeJsonParse(project.plot_structure, {
      plot_layers: [],
      act_structure: {
        act_one_end: 5,
        act_two_midpoint: 12,
        act_two_end: 20,
        act_three_climax: 23,
      },
      pacing_notes: '',
    });

    // Add extracted plots to plot structure (avoid duplicates by name)
    const existingNames = new Set(plotStructure.plot_layers.map((l: any) => l.name.toLowerCase()));
    const newPlots = plots.filter((p: any) => !existingNames.has(p.name.toLowerCase()));

    if (newPlots.length > 0) {
      plotStructure.plot_layers = [...plotStructure.plot_layers, ...newPlots];

      // Save updated plot structure
      const updateStmt = db.prepare(`
        UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(plotStructure), new Date().toISOString(), projectId);

      logger.info({ projectId, extractedCount: plots.length, addedCount: newPlots.length }, 'Plots extracted from concept');
    } else {
      logger.info({ projectId, extractedCount: plots.length }, 'Plots extracted but all already exist');
    }

    res.json({
      plots,
      addedToStructure: newPlots.length,
      totalExtracted: plots.length,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error extracting plots from concept');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Helper: Get color for plot type
 */
function getPlotColor(type: string, index: number): string {
  const colorPalette: Record<string, string[]> = {
    'main': ['#3b82f6', '#2563eb', '#1d4ed8'],
    'subplot': ['#10b981', '#059669', '#047857'],
    'mystery': ['#8b5cf6', '#7c3aed', '#6d28d9'],
    'romance': ['#ec4899', '#db2777', '#be185d'],
    'character-arc': ['#f59e0b', '#d97706', '#b45309'],
  };

  const colors = colorPalette[type] || colorPalette['subplot'];
  return colors[index % colors.length];
}

/**
 * POST /api/projects/:id/generate-pacing-notes
 * Generate pacing notes based on plot structure using AI
 */
router.post('/:id/generate-pacing-notes', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { plotLayers, actStructure, totalChapters } = req.body;

    if (!plotLayers || !Array.isArray(plotLayers)) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'plotLayers array is required' },
      });
    }

    // Get project context
    const projectStmt = db.prepare<[string], Project>(`
      SELECT title, genre, story_dna FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna as any, null);

    // Build layer summary
    const layerSummary = plotLayers.map((layer: any) =>
      `- ${layer.name} (${layer.type}): ${layer.points?.length || 0} plot points`
    ).join('\n');

    // Import Anthropic client
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a story structure and pacing expert. Generate concise pacing notes and recommendations for this story.

**Story:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
- Total Chapters: ${totalChapters || 25}

**Act Structure:**
- Act I ends: Chapter ${actStructure?.act_one_end || 5}
- Midpoint: Chapter ${actStructure?.act_two_midpoint || 12}
- Act II ends: Chapter ${actStructure?.act_two_end || 20}
- Climax: Chapter ${actStructure?.act_three_climax || 23}

**Plot Layers:**
${layerSummary}

Generate pacing notes that include:
1. Tension arc recommendations for each act
2. Key moments where multiple plot threads should intersect
3. Suggested "breather" chapters for reader recovery
4. Chapter-by-chapter pacing intensity suggestions (where needed)
5. Any potential pacing issues to watch for

Keep it practical and actionable. Format as clean markdown with headers and bullet points.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const pacingNotes = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    logger.info({ projectId, notesLength: pacingNotes.length }, 'Pacing notes generated');

    res.json({ pacingNotes });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating pacing notes');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
