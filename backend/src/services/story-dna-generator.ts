import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { createLogger } from './logger.service.js';

dotenv.config();

const logger = createLogger('services:story-dna-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface StoryDNA {
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  proseStyle: {
    sentenceStructure: string;
    vocabularyLevel: string;
    dialogueStyle: string;
    descriptionDensity: string;
    pacing: string;
    pointOfView: string;
  };
  targetAudience: string;
  contentRating: string;
}

export interface ConceptInput {
  title: string;
  logline: string;
  synopsis: string;
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
}

/**
 * Generate Story DNA based on selected concept
 * This defines the writing style, tone, and technical approach for the entire novel
 */
export async function generateStoryDNA(concept: ConceptInput): Promise<StoryDNA> {
  const prompt = buildStoryDNAPrompt(concept);

  logger.info('[StoryDNAGenerator] Generating Story DNA...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 2000,
      temperature: 0.7,
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

    const storyDNA = parseStoryDNAResponse(responseText);

    logger.info('[StoryDNAGenerator] Story DNA generated successfully');

    return storyDNA;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Story DNA generation error');
    throw error;
  }
}

function buildStoryDNAPrompt(concept: ConceptInput): string {
  const { title, logline, synopsis, genre, subgenre, tone, themes } = concept;

  return `You are a master writing coach and literary analyst. Based on this story concept, generate a comprehensive "Story DNA" that defines the precise writing style and approach for this novel.

**Story Concept:**
Title: ${title}
Logline: ${logline}
Synopsis: ${synopsis}

**Genre:** ${genre}
**Subgenre:** ${subgenre}
**Tone:** ${tone}
**Themes:** ${themes.join(', ')}

Generate a detailed Story DNA that will guide the Author Agent in writing this novel. The Story DNA should be SPECIFIC to this story, not generic genre advice.

Provide:

1. **Prose Style:**
   - sentenceStructure: How should sentences be constructed? (e.g., "Short, punchy sentences with occasional complex structures for emotional beats" or "Lyrical, flowing prose with nested clauses")
   - vocabularyLevel: What vocabulary is appropriate? (e.g., "Accessible literary with occasional elevated language" or "Sharp, contemporary with minimal pretension")
   - dialogueStyle: How should characters speak? (e.g., "Naturalistic with subtext, sparse dialogue tags" or "Stylized, witty banter with period-appropriate formality")
   - descriptionDensity: How much description? (e.g., "Sparse, impressionistic details focused on emotional resonance" or "Rich, immersive world-building with all five senses")
   - pacing: What's the rhythm? (e.g., "Fast-paced with short scenes and frequent cuts" or "Deliberate, contemplative with long scenes")
   - pointOfView: What POV and tense? (e.g., "Close third-person, past tense, single POV" or "Deep first-person present, multiple POVs")

2. **Target Audience:** Who is this for? (e.g., "Adult readers who enjoy character-driven literary fiction" or "YA readers 14-18 who love fast-paced fantasy")

3. **Content Rating:** What's appropriate? (e.g., "PG-13: Some violence, no explicit content" or "R: Mature themes, graphic violence, adult situations")

Return ONLY a JSON object in this format:
{
  "genre": "${genre}",
  "subgenre": "${subgenre}",
  "tone": "${tone}",
  "themes": ${JSON.stringify(themes)},
  "proseStyle": {
    "sentenceStructure": "...",
    "vocabularyLevel": "...",
    "dialogueStyle": "...",
    "descriptionDensity": "...",
    "pacing": "...",
    "pointOfView": "..."
  },
  "targetAudience": "...",
  "contentRating": "..."
}`;
}

function parseStoryDNAResponse(responseText: string): StoryDNA {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const storyDNA = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!storyDNA.proseStyle || !storyDNA.targetAudience || !storyDNA.contentRating) {
      throw new Error('Story DNA missing required fields');
    }

    return storyDNA;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Story DNA parse error');
    logger.error({ responseText }, 'Story DNA response text');
    throw new Error(`Failed to parse Story DNA: ${error.message}`);
  }
}
