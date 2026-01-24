import db from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all database migrations
 */
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
      const migration001 = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
      db.exec(migration001);
      db.prepare(`INSERT INTO schema_migrations (version) VALUES (1)`).run();
      console.log('[Migrations] Migration 001 applied successfully');
    }

    // Migration 002: Trilogy support
    if (currentVersion < 2) {
      console.log('[Migrations] Applying migration 002: Trilogy support');
      const migration002 = readFileSync(join(__dirname, 'migrations', '002_trilogy_support.sql'), 'utf-8');
      db.exec(migration002);
      db.prepare(`INSERT INTO schema_migrations (version) VALUES (2)`).run();
      console.log('[Migrations] Migration 002 applied successfully');
    }

    console.log('[Migrations] All migrations complete');
  } catch (error) {
    console.error('[Migrations] Error running migrations:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
