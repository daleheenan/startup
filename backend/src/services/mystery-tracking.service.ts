import db from '../db/connection.js';
import { claudeService } from './claude.service.js';
import type { SeriesMystery } from '../shared/types/index.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:mystery-tracking');

interface ExtractedMystery {
  question: string;
  context: string;
  importance: 'major' | 'minor' | 'subplot';
}

interface MysteryResolution {
  mysteryId: string;
  answer: string;
  confidence: number;
}

/**
 * MysteryTrackingService tracks plot mysteries and their resolution across a book series
 */
export class MysteryTrackingService {
  /**
   * Extract mysteries from a chapter using Claude
   */
  async extractMysteriesFromChapter(
    chapterId: string,
    content: string
  ): Promise<SeriesMystery[]> {
    logger.info(`[MysteryTracking] Extracting mysteries from chapter ${chapterId}`);

    // Get chapter metadata
    const chapterStmt = db.prepare<[string], any>(`
      SELECT c.chapter_number, b.book_number, b.project_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);

    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // Use Claude to identify mysteries
    const prompt = this.buildMysteryExtractionPrompt(content);

    const response = await claudeService.createCompletionWithUsage({
      system: 'You are an expert literary analyst specializing in plot structure and mystery tracking.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
      temperature: 0.3,
    });

    // Parse Claude's response
    const extractedMysteries = this.parseMysteryExtractionResponse(response.content);

    // Save mysteries to database
    const mysteries: SeriesMystery[] = [];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO series_mysteries (
        id, series_id, question, raised_book, raised_chapter, context,
        status, importance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `);

    for (const mystery of extractedMysteries) {
      const id = `mystery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      insertStmt.run(
        id,
        chapter.project_id,
        mystery.question,
        chapter.book_number,
        chapter.chapter_number,
        mystery.context,
        mystery.importance,
        now,
        now
      );

      mysteries.push({
        id,
        question: mystery.question,
        raisedIn: {
          bookNumber: chapter.book_number,
          chapterNumber: chapter.chapter_number,
          context: mystery.context,
        },
        status: 'open',
        importance: mystery.importance,
        seriesId: chapter.project_id,
        createdAt: now,
        updatedAt: now,
      });
    }

    logger.info(`[MysteryTracking] Extracted ${mysteries.length} mysteries`);
    return mysteries;
  }

  /**
   * Find resolutions to open mysteries in a chapter
   */
  async findMysteryResolutions(
    chapterId: string,
    content: string
  ): Promise<MysteryResolution[]> {
    logger.info(`[MysteryTracking] Finding mystery resolutions in chapter ${chapterId}`);

    // Get chapter metadata
    const chapterStmt = db.prepare<[string], any>(`
      SELECT c.chapter_number, b.book_number, b.project_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);

    const chapter = chapterStmt.get(chapterId);

    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // Get open mysteries for this series
    const openMysteries = this.getOpenMysteries(chapter.project_id);

    if (openMysteries.length === 0) {
      logger.info('[MysteryTracking] No open mysteries to resolve');
      return [];
    }

    // Use Claude to identify resolutions
    const prompt = this.buildResolutionDetectionPrompt(content, openMysteries);

    const response = await claudeService.createCompletionWithUsage({
      system: 'You are an expert literary analyst specializing in plot resolution tracking.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
      temperature: 0.3,
    });

    // Parse resolutions
    const resolutions = this.parseResolutionResponse(response.content);

    // Update resolved mysteries in database
    const updateStmt = db.prepare(`
      UPDATE series_mysteries
      SET answered_book = ?, answered_chapter = ?, answer = ?, status = 'resolved', updated_at = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();

    for (const resolution of resolutions) {
      updateStmt.run(
        chapter.book_number,
        chapter.chapter_number,
        resolution.answer,
        now,
        resolution.mysteryId
      );
    }

    logger.info(`[MysteryTracking] Found ${resolutions.length} resolutions`);
    return resolutions;
  }

  /**
   * Get all mysteries for a series
   */
  getSeriesMysteries(seriesId: string): SeriesMystery[] {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM series_mysteries
      WHERE series_id = ?
      ORDER BY raised_book, raised_chapter
    `);

    const rows = stmt.all(seriesId);

    return rows.map(row => this.rowToMystery(row));
  }

  /**
   * Get open mysteries only
   */
  getOpenMysteries(seriesId: string): SeriesMystery[] {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM series_mysteries
      WHERE series_id = ? AND status = 'open'
      ORDER BY raised_book, raised_chapter
    `);

    const rows = stmt.all(seriesId);

    return rows.map(row => this.rowToMystery(row));
  }

  /**
   * Update mystery status manually
   */
  updateMysteryStatus(
    mysteryId: string,
    status: 'open' | 'resolved' | 'red_herring',
    answer?: string,
    answeredBook?: number,
    answeredChapter?: number
  ): SeriesMystery {
    const now = new Date().toISOString();

    if (status === 'resolved' && !answer) {
      throw new Error('Answer is required when marking mystery as resolved');
    }

    // If marking as resolved, use provided book/chapter or leave as null for manual update
    const updateStmt = db.prepare(`
      UPDATE series_mysteries
      SET status = ?, answer = ?, answered_book = ?, answered_chapter = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      status,
      answer || null,
      answeredBook || null,
      answeredChapter || null,
      now,
      mysteryId
    );

    // Retrieve updated mystery
    const selectStmt = db.prepare<[string], any>(`
      SELECT * FROM series_mysteries WHERE id = ?
    `);

    const row = selectStmt.get(mysteryId);

    if (!row) {
      throw new Error(`Mystery ${mysteryId} not found`);
    }

    return this.rowToMystery(row);
  }

  /**
   * Delete a mystery
   */
  deleteMystery(mysteryId: string): void {
    const stmt = db.prepare(`DELETE FROM series_mysteries WHERE id = ?`);
    stmt.run(mysteryId);
    logger.info(`[MysteryTracking] Deleted mystery ${mysteryId}`);
  }

  /**
   * Get mystery timeline (raise/resolve points)
   */
  getMysteryTimeline(seriesId: string): Array<{
    mystery: SeriesMystery;
    raisedAt: string;
    resolvedAt?: string;
  }> {
    const mysteries = this.getSeriesMysteries(seriesId);

    return mysteries.map(mystery => ({
      mystery,
      raisedAt: `Book ${mystery.raisedIn.bookNumber}, Chapter ${mystery.raisedIn.chapterNumber}`,
      resolvedAt: mystery.answeredIn
        ? `Book ${mystery.answeredIn.bookNumber}, Chapter ${mystery.answeredIn.chapterNumber}`
        : undefined,
    }));
  }

  /**
   * Build prompt for mystery extraction
   */
  private buildMysteryExtractionPrompt(content: string): string {
    return `Analyze this chapter and identify any plot mysteries, unanswered questions, or foreshadowing that readers would notice:

Chapter Content:
${content.substring(0, 8000)}

For each mystery found, provide:
- The question or mystery (phrased as a question)
- The context (quote or summary where it appears, max 200 characters)
- Importance: "major" (central to plot), "minor" (subplot), or "subplot" (background detail)

Only include genuine mysteries or questions that readers would want answered, not rhetorical questions or minor details.

Format your response as a JSON array:
[
  {
    "question": "What caused the mysterious lights in the forest?",
    "context": "She saw strange lights dancing between the trees, unlike anything natural.",
    "importance": "major"
  }
]

If no mysteries are found, return an empty array: []`;
  }

  /**
   * Build prompt for resolution detection
   */
  private buildResolutionDetectionPrompt(
    content: string,
    openMysteries: SeriesMystery[]
  ): string {
    const mysteriesList = openMysteries
      .map((m, i) => `${i + 1}. [ID: ${m.id}] ${m.question}`)
      .join('\n');

    return `Analyze this chapter to see if it resolves any of these open mysteries:

Open Mysteries:
${mysteriesList}

Chapter Content:
${content.substring(0, 8000)}

For each mystery that is clearly resolved or answered in this chapter, provide:
- The mystery ID
- The answer/resolution (concise explanation)
- Confidence (0-100, only include if confidence >= 70)

Format your response as a JSON array:
[
  {
    "mysteryId": "mystery-123",
    "answer": "The lights were caused by bioluminescent fungi growing in the old ruins.",
    "confidence": 95
  }
]

If no mysteries are resolved, return an empty array: []

Only include mysteries that are definitively answered, not partial hints or clues.`;
  }

  /**
   * Parse Claude's mystery extraction response
   */
  private parseMysteryExtractionResponse(response: string): ExtractedMystery[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('No JSON array found in mystery tracking response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        logger.warn('Mystery tracking response is not an array');
        return [];
      }

      return parsed
        .filter(item => item.question && item.context && item.importance)
        .map(item => ({
          question: item.question.trim(),
          context: item.context.trim().substring(0, 200),
          importance: item.importance as 'major' | 'minor' | 'subplot',
        }));
    } catch (error) {
      logger.error({ error }, 'Error parsing mystery extraction response');
      return [];
    }
  }

  /**
   * Parse Claude's resolution detection response
   */
  private parseResolutionResponse(response: string): MysteryResolution[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('No JSON array found in mystery tracking response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        logger.warn('Mystery tracking response is not an array');
        return [];
      }

      return parsed
        .filter(item => item.mysteryId && item.answer && (item.confidence || 0) >= 70)
        .map(item => ({
          mysteryId: item.mysteryId,
          answer: item.answer.trim(),
          confidence: item.confidence,
        }));
    } catch (error) {
      logger.error({ error }, 'Error parsing resolution response');
      return [];
    }
  }

  /**
   * Convert database row to SeriesMystery
   */
  private rowToMystery(row: any): SeriesMystery {
    return {
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
    };
  }
}

// Export singleton instance
export const mysteryTrackingService = new MysteryTrackingService();
