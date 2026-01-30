/**
 * Readability Report Service
 * Sprint 40: Comprehensive readability metrics for prose analysis
 */

import { ProseAnalyzer } from '../proseAnalyzer.js';
import type { ReadabilityReport } from './types.js';

export class ReadabilityService {
  /**
   * Generate comprehensive readability report for text
   */
  static generateReport(text: string, genre?: string): ReadabilityReport {
    // Calculate base metrics using existing ProseAnalyzer
    const baseMetrics = ProseAnalyzer.calculateTextMetrics(text);

    // Calculate additional readability metrics
    const sentences = this.splitIntoSentences(text);
    const words = this.splitIntoWords(text);
    const syllables = this.countTotalSyllables(words);

    const fleschKincaidGradeLevel = this.calculateFleschKincaidGrade(
      words.length,
      sentences.length,
      syllables
    );

    const gunningFogIndex = this.calculateGunningFog(
      words.length,
      sentences.length,
      this.countComplexWords(words)
    );

    const automatedReadabilityIndex = this.calculateARI(
      words.length,
      sentences.length,
      this.countTotalCharacters(words)
    );

    const avgWordLength = this.countTotalCharacters(words) / (words.length || 1);

    // Interpret results
    const interpretation = this.interpretReadability(baseMetrics.fleschKincaidScore);
    const targetAudience = this.determineTargetAudience(fleschKincaidGradeLevel);
    const assessment = this.assessReadability(fleschKincaidGradeLevel, genre);

    return {
      fleschKincaidGradeLevel,
      fleschReadingEase: baseMetrics.fleschKincaidScore,
      gunningFogIndex,
      automatedReadabilityIndex,
      complexWordPercentage: baseMetrics.complexWordRatio * 100,
      avgSentenceLength: baseMetrics.avgSentenceLength,
      avgWordLength,
      interpretation,
      targetAudience,
      assessment,
    };
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
   */
  private static calculateFleschKincaidGrade(
    wordCount: number,
    sentenceCount: number,
    syllableCount: number
  ): number {
    if (wordCount === 0 || sentenceCount === 0) return 0;

    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;

    const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return Math.max(0, Math.round(grade * 10) / 10);
  }

  /**
   * Calculate Gunning Fog Index
   * Formula: 0.4 * [(words/sentences) + 100 * (complex words/words)]
   * Complex words = 3+ syllables
   */
  private static calculateGunningFog(
    wordCount: number,
    sentenceCount: number,
    complexWordCount: number
  ): number {
    if (wordCount === 0 || sentenceCount === 0) return 0;

    const avgWordsPerSentence = wordCount / sentenceCount;
    const complexWordPercentage = (complexWordCount / wordCount) * 100;

    const fog = 0.4 * (avgWordsPerSentence + complexWordPercentage);

    return Math.round(fog * 10) / 10;
  }

  /**
   * Calculate Automated Readability Index (ARI)
   * Formula: 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
   */
  private static calculateARI(
    wordCount: number,
    sentenceCount: number,
    characterCount: number
  ): number {
    if (wordCount === 0 || sentenceCount === 0) return 0;

    const avgCharsPerWord = characterCount / wordCount;
    const avgWordsPerSentence = wordCount / sentenceCount;

    const ari = 4.71 * avgCharsPerWord + 0.5 * avgWordsPerSentence - 21.43;

    return Math.max(0, Math.round(ari * 10) / 10);
  }

  /**
   * Interpret Flesch Reading Ease score
   */
  private static interpretReadability(score: number): string {
    if (score >= 90) return 'Very easy to read (5th grade level)';
    if (score >= 80) return 'Easy to read (6th grade level)';
    if (score >= 70) return 'Fairly easy to read (7th grade level)';
    if (score >= 60) return 'Standard reading level (8th-9th grade)';
    if (score >= 50) return 'Fairly difficult to read (10th-12th grade)';
    if (score >= 30) return 'Difficult to read (university level)';
    return 'Very difficult to read (professional/academic)';
  }

  /**
   * Determine target audience based on grade level
   */
  private static determineTargetAudience(gradeLevel: number): string {
    if (gradeLevel <= 6) return 'Middle grade readers (ages 8-12)';
    if (gradeLevel <= 8) return 'Young adult readers (ages 12-15)';
    if (gradeLevel <= 10) return 'General adult fiction readers';
    if (gradeLevel <= 12) return 'Advanced adult readers';
    if (gradeLevel <= 16) return 'University-educated readers';
    return 'Academic/professional readers';
  }

  /**
   * Assess whether readability is appropriate for genre
   */
  private static assessReadability(
    gradeLevel: number,
    genre?: string
  ): 'appropriate' | 'too-simple' | 'too-complex' {
    const genreTargets: Record<string, { min: number; max: number }> = {
      thriller: { min: 6, max: 10 },
      mystery: { min: 7, max: 11 },
      romance: { min: 6, max: 10 },
      fantasy: { min: 7, max: 12 },
      'sci-fi': { min: 8, max: 13 },
      literary: { min: 9, max: 14 },
      horror: { min: 6, max: 10 },
      contemporary: { min: 7, max: 11 },
      default: { min: 7, max: 12 },
    };

    const target = genreTargets[genre?.toLowerCase() || 'default'] || genreTargets.default;

    if (gradeLevel < target.min - 2) return 'too-simple';
    if (gradeLevel > target.max + 2) return 'too-complex';
    return 'appropriate';
  }

  /**
   * Count complex words (3+ syllables, excluding proper nouns and common words)
   */
  private static countComplexWords(words: string[]): number {
    return words.filter(word => {
      // Exclude common exceptions
      const exceptions = ['anywhere', 'everything', 'everyone', 'however', 'whatever'];
      if (exceptions.includes(word.toLowerCase())) return false;

      // Count syllables
      const syllables = this.countSyllables(word);
      return syllables >= 3;
    }).length;
  }

  /**
   * Count total characters in words (excluding punctuation)
   */
  private static countTotalCharacters(words: string[]): number {
    return words.reduce((total, word) => total + word.length, 0);
  }

  /**
   * Count syllables in a word (simplified algorithm from ProseAnalyzer)
   */
  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Remove silent 'e' at end
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]{1,2}/g);
    return vowelGroups ? vowelGroups.length : 1;
  }

  /**
   * Count total syllables in word array
   */
  private static countTotalSyllables(words: string[]): number {
    return words.reduce((total, word) => total + this.countSyllables(word), 0);
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
