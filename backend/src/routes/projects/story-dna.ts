/**
 * Project Story DNA Routes
 * Handles Story DNA generation and management
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { generateStoryDNA } from '../../services/story-dna-generator.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects:story-dna');

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

export default router;
