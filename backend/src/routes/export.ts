import express, { Request, Response } from 'express';
import { exportService } from '../services/export.service.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:export');

/**
 * Export project as DOCX
 */
router.get('/docx/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const buffer = await exportService.generateDOCX(projectId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="manuscript-${projectId}.docx"`);
    res.send(buffer);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, projectId: req.params.projectId }, 'Error generating DOCX');
    res.status(500).json({
      error: 'Failed to generate DOCX',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Export project as PDF
 */
router.get('/pdf/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const buffer = await exportService.generatePDF(projectId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="manuscript-${projectId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, projectId: req.params.projectId }, 'Error generating PDF');
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Export story bible as DOCX
 */
router.get('/story-bible/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const buffer = await exportService.generateStoryBibleDOCX(projectId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="story-bible-${projectId}.docx"`);
    res.send(buffer);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error, projectId: req.params.projectId }, 'Error generating Story Bible');
    res.status(500).json({
      error: 'Failed to generate Story Bible',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
