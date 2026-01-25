/**
 * Database Backup Service
 *
 * Provides automated backup functionality for the SQLite database:
 * - Creates timestamped backups before migrations
 * - Maintains retention policy (keeps last N backups)
 * - Supports backup verification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:backup');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration for backup service
 */
export interface BackupConfig {
  /** Directory to store backups */
  backupDir: string;
  /** Maximum number of backups to retain */
  maxBackups: number;
  /** Whether to compress backups (future feature) */
  compress: boolean;
}

/**
 * Backup metadata
 */
export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: Date;
  sizeBytes: number;
  reason: string;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: BackupConfig = {
  backupDir: path.join(__dirname, '../../../backups'),
  maxBackups: 10,
  compress: false,
};

/**
 * Database Backup Service
 *
 * Handles creation, retention, and management of database backups.
 * Follows the Single Responsibility Principle - focused solely on backup operations.
 */
export class BackupService {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureBackupDirectory();
  }

  /**
   * Ensure the backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      logger.info({ dir: this.config.backupDir }, 'Created backup directory');
    }
  }

  /**
   * Generate a timestamped backup filename
   */
  private generateBackupFilename(reason: string): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const sanitizedReason = reason.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `novelforge_${timestamp}_${sanitizedReason}.db`;
  }

  /**
   * Create a backup of the database
   *
   * @param databasePath - Path to the source database file
   * @param reason - Reason for the backup (e.g., 'pre-migration', 'manual')
   * @returns BackupResult with success status and backup path
   */
  async createBackup(databasePath: string, reason: string = 'manual'): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Verify source database exists
      if (!fs.existsSync(databasePath)) {
        return {
          success: false,
          error: `Source database not found: ${databasePath}`,
        };
      }

      const filename = this.generateBackupFilename(reason);
      const backupPath = path.join(this.config.backupDir, filename);

      // Copy the database file
      // Using synchronous copy for simplicity and to ensure consistency
      fs.copyFileSync(databasePath, backupPath);

      // Also backup WAL file if it exists (for WAL mode databases)
      const walPath = `${databasePath}-wal`;
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${backupPath}-wal`);
      }

      // Also backup SHM file if it exists
      const shmPath = `${databasePath}-shm`;
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, `${backupPath}-shm`);
      }

      const duration = Date.now() - startTime;
      const stats = fs.statSync(backupPath);

      logger.info({
        backupPath,
        reason,
        sizeBytes: stats.size,
        durationMs: duration,
      }, 'Database backup created');

      // Apply retention policy
      await this.applyRetentionPolicy();

      return {
        success: true,
        backupPath,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, databasePath, reason }, 'Backup failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Apply retention policy by removing old backups
   * Keeps only the most recent N backups as configured
   */
  async applyRetentionPolicy(): Promise<void> {
    try {
      const backups = await this.listBackups();

      if (backups.length <= this.config.maxBackups) {
        return;
      }

      // Sort by creation time, newest first
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Remove backups beyond the retention limit
      const backupsToRemove = backups.slice(this.config.maxBackups);

      for (const backup of backupsToRemove) {
        fs.unlinkSync(backup.path);

        // Also remove associated WAL and SHM files
        const walPath = `${backup.path}-wal`;
        const shmPath = `${backup.path}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        logger.info({ filename: backup.filename }, 'Removed old backup');
      }

      logger.info({
        removed: backupsToRemove.length,
        remaining: this.config.maxBackups,
      }, 'Retention policy applied');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to apply retention policy');
    }
  }

  /**
   * List all available backups
   * @returns Array of BackupInfo sorted by creation time (newest first)
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    try {
      const files = fs.readdirSync(this.config.backupDir);

      for (const file of files) {
        // Only include .db files, skip WAL and SHM files
        if (!file.endsWith('.db')) continue;

        const filePath = path.join(this.config.backupDir, file);
        const stats = fs.statSync(filePath);

        // Extract reason from filename
        const match = file.match(/novelforge_[\d-]+_[\d-]+_(.+)\.db$/);
        const reason = match ? match[1].replace(/-/g, ' ') : 'unknown';

        backups.push({
          filename: file,
          path: filePath,
          createdAt: stats.birthtime,
          sizeBytes: stats.size,
          reason,
        });
      }

      // Sort by creation time, newest first
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return backups;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Failed to list backups');
      return [];
    }
  }

  /**
   * Restore database from a backup
   *
   * @param backupPath - Path to the backup file
   * @param targetPath - Path where to restore the database
   * @returns BackupResult with success status
   */
  async restoreBackup(backupPath: string, targetPath: string): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: `Backup not found: ${backupPath}`,
        };
      }

      // Create a backup of current database before restoring
      if (fs.existsSync(targetPath)) {
        const preRestoreBackup = await this.createBackup(targetPath, 'pre-restore');
        if (!preRestoreBackup.success) {
          logger.warn({ error: preRestoreBackup.error }, 'Could not backup current database before restore');
        }
      }

      // Restore the backup
      fs.copyFileSync(backupPath, targetPath);

      // Restore WAL and SHM files if they exist
      const walPath = `${backupPath}-wal`;
      const shmPath = `${backupPath}-shm`;
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${targetPath}-wal`);
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, `${targetPath}-shm`);
      }

      const duration = Date.now() - startTime;

      logger.info({
        backupPath,
        targetPath,
        durationMs: duration,
      }, 'Database restored from backup');

      return {
        success: true,
        backupPath,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, backupPath, targetPath }, 'Restore failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get the most recent backup
   * @returns Most recent BackupInfo or null if no backups exist
   */
  async getLatestBackup(): Promise<BackupInfo | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Calculate total size of all backups
   * @returns Total size in bytes
   */
  async getTotalBackupSize(): Promise<number> {
    const backups = await this.listBackups();
    return backups.reduce((total, backup) => total + backup.sizeBytes, 0);
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    count: number;
    totalSizeBytes: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  }> {
    const backups = await this.listBackups();

    return {
      count: backups.length,
      totalSizeBytes: backups.reduce((total, b) => total + b.sizeBytes, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
      newestBackup: backups.length > 0 ? backups[0].createdAt : null,
    };
  }
}

// Export singleton instance with default config
export const backupService = new BackupService();
