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
  PlotStructure,
  PlotLayer,
} from '../shared/types/index.js';
import { getStructureTemplate } from './structure-templates.js';
import { createLogger } from './logger.service.js';
import { extractJsonArray } from '../utils/json-extractor.js';

dotenv.config();

const logger = createLogger('services:outline-generator');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Sonnet for faster generation with good quality
// Opus 4.5 is too slow for outline generation (12+ minutes)
const OUTLINE_MODEL = 'claude-sonnet-4-20250514';

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
  plotStructure?: PlotStructure; // Plot layers to guide outline generation
  // Progress tracking callback - receives current step info
  onProgress?: (progress: OutlineProgress) => void;
  // Incremental save callback - called after each act/chapter is generated
  onIncrementalSave?: (partialOutline: StoryStructure) => Promise<void>;
}

export interface OutlineProgress {
  phase: 'acts' | 'chapters' | 'scenes' | 'complete';
  currentAct?: number;
  totalActs?: number;
  currentChapter?: number;
  totalChapters?: number;
  message: string;
  percentComplete: number;
}

/**
 * Generate complete story outline with act breakdown and chapter-by-chapter structure
 * Now supports progress tracking and incremental saving for better UX and failsafe recovery
 */
export async function generateOutline(context: OutlineContext): Promise<StoryStructure> {
  const { onProgress, onIncrementalSave } = context;

  logger.info(`[OutlineGenerator] Generating outline for: ${context.concept.title}`);
  logger.info(`[OutlineGenerator] Structure type: ${context.structureType}`);
  logger.info(`[OutlineGenerator] Target word count: ${context.targetWordCount}`);

  // Helper to report progress
  const reportProgress = (progress: OutlineProgress) => {
    logger.info({ ...progress }, `[OutlineGenerator] Progress: ${progress.message}`);
    if (onProgress) {
      try {
        onProgress(progress);
      } catch (e) {
        logger.error({ error: e }, '[OutlineGenerator] Error in progress callback');
      }
    }
  };

  // Get the structure template
  const template = getStructureTemplate(context.structureType);
  if (!template) {
    throw new Error(`Unknown structure type: ${context.structureType}`);
  }

  // Calculate target chapter count (assuming 2000-2500 words per chapter)
  const avgWordsPerChapter = 2200;
  const targetChapterCount = Math.round(context.targetWordCount / avgWordsPerChapter);

  logger.info(`[OutlineGenerator] Target chapters: ${targetChapterCount}`);

  reportProgress({
    phase: 'acts',
    message: 'Generating act structure breakdown...',
    percentComplete: 5,
  });

  // Generate act-level breakdown with chapter assignments
  const acts = await generateActBreakdown(context, template, targetChapterCount);
  const totalActs = acts.length;

  reportProgress({
    phase: 'acts',
    totalActs,
    message: `Act structure complete (${totalActs} acts)`,
    percentComplete: 15,
  });

  // Generate detailed chapter outlines for each act
  let globalChapterCount = 0;
  for (let i = 0; i < acts.length; i++) {
    const actNum = i + 1;
    reportProgress({
      phase: 'chapters',
      currentAct: actNum,
      totalActs,
      message: `Generating chapters for Act ${actNum}...`,
      percentComplete: 15 + (i / totalActs) * 25,
    });

    logger.info(`[OutlineGenerator] Generating chapters for Act ${actNum}...`);
    acts[i].chapters = await generateChaptersForAct(context, acts[i], template);
    globalChapterCount += acts[i].chapters.length;

    // Incremental save after each act's chapters are generated
    if (onIncrementalSave) {
      try {
        await onIncrementalSave({ type: context.structureType, acts });
      } catch (e) {
        logger.error({ error: e }, '[OutlineGenerator] Error in incremental save after chapters');
      }
    }
  }

  reportProgress({
    phase: 'scenes',
    totalChapters: globalChapterCount,
    message: `All ${globalChapterCount} chapters outlined. Now generating scene cards...`,
    percentComplete: 40,
  });

  // Generate scene cards for each chapter
  let chaptersProcessed = 0;
  for (const act of acts) {
    for (let i = 0; i < act.chapters.length; i++) {
      chaptersProcessed++;
      const chapterNum = act.chapters[i].number;

      reportProgress({
        phase: 'scenes',
        currentAct: act.number,
        totalActs,
        currentChapter: chapterNum,
        totalChapters: globalChapterCount,
        message: `Generating scene cards for Chapter ${chapterNum} (${chaptersProcessed}/${globalChapterCount})...`,
        percentComplete: 40 + (chaptersProcessed / globalChapterCount) * 55,
      });

      logger.info(
        `[OutlineGenerator] Generating scene cards for Chapter ${chapterNum}...`
      );
      act.chapters[i].scenes = await generateSceneCards(context, act.chapters[i], act);

      // Incremental save after each chapter's scenes are generated
      if (onIncrementalSave && chaptersProcessed % 3 === 0) {
        try {
          await onIncrementalSave({ type: context.structureType, acts });
        } catch (e) {
          logger.error({ error: e }, '[OutlineGenerator] Error in incremental save after scenes');
        }
      }
    }
  }

  const storyStructure: StoryStructure = {
    type: context.structureType,
    acts,
  };

  // Final save
  if (onIncrementalSave) {
    try {
      await onIncrementalSave(storyStructure);
    } catch (e) {
      logger.error({ error: e }, '[OutlineGenerator] Error in final incremental save');
    }
  }

  reportProgress({
    phase: 'complete',
    totalActs,
    totalChapters: globalChapterCount,
    message: 'Outline generation complete!',
    percentComplete: 100,
  });

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
    logger.info('[OutlineGenerator] Calling Claude API for act breakdown...');

    const message = await anthropic.messages.create({
      model: OUTLINE_MODEL,
      max_tokens: 4000,
      temperature: 0.8,
      system: 'You are a JSON API that generates story outlines. Always respond with valid JSON only, no markdown formatting, no explanations, no code blocks - just raw JSON.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    logger.info({
      stopReason: message.stop_reason,
      contentBlocks: message.content.length,
      usage: message.usage
    }, '[OutlineGenerator] Claude API response received');

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    if (!responseText) {
      logger.error('[OutlineGenerator] Claude returned empty response text');
      throw new Error('Claude API returned empty response');
    }

    logger.info({
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500)
    }, '[OutlineGenerator] Response text preview');

    const acts = parseActBreakdownResponse(responseText, template);

    return acts;
  } catch (error: any) {
    logger.error({ error }, 'Error generating act breakdown');
    throw error;
  }
}

/**
 * Format plot structure for inclusion in prompts
 */
function formatPlotStructureForPrompt(plotStructure?: PlotStructure): string {
  if (!plotStructure || !plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
    return '';
  }

  const mainPlot = plotStructure.plot_layers.find(l => l.type === 'main');
  const subplots = plotStructure.plot_layers.filter(l => l.type === 'subplot');
  const characterArcs = plotStructure.plot_layers.filter(l => l.type === 'character-arc');
  const mysteries = plotStructure.plot_layers.filter(l => l.type === 'mystery');
  const romances = plotStructure.plot_layers.filter(l => l.type === 'romance');

  let plotSection = '\n**PLOT STRUCTURE (CRITICAL - Must be integrated into outline):**\n';

  if (mainPlot) {
    plotSection += `\n**Main Plot (Golden Thread):** ${mainPlot.name}\n${mainPlot.description}\n`;
    if (mainPlot.points && mainPlot.points.length > 0) {
      plotSection += 'Key plot points:\n';
      mainPlot.points.forEach(p => {
        plotSection += `  - Chapter ${p.chapter_number}: ${p.description} (${p.phase}, impact: ${p.impact_level}/5)\n`;
      });
    }
  }

  if (subplots.length > 0) {
    plotSection += '\n**Subplots:**\n';
    subplots.forEach(sp => {
      plotSection += `- ${sp.name}: ${sp.description}\n`;
    });
  }

  if (characterArcs.length > 0) {
    plotSection += '\n**Character Arcs:**\n';
    characterArcs.forEach(ca => {
      plotSection += `- ${ca.name}: ${ca.description}\n`;
    });
  }

  if (mysteries.length > 0) {
    plotSection += '\n**Mystery Threads:**\n';
    mysteries.forEach(m => {
      plotSection += `- ${m.name}: ${m.description}\n`;
    });
  }

  if (romances.length > 0) {
    plotSection += '\n**Romance Arcs:**\n';
    romances.forEach(r => {
      plotSection += `- ${r.name}: ${r.description}\n`;
    });
  }

  if (plotStructure.act_structure) {
    plotSection += `\n**Act Structure Markers:**
- Act I ends at chapter ${plotStructure.act_structure.act_one_end}
- Midpoint at chapter ${plotStructure.act_structure.act_two_midpoint}
- Act II ends at chapter ${plotStructure.act_structure.act_two_end}
- Climax at chapter ${plotStructure.act_structure.act_three_climax}\n`;
  }

  return plotSection;
}

function buildActBreakdownPrompt(
  context: OutlineContext,
  template: any,
  targetChapterCount: number
): string {
  const { concept, storyDNA, characters, world, plotStructure } = context;

  const protagonist = characters.find((c) => c.role === 'protagonist');
  const antagonist = characters.find((c) => c.role === 'antagonist');
  const plotSection = formatPlotStructureForPrompt(plotStructure);
  const hasPlots = plotStructure && plotStructure.plot_layers && plotStructure.plot_layers.length > 0;

  return `You are a master story architect. Generate a detailed act breakdown for this novel using the ${template.name} structure.

**Story Concept:**
Title: ${concept.title}
Logline: ${concept.logline}
Synopsis: ${concept.synopsis}

**Genre:** ${storyDNA.genre} - ${storyDNA.subgenre}
**Tone:** ${storyDNA.tone}
**Themes:** ${storyDNA.themes.join(', ')}
${plotSection}
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
${hasPlots ? '5. CRITICAL: Incorporates ALL plot threads (main plot, subplots, character arcs) defined above\n6. Ensures plot points occur at or near their designated chapters' : ''}

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

Make the descriptions SPECIFIC to this story, not generic beat descriptions.${hasPlots ? ' Reference specific plot threads by name where relevant.' : ''}`;
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
      model: OUTLINE_MODEL,
      max_tokens: 6000,
      temperature: 0.8,
      system: 'You are a JSON API that generates story outlines. Always respond with valid JSON only, no markdown formatting, no explanations, no code blocks - just raw JSON.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info({
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 300)
    }, '[OutlineGenerator] Chapter response preview');

    const chapters = parseChapterOutlineResponse(responseText, act);

    return chapters;
  } catch (error: any) {
    logger.error({ error }, 'Error generating chapters for act');
    throw error;
  }
}

/**
 * Get plot points for a specific chapter range
 */
function getPlotPointsForChapterRange(
  plotStructure: PlotStructure | undefined,
  startChapter: number,
  endChapter: number
): string {
  if (!plotStructure || !plotStructure.plot_layers) return '';

  const relevantPoints: string[] = [];
  for (const layer of plotStructure.plot_layers) {
    if (!layer.points) continue;
    for (const point of layer.points) {
      if (point.chapter_number >= startChapter && point.chapter_number <= endChapter) {
        relevantPoints.push(`- Chapter ${point.chapter_number} [${layer.name}]: ${point.description} (${point.phase})`);
      }
    }
  }

  if (relevantPoints.length === 0) return '';
  return `\n**Plot Points to Include in This Act:**\n${relevantPoints.join('\n')}\n`;
}

function buildChapterOutlinePrompt(
  context: OutlineContext,
  act: Act,
  template: any
): string {
  const { concept, storyDNA, characters, plotStructure } = context;

  const characterList = characters.map((c) => `- ${c.name} (${c.role})`).join('\n');

  // Get the starting chapter number based on previous acts
  const startingChapterNumber = 1; // Will be adjusted in parsing

  // Get relevant plot threads for this act
  const hasPlots = plotStructure && plotStructure.plot_layers && plotStructure.plot_layers.length > 0;
  let plotContext = '';

  if (hasPlots) {
    // Extract main plot and subplots for context
    const mainPlot = plotStructure!.plot_layers.find(l => l.type === 'main');
    const activeSubplots = plotStructure!.plot_layers.filter(l => l.type !== 'main');

    plotContext = '\n**Plot Threads to Weave Into Chapters:**\n';
    if (mainPlot) {
      plotContext += `Main Plot: ${mainPlot.name} - ${mainPlot.description}\n`;
    }
    if (activeSubplots.length > 0) {
      plotContext += 'Active Subplots:\n';
      activeSubplots.forEach(sp => {
        plotContext += `- ${sp.name}: ${sp.description}\n`;
      });
    }

    // Estimate chapter range for this act (rough calculation)
    const actChapterCount = (act as any).chapterCount || 10;
    const estimatedStartChapter = (act.number - 1) * actChapterCount + 1;
    const estimatedEndChapter = act.number * actChapterCount;
    plotContext += getPlotPointsForChapterRange(plotStructure, estimatedStartChapter, estimatedEndChapter);
  }

  return `You are a master story architect. Generate chapter-by-chapter outlines for ${act.name}.

**Story:** ${concept.title}
${concept.logline}

**Act Details:**
${act.description}

**Act Beats:**
${act.beats.map((b) => `- ${b.name}: ${b.description}`).join('\n')}
${plotContext}
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
${hasPlots ? '6. CRITICAL: Advance the defined plot threads appropriately\n7. Include any specified plot points at their designated chapters' : ''}

Return ONLY a JSON array of chapters:
[
  {
    "title": "Chapter Title",
    "summary": "2-3 sentence summary of what happens in this chapter",
    "povCharacter": "Character Name",
    "wordCountTarget": 2000,
    "beatName": "Which beat this chapter corresponds to (if any)"${hasPlots ? ',\n    "plotThreads": ["Names of plot threads advanced in this chapter"]' : ''}
  }
]

Make each chapter summary SPECIFIC with concrete events, not vague descriptions.${hasPlots ? ' Reference specific plot threads and ensure they progress logically.' : ''}`;
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
      model: OUTLINE_MODEL,
      max_tokens: 3000,
      temperature: 0.7,
      system: 'You are a JSON API that generates story outlines. Always respond with valid JSON only, no markdown formatting, no explanations, no code blocks - just raw JSON.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info({
      responseLength: responseText.length,
      chapterNumber: chapter.number
    }, '[OutlineGenerator] Scene cards response for chapter');

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
