/**
 * Migration Registry
 *
 * Tracks database migrations with enhanced features:
 * - Records migration metadata (name, checksum, timestamp)
 * - Supports rollback for reversible migrations
 * - Provides migration history and status reporting
 *
 * This replaces the simple schema_migrations table with a more robust
 * tracking system while maintaining backward compatibility.
 */

import type Database from 'better-sqlite3';
import crypto from 'crypto';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('db:migration-registry');

/**
 * Migration record stored in the database
 */
export interface MigrationRecord {
  id: number;
  version: number;
  name: string;
  applied_at: string;
  checksum: string;
  can_rollback: boolean;
  rolled_back_at: string | null;
  execution_time_ms: number;
}

/**
 * Migration definition for applying migrations
 */
export interface MigrationDefinition {
  version: number;
  name: string;
  up: string; // SQL to apply migration
  down?: string; // SQL to rollback migration (optional)
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  success: boolean;
  version: number;
  name: string;
  executionTimeMs: number;
  error?: string;
}

/**
 * Migration Registry Service
 *
 * Manages migration tracking with support for:
 * - Migration checksums to detect changes
 * - Rollback support for reversible migrations
 * - Execution time tracking
 * - Comprehensive history
 */
export class MigrationRegistry {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureRegistryTable();
  }

  /**
   * Ensure the migration registry table exists
   * Creates both the new registry table and maintains backward compatibility
   * with the old schema_migrations table
   */
  private ensureRegistryTable(): void {
    // Create the enhanced migration registry table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migration_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT NOT NULL,
        can_rollback INTEGER NOT NULL DEFAULT 0,
        rolled_back_at TEXT,
        execution_time_ms INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create index for version lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_migration_registry_version
      ON migration_registry(version)
    `);

    logger.debug('Migration registry table ensured');
  }

  /**
   * Calculate checksum for migration SQL
   * Used to detect if a migration file has been modified after being applied
   */
  calculateChecksum(sql: string): string {
    return crypto
      .createHash('sha256')
      .update(sql.trim())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get the current schema version
   * Checks both old and new migration tracking tables for compatibility
   */
  getCurrentVersion(): number {
    // First check the new registry
    const registryStmt = this.db.prepare<[], { version: number }>(`
      SELECT version FROM migration_registry
      WHERE rolled_back_at IS NULL
      ORDER BY version DESC
      LIMIT 1
    `);
    const registryResult = registryStmt.get();

    if (registryResult) {
      return registryResult.version;
    }

    // Fall back to old schema_migrations table for backward compatibility
    try {
      const oldStmt = this.db.prepare<[], { version: number }>(`
        SELECT version FROM schema_migrations
        ORDER BY version DESC
        LIMIT 1
      `);
      const oldResult = oldStmt.get();
      return oldResult?.version || 0;
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Check if a specific migration has been applied
   */
  isMigrationApplied(version: number): boolean {
    const stmt = this.db.prepare<[number], { count: number }>(`
      SELECT COUNT(*) as count FROM migration_registry
      WHERE version = ? AND rolled_back_at IS NULL
    `);
    const result = stmt.get(version);
    return (result?.count || 0) > 0;
  }

  /**
   * Record a migration as applied
   */
  recordMigration(
    version: number,
    name: string,
    checksum: string,
    canRollback: boolean,
    executionTimeMs: number
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO migration_registry (version, name, checksum, can_rollback, execution_time_ms)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(version, name, checksum, canRollback ? 1 : 0, executionTimeMs);

    logger.info({
      version,
      name,
      checksum,
      canRollback,
      executionTimeMs,
    }, 'Migration recorded');
  }

  /**
   * Apply a migration with tracking
   */
  applyMigration(migration: MigrationDefinition): MigrationResult {
    const startTime = Date.now();
    const checksum = this.calculateChecksum(migration.up);

    try {
      // Check if already applied
      if (this.isMigrationApplied(migration.version)) {
        logger.info({ version: migration.version, name: migration.name }, 'Migration already applied, skipping');
        return {
          success: true,
          version: migration.version,
          name: migration.name,
          executionTimeMs: 0,
        };
      }

      // Apply the migration
      this.db.exec('BEGIN TRANSACTION');

      try {
        this.db.exec(migration.up);

        const executionTimeMs = Date.now() - startTime;

        // Record in registry
        this.recordMigration(
          migration.version,
          migration.name,
          checksum,
          !!migration.down,
          executionTimeMs
        );

        // Also record in old schema_migrations for backward compatibility
        this.db.prepare(`
          INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)
        `).run(migration.version);

        this.db.exec('COMMIT');

        logger.info({
          version: migration.version,
          name: migration.name,
          executionTimeMs,
        }, 'Migration applied successfully');

        return {
          success: true,
          version: migration.version,
          name: migration.name,
          executionTimeMs,
        };
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        version: migration.version,
        name: migration.name,
        error: errorMessage,
      }, 'Migration failed');

      return {
        success: false,
        version: migration.version,
        name: migration.name,
        executionTimeMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Rollback a migration if it supports rollback
   */
  rollbackMigration(version: number, downSql: string): MigrationResult {
    const startTime = Date.now();

    // Get migration record
    const stmt = this.db.prepare<[number], MigrationRecord>(`
      SELECT * FROM migration_registry
      WHERE version = ? AND rolled_back_at IS NULL
    `);
    const migration = stmt.get(version);

    if (!migration) {
      return {
        success: false,
        version,
        name: 'unknown',
        executionTimeMs: 0,
        error: `Migration ${version} not found or already rolled back`,
      };
    }

    if (!migration.can_rollback) {
      return {
        success: false,
        version,
        name: migration.name,
        executionTimeMs: 0,
        error: `Migration ${version} does not support rollback`,
      };
    }

    try {
      this.db.exec('BEGIN TRANSACTION');

      try {
        // Execute rollback SQL
        this.db.exec(downSql);

        // Mark as rolled back
        const updateStmt = this.db.prepare(`
          UPDATE migration_registry
          SET rolled_back_at = datetime('now')
          WHERE version = ?
        `);
        updateStmt.run(version);

        // Remove from old schema_migrations
        this.db.prepare(`
          DELETE FROM schema_migrations WHERE version = ?
        `).run(version);

        this.db.exec('COMMIT');

        const executionTimeMs = Date.now() - startTime;

        logger.info({
          version,
          name: migration.name,
          executionTimeMs,
        }, 'Migration rolled back successfully');

        return {
          success: true,
          version,
          name: migration.name,
          executionTimeMs,
        };
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        version,
        name: migration.name,
        error: errorMessage,
      }, 'Rollback failed');

      return {
        success: false,
        version,
        name: migration.name,
        executionTimeMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all applied migrations
   */
  getAppliedMigrations(): MigrationRecord[] {
    const stmt = this.db.prepare<[], MigrationRecord>(`
      SELECT * FROM migration_registry
      WHERE rolled_back_at IS NULL
      ORDER BY version ASC
    `);
    return stmt.all();
  }

  /**
   * Get migration history including rolled back migrations
   */
  getMigrationHistory(): MigrationRecord[] {
    const stmt = this.db.prepare<[], MigrationRecord>(`
      SELECT * FROM migration_registry
      ORDER BY version ASC, applied_at ASC
    `);
    return stmt.all();
  }

  /**
   * Verify migration integrity by checking checksums
   * Returns list of migrations that have been modified after being applied
   */
  verifyIntegrity(migrations: Array<{ version: number; sql: string }>): number[] {
    const modifiedVersions: number[] = [];

    for (const migration of migrations) {
      const stmt = this.db.prepare<[number], { checksum: string }>(`
        SELECT checksum FROM migration_registry
        WHERE version = ? AND rolled_back_at IS NULL
      `);
      const record = stmt.get(migration.version);

      if (record) {
        const currentChecksum = this.calculateChecksum(migration.sql);
        if (record.checksum !== currentChecksum) {
          modifiedVersions.push(migration.version);
          logger.warn({
            version: migration.version,
            expected: record.checksum,
            actual: currentChecksum,
          }, 'Migration file modified after being applied');
        }
      }
    }

    return modifiedVersions;
  }

  /**
   * Get pending migrations that need to be applied
   */
  getPendingMigrations(availableMigrations: MigrationDefinition[]): MigrationDefinition[] {
    const currentVersion = this.getCurrentVersion();
    return availableMigrations.filter(m => m.version > currentVersion);
  }

  /**
   * Migrate old schema_migrations data to new registry
   * Called once to preserve existing migration history
   */
  migrateFromOldSchema(): void {
    try {
      // Check if old table exists
      const tableExists = this.db.prepare<[], { count: number }>(`
        SELECT COUNT(*) as count FROM sqlite_master
        WHERE type='table' AND name='schema_migrations'
      `).get();

      if (!tableExists || tableExists.count === 0) {
        return;
      }

      // Get all old migrations not yet in registry
      const oldMigrations = this.db.prepare<[], { version: number; applied_at: string }>(`
        SELECT version, applied_at FROM schema_migrations
        WHERE version NOT IN (SELECT version FROM migration_registry)
        ORDER BY version ASC
      `).all();

      for (const old of oldMigrations) {
        // Insert with placeholder values since we don't have the original details
        this.db.prepare(`
          INSERT OR IGNORE INTO migration_registry
          (version, name, applied_at, checksum, can_rollback, execution_time_ms)
          VALUES (?, ?, ?, ?, 0, 0)
        `).run(
          old.version,
          `migration_${String(old.version).padStart(3, '0')}`,
          old.applied_at,
          'legacy'
        );
      }

      if (oldMigrations.length > 0) {
        logger.info({ count: oldMigrations.length }, 'Migrated old schema_migrations to registry');
      }
    } catch (error) {
      // Ignore errors - old table might not exist
      logger.debug('No old schema_migrations to migrate');
    }
  }
}

/**
 * Create a migration registry instance for the given database
 */
export function createMigrationRegistry(db: Database.Database): MigrationRegistry {
  return new MigrationRegistry(db);
}
