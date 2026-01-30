import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

export interface Lesson {
  id: string;
  agent_type: string;
  scope: string;
  category: 'technique' | 'pitfall' | 'pattern' | 'preference' | 'correction';
  title: string;
  content: string;
  score: number;
  context?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface LessonQuery {
  agent_type?: string;
  scope?: string;
  category?: string;
  limit?: number;
}

export const lessonsService = {
  /**
   * Retrieve lessons for a specific agent with scope filtering
   */
  async retrieve(agentType: string, genre?: string, projectId?: string): Promise<Lesson[]> {
    const scopes = ['global'];
    if (genre) scopes.push(`genre:${genre}`);
    if (projectId) scopes.push(`project:${projectId}`);

    // Create parameterised placeholders for safe IN clause
    const placeholders = scopes.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT * FROM lessons
      WHERE agent_type = ? AND scope IN (${placeholders})
      ORDER BY score DESC, created_at DESC
      LIMIT 10
    `);

    // Use parameterised query - scopes array is safe as it's constructed from controlled values
    const rows = stmt.all(agentType, ...scopes) as any[];

    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  },

  /**
   * Query lessons with filters
   */
  async query(filters: LessonQuery): Promise<Lesson[]> {
    let sql = 'SELECT * FROM lessons WHERE 1=1';
    const params: any[] = [];

    if (filters.agent_type) {
      sql += ' AND agent_type = ?';
      params.push(filters.agent_type);
    }

    if (filters.scope) {
      sql += ' AND scope = ?';
      params.push(filters.scope);
    }

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    sql += ' ORDER BY score DESC, created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  },

  /**
   * Get a single lesson by ID
   */
  async getById(id: string): Promise<Lesson | null> {
    const stmt = db.prepare('SELECT * FROM lessons WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  },

  /**
   * Create a new lesson
   */
  async create(lesson: Omit<Lesson, 'id' | 'score' | 'created_at' | 'updated_at'>): Promise<Lesson> {
    const id = uuidv4();
    const tags = lesson.tags ? JSON.stringify(lesson.tags) : null;

    const stmt = db.prepare(`
      INSERT INTO lessons (id, agent_type, scope, category, title, content, context, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      lesson.agent_type,
      lesson.scope,
      lesson.category,
      lesson.title,
      lesson.content,
      lesson.context || null,
      tags
    );

    return {
      id,
      score: 1,
      ...lesson,
      tags: lesson.tags || [],
    };
  },

  /**
   * Update a lesson
   */
  async update(id: string, updates: Partial<Omit<Lesson, 'id' | 'created_at'>>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.content !== undefined) {
      fields.push('content = ?');
      params.push(updates.content);
    }

    if (updates.category !== undefined) {
      fields.push('category = ?');
      params.push(updates.category);
    }

    if (updates.scope !== undefined) {
      fields.push('scope = ?');
      params.push(updates.scope);
    }

    if (updates.context !== undefined) {
      fields.push('context = ?');
      params.push(updates.context);
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = datetime("now")');
    params.push(id);

    const stmt = db.prepare(`
      UPDATE lessons
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  },

  /**
   * Increment or decrement lesson score
   */
  async updateScore(lessonId: string, increment: number): Promise<void> {
    const stmt = db.prepare(`
      UPDATE lessons
      SET score = score + ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(increment, lessonId);
  },

  /**
   * Delete a lesson
   */
  async delete(lessonId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM lessons WHERE id = ?');
    stmt.run(lessonId);
  },

  /**
   * Delete lessons with score below threshold
   */
  async pruneNegativeScores(threshold: number = -2): Promise<number> {
    const stmt = db.prepare('DELETE FROM lessons WHERE score < ?');
    const result = stmt.run(threshold);
    return result.changes;
  },
};
