import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import type { Universe, UniverseWithProjects, Project, StoryDNA, WorldElements } from '../shared/types/index.js';

const logger = createLogger('services:universe');

/**
 * Helper: Safely parse JSON with fallback
 */
function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString as any);
  } catch (error: any) {
    logger.error({ error: error.message }, 'JSON parse error');
    return fallback;
  }
}

/**
 * Universe Service
 * Manages shared universes for world-building across multiple projects
 */
export class UniverseService {
  /**
   * Get all universes
   */
  getAll(): Universe[] {
    const stmt = db.prepare<[], any>(`
      SELECT * FROM universes ORDER BY updated_at DESC
    `);

    const universes = stmt.all();
    return universes.map(this.parseUniverse);
  }

  /**
   * Get a universe by ID
   */
  getById(universeId: string): Universe | null {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM universes WHERE id = ?
    `);

    const universe = stmt.get(universeId);
    if (!universe) return null;

    return this.parseUniverse(universe);
  }

  /**
   * Get universe with all its projects
   */
  getWithProjects(universeId: string): UniverseWithProjects | null {
    const universe = this.getById(universeId);
    if (!universe) return null;

    const projectsStmt = db.prepare<[string], any>(`
      SELECT * FROM projects WHERE universe_id = ? ORDER BY created_at ASC
    `);

    const projects = projectsStmt.all(universeId);

    return {
      ...universe,
      projects: projects.map((p: any) => ({
        ...p,
        story_dna: safeJsonParse(p.story_dna, null),
        story_bible: safeJsonParse(p.story_bible, null),
        series_bible: safeJsonParse(p.series_bible, null),
        is_universe_root: !!p.is_universe_root,
      })),
    };
  }

  /**
   * Get all projects that can serve as universe sources
   * (projects with a story_bible that has world elements)
   */
  getSourceProjects(): Project[] {
    const stmt = db.prepare<[], any>(`
      SELECT * FROM projects
      WHERE story_bible IS NOT NULL
      ORDER BY updated_at DESC
    `);

    const projects = stmt.all();
    return projects.map((p: any) => ({
      ...p,
      story_dna: safeJsonParse(p.story_dna, null),
      story_bible: safeJsonParse(p.story_bible, null),
      series_bible: safeJsonParse(p.series_bible, null),
      is_universe_root: !!p.is_universe_root,
    }));
  }

  /**
   * Create a universe from an existing project
   */
  createFromProject(projectId: string, name?: string, description?: string): Universe {
    // Get the source project
    const projectStmt = db.prepare<[string], any>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      throw new Error('Source project not found');
    }

    const storyDna = safeJsonParse<StoryDNA | null>(project.story_dna, null);
    const storyBible = safeJsonParse<any>(project.story_bible, null);
    const worldTemplate = storyBible?.world || null;

    const universeId = randomUUID();
    const now = new Date().toISOString();
    const universeName = name || `${project.title} Universe`;

    // Create the universe
    const insertStmt = db.prepare(`
      INSERT INTO universes (id, name, description, root_project_id, story_dna_template, world_template, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      universeId,
      universeName,
      description || `Universe based on ${project.title}`,
      projectId,
      JSON.stringify(storyDna),
      JSON.stringify(worldTemplate),
      now,
      now
    );

    // Mark the source project as universe root and link it
    const updateProjectStmt = db.prepare(`
      UPDATE projects SET universe_id = ?, is_universe_root = 1, updated_at = ? WHERE id = ?
    `);
    updateProjectStmt.run(universeId, now, projectId);

    logger.info({ universeId, projectId, name: universeName }, 'Created universe from project');

    return this.getById(universeId)!;
  }

  /**
   * Link a project to an existing universe
   */
  linkProjectToUniverse(projectId: string, universeId: string): void {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE projects SET universe_id = ?, updated_at = ? WHERE id = ?
    `);

    const result = stmt.run(universeId, now, projectId);

    if (result.changes === 0) {
      throw new Error('Project not found');
    }

    logger.info({ projectId, universeId }, 'Linked project to universe');
  }

  /**
   * Get inheritable elements from a universe
   * Returns the world template elements that new projects can reference
   */
  getInheritableElements(universeId: string): {
    storyDna: StoryDNA | null;
    world: WorldElements | null;
    rootProjectTitle: string | null;
  } {
    const universe = this.getById(universeId);
    if (!universe) {
      throw new Error('Universe not found');
    }

    // Get root project title
    let rootProjectTitle: string | null = null;
    if (universe.root_project_id) {
      const projectStmt = db.prepare<[string], any>(`
        SELECT title FROM projects WHERE id = ?
      `);
      const project = projectStmt.get(universe.root_project_id);
      rootProjectTitle = project?.title || null;
    }

    return {
      storyDna: universe.story_dna_template,
      world: universe.world_template,
      rootProjectTitle,
    };
  }

  /**
   * Get or create universe for a project
   * If sourceProjectId is provided and has no universe, creates one
   * Returns the universe ID to link to
   */
  getOrCreateUniverse(sourceProjectId: string): string {
    // Check if source project already belongs to a universe
    const projectStmt = db.prepare<[string], any>(`
      SELECT universe_id FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(sourceProjectId);

    if (project?.universe_id) {
      return project.universe_id;
    }

    // Create a new universe from this project
    const universe = this.createFromProject(sourceProjectId);
    return universe.id;
  }

  /**
   * Parse a raw universe row from database
   */
  private parseUniverse(row: any): Universe {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      root_project_id: row.root_project_id,
      story_dna_template: safeJsonParse(row.story_dna_template, null),
      world_template: safeJsonParse(row.world_template, null),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Export singleton instance
export const universeService = new UniverseService();
