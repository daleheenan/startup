import { Router } from 'express';
import db from '../db/connection.js';
import { randomUUID } from 'crypto';

const router = Router();

interface SavedConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string | null;
  protagonist_hint: string | null;
  conflict_type: string | null;
  preferences: string;
  notes: string | null;
  status: 'saved' | 'used' | 'archived';
  created_at: string;
  updated_at: string;
}

// Get all saved concepts
router.get('/', (req, res) => {
  try {
    const status = req.query.status as string || 'saved';
    const stmt = db.prepare<[string], SavedConcept>(`
      SELECT * FROM saved_concepts
      WHERE status = ?
      ORDER BY created_at DESC
    `);
    const concepts = stmt.all(status);

    // Parse preferences JSON for each concept
    const parsed = concepts.map(c => ({
      ...c,
      preferences: JSON.parse(c.preferences),
    }));

    res.json({ concepts: parsed });
  } catch (error: any) {
    console.error('[API] Error fetching saved concepts:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Save a concept for later
router.post('/', (req, res) => {
  try {
    const { concept, preferences, notes } = req.body;

    if (!concept || !preferences) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing concept or preferences' }
      });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO saved_concepts (id, title, logline, synopsis, hook, protagonist_hint, conflict_type, preferences, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved', ?, ?)
    `);

    stmt.run(
      id,
      concept.title,
      concept.logline,
      concept.synopsis,
      concept.hook || null,
      concept.protagonistHint || null,
      concept.conflictType || null,
      JSON.stringify(preferences),
      notes || null,
      now,
      now
    );

    const saved = db.prepare<[string], SavedConcept>('SELECT * FROM saved_concepts WHERE id = ?').get(id);

    res.status(201).json({
      ...saved,
      preferences: JSON.parse(saved!.preferences),
    });
  } catch (error: any) {
    console.error('[API] Error saving concept:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Update a saved concept's status or notes
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'No updates provided' }
      });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE saved_concepts SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    const updated = db.prepare<[string], SavedConcept>('SELECT * FROM saved_concepts WHERE id = ?').get(id);

    if (!updated) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Concept not found' }
      });
    }

    res.json({
      ...updated,
      preferences: JSON.parse(updated.preferences),
    });
  } catch (error: any) {
    console.error('[API] Error updating concept:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Delete a saved concept
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM saved_concepts WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Concept not found' }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error deleting concept:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

export default router;
