import type { VoiceSample } from '../shared/types/index.js';

/**
 * Service for analyzing text samples to extract prose style patterns
 * Sprint 18: Voice Sample Analyzer
 */

interface TextMetrics {
  avgSentenceLength: number;
  sentenceLengthVariance: number;
  fleschKincaidScore: number;
  complexWordRatio: number;
}

interface StylePatterns {
  commonSentenceStructures: string[];
  wordPatterns: string[];
  rhythmNotes: string[];
}

export class ProseAnalyzer {
  /**
   * Analyze a text sample and extract prose style metrics and patterns
   */
  static analyzeVoiceSample(text: string): Partial<VoiceSample> {
    const metrics = this.calculateTextMetrics(text);
    const patterns = this.extractStylePatterns(text);

    return {
      avg_sentence_length: metrics.avgSentenceLength,
      sentence_length_variance: metrics.sentenceLengthVariance,
      flesch_kincaid_score: metrics.fleschKincaidScore,
      complex_word_ratio: metrics.complexWordRatio,
      extracted_patterns: {
        common_sentence_structures: patterns.commonSentenceStructures,
        word_patterns: patterns.wordPatterns,
        rhythm_notes: patterns.rhythmNotes,
      },
    };
  }

  /**
   * Calculate readability and structural metrics for text
   */
  static calculateTextMetrics(text: string): TextMetrics {
    const sentences = this.splitIntoSentences(text);
    const words = this.splitIntoWords(text);
    const syllables = this.countTotalSyllables(words);

    // Average sentence length
    const avgSentenceLength = words.length / (sentences.length || 1);

    // Sentence length variance
    const sentenceLengths = sentences.map(s => this.splitIntoWords(s).length);
    const variance = this.calculateVariance(sentenceLengths);

    // Flesch-Kincaid Reading Ease
    const fleschKincaidScore = this.calculateFleschKincaid(words.length, sentences.length, syllables);

    // Complex word ratio (3+ syllables)
    const complexWords = words.filter(w => this.countSyllables(w) >= 3);
    const complexWordRatio = complexWords.length / (words.length || 1);

    return {
      avgSentenceLength,
      sentenceLengthVariance: variance,
      fleschKincaidScore,
      complexWordRatio,
    };
  }

  /**
   * Extract stylistic patterns from text
   */
  private static extractStylePatterns(text: string): StylePatterns {
    const sentences = this.splitIntoSentences(text);

    // Identify common sentence structures
    const structures = sentences.map(s => this.analyzeSentenceStructure(s));
    const structureCounts = this.countPatterns(structures);
    const commonStructures = Object.entries(structureCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Identify word patterns
    const words = this.splitIntoWords(text);
    const wordPatterns = this.identifyWordPatterns(words);

    // Analyze rhythm
    const rhythmNotes = this.analyzeRhythm(sentences);

    return {
      commonSentenceStructures: commonStructures,
      wordPatterns,
      rhythmNotes,
    };
  }

  /**
   * Analyze the structure of a sentence
   */
  private static analyzeSentenceStructure(sentence: string): string {
    const words = this.splitIntoWords(sentence);
    const wordCount = words.length;

    // Classify by length
    let lengthClass = 'medium';
    if (wordCount < 10) lengthClass = 'short';
    else if (wordCount > 20) lengthClass = 'long';

    // Check for clauses (commas, semicolons, dashes)
    const clauseMarkers = (sentence.match(/[,;—–]/g) || []).length;
    const clauseClass = clauseMarkers === 0 ? 'simple' : clauseMarkers === 1 ? 'compound' : 'complex';

    // Check for specific patterns
    const hasColon = sentence.includes(':');
    const hasQuestion = sentence.includes('?');
    const hasExclamation = sentence.includes('!');

    let pattern = `${lengthClass}_${clauseClass}`;
    if (hasColon) pattern += '_list';
    if (hasQuestion) pattern += '_question';
    if (hasExclamation) pattern += '_exclamation';

    return pattern;
  }

  /**
   * Identify common word patterns
   */
  private static identifyWordPatterns(words: string[]): string[] {
    const patterns: string[] = [];

    // Average word length
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);
    if (avgWordLength < 4) patterns.push('concise_vocabulary');
    else if (avgWordLength > 6) patterns.push('elaborate_vocabulary');

    // Repetition patterns
    const wordCounts = this.countPatterns(words.map(w => w.toLowerCase()));
    const repeatedWords = Object.entries(wordCounts).filter(([, count]) => (count as number) > 2);
    if (repeatedWords.length > 3) patterns.push('repetitive_for_emphasis');

    // Check for literary devices
    const text = words.join(' ');
    if (text.match(/like|as .* as/i)) patterns.push('uses_similes');
    if (text.match(/is|are|was|were .* (a |an |the )/i)) patterns.push('uses_metaphors');

    return patterns;
  }

  /**
   * Analyze rhythm and flow
   */
  private static analyzeRhythm(sentences: string[]): string[] {
    const notes: string[] = [];

    // Sentence length variation
    const lengths = sentences.map(s => this.splitIntoWords(s).length);
    const variance = this.calculateVariance(lengths);

    if (variance < 10) notes.push('consistent_sentence_rhythm');
    else if (variance > 50) notes.push('highly_varied_rhythm');
    else notes.push('moderate_rhythm_variation');

    // Check for rhythm patterns
    const shortCount = lengths.filter(l => l < 10).length;
    const longCount = lengths.filter(l => l > 20).length;

    if (shortCount > sentences.length * 0.6) notes.push('predominantly_short_sentences');
    if (longCount > sentences.length * 0.6) notes.push('predominantly_long_sentences');

    return notes;
  }

  /**
   * Calculate Flesch-Kincaid Reading Ease score
   * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
   * Higher score = easier to read (0-100)
   */
  private static calculateFleschKincaid(wordCount: number, sentenceCount: number, syllableCount: number): number {
    if (wordCount === 0 || sentenceCount === 0) return 0;

    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;

    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (could be improved with more sophisticated NLP)
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

  /**
   * Count syllables in a word (simplified algorithm)
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
   * Calculate variance of an array of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squareDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Count occurrences of patterns
   */
  private static countPatterns<T extends string>(items: T[]): Record<string, number> {
    return items.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Check if text matches a prose style
   */
  static checkStyleConsistency(text: string, targetStyle: any): {
    overallScore: number;
    sentenceConsistency: number;
    vocabularyConsistency: number;
    pacingConsistency: number;
    deviations: any[];
  } {
    const metrics = this.calculateTextMetrics(text);
    const deviations: any[] = [];

    // Check sentence length
    let sentenceConsistency = 100;
    const targetAvgLength = this.getTargetSentenceLength(targetStyle.sentence_length_preference);
    const lengthDiff = Math.abs(metrics.avgSentenceLength - targetAvgLength);
    if (lengthDiff > 5) {
      sentenceConsistency -= lengthDiff * 2;
      deviations.push({
        type: 'sentence_length',
        severity: lengthDiff > 10 ? 'major' : 'moderate',
        description: `Average sentence length (${metrics.avgSentenceLength.toFixed(1)}) differs from target (${targetAvgLength})`,
      });
    }

    // Check readability
    let vocabularyConsistency = 100;
    const readabilityDiff = Math.abs(metrics.fleschKincaidScore - targetStyle.flesch_kincaid_target);
    if (readabilityDiff > 10) {
      vocabularyConsistency -= readabilityDiff;
      deviations.push({
        type: 'readability',
        severity: readabilityDiff > 20 ? 'major' : 'moderate',
        description: `Readability score (${metrics.fleschKincaidScore.toFixed(1)}) differs from target (${targetStyle.flesch_kincaid_target})`,
      });
    }

    // Pacing consistency (simplified - would need more context)
    const pacingConsistency = 85; // Placeholder

    const overallScore = (sentenceConsistency + vocabularyConsistency + pacingConsistency) / 3;

    return {
      overallScore: Math.max(0, overallScore),
      sentenceConsistency: Math.max(0, sentenceConsistency),
      vocabularyConsistency: Math.max(0, vocabularyConsistency),
      pacingConsistency,
      deviations,
    };
  }

  /**
   * Get target sentence length based on preference
   */
  private static getTargetSentenceLength(preference: string): number {
    switch (preference) {
      case 'short': return 12;
      case 'medium': return 18;
      case 'long': return 25;
      case 'varied': return 18;
      default: return 18;
    }
  }
}
