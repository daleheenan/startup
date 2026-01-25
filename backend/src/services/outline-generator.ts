import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import type {
  StoryStructureType,
  StoryStructure,
  Act,
  ChapterOutline,
  SceneCard,
  StoryDNA,
  Character,
  WorldElements,
} from '../shared/types/index.js';
import { getStructureTemplate } from './structure-templates.js';
import { createLogger } from './logger.service.js';
import { extractJsonArray } from '../utils/json-extractor.js';

dotenv.config();

const logger = createLogger('services:outline-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface OutlineContext {
  concept: {
    title: string;
    logline: string;
    synopsis: string;
  };
  storyDNA: StoryDNA;
  characters: Character[];
  world: WorldElements;
  structureType: StoryStructureType;
  targetWordCount: number;
}

/**
 * Generate complete story outline with act breakdown and chapter-by-chapter structure
 */
export async function generateOutline(context: OutlineContext): Promise<StoryStructure> {
  logger.info(`[OutlineGenerator] Generating outline for: ${context.concept.title}`);
  logger.info(`[OutlineGenerator] Structure type: ${context.structureType}`);
  logger.info(`[OutlineGenerator] Target word count: ${context.targetWordCount}`);

  // Get the structure template
  const template = getStructureTemplate(context.structureType);
  if (!template) {
    throw new Error(`Unknown structure type: ${context.structureType}`);
  }

  // Calculate target chapter count (assuming 2000-2500 words per chapter)
  const avgWordsPerChapter = 2200;
  const targetChapterCount = Math.round(context.targetWordCount / avgWordsPerChapter);

  logger.info(`[OutlineGenerator] Target chapters: ${targetChapterCount}`);

  // Generate act-level breakdown with chapter assignments
  const acts = await generateActBreakdown(context, template, targetChapterCount);

  // Generate detailed chapter outlines for each act
  for (let i = 0; i < acts.length; i++) {
    logger.info(`[OutlineGenerator] Generating chapters for Act ${i + 1}...`);
    acts[i].chapters = await generateChaptersForAct(context, acts[i], template);
  }

  // Generate scene cards for each chapter
  for (const act of acts) {
    for (let i = 0; i < act.chapters.length; i++) {
      logger.info(
        `[OutlineGenerator] Generating scene cards for Chapter ${act.chapters[i].number}...`
      );
      act.chapters[i].scenes = await generateSceneCards(context, act.chapters[i], act);
    }
  }

  const storyStructure: StoryStructure = {
    type: context.structureType,
    acts,
  };

  logger.info('[OutlineGenerator] Outline generation complete');

  return storyStructure;
}

/**
 * Generate act-level breakdown with beat descriptions and chapter count per act
 */
async function generateActBreakdown(
  context: OutlineContext,
  template: any,
  targetChapterCount: number
): Promise<Act[]> {
  const prompt = buildActBreakdownPrompt(context, template, targetChapterCount);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4000,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const acts = parseActBreakdownResponse(responseText, template);

    return acts;
  } catch (error: any) {
    logger.error({ error }, 'Error generating act breakdown');
    throw error;
  }
}

function buildActBreakdownPrompt(
  context: OutlineContext,
  template: any,
  targetChapterCount: number
): string {
  const { concept, storyDNA, characters, world } = context;

  const protagonist = characters.find((c) => c.role === 'protagonist');
  const antagonist = characters.find((c) => c.role === 'antagonist');

  return `You are a master story architect. Generate a detailed act breakdown for this novel using the ${template.name} structure.

**Story Concept:**
Title: ${concept.title}
Logline: ${concept.logline}
Synopsis: ${concept.synopsis}

**Genre:** ${storyDNA.genre} - ${storyDNA.subgenre}
**Tone:** ${storyDNA.tone}
**Themes:** ${storyDNA.themes.join(', ')}

**Protagonist:** ${protagonist?.name} - ${protagonist?.role}
${protagonist?.voiceSample}

**Antagonist:** ${antagonist?.name || 'No direct antagonist (internal conflict or systemic)'}

**Target:** ${targetChapterCount} chapters total

**Structure Template:**
${JSON.stringify(template.acts, null, 2)}

Generate a detailed act breakdown that:
1. Maps the story to the ${template.name} structure
2. Describes how each beat will play out in THIS specific story
3. Assigns chapter counts to each act (total must equal ${targetChapterCount})
4. Ensures each act has appropriate pacing and word count

Return ONLY a JSON array of acts in this format:
[
  {
    "number": 1,
    "name": "Act Name",
    "description": "What happens in this act for THIS story",
    "beats": [
      {
        "name": "Beat Name",
        "description": "Specific events for THIS story at this beat",
        "percentagePoint": 25
      }
    ],
    "targetWordCount": 20000,
    "chapterCount": 10
  }
]

Make the descriptions SPECIFIC to this story, not generic beat descriptions.`;
}

function parseActBreakdownResponse(responseText: string, template: any): Act[] {
  try {
    const actsData = extractJsonArray(responseText);

    if (!actsData || actsData.length === 0) {
      throw new Error('Empty acts array in response');
    }

    const acts: Act[] = actsData.map((actData: any) => ({
      ...actData,
      chapters: [], // Will be populated next
    }));

    return acts;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Outline parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'Outline response text (truncated)');
    throw new Error(`Failed to parse act breakdown: ${error.message}`);
  }
}

/**
 * Generate chapter outlines for a specific act
 */
async function generateChaptersForAct(
  context: OutlineContext,
  act: Act,
  template: any
): Promise<ChapterOutline[]> {
  const prompt = buildChapterOutlinePrompt(context, act, template);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 6000,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const chapters = parseChapterOutlineResponse(responseText, act);

    return chapters;
  } catch (error: any) {
    logger.error({ error }, 'Error generating chapters for act');
    throw error;
  }
}

function buildChapterOutlinePrompt(
  context: OutlineContext,
  act: Act,
  template: any
): string {
  const { concept, storyDNA, characters } = context;

  const characterList = characters.map((c) => `- ${c.name} (${c.role})`).join('\n');

  // Get the starting chapter number based on previous acts
  const startingChapterNumber = 1; // Will be adjusted in parsing

  return `You are a master story architect. Generate chapter-by-chapter outlines for ${act.name}.

**Story:** ${concept.title}
${concept.logline}

**Act Details:**
${act.description}

**Act Beats:**
${act.beats.map((b) => `- ${b.name}: ${b.description}`).join('\n')}

**Characters:**
${characterList}

**Tone:** ${storyDNA.tone}
**Themes:** ${storyDNA.themes.join(', ')}

Generate ${(act as any).chapterCount || 10} chapters for this act. Each chapter should:
1. Have a compelling title
2. Cover specific plot events that advance the story
3. Specify POV character
4. Have appropriate word count target (1800-2500 words)
5. Map to the act's beats

Return ONLY a JSON array of chapters:
[
  {
    "title": "Chapter Title",
    "summary": "2-3 sentence summary of what happens in this chapter",
    "povCharacter": "Character Name",
    "wordCountTarget": 2000,
    "beatName": "Which beat this chapter corresponds to (if any)"
  }
]

Make each chapter summary SPECIFIC with concrete events, not vague descriptions.`;
}

function parseChapterOutlineResponse(responseText: string, act: Act): ChapterOutline[] {
  try {
    const chaptersData = extractJsonArray(responseText);

    // Calculate starting chapter number based on previous chapters
    const chapterOffset = 0; // Will be adjusted when combining all acts

    const chapters: ChapterOutline[] = chaptersData.map((chData: any, index: number) => ({
      number: chapterOffset + index + 1,
      title: chData.title,
      summary: chData.summary,
      actNumber: act.number,
      beatName: chData.beatName,
      povCharacter: chData.povCharacter,
      wordCountTarget: chData.wordCountTarget || 2000,
      scenes: [], // Will be populated next
    }));

    return chapters;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Outline parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'Outline response text (truncated)');
    throw new Error(`Failed to parse chapter outlines: ${error.message}`);
  }
}

/**
 * Generate scene cards for a specific chapter
 */
async function generateSceneCards(
  context: OutlineContext,
  chapter: ChapterOutline,
  act: Act
): Promise<SceneCard[]> {
  const prompt = buildSceneCardPrompt(context, chapter, act);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const sceneCards = parseSceneCardsResponse(responseText);

    return sceneCards;
  } catch (error: any) {
    logger.error({ error }, 'Error generating scene cards');
    throw error;
  }
}

function buildSceneCardPrompt(
  context: OutlineContext,
  chapter: ChapterOutline,
  act: Act
): string {
  const { concept, storyDNA, characters, world } = context;

  const povChar = characters.find((c) => c.name === chapter.povCharacter);

  const locations = (world?.locations || []).map((l) => `- ${l.name}: ${l.description}`).join('\n') || 'No specific locations defined';

  return `You are a master story architect. Generate detailed scene cards for Chapter ${chapter.number}: "${chapter.title}".

**Chapter Summary:**
${chapter.summary}

**POV Character:** ${chapter.povCharacter}
${povChar?.voiceSample || ''}

**Act Context:**
${act.description}

**Available Locations:**
${locations}

**Available Characters:**
${characters.map((c) => `- ${c.name} (${c.role})`).join('\n')}

Generate 1-3 scene cards for this chapter. Each scene should:
1. Take place in a specific location
2. Have a clear goal for the POV character
3. Include conflict or tension
4. Have a clear outcome (success, failure, or complication)
5. Create an emotional beat

Return ONLY a JSON array of scenes:
[
  {
    "location": "Location Name",
    "characters": ["Character 1", "Character 2"],
    "povCharacter": "${chapter.povCharacter}",
    "timeOfDay": "morning/afternoon/evening/night",
    "goal": "What POV character wants in this scene",
    "conflict": "What opposes the goal",
    "outcome": "What happens (yes/no/yes-but/no-and)",
    "emotionalBeat": "How POV character feels at end of scene",
    "notes": "Any additional context or important details"
  }
]

Be SPECIFIC - concrete goals, conflicts, and outcomes, not generic descriptions.`;
}

function parseSceneCardsResponse(responseText: string): SceneCard[] {
  try {
    const scenesData = extractJsonArray(responseText);

    const scenes: SceneCard[] = scenesData.map((scData: any, index: number) => ({
      id: randomUUID(),
      order: index + 1,
      location: scData.location,
      characters: scData.characters || [],
      povCharacter: scData.povCharacter,
      timeOfDay: scData.timeOfDay,
      goal: scData.goal,
      conflict: scData.conflict,
      outcome: scData.outcome,
      emotionalBeat: scData.emotionalBeat,
      notes: scData.notes,
    }));

    return scenes;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Outline parse error');
    logger.error({ responseText: responseText.substring(0, 500) }, 'Outline response text (truncated)');
    throw new Error(`Failed to parse scene cards: ${error.message}`);
  }
}
