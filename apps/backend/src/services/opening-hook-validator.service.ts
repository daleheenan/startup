import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:opening-hook-validator');

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
 * Opening Hook Validator Service
 *
 * Analyses the opening of a book to score its effectiveness at hooking readers.
 * Detects common weak opening patterns that should be avoided in bestselling fiction.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface WeakOpener {
  type: 'weather' | 'waking' | 'mirror' | 'info_dump' | 'passive';
  quote: string;
  location: string;
  suggestion: string;
}

export interface OpeningHookResult {
  score: number; // 1-10
  firstLine: string;
  assessment: string;
  weakOpeners: WeakOpener[];
  recommendation: string;
}

// ============================================================================
// Opening Hook Validator Service
// ============================================================================

export class OpeningHookValidatorService {
  /**
   * Analyses the opening hook of a book
   *
   * @param bookId - ID of the book to analyse
   * @returns Analysis of opening effectiveness with score and weak opener detection
   */
  async analyseOpeningHook(bookId: string): Promise<OpeningHookResult> {
    logger.info({ bookId }, '[OpeningHookValidator] Analysing opening hook');

    // Get the first chapter content along with project ID for cost tracking
    const chapterStmt = db.prepare(`
      SELECT c.id, c.chapter_number, c.content, c.title,
             b.title as book_title, b.genre, b.project_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.book_id = ?
        AND c.content IS NOT NULL
        ${VERSION_AWARE_CHAPTER_FILTER}
      ORDER BY c.chapter_number ASC
      LIMIT 1
    `);

    const firstChapter = chapterStmt.get(bookId) as any;

    if (!firstChapter) {
      throw new Error('No chapters found for book');
    }

    // Extract first 1000 words for analysis (enough to assess opening)
    const words = firstChapter.content.split(/\s+/);
    const openingText = words.slice(0, 1000).join(' ');
    const firstLine = openingText.split(/[.!?]/)[0].trim() + '.';

    logger.info({ bookId, genre: firstChapter.genre }, '[OpeningHookValidator] Analysing first chapter opening');

    const systemPrompt = `You are an expert book editor analysing opening hooks for bestselling fiction.

Provide your analysis as JSON with this structure:
{
  "score": 1-10 (where 1-3 = weak/static, 4-6 = average/passive, 7-8 = good/engaging, 9-10 = excellent/compelling),
  "firstLine": "${firstLine}",
  "assessment": "2-3 sentence analysis of the opening's effectiveness",
  "weakOpeners": [
    {
      "type": "weather|waking|mirror|info_dump|passive",
      "quote": "exact quote from text",
      "location": "where in opening (e.g., 'first line', 'opening paragraph')",
      "suggestion": "how to improve this"
    }
  ],
  "recommendation": "specific advice for improving the opening hook"
}

WEAK OPENER DETECTION CRITERIA:
- **weather**: Opens with weather description ("The sun rose...", "It was raining...")
- **waking**: Character waking up or getting out of bed
- **mirror**: Character looking in mirror or describing appearance
- **info_dump**: Heavy exposition, backstory, or world-building in opening lines
- **passive**: Passive voice, no character agency, static description

SCORING CRITERIA:
- 1-3: Weak - Static description, no character agency, weak openers present
- 4-6: Average - Some interest, but passive or slow start
- 7-8: Good - Immediate engagement, question raised, character agency
- 9-10: Excellent - Compelling, impossible to stop, raises questions, strong voice

Only include weakOpeners that are actually present. If the opening is strong, return empty array.

Respond with ONLY the JSON object, no other text.`;

    const userPrompt = `Analyse the opening of this ${firstChapter.genre || 'fiction'} novel and provide a comprehensive assessment.

BOOK: "${firstChapter.book_title}"
CHAPTER: ${firstChapter.chapter_number} - ${firstChapter.title || 'Untitled'}

OPENING TEXT:
${openingText}

Provide your analysis as JSON.`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.7,
      tracking: {
        requestType: AI_REQUEST_TYPES.OPENING_REVIEW,
        projectId: firstChapter.project_id,
        bookId: bookId,
        chapterId: firstChapter.id,
        contextSummary: `Opening hook analysis for "${firstChapter.book_title}"`,
      },
    });

    // Extract JSON from response
    const result = extractJsonObject<OpeningHookResult>(response.content);

    if (!result) {
      logger.error({ bookId, response: response.content }, '[OpeningHookValidator] Failed to extract JSON from Claude response');
      throw new Error('Failed to parse opening hook analysis');
    }

    logger.info({
      bookId,
      score: result.score,
      weakOpenerCount: result.weakOpeners.length,
    }, '[OpeningHookValidator] Analysis complete');

    return result;
  }
}

// Export singleton instance
export const openingHookValidatorService = new OpeningHookValidatorService();
