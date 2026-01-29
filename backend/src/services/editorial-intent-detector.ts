import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from './logger.service.js';
import type { StoryConcept } from '../shared/types/index.js';
import type { StoryDNA } from '../shared/types/index.js';

const logger = createLogger('services:editorial-intent-detector');

export type IntentType = 'question' | 'change' | 'suggestion';

export interface IntentDetectionResult {
  intent: IntentType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Detect the user's intent from their query
 * Uses Claude to classify intent as question/change/suggestion
 */
export async function detectIntent(
  userQuery: string,
  currentConcept: StoryConcept,
  currentDNA: StoryDNA
): Promise<IntentDetectionResult> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build context summary for intent detection
    const contextSummary = `
CURRENT STORY CONTEXT:
Genre: ${currentDNA.genre || 'Not set'}
Subgenre: ${currentDNA.subgenre || 'Not set'}
Tone: ${currentDNA.tone || 'Not set'}
Themes: ${Array.isArray(currentDNA.themes) ? currentDNA.themes.join(', ') : 'Not set'}
Timeframe: ${currentDNA.timeframe || 'Not set'}
Title: ${currentConcept.title || 'Not set'}
`.trim();

    const prompt = `You are an intent detection system for a story editing assistant. Analyse the user's query and classify it into one of three intents:

1. **question**: User is asking for information, advice, or clarification. No changes requested.
2. **change**: User is giving a direct command to modify specific story elements with explicit values.
3. **suggestion**: User is requesting improvements or refinements but without specifying exact values, or using tentative language.

${contextSummary}

USER QUERY:
${userQuery}

Respond with JSON:
{
  "intent": "question" | "change" | "suggestion",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why you chose this intent"
}

CLASSIFICATION RULES:
- If query contains interrogative words (what, how, why, should) → question
- If query uses imperative verbs with specific values (change X to Y, set Z to W) → change
- If query uses comparative/improvement language without specific values (darker, better, more compelling) → suggestion
- If query uses tentative language (maybe, perhaps, might, could) → suggestion

IMPORTANT: Use UK British spelling conventions in your reasoning.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract the text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]) as IntentDetectionResult;

    // Validate the response structure
    if (!result.intent || !result.confidence || !result.reasoning) {
      throw new Error('Invalid response structure from AI');
    }

    // Validate intent type
    if (!['question', 'change', 'suggestion'].includes(result.intent)) {
      throw new Error(`Invalid intent type: ${result.intent}`);
    }

    // Validate confidence level
    if (!['high', 'medium', 'low'].includes(result.confidence)) {
      throw new Error(`Invalid confidence level: ${result.confidence}`);
    }

    logger.info(
      {
        intent: result.intent,
        confidence: result.confidence,
        queryLength: userQuery.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      'Intent detection completed'
    );

    return {
      ...result,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error detecting intent');
    throw error;
  }
}
