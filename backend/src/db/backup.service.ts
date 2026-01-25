/**
 * Database Backup Service
 *
 * Provides SQLite-specific backup functionality using better-sqlite3's native backup API.
 * This service is located in the db folder as it's tightly coupled to database operations.
 *
 * Features:
 * - Native SQLite backup (safe for concurrent reads)
 * - Timestamped backup files with reason tracking
 * - Automatic cleanup of old backups
 * - Restore from backup support
 *
 * @module db/backup.service
 */

import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createLogger } from '../services/logger.service.js';

const logger = createLogger('db:backup');

/**
 * Information about a backup file
 */
export interface BackupInfo {
  /** Backup filename */
  filename: string;
  /** Full path to backup file */
  path: string;
  /** Size of backup in bytes */
  size: number;
  /** When the backup was created */
  created: Date;
  /** Reason for the backup (e.g., 'pre-migration', 'manual', 'scheduled') */
  reason?: string;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  /** Whether the backup succeeded */
  success: boolean;
  /** Path to the backup file (if successful) */
  backupPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Duration of backup operation in milliseconds */
  durationMs?: number;
  /** Size of backup in bytes (if successful) */
  sizeBytes?: number;
}

/**
 * Configuration options for the backup service
 */
export interface DatabaseBackupConfig {
  /** Directory to store backups */
  backupDir?: string;
  /** Maximum number of backups to retain (default: 10) */
  maxBackups?: number;
}

/**
 * Database Backup Service
 *
 * Manages SQLite database backups with native better-sqlite3 backup support.
 * Uses the backup() method which is safe for concurrent access and ensures
 * a consistent snapshot of the database.
 *
 * Design Decisions:
 * - Uses better-sqlite3's native backup API for consistency guarantees
 * - Stores backups in a configurable directory with timestamped names
 * - Implements retention policy to prevent disk space exhaustion
 * - Supports both synchronous (for migrations) and async operations
 */
export class DatabaseBackupService {
  private backupDir: string;
  private db: Database.Database;
  private maxBackups: number;

  /**
   * Create a new DatabaseBackupService
   *
   * @param db - The better-sqlite3 database instance
   * @param config - Optional configuration
   */
  constructor(db: Database.Database, config: DatabaseBackupConfig = {}) {
    this.db = db;
    this.backupDir = config.backupDir || path.join(process.cwd(), 'data', 'backups');
    this.maxBackups = config.maxBackups ?? 10;
  }

  /**
   * Ensure the backup directory exists
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info({ backupDir: this.backupDir }, 'Created backup directory');
    }
  }

  /**
   * Generate a timestamped backup filename
   *
   * @param reason - Reason for the backup
   * @returns Filename in format: novelforge-YYYY-MM-DD_HH-MM-SS-reason.db
   */
  private generateFilename(reason: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const sanitizedReason = reason.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `novelforge-${timestamp}-${sanitizedReason}.db`;
  }

  /**
   * Create a backup of the database using better-sqlite3's native backup API
   *
   * This method uses SQLite's online backup API which:
   * - Creates a consistent snapshot of the database
   * - Is safe to use while other connections are reading/writing
   * - Handles WAL mode correctly
   *
   * @param reason - Reason for the backup (e.g., 'pre-migration', 'manual')
   * @returns Promise resolving to backup path
   */
  async createBackup(reason: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.ensureBackupDir();

      const filename = this.generateFilename(reason);
      const backupPath = path.join(this.backupDir, filename);

      // Use better-sqlite3's native backup API
      // This creates a consistent snapshot even with concurrent access
      await this.db.backup(backupPath);

      const stats = fs.statSync(backupPath);
      const durationMs = Date.now() - startTime;

      logger.info({
        backupPath,
        reason,
        sizeBytes: stats.size,
        durationMs,
      }, 'Database backup created successfully');

      // Apply retention policy after successful backup
      this.cleanOldBackups(this.maxBackups);

      return backupPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, reason }, 'Failed to create backup');
      throw new Error(`Backup failed: ${errorMessage}`);
    }
  }

  /**
   * Create a backup synchronously (for use during migrations)
   *
   * Note: This uses file copy instead of the async backup API,
   * which may not be as safe during concurrent writes.
   * Prefer createBackup() when possible.
   *
   * @param reason - Reason for the backup
   * @returns BackupResult with success status and path
   */
  createBackupSync(reason: string): BackupResult {
    const startTime = Date.now();

    try {
      this.ensureBackupDir();

      const filename = this.generateFilename(reason);
      const backupPath = path.join(this.backupDir, filename);

      // Get the database path from the db instance
      const dbPath = (this.db as any).name;

      if (!dbPath || !fs.existsSync(dbPath)) {
        return {
          success: false,
          error: 'Cannot determine database path for backup',
        };
      }

      // Copy the main database file
      fs.copyFileSync(dbPath, backupPath);

      // Also copy WAL file if it exists (for WAL mode)
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${backupPath}-wal`);
      }

      // Also copy SHM file if it exists
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, `${backupPath}-shm`);
      }

      const stats = fs.statSync(backupPath);
      const durationMs = Date.now() - startTime;

      logger.info({
        backupPath,
        reason,
        sizeBytes: stats.size,
        durationMs,
      }, 'Database backup created (sync)');

      // Apply retention policy
      this.cleanOldBackups(this.maxBackups);

      return {
        success: true,
        backupPath,
        durationMs,
        sizeBytes: stats.size,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, reason }, 'Sync backup failed');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Restore database from a backup file
   *
   * WARNING: This will overwrite the current database!
   * Creates a backup of the current state before restoring.
   *
   * @param backupPath - Path to the backup file to restore
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    // Verify backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Get the current database path
    const dbPath = (this.db as any).name;

    if (!dbPath) {
      throw new Error('Cannot determine current database path');
    }

    // Create a pre-restore backup of current state
    try {
      await this.createBackup('pre-restore');
    } catch (error) {
      logger.warn({ error }, 'Could not create pre-restore backup, proceeding anyway');
    }

    // Close current database connections by checkpointing WAL
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (error) {
      // Ignore checkpoint errors
    }

    // Copy backup to database location
    fs.copyFileSync(backupPath, dbPath);

    // Restore WAL and SHM if they exist
    const walBackup = `${backupPath}-wal`;
    const shmBackup = `${backupPath}-shm`;

    if (fs.existsSync(walBackup)) {
      fs.copyFileSync(walBackup, `${dbPath}-wal`);
    } else {
      // Remove stale WAL/SHM files
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    }

    if (fs.existsSync(shmBackup)) {
      fs.copyFileSync(shmBackup, `${dbPath}-shm`);
    }

    logger.info({ backupPath, dbPath }, 'Database restored from backup');
  }

  /**
   * List all available backups sorted by creation time (newest first)
   *
   * @returns Array of BackupInfo objects
   */
  listBackups(): BackupInfo[] {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db') && f.startsWith('novelforge-'));

      const backups: BackupInfo[] = files.map(filename => {
        const filePath = path.join(this.backupDir, filename);
        const stats = fs.statSync(filePath);

        // Extract reason from filename: novelforge-YYYY-MM-DD_HH-MM-SS-reason.db
        const match = filename.match(/novelforge-[\d-]+_[\d-]+-(.+)\.db$/);
        const reason = match ? match[1].replace(/-/g, ' ') : undefined;

        return {
          filename,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          reason,
        };
      });

      // Sort by creation time, newest first
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to list backups');
      return [];
    }
  }

  /**
   * Remove old backups keeping only the most recent N
   *
   * @param keepCount - Number of backups to keep (default: 10)
   */
  cleanOldBackups(keepCount: number = 10): void {
    const backups = this.listBackups();

    if (backups.length <= keepCount) {
      return;
    }

    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path);

        // Also delete associated WAL and SHM files
        const walPath = `${backup.path}-wal`;
        const shmPath = `${backup.path}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        logger.info({ filename: backup.filename }, 'Deleted old backup');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: errorMessage, path: backup.path }, 'Failed to delete backup');
      }
    }

    logger.info({
      deleted: toDelete.length,
      remaining: keepCount,
    }, 'Old backups cleaned up');
  }

  /**
   * Get the most recent backup
   *
   * @returns BackupInfo of the most recent backup, or null if none exist
   */
  getLatestBackup(): BackupInfo | null {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Get backup statistics
   *
   * @returns Statistics about stored backups
   */
  getStats(): {
    count: number;
    totalSizeBytes: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  } {
    const backups = this.listBackups();

    return {
      count: backups.length,
      totalSizeBytes: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
    };
  }

  /**
   * Verify a backup file is a valid SQLite database
   *
   * @param backupPath - Path to the backup file
   * @returns true if valid, false otherwise
   */
  verifyBackup(backupPath: string): boolean {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    try {
      // Read first 16 bytes and check SQLite header
      const fd = fs.openSync(backupPath, 'r');
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      // SQLite database files start with "SQLite format 3\0"
      const header = buffer.toString('utf8', 0, 16);
      return header.startsWith('SQLite format 3');
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create a DatabaseBackupService instance for the given database
 *
 * @param db - better-sqlite3 database instance
 * @param config - Optional configuration
 * @returns DatabaseBackupService instance
 */
export function createDatabaseBackupService(
  db: Database.Database,
  config?: DatabaseBackupConfig
): DatabaseBackupService {
  return new DatabaseBackupService(db, config);
}
