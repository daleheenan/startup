import db from '../db/connection.js';
import { claudeService } from './claude.service.js';
import { randomUUID } from 'crypto';

/**
 * Analytics calculation interfaces
 */
export interface ChapterAnalytics {
  id: string;
  chapterId: string;
  pacingScore: number;
  pacingData: ScenePacingData;
  characterScreenTime: CharacterScreenTime;
  dialoguePercentage: number;
  dialogueWordCount: number;
  narrativeWordCount: number;
  readabilityScore: number;
  avgSentenceLength: number;
  complexWordPercentage: number;
  tensionScore: number;
  tensionArc: TensionArc;
}

export interface ScenePacingData {
  scenePacing: Array<{
    scene: string;
    pace: 'slow' | 'medium' | 'fast';
    description: string;
  }>;
  overallPace: 'slow' | 'medium' | 'fast';
}

export interface CharacterScreenTime {
  [characterName: string]: {
    appearances: number;
    wordCount: number;
    povTime: number; // Percentage of chapter from their POV
  };
}

export interface TensionArc {
  points: Array<{
    position: number; // 0-100 percentage through chapter
    tension: number; // 0-100 tension level
    description: string;
  }>;
}

export interface BookAnalytics {
  id: string;
  bookId: string;
  avgPacingScore: number;
  pacingConsistency: number;
  characterBalance: any;
  avgDialoguePercentage: number;
  avgReadabilityScore: number;
  overallTensionArc: any;
  genreComparison: any;
}

export interface GenreBenchmark {
  genre: string;
  typicalPacingScore: number;
  typicalDialoguePercentage: number;
  typicalReadabilityScore: number;
  typicalTensionPattern: any;
  typicalCharacterCount: number;
  typicalPovStructure: any;
}

/**
 * AnalyticsService calculates writing quality metrics and insights
 */
export class AnalyticsService {
  /**
   * Calculate all analytics for a chapter
   */
  async calculateChapterAnalytics(chapterId: string): Promise<ChapterAnalytics> {
    console.log(`[AnalyticsService] Calculating analytics for chapter ${chapterId}`);

    const chapter = this.getChapterData(chapterId);
    if (!chapter.content) {
      throw new Error('Chapter has no content to analyze');
    }

    // Calculate basic metrics first (no AI needed)
    const dialogueMetrics = this.calculateDialogueRatio(chapter.content);
    const readabilityMetrics = this.calculateReadability(chapter.content);

    // Use AI for complex analysis
    const [pacingAnalysis, characterAnalysis, tensionAnalysis] = await Promise.all([
      this.analyzePacing(chapter),
      this.analyzeCharacterScreenTime(chapter),
      this.analyzeTensionArc(chapter),
    ]);

    // Store results
    const analyticsId = randomUUID();
    const analytics: ChapterAnalytics = {
      id: analyticsId,
      chapterId,
      pacingScore: pacingAnalysis.score,
      pacingData: pacingAnalysis.data,
      characterScreenTime: characterAnalysis,
      dialoguePercentage: dialogueMetrics.percentage,
      dialogueWordCount: dialogueMetrics.dialogueWords,
      narrativeWordCount: dialogueMetrics.narrativeWords,
      readabilityScore: readabilityMetrics.score,
      avgSentenceLength: readabilityMetrics.avgSentenceLength,
      complexWordPercentage: readabilityMetrics.complexWordPercentage,
      tensionScore: tensionAnalysis.score,
      tensionArc: tensionAnalysis.arc,
    };

    this.saveChapterAnalytics(analytics);

    console.log(`[AnalyticsService] Analytics complete for chapter ${chapterId}`);
    return analytics;
  }

  /**
   * Calculate dialogue vs narrative ratio (non-AI)
   */
  private calculateDialogueRatio(content: string): {
    percentage: number;
    dialogueWords: number;
    narrativeWords: number;
  } {
    // Match dialogue in quotes
    const dialogueRegex = /"([^"]*)"/g;
    let dialogueWords = 0;
    let match;

    while ((match = dialogueRegex.exec(content)) !== null) {
      dialogueWords += match[1].split(/\s+/).filter(w => w.length > 0).length;
    }

    const totalWords = content.split(/\s+/).filter(w => w.length > 0).length;
    const narrativeWords = totalWords - dialogueWords;
    const percentage = totalWords > 0 ? (dialogueWords / totalWords) * 100 : 0;

    return {
      percentage: Math.round(percentage * 10) / 10,
      dialogueWords,
      narrativeWords,
    };
  }

  /**
   * Calculate readability metrics (non-AI)
   * Uses simplified Flesch Reading Ease formula
   */
  private calculateReadability(content: string): {
    score: number;
    avgSentenceLength: number;
    complexWordPercentage: number;
  } {
    // Split into sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSyllablesPerWord = words.length > 0 ? syllables / words.length : 0;

    // Flesch Reading Ease: 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
    const fleschScore = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    const normalizedScore = Math.max(0, Math.min(100, fleschScore));

    // Complex words (3+ syllables)
    const complexWords = words.filter(w => this.countSyllables(w) >= 3).length;
    const complexWordPercentage = words.length > 0 ? (complexWords / words.length) * 100 : 0;

    return {
      score: Math.round(normalizedScore * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
    };
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevWasVowel) {
        count++;
      }
      prevWasVowel = isVowel;
    }

    // Silent 'e'
    if (word.endsWith('e')) {
      count--;
    }

    return Math.max(1, count);
  }

  /**
   * Analyze pacing using AI
   */
  private async analyzePacing(chapter: any): Promise<{
    score: number;
    data: ScenePacingData;
  }> {
    const systemPrompt = `You are a pacing analysis expert for fiction writing. Analyze the pacing of this chapter.

Pacing refers to the speed at which the story moves:
- **Fast pacing**: Action, dialogue, short sentences, rapid events
- **Medium pacing**: Balanced mix of action and reflection
- **Slow pacing**: Description, introspection, world-building, backstory

Analyze the chapter scene by scene and provide:
1. Pace for each identifiable scene
2. Overall pacing quality score (0-100, where 50 is balanced, <50 is too slow, >50 skews fast)
3. Whether pacing is appropriate for the content`;

    const userPrompt = `Analyze the pacing of this chapter.

CHAPTER NUMBER: ${chapter.chapter_number}
CONTENT:
${chapter.content}

Provide your analysis as JSON:
{
  "scenePacing": [
    {
      "scene": "Brief scene description",
      "pace": "slow|medium|fast",
      "description": "Why this pace?"
    }
  ],
  "overallPace": "slow|medium|fast",
  "pacingScore": <0-100>,
  "pacingAssessment": "Brief assessment of pacing quality"
}

Output only valid JSON:`;

    const response = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.5,
    });

    const analysis = this.parseJSON(response);

    return {
      score: analysis.pacingScore || 50,
      data: {
        scenePacing: analysis.scenePacing || [],
        overallPace: analysis.overallPace || 'medium',
      },
    };
  }

  /**
   * Analyze character screen time using AI
   */
  private async analyzeCharacterScreenTime(chapter: any): Promise<CharacterScreenTime> {
    const systemPrompt = `You are a character presence analyzer. Track which characters appear in this chapter and estimate their "screen time."

For each character that appears:
1. Count their scenes/appearances
2. Estimate word count devoted to them (dialogue + actions + descriptions about them)
3. Estimate if they have POV time (percentage of chapter from their perspective)`;

    const userPrompt = `Analyze character presence in this chapter.

STORY BIBLE (known characters):
${JSON.stringify(chapter.story_bible, null, 2)}

CHAPTER CONTENT:
${chapter.content}

Provide analysis as JSON:
{
  "characters": {
    "Character Name": {
      "appearances": <number of scenes they appear in>,
      "wordCount": <estimated words about this character>,
      "povTime": <0-100 percentage of chapter from their POV>
    }
  }
}

Output only valid JSON:`;

    const response = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.3,
    });

    const analysis = this.parseJSON(response);
    return analysis.characters || {};
  }

  /**
   * Analyze tension arc using AI
   */
  private async analyzeTensionArc(chapter: any): Promise<{
    score: number;
    arc: TensionArc;
  }> {
    const systemPrompt = `You are a story tension analyzer. Analyze how tension rises and falls throughout this chapter.

Tension includes:
- Conflict and stakes
- Uncertainty and suspense
- Emotional intensity
- Urgency and danger

Track tension level (0-100) at key points throughout the chapter.`;

    const userPrompt = `Analyze the tension arc of this chapter.

CHAPTER CONTENT:
${chapter.content}

Divide the chapter into 5-10 key moments and rate tension at each point.

Provide analysis as JSON:
{
  "points": [
    {
      "position": <0-100 percentage through chapter>,
      "tension": <0-100 tension level>,
      "description": "What's happening here"
    }
  ],
  "averageTension": <0-100>,
  "tensionVariation": "Does tension build, stay flat, oscillate?"
}

Output only valid JSON:`;

    const response = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.5,
    });

    const analysis = this.parseJSON(response);

    return {
      score: analysis.averageTension || 50,
      arc: {
        points: analysis.points || [],
      },
    };
  }

  /**
   * Calculate book-level analytics
   */
  async calculateBookAnalytics(bookId: string): Promise<BookAnalytics> {
    console.log(`[AnalyticsService] Calculating book analytics for ${bookId}`);

    // Get all chapter analytics
    const stmt = db.prepare<[string], any>(`
      SELECT ca.* FROM chapter_analytics ca
      JOIN chapters c ON ca.chapter_id = c.id
      WHERE c.book_id = ?
    `);
    const chapterAnalytics = stmt.all(bookId);

    if (chapterAnalytics.length === 0) {
      throw new Error('No chapter analytics found. Calculate chapter analytics first.');
    }

    // Calculate averages
    const avgPacingScore =
      chapterAnalytics.reduce((sum, ca) => sum + (ca.pacing_score || 0), 0) / chapterAnalytics.length;
    const avgDialoguePercentage =
      chapterAnalytics.reduce((sum, ca) => sum + (ca.dialogue_percentage || 0), 0) / chapterAnalytics.length;
    const avgReadabilityScore =
      chapterAnalytics.reduce((sum, ca) => sum + (ca.readability_score || 0), 0) / chapterAnalytics.length;

    // Calculate pacing consistency (lower variance = more consistent)
    const pacingVariance =
      chapterAnalytics.reduce((sum, ca) => sum + Math.pow((ca.pacing_score || 0) - avgPacingScore, 2), 0) /
      chapterAnalytics.length;
    const pacingConsistency = Math.max(0, 100 - Math.sqrt(pacingVariance));

    // Aggregate character balance
    const characterBalance = this.aggregateCharacterBalance(chapterAnalytics);

    // Get genre comparison
    const bookData = this.getBookData(bookId);
    const genreComparison = await this.compareToGenreBenchmarks(bookId, bookData.genre, {
      avgPacingScore,
      avgDialoguePercentage,
      avgReadabilityScore,
    });

    // Build overall tension arc
    const overallTensionArc = this.buildOverallTensionArc(chapterAnalytics);

    const analyticsId = randomUUID();
    const analytics: BookAnalytics = {
      id: analyticsId,
      bookId,
      avgPacingScore: Math.round(avgPacingScore * 10) / 10,
      pacingConsistency: Math.round(pacingConsistency * 10) / 10,
      characterBalance,
      avgDialoguePercentage: Math.round(avgDialoguePercentage * 10) / 10,
      avgReadabilityScore: Math.round(avgReadabilityScore * 10) / 10,
      overallTensionArc,
      genreComparison,
    };

    this.saveBookAnalytics(analytics);

    console.log(`[AnalyticsService] Book analytics complete for ${bookId}`);
    return analytics;
  }

  /**
   * Aggregate character balance across chapters
   */
  private aggregateCharacterBalance(chapterAnalytics: any[]): any {
    const characterTotals: any = {};

    for (const ca of chapterAnalytics) {
      const screenTime = ca.character_screen_time ? JSON.parse(ca.character_screen_time) : {};
      for (const [char, data] of Object.entries(screenTime)) {
        if (!characterTotals[char]) {
          characterTotals[char] = { appearances: 0, wordCount: 0, povTime: 0 };
        }
        characterTotals[char].appearances += (data as any).appearances || 0;
        characterTotals[char].wordCount += (data as any).wordCount || 0;
        characterTotals[char].povTime += (data as any).povTime || 0;
      }
    }

    // Calculate percentages
    const totalAppearances = Object.values(characterTotals).reduce(
      (sum: number, c: any) => sum + c.appearances,
      0
    );
    const totalWords = Object.values(characterTotals).reduce((sum: number, c: any) => sum + c.wordCount, 0);

    for (const char of Object.keys(characterTotals)) {
      characterTotals[char].appearancePercentage =
        totalAppearances > 0 ? (characterTotals[char].appearances / totalAppearances) * 100 : 0;
      characterTotals[char].wordPercentage =
        totalWords > 0 ? (characterTotals[char].wordCount / totalWords) * 100 : 0;
    }

    return characterTotals;
  }

  /**
   * Build overall book tension arc
   */
  private buildOverallTensionArc(chapterAnalytics: any[]): any {
    const chapterTensions = chapterAnalytics.map((ca, index) => ({
      chapter: index + 1,
      avgTension: ca.tension_score || 50,
      arc: ca.tension_arc ? JSON.parse(ca.tension_arc) : null,
    }));

    return {
      chapterTensions,
      pattern: this.identifyTensionPattern(chapterTensions),
    };
  }

  /**
   * Identify tension pattern
   */
  private identifyTensionPattern(chapterTensions: any[]): string {
    if (chapterTensions.length < 3) return 'insufficient_data';

    const firstThird = chapterTensions.slice(0, Math.floor(chapterTensions.length / 3));
    const lastThird = chapterTensions.slice(Math.floor((chapterTensions.length * 2) / 3));

    const avgFirst = firstThird.reduce((sum, ct) => sum + ct.avgTension, 0) / firstThird.length;
    const avgLast = lastThird.reduce((sum, ct) => sum + ct.avgTension, 0) / lastThird.length;

    if (avgLast > avgFirst + 15) return 'escalating';
    if (avgLast < avgFirst - 15) return 'declining';
    return 'oscillating';
  }

  /**
   * Compare book metrics to genre benchmarks
   */
  private async compareToGenreBenchmarks(
    bookId: string,
    genre: string,
    metrics: { avgPacingScore: number; avgDialoguePercentage: number; avgReadabilityScore: number }
  ): Promise<any> {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM genre_benchmarks WHERE genre = ?
    `);
    const benchmark = stmt.get(genre.toLowerCase());

    if (!benchmark) {
      return {
        genre,
        comparison: 'No benchmark data available for this genre',
      };
    }

    const comparison = {
      genre,
      pacing: {
        bookValue: metrics.avgPacingScore,
        genreTypical: benchmark.typical_pacing_score,
        difference: metrics.avgPacingScore - benchmark.typical_pacing_score,
        assessment: this.assessDifference(metrics.avgPacingScore, benchmark.typical_pacing_score, 'pacing'),
      },
      dialogue: {
        bookValue: metrics.avgDialoguePercentage,
        genreTypical: benchmark.typical_dialogue_percentage,
        difference: metrics.avgDialoguePercentage - benchmark.typical_dialogue_percentage,
        assessment: this.assessDifference(
          metrics.avgDialoguePercentage,
          benchmark.typical_dialogue_percentage,
          'dialogue'
        ),
      },
      readability: {
        bookValue: metrics.avgReadabilityScore,
        genreTypical: benchmark.typical_readability_score,
        difference: metrics.avgReadabilityScore - benchmark.typical_readability_score,
        assessment: this.assessDifference(
          metrics.avgReadabilityScore,
          benchmark.typical_readability_score,
          'readability'
        ),
      },
    };

    return comparison;
  }

  /**
   * Assess difference from genre norm
   */
  private assessDifference(bookValue: number, genreValue: number, metric: string): string {
    const diff = bookValue - genreValue;
    const threshold = metric === 'dialogue' ? 10 : 15;

    if (Math.abs(diff) < threshold) return 'typical_for_genre';
    if (diff > 0) return `higher_than_genre`;
    return `lower_than_genre`;
  }

  /**
   * Get chapter data
   */
  private getChapterData(chapterId: string): any {
    const stmt = db.prepare<[string], any>(`
      SELECT c.*, p.story_bible, p.story_dna
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      JOIN projects p ON b.project_id = p.id
      WHERE c.id = ?
    `);
    const row = stmt.get(chapterId);
    if (!row) throw new Error(`Chapter not found: ${chapterId}`);

    return {
      ...row,
      story_bible: row.story_bible ? JSON.parse(row.story_bible) : null,
      story_dna: row.story_dna ? JSON.parse(row.story_dna) : null,
    };
  }

  /**
   * Get book data
   */
  private getBookData(bookId: string): any {
    const stmt = db.prepare<[string], any>(`
      SELECT b.*, p.genre
      FROM books b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = ?
    `);
    const row = stmt.get(bookId);
    if (!row) throw new Error(`Book not found: ${bookId}`);
    return row;
  }

  /**
   * Save chapter analytics to database
   */
  private saveChapterAnalytics(analytics: ChapterAnalytics): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO chapter_analytics (
        id, chapter_id, pacing_score, pacing_data, character_screen_time,
        dialogue_percentage, dialogue_word_count, narrative_word_count,
        readability_score, avg_sentence_length, complex_word_percentage,
        tension_score, tension_arc, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analytics.id,
      analytics.chapterId,
      analytics.pacingScore,
      JSON.stringify(analytics.pacingData),
      JSON.stringify(analytics.characterScreenTime),
      analytics.dialoguePercentage,
      analytics.dialogueWordCount,
      analytics.narrativeWordCount,
      analytics.readabilityScore,
      analytics.avgSentenceLength,
      analytics.complexWordPercentage,
      analytics.tensionScore,
      JSON.stringify(analytics.tensionArc),
      new Date().toISOString()
    );
  }

  /**
   * Save book analytics to database
   */
  private saveBookAnalytics(analytics: BookAnalytics): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO book_analytics (
        id, book_id, avg_pacing_score, pacing_consistency, character_balance,
        avg_dialogue_percentage, avg_readability_score, overall_tension_arc,
        genre_comparison, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analytics.id,
      analytics.bookId,
      analytics.avgPacingScore,
      analytics.pacingConsistency,
      JSON.stringify(analytics.characterBalance),
      analytics.avgDialoguePercentage,
      analytics.avgReadabilityScore,
      JSON.stringify(analytics.overallTensionArc),
      JSON.stringify(analytics.genreComparison),
      new Date().toISOString()
    );
  }

  /**
   * Parse JSON response
   */
  private parseJSON(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || response.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse JSON response');
    }
  }

  /**
   * Get chapter analytics
   */
  getChapterAnalytics(chapterId: string): ChapterAnalytics | null {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM chapter_analytics WHERE chapter_id = ?
    `);
    const row = stmt.get(chapterId);
    if (!row) return null;

    return {
      id: row.id,
      chapterId: row.chapter_id,
      pacingScore: row.pacing_score,
      pacingData: JSON.parse(row.pacing_data),
      characterScreenTime: JSON.parse(row.character_screen_time),
      dialoguePercentage: row.dialogue_percentage,
      dialogueWordCount: row.dialogue_word_count,
      narrativeWordCount: row.narrative_word_count,
      readabilityScore: row.readability_score,
      avgSentenceLength: row.avg_sentence_length,
      complexWordPercentage: row.complex_word_percentage,
      tensionScore: row.tension_score,
      tensionArc: JSON.parse(row.tension_arc),
    };
  }

  /**
   * Get book analytics
   */
  getBookAnalytics(bookId: string): BookAnalytics | null {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM book_analytics WHERE book_id = ?
    `);
    const row = stmt.get(bookId);
    if (!row) return null;

    return {
      id: row.id,
      bookId: row.book_id,
      avgPacingScore: row.avg_pacing_score,
      pacingConsistency: row.pacing_consistency,
      characterBalance: JSON.parse(row.character_balance),
      avgDialoguePercentage: row.avg_dialogue_percentage,
      avgReadabilityScore: row.avg_readability_score,
      overallTensionArc: JSON.parse(row.overall_tension_arc),
      genreComparison: JSON.parse(row.genre_comparison),
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
