/**
 * Sci-Fi commercial routes
 * API endpoints for sci-fi hardness classification and tech settings
 */

import { Router, Request, Response } from 'express';
import { sciFiCommercialService } from '../../services/index.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects:scifi');

// POST /api/projects/:id/scifi-classification
// Set sci-fi classification
router.post('/:id/scifi-classification', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { hardnessLevel, techExplanationDepth, scientificAccuracyPriority } = req.body;

    if (!hardnessLevel || !techExplanationDepth || scientificAccuracyPriority === undefined) {
      return res.status(400).json({
        error: 'hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required',
      });
    }

    const classification = await sciFiCommercialService.setClassification(
      projectId,
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority
    );

    logger.info({ projectId, hardnessLevel }, 'Sci-fi classification set');
    res.json(classification);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error setting sci-fi classification');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/scifi-classification
// Get sci-fi classification
router.get('/:id/scifi-classification', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const classification = await sciFiCommercialService.getClassification(projectId);

    if (!classification) {
      return res.status(404).json({ error: 'No sci-fi classification found for this project' });
    }

    res.json(classification);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting sci-fi classification');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/scifi-settings
// Get complete sci-fi settings (alias for classification)
router.get('/:id/scifi-settings', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const classification = await sciFiCommercialService.getClassification(projectId);

    if (!classification) {
      return res.status(404).json({ error: 'No sci-fi settings found for this project' });
    }

    res.json(classification);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting sci-fi settings');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/scifi-settings
// Update complete sci-fi settings
router.put('/:id/scifi-settings', (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const {
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority,
      speculativeElements,
      realScienceBasis,
      handwaveAllowed
    } = req.body;

    if (!hardnessLevel || !techExplanationDepth || scientificAccuracyPriority === undefined) {
      return res.status(400).json({
        error: 'hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required',
      });
    }

    // Set classification
    sciFiCommercialService.setClassification(
      projectId,
      hardnessLevel,
      techExplanationDepth,
      scientificAccuracyPriority
    );

    // Update speculative elements if provided (expects array of {category, element} objects)
    if (speculativeElements && Array.isArray(speculativeElements)) {
      for (const spec of speculativeElements) {
        if (spec.category && spec.element) {
          sciFiCommercialService.addSpeculativeElement(projectId, spec.category, spec.element);
        }
      }
    }

    // Update real science basis if provided
    if (realScienceBasis && Array.isArray(realScienceBasis)) {
      sciFiCommercialService.setRealScienceBasis(projectId, realScienceBasis);
    }

    // Update handwave areas if provided
    if (handwaveAllowed && Array.isArray(handwaveAllowed)) {
      sciFiCommercialService.setHandwaveAreas(projectId, handwaveAllowed);
    }

    // Get updated classification
    const updated = sciFiCommercialService.getClassification(projectId);

    logger.info({ projectId, hardnessLevel }, 'Sci-fi settings updated');
    res.json(updated);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error updating sci-fi settings');
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id/scifi-classification
// Delete sci-fi classification
router.delete('/:id/scifi-classification', (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    sciFiCommercialService.deleteClassification(projectId);

    logger.info({ projectId }, 'Sci-fi classification deleted');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error deleting sci-fi classification');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/scifi-speculative-elements
// Add a speculative element
router.post('/:id/scifi-speculative-elements', (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { category, element } = req.body;

    if (!category || !element) {
      return res.status(400).json({ error: 'category and element are required' });
    }

    sciFiCommercialService.addSpeculativeElement(projectId, category, element);

    logger.info({ projectId, element }, 'Speculative element added');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error adding speculative element');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/scifi-speculative-elements
// Get all speculative elements
router.get('/:id/scifi-speculative-elements', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const elements = await sciFiCommercialService.getSpeculativeElements(projectId);

    res.json(elements);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting speculative elements');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/scifi-real-science-basis
// Set real science basis
router.put('/:id/scifi-real-science-basis', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { scienceAreas } = req.body;

    if (!scienceAreas || !Array.isArray(scienceAreas)) {
      return res.status(400).json({ error: 'scienceAreas must be an array' });
    }

    await sciFiCommercialService.setRealScienceBasis(projectId, scienceAreas);

    logger.info({ projectId }, 'Real science basis set');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error setting real science basis');
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/scifi-handwave-areas
// Set handwave areas
router.put('/:id/scifi-handwave-areas', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { areas } = req.body;

    if (!areas || !Array.isArray(areas)) {
      return res.status(400).json({ error: 'areas must be an array' });
    }

    await sciFiCommercialService.setHandwaveAreas(projectId, areas);

    logger.info({ projectId }, 'Handwave areas set');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error setting handwave areas');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/scifi-classification/validate
// Validate classification consistency
router.get('/:id/scifi-classification/validate', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const validation = await sciFiCommercialService.validateConsistency(projectId);

    res.json(validation);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error validating classification');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scifi-reader-expectations/:hardnessLevel
// Get reader expectations for a hardness level
router.get('/scifi-reader-expectations/:hardnessLevel', async (req: Request, res: Response) => {
  try {
    const { hardnessLevel } = req.params;

    const validHardness = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];
    if (!validHardness.includes(hardnessLevel)) {
      return res.status(400).json({ error: 'Invalid hardness level' });
    }

    const expectations = sciFiCommercialService.getReaderExpectations(hardnessLevel as any);

    res.json(expectations);
  } catch (error: any) {
    logger.error({ error }, 'Error getting reader expectations');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scifi-explanation-depth-suggestion/:hardnessLevel
// Get suggested explanation depth for a hardness level
router.get('/scifi-explanation-depth-suggestion/:hardnessLevel', async (req: Request, res: Response) => {
  try {
    const { hardnessLevel } = req.params;

    const validHardness = ['hard', 'firm', 'medium', 'soft', 'science_fantasy'];
    if (!validHardness.includes(hardnessLevel)) {
      return res.status(400).json({ error: 'Invalid hardness level' });
    }

    const suggestion = sciFiCommercialService.suggestExplanationDepth(hardnessLevel as any);

    res.json(suggestion);
  } catch (error: any) {
    logger.error({ error }, 'Error getting explanation depth suggestion');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scifi-subgenre-defaults/:subgenre
// Get default classification for a subgenre
router.get('/scifi-subgenre-defaults/:subgenre', async (req: Request, res: Response) => {
  try {
    const { subgenre } = req.params;
    const defaults = sciFiCommercialService.getSubgenreDefaults(subgenre);

    res.json(defaults);
  } catch (error: any) {
    logger.error({ error }, 'Error getting subgenre defaults');
    res.status(500).json({ error: error.message });
  }
});

export default router;
