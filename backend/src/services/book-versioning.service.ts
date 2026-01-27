/**
 * Book Versioning Service
 *
 * Manages chapter versions for books. When a user modifies the plot and
 * regenerates chapters, a new version is created to preserve the previous content.
 *
 * Key concepts:
 * - Each book can have multiple versions
 * - Only one version is "active" at a time
 * - Chapters and chapter_edits reference their version
 * - Versions store snapshots of plot and outline at creation time
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('BookVersioningService');

export interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  plot_snapshot: string | null;  // JSON string
  outline_snapshot: string | null;  // JSON string
  is_active: number;
  word_count: number;
  chapter_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface CreateVersionOptions {
  name?: string;
  autoCreated?: boolean;
}

export interface VersionWithChapterCount extends BookVersion {
  actual_chapter_count: number;
  actual_word_count: number;
}

export class BookVersioningService {
  /**
   * Create a new version for a book
   * This snapshots the current plot and outline, and makes the new version active
   */
  async createVersion(bookId: string, options: CreateVersionOptions = {}): Promise<BookVersion> {
    logger.info(`Creating new version for book ${bookId}`, { options });

    const transaction = db.transaction(() => {
      // 1. Get book and project info
      const book = db.prepare(`
        SELECT b.*, p.plot_structure
        FROM books b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = ?
      `).get(bookId) as any;

      if (!book) {
        throw new Error(`Book not found: ${bookId}`);
      }

      // 2. Get current outline for this book
      const outline = db.prepare(`
        SELECT * FROM outlines WHERE book_id = ?
      `).get(bookId) as any;

      // 3. Get the highest version number for this book
      const maxVersion = db.prepare(`
        SELECT MAX(version_number) as max_num FROM book_versions WHERE book_id = ?
      `).get(bookId) as { max_num: number | null };

      const newVersionNumber = (maxVersion?.max_num || 0) + 1;

      // 4. Generate version name
      const versionName = options.name ||
        (options.autoCreated ? `Version ${newVersionNumber} (Auto)` : `Version ${newVersionNumber}`);

      // 5. Deactivate all existing versions for this book
      db.prepare(`
        UPDATE book_versions SET is_active = 0 WHERE book_id = ?
      `).run(bookId);

      // 6. Create the new version
      const versionId = uuidv4();
      db.prepare(`
        INSERT INTO book_versions (
          id,
          book_id,
          version_number,
          version_name,
          plot_snapshot,
          outline_snapshot,
          is_active,
          word_count,
          chapter_count,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, datetime('now'))
      `).run(
        versionId,
        bookId,
        newVersionNumber,
        versionName,
        book.plot_structure || null,
        outline ? JSON.stringify(outline.structure) : null
      );

      // 7. Return the created version
      const version = db.prepare(`
        SELECT * FROM book_versions WHERE id = ?
      `).get(versionId) as BookVersion;

      return version;
    });

    try {
      const version = transaction();
      logger.info(`Created version ${version.version_number} for book ${bookId}`);
      return version;
    } catch (error: any) {
      logger.error(`Failed to create version for book ${bookId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get all versions for a book
   */
  async getVersions(bookId: string): Promise<VersionWithChapterCount[]> {
    const versions = db.prepare(`
      SELECT
        bv.*,
        (SELECT COUNT(*) FROM chapters WHERE version_id = bv.id) as actual_chapter_count,
        (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE version_id = bv.id) as actual_word_count
      FROM book_versions bv
      WHERE bv.book_id = ?
      ORDER BY bv.version_number DESC
    `).all(bookId) as VersionWithChapterCount[];

    return versions;
  }

  /**
   * Get the active version for a book
   */
  async getActiveVersion(bookId: string): Promise<BookVersion | null> {
    const version = db.prepare(`
      SELECT * FROM book_versions WHERE book_id = ? AND is_active = 1
    `).get(bookId) as BookVersion | undefined;

    return version || null;
  }

  /**
   * Switch to a different version (make it active)
   */
  async activateVersion(bookId: string, versionId: string): Promise<void> {
    logger.info(`Activating version ${versionId} for book ${bookId}`);

    const transaction = db.transaction(() => {
      // Verify the version belongs to this book
      const version = db.prepare(`
        SELECT * FROM book_versions WHERE id = ? AND book_id = ?
      `).get(versionId, bookId);

      if (!version) {
        throw new Error(`Version ${versionId} not found for book ${bookId}`);
      }

      // Deactivate all versions for this book
      db.prepare(`
        UPDATE book_versions SET is_active = 0 WHERE book_id = ?
      `).run(bookId);

      // Activate the specified version
      db.prepare(`
        UPDATE book_versions SET is_active = 1 WHERE id = ?
      `).run(versionId);
    });

    transaction();
    logger.info(`Activated version ${versionId}`);
  }

  /**
   * Delete a version and its chapters
   * Cannot delete the only version or the active version (unless forced)
   */
  async deleteVersion(bookId: string, versionId: string, force: boolean = false): Promise<void> {
    logger.info(`Deleting version ${versionId} for book ${bookId}`, { force });

    const transaction = db.transaction(() => {
      // Get version info
      const version = db.prepare(`
        SELECT * FROM book_versions WHERE id = ? AND book_id = ?
      `).get(versionId, bookId) as BookVersion | undefined;

      if (!version) {
        throw new Error(`Version ${versionId} not found for book ${bookId}`);
      }

      // Check if this is the only version
      const versionCount = db.prepare(`
        SELECT COUNT(*) as count FROM book_versions WHERE book_id = ?
      `).get(bookId) as { count: number };

      if (versionCount.count === 1) {
        throw new Error('Cannot delete the only version of a book');
      }

      // Check if this is the active version
      if (version.is_active && !force) {
        throw new Error('Cannot delete the active version. Switch to another version first, or use force=true');
      }

      // If deleting active version with force, activate the most recent other version
      if (version.is_active && force) {
        const otherVersion = db.prepare(`
          SELECT id FROM book_versions
          WHERE book_id = ? AND id != ?
          ORDER BY version_number DESC
          LIMIT 1
        `).get(bookId, versionId) as { id: string };

        if (otherVersion) {
          db.prepare(`
            UPDATE book_versions SET is_active = 1 WHERE id = ?
          `).run(otherVersion.id);
        }
      }

      // Delete chapter edits for this version's chapters
      db.prepare(`
        DELETE FROM chapter_edits WHERE version_id = ?
      `).run(versionId);

      // Delete chapters for this version
      db.prepare(`
        DELETE FROM chapters WHERE version_id = ?
      `).run(versionId);

      // Delete the version
      db.prepare(`
        DELETE FROM book_versions WHERE id = ?
      `).run(versionId);
    });

    transaction();
    logger.info(`Deleted version ${versionId}`);
  }

  /**
   * Check if versioning is needed before generation
   * Returns true if the book has existing chapters with content
   */
  async requiresVersioning(bookId: string): Promise<{
    required: boolean;
    existingChapterCount: number;
    existingWordCount: number;
    activeVersion: BookVersion | null;
  }> {
    // Get active version
    const activeVersion = await this.getActiveVersion(bookId);

    // Count chapters with content
    let existingChapterCount = 0;
    let existingWordCount = 0;

    if (activeVersion) {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as chapter_count,
          COALESCE(SUM(word_count), 0) as word_count
        FROM chapters
        WHERE version_id = ? AND content IS NOT NULL AND content != ''
      `).get(activeVersion.id) as { chapter_count: number; word_count: number };

      existingChapterCount = stats.chapter_count;
      existingWordCount = stats.word_count;
    } else {
      // No version yet - check for legacy chapters without version_id
      const stats = db.prepare(`
        SELECT
          COUNT(*) as chapter_count,
          COALESCE(SUM(word_count), 0) as word_count
        FROM chapters
        WHERE book_id = ? AND content IS NOT NULL AND content != ''
      `).get(bookId) as { chapter_count: number; word_count: number };

      existingChapterCount = stats.chapter_count;
      existingWordCount = stats.word_count;
    }

    return {
      required: existingChapterCount > 0,
      existingChapterCount,
      existingWordCount,
      activeVersion,
    };
  }

  /**
   * Update version statistics (word count, chapter count)
   */
  async updateVersionStats(versionId: string): Promise<void> {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as chapter_count,
        COALESCE(SUM(word_count), 0) as word_count
      FROM chapters
      WHERE version_id = ?
    `).get(versionId) as { chapter_count: number; word_count: number };

    db.prepare(`
      UPDATE book_versions
      SET chapter_count = ?, word_count = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(stats.chapter_count, stats.word_count, versionId);
  }

  /**
   * Get chapters for a specific version
   */
  async getChaptersForVersion(versionId: string): Promise<any[]> {
    const chapters = db.prepare(`
      SELECT * FROM chapters WHERE version_id = ? ORDER BY chapter_number
    `).all(versionId);

    return chapters;
  }

  /**
   * Migrate existing chapters to a version (for legacy data)
   * Creates version 1 and assigns all existing chapters to it
   */
  async migrateExistingChapters(bookId: string): Promise<BookVersion | null> {
    logger.info(`Checking for legacy chapters to migrate for book ${bookId}`);

    // Check if there are chapters without a version_id
    const legacyChapters = db.prepare(`
      SELECT COUNT(*) as count FROM chapters
      WHERE book_id = ? AND version_id IS NULL
    `).get(bookId) as { count: number };

    if (legacyChapters.count === 0) {
      return null;
    }

    logger.info(`Found ${legacyChapters.count} legacy chapters to migrate`);

    const transaction = db.transaction(() => {
      // Create version 1
      const versionId = uuidv4();
      const book = db.prepare(`
        SELECT b.*, p.plot_structure
        FROM books b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = ?
      `).get(bookId) as any;

      const outline = db.prepare(`
        SELECT * FROM outlines WHERE book_id = ?
      `).get(bookId) as any;

      db.prepare(`
        INSERT INTO book_versions (
          id,
          book_id,
          version_number,
          version_name,
          plot_snapshot,
          outline_snapshot,
          is_active,
          word_count,
          chapter_count,
          created_at
        ) VALUES (?, ?, 1, 'Original', ?, ?, 1, 0, 0, datetime('now'))
      `).run(
        versionId,
        bookId,
        book?.plot_structure || null,
        outline ? JSON.stringify(outline.structure) : null
      );

      // Update chapters to reference this version
      db.prepare(`
        UPDATE chapters SET version_id = ? WHERE book_id = ? AND version_id IS NULL
      `).run(versionId, bookId);

      // Update chapter_edits
      db.prepare(`
        UPDATE chapter_edits SET version_id = ?
        WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)
        AND version_id IS NULL
      `).run(versionId, bookId);

      // Update version stats
      const stats = db.prepare(`
        SELECT
          COUNT(*) as chapter_count,
          COALESCE(SUM(word_count), 0) as word_count
        FROM chapters
        WHERE version_id = ?
      `).get(versionId) as { chapter_count: number; word_count: number };

      db.prepare(`
        UPDATE book_versions
        SET chapter_count = ?, word_count = ?
        WHERE id = ?
      `).run(stats.chapter_count, stats.word_count, versionId);

      return db.prepare(`SELECT * FROM book_versions WHERE id = ?`).get(versionId) as BookVersion;
    });

    const version = transaction();
    logger.info(`Migrated legacy chapters to version ${version.id}`);
    return version;
  }
}

export const bookVersioningService = new BookVersioningService();
