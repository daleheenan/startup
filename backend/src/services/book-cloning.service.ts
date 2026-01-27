/**
 * Book Cloning Service
 *
 * Enables users to clone a book within a project, preserving:
 * - Story concept (logline, synopsis, hook)
 * - Characters (from story_bible)
 * - World elements (from story_bible)
 * - Story DNA (genre, tone, themes, prose style)
 *
 * But starting fresh with:
 * - Plot structure
 * - Outline
 * - Chapters
 * - Chapter edits
 * - Metrics
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('BookCloningService');

export interface BookClone {
  id: string;
  source_book_id: string;
  cloned_book_id: string;
  clone_number: number;
  clone_reason: string | null;
  created_at: string;
}

export interface ClonedBook {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: string;
  is_clone: number;
  clone_source_id: string;
}

export interface CloneBookResult {
  success: boolean;
  clonedBook: ClonedBook;
  cloneRecord: BookClone;
}

export interface CloneBookOptions {
  title?: string;
  reason?: string;
}

export class BookCloningService {
  /**
   * Clone a book within its project
   * Creates a new book with the same foundational elements but fresh execution state
   */
  async cloneBook(bookId: string, options: CloneBookOptions = {}): Promise<CloneBookResult> {
    logger.info({ bookId, options }, `Cloning book ${bookId}`);

    // Start a transaction
    const transaction = db.transaction(() => {
      // 1. Get source book and project
      const sourceBook = db.prepare(`
        SELECT b.*, p.story_dna, p.story_bible, p.story_concept
        FROM books b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = ?
      `).get(bookId) as any;

      if (!sourceBook) {
        throw new Error(`Book not found: ${bookId}`);
      }

      // 2. Get the highest book number for this project
      const maxBookNumber = db.prepare(`
        SELECT MAX(book_number) as max_num
        FROM books
        WHERE project_id = ?
      `).get(sourceBook.project_id) as { max_num: number };

      const newBookNumber = (maxBookNumber?.max_num || 0) + 1;

      // 3. Count existing clones from this source
      const cloneCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM book_clones
        WHERE source_book_id = ?
      `).get(bookId) as { count: number };

      const cloneNumber = (cloneCount?.count || 0) + 1;

      // 4. Generate IDs
      const newBookId = uuidv4();
      const cloneRecordId = uuidv4();

      // 5. Create title for the clone
      const cloneTitle = options.title || `${sourceBook.title} (Clone ${cloneNumber})`;

      // 6. Create the new book
      db.prepare(`
        INSERT INTO books (
          id,
          project_id,
          book_number,
          title,
          status,
          word_count,
          is_clone,
          clone_source_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'setup', 0, 1, ?, datetime('now'), datetime('now'))
      `).run(
        newBookId,
        sourceBook.project_id,
        newBookNumber,
        cloneTitle,
        bookId
      );

      // 7. Create the clone record
      db.prepare(`
        INSERT INTO book_clones (
          id,
          source_book_id,
          cloned_book_id,
          clone_number,
          clone_reason,
          created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        cloneRecordId,
        bookId,
        newBookId,
        cloneNumber,
        options.reason || null
      );

      // 8. Update project book_count
      db.prepare(`
        UPDATE projects
        SET book_count = book_count + 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(sourceBook.project_id);

      // 9. Get the created records
      const clonedBook = db.prepare(`
        SELECT * FROM books WHERE id = ?
      `).get(newBookId) as ClonedBook;

      const cloneRecord = db.prepare(`
        SELECT * FROM book_clones WHERE id = ?
      `).get(cloneRecordId) as BookClone;

      return { clonedBook, cloneRecord };
    });

    try {
      const result = transaction();
      logger.info(`Successfully cloned book ${bookId} to ${result.clonedBook.id}`);

      return {
        success: true,
        clonedBook: result.clonedBook,
        cloneRecord: result.cloneRecord,
      };
    } catch (error: any) {
      logger.error({ bookId, error: error.message }, `Failed to clone book ${bookId}`);
      throw error;
    }
  }

  /**
   * Get clone history for a book (both as source and as clone)
   */
  async getCloneHistory(bookId: string): Promise<{
    clonedFrom: BookClone | null;
    clones: BookClone[];
  }> {
    // Check if this book was cloned from another
    const clonedFrom = db.prepare(`
      SELECT bc.*, b.title as source_title
      FROM book_clones bc
      JOIN books b ON bc.source_book_id = b.id
      WHERE bc.cloned_book_id = ?
    `).get(bookId) as (BookClone & { source_title: string }) | undefined;

    // Get all clones made from this book
    const clones = db.prepare(`
      SELECT bc.*, b.title as clone_title
      FROM book_clones bc
      JOIN books b ON bc.cloned_book_id = b.id
      WHERE bc.source_book_id = ?
      ORDER BY bc.clone_number
    `).all(bookId) as (BookClone & { clone_title: string })[];

    return {
      clonedFrom: clonedFrom || null,
      clones,
    };
  }

  /**
   * Get all books in a project with their clone status
   */
  async getBooksWithCloneInfo(projectId: string): Promise<any[]> {
    const books = db.prepare(`
      SELECT
        b.*,
        bc_source.clone_number,
        source_book.title as source_title
      FROM books b
      LEFT JOIN book_clones bc_source ON b.id = bc_source.cloned_book_id
      LEFT JOIN books source_book ON bc_source.source_book_id = source_book.id
      WHERE b.project_id = ?
      ORDER BY b.book_number
    `).all(projectId);

    // Get clone counts for each book
    const booksWithCloneCounts = books.map((book: any) => {
      const cloneCount = db.prepare(`
        SELECT COUNT(*) as count FROM book_clones WHERE source_book_id = ?
      `).get(book.id) as { count: number };

      return {
        ...book,
        clone_count: cloneCount?.count || 0,
      };
    });

    return booksWithCloneCounts;
  }

  /**
   * Check if a book can be cloned
   */
  canClone(book: any): { canClone: boolean; reason?: string } {
    // Books can always be cloned - no restrictions currently
    // Future: Could add limits on number of clones, etc.
    return { canClone: true };
  }
}

export const bookCloningService = new BookCloningService();
