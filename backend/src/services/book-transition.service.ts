import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import type {
  Book,
  BookTransition,
  BookEndingState,
  CharacterTransitionChange,
  WorldTransitionChange,
} from '../shared/types/index.js';
import { claudeService } from './claude.service.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:book-transition');

/**
 * BookTransitionService generates summaries of what happened
 * between books in a trilogy (time gaps)
 */
export class BookTransitionService {
  /**
   * Generate transition summary between two books
   */
  async generateBookTransition(
    projectId: string,
    fromBookId: string,
    toBookId: string,
    timeGap: string
  ): Promise<BookTransition> {
    logger.info(`[BookTransition] Generating transition from book ${fromBookId} to ${toBookId}`);

    // Get both books
    const bookStmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);

    const fromBook = bookStmt.get(fromBookId);
    const toBook = bookStmt.get(toBookId);

    if (!fromBook || !toBook) {
      throw new Error('Books not found');
    }

    if (fromBook.book_number >= toBook.book_number) {
      throw new Error('From book must be before to book');
    }

    // Get ending state of previous book
    if (!fromBook.ending_state) {
      throw new Error(`Book ${fromBookId} has no ending state. Generate it first.`);
    }

    const endingState: BookEndingState = JSON.parse(fromBook.ending_state as any);

    // Get book summary
    const bookSummary = fromBook.book_summary || 'No summary available';

    // Use Claude to generate what happened during the gap
    const prompt = this.buildTransitionPrompt(
      fromBook,
      toBook,
      endingState,
      bookSummary,
      timeGap
    );

    const response = await claudeService.createCompletion({
      system: 'You are creating a transition summary between books in a trilogy.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
      temperature: 0.7,
    });

    const transitionData = JSON.parse(response);

    // Create transition record
    const transitionId = randomUUID();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO book_transitions (
        id, project_id, from_book_id, to_book_id,
        time_gap, gap_summary, character_changes, world_changes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      transitionId,
      projectId,
      fromBookId,
      toBookId,
      timeGap,
      transitionData.gapSummary,
      JSON.stringify(transitionData.characterChanges),
      JSON.stringify(transitionData.worldChanges),
      now,
      now
    );

    logger.info(`[BookTransition] Transition ${transitionId} created`);

    return {
      id: transitionId,
      project_id: projectId,
      from_book_id: fromBookId,
      to_book_id: toBookId,
      time_gap: timeGap,
      gap_summary: transitionData.gapSummary,
      character_changes: transitionData.characterChanges,
      world_changes: transitionData.worldChanges,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Get transition between two books
   */
  getTransition(fromBookId: string, toBookId: string): BookTransition | null {
    const stmt = db.prepare<[string, string], any>(`
      SELECT * FROM book_transitions
      WHERE from_book_id = ? AND to_book_id = ?
    `);

    const transition = stmt.get(fromBookId, toBookId);

    if (!transition) {
      return null;
    }

    return {
      ...transition,
      character_changes: JSON.parse(transition.character_changes),
      world_changes: JSON.parse(transition.world_changes),
    };
  }

  /**
   * Get all transitions for a project
   */
  getProjectTransitions(projectId: string): BookTransition[] {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM book_transitions
      WHERE project_id = ?
      ORDER BY from_book_id ASC
    `);

    const transitions = stmt.all(projectId);

    return transitions.map((t: any) => ({
      ...t,
      character_changes: JSON.parse(t.character_changes),
      world_changes: JSON.parse(t.world_changes),
    }));
  }

  /**
   * Build prompt for generating transition summary
   */
  private buildTransitionPrompt(
    fromBook: Book,
    toBook: Book,
    endingState: BookEndingState,
    bookSummary: string,
    timeGap: string
  ): string {
    const charactersJson = JSON.stringify(endingState.characters.map(c => ({
      name: c.characterName,
      location: c.location,
      emotionalState: c.emotionalState,
      goals: c.goals,
    })), null, 2);

    return `You are creating a transition summary for a trilogy. This explains what happened during the time gap between two books.

PREVIOUS BOOK (${fromBook.title}) ENDING:

Book Summary:
${bookSummary}

Character States at End:
${charactersJson}

World State:
- Political Changes: ${endingState.world.politicalChanges.join(', ')}
- Active Threats: ${endingState.world.activeThreats.join(', ')}
- Unresolved Plot Threads: ${endingState.unresolved.join(', ')}

TIME GAP: ${timeGap}

NEXT BOOK: ${toBook.title} (Book ${toBook.book_number})

Generate a JSON object describing what happened during this ${timeGap} gap:

{
  "gapSummary": "A 200-300 word narrative summary of what happened during the gap. Focus on: how characters pursued their goals, how the world situation evolved, what new threats emerged. Write in past tense.",
  "characterChanges": [
    {
      "characterId": "character-id",
      "characterName": "Name",
      "changes": [
        "What this character did during the gap",
        "How they changed or grew",
        "What happened to them"
      ],
      "newLocation": "Where they are at start of next book",
      "newStatus": "Their situation at start of next book"
    }
  ],
  "worldChanges": [
    {
      "type": "political|social|physical|threat",
      "description": "What changed in the world",
      "impact": "How this affects the next book"
    }
  ]
}

Consider:
- Characters would pursue their stated goals
- Active threats would evolve or escalate
- Unresolved plot threads would develop
- New complications would arise
- The world would change based on previous events

Provide ONLY the JSON object, no other text.`;
  }
}

// Export singleton instance
export const bookTransitionService = new BookTransitionService();
