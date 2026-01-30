import { createLogger } from './logger.service.js';
import { claudeService } from './claude.service.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';
import type { StoryConcept } from '../shared/types/index.js';
import type { StoryDNA } from '../shared/types/index.js';
import type { IntentDetectionResult } from './editorial-intent-detector.js';

const logger = createLogger('services:editorial-response-generator');

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface EditorialResponse {
  responseType: 'answer' | 'change_applied' | 'recommendation';
  content: string;
  appliedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  };
  recommendedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
    rationale: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Generate appropriate editorial response based on detected intent
 */
export async function generateEditorialResponse(
  intentResult: IntentDetectionResult,
  userQuery: string,
  currentConcept: StoryConcept,
  currentDNA: StoryDNA,
  conversationHistory: ConversationMessage[],
  projectId?: string
): Promise<EditorialResponse> {
  try {
    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-10) // Last 10 messages only
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // Build current story context
    const storyContext = `
CURRENT STORY CONCEPT:
Title: ${currentConcept.title || 'Not set'}
Logline: ${currentConcept.logline || 'Not set'}
Synopsis: ${currentConcept.synopsis || 'Not set'}
Hook: ${currentConcept.hook || 'Not set'}
Protagonist Hint: ${currentConcept.protagonistHint || 'Not set'}
Conflict Type: ${currentConcept.conflictType || 'Not set'}

CURRENT STORY DNA:
Genre: ${currentDNA.genre || 'Not set'}
Subgenre: ${currentDNA.subgenre || 'Not set'}
Tone: ${currentDNA.tone || 'Not set'}
Themes: ${Array.isArray(currentDNA.themes) ? currentDNA.themes.join(', ') : 'Not set'}
Prose Style: ${currentDNA.proseStyle || 'Not set'}
Timeframe: ${currentDNA.timeframe || 'Not set'}
`.trim();

    // Build prompt based on intent
    let systemPrompt = '';
    let responseInstructions = '';

    const britishSpellingDirective = `
CRITICAL INSTRUCTION - UK BRITISH SPELLING:
You MUST use UK British spelling conventions in ALL responses. This is non-negotiable.

Examples:
- "colour" NOT "color"
- "realise" NOT "realize"
- "organise" NOT "organize"
- "behaviour" NOT "behavior"
- "favour" NOT "favor"
- "centre" NOT "center"
- "defence" NOT "defense"
- "analyse" NOT "analyze"

This applies to all AI-generated text content, suggested changes, recommendations, and rationale.
If you generate American spellings, it is a critical error.
`;

    if (intentResult.intent === 'question') {
      systemPrompt = `You are a helpful story development consultant. Answer the user's question about their story concept and DNA.`;
      responseInstructions = `
${britishSpellingDirective}

Provide a helpful, informative answer to the user's question. Do NOT make any changes to their story.

Respond with JSON:
{
  "responseType": "answer",
  "content": "Your helpful answer here"
}`;
    } else if (intentResult.intent === 'change') {
      systemPrompt = `You are a story development assistant. The user has given you a direct command to change specific elements of their story. Apply the requested changes.`;
      responseInstructions = `
${britishSpellingDirective}

Based on the user's command, make the specific changes they requested. Only change the fields that are relevant to their request.

Respond with JSON:
{
  "responseType": "change_applied",
  "content": "A brief confirmation message explaining what you changed",
  "appliedChanges": {
    "concept": {
      "field_name": "new_value"
      // Only include fields that changed
    },
    "dna": {
      "field_name": "new_value"
      // Only include fields that changed
    }
  }
}

If the change only affects Story Concept, omit the "dna" object.
If the change only affects Story DNA, omit the "concept" object.
Only include fields that are actually being changed.`;
    } else {
      // suggestion
      systemPrompt = `You are a story development consultant. The user has asked for suggestions or improvements. Provide thoughtful recommendations with clear rationale.`;
      responseInstructions = `
${britishSpellingDirective}

Based on the user's request, provide thoughtful recommendations for improving their story. Include specific suggested changes with clear rationale for why these changes would benefit the story.

Respond with JSON:
{
  "responseType": "recommendation",
  "content": "A brief introduction to your recommendation",
  "recommendedChanges": {
    "concept": {
      "field_name": "suggested_new_value"
      // Only include fields you're recommending to change
    },
    "dna": {
      "field_name": "suggested_new_value"
      // Only include fields you're recommending to change
    },
    "rationale": "Clear explanation of WHY you're recommending these changes and how they will improve the story"
  }
}

If the recommendation only affects Story Concept, omit the "dna" object.
If the recommendation only affects Story DNA, omit the "concept" object.
Only include fields you're recommending to change.`;
    }

    const fullPrompt = `${systemPrompt}

${storyContext}

${conversationHistory.length > 0 ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}

USER QUERY:
${userQuery}

DETECTED INTENT: ${intentResult.intent} (confidence: ${intentResult.confidence})

${responseInstructions}`;

    const response = await claudeService.createCompletionWithUsage({
      system: '',
      messages: [{ role: 'user', content: fullPrompt }],
      maxTokens: 4096,
      tracking: {
        requestType: AI_REQUEST_TYPES.EDITORIAL_RESPONSE,
        projectId: projectId || null,
        contextSummary: `Generating editorial response for ${intentResult.intent} intent`,
      },
    });

    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]) as EditorialResponse;

    // Validate the response structure
    if (!result.responseType || !result.content) {
      throw new Error('Invalid response structure from AI');
    }

    // Validate response type matches intent
    if (intentResult.intent === 'question' && result.responseType !== 'answer') {
      throw new Error('Response type mismatch: expected answer for question intent');
    }
    if (intentResult.intent === 'change' && result.responseType !== 'change_applied') {
      throw new Error('Response type mismatch: expected change_applied for change intent');
    }
    if (intentResult.intent === 'suggestion' && result.responseType !== 'recommendation') {
      throw new Error('Response type mismatch: expected recommendation for suggestion intent');
    }

    // Validate that change_applied has appliedChanges
    if (result.responseType === 'change_applied' && !result.appliedChanges) {
      throw new Error('change_applied response must include appliedChanges');
    }

    // Validate that recommendation has recommendedChanges
    if (result.responseType === 'recommendation' && !result.recommendedChanges) {
      throw new Error('recommendation response must include recommendedChanges');
    }

    // Ensure themes is an array if present in changes
    if (result.appliedChanges?.dna?.themes && !Array.isArray(result.appliedChanges.dna.themes)) {
      result.appliedChanges.dna.themes = [result.appliedChanges.dna.themes as any];
    }
    if (result.recommendedChanges?.dna?.themes && !Array.isArray(result.recommendedChanges.dna.themes)) {
      result.recommendedChanges.dna.themes = [result.recommendedChanges.dna.themes as any];
    }

    logger.info(
      {
        responseType: result.responseType,
        hasChanges: !!result.appliedChanges || !!result.recommendedChanges,
        intent: intentResult.intent,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      'Editorial response generated'
    );

    return {
      ...result,
      usage: response.usage,
    };
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating editorial response');
    throw error;
  }
}
