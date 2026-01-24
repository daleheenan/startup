import { Router } from 'express';
import db from '../db/connection.js';
import type { Project } from '../shared/types/index.js';
import { randomUUID } from 'crypto';
import { generateStoryDNA } from '../services/story-dna-generator.js';
import { generateProtagonist, generateSupportingCast } from '../services/character-generator.js';
import { generateWorldElements } from '../services/world-generator.js';

const router = Router();

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

    // Parse JSON fields
    const parsedProjects = projects.map((p) => ({
      ...p,
      story_dna: p.story_dna ? JSON.parse(p.story_dna as any) : null,
      story_bible: p.story_bible ? JSON.parse(p.story_bible as any) : null,
    }));

    res.json({ projects: parsedProjects });
  } catch (error: any) {
    console.error('[API] Error fetching projects:', error);
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

    // Parse JSON fields
    const parsedProject = {
      ...project,
      story_dna: project.story_dna ? JSON.parse(project.story_dna as any) : null,
      story_bible: project.story_bible ? JSON.parse(project.story_bible as any) : null,
    };

    res.json(parsedProject);
  } catch (error: any) {
    console.error('[API] Error fetching project:', error);
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
    console.error('[API] Error creating project:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', (req, res) => {
  try {
    const { storyDNA, storyBible, status } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (storyDNA) {
      updates.push('story_dna = ?');
      params.push(JSON.stringify(storyDNA));
    }

    if (storyBible) {
      updates.push('story_bible = ?');
      params.push(JSON.stringify(storyBible));
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
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
    console.error('[API] Error updating project:', error);
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
    console.error('[API] Error deleting project:', error);
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
    console.error('[API] Error generating Story DNA:', error);
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

    // Generate protagonist first
    const protagonist = await generateProtagonist(context);

    // Generate supporting cast
    const supportingCast = await generateSupportingCast(context, protagonist);

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
    const getStmt = db.prepare<[string], Project>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = getStmt.get(projectId);

    const storyBible = project?.story_bible
      ? JSON.parse(project.story_bible as any)
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
    console.error('[API] Error generating characters:', error);
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
      ? JSON.parse(project.story_bible as any)
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
    console.error('[API] Error generating world:', error);
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

    const storyBible = JSON.parse(project.story_bible as any);

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
    console.error('[API] Error updating character:', error);
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

    const storyBible = JSON.parse(project.story_bible as any);
    const storyDNA = project.story_dna ? JSON.parse(project.story_dna as any) : null;

    // Find the character
    const charIndex = storyBible.characters.findIndex((c: any) => c.id === characterId);
    if (charIndex === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Character not found' },
      });
    }

    const character = storyBible.characters[charIndex];

    // Build prompt for name generation
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

    // Update character with new name
    storyBible.characters[charIndex] = {
      ...character,
      name: newName,
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
    console.error('[API] Error regenerating character name:', error);
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

    const storyBible = JSON.parse(project.story_bible as any);
    const storyDNA = project.story_dna ? JSON.parse(project.story_dna as any) : null;

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
    console.error('[API] Error regenerating all character names:', error);
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

    const storyBible = JSON.parse(project.story_bible as any);

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
    console.error('[API] Error updating world element:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
