import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:tension-arc-validator');

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
 * Tension Arc Validator Service
 *
 * Analyses the tension arc across a book's chapters to identify pacing issues.
 * Detects tension plateaus where multiple consecutive scenes maintain the same tension level.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SceneTensionScore {
  chapterId: string;
  chapterNumber: number;
  tensionLevel: number; // 1-10
  assessment: string;
}

export interface TensionPlateau {
  startChapter: number;
  endChapter: number;
  tensionLevel: number;
  recommendation: string;
}

export interface TensionArcResult {
  sceneScores: SceneTensionScore[];
  plateaus: TensionPlateau[];
  overallArcScore: number; // 1-10
  graphData: Array<{ chapter: number; tension: number }>; // For charting
}

// ============================================================================
// Tension Arc Validator Service
// ============================================================================

export class TensionArcValidatorService {
  /**
   * Analyses the tension arc across all chapters in a book
   *
   * @param bookId - ID of the book to analyse
   * @returns Tension analysis with per-chapter scores and plateau detection
   */
  async analyseTensionArc(bookId: string): Promise<TensionArcResult> {
    logger.info({ bookId }, '[TensionArcValidator] Analysing tension arc');

    // Get project ID for cost tracking
    const bookStmt = db.prepare(`SELECT project_id FROM books WHERE id = ?`);
    const book = bookStmt.get(bookId) as { project_id: string } | undefined;
    const projectId = book?.project_id;

    // Get all chapters for the book
    const chaptersStmt = db.prepare(`
      SELECT c.id, c.chapter_number, c.content, c.title,
             b.title as book_title, b.genre
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.book_id = ?
        AND c.content IS NOT NULL
        ${VERSION_AWARE_CHAPTER_FILTER}
      ORDER BY c.chapter_number ASC
    `);

    const chapters = chaptersStmt.all(bookId) as any[];

    if (chapters.length === 0) {
      throw new Error('No chapters found for book');
    }

    logger.info({ bookId, chapterCount: chapters.length }, '[TensionArcValidator] Analysing chapter tension levels');

    // Analyse tension for each chapter
    const sceneScores: SceneTensionScore[] = [];

    for (const chapter of chapters) {
      // Get first 500 words to assess tension without overwhelming the AI
      const words = chapter.content.split(/\s+/);
      const excerpt = words.slice(0, 500).join(' ');

      const systemPrompt = `You are an expert editor analysing narrative tension for pacing assessment.

Rate the tension level of this chapter excerpt on a scale of 1-10:
- 1-2: Minimal tension, pure exposition or reflection
- 3-4: Low tension, setup or character development
- 5-6: Moderate tension, minor conflict or intrigue
- 7-8: High tension, significant conflict or stakes
- 9-10: Maximum tension, climax or crisis

Respond with JSON only:
{
  "tensionLevel": 1-10,
  "assessment": "brief explanation of tension level"
}`;

      const userPrompt = `Rate the tension level of this chapter excerpt.

CHAPTER ${chapter.chapter_number}: ${chapter.title || 'Untitled'}

EXCERPT:
${excerpt}

Provide your analysis as JSON.`;

      const response = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.5,
        tracking: {
          requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
          projectId: projectId,
          bookId: bookId,
          chapterId: chapter.id,
          contextSummary: `Tension analysis for chapter ${chapter.chapter_number}`,
        },
      });

      const result = extractJsonObject<{ tensionLevel: number; assessment: string }>(response.content);

      if (!result) {
        logger.warn({ chapterId: chapter.id, chapterNumber: chapter.chapter_number }, '[TensionArcValidator] Failed to extract tension score, using default');
        sceneScores.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          tensionLevel: 5,
          assessment: 'Unable to analyse tension',
        });
        continue;
      }

      sceneScores.push({
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        tensionLevel: result.tensionLevel,
        assessment: result.assessment,
      });
    }

    // Detect plateaus (2+ consecutive chapters at same tension level)
    const plateaus: TensionPlateau[] = [];
    let plateauStart: number | null = null;
    let plateauLevel: number | null = null;

    for (let i = 0; i < sceneScores.length; i++) {
      const current = sceneScores[i];
      const next = sceneScores[i + 1];

      if (next && current.tensionLevel === next.tensionLevel) {
        // Start or continue plateau
        if (plateauStart === null) {
          plateauStart = current.chapterNumber;
          plateauLevel = current.tensionLevel;
        }
      } else if (plateauStart !== null && plateauLevel !== null) {
        // End plateau
        plateaus.push({
          startChapter: plateauStart,
          endChapter: current.chapterNumber,
          tensionLevel: plateauLevel,
          recommendation: this.generatePlateauRecommendation(plateauLevel, current.chapterNumber - plateauStart + 1),
        });
        plateauStart = null;
        plateauLevel = null;
      }
    }

    // Calculate overall arc score
    const overallArcScore = this.calculateOverallArcScore(sceneScores);

    // Prepare graph data
    const graphData = sceneScores.map((score) => ({
      chapter: score.chapterNumber,
      tension: score.tensionLevel,
    }));

    logger.info({
      bookId,
      overallArcScore,
      plateauCount: plateaus.length,
    }, '[TensionArcValidator] Tension arc analysis complete');

    return {
      sceneScores,
      plateaus,
      overallArcScore,
      graphData,
    };
  }

  /**
   * Generate recommendation for a tension plateau
   */
  private generatePlateauRecommendation(tensionLevel: number, duration: number): string {
    if (tensionLevel <= 3 && duration >= 3) {
      return `Low tension plateau detected across ${duration} chapters. Consider adding conflict, raising stakes, or introducing complications to increase momentum.`;
    } else if (tensionLevel >= 7 && duration >= 3) {
      return `High tension plateau detected across ${duration} chapters. Readers may experience fatigue. Consider adding a brief respite or quieter moment for pacing variation.`;
    } else if (duration >= 4) {
      return `Extended plateau of ${duration} chapters at tension level ${tensionLevel}. Vary the tension to maintain reader engagement - peaks and valleys create better pacing than flat lines.`;
    }
    return `Plateau of ${duration} chapters at tension level ${tensionLevel}. Consider varying tension across scenes for better pacing.`;
  }

  /**
   * Calculate overall arc score based on tension variation and trajectory
   */
  private calculateOverallArcScore(scores: SceneTensionScore[]): number {
    if (scores.length === 0) return 0;

    // Good tension arcs have:
    // 1. Variation (not flat)
    // 2. General upward trajectory
    // 3. Strategic peaks and valleys

    // Calculate variation (standard deviation)
    const mean = scores.reduce((sum, s) => sum + s.tensionLevel, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s.tensionLevel - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Low variation = flat arc = lower score
    const variationScore = Math.min(10, stdDev * 2.5);

    // Check for upward trend (last third should be higher than first third)
    const firstThird = scores.slice(0, Math.floor(scores.length / 3));
    const lastThird = scores.slice(-Math.floor(scores.length / 3));
    const firstThirdAvg = firstThird.reduce((sum, s) => sum + s.tensionLevel, 0) / firstThird.length;
    const lastThirdAvg = lastThird.reduce((sum, s) => sum + s.tensionLevel, 0) / lastThird.length;
    const trendScore = lastThirdAvg > firstThirdAvg ? 10 : 5;

    // Combine scores (weighted average)
    const overall = (variationScore * 0.6 + trendScore * 0.4);

    return Math.round(overall * 10) / 10; // Round to 1 decimal
  }
}

// Export singleton instance
export const tensionArcValidatorService = new TensionArcValidatorService();
