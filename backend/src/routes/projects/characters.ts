/**
 * Project Characters Routes
 * Handles character generation, updates, and name management
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import type { Project } from '../../shared/types/index.js';
import { generateProtagonist, generateSupportingCast, assignNationalities, regenerateDependentFields } from '../../services/character-generator.js';
import { generateStoryDNA } from '../../services/story-dna-generator.js';
import { createLogger } from '../../services/logger.service.js';
import { safeJsonParse, propagateCharacterNameChange } from './utils.js';

const router = Router();
const logger = createLogger('routes:projects:characters');

/**
 * GET /api/projects/:id/characters
 * Get characters for a project from story_bible
 */
router.get('/:id/characters', (req, res) => {
  try {
    const projectId = req.params.id;

    const stmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = stmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] });
    const characters = storyBible.characters || [];

    res.json({ characters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting characters');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters
 * Generate characters for a project
 */
router.post('/:id/characters', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Context is required' },
      });
    }

    // Get existing project data
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Generate Story DNA if it doesn't exist
    let storyDNA = safeJsonParse(project.story_dna as any, null);
    if (!storyDNA) {
      logger.info({ projectId }, 'No Story DNA found, generating...');
      storyDNA = await generateStoryDNA({
        title: project.title,
        logline: context.synopsis || 'A compelling story',
        synopsis: context.synopsis || 'A compelling story',
        genre: project.genre,
        subgenre: context.subgenre || project.genre,
        tone: context.tone || 'dramatic',
        themes: context.themes || [],
      });

      const dnaStmt = db.prepare(`
        UPDATE projects SET story_dna = ?, updated_at = ? WHERE id = ?
      `);
      dnaStmt.run(JSON.stringify(storyDNA), new Date().toISOString(), projectId);
      logger.info({ projectId }, 'Story DNA generated and saved');
    }

    // Enrich context with Story DNA
    const enrichedContext = {
      ...context,
      tone: storyDNA.tone || context.tone,
      themes: storyDNA.themes || context.themes,
      proseStyle: storyDNA.proseStyle,
      nationalityConfig: context.nationalityConfig,
    };

    // Assign nationalities if configured
    const totalCharacters = 5;
    const assignedNationalities = assignNationalities(totalCharacters, context.nationalityConfig);

    logger.info({ nationalityConfig: context.nationalityConfig, assignedNationalities }, 'Nationality configuration');

    // Generate protagonist first
    const protagonistNationality = assignedNationalities ? assignedNationalities[0] : undefined;
    const protagonist = await generateProtagonist(enrichedContext, protagonistNationality);

    // Generate supporting cast
    const supportingNationalities = assignedNationalities ? assignedNationalities.slice(1) : undefined;
    const supportingCast = await generateSupportingCast(enrichedContext, protagonist, supportingNationalities);

    // Combine all characters
    const allCharacters = [protagonist, ...supportingCast];

    // Link relationships
    allCharacters.forEach(char => {
      if (char.role !== 'protagonist') {
        char.relationships = char.relationships.map((rel: any) => ({
          ...rel,
          characterId: protagonist.id,
          characterName: protagonist.name,
        }));
      }
    });

    // Get existing story bible or create new one
    const storyBible = project?.story_bible
      ? safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] })
      : { characters: [], world: [], timeline: [] };

    // Update characters
    storyBible.characters = allCharacters;

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ characters: allCharacters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating characters');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/characters/:characterId
 * Update a character
 */
router.put('/:id/characters/:characterId', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const updatedCharacter = req.body;
    const { propagateToContent } = req.query;

    // Get current story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find and update character
    const charIndex = storyBible.characters.findIndex((c: any) => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const oldCharacter = storyBible.characters[charIndex];
    const oldName = oldCharacter.name;
    const newName = updatedCharacter.name;

    storyBible.characters[charIndex] = { ...oldCharacter, ...updatedCharacter };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    // If name changed, propagate to scene cards and relationships
    let propagationStats = null;
    if (oldName && newName && oldName !== newName) {
      propagationStats = propagateCharacterNameChange(projectId, oldName, newName, {
        updateChapterContent: propagateToContent === 'true',
      });
      logger.info({ projectId, oldName, newName, stats: propagationStats }, 'Character name propagated');
    }

    res.json({
      character: storyBible.characters[charIndex],
      propagation: propagationStats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating character');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/propagate-name
 * Explicitly propagate a character's current name to all references
 */
router.post('/:id/characters/:characterId/propagate-name', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { oldName, updateChapterContent } = req.body;

    if (!oldName) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'oldName is required' },
      });
    }

    // Get current character name
    const getStmt = db.prepare<[string], any>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible, null);
    const character = storyBible?.characters?.find((c: any) => c.id === characterId);

    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const newName = character.name;

    // Propagate the name change
    const stats = propagateCharacterNameChange(projectId, oldName, newName, {
      updateChapterContent: updateChapterContent === true,
    });

    logger.info({ projectId, characterId, oldName, newName, stats }, 'Character name propagated');

    res.json({
      success: true,
      oldName,
      newName,
      stats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error propagating character name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/characters/:characterId/name-references
 * Get a preview of all places where a character name appears
 */
router.get('/:id/characters/:characterId/name-references', (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;

    // Get character
    const getStmt = db.prepare<[string], any>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible, null);
    const character = storyBible?.characters?.find((c: any) => c.id === characterId);

    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const characterName = character.name;
    const references = {
      sceneCards: 0,
      povScenes: 0,
      relationships: 0,
      timelineEvents: 0,
      chaptersWithContent: 0,
    };

    // Count scene card references
    const booksStmt = db.prepare<[string], any>(`SELECT id FROM books WHERE project_id = ?`);
    const books = booksStmt.all(projectId);

    for (const book of books) {
      const chaptersStmt = db.prepare<[string], any>(`
        SELECT scene_cards, content FROM chapters WHERE book_id = ?
      `);
      const chapters = chaptersStmt.all(book.id);

      for (const chapter of chapters) {
        const sceneCards = safeJsonParse(chapter.scene_cards, []);
        for (const scene of sceneCards) {
          if (scene.characters?.includes(characterName)) {
            references.sceneCards++;
          }
          if (scene.povCharacter === characterName) {
            references.povScenes++;
          }
        }
        if (chapter.content && chapter.content.includes(characterName)) {
          references.chaptersWithContent++;
        }
      }
    }

    // Count relationship references
    for (const char of storyBible.characters || []) {
      if (char.id !== characterId && char.relationships) {
        for (const rel of char.relationships) {
          if (rel.characterName === characterName) {
            references.relationships++;
          }
        }
      }
    }

    // Count timeline references
    for (const event of storyBible.timeline || []) {
      if (event.participants?.includes(characterName)) {
        references.timelineEvents++;
      }
    }

    res.json({
      characterName,
      references,
      totalReferences: Object.values(references).reduce((a, b) => a + b, 0),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting name references');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/regenerate-name
 * Regenerate a character's name using AI
 */
router.post('/:id/characters/:characterId/regenerate-name', async (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { ethnicity: editedEthnicity, nationality: editedNationality } = req.body || {};

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find the character
    const charIndex = storyBible.characters.findIndex((c: any) => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const character = storyBible.characters[charIndex];

    const ethnicity = editedEthnicity || character.ethnicity || 'not specified';
    const nationality = editedNationality || character.nationality || 'not specified';

    // Build prompt for name generation
    const prompt = `You are a creative naming expert. Generate a new name for this character that fits their background and the story's genre.

**Story Genre:** ${storyDNA?.genre || project.genre}
**Tone:** ${storyDNA?.tone || 'dramatic'}

**Character Details:**
- Role: ${character.role}
- Ethnicity/Background: ${ethnicity}
- Nationality: ${nationality}
- Personality: ${character.personality?.join(', ') || 'not specified'}

**Current Name:** ${character.name}

Generate a new, culturally appropriate name that:
1. Matches the character's ethnicity and nationality
2. Fits the genre and tone
3. Is memorable and distinct
4. Feels authentic to the character's background

Return ONLY the new name, nothing else. Just the full name.`;

    // Call Claude API
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 100,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const newName = responseText.trim();
    const oldName = character.name;

    // Auto-regenerate backstory and character arc with the new name
    let updatedBackstory = character.backstory;
    let updatedCharacterArc = character.characterArc;

    try {
      const regeneratedFields = await regenerateDependentFields({
        projectId,
        characterId,
        newName,
        character: { ...character, name: newName },
        fieldsToUpdate: ['backstory', 'characterArc'],
        storyContext: {
          genre: storyDNA?.genre || project.genre,
          tone: storyDNA?.tone,
          themes: storyDNA?.themes,
        },
      });

      if (regeneratedFields.backstory) {
        updatedBackstory = regeneratedFields.backstory;
      }
      if (regeneratedFields.characterArc) {
        updatedCharacterArc = regeneratedFields.characterArc;
      }

      logger.info({ characterId, oldName, newName }, 'Auto-updated backstory and arc during name regeneration');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to auto-update dependent fields, using simple name replacement');
      const updateNameInText = (text: string | undefined): string | undefined => {
        if (!text || !oldName) return text;
        return text.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName);
      };
      updatedBackstory = updateNameInText(character.backstory);
      updatedCharacterArc = updateNameInText(character.characterArc);
    }

    // Update character with new name and regenerated fields
    storyBible.characters[charIndex] = {
      ...character,
      name: newName,
      ethnicity: editedEthnicity || character.ethnicity,
      nationality: editedNationality || character.nationality,
      backstory: updatedBackstory,
      characterArc: updatedCharacterArc,
      voiceSample: character.voiceSample,
      currentState: character.currentState,
    };

    // Update relationships in other characters
    storyBible.characters.forEach((char: any, idx: number) => {
      if (idx !== charIndex && char.relationships) {
        char.relationships = char.relationships.map((rel: any) => ({
          ...rel,
          characterName: rel.characterId === characterId ? newName : rel.characterName,
        }));
      }
    });

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json(storyBible.characters[charIndex]);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating character name');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/auto-update-dependent-fields
 * Auto-update backstory and character arc when name changes
 */
router.post('/:id/characters/:characterId/auto-update-dependent-fields', async (req, res) => {
  try {
    const { id: projectId, characterId } = req.params;
    const { newName, fieldsToUpdate } = req.body;

    if (!newName || !fieldsToUpdate || !Array.isArray(fieldsToUpdate)) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'newName and fieldsToUpdate array are required' },
      });
    }

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    // Find the character
    const character = storyBible.characters.find((c: any) => c.id === characterId);
    if (!character) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    // Regenerate the fields
    const updatedFields = await regenerateDependentFields({
      projectId,
      characterId,
      newName,
      character: { ...character, name: newName },
      fieldsToUpdate: fieldsToUpdate.filter((f: string) => f === 'backstory' || f === 'characterArc'),
      storyContext: {
        genre: storyDNA?.genre || project.genre,
        tone: storyDNA?.tone,
        themes: storyDNA?.themes,
      },
    });

    logger.info({ projectId, characterId, newName, fieldsUpdated: Object.keys(updatedFields) }, 'Auto-updated dependent fields');

    res.json(updatedFields);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error auto-updating dependent fields');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/regenerate-all-names
 * Regenerate all character names using AI
 */
router.post('/:id/characters/regenerate-all-names', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Get current project and story bible
    const getStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    if (!project?.story_bible) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Story bible not found' },
      });
    }

    const storyBible = safeJsonParse(project.story_bible as any, null);
    const storyDNA = safeJsonParse(project.story_dna as any, null);

    if (!storyBible) {
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to parse story bible' },
      });
    }

    if (!storyBible.characters || storyBible.characters.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_CHARACTERS', message: 'No characters to regenerate names for' },
      });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Regenerate names for all characters
    const updatedCharacters: any[] = [];
    for (const character of storyBible.characters) {
      const prompt = `You are a creative naming expert. Generate a new name for this character that fits their background and the story's genre.

**Story Genre:** ${storyDNA?.genre || project.genre}
**Tone:** ${storyDNA?.tone || 'dramatic'}

**Character Details:**
- Role: ${character.role}
- Ethnicity/Background: ${character.ethnicity || 'not specified'}
- Nationality: ${character.nationality || 'not specified'}
- Personality: ${character.personality?.join(', ') || 'not specified'}

**Current Name:** ${character.name}

Generate a new, culturally appropriate name that:
1. Matches the character's ethnicity and nationality
2. Fits the genre and tone
3. Is memorable and distinct
4. Feels authentic to the character's background

Return ONLY the new name, nothing else. Just the full name.`;

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 100,
        temperature: 0.9,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const newName = responseText.trim();

      updatedCharacters.push({
        ...character,
        name: newName,
      });
    }

    // Update relationships with new names
    updatedCharacters.forEach((char) => {
      if (char.relationships) {
        char.relationships = char.relationships.map((rel: any) => {
          const relatedChar = updatedCharacters.find((c: any) => c.id === rel.characterId);
          return {
            ...rel,
            characterName: relatedChar ? relatedChar.name : rel.characterName,
          };
        });
      }
    });

    // Save to database
    storyBible.characters = updatedCharacters;

    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ characters: updatedCharacters });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating all character names');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
