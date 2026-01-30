/**
 * Passive Voice Report Service
 * Sprint 40: Detect passive voice constructions and suggest active alternatives
 */

import type { PassiveVoiceReport, PassiveVoiceInstance } from './types.js';

export class PassiveVoiceService {
  // Forms of "to be"
  private static readonly BE_VERBS = new Set([
    'is',
    'are',
    'was',
    'were',
    'been',
    'being',
    'be',
    'am',
  ]);

  // Common past participles (simplified list)
  private static readonly PAST_PARTICIPLES_REGEX =
    /\b(is|are|was|were|been|being|be)\s+(being\s+)?([\w]+ed|[\w]+en|gone|done|made|seen|known|written|taken|given|shown|told|found|kept|left|felt|heard|met|read|said|thought|brought|caught|taught|bought|sought|fought)\b/gi;

  /**
   * Generate passive voice report for text
   */
  static generateReport(text: string, chapterId?: string): PassiveVoiceReport {
    const instances = this.findPassiveVoice(text, chapterId);
    const totalInstances = instances.length;

    // Calculate passive voice percentage
    const sentences = this.splitIntoSentences(text);
    const passivePercentage = (totalInstances / (sentences.length || 1)) * 100;

    // Assess quality
    const assessment = this.assessPassiveVoice(passivePercentage);

    return {
      instances,
      totalInstances,
      passivePercentage: Math.round(passivePercentage * 10) / 10,
      assessment,
    };
  }

  /**
   * Find all passive voice constructions in text
   */
  private static findPassiveVoice(
    text: string,
    chapterId?: string
  ): PassiveVoiceInstance[] {
    const sentences = this.splitIntoSentences(text);
    const instances: PassiveVoiceInstance[] = [];
    let position = 0;

    sentences.forEach(sentence => {
      // Find passive voice patterns
      const matches = sentence.matchAll(this.PAST_PARTICIPLES_REGEX);

      for (const match of matches) {
        // Skip if this is likely a legitimate passive use
        if (this.isLegitimatePassive(sentence, match[0])) {
          continue;
        }

        const passivePhrase = match[0];
        const activeSuggestion = this.suggestActiveAlternative(passivePhrase, sentence);

        instances.push({
          sentence: sentence.trim(),
          passivePhrase,
          position,
          chapterId,
          activeSuggestion,
        });
      }

      position++;
    });

    return instances;
  }

  /**
   * Check if passive voice is legitimate/intentional
   * Some passive uses are acceptable (e.g., in dialogue, for emphasis)
   */
  private static isLegitimatePassive(sentence: string, passivePhrase: string): boolean {
    // Allow passive in dialogue (contains quotation marks)
    if (sentence.includes('"') || sentence.includes("'")) {
      return true;
    }

    // Allow passive for emphasis on action/recipient
    // e.g., "The treasure was hidden centuries ago"
    const emphasesRecipient = /^(The|This|That|These|Those)\s+[\w\s]+\b(was|were)\b/.test(
      sentence
    );
    if (emphasesRecipient) {
      // Still flag it, but note it might be intentional
      return false;
    }

    // Allow passive in questions
    if (sentence.trim().endsWith('?')) {
      return true;
    }

    return false;
  }

  /**
   * Suggest active voice alternative
   */
  private static suggestActiveAlternative(passivePhrase: string, sentence: string): string {
    // Extract the be verb and past participle
    const match = passivePhrase.match(
      /\b(is|are|was|were|been|being|be)\s+(being\s+)?([\w]+)/
    );
    if (!match) return 'Rephrase in active voice';

    const beVerb = match[1];
    const pastParticiple = match[3];

    // Try to convert to active
    // Common patterns:
    const suggestions: string[] = [];

    // Pattern: "was written by X" -> "X wrote"
    const byAgentMatch = sentence.match(/by\s+(\w+)/i);
    if (byAgentMatch) {
      const agent = byAgentMatch[1];
      const activeVerb = this.convertToActiveVerb(pastParticiple);
      suggestions.push(`${agent} ${activeVerb}`);
    }

    // Pattern: "was written" -> "wrote" (need to identify subject)
    if (suggestions.length === 0) {
      const activeVerb = this.convertToActiveVerb(pastParticiple);
      suggestions.push(`Use active form: ${activeVerb}`);
    }

    return suggestions[0] || 'Rephrase in active voice';
  }

  /**
   * Convert past participle to active verb form
   */
  private static convertToActiveVerb(pastParticiple: string): string {
    // Common conversions
    const conversions: Record<string, string> = {
      written: 'wrote/writes',
      given: 'gave/gives',
      taken: 'took/takes',
      seen: 'saw/sees',
      made: 'made/makes',
      done: 'did/does',
      known: 'knew/knows',
      shown: 'showed/shows',
      told: 'told/tells',
      found: 'found/finds',
      kept: 'kept/keeps',
      left: 'left/leaves',
      felt: 'felt/feels',
      heard: 'heard/hears',
      met: 'met/meets',
      read: 'read/reads',
      said: 'said/says',
      thought: 'thought/thinks',
      brought: 'brought/brings',
      caught: 'caught/catches',
      taught: 'taught/teaches',
      bought: 'bought/buys',
      sought: 'sought/seeks',
      fought: 'fought/fights',
    };

    if (conversions[pastParticiple.toLowerCase()]) {
      return conversions[pastParticiple.toLowerCase()];
    }

    // Try to handle regular -ed verbs
    if (pastParticiple.endsWith('ed')) {
      const base = pastParticiple.slice(0, -2);
      return `${base}/${base}s`;
    }

    return pastParticiple; // Return as-is if can't convert
  }

  /**
   * Assess passive voice usage
   * Best practice: < 10% passive sentences
   */
  private static assessPassiveVoice(percentage: number): 'good' | 'moderate' | 'excessive' {
    if (percentage < 10) return 'good';
    if (percentage < 20) return 'moderate';
    return 'excessive';
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
}
