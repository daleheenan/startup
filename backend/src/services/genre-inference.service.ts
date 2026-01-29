import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';

const logger = createLogger('services:genre-inference');

/**
 * Result of genre inference from story premise text
 */
export interface GenreInferenceResult {
  genre: string;
  subgenre: string | null;
  tone: string | null;
  themes: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Predefined genre categories for consistent classification
 */
const VALID_GENRES = [
  'Fantasy',
  'Science Fiction',
  'Romance',
  'Mystery',
  'Thriller',
  'Horror',
  'Historical Fiction',
  'Literary Fiction',
  'Crime',
  'Adventure',
  'Drama',
  'Comedy',
  'Western',
  'Dystopian',
  'Urban Fantasy',
  'Paranormal',
  'Contemporary',
  'Young Adult',
  'Children\'s',
  'Memoir',
  'Biography',
  'Self-Help',
  'True Crime',
  'Other',
] as const;

/**
 * GenreInferenceService infers genre and related metadata from story premise text
 * Uses Claude AI to analyse the content and determine appropriate genre classification
 */
export class GenreInferenceService {
  private anthropic: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'placeholder-key-will-be-set-later') {
      logger.warn('ANTHROPIC_API_KEY not configured');
      this.anthropic = null as any;
    } else {
      this.anthropic = new Anthropic({ apiKey });
    }
    // Use Haiku for fast, cheap inference - this is a simple classification task
    this.model = 'claude-sonnet-4-20250514';
  }

  /**
   * Infer genre and related metadata from story premise text
   * @param premise - The story premise or description text
   * @param timePeriod - Optional time period hint (e.g., "Medieval", "Victorian", "2350 AD")
   * @returns Inferred genre, subgenre, tone, and themes
   */
  async inferGenre(premise: string, timePeriod?: string): Promise<GenreInferenceResult> {
    if (!this.anthropic) {
      throw new Error('Claude API not configured. Set ANTHROPIC_API_KEY in .env file');
    }

    if (!premise || premise.trim().length < 10) {
      throw new Error('Premise must be at least 10 characters long for genre inference');
    }

    const prompt = this.buildInferencePrompt(premise, timePeriod);

    logger.info({
      premiseLength: premise.length,
      timePeriod,
    }, 'Inferring genre from premise');

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3, // Low temperature for consistent classification
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      const result = this.parseInferenceResponse(responseText);

      logger.info({
        genre: result.genre,
        subgenre: result.subgenre,
        confidence: result.confidence,
      }, 'Successfully inferred genre');

      return result;
    } catch (error: any) {
      logger.error({ error }, 'Genre inference failed');
      throw error;
    }
  }

  /**
   * Build the prompt for genre inference
   */
  private buildInferencePrompt(premise: string, timePeriod?: string): string {
    const genreList = VALID_GENRES.join(', ');

    return `You are a literary genre classification expert. Analyse the following story premise and determine the most appropriate genre, subgenre, tone, and themes.

${timePeriod ? `Time Period Context: ${timePeriod}\n` : ''}
Story Premise:
${premise}

Classify this story into one of these genres: ${genreList}

Respond with a JSON object containing:
- "genre": The primary genre (must be from the list above)
- "subgenre": A more specific subgenre if applicable (e.g., "Epic Fantasy", "Cozy Mystery", "Space Opera"), or null
- "tone": The overall tone (e.g., "Dark", "Light-hearted", "Suspenseful", "Whimsical", "Gritty"), or null
- "themes": An array of 2-4 key themes explored in this story (e.g., ["Redemption", "Identity", "Power"])
- "confidence": How confident you are in this classification ("high", "medium", or "low")

Consider:
- The setting and world-building elements
- Character types and relationships mentioned
- Plot elements and conflict types
- Emotional tone and atmosphere
- Any supernatural/magical/technological elements
- The time period if specified

Respond ONLY with the JSON object, no other text.`;
  }

  /**
   * Parse the AI response into a GenreInferenceResult
   */
  private parseInferenceResponse(response: string): GenreInferenceResult {
    try {
      const parsed = extractJsonObject(response) as any;

      // Validate and sanitise the genre
      let genre = parsed.genre || 'Other';
      if (!VALID_GENRES.includes(genre as any)) {
        // Try to find a close match
        const lowerGenre = genre.toLowerCase();
        const match = VALID_GENRES.find(g => g.toLowerCase() === lowerGenre);
        genre = match || 'Other';
      }

      return {
        genre,
        subgenre: parsed.subgenre || null,
        tone: parsed.tone || null,
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : [],
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
          ? parsed.confidence
          : 'medium',
      };
    } catch (error) {
      logger.warn({ response, error }, 'Failed to parse genre inference response, using defaults');
      return {
        genre: 'Other',
        subgenre: null,
        tone: null,
        themes: [],
        confidence: 'low',
      };
    }
  }
}

// Export singleton instance
export const genreInferenceService = new GenreInferenceService();
