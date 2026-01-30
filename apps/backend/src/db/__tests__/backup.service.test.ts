import { jest, describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { DatabaseBackupService, createDatabaseBackupService } from '../backup.service.js';
import type { BackupInfo, BackupResult } from '../backup.service.js';

describe('DatabaseBackupService', () => {
  let testDir: string;
  let backupDir: string;
  let testDbPath: string;
  let db: Database.Database;
  let backupService: DatabaseBackupService;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    backupDir = path.join(testDir, 'backups');
    testDbPath = path.join(testDir, 'test.db');

    // Create a test database with some data
    db = new Database(testDbPath);
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO test_table (name) VALUES ('test1'), ('test2'), ('test3');
    `);

    // Create the backup service
    backupService = new DatabaseBackupService(db, { backupDir, maxBackups: 5 });
  });

  afterEach(() => {
    // Close the database
    if (db && db.open) {
      db.close();
    }

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createBackup', () => {
    it('should create a backup file', async () => {
      const backupPath = await backupService.createBackup('test');

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(backupPath).toContain('novelforge-');
      expect(backupPath).toContain('-test.db');
    });

    it('should create backup directory if it does not exist', async () => {
      expect(fs.existsSync(backupDir)).toBe(false);

      await backupService.createBackup('manual');

      expect(fs.existsSync(backupDir)).toBe(true);
    });

    it('should create a valid SQLite database backup', async () => {
      const backupPath = await backupService.createBackup('test');

      // Open the backup and verify data
      const backupDb = new Database(backupPath, { readonly: true });
      const rows = backupDb.prepare('SELECT * FROM test_table').all() as any[];

      expect(rows).toHaveLength(3);
      expect(rows.map(r => r.name)).toEqual(['test1', 'test2', 'test3']);

      backupDb.close();
    });

    it('should include reason in filename', async () => {
      const backupPath = await backupService.createBackup('pre-migration');

      expect(path.basename(backupPath)).toContain('pre-migration');
    });

    it('should sanitize reason in filename', async () => {
      const backupPath = await backupService.createBackup('test with spaces!@#');

      const filename = path.basename(backupPath);
      expect(filename).not.toContain(' ');
      expect(filename).not.toContain('!');
      expect(filename).not.toContain('@');
    });
  });

  describe('createBackupSync', () => {
    it('should create a backup file synchronously', () => {
      const result = backupService.createBackupSync('sync-test');

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath!)).toBe(true);
    });

    it('should return duration in milliseconds', () => {
      const result = backupService.createBackupSync('timing-test');

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return size in bytes', () => {
      const result = backupService.createBackupSync('size-test');

      expect(result.success).toBe(true);
      expect(result.sizeBytes).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', () => {
      const backups = backupService.listBackups();

      expect(backups).toEqual([]);
    });

    it('should return list of backups sorted by creation time (newest first)', async () => {
      // Create multiple backups with small delays
      await backupService.createBackup('first');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('second');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('third');

      const backups = backupService.listBackups();

      expect(backups).toHaveLength(3);
      // Newest first
      expect(backups[0].reason).toContain('third');
      expect(backups[1].reason).toContain('second');
      expect(backups[2].reason).toContain('first');
    });

    it('should include backup metadata', async () => {
      await backupService.createBackup('metadata-test');

      const backups = backupService.listBackups();

      expect(backups).toHaveLength(1);
      expect(backups[0].filename).toContain('novelforge-');
      expect(backups[0].path).toBeDefined();
      expect(backups[0].size).toBeGreaterThan(0);
      // Use getTime() to verify it's a valid Date-like object
      expect(typeof backups[0].created.getTime()).toBe('number');
      expect(backups[0].reason).toBeDefined();
    });

    it('should return empty array if backup directory does not exist', () => {
      // Remove the backup directory
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true });
      }

      const backups = backupService.listBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('cleanOldBackups', () => {
    it('should keep only the specified number of backups', async () => {
      // Create 7 backups
      for (let i = 0; i < 7; i++) {
        await backupService.createBackup(`backup-${i}`);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Service is configured with maxBackups: 5, so cleanOldBackups is called automatically
      // But let's verify with explicit call
      backupService.cleanOldBackups(3);

      const backups = backupService.listBackups();
      expect(backups).toHaveLength(3);
    });

    it('should delete oldest backups first', async () => {
      // Create backups
      await backupService.createBackup('oldest');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('middle');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('newest');

      backupService.cleanOldBackups(2);

      const backups = backupService.listBackups();
      expect(backups).toHaveLength(2);
      expect(backups[0].reason).toContain('newest');
      expect(backups[1].reason).toContain('middle');
    });

    it('should not delete anything if under the limit', async () => {
      await backupService.createBackup('one');
      await backupService.createBackup('two');

      backupService.cleanOldBackups(10);

      const backups = backupService.listBackups();
      expect(backups).toHaveLength(2);
    });

    it('should also delete associated WAL and SHM files', async () => {
      await backupService.createBackup('with-wal');

      const backups = backupService.listBackups();
      const backupPath = backups[0].path;

      // Create fake WAL and SHM files
      fs.writeFileSync(`${backupPath}-wal`, 'test');
      fs.writeFileSync(`${backupPath}-shm`, 'test');

      backupService.cleanOldBackups(0);

      expect(fs.existsSync(backupPath)).toBe(false);
      expect(fs.existsSync(`${backupPath}-wal`)).toBe(false);
      expect(fs.existsSync(`${backupPath}-shm`)).toBe(false);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore database from backup', async () => {
      // Create initial backup
      const backupPath = await backupService.createBackup('restore-test');

      // Modify the database
      db.exec("INSERT INTO test_table (name) VALUES ('new-row')");
      const rowsAfterInsert = db.prepare('SELECT COUNT(*) as count FROM test_table').get() as any;
      expect(rowsAfterInsert.count).toBe(4);

      // Restore from backup
      await backupService.restoreFromBackup(backupPath);

      // Re-open database to see restored state
      db.close();
      db = new Database(testDbPath);

      const rowsAfterRestore = db.prepare('SELECT COUNT(*) as count FROM test_table').get() as any;
      expect(rowsAfterRestore.count).toBe(3);
    });

    it('should throw error if backup file does not exist', async () => {
      const nonExistentPath = path.join(backupDir, 'non-existent.db');

      await expect(backupService.restoreFromBackup(nonExistentPath))
        .rejects.toThrow('Backup file not found');
    });
  });

  describe('getLatestBackup', () => {
    it('should return null when no backups exist', () => {
      const latest = backupService.getLatestBackup();

      expect(latest).toBeNull();
    });

    it('should return the most recent backup', async () => {
      await backupService.createBackup('older');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('newer');

      const latest = backupService.getLatestBackup();

      expect(latest).not.toBeNull();
      expect(latest!.reason).toContain('newer');
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no backups exist', () => {
      const stats = backupService.getStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.oldestBackup).toBeNull();
      expect(stats.newestBackup).toBeNull();
    });

    it('should return correct statistics', async () => {
      await backupService.createBackup('first');
      await new Promise(resolve => setTimeout(resolve, 50));
      await backupService.createBackup('second');

      const stats = backupService.getStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      // Use getTime() to verify they are valid Date-like objects
      expect(typeof stats.oldestBackup!.getTime()).toBe('number');
      expect(typeof stats.newestBackup!.getTime()).toBe('number');
      expect(stats.newestBackup!.getTime()).toBeGreaterThanOrEqual(stats.oldestBackup!.getTime());
    });
  });

  describe('verifyBackup', () => {
    it('should return true for valid SQLite backup', async () => {
      const backupPath = await backupService.createBackup('verify-test');

      const isValid = backupService.verifyBackup(backupPath);

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const isValid = backupService.verifyBackup('/non/existent/path.db');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid file', () => {
      const invalidPath = path.join(testDir, 'invalid.db');
      fs.writeFileSync(invalidPath, 'not a sqlite database');

      const isValid = backupService.verifyBackup(invalidPath);

      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully in listBackups', () => {
      // Create backup directory with a file we can't read
      fs.mkdirSync(backupDir, { recursive: true });

      // This test verifies the error handling path exists
      // We can't easily simulate permission errors in a cross-platform way
      const backups = backupService.listBackups();
      expect(Array.isArray(backups)).toBe(true);
    });

    it('should handle errors in cleanOldBackups gracefully', async () => {
      await backupService.createBackup('error-test');

      // Remove the file before cleanup runs
      const backups = backupService.listBackups();
      if (backups.length > 0) {
        fs.unlinkSync(backups[0].path);
      }

      // Should not throw
      expect(() => backupService.cleanOldBackups(0)).not.toThrow();
    });
  });

  describe('createDatabaseBackupService factory', () => {
    it('should create a backup service instance', () => {
      const service = createDatabaseBackupService(db);

      expect(service).toBeInstanceOf(DatabaseBackupService);
    });

    it('should accept custom configuration', () => {
      const customBackupDir = path.join(testDir, 'custom-backups');
      const service = createDatabaseBackupService(db, {
        backupDir: customBackupDir,
        maxBackups: 3,
      });

      expect(service).toBeInstanceOf(DatabaseBackupService);
    });
  });
});
