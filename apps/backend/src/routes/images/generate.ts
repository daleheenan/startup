/**
 * Images Generation Routes
 * Sprint 24: Visual Enhancements
 *
 * Handles AI image generation endpoints:
 * - POST /api/images/character/:characterId - Generate character portrait
 * - POST /api/images/location/:elementId - Generate location image
 * - POST /api/images/cover/:projectId - Generate cover art
 * - POST /api/images/scene/:chapterId - Generate scene illustration
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { createLogger } from '../../services/logger.service.js';
import { imageGenerationService, type StylePreset } from '../../services/image-generation.service.js';
import type { Project } from '../../shared/types/index.js';

const router = Router();
const logger = createLogger('routes:images:generate');

// Type definitions for story data
interface StoryCharacter {
  id: string;
  name: string;
  physicalDescription?: string;
  personality?: string[];
  role?: string;
  ethnicity?: string;
  nationality?: string;
}

interface WorldElement {
  id: string;
  name: string;
  description?: string;
  type?: string;
  significance?: string;
}

interface StoryBible {
  characters?: StoryCharacter[];
  world?: WorldElement[];
}

interface StoryDna {
  visualStyle?: string;
  imageStyle?: string;
  tone?: string;
}

interface StoryConcept {
  synopsis?: string;
  logline?: string;
}

/**
 * Safe JSON parse with fallback
 */
function safeJsonParse<T>(json: any, fallback: T): T {
  if (!json) return fallback;
  if (typeof json === 'object') return json as T;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Save image metadata to database
 */
function saveImageMetadata(metadata: any): void {
  const stmt = db.prepare(`
    INSERT INTO images (
      id, project_id, entity_type, entity_id, image_type,
      prompt, style_preset, file_path, file_size,
      width, height, generation_params, status, error_message,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  stmt.run(
    metadata.id,
    metadata.projectId,
    metadata.entityType,
    metadata.entityId || null,
    metadata.imageType,
    metadata.prompt,
    metadata.stylePreset || null,
    metadata.filePath,
    metadata.fileSize,
    metadata.width,
    metadata.height,
    JSON.stringify(metadata.generationParams),
    metadata.status,
    metadata.errorMessage || null
  );
}

/**
 * Get project style preferences
 */
function getProjectStyle(projectId: string): string | undefined {
  const stmt = db.prepare<[string], Project>('SELECT story_dna FROM projects WHERE id = ?');
  const project = stmt.get(projectId);

  if (project?.story_dna) {
    const storyDna = safeJsonParse<StoryDna | null>(project.story_dna as any, null);
    return storyDna?.visualStyle || storyDna?.imageStyle;
  }

  return undefined;
}

/**
 * POST /api/images/character/:characterId
 * Generate character portrait
 */
router.post('/character/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { projectId, stylePreset, quality, size } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'projectId is required' },
      });
    }

    // Get project and character data
    const projectStmt = db.prepare<[string], Project>('SELECT * FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyBible = safeJsonParse<StoryBible>(project.story_bible as any, { characters: [] });
    const character = storyBible.characters?.find((c) => c.id === characterId);

    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    // Get project style
    const projectStyle = getProjectStyle(projectId);

    // Generate portrait
    const metadata = await imageGenerationService.generateCharacterPortrait(
      projectId,
      {
        id: character.id,
        name: character.name,
        physicalDescription: character.physicalDescription || '',
        personality: character.personality,
        role: character.role,
        ethnicity: character.ethnicity,
        nationality: character.nationality,
      },
      {
        stylePreset: stylePreset as StylePreset,
        projectStyle,
        quality: quality || 'standard',
        size: size || '1024x1024',
      }
    );

    // Save to database
    saveImageMetadata(metadata);

    logger.info({ characterId, imageId: metadata.id, status: metadata.status }, 'Character portrait generated');

    res.json({ image: metadata });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating character portrait');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/images/location/:elementId
 * Generate location image
 */
router.post('/location/:elementId', async (req, res) => {
  try {
    const { elementId } = req.params;
    const { projectId, stylePreset, quality, size } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'projectId is required' },
      });
    }

    // Get project and world element data
    const projectStmt = db.prepare<[string], Project>('SELECT * FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyBible = safeJsonParse<StoryBible>(project.story_bible as any, { world: [] });
    const element = storyBible.world?.find((w) => w.id === elementId);

    if (!element) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'World element not found' },
      });
    }

    // Get project style
    const projectStyle = getProjectStyle(projectId);

    // Generate location image
    const metadata = await imageGenerationService.generateLocationImage(
      projectId,
      {
        id: element.id,
        name: element.name,
        description: element.description || '',
        type: element.type || 'location',
        significance: element.significance,
      },
      {
        stylePreset: stylePreset as StylePreset,
        projectStyle,
        quality: quality || 'standard',
        size: size || '1792x1024',
      }
    );

    // Save to database
    saveImageMetadata(metadata);

    logger.info({ elementId, imageId: metadata.id, status: metadata.status }, 'Location image generated');

    res.json({ image: metadata });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating location image');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/images/cover/:projectId
 * Generate cover art
 */
router.post('/cover/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { stylePreset, quality, size } = req.body;

    // Get project data
    const projectStmt = db.prepare<[string], Project>('SELECT * FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Get story data
    const storyBible = safeJsonParse<StoryBible>(project.story_bible as any, {});
    const storyDna = safeJsonParse<StoryDna>(project.story_dna as any, {});
    const storyConcept = safeJsonParse<StoryConcept>(project.story_concept as any, {});

    const protagonist = storyBible.characters?.find((c) => c.role === 'protagonist');

    // Get project style
    const projectStyle = getProjectStyle(projectId);

    // Generate cover art
    const metadata = await imageGenerationService.generateCoverArt(
      projectId,
      {
        title: project.title,
        genre: project.genre,
        synopsis: storyConcept.synopsis || storyConcept.logline,
        mainCharacter: protagonist?.name,
        tone: storyDna.tone,
      },
      {
        stylePreset: stylePreset as StylePreset,
        projectStyle,
        quality: quality || 'hd',
        size: size || '1024x1792',
      }
    );

    // Save to database
    saveImageMetadata(metadata);

    logger.info({ projectId, imageId: metadata.id, status: metadata.status }, 'Cover art generated');

    res.json({ image: metadata });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating cover art');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/images/scene/:chapterId
 * Generate scene illustration
 */
router.post('/scene/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { projectId, sceneDescription, characters, setting, stylePreset, quality, size } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'projectId is required' },
      });
    }

    if (!sceneDescription) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'sceneDescription is required' },
      });
    }

    // Get chapter data
    const chapterStmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
    const chapter = chapterStmt.get(chapterId) as any;

    if (!chapter) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Chapter not found' },
      });
    }

    // Get project style
    const projectStyle = getProjectStyle(projectId);

    // Generate scene illustration
    const metadata = await imageGenerationService.generateSceneIllustration(
      projectId,
      chapterId,
      {
        chapterTitle: chapter.title || `Chapter ${chapter.chapter_number}`,
        sceneDescription,
        characters,
        setting,
      },
      {
        stylePreset: stylePreset as StylePreset,
        projectStyle,
        quality: quality || 'standard',
        size: size || '1792x1024',
      }
    );

    // Save to database
    saveImageMetadata(metadata);

    logger.info({ chapterId, imageId: metadata.id, status: metadata.status }, 'Scene illustration generated');

    res.json({ image: metadata });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating scene illustration');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
