/**
 * Sentence Variety Report Service
 * Sprint 40: Analyse sentence structure patterns for monotony detection
 */

import type { SentenceVarietyReport } from './types.js';

export class SentenceVarietyService {
  /**
   * Generate sentence variety report for text
   */
  static generateReport(text: string): SentenceVarietyReport {
    const sentences = this.splitIntoSentences(text);

    // Analyse length distribution
    const lengthDistribution = this.analyseLengthDistribution(sentences);

    // Calculate statistics
    const lengths = sentences.map(s => this.splitIntoWords(s).length);
    const avgLength = lengths.reduce((sum, l) => sum + l, 0) / (lengths.length || 1);
    const variance = this.calculateVariance(lengths);

    // Analyse structure patterns
    const structurePatterns = this.analyseStructurePatterns(sentences);

    // Analyse sentence start patterns
    const startPatterns = this.analyseStartPatterns(sentences);

    // Calculate variety score (0-100)
    const varietyScore = this.calculateVarietyScore(lengthDistribution, variance, startPatterns);

    // Assess overall quality
    const assessment = this.assessVariety(varietyScore);

    return {
      lengthDistribution,
      avgLength: Math.round(avgLength * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      structurePatterns,
      startPatterns,
      varietyScore,
      assessment,
    };
  }

  /**
   * Analyse distribution of sentence lengths
   */
  private static analyseLengthDistribution(sentences: string[]): {
    short: number;
    medium: number;
    long: number;
    veryLong: number;
  } {
    const distribution = {
      short: 0, // < 10 words
      medium: 0, // 10-20 words
      long: 0, // 20-30 words
      veryLong: 0, // 30+ words
    };

    sentences.forEach(sentence => {
      const wordCount = this.splitIntoWords(sentence).length;
      if (wordCount < 10) distribution.short++;
      else if (wordCount < 20) distribution.medium++;
      else if (wordCount < 30) distribution.long++;
      else distribution.veryLong++;
    });

    // Convert to percentages
    const total = sentences.length || 1;
    return {
      short: Math.round((distribution.short / total) * 100),
      medium: Math.round((distribution.medium / total) * 100),
      long: Math.round((distribution.long / total) * 100),
      veryLong: Math.round((distribution.veryLong / total) * 100),
    };
  }

  /**
   * Analyse sentence structure patterns (simple/compound/complex)
   */
  private static analyseStructurePatterns(sentences: string[]): {
    simple: number;
    compound: number;
    complex: number;
  } {
    const patterns = {
      simple: 0,
      compound: 0,
      complex: 0,
    };

    sentences.forEach(sentence => {
      const clauseMarkers = (sentence.match(/[,;—–]/g) || []).length;

      if (clauseMarkers === 0) {
        patterns.simple++;
      } else if (clauseMarkers === 1) {
        patterns.compound++;
      } else {
        patterns.complex++;
      }
    });

    // Convert to percentages
    const total = sentences.length || 1;
    return {
      simple: Math.round((patterns.simple / total) * 100),
      compound: Math.round((patterns.compound / total) * 100),
      complex: Math.round((patterns.complex / total) * 100),
    };
  }

  /**
   * Analyse how sentences start (first word patterns)
   */
  private static analyseStartPatterns(sentences: string[]): { word: string; count: number }[] {
    const startWords: Record<string, number> = {};

    sentences.forEach(sentence => {
      const words = this.splitIntoWords(sentence);
      if (words.length === 0) return;

      const firstWord = words[0].toLowerCase();
      // Ignore very common words
      const ignoreWords = ['the', 'a', 'an', 'and', 'but', 'or'];
      if (!ignoreWords.includes(firstWord)) {
        startWords[firstWord] = (startWords[firstWord] || 0) + 1;
      }
    });

    // Sort by frequency and return top 10
    return Object.entries(startWords)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate variety score (0-100)
   * Higher score = more varied sentence structure
   */
  private static calculateVarietyScore(
    lengthDistribution: { short: number; medium: number; long: number; veryLong: number },
    variance: number,
    startPatterns: { word: string; count: number }[]
  ): number {
    let score = 100;

    // Penalise if one length category dominates (> 70%)
    const maxCategory = Math.max(
      lengthDistribution.short,
      lengthDistribution.medium,
      lengthDistribution.long,
      lengthDistribution.veryLong
    );
    if (maxCategory > 70) score -= (maxCategory - 70) * 2;

    // Penalise low variance (all sentences similar length)
    if (variance < 10) score -= (10 - variance) * 3;

    // Penalise if same start word used too frequently
    if (startPatterns.length > 0 && startPatterns[0].count > 5) {
      score -= (startPatterns[0].count - 5) * 2;
    }

    // Reward balanced distribution
    const balance = this.calculateBalance(lengthDistribution);
    score += balance * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate how balanced the distribution is (0-1)
   */
  private static calculateBalance(distribution: {
    short: number;
    medium: number;
    long: number;
    veryLong: number;
  }): number {
    // Ideal distribution: 30% short, 40% medium, 25% long, 5% very long
    const ideal = { short: 30, medium: 40, long: 25, veryLong: 5 };

    const deviation =
      Math.abs(distribution.short - ideal.short) +
      Math.abs(distribution.medium - ideal.medium) +
      Math.abs(distribution.long - ideal.long) +
      Math.abs(distribution.veryLong - ideal.veryLong);

    // Lower deviation = better balance (max deviation = 200)
    return Math.max(0, 1 - deviation / 200);
  }

  /**
   * Assess variety quality
   */
  private static assessVariety(
    score: number
  ): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squareDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Split text into words
   */
  private static splitIntoWords(text: string): string[] {
    return text
      .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }
}
