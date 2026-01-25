import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:genre-tropes');

export interface GenreTrope {
  id: string;
  trope_name: string;
  description: string;
  genre: string;
  subgenre?: string;
  trope_type: 'character' | 'plot' | 'setting' | 'relationship' | 'theme' | 'device';
  usage_frequency: 'common' | 'moderate' | 'rare';
  compatibility_tags?: string[];
  warning_tags?: string[];
  examples?: string[];
  subversions?: string[];
  created_at: string;
  updated_at: string;
}

export interface ConceptTrope {
  id: string;
  concept_id: string;
  trope_id: string;
  preference: 'include' | 'exclude' | 'subvert';
  notes?: string;
  created_at: string;
}

export interface TropeFilter {
  genre?: string;
  subgenre?: string;
  trope_type?: string;
  usage_frequency?: string;
}

class GenreTropesService {
  /**
   * Get all tropes for a specific genre
   */
  getTropesByGenre(genre: string, subgenre?: string): GenreTrope[] {
    try {
      let query = `
        SELECT * FROM genre_tropes
        WHERE genre = ?
      `;
      const params: any[] = [genre];

      if (subgenre) {
        query += ` AND (subgenre = ? OR subgenre IS NULL)`;
        params.push(subgenre);
      }

      query += ` ORDER BY usage_frequency DESC, trope_name ASC`;

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(this.parseTrope);
    } catch (error) {
      logger.error({ error }, 'Error fetching tropes by genre');
      throw error;
    }
  }

  /**
   * Get tropes with filters
   */
  getTropes(filters: TropeFilter): GenreTrope[] {
    try {
      let query = 'SELECT * FROM genre_tropes WHERE 1=1';
      const params: any[] = [];

      if (filters.genre) {
        query += ' AND genre = ?';
        params.push(filters.genre);
      }

      if (filters.subgenre) {
        query += ' AND (subgenre = ? OR subgenre IS NULL)';
        params.push(filters.subgenre);
      }

      if (filters.trope_type) {
        query += ' AND trope_type = ?';
        params.push(filters.trope_type);
      }

      if (filters.usage_frequency) {
        query += ' AND usage_frequency = ?';
        params.push(filters.usage_frequency);
      }

      query += ' ORDER BY usage_frequency DESC, trope_name ASC';

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(this.parseTrope);
    } catch (error) {
      logger.error({ error }, 'Error fetching tropes with filters');
      throw error;
    }
  }

  /**
   * Get a single trope by ID
   */
  getTropeById(id: string): GenreTrope | null {
    try {
      const stmt = db.prepare('SELECT * FROM genre_tropes WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) {
        return null;
      }

      return this.parseTrope(row);
    } catch (error) {
      logger.error({ error }, 'Error fetching trope by ID');
      throw error;
    }
  }

  /**
   * Get tropes for multiple genres (for blended genre concepts)
   */
  getTropesForGenres(genres: string[]): GenreTrope[] {
    try {
      if (genres.length === 0) {
        return [];
      }

      const placeholders = genres.map(() => '?').join(',');
      const query = `
        SELECT * FROM genre_tropes
        WHERE genre IN (${placeholders})
        ORDER BY usage_frequency DESC, trope_name ASC
      `;

      const stmt = db.prepare(query);
      const rows = stmt.all(...genres) as any[];

      return rows.map(this.parseTrope);
    } catch (error) {
      logger.error({ error }, 'Error fetching tropes for genres');
      throw error;
    }
  }

  /**
   * Associate tropes with a saved concept
   */
  saveConceptTropes(
    conceptId: string,
    tropes: Array<{ tropeId: string; preference: 'include' | 'exclude' | 'subvert'; notes?: string }>
  ): void {
    try {
      // First, delete existing concept tropes
      const deleteStmt = db.prepare('DELETE FROM concept_tropes WHERE concept_id = ?');
      deleteStmt.run(conceptId);

      // Insert new concept tropes
      const insertStmt = db.prepare(`
        INSERT INTO concept_tropes (id, concept_id, trope_id, preference, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const trope of tropes) {
        const id = uuidv4();
        insertStmt.run(id, conceptId, trope.tropeId, trope.preference, trope.notes || null);
      }
    } catch (error) {
      logger.error({ error }, 'Error saving concept tropes');
      throw error;
    }
  }

  /**
   * Get tropes associated with a concept
   */
  getConceptTropes(conceptId: string): Array<ConceptTrope & { trope: GenreTrope }> {
    try {
      const stmt = db.prepare(`
        SELECT
          ct.*,
          gt.trope_name,
          gt.description,
          gt.genre,
          gt.subgenre,
          gt.trope_type,
          gt.usage_frequency,
          gt.compatibility_tags,
          gt.warning_tags,
          gt.examples,
          gt.subversions
        FROM concept_tropes ct
        JOIN genre_tropes gt ON ct.trope_id = gt.id
        WHERE ct.concept_id = ?
        ORDER BY ct.created_at ASC
      `);

      const rows = stmt.all(conceptId) as any[];

      return rows.map((row) => ({
        id: row.id,
        concept_id: row.concept_id,
        trope_id: row.trope_id,
        preference: row.preference,
        notes: row.notes,
        created_at: row.created_at,
        trope: {
          id: row.trope_id,
          trope_name: row.trope_name,
          description: row.description,
          genre: row.genre,
          subgenre: row.subgenre,
          trope_type: row.trope_type,
          usage_frequency: row.usage_frequency,
          compatibility_tags: this.parseJSON(row.compatibility_tags),
          warning_tags: this.parseJSON(row.warning_tags),
          examples: this.parseJSON(row.examples),
          subversions: this.parseJSON(row.subversions),
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      }));
    } catch (error) {
      logger.error({ error }, 'Error fetching concept tropes');
      throw error;
    }
  }

  /**
   * Get recommended tropes based on selected genres and subgenres
   */
  getRecommendedTropes(genres: string[], subgenres: string[]): GenreTrope[] {
    try {
      // Get tropes that match the genres
      const genreTropes = this.getTropesForGenres(genres);

      // Filter by compatibility with subgenres if provided
      if (subgenres.length > 0) {
        return genreTropes.filter((trope) => {
          // Include if trope has no specific subgenre (generic to the genre)
          if (!trope.subgenre) return true;

          // Include if trope's subgenre matches one of the selected subgenres
          if (subgenres.includes(trope.subgenre)) return true;

          // Include if any compatibility tag matches a selected subgenre
          if (trope.compatibility_tags) {
            return trope.compatibility_tags.some((tag) => subgenres.includes(tag));
          }

          return false;
        });
      }

      return genreTropes;
    } catch (error) {
      logger.error({ error }, 'Error getting recommended tropes');
      throw error;
    }
  }

  /**
   * Create a new trope (admin function)
   */
  createTrope(trope: Omit<GenreTrope, 'id' | 'created_at' | 'updated_at'>): GenreTrope {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO genre_tropes (
          id, trope_name, description, genre, subgenre, trope_type,
          usage_frequency, compatibility_tags, warning_tags, examples,
          subversions, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        trope.trope_name,
        trope.description,
        trope.genre,
        trope.subgenre || null,
        trope.trope_type,
        trope.usage_frequency,
        JSON.stringify(trope.compatibility_tags || []),
        JSON.stringify(trope.warning_tags || []),
        JSON.stringify(trope.examples || []),
        JSON.stringify(trope.subversions || []),
        now,
        now
      );

      return {
        id,
        ...trope,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      logger.error({ error }, 'Error creating trope');
      throw error;
    }
  }

  /**
   * Parse trope row from database
   */
  private parseTrope(row: any): GenreTrope {
    return {
      id: row.id,
      trope_name: row.trope_name,
      description: row.description,
      genre: row.genre,
      subgenre: row.subgenre,
      trope_type: row.trope_type,
      usage_frequency: row.usage_frequency,
      compatibility_tags: this.parseJSON(row.compatibility_tags),
      warning_tags: this.parseJSON(row.warning_tags),
      examples: this.parseJSON(row.examples),
      subversions: this.parseJSON(row.subversions),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Parse JSON field, handling null and invalid JSON
   */
  private parseJSON(value: string | null): any[] | undefined {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
}

export const genreTropesService = new GenreTropesService();
