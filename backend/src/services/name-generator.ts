import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { generateNameForNationality, isNationalitySupported } from '../data/nationality-names.js';
import { createLogger } from './logger.service.js';

dotenv.config();

const logger = createLogger('services:name-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a culturally appropriate name based on nationality
 * Falls back to AI generation if nationality not in database
 */
export async function generateNameByNationality(
  nationality: string,
  gender?: 'male' | 'female',
  context?: { ethnicity?: string; role?: string; genre?: string }
): Promise<string> {
  // First try database lookup
  if (isNationalitySupported(nationality)) {
    try {
      const result = generateNameForNationality(nationality, gender);
      logger.info({ nationality, gender, name: result.fullName }, 'Generated name from database');
      return result.fullName;
    } catch (error: any) {
      logger.warn({ error: error.message, nationality }, 'Database name generation failed, falling back to AI');
    }
  }

  // Fall back to AI generation for unsupported nationalities or fictional settings
  return await generateNameWithAI(nationality, gender, context);
}

/**
 * Generate a name using Claude AI for fictional or unsupported nationalities
 */
async function generateNameWithAI(
  nationality: string,
  gender?: 'male' | 'female',
  context?: { ethnicity?: string; role?: string; genre?: string }
): Promise<string> {
  const genderText = gender ? `${gender} ` : '';
  const ethnicityText = context?.ethnicity ? ` with ${context.ethnicity} ethnicity` : '';
  const roleText = context?.role ? ` (${context.role})` : '';
  const genreText = context?.genre ? ` for a ${context.genre} story` : '';

  const prompt = `Generate a single realistic ${genderText}name for a character from ${nationality}${ethnicityText}${roleText}${genreText}.

Return ONLY the full name (first and last name), nothing else. Make it culturally appropriate and believable.

Examples of the format:
- John Smith
- Maria Garcia
- Wei Zhang

Your response:`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 100,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : '';

    logger.info({ nationality, gender, name: responseText }, 'Generated name with AI');

    return responseText;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'AI name generation error');
    // Ultimate fallback: return a generic name
    return gender === 'female' ? 'Jane Doe' : 'John Doe';
  }
}

/**
 * Generate multiple names based on nationality distribution
 */
export async function generateNamesByDistribution(
  distribution: Array<{ nationality: string; count: number }>,
  genderDistribution?: 'random' | 'balanced' | Array<'male' | 'female'>
): Promise<string[]> {
  const names: string[] = [];

  for (const entry of distribution) {
    for (let i = 0; i < entry.count; i++) {
      let gender: 'male' | 'female' | undefined;

      if (Array.isArray(genderDistribution)) {
        gender = genderDistribution[names.length];
      } else if (genderDistribution === 'balanced') {
        gender = i % 2 === 0 ? 'male' : 'female';
      }
      // 'random' or undefined = let the function decide randomly

      const name = await generateNameByNationality(entry.nationality, gender);
      names.push(name);
    }
  }

  return names;
}
