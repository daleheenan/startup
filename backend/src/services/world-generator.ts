import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import { extractJsonArray } from '../utils/json-extractor.js';

dotenv.config();

const logger = createLogger('services:world-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type WorldElementType = 'location' | 'faction' | 'magic_system' | 'technology' | 'custom';

export interface WorldElement {
  id: string;
  type: WorldElementType;
  name: string;
  description: string;
  significance: string;
  rules?: string[];
  history?: string;
}

export interface WorldGenerationContext {
  title: string;
  synopsis: string;
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  protagonistName: string;
  timeframe?: string;
}

/**
 * Generate world elements (locations, factions, magic/tech systems)
 */
export async function generateWorldElements(
  context: WorldGenerationContext
): Promise<WorldElement[]> {
  const prompt = buildWorldPrompt(context);

  logger.info('[WorldGenerator] Generating world elements...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 6000,
      temperature: 0.85,
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

    const worldElements = parseWorldElementsResponse(responseText);

    logger.info(`[WorldGenerator] Generated ${worldElements.length} world elements`);

    return worldElements;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'World generation error');
    throw error;
  }
}

function buildWorldPrompt(context: WorldGenerationContext): string {
  const { title, synopsis, genre, subgenre, tone, themes, protagonistName, timeframe } = context;

  const needsMagic = ['fantasy', 'urban fantasy', 'paranormal'].some(g =>
    genre.toLowerCase().includes(g) || subgenre.toLowerCase().includes(g)
  );

  const needsTech = ['science fiction', 'sci-fi', 'cyberpunk', 'space opera'].some(g =>
    genre.toLowerCase().includes(g) || subgenre.toLowerCase().includes(g)
  );

  return `You are a master world-builder. Based on this story, create a rich, detailed world that feels authentic and supports the narrative.

**Story Context:**
Title: ${title}
Synopsis: ${synopsis}
Genre: ${genre}
Subgenre: ${subgenre}
Tone: ${tone}
Themes: ${themes.join(', ')}
${timeframe ? `Time Period/Era: ${timeframe}` : ''}
Protagonist: ${protagonistName}

Create world elements across these categories:

${needsMagic ? `
**1. Magic/Supernatural System** (1-2 elements)
Create the magical or supernatural system for this world:
- How does magic work?
- What are its limits and costs?
- Who can use it and how is it learned?
- What are the rules and consequences?
` : ''}

${needsTech ? `
**1. Technology System** (1-2 elements)
Create the technological framework:
- What level of technology exists?
- What are the key innovations?
- How does it impact society?
- What are its limitations?
` : ''}

**2. Key Locations** (3-4 locations)
Create important places in the story:
- Where does the story primarily take place?
- What locations are significant to the plot?
- What makes each location unique and memorable?
- How do these places reflect the themes?

**3. Factions/Organizations** (2-3 factions)
Create groups that shape the world:
- What organizations have power?
- What do they want?
- How do they conflict?
- Where does the protagonist fit?

For EACH element, provide:
- **type**: One of: location, faction, magic_system, technology
- **name**: A distinctive, memorable name
- **description**: Rich, vivid description (3-4 sentences)
- **significance**: Why this matters to the story (2-3 sentences)
- **rules** (for systems): Array of 3-5 key rules or limitations
- **history** (optional): Relevant backstory (2-3 sentences)

IMPORTANT:
- Make the world feel LIVED-IN and authentic
- Ensure world elements support the story's themes
- Create interesting conflicts and tensions through world-building
- Match the genre conventions while adding unique twists
- Don't over-explain - leave room for discovery

Return ONLY a JSON array of world elements:
[
  {
    "type": "location",
    "name": "...",
    "description": "...",
    "significance": "...",
    "history": "..."
  },
  {
    "type": "magic_system",
    "name": "...",
    "description": "...",
    "significance": "...",
    "rules": ["rule1", "rule2", ...],
    "history": "..."
  },
  ...
]`;
}

function parseWorldElementsResponse(responseText: string): WorldElement[] {
  try {
    const elementsData = extractJsonArray(responseText);

    const worldElements: WorldElement[] = elementsData.map((element: any) => ({
      id: randomUUID(),
      type: element.type || 'custom',
      name: element.name,
      description: element.description,
      significance: element.significance,
      rules: element.rules,
      history: element.history,
    }));

    return worldElements;
  } catch (error: any) {
    logger.error({ error: error.message }, 'World generation parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'World generation response text (truncated)');
    throw new Error(`Failed to parse world elements: ${error.message}`);
  }
}
