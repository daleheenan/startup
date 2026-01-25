import { Router } from 'express';
import db from '../db/connection.js';
import type { Project } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { generateStoryDNA } from '../services/story-dna-generator.js';
import { generateProtagonist, generateSupportingCast } from '../services/character-generator.js';
import { generateWorldElements } from '../services/world-generator.js';
import { metricsService } from '../services/metrics.service.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse(jsonString: string | null | undefined, fallback: any = null): any {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'JSON parse error');
    return fallback;
  }
}

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare<[], Project>(`
      SELECT * FROM projects ORDER BY updated_at DESC
    `);

    const projects = stmt.all();

    // Get all metrics at once
    const allMetrics = metricsService.getAllProjectMetrics();

    // Parse JSON fields and attach metrics (with safe parsing)
    const parsedProjects = projects.map((p) => ({
      ...p,
      story_dna: safeJsonParse(p.story_dna as any, null),
      story_bible: safeJsonParse(p.story_bible as any, null),
      metrics: allMetrics.get(p.id) || null,
    }));

    res.json({ projects: parsedProjects });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching projects');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);

    const project = stmt.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Parse JSON fields and attach metrics (with safe parsing)
    const parsedProject = {
      ...project,
      story_dna: safeJsonParse(project.story_dna as any, null),
      story_bible: safeJsonParse(project.story_bible as any, null),
      metrics: metricsService.getFormattedMetrics(project.id),
    };

    res.json(parsedProject);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', (req, res) => {
  try {
    const { concept, preferences } = req.body;

    if (!concept?.title || !preferences?.genre) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields' },
      });
    }

    const projectId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO projects (id, title, type, genre, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      projectId,
      concept.title,
      'standalone', // Default to standalone
      preferences.genre,
      'setup',
      now,
      now
    );

    res.status(201).json({
      id: projectId,
      title: concept.title,
      status: 'setup',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error creating project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 *
 * BUG FIX: Whitelisted allowed fields to prevent SQL injection
 */
router.put('/:id', (req, res) => {
  try {
    const { storyDNA, storyBible, status } = req.body;

    // Whitelist of allowed update fields (prevents SQL injection)
    const allowedFields = ['story_dna', 'story_bible', 'status'];
    const updates: string[] = [];
    const params: any[] = [];

    // Validate and build update fields
    if (storyDNA !== undefined) {
      updates.push('story_dna = ?');
      params.push(JSON.stringify(storyDNA));
    }

    if (storyBible !== undefined) {
      updates.push('story_bible = ?');
      params.push(JSON.stringify(storyBible));
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'No valid fields to update' },
      });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(req.params.id);

    const stmt = db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM projects WHERE id = ?
    `);

    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting project');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

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

/**
 * POST /api/projects/:id/characters
 * Generate characters for a project
 * Also generates Story DNA if it doesn't exist
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

      // Save Story DNA immediately
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
    };

    // Generate protagonist first
    const protagonist = await generateProtagonist(enrichedContext);

    // Generate supporting cast
    const supportingCast = await generateSupportingCast(enrichedContext, protagonist);

    // Combine all characters
    const allCharacters = [protagonist, ...supportingCast];

    // Link relationships
    allCharacters.forEach(char => {
      if (char.role !== 'protagonist') {
        // Update protagonist ID in relationships
        char.relationships = char.relationships.map(rel => ({
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
 * POST /api/projects/:id/world
 * Generate world elements for a project
 */
router.post('/:id/world', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Context is required' },
      });
    }

    // Generate world elements
    const worldElements = await generateWorldElements(context);

    // Get existing story bible or create new one
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    const storyBible = project?.story_bible
      ? safeJsonParse(project.story_bible as any, { characters: [], world: [], timeline: [] })
      : { characters: [], world: [], timeline: [] };

    // Update world elements
    storyBible.world = worldElements;

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json({ world: worldElements });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating world');
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

    storyBible.characters[charIndex] = { ...storyBible.characters[charIndex], ...updatedCharacter };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json(storyBible.characters[charIndex]);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating character');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/characters/:characterId/regenerate-name
 * Regenerate a character's name using AI
 * Accepts optional ethnicity/nationality in body to use current editor values
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

    // Use edited values if provided, otherwise fall back to stored values
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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const newName = responseText.trim();
    const oldName = character.name;

    // Helper function to replace old name with new name in text fields
    const updateNameInText = (text: string | undefined): string | undefined => {
      if (!text || !oldName) return text;
      // Replace the old name with new name (case-insensitive for first occurrence, preserve case for rest)
      return text.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName);
    };

    // Update character with new name and preserve edited ethnicity/nationality
    // Also update text fields that may reference the character's name
    storyBible.characters[charIndex] = {
      ...character,
      name: newName,
      // Save the edited ethnicity/nationality if provided
      ethnicity: editedEthnicity || character.ethnicity,
      nationality: editedNationality || character.nationality,
      // Update fields that might contain the old name
      backstory: updateNameInText(character.backstory),
      voiceSample: updateNameInText(character.voiceSample),
      characterArc: updateNameInText(character.characterArc),
      currentState: updateNameInText(character.currentState),
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const newName = responseText.trim();

      updatedCharacters.push({
        ...character,
        name: newName,
      });
    }

    // Update relationships with new names
    updatedCharacters.forEach((char, idx) => {
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

/**
 * GET /api/projects/:id/metrics
 * Get detailed metrics for a project
 */
router.get('/:id/metrics', (req, res) => {
  try {
    const metrics = metricsService.getFormattedMetrics(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project metrics not found' },
      });
    }

    res.json(metrics);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project metrics');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/world/:elementId
 * Update a world element
 */
router.put('/:id/world/:elementId', (req, res) => {
  try {
    const { id: projectId, elementId } = req.params;
    const updatedElement = req.body;

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

    // Find and update world element
    const elemIndex = storyBible.world.findIndex((w: any) => w.id === elementId);
    if (elemIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'World element not found' },
      });
    }

    storyBible.world[elemIndex] = { ...storyBible.world[elemIndex], ...updatedElement };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET story_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(storyBible), new Date().toISOString(), projectId);

    res.json(storyBible.world[elemIndex]);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating world element');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
