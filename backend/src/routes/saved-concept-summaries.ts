import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:saved-concept-summaries');

interface SavedConceptSummary {
  id: string;
  title: string;
  logline: string;
  preferences: string;
  notes: string | null;
  status: 'saved' | 'expanded' | 'archived';
  expanded_concept_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/saved-concept-summaries
 * Get all saved concept summaries
 */
router.get('/', (req, res) => {
  try {
    const status = req.query.status as string || 'saved';
    const stmt = db.prepare<[string], SavedConceptSummary>(`
      SELECT * FROM saved_concept_summaries
      WHERE status = ?
      ORDER BY created_at DESC
    `);
    const summaries = stmt.all(status);

    const parsed = summaries.map(s => ({
      ...s,
      preferences: JSON.parse(s.preferences),
    }));

    res.json({ summaries: parsed });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching saved concept summaries');
  }
});

/**
 * GET /api/saved-concept-summaries/:id
 * Get a single saved concept summary
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare<[string], SavedConceptSummary>(`
      SELECT * FROM saved_concept_summaries WHERE id = ?
    `);
    const summary = stmt.get(id);

    if (!summary) {
      return sendNotFound(res, 'Concept summary');
    }

    res.json({
      ...summary,
      preferences: JSON.parse(summary.preferences),
    });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching concept summary');
  }
});

/**
 * POST /api/saved-concept-summaries
 * Save a concept summary for later expansion
 */
router.post('/', (req, res) => {
  try {
    const { summary, preferences, notes } = req.body;

    if (!summary || !preferences) {
      return sendBadRequest(res, 'Missing summary or preferences');
    }

    if (!summary.title || !summary.logline) {
      return sendBadRequest(res, 'Summary must have title and logline');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO saved_concept_summaries (id, title, logline, preferences, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'saved', ?, ?)
    `);

    stmt.run(
      id,
      summary.title,
      summary.logline,
      JSON.stringify(preferences),
      notes || null,
      now,
      now
    );

    const saved = db.prepare<[string], SavedConceptSummary>('SELECT * FROM saved_concept_summaries WHERE id = ?').get(id);

    logger.info({ summaryId: id, title: summary.title }, 'Concept summary saved');

    res.status(201).json({
      ...saved,
      preferences: JSON.parse(saved!.preferences),
    });
  } catch (error: any) {
    sendInternalError(res, error, 'saving concept summary');
  }
});

/**
 * POST /api/saved-concept-summaries/:id/expand
 * Expand a saved summary into 5 full concepts
 */
router.post('/:id/expand', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the saved summary
    const stmt = db.prepare<[string], SavedConceptSummary>(`
      SELECT * FROM saved_concept_summaries WHERE id = ?
    `);
    const summary = stmt.get(id);

    if (!summary) {
      return sendNotFound(res, 'Concept summary');
    }

    // Import the expansion function dynamically to avoid circular deps
    const { expandSummariesToConcepts } = await import('../services/concept-generator.js');

    const preferences = JSON.parse(summary.preferences);
    const summaryData = {
      id: summary.id,
      title: summary.title,
      logline: summary.logline,
    };

    logger.info({ summaryId: id, title: summary.title }, 'Expanding summary to 5 concepts');

    // Expand to 5 full concepts
    const concepts = await expandSummariesToConcepts(preferences, [summaryData]);

    // Generate 4 more variations by asking for different approaches
    const { expandSummaryToVariations } = await import('../services/concept-generator.js');
    const additionalConcepts = await expandSummaryToVariations(preferences, summaryData, 4);

    // Combine all concepts
    const allConcepts = [concepts[0], ...additionalConcepts];

    logger.info({ summaryId: id, conceptCount: allConcepts.length }, 'Summary expanded successfully');

    res.json({ success: true, concepts: allConcepts });
  } catch (error: any) {
    sendInternalError(res, error, 'expanding concept summary');
  }
});

/**
 * PATCH /api/saved-concept-summaries/:id
 * Update a saved concept summary's status or notes
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, expanded_concept_id } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      if (!['saved', 'expanded', 'archived'].includes(status)) {
        return sendBadRequest(res, 'Invalid status. Must be saved, expanded, or archived');
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (expanded_concept_id !== undefined) {
      updates.push('expanded_concept_id = ?');
      values.push(expanded_concept_id);
    }

    if (updates.length === 0) {
      return sendBadRequest(res, 'No updates provided');
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE saved_concept_summaries SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    const updated = db.prepare<[string], SavedConceptSummary>('SELECT * FROM saved_concept_summaries WHERE id = ?').get(id);

    if (!updated) {
      return sendNotFound(res, 'Concept summary');
    }

    res.json({
      ...updated,
      preferences: JSON.parse(updated.preferences),
    });
  } catch (error: any) {
    sendInternalError(res, error, 'updating concept summary');
  }
});

/**
 * DELETE /api/saved-concept-summaries/:id
 * Delete a saved concept summary
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM saved_concept_summaries WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return sendNotFound(res, 'Concept summary');
    }

    logger.info({ summaryId: id }, 'Concept summary deleted');

    res.json({ success: true });
  } catch (error: any) {
    sendInternalError(res, error, 'deleting concept summary');
  }
});

export default router;
