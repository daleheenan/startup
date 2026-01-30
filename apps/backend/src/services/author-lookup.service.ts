/**
 * Author Lookup Service
 *
 * Searches for author information using AI to populate author profiles.
 * Uses Claude to gather writing style details, genres, and notable works.
 */

import { createLogger } from './logger.service.js';
import { claudeService } from './claude.service.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:author-lookup');

export interface AuthorLookupResult {
  name: string;
  genres: string[];
  writingStyle: string;
  notableWorks: string[];
  styleKeywords: string[];
}

/**
 * Look up an author by name and return structured information
 *
 * @param authorName - Name of the author to look up
 * @returns Author profile information
 */
export async function lookupAuthor(authorName: string): Promise<AuthorLookupResult> {
  logger.info({ authorName }, 'Looking up author');

  const prompt = `You are a literary expert. I need information about the author "${authorName}" for a writing style reference system.

Please provide:
1. Their primary writing genres (2-4 genres)
2. A 2-3 sentence description of their writing style
3. 3-5 of their most notable works
4. 5-8 style keywords that capture their writing approach (e.g., "sparse prose", "dark humor", "fast-paced")

Format your response as JSON:
{
  "name": "${authorName}",
  "genres": ["genre1", "genre2"],
  "writingStyle": "Description of their writing style...",
  "notableWorks": ["Book 1", "Book 2", "Book 3"],
  "styleKeywords": ["keyword1", "keyword2", "keyword3"]
}

If you don't know this author, return a JSON with an error field:
{
  "error": "Author not found or insufficient information available"
}

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await claudeService.createCompletionWithUsage({
      system: '',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for factual information
      tracking: {
        requestType: AI_REQUEST_TYPES.AUTHOR_STYLE_LOOKUP,
        contextSummary: `Looking up author: ${authorName}`,
      },
    });

    const responseText = response.content;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from AI');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Check for error response
    if (result.error) {
      throw new Error(result.error);
    }

    // Validate required fields
    if (!result.genres || !result.writingStyle || !result.notableWorks || !result.styleKeywords) {
      throw new Error('Incomplete author information returned');
    }

    logger.info({ authorName, genres: result.genres }, 'Author lookup successful');

    return {
      name: result.name || authorName,
      genres: result.genres,
      writingStyle: result.writingStyle,
      notableWorks: result.notableWorks,
      styleKeywords: result.styleKeywords,
    };
  } catch (error: any) {
    logger.error({ error: error.message, authorName }, 'Author lookup failed');
    throw new Error(`Failed to look up author: ${error.message}`);
  }
}
