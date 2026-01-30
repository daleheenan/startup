/**
 * Publishing Routes
 * Sprint 39: Traditional Publishing Support
 *
 * Provides endpoints for traditional publishing tools
 */
import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { createLogger } from '../services/logger.service.js';
import { generateQueryLetter, type QueryLetterInput } from '../services/publishing/query-letter-generator.js';
import type { Project } from '../shared/types/index.js';

const router = Router();
const logger = createLogger('routes:publishing');

/**
 * POST /api/publishing/:projectId/query-letter
 * Generate a query letter for the project
 */
router.post('/:projectId/query-letter', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { genre, targetAgent, wordCount, logline, synopsis } = req.body;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Extract story DNA data if available
    const storyDna = project.story_dna ? (typeof project.story_dna === 'string' ? JSON.parse(project.story_dna) : project.story_dna) : null;

    // Build input for query letter generator
    const input: QueryLetterInput = {
      projectId,
      genre: genre || project.genre,
      title: project.title,
      wordCount: wordCount || 80000,
      logline: logline || storyDna?.concept || 'A compelling story',
      synopsis: synopsis || 'Synopsis to be provided',
      protagonistName: 'Protagonist',
      protagonistDescription: 'Character description',
      centralConflict: 'Central conflict',
      stakes: 'High stakes',
      targetAgent
    };

    const result = await generateQueryLetter(input);

    logger.info({ projectId }, 'Query letter generated');
    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating query letter');
    res.status(500).json({ error: error.message });
  }
});

export default router;
