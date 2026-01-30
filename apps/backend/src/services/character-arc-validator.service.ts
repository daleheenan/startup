import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:character-arc-validator');

// Version-aware chapter query helper
// Filters to only include chapters from active versions (or legacy chapters without version_id)
const VERSION_AWARE_CHAPTER_FILTER = `
  AND (
    c.version_id IS NULL
    OR c.version_id IN (
      SELECT bv.id FROM book_versions bv WHERE bv.book_id = c.book_id AND bv.is_active = 1
    )
  )
`;

/**
 * Character Arc Validator Service
 *
 * Analyses character arcs to verify they follow bestseller patterns:
 * - WANT (external goal) vs NEED (internal growth)
 * - LIE believed at start vs TRUTH discovered by end
 * - Visible transformation in final act
 * - Inciting incident timing (should occur by Chapter 3)
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface CharacterWant {
  identified: boolean;
  description?: string;
  evidence: string[];
}

export interface CharacterNeed {
  identified: boolean;
  description?: string;
  evidence: string[];
}

export interface LieToTruth {
  lie?: string;
  truth?: string;
  transformationVisible: boolean;
  evidence: string[];
}

export interface CharacterArcAnalysis {
  characterId: string;
  characterName: string;
  want: CharacterWant;
  need: CharacterNeed;
  lieToTruth: LieToTruth;
  arcCompleteness: number; // 0-100%
  recommendation: string;
}

export interface CharacterArcResult {
  characters: CharacterArcAnalysis[];
  incitingIncidentChapter?: number;
  incitingIncidentByChapterThree: boolean;
}

// ============================================================================
// Character Arc Validator Service
// ============================================================================

export class CharacterArcValidatorService {
  /**
   * Analyses character arcs in a book, focusing on the protagonist
   *
   * @param bookId - ID of the book to analyse
   * @param characterId - Optional specific character ID (defaults to protagonist)
   * @returns Character arc analysis with WANT/NEED and LIE/TRUTH tracking
   */
  async analyseCharacterArc(bookId: string, characterId?: string): Promise<CharacterArcResult> {
    logger.info({ bookId, characterId }, '[CharacterArcValidator] Analysing character arcs');

    // Get book info
    const bookStmt = db.prepare(`
      SELECT id, title, genre FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId) as any;

    if (!book) {
      throw new Error('Book not found');
    }

    // Get all chapters
    const chaptersStmt = db.prepare(`
      SELECT c.id, c.chapter_number, c.content, c.title
      FROM chapters c
      WHERE c.book_id = ?
        AND c.content IS NOT NULL
        ${VERSION_AWARE_CHAPTER_FILTER}
      ORDER BY c.chapter_number ASC
    `);
    const chapters = chaptersStmt.all(bookId) as any[];

    if (chapters.length === 0) {
      throw new Error('No chapters found for book');
    }

    // Get characters
    let characters: any[];
    if (characterId) {
      const charStmt = db.prepare(`
        SELECT id, name, description, role FROM characters WHERE id = ? AND book_id = ?
      `);
      const char = charStmt.get(characterId, bookId);
      characters = char ? [char] : [];
    } else {
      // Get protagonist (or all main characters if no protagonist defined)
      const charsStmt = db.prepare(`
        SELECT id, name, description, role
        FROM characters
        WHERE book_id = ?
          AND (role = 'protagonist' OR role = 'main')
        ORDER BY
          CASE role
            WHEN 'protagonist' THEN 1
            WHEN 'main' THEN 2
            ELSE 3
          END
        LIMIT 3
      `);
      characters = charsStmt.all(bookId) as any[];
    }

    if (characters.length === 0) {
      logger.warn({ bookId }, '[CharacterArcValidator] No characters found, analysing book without character context');
      // Analyse without specific characters
      characters = [{ id: 'unknown', name: 'Protagonist', description: 'Main character', role: 'protagonist' }];
    }

    // Compile manuscript context (first 3 chapters, middle chapter, last 2 chapters)
    const manuscriptExcerpts = this.buildManuscriptExcerpts(chapters);

    // Analyse each character
    const characterAnalyses: CharacterArcAnalysis[] = [];

    for (const character of characters) {
      logger.info({ characterId: character.id, characterName: character.name }, '[CharacterArcValidator] Analysing character arc');

      const systemPrompt = `You are an expert editor analysing character arcs for bestselling fiction.

Analyse the character arc and respond with JSON only in this format:
{
  "want": {
    "identified": true/false,
    "description": "the external goal the character pursues",
    "evidence": ["quote or reference supporting this WANT"]
  },
  "need": {
    "identified": true/false,
    "description": "the internal growth or lesson the character needs to learn",
    "evidence": ["quote or reference supporting this NEED"]
  },
  "lieToTruth": {
    "lie": "the false belief the character holds at the start",
    "truth": "the truth they discover by the end",
    "transformationVisible": true/false (is the transformation shown in action, not just stated?),
    "evidence": ["quote or reference showing transformation"]
  },
  "arcCompleteness": 0-100 (percentage of how complete/satisfying the arc is),
  "recommendation": "specific advice for improving the character arc"
}

BESTSELLER ARC CRITERIA:
- WANT: External goal driving plot (e.g., "solve the murder", "win the championship", "save the kingdom")
- NEED: Internal lesson/growth (e.g., "learn to trust others", "overcome fear", "accept herself")
- LIE: False belief at start (e.g., "I must be perfect", "people always leave", "I'm not enough")
- TRUTH: Realisation by end (e.g., "imperfection is human", "connection is worth the risk", "I am worthy")
- TRANSFORMATION: Must be SHOWN through action, not just told

If WANT, NEED, or LIE/TRUTH are not clearly identified in the text, set "identified": false and provide recommendation.`;

      const userPrompt = `Analyse the character arc for "${character.name}" in this ${book.genre || 'fiction'} novel: "${book.title}"

CHARACTER INFO:
Name: ${character.name}
Description: ${character.description || 'No description provided'}
Role: ${character.role || 'unknown'}

MANUSCRIPT EXCERPTS:
${manuscriptExcerpts}

Provide your character arc analysis as JSON.`;

      const response = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2000,
        temperature: 0.7,
        tracking: {
          requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
          contextSummary: `Character arc analysis for ${character.name}`,
        },
      });

      const result = extractJsonObject<{
        want: CharacterWant;
        need: CharacterNeed;
        lieToTruth: LieToTruth;
        arcCompleteness: number;
        recommendation: string;
      }>(response.content);

      if (!result) {
        logger.error({ characterId: character.id }, '[CharacterArcValidator] Failed to extract character arc analysis');
        continue;
      }

      characterAnalyses.push({
        characterId: character.id,
        characterName: character.name,
        want: result.want,
        need: result.need,
        lieToTruth: result.lieToTruth,
        arcCompleteness: result.arcCompleteness,
        recommendation: result.recommendation,
      });
    }

    // Detect inciting incident timing
    const incitingIncidentAnalysis = await this.detectIncitingIncident(bookId, chapters.slice(0, 5)); // Check first 5 chapters

    logger.info({
      bookId,
      characterCount: characterAnalyses.length,
      incitingIncidentChapter: incitingIncidentAnalysis.chapter,
    }, '[CharacterArcValidator] Character arc analysis complete');

    return {
      characters: characterAnalyses,
      incitingIncidentChapter: incitingIncidentAnalysis.chapter,
      incitingIncidentByChapterThree: incitingIncidentAnalysis.chapter ? incitingIncidentAnalysis.chapter <= 3 : false,
    };
  }

  /**
   * Build manuscript excerpts for analysis (opening, middle, ending)
   */
  private buildManuscriptExcerpts(chapters: any[]): string {
    const excerpts: string[] = [];

    // First 3 chapters (or all if less than 3)
    const openingChapters = chapters.slice(0, Math.min(3, chapters.length));
    for (const chapter of openingChapters) {
      const words = chapter.content.split(/\s+/).slice(0, 300).join(' ');
      excerpts.push(`CHAPTER ${chapter.chapter_number}: ${chapter.title || 'Untitled'}\n${words}...`);
    }

    // Middle chapter
    if (chapters.length > 6) {
      const midIndex = Math.floor(chapters.length / 2);
      const midChapter = chapters[midIndex];
      const words = midChapter.content.split(/\s+/).slice(0, 300).join(' ');
      excerpts.push(`\nCHAPTER ${midChapter.chapter_number}: ${midChapter.title || 'Untitled'}\n${words}...`);
    }

    // Last 2 chapters
    if (chapters.length > 3) {
      const endingChapters = chapters.slice(-Math.min(2, chapters.length));
      for (const chapter of endingChapters) {
        const words = chapter.content.split(/\s+/).slice(0, 300).join(' ');
        excerpts.push(`\nCHAPTER ${chapter.chapter_number}: ${chapter.title || 'Untitled'}\n${words}...`);
      }
    }

    return excerpts.join('\n\n---\n\n');
  }

  /**
   * Detect inciting incident and verify it occurs by Chapter 3
   */
  private async detectIncitingIncident(bookId: string, earlyChapters: any[]): Promise<{ chapter?: number }> {
    logger.info({ bookId }, '[CharacterArcValidator] Detecting inciting incident');

    if (earlyChapters.length === 0) {
      return { chapter: undefined };
    }

    // Compile first few chapters
    const manuscriptOpening = earlyChapters
      .map((ch) => {
        const words = ch.content.split(/\s+/).slice(0, 400).join(' ');
        return `CHAPTER ${ch.chapter_number}: ${ch.title || 'Untitled'}\n${words}...`;
      })
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert editor identifying the inciting incident in a story.

The INCITING INCIDENT is the event that disrupts the protagonist's ordinary world and forces them into the main story conflict. It should occur by Chapter 3 in bestselling fiction.

Respond with JSON only:
{
  "incitingIncidentChapter": 1-5 or null (which chapter contains the inciting incident, or null if not found),
  "incidentDescription": "brief description of the inciting incident"
}

Examples of inciting incidents:
- Murder mystery: the murder is discovered
- Romance: protagonist meets love interest
- Thriller: protagonist witnesses a crime or receives a threat
- Fantasy: protagonist discovers their powers or receives the call to adventure

If no clear inciting incident is found in these chapters, return null.`;

    const userPrompt = `Analyse these opening chapters and identify when the inciting incident occurs:

${manuscriptOpening}

Provide your analysis as JSON.`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1000,
      temperature: 0.5,
      tracking: {
        requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
        contextSummary: `Inciting incident detection for book ${bookId}`,
      },
    });

    const result = extractJsonObject<{ incitingIncidentChapter: number | null; incidentDescription: string }>(response.content);

    if (!result || result.incitingIncidentChapter === null) {
      logger.warn({ bookId }, '[CharacterArcValidator] No inciting incident detected in first 5 chapters');
      return { chapter: undefined };
    }

    logger.info({
      bookId,
      chapter: result.incitingIncidentChapter,
      description: result.incidentDescription,
    }, '[CharacterArcValidator] Inciting incident detected');

    return { chapter: result.incitingIncidentChapter };
  }
}

// Export singleton instance
export const characterArcValidatorService = new CharacterArcValidatorService();
