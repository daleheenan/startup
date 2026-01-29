import db from '../db/connection.js';
import type {
  Project,
  Book,
  Chapter,
  SeriesBible,
  SeriesCharacterEntry,
  SeriesWorldEntry,
  SeriesTimelineEntry,
  SeriesMystery,
  StoryBible,
  BookEndingState,
} from '../shared/types/index.js';
import { createLogger } from './logger.service.js';
import { bookVersioningService } from './book-versioning.service.js';

const logger = createLogger('services:series-bible-generator');

/**
 * SeriesBibleGeneratorService creates aggregated trilogy data
 * across all books in a multi-book project
 */
export class SeriesBibleGeneratorService {
  /**
   * Generate complete series bible aggregating data from all books
   */
  async generateSeriesBible(projectId: string): Promise<SeriesBible> {
    logger.info(`[SeriesBible] Generating series bible for project ${projectId}`);

    // Get all books in the project
    const booksStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE project_id = ? ORDER BY book_number ASC
    `);
    const books = booksStmt.all(projectId);

    if (books.length === 0) {
      throw new Error(`No books found for project ${projectId}`);
    }

    // Get project story bible (base data)
    const projectStmt = db.prepare<[string], Project>(`
      SELECT story_bible, story_dna FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project?.story_bible) {
      throw new Error(`Story bible not found for project ${projectId}`);
    }

    const baseStoryBible: StoryBible = JSON.parse(project.story_bible as any);

    // Aggregate character data across books
    const characters = this.aggregateCharacters(books, baseStoryBible);

    // Aggregate world data across books
    const world = this.aggregateWorldElements(books, baseStoryBible);

    // Aggregate timeline across books
    const timeline = await this.aggregateTimeline(books);

    // Extract themes from story DNA
    const storyDNA = project.story_dna ? JSON.parse(project.story_dna as any) : null;
    const themes = storyDNA?.themes || [];

    // Track mysteries and their resolution
    const mysteries = this.trackMysteries(books);

    const seriesBible: SeriesBible = {
      characters,
      world,
      timeline,
      themes,
      mysteries,
    };

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE projects
      SET series_bible = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(seriesBible),
      new Date().toISOString(),
      projectId
    );

    logger.info(`[SeriesBible] Series bible generated and saved`);

    return seriesBible;
  }

  /**
   * Aggregate character information across all books
   */
  private aggregateCharacters(books: Book[], baseStoryBible: StoryBible): SeriesCharacterEntry[] {
    const characterMap = new Map<string, SeriesCharacterEntry>();

    // Initialize from base story bible
    baseStoryBible.characters.forEach(char => {
      characterMap.set(char.id, {
        characterId: char.id,
        name: char.name,
        role: char.role,
        firstAppearance: { bookNumber: 1, chapterNumber: 1 },
        lastAppearance: { bookNumber: 1, chapterNumber: 1 },
        status: 'unknown',
        development: [],
      });
    });

    // Track development across books
    books.forEach(book => {
      if (book.ending_state) {
        const endingState: BookEndingState = JSON.parse(book.ending_state as any);

        endingState.characters.forEach(charState => {
          const entry = characterMap.get(charState.characterId);

          if (entry) {
            // Update last appearance
            entry.lastAppearance.bookNumber = book.book_number;

            // Add development entry for this book
            entry.development.push({
              bookNumber: book.book_number,
              changes: [
                `Location: ${charState.location}`,
                `Emotional state: ${charState.emotionalState}`,
                `Physical state: ${charState.physicalState}`,
              ],
              relationships: charState.relationships.map(
                rel => `${rel.status} with ${rel.withCharacterName}: ${rel.notes}`
              ),
              arc: charState.goals.join('; '),
            });

            // Determine status
            if (charState.physicalState.toLowerCase().includes('dead')) {
              entry.status = 'dead';
            } else {
              entry.status = 'alive';
            }
          }
        });
      }
    });

    return Array.from(characterMap.values());
  }

  /**
   * Aggregate world elements across all books
   */
  private aggregateWorldElements(books: Book[], baseStoryBible: StoryBible): SeriesWorldEntry[] {
    const worldMap = new Map<string, SeriesWorldEntry>();

    // Initialize locations
    baseStoryBible.world.locations.forEach(loc => {
      worldMap.set(loc.id, {
        elementId: loc.id,
        type: 'location',
        name: loc.name,
        introduced: 1,
        evolution: [],
      });
    });

    // Initialize factions
    baseStoryBible.world.factions.forEach(faction => {
      worldMap.set(faction.id, {
        elementId: faction.id,
        type: 'faction',
        name: faction.name,
        introduced: 1,
        evolution: [],
      });
    });

    // Initialize systems
    baseStoryBible.world.systems.forEach(system => {
      worldMap.set(system.id, {
        elementId: system.id,
        type: 'system',
        name: system.name,
        introduced: 1,
        evolution: [],
      });
    });

    // Track evolution across books
    books.forEach(book => {
      if (book.ending_state) {
        const endingState: BookEndingState = JSON.parse(book.ending_state as any);

        // Add world changes to all relevant elements
        const allChanges = [
          ...endingState.world.politicalChanges,
          ...endingState.world.physicalChanges,
          ...endingState.world.socialChanges,
        ];

        // For each world element, check if it's mentioned in the changes
        worldMap.forEach(entry => {
          const relevantChanges = allChanges.filter(change =>
            change.toLowerCase().includes(entry.name.toLowerCase())
          );

          if (relevantChanges.length > 0) {
            entry.evolution.push({
              bookNumber: book.book_number,
              changes: relevantChanges,
              significance: `Changes in Book ${book.book_number}`,
            });
          }
        });
      }
    });

    return Array.from(worldMap.values());
  }

  /**
   * Aggregate timeline across all books
   * Uses active version's chapters only
   */
  private async aggregateTimeline(books: Book[]): Promise<SeriesTimelineEntry[]> {
    const timeline: SeriesTimelineEntry[] = [];

    for (const book of books) {
      // Get active version for this book
      const activeVersion = await bookVersioningService.getActiveVersion(book.id);

      // Get chapters for this book's active version to determine timespan
      let chapters: Chapter[];
      if (activeVersion) {
        const chaptersStmt = db.prepare<[string], Chapter>(`
          SELECT id, chapter_number, summary FROM chapters
          WHERE version_id = ? AND status = 'completed'
          ORDER BY chapter_number ASC
        `);
        chapters = chaptersStmt.all(activeVersion.id);
      } else {
        // Legacy: no versions exist
        const chaptersStmt = db.prepare<[string], Chapter>(`
          SELECT id, chapter_number, summary FROM chapters
          WHERE book_id = ? AND version_id IS NULL AND status = 'completed'
          ORDER BY chapter_number ASC
        `);
        chapters = chaptersStmt.all(book.id);
      }

      if (chapters.length > 0) {
        // Extract major events from chapter summaries
        const majorEvents = chapters
          .filter(ch => ch.summary)
          .slice(0, 10)  // Top 10 most important
          .map(ch => `Ch${ch.chapter_number}: ${ch.summary?.slice(0, 100)}...`);

        timeline.push({
          bookNumber: book.book_number,
          timespan: 'Unknown',  // Would need to analyze to determine
          startDate: book.book_number === 1 ? 'Story beginning' : 'After previous book',
          endDate: book.timeline_end || 'Unknown',
          majorEvents,
        });
      }
    }

    return timeline;
  }

  /**
   * Track mysteries introduced and resolved across books
   */
  private trackMysteries(books: Book[]): SeriesMystery[] {
    if (books.length === 0) {
      return [];
    }

    // Get project ID from first book
    const projectId = books[0].project_id;

    // Fetch mysteries from database
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM series_mysteries
      WHERE series_id = ?
      ORDER BY raised_book, raised_chapter
    `);

    const rows = stmt.all(projectId);

    return rows.map(row => ({
      id: row.id,
      question: row.question,
      raisedIn: {
        bookNumber: row.raised_book,
        chapterNumber: row.raised_chapter,
        context: row.context,
      },
      answeredIn: row.answered_book
        ? {
            bookNumber: row.answered_book,
            chapterNumber: row.answered_chapter,
            answer: row.answer,
          }
        : undefined,
      status: row.status,
      importance: row.importance,
      seriesId: row.series_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get series bible from database
   */
  getSeriesBible(projectId: string): SeriesBible | null {
    const stmt = db.prepare<[string], Project>(`
      SELECT series_bible FROM projects WHERE id = ?
    `);

    const project = stmt.get(projectId);

    if (!project?.series_bible) {
      return null;
    }

    return JSON.parse(project.series_bible as any);
  }
}

// Export singleton instance
export const seriesBibleGeneratorService = new SeriesBibleGeneratorService();
