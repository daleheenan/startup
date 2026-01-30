/**
 * Adverbs Report Service
 * Sprint 40: Flag -ly adverbs and suggest stronger verb alternatives
 */

import type { AdverbsReport, AdverbIssue } from './types.js';

export class AdverbsService {
  // Common -ly words that are NOT adverbs
  private static readonly NOT_ADVERBS = new Set([
    'early',
    'only',
    'lonely',
    'lovely',
    'friendly',
    'ugly',
    'holy',
    'silly',
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'family',
    'likely',
    'unlikely',
    'orderly',
    'elderly',
    'timely',
    'costly',
    'deadly',
    'likely',
  ]);

  /**
   * Generate adverbs report for text
   */
  static generateReport(text: string, chapterId?: string): AdverbsReport {
    const instances = this.findAdverbs(text, chapterId);
    const totalAdverbs = instances.length;

    // Calculate adverb density (per 1000 words)
    const words = this.splitIntoWords(text);
    const adverbDensity = (totalAdverbs / (words.length || 1)) * 1000;

    // Assess quality based on density
    const assessment = this.assessAdverbUsage(adverbDensity);

    return {
      instances,
      totalAdverbs,
      adverbDensity: Math.round(adverbDensity * 10) / 10,
      assessment,
    };
  }

  /**
   * Find all -ly adverbs in text
   */
  private static findAdverbs(text: string, chapterId?: string): AdverbIssue[] {
    const sentences = this.splitIntoSentences(text);
    const issues: AdverbIssue[] = [];
    let position = 0;

    sentences.forEach(sentence => {
      // Find all -ly words in sentence
      const words = sentence.split(/\s+/);
      const adverbs = words.filter(word => {
        const cleaned = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
        return cleaned.endsWith('ly') && !this.NOT_ADVERBS.has(cleaned) && cleaned.length > 3;
      });

      adverbs.forEach(adverb => {
        const cleaned = adverb.replace(/[^a-zA-Z]/g, '');
        const suggestion = this.suggestAlternative(cleaned, sentence);

        issues.push({
          adverb: cleaned,
          context: sentence.trim(),
          position,
          chapterId,
          suggestion,
        });
      });

      position++;
    });

    return issues;
  }

  /**
   * Suggest stronger verb alternatives for adverb usage
   */
  private static suggestAlternative(adverb: string, sentence: string): string {
    // Common adverb -> stronger verb mappings
    const alternatives: Record<string, string[]> = {
      quickly: ['rush', 'hurry', 'dash', 'sprint', 'hasten'],
      slowly: ['crawl', 'creep', 'amble', 'plod', 'meander'],
      quietly: ['whisper', 'murmur', 'mutter', 'tiptoe'],
      loudly: ['shout', 'yell', 'bellow', 'roar', 'thunder'],
      angrily: ['snap', 'snarl', 'growl', 'fume', 'rage'],
      sadly: ['mourn', 'grieve', 'lament', 'weep'],
      happily: ['rejoice', 'celebrate', 'beam', 'grin'],
      carefully: ['examine', 'scrutinise', 'inspect', 'study'],
      suddenly: ['jolt', 'startle', 'burst', 'erupt'],
      gently: ['caress', 'stroke', 'soothe', 'cradle'],
      firmly: ['grip', 'clasp', 'clutch', 'seize'],
      weakly: ['falter', 'waver', 'stumble', 'mumble'],
      strongly: ['emphasise', 'assert', 'declare', 'insist'],
      completely: ['consume', 'engulf', 'overwhelm', 'dominate'],
      nearly: ['approach', 'border on', 'verge on'],
      really: ['(remove for stronger impact)'],
      very: ['(replace with more precise adjective)'],
      extremely: ['(replace with more precise adjective)'],
      totally: ['(remove or replace with specific description)'],
    };

    const adverbLower = adverb.toLowerCase();

    // Check for direct mapping
    if (alternatives[adverbLower]) {
      const options = alternatives[adverbLower];
      return `Consider: ${options.join(', ')}`;
    }

    // Try to extract base verb and suggest enhancement
    const verbMatch = sentence.match(
      new RegExp(`\\b(\\w+)\\s+${adverb}\\b`, 'i')
    );
    if (verbMatch) {
      return `Consider replacing "${verbMatch[0]}" with a stronger verb`;
    }

    return 'Consider removing or replacing with a stronger verb';
  }

  /**
   * Assess adverb usage based on density
   * Best practice: < 1% of words should be -ly adverbs
   */
  private static assessAdverbUsage(density: number): 'good' | 'moderate' | 'excessive' {
    // Density is per 1000 words
    // Good: < 10 per 1000 (1%)
    // Moderate: 10-20 per 1000 (1-2%)
    // Excessive: > 20 per 1000 (2%+)
    if (density < 10) return 'good';
    if (density < 20) return 'moderate';
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
