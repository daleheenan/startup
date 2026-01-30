import db from '../db/connection.js';
import type {
  StoryDNA,
  Character,
  SceneCard,
  Chapter,
  Book,
  Project,
} from '../shared/types/index.js';
import { editorialLessonsService } from './editorial-lessons.service.js';
import { getCompactStylePrinciples } from '../shared/style-principles.js';
import { romanceCommercialService, type RomanceHeatLevel, type RomanceBeat } from './romance-commercial.service.js';
import { thrillerCommercialService, type ThrillerPacing, type ChapterHook, type TickingClock } from './thriller-commercial.service.js';
import { sciFiCommercialService, type SciFiClassification, HARDNESS_EXPECTATIONS } from './scifi-commercial.service.js';
import { BestsellerModeService } from './bestseller-mode.service.js';
import { createLogger } from './logger.service.js';

// Bestseller mode singleton instance
const bestsellerModeService = new BestsellerModeService();

const logger = createLogger('services:context-assembly');

/**
 * ContextAssemblyService builds minimal, targeted prompts for chapter generation.
 *
 * Target: ~2,150 tokens per chapter context
 * Components:
 * - Story DNA: ~300 tokens
 * - POV Character Core: ~400 tokens
 * - Scene Card: ~300 tokens
 * - Other Characters: ~450 tokens
 * - Last Chapter Summary: ~200 tokens
 * - System Prompts: ~500 tokens
 * - Commercial Genre Guidance: ~200 tokens (when applicable)
 *
 * BUG-008 FIX: Added comprehensive null safety checks
 *
 * Commercial Genre Integration:
 * - Romance: Heat level, sensuality focus, beat expectations
 * - Thriller: Pacing style, tension curve, hook requirements
 * - Sci-Fi: Hardness level, tech explanation depth, accuracy priority
 */

// ============================================================================
// Types for Commercial Genre Settings
// ============================================================================

interface CommercialGenreContext {
  romance?: {
    heatLevel: RomanceHeatLevel;
    trackedBeats: RomanceBeat[];
    beatsDueThisChapter: RomanceBeat[];
  };
  thriller?: {
    pacing: ThrillerPacing;
    activeClocks: TickingClock[];
    chapterHooks: ChapterHook[];
  };
  scifi?: {
    classification: SciFiClassification;
  };
}

/**
 * Safely join an array, returning a fallback if undefined/empty
 */
function safeJoin(arr: any[] | undefined | null, separator: string = ', ', fallback: string = 'None'): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return fallback;
  }
  return arr.join(separator);
}

export class ContextAssemblyService {
  /**
   * Assemble complete context for chapter generation
   */
  assembleChapterContext(chapterId: string): {
    system: string;
    userPrompt: string;
    estimatedTokens: number;
  } {
    // Fetch all necessary data
    const chapter = this.getChapter(chapterId);
    const book = this.getBook(chapter.book_id);
    const project = this.getProject(book.project_id);

    if (!project.story_dna || !project.story_bible) {
      throw new Error('Project missing Story DNA or Story Bible');
    }

    // BUG-008 FIX: Validate scene_cards exists and has content
    if (!chapter.scene_cards || chapter.scene_cards.length === 0) {
      throw new Error(`Chapter ${chapterId} has no scene cards - cannot generate without scenes`);
    }

    const storyDNA = project.story_dna;

    // BUG-008 FIX: Safely access first scene card with optional chaining
    const firstScene = chapter.scene_cards[0];
    if (!firstScene) {
      throw new Error(`Chapter ${chapterId} scene_cards array is empty`);
    }

    const povCharacterName = firstScene.povCharacter;
    if (!povCharacterName) {
      throw new Error(`First scene card in chapter ${chapterId} is missing POV character`);
    }

    // BUG-008 FIX: Safe character lookup with null check
    const povCharacter = this.findCharacter(
      project.story_bible?.characters || [],
      povCharacterName
    );

    if (!povCharacter) {
      throw new Error(`POV character not found in story bible: ${povCharacterName}`);
    }

    // Get characters appearing in this chapter's scenes
    const characterNames = new Set<string>();
    chapter.scene_cards.forEach((scene) => {
      if (scene.characters && Array.isArray(scene.characters)) {
        scene.characters.forEach((name) => characterNames.add(name));
      }
    });
    characterNames.delete(povCharacterName); // Remove POV character from "others"

    // BUG-008 FIX: Use type guard to ensure only Character objects are in array
    const otherCharacters = Array.from(characterNames)
      .map((name) => this.findCharacter(project.story_bible?.characters || [], name))
      .filter((char): char is Character => char !== null);

    // Get previous chapter summary for context
    const lastChapterSummary = this.getLastChapterSummary(chapter.book_id, chapter.chapter_number);

    // Get lessons learned from editorial reviews
    const lessonsSummary = editorialLessonsService.getLessonsSummaryForPrompt(
      project.id,
      storyDNA.genre,
      storyDNA.tone
    );

    // Get commercial genre settings (romance, thriller, sci-fi)
    const commercialContext = this.getCommercialGenreContext(
      project.id,
      storyDNA.genre,
      chapter.chapter_number
    );

    // Build system prompt (Author Agent persona)
    const systemPrompt = this.buildAuthorAgentPrompt(
      storyDNA,
      povCharacter,
      lessonsSummary,
      commercialContext,
      project.id
    );

    // Build user prompt (context + instructions)
    const userPrompt = this.buildUserPrompt(
      storyDNA,
      povCharacter,
      chapter.scene_cards,
      otherCharacters,
      lastChapterSummary,
      chapter.chapter_number,
      chapter.title || `Chapter ${chapter.chapter_number}`,
      commercialContext
    );

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

    return {
      system: systemPrompt,
      userPrompt,
      estimatedTokens,
    };
  }

  /**
   * Build Author Agent system prompt with genre-specific persona
   */
  private buildAuthorAgentPrompt(
    storyDNA: StoryDNA,
    povCharacter: Character,
    lessonsSummary?: string,
    commercialContext?: CommercialGenreContext,
    projectId?: string
  ): string {
    const { genre, subgenre, tone, themes, proseStyle, timeframe } = storyDNA;

    let prompt = `AUTHOR AGENT - ${genre.toUpperCase()} SPECIALIST

You are a bestselling ${genre} author specializing in ${subgenre}. Your mission is to write compelling, immersive chapters that bring this story to life.

GENRE & STYLE:
- Genre: ${genre} (${subgenre})
- Tone: ${tone}
- Themes: ${safeJoin(themes)}
${timeframe ? `- Time Period/Era: ${timeframe} - Ensure historical accuracy, appropriate technology level, and cultural context for this era` : ''}
- Prose Style: ${proseStyle}

MASS MARKET READING LEVEL (CRITICAL):
Your writing MUST be accessible to a broad mass market audience:
- TARGET READING LEVEL: Grade 7-8 (age 12-14 equivalent) - this is standard for bestselling commercial fiction
- VOCABULARY: Use common, everyday words. Avoid jargon, technical terms, obscure vocabulary, or specialist knowledge unless essential to the story
- SENTENCE LENGTH: Mix short punchy sentences with medium-length ones. Avoid overly complex, multi-clause sentences
- CONCEPT DENSITY: Don't overload paragraphs with too many ideas. One main concept per paragraph
- AVOID: Academic language, philosophical abstractions, dense exposition, info-dumps disguised as dialogue
- PREFER: Clear, direct prose that flows easily. If a simpler word works, use it
- DIALOGUE: Natural speech patterns, not lectures or monologues. Characters speak like real people
- EXPLANATIONS: When explaining anything, do so through action and experience, not narration

WRITING PRINCIPLES:
1. Show, don't tell - Use vivid sensory details and character actions
2. Deep POV - Write from inside ${povCharacter.name}'s perspective, using their unique voice
3. Character-driven - Every action must flow from character motivation
4. Tension in every scene - Something must be at stake
5. Emotional authenticity - Make readers feel what the POV character feels
6. Genre conventions - Honor ${genre} reader expectations while surprising them
7. Strong endings - End with a hook that propels the reader forward
8. Accessibility - Keep prose readable and engaging for the widest possible audience

VOICE GUIDELINES:
Your prose should match this style: ${proseStyle}
Remember: Clarity and accessibility are essential. Bestselling authors like James Patterson, Lee Child, and Nora Roberts write at a 7th-grade reading level.

You write with precision, clarity, and emotional depth. Every sentence serves the story.

FORMATTING REQUIREMENTS (CRITICAL):
- Write PURE PROSE only - like a professionally published novel
- NO markdown formatting (no #, ##, **, _, etc.)
- NO scene numbers, scene titles, or scene headers in the output
- NO "Scene 1:", "Part 1:", or similar structural markers
- Use scene breaks with a single blank line between scenes, nothing more
- Start paragraphs with standard indentation (the system handles this)
- Write flowing narrative prose that reads like a published book

AVOID AI WRITING TELLS (CRITICAL):
- NEVER use em-dashes (—) - use commas, periods, or restructure sentences instead
- AVOID overusing "however", "moreover", "furthermore", "additionally", "certainly"
- AVOID purple prose and overly ornate descriptions
- AVOID starting sentences with "As" or "While" repeatedly
- AVOID the phrase "a sense of" or "couldn't help but"
- AVOID "felt a wave of" or "washed over" for emotions
- AVOID "the weight of" as a metaphor
- AVOID ending chapters with single-sentence paragraphs for dramatic effect
- AVOID lists of three adjectives or descriptions in a row
- USE varied sentence structures - not every sentence should be complex
- USE contractions naturally in dialogue and close POV narration
- PREFER simple, direct prose over elaborate constructions

${getCompactStylePrinciples()}`;

    // Append commercial genre guidance if available
    const commercialGuidance = this.buildCommercialGenreGuidance(commercialContext);
    if (commercialGuidance) {
      prompt += `\n\n${commercialGuidance}`;
    }

    // Append bestseller mode enhancements if enabled
    if (projectId) {
      const bestsellerEnhancements = bestsellerModeService.getBestsellerPromptEnhancements(projectId);
      if (bestsellerEnhancements) {
        prompt += bestsellerEnhancements;
        logger.debug({ projectId }, 'Added bestseller mode prompt enhancements');
      }
    }

    // Append lessons learned from editorial reviews if available
    if (lessonsSummary && lessonsSummary.trim().length > 0) {
      prompt += `\n\n${lessonsSummary}`;
    }

    return prompt;
  }

  /**
   * Build user prompt with all context components
   */
  private buildUserPrompt(
    storyDNA: StoryDNA,
    povCharacter: Character,
    sceneCards: SceneCard[],
    otherCharacters: Character[],
    lastChapterSummary: string | null,
    chapterNumber: number,
    chapterTitle: string,
    commercialContext?: CommercialGenreContext
  ): string {
    let prompt = `Write ${chapterTitle}.

`;

    // POV Character Core (~400 tokens)
    prompt += `POV CHARACTER: ${povCharacter.name}
Role: ${povCharacter.role}

Voice Sample (write in this style):
"${povCharacter.voiceSample}"

Current State:
`;

    if (povCharacter.currentState) {
      prompt += `- Location: ${povCharacter.currentState.location}
- Emotional State: ${povCharacter.currentState.emotionalState}
- Goals: ${safeJoin(povCharacter.currentState.goals)}
- Conflicts: ${safeJoin(povCharacter.currentState.conflicts)}
`;
    } else {
      prompt += `- Goals: ${safeJoin(povCharacter.goals)}
- Conflicts: ${safeJoin(povCharacter.conflicts)}
`;
    }

    prompt += `\n`;

    // Previous Chapter Context (~200 tokens)
    if (lastChapterSummary) {
      prompt += `PREVIOUS CHAPTER SUMMARY:
${lastChapterSummary}

`;
    }

    // Scene Cards (~300 tokens)
    prompt += `SCENE CARDS FOR THIS CHAPTER:

`;

    sceneCards.forEach((scene, index) => {
      prompt += `Scene ${index + 1}: ${scene.location}
- Characters: ${safeJoin(scene.characters)}
- Goal: ${scene.goal}
- Conflict: ${scene.conflict}
- Outcome: ${scene.outcome}
- Emotional Beat: ${scene.emotionalBeat}
${scene.notes ? `- Notes: ${scene.notes}` : ''}

`;
    });

    // Other Characters (~450 tokens)
    if (otherCharacters.length > 0) {
      prompt += `CHARACTERS IN THIS CHAPTER:

`;

      otherCharacters.forEach((char) => {
        prompt += `${char.name} (${char.role})
${char.physicalDescription || 'No physical description'}
Personality: ${safeJoin(char.personalityTraits)}
Voice: "${char.voiceSample}"
${char.currentState ? `Current state: ${char.currentState.emotionalState} in ${char.currentState.location}` : ''}

`;
      });
    }

    // Commercial-specific chapter requirements
    const chapterCommercialReqs = this.buildChapterCommercialRequirements(commercialContext);
    if (chapterCommercialReqs) {
      prompt += chapterCommercialReqs + '\n\n';
    }

    // Writing Instructions (~300 tokens)
    prompt += `WRITING INSTRUCTIONS:

Write this chapter in approximately ${this.calculateTargetWordCount(sceneCards.length)} words (${sceneCards.length} scene${sceneCards.length > 1 ? 's' : ''}).

CRITICAL REQUIREMENTS:
1. Write in THIRD PERSON LIMITED from ${povCharacter.name}'s perspective
2. Use ${povCharacter.name}'s unique voice and perspective throughout
3. Follow the scene cards exactly - hit all specified goals, conflicts, and outcomes
4. Show, don't tell - use vivid sensory details and character actions
5. Build tension and pacing throughout the chapter
6. End with a strong hook that makes readers want to continue
7. Honor the ${storyDNA.genre} genre conventions and ${storyDNA.tone} tone
8. Every line must serve character, plot, or theme

FORMATTING (MANDATORY):
- Write PURE PROSE only - exactly like a professionally published novel
- DO NOT use any markdown: no #, ##, **, *, _, or other formatting symbols
- DO NOT include scene numbers, scene titles, or scene headers in your output
- DO NOT write "Scene 1:" or "Part One:" or any structural markers
- Transition between scenes naturally with a blank line - no labels
- Write flowing narrative that reads like a published book from a major publisher

Begin writing now. Output ONLY the chapter prose - no meta-commentary, no explanations, no formatting.`;

    return prompt;
  }

  /**
   * Calculate target word count based on number of scenes
   */
  private calculateTargetWordCount(sceneCount: number): number {
    // Average chapter length: 2,000-3,000 words
    // Average scene length: 800-1,200 words
    const wordsPerScene = 1000;
    return sceneCount * wordsPerScene;
  }

  /**
   * Get chapter from database
   */
  private getChapter(chapterId: string): Chapter {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM chapters WHERE id = ?
    `);

    const row = stmt.get(chapterId);
    if (!row) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    return {
      ...row,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
      flags: row.flags ? JSON.parse(row.flags) : [],
    };
  }

  /**
   * Get book from database
   */
  private getBook(bookId: string): Book {
    const stmt = db.prepare<[string], Book>(`
      SELECT * FROM books WHERE id = ?
    `);

    const book = stmt.get(bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    return book;
  }

  /**
   * Get project from database
   */
  private getProject(projectId: string): Project {
    const stmt = db.prepare<[string], any>(`
      SELECT * FROM projects WHERE id = ?
    `);

    const row = stmt.get(projectId);
    if (!row) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return {
      ...row,
      story_dna: row.story_dna ? JSON.parse(row.story_dna) : null,
      story_bible: row.story_bible ? JSON.parse(row.story_bible) : null,
    };
  }

  /**
   * Find character by name in story bible
   */
  private findCharacter(characters: Character[], name: string): Character | null {
    return characters.find((char) => char.name === name) || null;
  }

  /**
   * Get summary from previous chapter
   */
  private getLastChapterSummary(bookId: string, currentChapterNumber: number): string | null {
    if (currentChapterNumber === 1) {
      return null; // First chapter has no previous summary
    }

    const stmt = db.prepare<[string, number], { summary: string | null }>(`
      SELECT summary FROM chapters
      WHERE book_id = ? AND chapter_number = ?
    `);

    const row = stmt.get(bookId, currentChapterNumber - 1);
    return row?.summary || null;
  }

  // ============================================================================
  // Commercial Genre Integration Methods
  // ============================================================================

  /**
   * Get commercial genre context for a project based on genre type
   */
  private getCommercialGenreContext(
    projectId: string,
    genre: string,
    chapterNumber: number
  ): CommercialGenreContext {
    const context: CommercialGenreContext = {};
    const genreLower = genre.toLowerCase();

    try {
      // Romance genre settings
      if (genreLower.includes('romance') || genreLower.includes('romantic')) {
        const heatLevel = romanceCommercialService.getHeatLevel(projectId);
        if (heatLevel) {
          const trackedBeats = romanceCommercialService.getBeatTracking(projectId);
          // Find beats that are scheduled for this chapter
          const beatsDueThisChapter = trackedBeats.filter(
            (beat: RomanceBeat) => beat.chapterNumber === chapterNumber
          );
          context.romance = {
            heatLevel,
            trackedBeats,
            beatsDueThisChapter,
          };
          logger.debug({ projectId, heatLevel: heatLevel.heatLevel }, 'Loaded romance commercial context');
        }
      }

      // Thriller genre settings
      if (genreLower.includes('thriller') || genreLower.includes('suspense') || genreLower.includes('mystery')) {
        const pacing = thrillerCommercialService.getPacingConfig(projectId);
        if (pacing) {
          const activeClocks = thrillerCommercialService.getActiveTimePressure(projectId);
          const chapterHooks = thrillerCommercialService.getChapterHooks(projectId);
          context.thriller = {
            pacing,
            activeClocks,
            chapterHooks: chapterHooks.filter((h: ChapterHook) => h.chapterNumber <= chapterNumber),
          };
          logger.debug({ projectId, pacingStyle: pacing.pacingStyle }, 'Loaded thriller commercial context');
        }
      }

      // Sci-Fi genre settings
      if (genreLower.includes('sci-fi') || genreLower.includes('science fiction') || genreLower.includes('scifi')) {
        const classification = sciFiCommercialService.getClassification(projectId);
        if (classification) {
          context.scifi = { classification };
          logger.debug({ projectId, hardnessLevel: classification.hardnessLevel }, 'Loaded sci-fi commercial context');
        }
      }
    } catch (error) {
      // Log but don't fail - commercial settings are optional enhancements
      logger.warn({ error, projectId }, 'Failed to load commercial genre context');
    }

    return context;
  }

  /**
   * Build commercial genre guidance section for system prompt
   */
  private buildCommercialGenreGuidance(context?: CommercialGenreContext): string | null {
    if (!context) return null;

    const sections: string[] = [];

    // Romance guidance
    if (context.romance) {
      const { heatLevel } = context.romance;
      const heatDescriptions: Record<number, string> = {
        1: 'Sweet/Clean (no explicit content, closed-door intimacy)',
        2: 'Warm (fade to black, sensuality through tension and anticipation)',
        3: 'Steamy (tasteful explicit content, emotional connection emphasised)',
        4: 'Hot (detailed intimate scenes, physical and emotional depth)',
        5: 'Scorching (erotica-adjacent, explicit and frequent intimate content)',
      };

      let romanceSection = `ROMANCE COMMERCIAL GUIDANCE:
- Heat Level: ${heatLevel.heatLevel}/5 - ${heatDescriptions[heatLevel.heatLevel] || 'Standard romance'}
- Sensuality Focus: ${heatLevel.sensualityFocus} (${heatLevel.sensualityFocus === 'emotional' ? 'prioritise emotional connection over physical' : heatLevel.sensualityFocus === 'physical' ? 'emphasise physical attraction and chemistry' : 'balance emotional and physical intimacy'})`;

      if (heatLevel.fadeToBlack) {
        romanceSection += '\n- Intimate scenes: Fade to black before explicit content';
      }
      if (heatLevel.onPageIntimacy) {
        romanceSection += '\n- Intimate scenes: On-page intimacy expected, write with appropriate detail for heat level';
      }
      if (heatLevel.contentWarnings && heatLevel.contentWarnings.length > 0) {
        romanceSection += `\n- Content warnings to include: ${heatLevel.contentWarnings.join(', ')}`;
      }

      sections.push(romanceSection);
    }

    // Thriller guidance
    if (context.thriller) {
      const { pacing, activeClocks } = context.thriller;
      const pacingDescriptions: Record<string, string> = {
        relentless: 'Constant high tension (8/10 base). Short chapters, frequent reveals, no breathing room.',
        escalating: 'Steady build from 3-5 to 9-10. Each chapter ratchets up the stakes.',
        rollercoaster: 'Alternating peaks and valleys. Intense scenes followed by brief respite.',
        slow_burn: 'Gradual build with explosive finale. Suspense through atmosphere and dread.',
      };

      let thrillerSection = `THRILLER COMMERCIAL GUIDANCE:
- Pacing Style: ${pacing.pacingStyle.replace('_', ' ')} - ${pacingDescriptions[pacing.pacingStyle] || 'Standard thriller pacing'}
- Target Chapter Tension: ${pacing.averageChapterTension}/10
- Action Scene Ratio: ${pacing.actionSceneRatio}% of scenes should be action-oriented`;

      if (pacing.chapterHookRequired) {
        thrillerSection += '\n- MANDATORY: End this chapter with a strong hook (cliffhanger, revelation, or unanswered question)';
      }
      if (pacing.cliffhangerFrequency === 'every') {
        thrillerSection += '\n- Every chapter must end on a cliffhanger or dramatic hook';
      }
      if (activeClocks.length > 0) {
        thrillerSection += '\n- Active ticking clocks to reference: ' +
          activeClocks.map(c => `"${c.description}" (${c.clockType})`).join('; ');
      }

      sections.push(thrillerSection);
    }

    // Sci-Fi guidance
    if (context.scifi) {
      const { classification } = context.scifi;
      const expectations = HARDNESS_EXPECTATIONS[classification.hardnessLevel];

      let scifiSection = `SCI-FI COMMERCIAL GUIDANCE:
- Hardness Level: ${classification.hardnessLevel.replace('_', ' ')} - ${expectations?.description || 'Standard sci-fi'}
- Reader Expectations: ${expectations?.readerExpectation || 'Consistent internal logic'}
- Tech Explanation Depth: ${classification.techExplanationDepth} - ${classification.techExplanationDepth === 'detailed' ? 'explain technology thoroughly' : classification.techExplanationDepth === 'moderate' ? 'explain key tech, handwave minor details' : classification.techExplanationDepth === 'minimal' ? 'technology just works, minimal exposition' : 'no explanations needed'}
- Scientific Accuracy Priority: ${classification.scientificAccuracyPriority}/10`;

      if (classification.handwaveAllowed && classification.handwaveAllowed.length > 0) {
        scifiSection += `\n- Handwave allowed for: ${classification.handwaveAllowed.join(', ')}`;
      }
      if (classification.realScienceBasis && classification.realScienceBasis.length > 0) {
        scifiSection += `\n- Ground in real science: ${classification.realScienceBasis.join(', ')}`;
      }

      sections.push(scifiSection);
    }

    return sections.length > 0 ? sections.join('\n\n') : null;
  }

  /**
   * Build chapter-specific commercial requirements for user prompt
   */
  private buildChapterCommercialRequirements(context?: CommercialGenreContext): string | null {
    if (!context) return null;

    const requirements: string[] = [];

    // Romance beat requirements for this chapter
    if (context.romance && context.romance.beatsDueThisChapter.length > 0) {
      const beatNames = context.romance.beatsDueThisChapter.map(b => {
        const displayName = b.beatType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const intensity = b.emotionalIntensity ? ` (intensity ${b.emotionalIntensity}/10)` : '';
        return displayName + intensity;
      });
      requirements.push(`ROMANCE BEATS FOR THIS CHAPTER:
Include these emotional beats: ${beatNames.join(', ')}
These are key romance genre moments that readers expect at this point in the story.`);
    }

    // Thriller-specific chapter requirements
    if (context.thriller) {
      const { pacing, activeClocks, chapterHooks } = context.thriller;
      const relevantHooks = chapterHooks.filter(h => h.chapterNumber === chapterHooks.length);

      if (pacing.chapterHookRequired) {
        requirements.push(`CHAPTER ENDING REQUIREMENT:
End with a compelling hook - a cliffhanger, revelation, or unanswered question that compels the reader to continue.`);
      }

      if (activeClocks.length > 0) {
        requirements.push(`ACTIVE TIME PRESSURE:
Reference the following ticking clocks to maintain urgency:
${activeClocks.map(c => `- ${c.description} (remind readers ${c.reminderFrequency})`).join('\n')}`);
      }
    }

    return requirements.length > 0 ? requirements.join('\n\n') : null;
  }
}

// Export singleton instance
export const contextAssemblyService = new ContextAssemblyService();
