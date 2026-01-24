import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations() {
  console.log('[Migrations] Running database migrations...');

  try {
    // Create migrations tracking table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Check which migrations have been applied
    const getVersionStmt = db.prepare<[], { version: number }>(`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
    `);

    const currentVersion = getVersionStmt.get()?.version || 0;
    console.log(`[Migrations] Current schema version: ${currentVersion}`);

    // Migration 001 is the base schema (schema.sql)
    if (currentVersion < 1) {
      console.log('[Migrations] Applying migration 001: Base schema');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      db.exec('BEGIN TRANSACTION');

      // Split by semicolons and execute each statement
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        db.exec(statement);
      }

      db.prepare(`INSERT INTO schema_migrations (version) VALUES (1)`).run();
      db.exec('COMMIT');
      console.log('[Migrations] Migration 001 applied successfully');
    }

    // Migration 002: Trilogy support
    if (currentVersion < 2) {
      console.log('[Migrations] Applying migration 002: Trilogy support');

      db.exec('BEGIN TRANSACTION');

      try {
        // Check if columns already exist in books table
        const booksInfo = db.pragma('table_info(books)') as any[];
        const hasEndingState = booksInfo.some((col: any) => col.name === 'ending_state');

        if (!hasEndingState) {
          console.log('[Migrations] Adding trilogy columns to books table');
          db.exec('ALTER TABLE books ADD COLUMN ending_state TEXT');
          db.exec('ALTER TABLE books ADD COLUMN book_summary TEXT');
          db.exec('ALTER TABLE books ADD COLUMN timeline_end TEXT');
        } else {
          console.log('[Migrations] Books table trilogy columns already exist');
        }

        // Check if columns already exist in projects table
        const projectsInfo = db.pragma('table_info(projects)') as any[];
        const hasSeriesBible = projectsInfo.some((col: any) => col.name === 'series_bible');

        if (!hasSeriesBible) {
          console.log('[Migrations] Adding trilogy columns to projects table');
          db.exec('ALTER TABLE projects ADD COLUMN series_bible TEXT');
          db.exec('ALTER TABLE projects ADD COLUMN book_count INTEGER DEFAULT 1');
        } else {
          console.log('[Migrations] Projects table trilogy columns already exist');
        }

        // Check if book_transitions table exists
        const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='book_transitions'`).all();

        if (tables.length === 0) {
          console.log('[Migrations] Creating book_transitions table');
          db.exec(`
            CREATE TABLE book_transitions (
              id TEXT PRIMARY KEY,
              project_id TEXT NOT NULL,
              from_book_id TEXT NOT NULL,
              to_book_id TEXT NOT NULL,
              time_gap TEXT,
              gap_summary TEXT,
              character_changes TEXT,
              world_changes TEXT,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
              FOREIGN KEY (from_book_id) REFERENCES books(id) ON DELETE CASCADE,
              FOREIGN KEY (to_book_id) REFERENCES books(id) ON DELETE CASCADE
            )
          `);

          db.exec('CREATE INDEX idx_transitions_project ON book_transitions(project_id)');
          db.exec('CREATE INDEX idx_transitions_from_book ON book_transitions(from_book_id)');
          db.exec('CREATE INDEX idx_transitions_to_book ON book_transitions(to_book_id)');
        } else {
          console.log('[Migrations] book_transitions table already exists');
        }

        db.prepare(`INSERT INTO schema_migrations (version) VALUES (2)`).run();
        db.exec('COMMIT');
        console.log('[Migrations] Migration 002 applied successfully');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }

    // Migration 003: Agent Learning System
    if (currentVersion < 3) {
      console.log('[Migrations] Applying migration 003: Agent Learning System');
      const migrationPath = path.join(__dirname, 'migrations', '003_agent_learning.sql');
      const migration = fs.readFileSync(migrationPath, 'utf-8');

      db.exec('BEGIN TRANSACTION');

      try {
        // Split by semicolons and execute each statement
        const statements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          db.exec(statement);
        }

        db.prepare(`INSERT INTO schema_migrations (version) VALUES (3)`).run();
        db.exec('COMMIT');
        console.log('[Migrations] Migration 003 applied successfully');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }

    console.log('[Migrations] All migrations complete');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors
    }
    console.error('[Migrations] Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly via tsx
const scriptPath = process.argv[1]?.replace(/\\/g, '/');
const moduleUrl = import.meta.url;

// Check if this script was called directly
const isMainModule = scriptPath && (
  moduleUrl.includes(scriptPath) ||
  (scriptPath.includes('migrate') && moduleUrl.includes('migrate'))
);

if (isMainModule) {
  runMigrations();
  process.exit(0);
}
