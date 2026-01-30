import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import { claudeService } from './claude.service.js';
import { generateNameByNationality } from './name-generator.js';
import { extractJsonArray, extractJsonObject } from '../utils/json-extractor.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

dotenv.config();

const logger = createLogger('services:character-generator');

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

export interface NationalityDistribution {
  nationality: string;
  count: number;
}

export interface CharacterGenerationContext {
  title: string;
  synopsis: string;
  genre: string;
  tone: string;
  themes: string[];
  storyDNA?: any;
  nationalityConfig?: {
    mode: 'none' | 'single' | 'mixed' | 'custom';
    singleNationality?: string;
    distribution?: NationalityDistribution[];
  };
}

/**
 * Generate the protagonist character
 */
export async function generateProtagonist(
  context: CharacterGenerationContext,
  assignedNationality?: string
): Promise<Character> {
  const prompt = buildProtagonistPrompt(context, assignedNationality);

  logger.info({ assignedNationality }, '[CharacterGenerator] Generating protagonist...');

  try {
    const response = await claudeService.createCompletionWithUsage({
      system: '',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 3000,
      temperature: 0.9, // High creativity for unique character
      tracking: {
        requestType: AI_REQUEST_TYPES.CHARACTER_GENERATION,
        projectId: null,
        contextSummary: 'Generating protagonist character',
      },
    });

    const responseText = response.content;

    let character = parseCharacterResponse(responseText, 'protagonist');

    // Override name with nationality-appropriate name if specified
    if (assignedNationality && character.nationality && character.nationality !== '') {
      const gender = Math.random() < 0.5 ? 'male' : 'female';
      character.name = await generateNameByNationality(
        character.nationality,
        gender,
        { ethnicity: character.ethnicity, role: 'protagonist', genre: context.genre }
      );
    }

    logger.info({ name: character.name, nationality: character.nationality }, '[CharacterGenerator] Protagonist generated');

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
  protagonist: Character,
  assignedNationalities?: string[]
): Promise<Character[]> {
  const prompt = buildSupportingCastPrompt(context, protagonist, assignedNationalities);

  logger.info({ assignedNationalities }, '[CharacterGenerator] Generating supporting cast...');

  try {
    const response = await claudeService.createCompletionWithUsage({
      system: '',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 8000,
      temperature: 0.9,
      tracking: {
        requestType: AI_REQUEST_TYPES.CHARACTER_GENERATION,
        projectId: null,
        contextSummary: 'Generating supporting cast characters',
      },
    });

    const responseText = response.content;

    let characters = parseSupportingCastResponse(responseText);

    // Override names with nationality-appropriate names if specified
    if (assignedNationalities && assignedNationalities.length > 0) {
      for (let i = 0; i < characters.length && i < assignedNationalities.length; i++) {
        const nationality = characters[i].nationality;
        if (nationality && nationality !== '') {
          const gender = Math.random() < 0.5 ? 'male' : 'female';
          characters[i].name = await generateNameByNationality(
            nationality,
            gender,
            { ethnicity: characters[i].ethnicity, role: characters[i].role, genre: context.genre }
          );
        }
      }
    }

    logger.info({ count: characters.length }, '[CharacterGenerator] Supporting cast generated');

    return characters;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Character generation error');
    throw error;
  }
}

function buildProtagonistPrompt(context: CharacterGenerationContext, assignedNationality?: string): string {
  const { title, synopsis, genre, tone, themes } = context;

  const nationalityGuidance = assignedNationality
    ? `\n\nIMPORTANT: The protagonist MUST be from ${assignedNationality}. Ensure their nationality field is set to "${assignedNationality}" and their background, ethnicity, and cultural details are consistent with this nationality.`
    : `\n\nIMPORTANT NATIONALITY GUIDANCE: Choose a nationality that fits the story's setting naturally. Do NOT default to any particular ethnicity. For stories without a specific cultural setting, default to American or British. For stories set in specific regions, use nationalities from that region. DO NOT artificially force diversity by choosing African, Asian, or other ethnicities unless the story context calls for it.`;

  return `You are a master character creator. Based on this story, create a compelling, three-dimensional protagonist.${nationalityGuidance}

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
- **name**: Full name (first and last, appropriate to the story setting - default to American/British names unless the story suggests otherwise)
- **ethnicity**: Cultural/ethnic background (should match nationality naturally)
- **nationality**: Country or region of origin (default to American or British unless story context suggests otherwise; can be fictional for fantasy/sci-fi)
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
  protagonist: Character,
  assignedNationalities?: string[]
): string {
  const { title, synopsis, genre, tone, themes } = context;

  const nationalityGuidance = assignedNationalities && assignedNationalities.length > 0
    ? `\n\nIMPORTANT NATIONALITY REQUIREMENTS:
The supporting cast MUST include characters from these specific nationalities in order:
${assignedNationalities.map((nat, i) => `${i + 1}. Character ${i + 1}: ${nat}`).join('\n')}

Ensure each character's nationality field matches their assigned nationality, and their background, ethnicity, and cultural details are consistent.`
    : `\n\nIMPORTANT NATIONALITY GUIDANCE: The supporting cast should have nationalities that fit the story's setting naturally. Match the protagonist's cultural context unless the story requires otherwise. Do NOT artificially force diversity by choosing African, Asian, or other ethnicities unless the story context calls for it. For stories without a specific cultural setting, default to American or British nationalities.`;

  return `You are a master character creator. Based on this story and protagonist, create a supporting cast of 4-6 characters who will populate this story world.${nationalityGuidance}

**Story Context:**
Title: ${title}
Synopsis: ${synopsis}
Genre: ${genre}
Tone: ${tone}
Themes: ${themes.join(', ')}

**Protagonist:**
Name: ${protagonist.name}
Nationality: ${protagonist.nationality || 'Not specified'}
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
- name (appropriate to the story setting - should generally match protagonist's cultural context)
- role (one of: antagonist, mentor, sidekick, love_interest, supporting)
- ethnicity (cultural/ethnic background - should match nationality)
- nationality (country or region - should fit story setting, can be fictional)
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
    const characterData = extractJsonObject<any>(responseText);

    // Validate required fields
    if (!characterData.name || !characterData.voiceSample || !characterData.goals) {
      throw new Error('Character missing required fields');
    }

    const character: Character = {
      id: randomUUID(),
      role,
      name: characterData.name,
      ethnicity: characterData.ethnicity,
      nationality: characterData.nationality,
      physicalDescription: characterData.physicalDescription,
      personality: characterData.personality || [],
      voiceSample: characterData.voiceSample,
      goals: characterData.goals || [],
      conflicts: characterData.conflicts || { internal: [], external: [] },
      backstory: characterData.backstory,
      currentState: characterData.currentState,
      characterArc: characterData.characterArc,
      relationships: [],
    };

    return character;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Character generation parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'Character generation response text (truncated)');
    throw new Error(`Failed to parse character: ${error.message}`);
  }
}

function parseSupportingCastResponse(responseText: string): Character[] {
  try {
    const charactersData = extractJsonArray(responseText);

    const characters: Character[] = charactersData.map((charData: any) => {
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
    logger.error({ error: error.message }, 'Character generation parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'Character generation response text (truncated)');
    throw new Error(`Failed to parse supporting cast: ${error.message}`);
  }
}

/**
 * Regenerate dependent fields (backstory, character arc) when a character's name changes
 * Maintains narrative consistency while updating references to the new name
 */
export async function regenerateDependentFields(params: {
  projectId: string;
  characterId: string;
  newName: string;
  character: Character;
  fieldsToUpdate: ('backstory' | 'characterArc')[];
  storyContext?: {
    genre?: string;
    tone?: string;
    themes?: string[];
  };
}): Promise<{ backstory?: string; characterArc?: string }> {
  const { newName, character, fieldsToUpdate, storyContext } = params;

  logger.info({ characterId: params.characterId, newName, fieldsToUpdate }, 'Regenerating dependent fields for name change');

  // Build prompt for regeneration
  const prompt = buildDependentFieldsPrompt(newName, character, fieldsToUpdate, storyContext);

  try {
    const response = await claudeService.createCompletionWithUsage({
      system: '',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 2000,
      temperature: 0.8,
      tracking: {
        requestType: AI_REQUEST_TYPES.CHARACTER_DEPENDENT_FIELDS,
        projectId: params.projectId || null,
        contextSummary: `Regenerating ${fieldsToUpdate.join(', ')} for character ${newName}`,
      },
    });

    const responseText = response.content;

    const result = parseDependentFieldsResponse(responseText, fieldsToUpdate);

    logger.info({ characterId: params.characterId, fieldsUpdated: Object.keys(result) }, 'Dependent fields regenerated');

    return result;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating dependent fields');
    throw error;
  }
}

function buildDependentFieldsPrompt(
  newName: string,
  character: Character,
  fieldsToUpdate: ('backstory' | 'characterArc')[],
  storyContext?: { genre?: string; tone?: string; themes?: string[] }
): string {
  const updateBackstory = fieldsToUpdate.includes('backstory');
  const updateArc = fieldsToUpdate.includes('characterArc');

  let prompt = `You are a character development expert. A character's name has changed from "${character.name}" to "${newName}".

You need to update their ${fieldsToUpdate.join(' and ')} to reflect the new name while maintaining narrative consistency.

**Character Details:**
- New Name: ${newName}
- Role: ${character.role}
- Ethnicity: ${character.ethnicity || 'not specified'}
- Nationality: ${character.nationality || 'not specified'}
- Personality: ${character.personality.join(', ')}
- Physical Description: ${character.physicalDescription}
- Goals: ${character.goals.join(', ')}

**Story Context:**
${storyContext?.genre ? `- Genre: ${storyContext.genre}` : ''}
${storyContext?.tone ? `- Tone: ${storyContext.tone}` : ''}
${storyContext?.themes?.length ? `- Themes: ${storyContext.themes.join(', ')}` : ''}

**Original Content (for reference):**
${character.backstory ? `Backstory: ${character.backstory}` : ''}
${character.characterArc ? `Character Arc: ${character.characterArc}` : ''}

Generate updated content that:
1. References the NEW name (${newName}) throughout
2. Maintains the same narrative beats and character development
3. Preserves the emotional core and motivations
4. Keeps the same tone and style as the original
5. Ensures consistency with other character details

Return ONLY a JSON object in this format:
{
  ${updateBackstory ? '"backstory": "2-3 paragraph backstory using the new name",' : ''}
  ${updateArc ? '"characterArc": "2-3 sentence character arc using the new name"' : ''}
}`;

  return prompt;
}

function parseDependentFieldsResponse(
  responseText: string,
  fieldsToUpdate: ('backstory' | 'characterArc')[]
): { backstory?: string; characterArc?: string } {
  try {
    const data = extractJsonObject<{ backstory?: string; characterArc?: string }>(responseText);
    const result: { backstory?: string; characterArc?: string } = {};

    if (fieldsToUpdate.includes('backstory') && data.backstory) {
      result.backstory = data.backstory;
    }

    if (fieldsToUpdate.includes('characterArc') && data.characterArc) {
      result.characterArc = data.characterArc;
    }

    return result;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error parsing dependent fields response');
    throw new Error(`Failed to parse dependent fields: ${error.message}`);
  }
}

/**
 * Assign nationalities to characters based on configuration
 * Returns array of nationalities for [protagonist, ...supporting cast]
 */
export function assignNationalities(
  characterCount: number,
  nationalityConfig?: {
    mode: 'none' | 'single' | 'mixed' | 'custom';
    singleNationality?: string;
    distribution?: NationalityDistribution[];
  }
): string[] | undefined {
  if (!nationalityConfig || nationalityConfig.mode === 'none' || nationalityConfig.mode === 'custom') {
    return undefined; // Let AI decide or handle individually
  }

  if (nationalityConfig.mode === 'single' && nationalityConfig.singleNationality) {
    // All characters same nationality
    return Array(characterCount).fill(nationalityConfig.singleNationality);
  }

  if (nationalityConfig.mode === 'mixed' && nationalityConfig.distribution) {
    // Distribute based on counts
    const nationalities: string[] = [];
    for (const { nationality, count } of nationalityConfig.distribution) {
      for (let i = 0; i < count; i++) {
        nationalities.push(nationality);
      }
    }

    // Shuffle to avoid predictable ordering
    for (let i = nationalities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nationalities[i], nationalities[j]] = [nationalities[j], nationalities[i]];
    }

    return nationalities.slice(0, characterCount);
  }

  return undefined;
}
