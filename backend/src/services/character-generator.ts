import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';

dotenv.config();

const logger = createLogger('services:character-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type CharacterRole = 'protagonist' | 'antagonist' | 'mentor' | 'sidekick' | 'love_interest' | 'supporting';

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  ethnicity?: string;          // Cultural/ethnic background
  nationality?: string;        // Country/region of origin
  physicalDescription: string;
  personality: string[];
  voiceSample: string;
  goals: string[];
  conflicts: {
    internal: string[];
    external: string[];
  };
  backstory: string;
  currentState: string;
  characterArc: string;
  relationships: Array<{
    characterId: string;
    characterName: string;
    relationship: string;
  }>;
}

export interface CharacterGenerationContext {
  title: string;
  synopsis: string;
  genre: string;
  tone: string;
  themes: string[];
  storyDNA?: any;
}

/**
 * Generate the protagonist character
 */
export async function generateProtagonist(
  context: CharacterGenerationContext
): Promise<Character> {
  const prompt = buildProtagonistPrompt(context);

  logger.info('[CharacterGenerator] Generating protagonist...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 3000,
      temperature: 0.9, // High creativity for unique character
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

    const character = parseCharacterResponse(responseText, 'protagonist');

    logger.info(`[CharacterGenerator] Protagonist "${character.name}" generated`);

    return character;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Character generation error');
    throw error;
  }
}

/**
 * Generate supporting cast (antagonist, mentor, sidekick, love interest, etc.)
 */
export async function generateSupportingCast(
  context: CharacterGenerationContext,
  protagonist: Character
): Promise<Character[]> {
  const prompt = buildSupportingCastPrompt(context, protagonist);

  logger.info('[CharacterGenerator] Generating supporting cast...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 8000,
      temperature: 0.9,
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

    const characters = parseSupportingCastResponse(responseText);

    logger.info(`[CharacterGenerator] Generated ${characters.length} supporting characters`);

    return characters;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Character generation error');
    throw error;
  }
}

function buildProtagonistPrompt(context: CharacterGenerationContext): string {
  const { title, synopsis, genre, tone, themes } = context;

  return `You are a master character creator. Based on this story, create a compelling, three-dimensional protagonist.

**Story Context:**
Title: ${title}
Synopsis: ${synopsis}
Genre: ${genre}
Tone: ${tone}
Themes: ${themes.join(', ')}

Create a protagonist who:
1. Has a UNIQUE, distinctive voice that fits the genre and tone
2. Has clear internal and external conflicts
3. Has compelling goals and motivations
4. Will undergo a meaningful character arc
5. Feels authentic and three-dimensional

Provide:
- **name**: Full name (first and last, culturally appropriate)
- **ethnicity**: Cultural/ethnic background (e.g., East Asian, Mediterranean, West African, Nordic, etc.)
- **nationality**: Country or region of origin (can be fictional for fantasy/sci-fi)
- **physicalDescription**: Brief physical description (2-3 sentences)
- **personality**: 5-7 key personality traits
- **voiceSample**: A 150-word sample in the character's voice (first-person internal monologue about their current situation)
- **goals**: 3-5 specific goals (what they want)
- **conflicts**:
  - internal: 2-3 internal conflicts (fears, doubts, moral dilemmas)
  - external: 2-3 external conflicts (obstacles, enemies, circumstances)
- **backstory**: 2-3 paragraph backstory explaining how they became who they are
- **currentState**: Where they are emotionally/physically at the story's start (2-3 sentences)
- **characterArc**: How they will change over the course of the story (2-3 sentences)

The voice sample is CRITICAL - it should showcase:
- How they think and speak
- Their unique perspective
- Their emotional state
- Genre-appropriate style

Return ONLY a JSON object in this format:
{
  "name": "...",
  "ethnicity": "...",
  "nationality": "...",
  "physicalDescription": "...",
  "personality": ["trait1", "trait2", ...],
  "voiceSample": "...",
  "goals": ["goal1", "goal2", ...],
  "conflicts": {
    "internal": ["conflict1", ...],
    "external": ["conflict1", ...]
  },
  "backstory": "...",
  "currentState": "...",
  "characterArc": "..."
}`;
}

function buildSupportingCastPrompt(
  context: CharacterGenerationContext,
  protagonist: Character
): string {
  const { title, synopsis, genre, tone, themes } = context;

  return `You are a master character creator. Based on this story and protagonist, create a supporting cast of 4-6 characters who will populate this story world.

**Story Context:**
Title: ${title}
Synopsis: ${synopsis}
Genre: ${genre}
Tone: ${tone}
Themes: ${themes.join(', ')}

**Protagonist:**
Name: ${protagonist.name}
Personality: ${protagonist.personality.join(', ')}
Goals: ${protagonist.goals.join(', ')}
Current State: ${protagonist.currentState}

Create 4-6 supporting characters with these roles:
1. **Antagonist** (required): The primary opposition to the protagonist
2. **Mentor** (if appropriate): A guide or teacher figure
3. **Sidekick/Ally** (if appropriate): A close friend or companion
4. **Love Interest** (if appropriate): A romantic partner or potential romance
5. **Supporting Characters** (1-2): Other important characters (rival, family member, etc.)

For EACH character, provide the same structure as the protagonist:
- name (culturally appropriate)
- role (one of: antagonist, mentor, sidekick, love_interest, supporting)
- ethnicity (cultural/ethnic background)
- nationality (country or region, can be fictional)
- physicalDescription
- personality (5-7 traits)
- voiceSample (100-150 words in their voice)
- goals
- conflicts (internal and external)
- backstory
- currentState
- characterArc
- relationshipToProtagonist (how they relate to ${protagonist.name})

IMPORTANT:
- Make each character's voice DISTINCTLY different from the protagonist and each other
- Ensure the antagonist is compelling and has understandable motivations (not evil for evil's sake)
- Create dynamic relationships that will drive story conflict and growth
- Each character should feel essential to the story

Return ONLY a JSON array of character objects:
[
  {
    "name": "...",
    "role": "antagonist",
    "ethnicity": "...",
    "nationality": "...",
    "physicalDescription": "...",
    "personality": [...],
    "voiceSample": "...",
    "goals": [...],
    "conflicts": {
      "internal": [...],
      "external": [...]
    },
    "backstory": "...",
    "currentState": "...",
    "characterArc": "...",
    "relationshipToProtagonist": "..."
  },
  ...
]`;
}

function parseCharacterResponse(responseText: string, role: CharacterRole): Character {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const characterData = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!characterData.name || !characterData.voiceSample || !characterData.goals) {
      throw new Error('Character missing required fields');
    }

    const character: Character = {
      id: randomUUID(),
      role,
      ...characterData,
      relationships: [],
    };

    return character;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Character generation parse error');
    logger.error({ responseText }, 'Character generation response text');
    throw new Error(`Failed to parse character: ${error.message}`);
  }
}

function parseSupportingCastResponse(responseText: string): Character[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const charactersData = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(charactersData)) {
      throw new Error('Response is not an array');
    }

    const characters: Character[] = charactersData.map(charData => {
      const { relationshipToProtagonist, ...rest } = charData;

      return {
        id: randomUUID(),
        ...rest,
        relationships: relationshipToProtagonist ? [{
          characterId: '', // Will be filled in later when linking
          characterName: 'Protagonist',
          relationship: relationshipToProtagonist,
        }] : [],
      };
    });

    return characters;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Character generation parse error');
    logger.error({ responseText }, 'Character generation response text');
    throw new Error(`Failed to parse supporting cast: ${error.message}`);
  }
}
