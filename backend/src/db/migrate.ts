import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createLogger } from '../services/logger.service.js';
import { backupService } from '../services/backup.service.js';
import { createMigrationRegistry, type MigrationDefinition } from './migration-registry.js';

const logger = createLogger('db:migrate');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path for backup
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/novelforge.db');

/**
 * Parse SQL file into individual statements, properly handling:
 * - TRIGGER/BEGIN...END blocks (which contain internal semicolons)
 * - Single-line comments (--)
 * - Multi-statement files
 */
function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inTrigger = false;

  // Remove single-line comments but preserve the structure
  const lines = sql.split('\n');
  const cleanedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '';
    return line;
  });
  const cleanedSql = cleanedLines.join('\n');

  // Split by semicolons but track BEGIN/END blocks
  const chars = cleanedSql.split('');
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    // Check for BEGIN keyword (start of trigger body)
    if (!inTrigger && current.toUpperCase().includes('CREATE TRIGGER')) {
      const remaining = cleanedSql.substring(i).toUpperCase();
      if (remaining.startsWith('BEGIN')) {
        inTrigger = true;
      }
    }

    // Check for END keyword (end of trigger body)
    if (inTrigger) {
      const remaining = cleanedSql.substring(i).toUpperCase();
      if (remaining.startsWith('END;') || remaining.startsWith('END ;')) {
        // Include END and the semicolon
        const endMatch = cleanedSql.substring(i).match(/^END\s*;/i);
        if (endMatch) {
          current += endMatch[0];
          i += endMatch[0].length;
          statements.push(current.trim());
          current = '';
          inTrigger = false;
          continue;
        }
      }
    }

    if (char === ';' && !inTrigger) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements.filter(s => s.length > 0);
}

/**
 * Create backup before running migrations (synchronous)
 */
function createPreMigrationBackup(): boolean {
  if (!fs.existsSync(DATABASE_PATH)) {
    logger.info('[Migrations] No existing database to backup');
    return true;
  }

  logger.info('[Migrations] Creating pre-migration backup...');
  const result = backupService.createBackupSync(DATABASE_PATH, 'pre-migration');

  if (result.success) {
    logger.info({ backupPath: result.backupPath, durationMs: result.duration }, '[Migrations] Backup created successfully');
    return true;
  } else {
    logger.error({ error: result.error }, '[Migrations] Backup failed');
    return false;
  }
}

/**
 * Run a single migration with proper error handling
 */
function runMigration(version: number, name: string, sql: string): boolean {
  logger.info(`[Migrations] Applying migration ${String(version).padStart(3, '0')}: ${name}`);

  db.exec('BEGIN TRANSACTION');

  try {
    const statements = parseSqlStatements(sql);

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (execError: any) {
        // Silently skip ALTER TABLE errors for columns that already exist
        // Also skip duplicate trigger/table/index errors
        if (execError.code === 'SQLITE_ERROR') {
          const msg = execError.message?.toLowerCase() || '';
          if (statement.includes('ALTER TABLE') ||
              msg.includes('already exists') ||
              msg.includes('duplicate column')) {
            logger.info(`[Migrations] Skipping (already exists): ${statement.substring(0, 60)}...`);
            continue;
          }
        }
        throw execError;
      }
    }

    db.prepare(`INSERT INTO schema_migrations (version) VALUES (?)`).run(version);
    db.exec('COMMIT');
    logger.info(`[Migrations] Migration ${String(version).padStart(3, '0')} applied successfully`);
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Main migration function (synchronous for server startup)
 */
export function runMigrations() {
  logger.info('[Migrations] Running database migrations...');

  try {
    // Create backup before any migrations
    const backupSuccess = createPreMigrationBackup();
    if (!backupSuccess) {
      logger.warn('[Migrations] Proceeding without backup (backup failed)');
    }

    // Initialize migration registry
    const registry = createMigrationRegistry(db);

    // Migrate old schema_migrations data to new registry
    registry.migrateFromOldSchema();

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
    logger.info(`[Migrations] Current schema version: ${currentVersion}`);

    // Migration 001 is the base schema (schema.sql)
    if (currentVersion < 1) {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      runMigration(1, 'Base schema', schema);
    }

    // Migration 002: Trilogy support (inline for backward compatibility)
    if (currentVersion < 2) {
      logger.info('[Migrations] Applying migration 002: Trilogy support');

      db.exec('BEGIN TRANSACTION');

      try {
        // Check if columns already exist in books table
        const booksInfo = db.pragma('table_info(books)') as any[];
        const hasEndingState = booksInfo.some((col: any) => col.name === 'ending_state');

        if (!hasEndingState) {
          logger.info('[Migrations] Adding trilogy columns to books table');
          db.exec('ALTER TABLE books ADD COLUMN ending_state TEXT');
          db.exec('ALTER TABLE books ADD COLUMN book_summary TEXT');
          db.exec('ALTER TABLE books ADD COLUMN timeline_end TEXT');
        } else {
          logger.info('[Migrations] Books table trilogy columns already exist');
        }

        // Check if columns already exist in projects table
        const projectsInfo = db.pragma('table_info(projects)') as any[];
        const hasSeriesBible = projectsInfo.some((col: any) => col.name === 'series_bible');

        if (!hasSeriesBible) {
          logger.info('[Migrations] Adding trilogy columns to projects table');
          db.exec('ALTER TABLE projects ADD COLUMN series_bible TEXT');
          db.exec('ALTER TABLE projects ADD COLUMN book_count INTEGER DEFAULT 1');
        } else {
          logger.info('[Migrations] Projects table trilogy columns already exist');
        }

        // Check if book_transitions table exists
        const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='book_transitions'`).all();

        if (tables.length === 0) {
          logger.info('[Migrations] Creating book_transitions table');
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
          logger.info('[Migrations] book_transitions table already exists');
        }

        db.prepare(`INSERT INTO schema_migrations (version) VALUES (2)`).run();
        db.exec('COMMIT');
        logger.info('[Migrations] Migration 002 applied successfully');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }

    // Migration 003: Agent Learning System
    if (currentVersion < 3) {
      const migrationPath = path.join(__dirname, 'migrations', '003_agent_learning.sql');
      const migration = fs.readFileSync(migrationPath, 'utf-8');

      // Remove comment-only lines but preserve inline comments in statements
      const lines = migration.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length === 0 || !trimmed.startsWith('--');
      });
      const cleanedMigration = cleanedLines.join('\n');

      runMigration(3, 'Agent Learning System', cleanedMigration);
    }

    // Migration 004: Saved Concepts
    if (currentVersion < 4) {
      const migrationPath = path.join(__dirname, 'migrations', '004_saved_concepts.sql');
      const migration = fs.readFileSync(migrationPath, 'utf-8');

      const lines = migration.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length === 0 || !trimmed.startsWith('--');
      });
      const cleanedMigration = cleanedLines.join('\n');

      runMigration(4, 'Saved Concepts', cleanedMigration);
    }

    // Migrations 005-028: Run from migration files
    // Note: Version numbers in filenames don't directly map to DB versions
    // The DB version is 5 + index in this array
    const migrationFiles = [
      '005_analytics_insights.sql',      // DB version 5
      '006_chapter_edits.sql',           // DB version 6
      '007_regeneration_variations.sql', // DB version 7
      '008_project_metrics.sql',         // DB version 8
      '009_genre_tropes.sql',            // DB version 9
      '010_prose_style_control.sql',     // DB version 10
      '011_book_style_presets.sql',      // DB version 11
      '012_mystery_tracking.sql',        // DB version 12
      '013_performance_indexes.sql',     // DB version 13
      '014_universe_support.sql',        // DB version 14
      '015_plot_structure.sql',          // DB version 15
      '016_timeframe_support.sql',       // DB version 16
      '017_migration_registry.sql',      // DB version 17
      '018_concept_summaries.sql',       // DB version 18
      '019_enhanced_tracking_and_query_perf.sql', // DB version 19
      '020_author_management.sql',       // DB version 20
      '021_story_concept.sql',           // DB version 21
      '022_saved_story_ideas.sql',       // DB version 22
      '023_plagiarism_checks.sql',       // DB version 23
      '024_user_preferences.sql',        // DB version 24
      '025_concept_source_idea.sql',     // DB version 25
      '019_user_settings.sql',           // DB version 26 - user genres, exclusions, recipes
      '019_time_period.sql',             // DB version 27 - time period support
      '015_fix_metrics_trigger.sql',     // DB version 28 - fix word_count ambiguity in trigger
      '020_backfill_metrics.sql',        // DB version 29 - backfill metrics for existing data
      '026_author_name_field.sql',       // DB version 30 - author name for exports
      '027_editorial_reports.sql',       // DB version 31 - VEB (Virtual Editorial Board) tables
      '028_post_completion_features.sql', // DB version 32 - post-completion features
      '029_coherence_checks.sql',        // DB version 33 - coherence analysis
      '030_auto_veb_on_completion.sql',  // DB version 34 - auto-trigger VEB on book completion
      '031_outline_editorial_board.sql', // DB version 35 - Outline Editorial Board tables
      '032_book_cloning.sql',            // DB version 36 - book cloning support
    ];

    for (let i = 0; i < migrationFiles.length; i++) {
      const version = 5 + i;
      const filename = migrationFiles[i];

      if (currentVersion < version) {
        const migrationPath = path.join(__dirname, 'migrations', filename);

        if (!fs.existsSync(migrationPath)) {
          logger.info(`[Migrations] Migration file ${filename} not found, skipping`);
          continue;
        }

        const migration = fs.readFileSync(migrationPath, 'utf-8');
        runMigration(version, filename, migration);
      }
    }

    logger.info('[Migrations] All migrations complete');

  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors
    }
    logger.error({ error }, 'Migration failed');
    throw error;
  }
}

/**
 * Rollback the last migration (if supported)
 */
export async function rollbackLastMigration(): Promise<boolean> {
  const registry = createMigrationRegistry(db);
  const applied = registry.getAppliedMigrations();

  if (applied.length === 0) {
    logger.info('[Migrations] No migrations to rollback');
    return false;
  }

  const lastMigration = applied[applied.length - 1];

  if (!lastMigration.can_rollback) {
    logger.error({ version: lastMigration.version, name: lastMigration.name },
      '[Migrations] Last migration does not support rollback');
    return false;
  }

  // Create backup before rollback
  await backupService.createBackup(DATABASE_PATH, 'pre-rollback');

  // For now, we need the down SQL to be provided
  // In a full implementation, you would store the down SQL with the migration
  logger.warn('[Migrations] Rollback requires manual intervention - down SQL not stored');
  return false;
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  currentVersion: number;
  appliedMigrations: number;
  pendingMigrations: string[];
} {
  const getVersionStmt = db.prepare<[], { version: number }>(`
    SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
  `);
  const currentVersion = getVersionStmt.get()?.version || 0;

  const countStmt = db.prepare<[], { count: number }>(`
    SELECT COUNT(*) as count FROM schema_migrations
  `);
  const appliedMigrations = countStmt.get()?.count || 0;

  const migrationFiles = [
    '005_analytics_insights.sql',
    '006_chapter_edits.sql',
    '007_regeneration_variations.sql',
    '008_project_metrics.sql',
    '009_genre_tropes.sql',
    '010_prose_style_control.sql',
    '011_book_style_presets.sql',
    '012_mystery_tracking.sql',
    '013_performance_indexes.sql',
    '014_universe_support.sql',
    '015_plot_structure.sql',
    '016_timeframe_support.sql',
    '017_migration_registry.sql',
    '018_concept_summaries.sql',
    '019_enhanced_tracking_and_query_perf.sql',
    '020_author_management.sql',
    '021_story_concept.sql',
    '022_saved_story_ideas.sql',
    '023_plagiarism_checks.sql',
    '024_user_preferences.sql',
    '025_concept_source_idea.sql',
    '019_user_settings.sql',
    '019_time_period.sql',
    '015_fix_metrics_trigger.sql',
    '020_backfill_metrics.sql',
    '026_author_name_field.sql',
    '027_editorial_reports.sql',
    '028_post_completion_features.sql',
    '029_coherence_checks.sql',
    '030_auto_veb_on_completion.sql',
    '031_outline_editorial_board.sql',
    '032_book_cloning.sql',
  ];

  const pendingMigrations: string[] = [];
  for (let i = 0; i < migrationFiles.length; i++) {
    const version = 5 + i;
    if (version > currentVersion) {
      pendingMigrations.push(migrationFiles[i]);
    }
  }

  return {
    currentVersion,
    appliedMigrations,
    pendingMigrations,
  };
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
  try {
    runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
