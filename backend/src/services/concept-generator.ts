import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import db from '../db/connection.js';
import { formatGenre, formatSubgenre, formatModifiers, getWordCountContext } from '../utils/genre-helpers.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:concept-generator');

dotenv.config();

/**
 * Exclusion data for previously generated concepts
 */
export interface ConceptExclusions {
  titles: string[];
  protagonistNames: string[];
  centralConflicts: string[];
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface StoryPreferences {
  genre: string;
  genres?: string[];
  subgenre?: string;
  subgenres?: string[];
  modifiers?: string[];
  tone: string; // For backward compatibility
  tones?: string[]; // Multi-tone support
  themes: string[];
  customTheme?: string; // Free text custom theme
  targetLength: number;
  additionalNotes?: string;
  customIdeas?: string;
  regenerationTimestamp?: number;
  timeframe?: string; // Era/year setting (e.g., "1920s", "Medieval Era", "Year 2350")
  // Structured time period (Phase 4)
  timePeriod?: {
    type: 'past' | 'present' | 'future' | 'unknown' | 'custom';
    year?: number;
    description?: string;
  };
  timePeriodType?: 'past' | 'present' | 'future' | 'unknown' | 'custom';
  specificYear?: number;
}

export interface StoryConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string;
  protagonistHint: string;
  conflictType: string;
}

/**
 * Short concept summary for first-stage generation
 */
export interface ConceptSummary {
  id: string;
  title: string;
  logline: string;
}

/**
 * Common fantasy/generic names to always exclude
 * These names appear frequently in AI-generated content
 */
const COMMON_FANTASY_NAMES = [
  'Kira', 'Aric', 'Zara', 'Kael', 'Lyra', 'Theron', 'Mira', 'Darian',
  'Elena', 'Marcus', 'Luna', 'Raven', 'Phoenix', 'Shadow', 'Storm',
  'Aurora', 'Jasper', 'Sage', 'Aria', 'Finn', 'Ivy', 'Rowan', 'Ember',
  'Nova', 'Atlas', 'Orion', 'Celeste', 'Dante', 'Seraphina', 'Caspian',
  'Elara', 'Nyx', 'Alaric', 'Isolde', 'Draven', 'Astrid', 'Corvus',
];

/**
 * Common generic title words to avoid
 */
const GENERIC_TITLE_WORDS = [
  'Shadow', 'Dark', 'Last', 'Rising', 'Fallen', 'Crown', 'Throne',
  'Blood', 'Fire', 'Ice', 'Storm', 'Night', 'Dawn', 'Dusk', 'Edge',
  'Guardian', 'Prophecy', 'Legacy', 'Secret', 'Hidden', 'Lost', 'Chosen',
];

/**
 * Fetch exclusion data from previously saved concepts, summaries, and projects
 * Improved to extract more comprehensive name patterns
 */
function fetchExclusions(): ConceptExclusions {
  const exclusions: ConceptExclusions = {
    titles: [],
    protagonistNames: [...COMMON_FANTASY_NAMES], // Start with common names to avoid
    centralConflicts: [],
  };

  try {
    // Get titles and protagonist hints from saved concepts
    const savedConceptsStmt = db.prepare(`
      SELECT title, protagonist_hint, logline FROM saved_concepts
      WHERE status IN ('saved', 'used')
      LIMIT 100
    `);
    const savedConcepts = savedConceptsStmt.all() as { title: string; protagonist_hint: string | null; logline: string }[];

    for (const concept of savedConcepts) {
      exclusions.titles.push(concept.title);
      if (concept.protagonist_hint) {
        // Extract name patterns more comprehensively
        // Pattern 1: "Name - description" or "Name, description"
        const nameMatch = concept.protagonist_hint.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
        if (nameMatch) {
          exclusions.protagonistNames.push(nameMatch[1]);
        }
        // Also extract any capitalized words that look like names (2-12 chars)
        const allNames = concept.protagonist_hint.match(/\b[A-Z][a-z]{1,11}\b/g);
        if (allNames) {
          exclusions.protagonistNames.push(...allNames);
        }
      }
      // Extract key phrases from logline
      if (concept.logline) {
        exclusions.centralConflicts.push(concept.logline.substring(0, 150));
      }
    }

    // Get titles from saved concept summaries
    try {
      const summariesStmt = db.prepare(`
        SELECT title, logline FROM saved_concept_summaries
        WHERE status IN ('saved', 'expanded')
        LIMIT 100
      `);
      const summaries = summariesStmt.all() as { title: string; logline: string }[];
      for (const summary of summaries) {
        exclusions.titles.push(summary.title);
        exclusions.centralConflicts.push(summary.logline.substring(0, 150));
      }
    } catch {
      // Table might not exist yet
    }

    // Get titles from existing projects
    const projectsStmt = db.prepare(`
      SELECT title FROM projects
      LIMIT 50
    `);
    const projects = projectsStmt.all() as { title: string }[];

    for (const project of projects) {
      exclusions.titles.push(project.title);
    }

    // Deduplicate and clean
    exclusions.titles = [...new Set(exclusions.titles)];
    exclusions.protagonistNames = [...new Set(exclusions.protagonistNames)];
    exclusions.centralConflicts = [...new Set(exclusions.centralConflicts)];

    logger.info({
      titlesCount: exclusions.titles.length,
      namesCount: exclusions.protagonistNames.length,
      conflictsCount: exclusions.centralConflicts.length,
    }, 'Loaded exclusions for concept generation');
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch exclusions, proceeding without them');
  }

  return exclusions;
}

/**
 * Generate 5 diverse story concepts based on user preferences
 */
export async function generateConcepts(
  preferences: StoryPreferences
): Promise<StoryConcept[]> {
  const { genre, subgenre, tone, themes, targetLength, additionalNotes } = preferences;

  // Fetch exclusions from database
  const exclusions = fetchExclusions();

  // Build the prompt for concept generation with exclusions
  const prompt = buildConceptPrompt(preferences, exclusions);

  logger.info('[ConceptGenerator] Calling Claude API...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4000,
      temperature: 1.0, // High creativity for diverse concepts
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the response text
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON response
    let concepts = parseConceptsResponse(responseText);

    if (!concepts || concepts.length === 0) {
      throw new Error('Failed to parse concepts from Claude response');
    }

    // Validate and clean concepts against exclusions
    concepts = validateAndCleanConcepts(concepts, exclusions);

    logger.info(`[ConceptGenerator] Successfully generated ${concepts.length} concepts`);

    return concepts;
  } catch (error: any) {
    logger.error({ error }, 'Concept generation error');
    throw error;
  }
}

/**
 * Build detailed time context for story generation based on time period settings
 */
function buildTimeContext(preferences: StoryPreferences): { timeframeText: string; timeGuidance: string } {
  const { timeframe, timePeriod, timePeriodType, specificYear } = preferences;
  const currentYear = new Date().getFullYear();

  // Build timeframe text from either legacy or new format
  let timeframeText = '';
  let timeGuidance = '';

  if (timePeriod) {
    // New structured time period
    switch (timePeriod.type) {
      case 'past':
        timeframeText = `Historical setting, approximately ${currentYear - 500} CE (500 years in the past)`;
        timeGuidance = `
**TIME PERIOD GUIDANCE (Historical - 500 years past):**
- Technology level: Pre-industrial, limited to hand tools, basic metallurgy, horse-drawn transport
- Communication: Written letters, messengers, no telecommunications
- Naming conventions: Use period-appropriate names from the relevant culture
- Social structure: Consider feudal systems, guilds, rigid class hierarchies
- Avoid anachronisms: No modern conveniences, electricity, or industrial technology`;
        break;
      case 'present':
        timeframeText = `Contemporary/Modern day setting (${currentYear})`;
        timeGuidance = `
**TIME PERIOD GUIDANCE (Contemporary):**
- Technology level: Smartphones, internet, AI emerging, social media prevalent
- Communication: Instant digital communication, video calls, social platforms
- Naming conventions: Use modern names from diverse global cultures
- Social structure: Consider current social dynamics, global connectivity
- Include realistic modern references without dating the story`;
        break;
      case 'future':
        timeframeText = `Futuristic setting, approximately year ${currentYear + 500} (500 years in the future)`;
        timeGuidance = `
**TIME PERIOD GUIDANCE (Far Future - 500 years ahead):**
- Technology level: Advanced AI, potential FTL travel, genetic engineering, terraforming
- Communication: Direct neural interfaces possible, instant galactic communication
- Naming conventions: Consider evolved or entirely new naming conventions
- Social structure: Post-scarcity possible, new forms of government, human augmentation
- Include plausible extrapolations of current technological trends`;
        break;
      case 'unknown':
        timeframeText = 'An undefined or impossibly distant time period';
        timeGuidance = `
**TIME PERIOD GUIDANCE (Unknown/Distant):**
- Technology level: Undefined - could range from primitive to impossibly advanced
- This allows maximum creative freedom - technology can be inconsistent or magical
- Naming conventions: Create unique names that feel timeless or otherworldly
- Social structure: Can be entirely invented without historical constraints
- Perfect for fantasy settings with non-Earth histories`;
        break;
      case 'custom':
        if (timePeriod.year !== undefined) {
          const year = timePeriod.year;
          if (year < 0) {
            timeframeText = `Ancient setting, ${Math.abs(year)} BCE`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Ancient - ${Math.abs(year)} BCE):**
- Technology level: Bronze or Iron Age depending on region, no writing in some cultures
- Communication: Oral traditions, early writing systems
- Naming conventions: Use names from relevant ancient cultures (Egyptian, Greek, Chinese, etc.)
- Social structure: City-states, early empires, priest-kings`;
          } else if (year < 500) {
            timeframeText = `Late Ancient/Early Medieval setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Late Ancient - Year ${year}):**
- Technology level: Roman-era technology in decline, early medieval tools
- Communication: Written manuscripts rare, messenger networks
- Naming conventions: Latin, Germanic, or regional names appropriate to setting`;
          } else if (year < 1500) {
            timeframeText = `Medieval setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Medieval - Year ${year}):**
- Technology level: Castles, swords, early firearms if late period
- Communication: Written letters among literate few, town criers
- Naming conventions: Use medieval European or regional names`;
          } else if (year < 1900) {
            timeframeText = `Historical setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Historical - Year ${year}):**
- Research specific era characteristics (Renaissance, Colonial, Victorian, etc.)
- Technology varies significantly: printing press to early electricity
- Naming conventions: Match the specific culture and time period`;
          } else if (year <= currentYear) {
            timeframeText = `Recent historical/Contemporary setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Recent History - Year ${year}):**
- Research specific decade characteristics for accuracy
- Technology: Consider what existed vs what didn't exist yet
- Cultural references: Be accurate to the specific year`;
          } else if (year < currentYear + 100) {
            timeframeText = `Near future setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Near Future - Year ${year}):**
- Technology level: Extrapolate current trends - more AI, renewable energy, space tourism
- Consider climate change impacts on society
- Naming conventions: Similar to present with some evolution`;
          } else {
            timeframeText = `Far future setting, year ${year}`;
            timeGuidance = `
**TIME PERIOD GUIDANCE (Far Future - Year ${year}):**
- Technology level: Speculative - could include space colonization, radical life extension
- Consider major societal transformations from current day
- Naming conventions: Could be radically different or evolved from current trends`;
          }
        }
        break;
    }
  } else if (timeframe) {
    // Legacy timeframe string
    timeframeText = timeframe;
    timeGuidance = `\n**TIME PERIOD:** ${timeframe}\n- Ensure all story elements are appropriate to this time period`;
  }

  return { timeframeText, timeGuidance };
}

/**
 * Build the prompt for concept generation
 */
function buildConceptPrompt(preferences: StoryPreferences, exclusions?: ConceptExclusions): string {
  const { tone, tones, themes, customTheme, targetLength, additionalNotes, customIdeas, regenerationTimestamp } = preferences;

  const genreText = formatGenre(preferences);
  const subgenreText = formatSubgenre(preferences);
  const modifiersText = formatModifiers(preferences.modifiers);

  // Build time context
  const { timeframeText, timeGuidance } = buildTimeContext(preferences);

  // Support multi-tone (use tones array if available, fall back to single tone)
  const toneText = tones && tones.length > 0 ? tones.join(' + ') : tone;

  // Combine themes with custom theme if provided
  const allThemes = customTheme ? [...themes, customTheme] : themes;
  const themesText = allThemes.join(', ');
  const wordCountContext = getWordCountContext(targetLength);

  const uniqueSeed = regenerationTimestamp || Date.now();
  const seedHint = `[Generation ID: ${uniqueSeed} - Use this to ensure maximum randomization]`;

  // Build exclusion section with STRONG enforcement
  let exclusionSection = '';
  if (exclusions && (exclusions.titles.length > 0 || exclusions.protagonistNames.length > 0)) {
    exclusionSection = `
═══════════════════════════════════════════════════════════════════════════════
⛔ CRITICAL: BANNED ELEMENTS - YOUR OUTPUT WILL BE REJECTED IF YOU USE THESE ⛔
═══════════════════════════════════════════════════════════════════════════════

**BANNED TITLES (using ANY of these exact titles = automatic rejection):**
${exclusions.titles.slice(0, 25).join(' | ')}

**BANNED CHARACTER NAMES (using ANY of these names = automatic rejection):**
${exclusions.protagonistNames.slice(0, 50).join(' | ')}

**BANNED GENERIC TITLE WORDS (avoid titles containing these overused words):**
${GENERIC_TITLE_WORDS.join(' | ')}

**VERIFICATION REQUIRED:**
Before finalizing each concept, verify:
✗ Title is NOT in the banned list above
✗ Title does NOT contain banned generic words
✗ Protagonist name is NOT in the banned names list
✗ Protagonist name is from a REAL cultural background (Korean, Nigerian, Brazilian, etc.)
═══════════════════════════════════════════════════════════════════════════════
`;
  }

  return `You are a master storyteller and concept developer. Your task is to generate 5 COMPLETELY UNIQUE and RADICALLY DIFFERENT story concepts.

${seedHint}

**Genre:** ${genreText}${modifiersText ? ` (with ${modifiersText} elements)` : ''}
**Subgenre:** ${subgenreText}
**Tone:** ${toneText}
**Themes:** ${themesText}
${timeframeText ? `**Time Period/Era:** ${timeframeText}` : ''}
**Target Length:** ${targetLength.toLocaleString()} words (${wordCountContext})
${additionalNotes ? `**Additional Notes:** ${additionalNotes}` : ''}
${customIdeas ? `**Custom Ideas to Incorporate:** ${customIdeas}` : ''}
${timeGuidance}
${exclusionSection}

**CRITICAL UNIQUENESS REQUIREMENTS:**
1. Each concept MUST have a completely ORIGINAL title - no generic titles like "The Shadow's Edge" or "The Last Guardian"
2. Each protagonist MUST have a UNIQUE NAME - use unusual, memorable names from diverse cultural backgrounds
3. Each central conflict MUST be DISTINCTIVE - avoid clichéd "chosen one" or "save the world" plots unless given a truly unique twist
4. Settings should be SPECIFIC and VIVID - not generic "kingdoms" or "cities"
5. The 5 concepts must explore DIFFERENT subthemes, protagonist archetypes, and narrative structures
${timeframeText ? '6. All concepts MUST be appropriate for the specified time period - no anachronisms!' : ''}

**For EACH concept, provide:**
- **title**: A UNIQUE, memorable title (avoid common words like Shadow, Last, Dark, Rising, Fallen)
- **logline**: A one-sentence hook (25-40 words) with a specific, intriguing premise
- **synopsis**: A 3-paragraph synopsis covering setup, conflict, and stakes (150-200 words)
- **hook**: What makes this story TRULY unique (1-2 sentences)
- **protagonistHint**: Protagonist with UNIQUE NAME, specific role, and distinctive trait
- **conflictType**: The primary conflict type (internal, external, both)

**DIVERSITY CHECKLIST - Across your 5 concepts, vary these elements:**
- Protagonist age ranges (young adult, middle-aged, elderly)
- Protagonist professions/roles (not all warriors/royalty/chosen ones)
- Narrative POV styles (first person, third limited, unreliable narrator)
- Story structures (linear, non-linear, frame narrative)
- Relationship dynamics (solo journey, ensemble, mentor-student)

Return ONLY a JSON array of 5 concepts in this exact format:
[
  {
    "id": "concept-1",
    "title": "Your unique title here",
    "logline": "Your unique premise here",
    "synopsis": "Your detailed synopsis here",
    "hook": "What makes this truly unique",
    "protagonistHint": "UniqueNameHere - specific role and distinctive trait",
    "conflictType": "both"
  },
  ...
]`;
}

/**
 * Refine existing concepts based on user feedback
 */
export async function refineConcepts(
  preferences: StoryPreferences,
  existingConcepts: StoryConcept[],
  feedback: string
): Promise<StoryConcept[]> {
  const { tone, tones, themes, customTheme, targetLength, additionalNotes, timeframe } = preferences;

  const genreText = formatGenre(preferences);
  const subgenreText = formatSubgenre(preferences);
  const modifiersText = formatModifiers(preferences.modifiers);

  // Support multi-tone
  const toneText = tones && tones.length > 0 ? tones.join(' + ') : tone;

  // Combine themes with custom theme
  const allThemes = customTheme ? [...themes, customTheme] : themes;
  const themesText = allThemes.join(', ');
  const wordCountContext = getWordCountContext(targetLength);

  const existingConceptsSummary = existingConcepts.map(c =>
    `- "${c.title}": ${c.logline}`
  ).join('\n');

  const prompt = `You are a master storyteller and concept developer. The user has reviewed these story concepts and wants NEW concepts based on their feedback.

**Original Preferences:**
- Genre: ${genreText}${modifiersText ? ` (with ${modifiersText} elements)` : ''}
- Subgenre: ${subgenreText}
- Tone: ${toneText}
- Themes: ${themesText}
${timeframe ? `- Time Period/Era: ${timeframe}` : ''}
- Target Length: ${targetLength.toLocaleString()} words (${wordCountContext})
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ''}

**Previous Concepts Generated:**
${existingConceptsSummary}

**User Feedback:**
${feedback}

Based on this feedback, generate 5 NEW story concepts that:
1. Address the user's specific feedback and desires
2. Are DIFFERENT from the previous concepts
3. Still fit the genre and theme requirements
4. Incorporate any new elements the user mentioned

For EACH concept, provide:
- **title**: A compelling, genre-appropriate title
- **logline**: A one-sentence hook (25-40 words)
- **synopsis**: A 3-paragraph synopsis covering setup, conflict, and stakes (150-200 words)
- **hook**: What makes this story unique and compelling (1-2 sentences)
- **protagonistHint**: Brief description of the protagonist (name, role, key trait)
- **conflictType**: The primary conflict type (internal, external, both)

Return ONLY a JSON array of 5 concepts in this exact format:
[
  {
    "id": "concept-1",
    "title": "...",
    "logline": "...",
    "synopsis": "...",
    "hook": "...",
    "protagonistHint": "...",
    "conflictType": "both"
  },
  ...
]`;

  logger.info('[ConceptGenerator] Calling Claude API for refinement...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4000,
      temperature: 1.0,
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

    const concepts = parseConceptsResponse(responseText);

    if (!concepts || concepts.length === 0) {
      throw new Error('Failed to parse refined concepts from Claude response');
    }

    logger.info(`[ConceptGenerator] Successfully generated ${concepts.length} refined concepts`);

    return concepts;
  } catch (error: any) {
    logger.error({ error }, 'Concept refinement error');
    throw error;
  }
}

/**
 * Validate concepts against exclusions and modify if needed
 * Returns concepts with any violations flagged or fixed
 */
function validateAndCleanConcepts(concepts: StoryConcept[], exclusions: ConceptExclusions): StoryConcept[] {
  const cleanedConcepts: StoryConcept[] = [];

  for (const concept of concepts) {
    let cleanConcept = { ...concept };

    // Check for banned titles (exact match)
    const titleLower = concept.title.toLowerCase();
    const isBannedTitle = exclusions.titles.some(t =>
      t.toLowerCase() === titleLower
    );

    if (isBannedTitle) {
      // Append a unique suffix to make title different
      cleanConcept.title = `${concept.title}: A New Beginning`;
      logger.warn({ originalTitle: concept.title, newTitle: cleanConcept.title },
        'Modified banned title');
    }

    // Check for generic title words
    const hasGenericWord = GENERIC_TITLE_WORDS.some(word =>
      titleLower.includes(word.toLowerCase())
    );

    if (hasGenericWord) {
      logger.info({ title: concept.title }, 'Concept uses generic title word (allowed but noted)');
    }

    // Check for banned character names in protagonist hint
    if (concept.protagonistHint) {
      const protagonistLower = concept.protagonistHint.toLowerCase();
      const usedBannedName = exclusions.protagonistNames.find(name =>
        protagonistLower.startsWith(name.toLowerCase()) ||
        protagonistLower.includes(` ${name.toLowerCase()} `)
      );

      if (usedBannedName) {
        logger.warn({ protagonist: concept.protagonistHint, bannedName: usedBannedName },
          'Concept uses banned character name');
        // Note: We don't auto-fix names as it would require significant changes
      }
    }

    cleanedConcepts.push(cleanConcept);
  }

  return cleanedConcepts;
}

/**
 * Parse concepts from Claude's JSON response
 */
function parseConceptsResponse(responseText: string): StoryConcept[] {
  try {
    // Try to extract JSON from the response
    // Claude might wrap it in markdown code blocks
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const concepts = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(concepts)) {
      throw new Error('Response is not an array');
    }

    // Validate each concept has required fields
    for (const concept of concepts) {
      if (!concept.id || !concept.title || !concept.logline || !concept.synopsis) {
        throw new Error('Concept missing required fields');
      }
    }

    return concepts;
  } catch (error: any) {
    logger.error({ error }, 'Concept parse error');
    logger.error({ responseText }, 'Concept response text');
    throw new Error(`Failed to parse concepts: ${error.message}`);
  }
}

/**
 * Generate 10 short concept summaries (title + logline only)
 * This is Stage 1 of the two-stage concept workflow
 */
export async function generateConceptSummaries(
  preferences: StoryPreferences
): Promise<ConceptSummary[]> {
  // Fetch exclusions from database
  const exclusions = fetchExclusions();

  const prompt = buildSummaryPrompt(preferences, exclusions);

  logger.info('[ConceptGenerator] Calling Claude API for summaries...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 2000,
      temperature: 1.0, // High creativity
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

    const summaries = parseSummariesResponse(responseText);

    if (!summaries || summaries.length === 0) {
      throw new Error('Failed to parse summaries from Claude response');
    }

    logger.info(`[ConceptGenerator] Successfully generated ${summaries.length} concept summaries`);

    return summaries;
  } catch (error: any) {
    logger.error({ error }, 'Summary generation error');
    throw error;
  }
}

/**
 * Build prompt for generating concept summaries
 */
function buildSummaryPrompt(preferences: StoryPreferences, exclusions?: ConceptExclusions): string {
  const { tone, tones, themes, customTheme, targetLength, additionalNotes, customIdeas, regenerationTimestamp } = preferences;

  const genreText = formatGenre(preferences);
  const subgenreText = formatSubgenre(preferences);
  const modifiersText = formatModifiers(preferences.modifiers);
  const toneText = tones && tones.length > 0 ? tones.join(' + ') : tone;
  const allThemes = customTheme ? [...themes, customTheme] : themes;
  const themesText = allThemes.join(', ');

  // Build time context
  const { timeframeText, timeGuidance } = buildTimeContext(preferences);

  const uniqueSeed = regenerationTimestamp || Date.now();

  // Build exclusion section with STRONG enforcement
  let exclusionSection = '';
  if (exclusions && (exclusions.titles.length > 0 || exclusions.protagonistNames.length > 0)) {
    exclusionSection = `
═══════════════════════════════════════════════════════════════════════════════
⛔ BANNED TITLES - YOUR OUTPUT WILL BE REJECTED IF YOU USE ANY OF THESE ⛔
═══════════════════════════════════════════════════════════════════════════════
${exclusions.titles.slice(0, 30).join(' | ')}

**ALSO AVOID titles containing these generic words:**
${GENERIC_TITLE_WORDS.join(' | ')}

**VERIFICATION:** Before finalizing, ensure NONE of your 10 titles match or resemble the banned list.
═══════════════════════════════════════════════════════════════════════════════
`;
  }

  return `You are a master storyteller. Generate 10 SHORT concept summaries - just titles and loglines.

[Generation ID: ${uniqueSeed}]

**Genre:** ${genreText}${modifiersText ? ` (with ${modifiersText} elements)` : ''}
**Subgenre:** ${subgenreText}
**Tone:** ${toneText}
**Themes:** ${themesText}
${timeframeText ? `**Time Period/Era:** ${timeframeText}` : ''}
**Target Length:** ${targetLength.toLocaleString()} words
${additionalNotes ? `**Notes:** ${additionalNotes}` : ''}
${customIdeas ? `**Custom Ideas:** ${customIdeas}` : ''}
${timeGuidance ? `${timeGuidance}` : ''}
${exclusionSection}

**REQUIREMENTS:**
- Generate 10 UNIQUE concept summaries
- Each must have a completely ORIGINAL title (no generic titles)
- Each logline must be a compelling 2-sentence hook
- Vary protagonist types, settings, and conflict structures
- Make them dramatically different from each other
${timeframeText ? '- All concepts MUST be appropriate for the specified time period' : ''}

Return ONLY a JSON array in this exact format:
[
  {
    "id": "summary-1",
    "title": "Unique Title Here",
    "logline": "A compelling two-sentence hook that makes readers want more. Include the protagonist, their challenge, and the stakes."
  },
  ...
]`;
}

/**
 * Parse concept summaries from Claude's response
 */
function parseSummariesResponse(responseText: string): ConceptSummary[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const summaries = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(summaries)) {
      throw new Error('Response is not an array');
    }

    // Validate each summary
    for (const summary of summaries) {
      if (!summary.id || !summary.title || !summary.logline) {
        throw new Error('Summary missing required fields');
      }
    }

    return summaries;
  } catch (error: any) {
    logger.error({ error }, 'Summary parse error');
    throw new Error(`Failed to parse summaries: ${error.message}`);
  }
}

/**
 * Expand selected summaries into full detailed concepts
 * This is Stage 2 of the two-stage concept workflow
 */
export async function expandSummariesToConcepts(
  preferences: StoryPreferences,
  selectedSummaries: ConceptSummary[]
): Promise<StoryConcept[]> {
  const prompt = buildExpansionPrompt(preferences, selectedSummaries);

  logger.info(`[ConceptGenerator] Expanding ${selectedSummaries.length} summaries to full concepts...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 6000,
      temperature: 0.8, // Slightly lower for consistent expansion
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

    const concepts = parseConceptsResponse(responseText);

    if (!concepts || concepts.length === 0) {
      throw new Error('Failed to parse expanded concepts from Claude response');
    }

    logger.info(`[ConceptGenerator] Successfully expanded ${concepts.length} concepts`);

    return concepts;
  } catch (error: any) {
    logger.error({ error }, 'Concept expansion error');
    throw error;
  }
}

/**
 * Expand a single summary into multiple varied full concepts
 * Each concept explores the same core idea from a different angle
 */
export async function expandSummaryToVariations(
  preferences: StoryPreferences,
  summary: ConceptSummary,
  count: number = 4
): Promise<StoryConcept[]> {
  const prompt = buildVariationPrompt(preferences, summary, count);

  logger.info(`[ConceptGenerator] Generating ${count} variations for "${summary.title}"...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 6000,
      temperature: 1.0, // High creativity for diverse variations
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

    const concepts = parseConceptsResponse(responseText);

    if (!concepts || concepts.length === 0) {
      throw new Error('Failed to parse variation concepts from Claude response');
    }

    logger.info(`[ConceptGenerator] Successfully generated ${concepts.length} variations`);

    return concepts;
  } catch (error: any) {
    logger.error({ error }, 'Variation generation error');
    throw error;
  }
}

/**
 * Build prompt for generating concept variations from a single summary
 */
function buildVariationPrompt(preferences: StoryPreferences, summary: ConceptSummary, count: number): string {
  const { tone, tones, themes, customTheme, targetLength, timeframe } = preferences;

  const genreText = formatGenre(preferences);
  const subgenreText = formatSubgenre(preferences);
  const toneText = tones && tones.length > 0 ? tones.join(' + ') : tone;
  const allThemes = customTheme ? [...themes, customTheme] : themes;
  const themesText = allThemes.join(', ');
  const wordCountContext = getWordCountContext(targetLength);

  const uniqueSeed = Date.now();

  return `You are a master storyteller. Generate ${count} RADICALLY DIFFERENT variations of this story concept.

[Generation ID: ${uniqueSeed}]

**ORIGINAL CONCEPT:**
- Title: "${summary.title}"
- Logline: ${summary.logline}

**Genre:** ${genreText}
**Subgenre:** ${subgenreText}
**Tone:** ${toneText}
**Themes:** ${themesText}
${timeframe ? `**Time Period/Era:** ${timeframe}` : ''}
**Target Length:** ${targetLength.toLocaleString()} words (${wordCountContext})

**VARIATION REQUIREMENTS:**
Each variation should explore the SAME core story idea but from a completely different angle:
1. **Different Protagonist** - Each version should have a unique main character with a different background, motivation, and arc
2. **Different Tone** - Explore the premise through different emotional lenses (dark, humorous, romantic, thriller, etc.)
3. **Different Setting** - Place the story in different time periods, locations, or worlds
4. **Different Structure** - Use different narrative approaches (linear, non-linear, multiple POV, frame story)

**CHARACTER NAME RULES:**
- Each variation MUST use completely UNIQUE character names
- Names should come from diverse cultural backgrounds
- NO generic fantasy names (Kira, Aric, Zara, etc.)
- NO repeated names across variations

For EACH variation, provide:
- **title**: A UNIQUE title (can be inspired by original but must be different)
- **logline**: Keep the same logline from the original
- **synopsis**: A detailed 3-paragraph synopsis exploring THIS variation's unique approach (150-200 words)
- **hook**: What makes THIS specific variation unique
- **protagonistHint**: Full protagonist description with UNIQUE NAME, role, and motivation
- **conflictType**: The primary conflict type

Return ONLY a JSON array of ${count} concepts:
[
  {
    "id": "variation-1",
    "title": "Variation title here",
    "logline": "${summary.logline}",
    "synopsis": "Unique synopsis for this variation...",
    "hook": "What makes this variation unique",
    "protagonistHint": "UniqueName - role, background, motivation",
    "conflictType": "internal/external/both"
  },
  ...
]`;
}

/**
 * Build prompt for expanding summaries to full concepts
 */
function buildExpansionPrompt(preferences: StoryPreferences, summaries: ConceptSummary[]): string {
  const { tone, tones, themes, customTheme, targetLength, timeframe } = preferences;

  const genreText = formatGenre(preferences);
  const subgenreText = formatSubgenre(preferences);
  const toneText = tones && tones.length > 0 ? tones.join(' + ') : tone;
  const allThemes = customTheme ? [...themes, customTheme] : themes;
  const themesText = allThemes.join(', ');
  const wordCountContext = getWordCountContext(targetLength);

  const summariesList = summaries.map((s, i) =>
    `${i + 1}. "${s.title}": ${s.logline}`
  ).join('\n');

  return `You are a master storyteller. Expand these selected concept summaries into full, detailed story concepts.

**Genre:** ${genreText}
**Subgenre:** ${subgenreText}
**Tone:** ${toneText}
**Themes:** ${themesText}
${timeframe ? `**Time Period/Era:** ${timeframe}` : ''}
**Target Length:** ${targetLength.toLocaleString()} words (${wordCountContext})

**SELECTED SUMMARIES TO EXPAND:**
${summariesList}

For EACH summary, create a FULL concept with:
- Keep the same **title** from the summary
- Keep the same **logline** from the summary
- **synopsis**: A detailed 3-paragraph synopsis (150-200 words) covering setup, conflict, and stakes
- **hook**: What makes this story truly unique (1-2 sentences)
- **protagonistHint**: Full protagonist description with UNIQUE NAME, specific role, key trait, and motivation
- **conflictType**: The primary conflict type (internal, external, both)

Return ONLY a JSON array matching the number of summaries provided:
[
  {
    "id": "concept-1",
    "title": "Same title as summary",
    "logline": "Same logline as summary",
    "synopsis": "Detailed three-paragraph synopsis...",
    "hook": "What makes this unique",
    "protagonistHint": "UniqueNameHere - role, trait, motivation",
    "conflictType": "both"
  },
  ...
]`;
}
