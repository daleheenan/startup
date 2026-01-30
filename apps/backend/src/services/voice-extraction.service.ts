import crypto from 'crypto';

/**
 * Voice Extraction Service (Sprint 21 - Custom AI Training)
 *
 * Analyses manuscript samples to extract writing style patterns.
 * Uses statistical and natural language processing techniques to identify:
 * - Sentence length patterns
 * - Vocabulary preferences
 * - Dialogue style
 * - Narrative voice
 * - Paragraph structure
 * - Favourite phrases and constructions
 */

export interface StyleProfile {
  sentencePatterns: {
    avgLength: number;
    variance: number;
    distribution: number[]; // Percentiles: [10th, 25th, 50th, 75th, 90th]
  };
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced' | 'literary';
  vocabularyPreferences: {
    favouriteWords: Array<{ word: string; frequency: number }>;
    avoidedWords: string[];
    uniqueWordRatio: number; // Unique words / total words
  };
  dialogueStyle: 'sparse-tags' | 'frequent-tags' | 'action-tags' | 'mixed';
  dialogueFrequency: number; // Percentage of text that is dialogue
  narrativeVoice: 'first-person' | 'close-third' | 'distant-third' | 'omniscient' | 'second-person';
  paragraphPatterns: {
    avgLength: number; // In sentences
    variance: number;
  };
  favouritePhrases: Array<{ phrase: string; count: number }>;
  avoidPatterns: string[];
  punctuationStyle: {
    dashUsage: 'high' | 'medium' | 'low';
    semicolonUsage: 'high' | 'medium' | 'low';
    ellipsisUsage: 'high' | 'medium' | 'low';
    exclamationUsage: 'high' | 'medium' | 'low';
  };
  tensePreference: 'past' | 'present' | 'mixed';
}

export class VoiceExtractionService {
  /**
   * Analyse a manuscript sample and extract style profile
   */
  extractStyleProfile(manuscriptText: string): StyleProfile {
    // Basic validation
    if (!manuscriptText || manuscriptText.trim().length === 0) {
      throw new Error('Manuscript text is required for style analysis');
    }

    const wordCount = this.countWords(manuscriptText);
    if (wordCount < 500) {
      throw new Error('Manuscript sample must be at least 500 words for accurate analysis');
    }

    // Extract patterns
    const sentencePatterns = this.analyseSentencePatterns(manuscriptText);
    const vocabularyAnalysis = this.analyseVocabulary(manuscriptText);
    const dialogueAnalysis = this.analyseDialogue(manuscriptText);
    const paragraphPatterns = this.analyseParagraphs(manuscriptText);
    const punctuationStyle = this.analysePunctuation(manuscriptText);
    const narrativeVoice = this.detectNarrativeVoice(manuscriptText);
    const tensePreference = this.detectTense(manuscriptText);
    const phrases = this.extractFavouritePhrases(manuscriptText);

    return {
      sentencePatterns,
      vocabularyLevel: vocabularyAnalysis.level,
      vocabularyPreferences: {
        favouriteWords: vocabularyAnalysis.favouriteWords,
        avoidedWords: [],
        uniqueWordRatio: vocabularyAnalysis.uniqueWordRatio,
      },
      dialogueStyle: dialogueAnalysis.style,
      dialogueFrequency: dialogueAnalysis.frequency,
      narrativeVoice,
      paragraphPatterns,
      favouritePhrases: phrases,
      avoidPatterns: [],
      punctuationStyle,
      tensePreference,
    };
  }

  /**
   * Generate SHA-256 hash of text for deduplication
   */
  hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Analyse sentence length patterns
   */
  private analyseSentencePatterns(text: string): StyleProfile['sentencePatterns'] {
    // Split into sentences (basic approach)
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0) {
      return { avgLength: 0, variance: 0, distribution: [0, 0, 0, 0, 0] };
    }

    // Count words in each sentence
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);

    // Calculate statistics
    const sum = sentenceLengths.reduce((a, b) => a + b, 0);
    const avg = sum / sentenceLengths.length;

    const squaredDiffs = sentenceLengths.map((len) => Math.pow(len - avg, 2));
    const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / sentenceLengths.length);

    // Calculate distribution (percentiles)
    const sorted = [...sentenceLengths].sort((a, b) => a - b);
    const distribution = [
      sorted[Math.floor(sorted.length * 0.1)],
      sorted[Math.floor(sorted.length * 0.25)],
      sorted[Math.floor(sorted.length * 0.5)],
      sorted[Math.floor(sorted.length * 0.75)],
      sorted[Math.floor(sorted.length * 0.9)],
    ];

    return {
      avgLength: Math.round(avg * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      distribution,
    };
  }

  /**
   * Analyse vocabulary complexity and preferences
   */
  private analyseVocabulary(text: string): {
    level: StyleProfile['vocabularyLevel'];
    favouriteWords: Array<{ word: string; frequency: number }>;
    uniqueWordRatio: number;
  } {
    // Extract words (lowercase, remove punctuation)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Common stop words to exclude from analysis
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'it',
      'he',
      'she',
      'they',
      'we',
      'you',
      'i',
      'me',
      'him',
      'her',
      'them',
      'us',
      'this',
      'that',
      'these',
      'those',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
    ]);

    // Count word frequencies
    const wordCounts = new Map<string, number>();
    const contentWords = words.filter((w) => !stopWords.has(w) && w.length > 3);

    contentWords.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    // Get top words by frequency
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, frequency: count }));

    // Calculate unique word ratio
    const uniqueWords = new Set(words);
    const uniqueWordRatio = uniqueWords.size / words.length;

    // Determine vocabulary level based on average word length and unique ratio
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    let level: StyleProfile['vocabularyLevel'];

    if (avgWordLength < 4.5 && uniqueWordRatio < 0.4) {
      level = 'simple';
    } else if (avgWordLength < 5.5 && uniqueWordRatio < 0.5) {
      level = 'intermediate';
    } else if (avgWordLength < 6.5 && uniqueWordRatio < 0.6) {
      level = 'advanced';
    } else {
      level = 'literary';
    }

    return {
      level,
      favouriteWords: sortedWords,
      uniqueWordRatio: Math.round(uniqueWordRatio * 1000) / 1000,
    };
  }

  /**
   * Analyse dialogue patterns
   */
  private analyseDialogue(text: string): {
    style: StyleProfile['dialogueStyle'];
    frequency: number;
  } {
    // Count dialogue lines (text in quotes)
    const dialogueMatches = text.match(/"[^"]+"/g) || [];
    const dialogueWords = dialogueMatches.join(' ').split(/\s+/).length;
    const totalWords = this.countWords(text);
    const frequency = totalWords > 0 ? dialogueWords / totalWords : 0;

    // Analyse dialogue tag patterns
    const dialogueLines = text.split('\n').filter((line) => line.includes('"'));
    let taggedLines = 0;
    let actionTaggedLines = 0;

    dialogueLines.forEach((line) => {
      if (line.match(/"[^"]*"\s+(he|she|they|I|you|it|[A-Z]\w+)\s+(said|asked|replied|answered)/i)) {
        taggedLines++;
      }
      if (line.match(/"[^"]*"\s+[A-Z]\w+\s+(turned|walked|looked|smiled|laughed|nodded)/i)) {
        actionTaggedLines++;
      }
    });

    const tagRatio = dialogueLines.length > 0 ? taggedLines / dialogueLines.length : 0;
    const actionRatio = dialogueLines.length > 0 ? actionTaggedLines / dialogueLines.length : 0;

    let style: StyleProfile['dialogueStyle'];
    if (tagRatio < 0.3) {
      style = 'sparse-tags';
    } else if (actionRatio > 0.4) {
      style = 'action-tags';
    } else if (tagRatio > 0.7) {
      style = 'frequent-tags';
    } else {
      style = 'mixed';
    }

    return {
      style,
      frequency: Math.round(frequency * 1000) / 1000,
    };
  }

  /**
   * Analyse paragraph structure
   */
  private analyseParagraphs(text: string): StyleProfile['paragraphPatterns'] {
    // Split into paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return { avgLength: 0, variance: 0 };
    }

    // Count sentences in each paragraph
    const paragraphLengths = paragraphs.map(
      (p) => p.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
    );

    const sum = paragraphLengths.reduce((a, b) => a + b, 0);
    const avg = sum / paragraphLengths.length;

    const squaredDiffs = paragraphLengths.map((len) => Math.pow(len - avg, 2));
    const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / paragraphLengths.length);

    return {
      avgLength: Math.round(avg * 10) / 10,
      variance: Math.round(variance * 10) / 10,
    };
  }

  /**
   * Analyse punctuation usage patterns
   */
  private analysePunctuation(text: string): StyleProfile['punctuationStyle'] {
    const sentenceCount = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

    const dashCount = (text.match(/—|--/g) || []).length;
    const semicolonCount = (text.match(/;/g) || []).length;
    const ellipsisCount = (text.match(/\.\.\./g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;

    const classify = (count: number): 'high' | 'medium' | 'low' => {
      const ratio = count / sentenceCount;
      if (ratio > 0.2) return 'high';
      if (ratio > 0.05) return 'medium';
      return 'low';
    };

    return {
      dashUsage: classify(dashCount),
      semicolonUsage: classify(semicolonCount),
      ellipsisUsage: classify(ellipsisCount),
      exclamationUsage: classify(exclamationCount),
    };
  }

  /**
   * Detect narrative voice (POV)
   */
  private detectNarrativeVoice(text: string): StyleProfile['narrativeVoice'] {
    const words = text.toLowerCase().split(/\s+/);
    const firstPersonPronouns = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
    const secondPersonPronouns = ['you', 'your', 'yours'];

    let firstPersonCount = 0;
    let secondPersonCount = 0;

    words.forEach((word) => {
      if (firstPersonPronouns.includes(word)) firstPersonCount++;
      if (secondPersonPronouns.includes(word)) secondPersonCount++;
    });

    const firstPersonRatio = firstPersonCount / words.length;
    const secondPersonRatio = secondPersonCount / words.length;

    if (firstPersonRatio > 0.02) {
      return 'first-person';
    }
    if (secondPersonRatio > 0.02) {
      return 'second-person';
    }

    // Distinguish between close third and distant third based on interiority markers
    const interiorityMarkers = [
      'thought',
      'felt',
      'wondered',
      'realized',
      'noticed',
      'remembered',
      'knew',
    ];
    const interiorityCount = words.filter((w) => interiorityMarkers.includes(w)).length;
    const interiorityRatio = interiorityCount / words.length;

    if (interiorityRatio > 0.01) {
      return 'close-third';
    }

    return 'distant-third';
  }

  /**
   * Detect tense preference
   */
  private detectTense(text: string): StyleProfile['tensePreference'] {
    const words = text.toLowerCase().split(/\s+/);

    // Common past tense markers
    const pastMarkers = ['was', 'were', 'had', 'did', 'walked', 'looked', 'said', 'thought'];
    // Common present tense markers
    const presentMarkers = ['is', 'are', 'has', 'does', 'walks', 'looks', 'says', 'thinks'];

    let pastCount = 0;
    let presentCount = 0;

    words.forEach((word) => {
      if (pastMarkers.includes(word)) pastCount++;
      if (presentMarkers.includes(word)) presentCount++;
    });

    if (pastCount > presentCount * 1.5) {
      return 'past';
    }
    if (presentCount > pastCount * 1.5) {
      return 'present';
    }
    return 'mixed';
  }

  /**
   * Extract recurring phrases (3+ words)
   */
  private extractFavouritePhrases(text: string): Array<{ phrase: string; count: number }> {
    // Extract 3-5 word phrases
    const words = text.toLowerCase().split(/\s+/);
    const phraseCounts = new Map<string, number>();

    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = [words[i], words[i + 1], words[i + 2]].join(' ');
      if (phrase.length > 10) {
        // Avoid very short phrases
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
      }
    }

    // Extract 4-word phrases
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = [words[i], words[i + 1], words[i + 2], words[i + 3]].join(' ');
      if (phrase.length > 15) {
        phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
      }
    }

    // Return phrases that appear at least twice
    return Array.from(phraseCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * Generate a human-readable summary of the style profile
   */
  generateStyleSummary(profile: StyleProfile): string {
    const parts: string[] = [];

    parts.push(`Narrative voice: ${profile.narrativeVoice}`);
    parts.push(`Tense: ${profile.tensePreference}`);
    parts.push(
      `Sentence length: ${profile.sentencePatterns.avgLength} words (variance: ${profile.sentencePatterns.variance})`
    );
    parts.push(`Vocabulary: ${profile.vocabularyLevel}`);
    parts.push(`Dialogue: ${Math.round(profile.dialogueFrequency * 100)}% of text`);
    parts.push(`Dialogue style: ${profile.dialogueStyle}`);
    parts.push(
      `Paragraph length: ${profile.paragraphPatterns.avgLength} sentences (variance: ${profile.paragraphPatterns.variance})`
    );

    return parts.join('\n');
  }
}

export const voiceExtractionService = new VoiceExtractionService();
