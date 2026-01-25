import db from '../db/connection.js';
import type {
  Book,
  BookEndingState,
  CharacterEndingState,
  WorldEndingState,
  StoryBible,
  Character,
  WorldElements,
} from '../shared/types/index.js';
import { claudeService } from './claude.service.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:cross-book-continuity');

/**
 * CrossBookContinuityService manages character and world state across books in a trilogy
 */
export class CrossBookContinuityService {
  /**
   * Generate book ending state snapshot
   * Captures the state of all characters and world at the end of a book
   */
  async generateBookEndingState(bookId: string): Promise<BookEndingState> {
    logger.info(`[CrossBookContinuity] Generating ending state for book ${bookId}`);

    // Get the book
    const bookStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // Get project story bible
    const projectStmt = db.prepare<[string], any>(`
      SELECT story_bible FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(book.project_id);

    if (!project?.story_bible) {
      throw new Error(`Story bible not found for project ${book.project_id}`);
    }

    const storyBible: StoryBible = JSON.parse(project.story_bible);

    // Get the last chapter of this book
    const lastChapterStmt = db.prepare<[string], any>(`
      SELECT content, summary FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number DESC
      LIMIT 1
    `);
    const lastChapter = lastChapterStmt.get(bookId);

    if (!lastChapter?.content) {
      throw new Error(`No completed chapters found for book ${bookId}`);
    }

    // Use Claude to analyze the ending state
    const prompt = this.buildEndingStatePrompt(storyBible, lastChapter.content, lastChapter.summary);

    const response = await claudeService.createCompletion({
      system: 'You are analyzing the ending state of a novel for continuity tracking.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
      temperature: 0.3,  // Lower temperature for more consistent analysis
    });

    const endingState: BookEndingState = JSON.parse(response);

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE books
      SET ending_state = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(endingState),
      new Date().toISOString(),
      bookId
    );

    logger.info(`[CrossBookContinuity] Ending state saved for book ${bookId}`);

    return endingState;
  }

  /**
   * Generate book summary for context in next book
   */
  async generateBookSummary(bookId: string): Promise<string> {
    logger.info(`[CrossBookContinuity] Generating summary for book ${bookId}`);

    // Get all chapter summaries
    const chaptersStmt = db.prepare<[string], any>(`
      SELECT chapter_number, title, summary
      FROM chapters
      WHERE book_id = ? AND status = 'completed'
      ORDER BY chapter_number ASC
    `);

    const chapters = chaptersStmt.all(bookId);

    if (chapters.length === 0) {
      throw new Error(`No completed chapters found for book ${bookId}`);
    }

    // Build prompt to summarize the entire book
    const prompt = `You are creating a comprehensive summary of a novel to provide context for writing the next book in a trilogy.

CHAPTER SUMMARIES:

${chapters.map(ch => `Chapter ${ch.chapter_number}${ch.title ? ': ' + ch.title : ''}
${ch.summary}`).join('\n\n')}

Create a comprehensive 500-800 word summary of this book that covers:

1. PLOT SUMMARY
   - Major events and turning points
   - How the main conflict developed and resolved (or didn't)
   - What plot threads were left open

2. CHARACTER DEVELOPMENT
   - How main characters changed and grew
   - Key relationship developments
   - Character positions at book end

3. WORLD STATE
   - Political/social changes
   - Physical changes to locations
   - New information revealed about the world

4. SETUP FOR NEXT BOOK
   - Unresolved conflicts
   - Character goals going forward
   - Threats still active

Write in past tense, objective narrative style.`;

    const summary = await claudeService.createCompletion({
      system: 'You are creating a comprehensive book summary for trilogy continuity.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1500,
      temperature: 0.3,
    });

    // Save to database
    const updateStmt = db.prepare(`
      UPDATE books
      SET book_summary = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      summary,
      new Date().toISOString(),
      bookId
    );

    logger.info(`[CrossBookContinuity] Book summary saved for book ${bookId}`);

    return summary;
  }

  /**
   * Load previous book ending state for context in next book
   */
  loadPreviousBookState(projectId: string, currentBookNumber: number): BookEndingState | null {
    if (currentBookNumber === 1) {
      return null; // First book has no previous state
    }

    const previousBookStmt = db.prepare<[string, number], Book>(`
      SELECT * FROM books
      WHERE project_id = ? AND book_number = ?
    `);

    const previousBook = previousBookStmt.get(projectId, currentBookNumber - 1);

    if (!previousBook?.ending_state) {
      logger.warn({ bookNumber: currentBookNumber - 1 }, 'No ending state found for previous book');
      return null;
    }

    return JSON.parse(previousBook.ending_state as any);
  }

  /**
   * Load previous book summary for context
   */
  loadPreviousBookSummary(projectId: string, currentBookNumber: number): string | null {
    if (currentBookNumber === 1) {
      return null;
    }

    const previousBookStmt = db.prepare<[string, number], Book>(`
      SELECT book_summary FROM books
      WHERE project_id = ? AND book_number = ?
    `);

    const previousBook = previousBookStmt.get(projectId, currentBookNumber - 1);

    return previousBook?.book_summary || null;
  }

  /**
   * Apply previous book ending state to current book setup
   * Updates character states and world state based on how Book N ended
   */
  applyPreviousBookState(
    currentStoryBible: StoryBible,
    previousState: BookEndingState
  ): StoryBible {
    logger.info(`[CrossBookContinuity] Applying previous book ending state`);

    // Update character current states
    const updatedCharacters = currentStoryBible.characters.map(char => {
      const previousCharState = previousState.characters.find(
        pcs => pcs.characterId === char.id
      );

      if (previousCharState) {
        return {
          ...char,
          currentState: {
            location: previousCharState.location,
            emotionalState: previousCharState.emotionalState,
            goals: previousCharState.goals,
            conflicts: previousCharState.goals.map(g => `Pursuing: ${g}`),
          },
          relationships: char.relationships.map(rel => {
            const previousRel = previousCharState.relationships.find(
              pr => pr.withCharacterId === rel.characterId
            );

            if (previousRel) {
              return {
                ...rel,
                description: `${previousRel.status}: ${previousRel.notes}`,
              };
            }

            return rel;
          }),
        };
      }

      return char;
    });

    // World state is narrative, so we'll just note it for the author
    // The actual world elements don't change, but context about changes is important

    return {
      ...currentStoryBible,
      characters: updatedCharacters,
      // World and timeline preserved as-is
      // The previousState.world information will be used in context assembly
    };
  }

  /**
   * Build prompt for generating ending state
   */
  private buildEndingStatePrompt(
    storyBible: StoryBible,
    lastChapterContent: string,
    lastChapterSummary: string
  ): string {
    const charactersJson = JSON.stringify(storyBible.characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
    })), null, 2);

    return `You are analyzing the ending state of a novel to track continuity for the next book in a trilogy.

STORY BIBLE CHARACTERS:
${charactersJson}

LAST CHAPTER SUMMARY:
${lastChapterSummary}

LAST CHAPTER EXCERPT (final 1000 words):
${lastChapterContent.slice(-3000)}

Analyze the ending state and provide a JSON object with this structure:

{
  "characters": [
    {
      "characterId": "character-uuid",
      "characterName": "Name",
      "location": "Where they are at book end",
      "emotionalState": "How they feel",
      "physicalState": "Injured, healthy, exhausted, etc.",
      "relationships": [
        {
          "withCharacterId": "other-character-uuid",
          "withCharacterName": "Other Name",
          "status": "allies|enemies|estranged|in love|complicated",
          "notes": "Brief relationship status"
        }
      ],
      "goals": ["What they want going into next book"],
      "knowledge": ["Key things they now know"],
      "possessions": ["Important items they have"]
    }
  ],
  "world": {
    "politicalChanges": ["Political shifts that occurred"],
    "physicalChanges": ["Locations destroyed, created, changed"],
    "socialChanges": ["Social/cultural changes"],
    "activeThreats": ["Ongoing dangers/conflicts"],
    "knownSecrets": ["Secrets revealed during this book"]
  },
  "timeline": "End of summer, Year 1024",
  "unresolved": ["Plot threads left open for next book"]
}

Provide ONLY the JSON object, no other text.`;
  }
}

// Export singleton instance
export const crossBookContinuityService = new CrossBookContinuityService();
