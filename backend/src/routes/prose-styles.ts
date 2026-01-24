import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { ProseAnalyzer } from '../services/proseAnalyzer.js';
import type { ProseStyle, VoiceSample, StylePreset, StyleTemplate, StyleCheck } from '../shared/types/index.js';

const router = express.Router();

/**
 * Get all prose styles for a project
 */
router.get('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;

    const styles = db.prepare(`
      SELECT * FROM prose_styles
      WHERE project_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(projectId) as ProseStyle[];

    res.json({ styles });
  } catch (error: any) {
    console.error('[Prose Styles] Error fetching styles:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Get a specific prose style
 */
router.get('/:styleId', (req, res) => {
  try {
    const { styleId } = req.params;

    const style = db.prepare('SELECT * FROM prose_styles WHERE id = ?').get(styleId) as ProseStyle;

    if (!style) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prose style not found' } });
    }

    res.json({ style });
  } catch (error: any) {
    console.error('[Prose Styles] Error fetching style:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Create a new prose style
 */
router.post('/', (req, res) => {
  try {
    const styleData = req.body;
    const id = randomUUID();

    // If this is set as default, unset others
    if (styleData.is_default) {
      db.prepare('UPDATE prose_styles SET is_default = 0 WHERE project_id = ?').run(styleData.project_id);
    }

    const stmt = db.prepare(`
      INSERT INTO prose_styles (
        id, project_id, name, is_default,
        sentence_length_preference, sentence_complexity, sentence_variety_score,
        target_reading_level, flesch_kincaid_target,
        formality_level, voice_tone, narrative_distance,
        vocabulary_complexity, use_metaphors, use_similes,
        default_pacing, scene_transition_style, paragraph_length_preference,
        custom_preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      styleData.project_id,
      styleData.name,
      styleData.is_default ? 1 : 0,
      styleData.sentence_length_preference || 'varied',
      styleData.sentence_complexity || 'moderate',
      styleData.sentence_variety_score || 0.7,
      styleData.target_reading_level || 'general',
      styleData.flesch_kincaid_target || 70.0,
      styleData.formality_level || 'moderate',
      styleData.voice_tone || 'neutral',
      styleData.narrative_distance || 'close',
      styleData.vocabulary_complexity || 'moderate',
      styleData.use_metaphors ? 1 : 0,
      styleData.use_similes ? 1 : 0,
      styleData.default_pacing || 'moderate',
      styleData.scene_transition_style || 'smooth',
      styleData.paragraph_length_preference || 'varied',
      styleData.custom_preferences ? JSON.stringify(styleData.custom_preferences) : null
    );

    const style = db.prepare('SELECT * FROM prose_styles WHERE id = ?').get(id) as ProseStyle;

    res.json({ style });
  } catch (error: any) {
    console.error('[Prose Styles] Error creating style:', error);
    res.status(500).json({ error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * Update a prose style
 */
router.put('/:styleId', (req, res) => {
  try {
    const { styleId } = req.params;
    const updates = req.body;

    // If setting as default, unset others
    if (updates.is_default) {
      const style = db.prepare('SELECT project_id FROM prose_styles WHERE id = ?').get(styleId) as any;
      if (style) {
        db.prepare('UPDATE prose_styles SET is_default = 0 WHERE project_id = ?').run(style.project_id);
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      is_default: 'is_default',
      sentence_length_preference: 'sentence_length_preference',
      sentence_complexity: 'sentence_complexity',
      sentence_variety_score: 'sentence_variety_score',
      target_reading_level: 'target_reading_level',
      flesch_kincaid_target: 'flesch_kincaid_target',
      formality_level: 'formality_level',
      voice_tone: 'voice_tone',
      narrative_distance: 'narrative_distance',
      vocabulary_complexity: 'vocabulary_complexity',
      use_metaphors: 'use_metaphors',
      use_similes: 'use_similes',
      default_pacing: 'default_pacing',
      scene_transition_style: 'scene_transition_style',
      paragraph_length_preference: 'paragraph_length_preference',
      custom_preferences: 'custom_preferences',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`);
        if (key === 'is_default' || key === 'use_metaphors' || key === 'use_similes') {
          values.push(value ? 1 : 0);
        } else if (key === 'custom_preferences') {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length > 0) {
      fields.push('updated_at = datetime("now")');
      values.push(styleId);

      db.prepare(`
        UPDATE prose_styles
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    const style = db.prepare('SELECT * FROM prose_styles WHERE id = ?').get(styleId) as ProseStyle;

    res.json({ style });
  } catch (error: any) {
    console.error('[Prose Styles] Error updating style:', error);
    res.status(500).json({ error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * Delete a prose style
 */
router.delete('/:styleId', (req, res) => {
  try {
    const { styleId } = req.params;

    db.prepare('DELETE FROM prose_styles WHERE id = ?').run(styleId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Prose Styles] Error deleting style:', error);
    res.status(500).json({ error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

/**
 * Add a voice sample to a style
 */
router.post('/:styleId/voice-samples', (req, res) => {
  try {
    const { styleId } = req.params;
    const { sample_text, sample_source } = req.body;

    const id = randomUUID();

    // Analyze the voice sample
    const analysis = ProseAnalyzer.analyzeVoiceSample(sample_text);

    db.prepare(`
      INSERT INTO voice_samples (
        id, prose_style_id, sample_text, sample_source,
        avg_sentence_length, sentence_length_variance,
        flesch_kincaid_score, complex_word_ratio, extracted_patterns
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      styleId,
      sample_text,
      sample_source || null,
      analysis.avg_sentence_length,
      analysis.sentence_length_variance,
      analysis.flesch_kincaid_score,
      analysis.complex_word_ratio,
      JSON.stringify(analysis.extracted_patterns)
    );

    const sample = db.prepare('SELECT * FROM voice_samples WHERE id = ?').get(id) as VoiceSample;

    res.json({ sample });
  } catch (error: any) {
    console.error('[Prose Styles] Error adding voice sample:', error);
    res.status(500).json({ error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * Get voice samples for a style
 */
router.get('/:styleId/voice-samples', (req, res) => {
  try {
    const { styleId } = req.params;

    const samples = db.prepare(`
      SELECT * FROM voice_samples
      WHERE prose_style_id = ?
      ORDER BY created_at DESC
    `).all(styleId) as VoiceSample[];

    res.json({ samples });
  } catch (error: any) {
    console.error('[Prose Styles] Error fetching voice samples:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Get all style presets
 */
router.get('/presets/all', (req, res) => {
  try {
    const { genre, subgenre } = req.query;

    let query = 'SELECT * FROM style_presets WHERE 1=1';
    const params: any[] = [];

    if (genre) {
      query += ' AND genre = ?';
      params.push(genre);
    }

    if (subgenre) {
      query += ' AND subgenre = ?';
      params.push(subgenre);
    }

    query += ' ORDER BY genre, subgenre, preset_name';

    const presets = db.prepare(query).all(...params) as StylePreset[];

    res.json({ presets });
  } catch (error: any) {
    console.error('[Prose Styles] Error fetching presets:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

/**
 * Apply a preset to create a new prose style
 */
router.post('/presets/:presetId/apply', (req, res) => {
  try {
    const { presetId } = req.params;
    const { project_id, name } = req.body;

    const preset = db.prepare('SELECT * FROM style_presets WHERE id = ?').get(presetId) as StylePreset;

    if (!preset) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Preset not found' } });
    }

    const id = randomUUID();

    // Create a new prose style from the preset
    db.prepare(`
      INSERT INTO prose_styles (
        id, project_id, name, is_default,
        sentence_length_preference, sentence_complexity, sentence_variety_score,
        target_reading_level, flesch_kincaid_target,
        formality_level, voice_tone, narrative_distance,
        vocabulary_complexity, use_metaphors, use_similes,
        default_pacing, scene_transition_style, paragraph_length_preference,
        custom_preferences
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      project_id,
      name || preset.preset_name,
      preset.sentence_length_preference,
      preset.sentence_complexity,
      preset.sentence_variety_score,
      preset.target_reading_level,
      preset.flesch_kincaid_target,
      preset.formality_level,
      preset.voice_tone,
      preset.narrative_distance,
      preset.vocabulary_complexity,
      preset.use_metaphors,
      preset.use_similes,
      preset.default_pacing,
      preset.scene_transition_style,
      preset.paragraph_length_preference,
      preset.custom_preferences
    );

    // Increment usage count
    db.prepare('UPDATE style_presets SET usage_count = usage_count + 1 WHERE id = ?').run(presetId);

    const style = db.prepare('SELECT * FROM prose_styles WHERE id = ?').get(id) as ProseStyle;

    res.json({ style });
  } catch (error: any) {
    console.error('[Prose Styles] Error applying preset:', error);
    res.status(500).json({ error: { code: 'APPLY_ERROR', message: error.message } });
  }
});

/**
 * Check style consistency for a chapter
 */
router.post('/check/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;
    const { prose_style_id, content } = req.body;

    // Get the style
    const style = db.prepare('SELECT * FROM prose_styles WHERE id = ?').get(prose_style_id) as any;

    if (!style) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Style not found' } });
    }

    // Run consistency check
    const check = ProseAnalyzer.checkStyleConsistency(content, style);

    const id = randomUUID();

    // Save the check
    db.prepare(`
      INSERT INTO style_checks (
        id, chapter_id, prose_style_id,
        overall_consistency_score, sentence_consistency,
        vocabulary_consistency, pacing_consistency,
        deviations, recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      chapterId,
      prose_style_id,
      check.overallScore,
      check.sentenceConsistency,
      check.vocabularyConsistency,
      check.pacingConsistency,
      JSON.stringify(check.deviations),
      JSON.stringify([]) // Recommendations could be added later
    );

    const styleCheck = db.prepare('SELECT * FROM style_checks WHERE id = ?').get(id) as StyleCheck;

    res.json({ check: styleCheck });
  } catch (error: any) {
    console.error('[Prose Styles] Error checking style:', error);
    res.status(500).json({ error: { code: 'CHECK_ERROR', message: error.message } });
  }
});

/**
 * Get style checks for a chapter
 */
router.get('/checks/chapter/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;

    const checks = db.prepare(`
      SELECT * FROM style_checks
      WHERE chapter_id = ?
      ORDER BY checked_at DESC
    `).all(chapterId) as StyleCheck[];

    res.json({ checks });
  } catch (error: any) {
    console.error('[Prose Styles] Error fetching checks:', error);
    res.status(500).json({ error: { code: 'FETCH_ERROR', message: error.message } });
  }
});

export default router;
