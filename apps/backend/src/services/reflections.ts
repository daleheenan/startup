import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

export interface Reflection {
  id: string;
  job_id: string;
  agent_type: string;
  chapter_id?: string;
  project_id?: string;
  reflection: string;
  lesson_id?: string;
  created_at?: string;
}

export interface ReflectionQuery {
  agent_type?: string;
  job_id?: string;
  chapter_id?: string;
  project_id?: string;
  unpromoted?: boolean;
  limit?: number;
}

export const reflectionsService = {
  /**
   * Create a new reflection
   */
  async create(reflection: Omit<Reflection, 'id' | 'created_at'>): Promise<Reflection> {
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO reflections (id, job_id, agent_type, chapter_id, project_id, reflection, lesson_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      reflection.job_id,
      reflection.agent_type,
      reflection.chapter_id || null,
      reflection.project_id || null,
      reflection.reflection,
      reflection.lesson_id || null
    );

    return {
      id,
      ...reflection,
    };
  },

  /**
   * Query reflections with filters
   */
  async query(filters: ReflectionQuery): Promise<Reflection[]> {
    let sql = 'SELECT * FROM reflections WHERE 1=1';
    const params: any[] = [];

    if (filters.agent_type) {
      sql += ' AND agent_type = ?';
      params.push(filters.agent_type);
    }

    if (filters.job_id) {
      sql += ' AND job_id = ?';
      params.push(filters.job_id);
    }

    if (filters.chapter_id) {
      sql += ' AND chapter_id = ?';
      params.push(filters.chapter_id);
    }

    if (filters.project_id) {
      sql += ' AND project_id = ?';
      params.push(filters.project_id);
    }

    if (filters.unpromoted) {
      sql += ' AND lesson_id IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params) as Reflection[];
  },

  /**
   * Get a single reflection by ID
   */
  async getById(id: string): Promise<Reflection | null> {
    const stmt = db.prepare('SELECT * FROM reflections WHERE id = ?');
    return (stmt.get(id) as Reflection) || null;
  },

  /**
   * Link a reflection to a lesson (mark as promoted)
   */
  async linkToLesson(reflectionId: string, lessonId: string): Promise<void> {
    const stmt = db.prepare(`
      UPDATE reflections
      SET lesson_id = ?
      WHERE id = ?
    `);

    stmt.run(lessonId, reflectionId);
  },

  /**
   * Get unpromoted reflections for analysis
   */
  async getUnpromoted(agentType: string, limit: number = 50): Promise<Reflection[]> {
    const stmt = db.prepare(`
      SELECT * FROM reflections
      WHERE agent_type = ? AND lesson_id IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(agentType, limit) as Reflection[];
  },

  /**
   * Delete reflections older than a certain date
   */
  async deleteOlderThan(days: number): Promise<number> {
    const stmt = db.prepare(`
      DELETE FROM reflections
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(days);
    return result.changes;
  },
};
