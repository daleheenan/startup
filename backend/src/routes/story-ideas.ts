import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storyIdeasGenerator, GeneratedIdea, RegeneratableSection } from '../services/story-ideas-generator.js';
import { sendBadRequest, sendInternalError, sendRateLimitError, isRateLimitError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { generateStoryIdeasSchema, regenerateSectionSchema, validateRequest } from '../utils/schemas.js';
import db from '../db/connection.js';

const router = Router();
const logger = createLogger('routes:story-ideas');

/**
 * POST /api/story-ideas/generate
 * Generate a batch of creative story ideas based on genre/preferences
 */
router.post('/generate', async (req, res) => {
  try {
    // Validate request body with Zod
    const validation = validateRequest(generateStoryIdeasSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { genre, subgenre, tone, themes, count } = validation.data;

    logger.info({
      genre,
      subgenre,
      tone,
      themesCount: themes?.length || 0,
      count,
    }, 'Generating story ideas');

    const ideas = await storyIdeasGenerator.generateIdeas({
      genre,
      subgenre,
      tone,
      themes,
      count,
    });

    res.json({ success: true, ideas });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'generating story ideas');
  }
});

/**
 * POST /api/story-ideas/regenerate-section
 * Regenerate a specific section of an existing idea
 */
router.post('/regenerate-section', async (req, res) => {
  try {
    // Validate request body with Zod
    const validation = validateRequest(regenerateSectionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { ideaId, section, context } = validation.data;

    logger.info({
      ideaId,
      section,
    }, 'Regenerating idea section');

    const newItems = await storyIdeasGenerator.regenerateSection(
      ideaId,
      section as RegeneratableSection,
      context
    );

    res.json({
      success: true,
      section,
      items: newItems,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'regenerating section');
  }
});

/**
 * POST /api/story-ideas/save
 * Save a generated story idea for future use
 */
router.post('/save', async (req, res) => {
  try {
    const { idea, preferences, notes } = req.body;

    if (!idea || !idea.storyIdea) {
      return sendBadRequest(res, 'Story idea is required');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO saved_story_ideas (
        id, story_idea, character_concepts, plot_elements, unique_twists,
        genre, subgenre, tone, themes, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved', ?, ?)
    `);

    stmt.run(
      id,
      idea.storyIdea,
      JSON.stringify(idea.characterConcepts || []),
      JSON.stringify(idea.plotElements || []),
      JSON.stringify(idea.uniqueTwists || []),
      preferences?.genre || 'Unknown',
      preferences?.subgenre || null,
      preferences?.tone || null,
      JSON.stringify(preferences?.themes || []),
      notes || null,
      now,
      now
    );

    logger.info({ id, genre: preferences?.genre }, 'Story idea saved');

    res.json({
      success: true,
      id,
      message: 'Story idea saved successfully',
    });
  } catch (error) {
    sendInternalError(res, error, 'saving story idea');
  }
});

/**
 * GET /api/story-ideas/saved
 * Get all saved story ideas
 */
router.get('/saved', async (req, res) => {
  try {
    const { status, genre } = req.query;

    let query = 'SELECT * FROM saved_story_ideas WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      // Default to saved and used (not archived)
      query += ' AND status != ?';
      params.push('archived');
    }

    if (genre) {
      query += ' AND genre = ?';
      params.push(genre);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    const ideas = rows.map(row => ({
      id: row.id,
      storyIdea: row.story_idea,
      characterConcepts: JSON.parse(row.character_concepts || '[]'),
      plotElements: JSON.parse(row.plot_elements || '[]'),
      uniqueTwists: JSON.parse(row.unique_twists || '[]'),
      genre: row.genre,
      subgenre: row.subgenre,
      tone: row.tone,
      themes: JSON.parse(row.themes || '[]'),
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ success: true, ideas });
  } catch (error) {
    sendInternalError(res, error, 'fetching saved story ideas');
  }
});

/**
 * GET /api/story-ideas/saved/:id
 * Get a specific saved story idea
 */
router.get('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM saved_story_ideas WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story idea not found' },
      });
    }

    const idea = {
      id: row.id,
      storyIdea: row.story_idea,
      characterConcepts: JSON.parse(row.character_concepts || '[]'),
      plotElements: JSON.parse(row.plot_elements || '[]'),
      uniqueTwists: JSON.parse(row.unique_twists || '[]'),
      genre: row.genre,
      subgenre: row.subgenre,
      tone: row.tone,
      themes: JSON.parse(row.themes || '[]'),
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, idea });
  } catch (error) {
    sendInternalError(res, error, 'fetching story idea');
  }
});

/**
 * PUT /api/story-ideas/saved/:id
 * Update a saved story idea (notes, status)
 */
router.put('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, status } = req.body;

    // Check if idea exists
    const checkStmt = db.prepare('SELECT id FROM saved_story_ideas WHERE id = ?');
    const existing = checkStmt.get(id);

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story idea not found' },
      });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (status !== undefined) {
      if (!['saved', 'used', 'archived'].includes(status)) {
        return sendBadRequest(res, 'Invalid status. Must be saved, used, or archived');
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return sendBadRequest(res, 'No updates provided');
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const updateStmt = db.prepare(`
      UPDATE saved_story_ideas SET ${updates.join(', ')} WHERE id = ?
    `);
    updateStmt.run(...params);

    logger.info({ id, updates: { notes, status } }, 'Story idea updated');

    res.json({ success: true, message: 'Story idea updated' });
  } catch (error) {
    sendInternalError(res, error, 'updating story idea');
  }
});

/**
 * DELETE /api/story-ideas/saved/:id
 * Delete a saved story idea
 */
router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM saved_story_ideas WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story idea not found' },
      });
    }

    logger.info({ id }, 'Story idea deleted');

    res.json({ success: true, message: 'Story idea deleted' });
  } catch (error) {
    sendInternalError(res, error, 'deleting story idea');
  }
});

/**
 * POST /api/story-ideas/:id/expand
 * Expand a story idea into full story concepts (5 or 10)
 */
router.post('/:id/expand', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, preferences } = req.body;

    // Validate mode
    if (!mode || !['concepts_5', 'concepts_10'].includes(mode)) {
      return sendBadRequest(res, 'Invalid mode. Must be concepts_5 or concepts_10');
    }

    // Get the story idea
    const stmt = db.prepare('SELECT * FROM saved_story_ideas WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story idea not found' },
      });
    }

    const idea = {
      id: row.id,
      storyIdea: row.story_idea,
      characterConcepts: JSON.parse(row.character_concepts || '[]'),
      plotElements: JSON.parse(row.plot_elements || '[]'),
      uniqueTwists: JSON.parse(row.unique_twists || '[]'),
      genre: row.genre,
      subgenre: row.subgenre,
      tone: row.tone,
      themes: JSON.parse(row.themes || '[]'),
    };

    const conceptCount = mode === 'concepts_5' ? 5 : 10;

    logger.info({
      ideaId: id,
      mode,
      conceptCount,
    }, 'Expanding story idea into concepts');

    // Generate concepts from the idea using the concept generator service
    // Import and use the concept generator
    const { conceptGenerator } = await import('../services/concept-generator.js');

    const concepts = await conceptGenerator.expandFromIdea({
      idea,
      count: conceptCount,
      preferences: preferences || {},
    });

    // Save each concept to the database
    const savedConcepts = [];
    const now = new Date().toISOString();

    for (const concept of concepts) {
      const conceptId = uuidv4();

      const insertStmt = db.prepare(`
        INSERT INTO saved_concepts (
          id, title, logline, synopsis, hook, protagonist_hint, conflict_type,
          preferences, notes, status, source_idea_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved', ?, ?, ?)
      `);

      insertStmt.run(
        conceptId,
        concept.title,
        concept.logline,
        concept.synopsis,
        concept.hook || null,
        concept.protagonistHint || null,
        concept.conflictType || null,
        JSON.stringify({
          genre: idea.genre,
          subgenre: idea.subgenre,
          tone: idea.tone,
          themes: idea.themes,
          ...preferences,
        }),
        null, // notes
        id, // source_idea_id
        now,
        now
      );

      // Destructure to exclude original id from concept
      const { id: _originalId, ...conceptData } = concept;
      savedConcepts.push({
        id: conceptId,
        ...conceptData,
        status: 'saved',
        source_idea_id: id,
        created_at: now,
      });
    }

    // Mark the idea as used
    const updateStmt = db.prepare(`
      UPDATE saved_story_ideas SET status = 'used', updated_at = ? WHERE id = ?
    `);
    updateStmt.run(now, id);

    logger.info({
      ideaId: id,
      conceptsCreated: savedConcepts.length,
    }, 'Story idea expanded successfully');

    res.json({
      success: true,
      concepts: savedConcepts,
      sourceIdeaId: id,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return sendRateLimitError(res);
    }
    sendInternalError(res, error, 'expanding story idea');
  }
});

export default router;
