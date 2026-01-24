import { Router } from 'express';
import db from '../db/connection.js';
import type { Project } from '../../../shared/types/index.js';
import { randomUUID } from 'crypto';

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

export default router;
