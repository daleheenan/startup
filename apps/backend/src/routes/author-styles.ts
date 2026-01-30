import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { voiceExtractionService } from '../services/voice-extraction.service.js';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('routes:author-styles');

const router = Router();

/**
 * Author Styles Routes (Sprint 21 - Custom AI Training)
 *
 * Manages writing style profiles extracted from manuscript samples.
 * Users can upload manuscripts, extract style patterns, and apply them to projects.
 */

interface AuthorStyle {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  style_data: string; // JSON
  manuscript_sample: string | null;
  source_text_hash: string | null;
  word_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/author-styles
 * List all author styles for the current user
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = 'owner'; // TODO: Get from auth when implemented

    const styles = db
      .prepare(
        `
        SELECT * FROM author_styles
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `
      )
      .all(userId) as AuthorStyle[];

    // Parse JSON fields
    const parsedStyles = styles.map((style) => ({
      ...style,
      style_data: JSON.parse(style.style_data),
    }));

    res.json(parsedStyles);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch author styles');
    res.status(500).json({ error: 'Failed to fetch author styles' });
  }
});

/**
 * GET /api/author-styles/:id
 * Get a specific author style by ID
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = 'owner';

    const style = db
      .prepare(
        `
        SELECT * FROM author_styles
        WHERE id = ? AND user_id = ?
      `
      )
      .get(id, userId) as AuthorStyle | undefined;

    if (!style) {
      res.status(404).json({ error: 'Author style not found' });
      return;
    }

    const parsed = {
      ...style,
      style_data: JSON.parse(style.style_data),
    };

    res.json(parsed);
  } catch (error: any) {
    logger.error({ error: error.message, id: req.params.id }, 'Failed to fetch author style');
    res.status(500).json({ error: 'Failed to fetch author style' });
  }
});

/**
 * POST /api/author-styles/analyze
 * Analyze manuscript text and return style profile (without saving)
 */
router.post('/analyze', (req: Request, res: Response): void => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Manuscript text is required' });
      return;
    }

    // Extract style profile
    const styleProfile = voiceExtractionService.extractStyleProfile(text);
    const wordCount = text.trim().split(/\s+/).length;
    const summary = voiceExtractionService.generateStyleSummary(styleProfile);
    const hash = voiceExtractionService.hashText(text);

    // Check if this text has been analyzed before
    const existing = db
      .prepare(
        `
        SELECT id, name FROM author_styles
        WHERE source_text_hash = ?
      `
      )
      .get(hash) as { id: string; name: string } | undefined;

    res.json({
      styleProfile,
      wordCount,
      summary,
      hash,
      existingStyle: existing || null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to analyze manuscript');
    res.status(400).json({ error: error.message || 'Failed to analyze manuscript' });
  }
});

/**
 * POST /api/author-styles
 * Create a new author style profile
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, description, text } = req.body;
    const userId = 'owner';

    // Validation
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Manuscript text is required for style extraction' });
      return;
    }

    // Extract style profile
    const styleProfile = voiceExtractionService.extractStyleProfile(text);
    const wordCount = text.trim().split(/\s+/).length;
    const hash = voiceExtractionService.hashText(text);

    // Check for duplicates
    const existing = db
      .prepare(
        `
        SELECT id FROM author_styles
        WHERE source_text_hash = ? AND user_id = ?
      `
      )
      .get(hash, userId) as { id: string } | undefined;

    if (existing) {
      res.status(409).json({
        error: 'This manuscript has already been analyzed',
        existingId: existing.id,
      });
      return;
    }

    // Truncate manuscript sample to ~10k characters
    const manuscriptSample = text.substring(0, 10000);

    // Create new style
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO author_styles (
        id, user_id, name, description, style_data,
        manuscript_sample, source_text_hash, word_count,
        is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `
    ).run(
      id,
      userId,
      name,
      description || null,
      JSON.stringify(styleProfile),
      manuscriptSample,
      hash,
      wordCount,
      now,
      now
    );

    logger.info({ id, name, wordCount }, 'Author style created');

    res.status(201).json({
      id,
      user_id: userId,
      name,
      description,
      style_data: styleProfile,
      manuscript_sample: manuscriptSample,
      source_text_hash: hash,
      word_count: wordCount,
      is_active: 1,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create author style');
    res.status(400).json({ error: error.message || 'Failed to create author style' });
  }
});

/**
 * PATCH /api/author-styles/:id
 * Update an author style (name, description, or active status)
 */
router.patch('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    const userId = 'owner';

    // Check if style exists
    const existing = db
      .prepare(
        `
        SELECT id FROM author_styles
        WHERE id = ? AND user_id = ?
      `
      )
      .get(id, userId) as { id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Author style not found' });
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    values.push(userId);

    db.prepare(
      `
      UPDATE author_styles
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `
    ).run(...values);

    logger.info({ id, updates: Object.keys(req.body) }, 'Author style updated');

    // Return updated style
    const updated = db
      .prepare(
        `
        SELECT * FROM author_styles
        WHERE id = ? AND user_id = ?
      `
      )
      .get(id, userId) as AuthorStyle;

    res.json({
      ...updated,
      style_data: JSON.parse(updated.style_data),
    });
  } catch (error: any) {
    logger.error({ error: error.message, id: req.params.id }, 'Failed to update author style');
    res.status(500).json({ error: 'Failed to update author style' });
  }
});

/**
 * DELETE /api/author-styles/:id
 * Delete an author style
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = 'owner';

    const result = db
      .prepare(
        `
        DELETE FROM author_styles
        WHERE id = ? AND user_id = ?
      `
      )
      .run(id, userId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Author style not found' });
      return;
    }

    logger.info({ id }, 'Author style deleted');

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, id: req.params.id }, 'Failed to delete author style');
    res.status(500).json({ error: 'Failed to delete author style' });
  }
});

/**
 * POST /api/author-styles/:id/apply/:projectId
 * Apply a style profile to a project
 */
router.post('/:id/apply/:projectId', (req: Request, res: Response): void => {
  try {
    const { id, projectId } = req.params;
    const userId = 'owner';

    // Verify style exists
    const style = db
      .prepare(
        `
        SELECT id FROM author_styles
        WHERE id = ? AND user_id = ? AND is_active = 1
      `
      )
      .get(id, userId) as { id: string } | undefined;

    if (!style) {
      res.status(404).json({ error: 'Author style not found or inactive' });
      return;
    }

    // Verify project exists
    const project = db
      .prepare(
        `
        SELECT id FROM projects
        WHERE id = ?
      `
      )
      .get(projectId) as { id: string } | undefined;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Apply style to project
    db.prepare(
      `
      UPDATE projects
      SET author_style_id = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(id, new Date().toISOString(), projectId);

    logger.info({ styleId: id, projectId }, 'Author style applied to project');

    res.json({ success: true, projectId, authorStyleId: id });
  } catch (error: any) {
    logger.error({
      error: error.message,
      styleId: req.params.id,
      projectId: req.params.projectId,
    }, 'Failed to apply author style');
    res.status(500).json({ error: 'Failed to apply author style to project' });
  }
});

/**
 * DELETE /api/author-styles/apply/:projectId
 * Remove style profile from a project
 */
router.delete('/apply/:projectId', (req: Request, res: Response): void => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = db
      .prepare(
        `
        SELECT id FROM projects
        WHERE id = ?
      `
      )
      .get(projectId) as { id: string } | undefined;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Remove style from project
    db.prepare(
      `
      UPDATE projects
      SET author_style_id = NULL, updated_at = ?
      WHERE id = ?
    `
    ).run(new Date().toISOString(), projectId);

    logger.info({ projectId }, 'Author style removed from project');

    res.json({ success: true, projectId });
  } catch (error: any) {
    logger.error({
      error: error.message,
      projectId: req.params.projectId,
    }, 'Failed to remove author style');
    res.status(500).json({ error: 'Failed to remove author style from project' });
  }
});

export default router;
