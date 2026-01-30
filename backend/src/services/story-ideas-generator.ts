import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger.service.js';
import { extractJsonArray } from '../utils/json-extractor.js';
import { claudeService } from './claude.service.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:story-ideas-generator');

/**
 * Generated story idea with structured sections
 */
export interface GeneratedIdea {
  id: string;
  storyIdea: string;
  characterConcepts: string[];
  plotElements: string[];
  uniqueTwists: string[];
}

/**
 * Parameters for generating story ideas
 */
export interface GenerateIdeasParams {
  genre: string;
  subgenre?: string;
  tone?: string;
  themes?: string[];
  timePeriod?: string;
  count?: number;
}

/**
 * Sections that can be regenerated
 */
export type RegeneratableSection = 'characters' | 'plot' | 'twists';

/**
 * StoryIdeasGenerator generates creative story ideas using Claude AI
 * Implements the Single Responsibility Principle - focused only on idea generation
 */
export class StoryIdeasGenerator {
  constructor() {
    // No initialization needed - using claudeService singleton
  }

  /**
   * Generate a batch of creative story ideas
   * @param params - Generation parameters including genre, tone, themes
   * @returns Array of generated ideas with structured sections
   */
  async generateIdeas(params: GenerateIdeasParams): Promise<GeneratedIdea[]> {
    const { genre, subgenre, tone, themes, timePeriod, count = 5 } = params;

    const prompt = this.buildGeneratePrompt(genre, subgenre, tone, themes, timePeriod, count);

    logger.info({
      genre,
      subgenre,
      tone,
      themesCount: themes?.length || 0,
      count,
    }, 'Generating story ideas');

    try {
      const response = await claudeService.createCompletionWithUsage({
        system: '',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4000,
        temperature: 1.0, // High creativity for diverse ideas
        tracking: {
          requestType: AI_REQUEST_TYPES.STORY_IDEA_GENERATION,
          contextSummary: `Generating ${count} ideas for ${genre}${subgenre ? ` (${subgenre})` : ''}`,
        },
      });

      const responseText = response.content;

      const ideas = this.parseIdeasResponse(responseText);

      logger.info({ count: ideas.length }, 'Successfully generated story ideas');

      return ideas;
    } catch (error: any) {
      logger.error({ error }, 'Story ideas generation failed');
      throw error;
    }
  }

  /**
   * Regenerate a specific section of an existing idea
   * @param ideaId - ID of the idea to regenerate for
   * @param section - Which section to regenerate
   * @param context - The full idea context for coherence
   * @returns New content for the specified section
   */
  async regenerateSection(
    ideaId: string,
    section: RegeneratableSection,
    context: GeneratedIdea
  ): Promise<string[]> {
    const prompt = this.buildRegeneratePrompt(section, context);

    logger.info({
      ideaId,
      section,
    }, 'Regenerating idea section');

    try {
      const response = await claudeService.createCompletionWithUsage({
        system: '',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
        temperature: 1.0,
        tracking: {
          requestType: AI_REQUEST_TYPES.STORY_IDEA_GENERATION,
          contextSummary: `Regenerating ${section} section for idea ${ideaId}`,
        },
      });

      const responseText = response.content;

      const items = this.parseSectionResponse(responseText);

      logger.info({ section, itemCount: items.length }, 'Successfully regenerated section');

      return items;
    } catch (error: any) {
      logger.error({ error, section }, 'Section regeneration failed');
      throw error;
    }
  }

  /**
   * Expand a user-provided premise into character concepts, plot elements, and unique twists
   */
  async expandPremise(
    premise: string,
    timePeriod?: string
  ): Promise<{
    characterConcepts: string[];
    plotElements: string[];
    uniqueTwists: string[];
  }> {
    const prompt = this.buildExpandPremisePrompt(premise, timePeriod);

    logger.info({ premiseLength: premise.length, timePeriod }, 'Expanding premise with AI');

    try {
      const response = await claudeService.createCompletionWithUsage({
        system: '',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1500,
        temperature: 0.8,
        tracking: {
          requestType: AI_REQUEST_TYPES.STORY_IDEA_GENERATION,
          contextSummary: `Expanding user premise (${premise.substring(0, 50)}...)`,
        },
      });

      const responseText = response.content;

      const expansion = this.parseExpandPremiseResponse(responseText);

      logger.info(
        {
          charactersCount: expansion.characterConcepts.length,
          plotCount: expansion.plotElements.length,
          twistsCount: expansion.uniqueTwists.length,
        },
        'Successfully expanded premise'
      );

      return expansion;
    } catch (error: any) {
      logger.error({ error }, 'Premise expansion failed');
      throw error;
    }
  }

  /**
   * Build the prompt for expanding a premise
   */
  private buildExpandPremisePrompt(premise: string, timePeriod?: string): string {
    const timePeriodText = timePeriod ? `\n**Time Period:** ${timePeriod}` : '';

    return `You are a master storyteller. Based on the following story premise, generate character concepts, plot elements, and unique twists that would bring this story to life.

**Story Premise:**
${premise}${timePeriodText}

Generate story components that:
- Are coherent with and enhance the given premise
- Feel natural and organic to the story world
- Add depth and intrigue without contradicting the premise
- Use names and details appropriate to the story's setting and time period

Provide:
1. **characterConcepts**: 2-3 character concepts. Each should have a name, role, and one distinctive trait.
2. **plotElements**: 2-3 key plot elements that drive the story forward.
3. **uniqueTwists**: 2 unique twists or unexpected elements that make this story stand out.

Return ONLY a JSON object in this exact format:
{
  "characterConcepts": [
    "Name - Role, with distinctive trait or backstory element",
    "Name - Role, with distinctive trait or backstory element"
  ],
  "plotElements": [
    "A significant event or plot point that drives the narrative",
    "Another key plot element"
  ],
  "uniqueTwists": [
    "An unexpected element that subverts expectations",
    "Another surprising twist"
  ]
}`;
  }

  /**
   * Parse the response for premise expansion
   */
  private parseExpandPremiseResponse(responseText: string): {
    characterConcepts: string[];
    plotElements: string[];
    uniqueTwists: string[];
  } {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        characterConcepts: Array.isArray(parsed.characterConcepts)
          ? parsed.characterConcepts.filter((c: unknown) => typeof c === 'string' && c)
          : [],
        plotElements: Array.isArray(parsed.plotElements)
          ? parsed.plotElements.filter((p: unknown) => typeof p === 'string' && p)
          : [],
        uniqueTwists: Array.isArray(parsed.uniqueTwists)
          ? parsed.uniqueTwists.filter((t: unknown) => typeof t === 'string' && t)
          : [],
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, responseText: responseText.substring(0, 500) },
        'Failed to parse premise expansion response'
      );
      throw new Error(`Failed to parse premise expansion: ${error.message}`);
    }
  }

  /**
   * Build the prompt for generating story ideas
   */
  private buildGeneratePrompt(
    genre: string,
    subgenre: string | undefined,
    tone: string | undefined,
    themes: string[] | undefined,
    timePeriod: string | undefined,
    count: number
  ): string {
    const uniqueSeed = Date.now();
    const genreText = subgenre ? `${genre} (${subgenre})` : genre;
    const toneText = tone || 'engaging';
    const themesText = themes?.length ? themes.join(', ') : 'universal themes';
    const timePeriodText = timePeriod || 'any time period';

    return `You are a master storyteller with decades of experience crafting compelling narratives. Generate ${count} UNIQUE and CREATIVE story ideas.

[Generation ID: ${uniqueSeed}]

**Genre:** ${genreText}
**Tone:** ${toneText}
**Themes:** ${themesText}
**Time Period:** ${timePeriodText}

CRITICAL: All story ideas MUST be set in the specified time period (${timePeriodText}). The setting, technology, culture, and social norms must accurately reflect this time period. Do NOT set stories in different time periods than specified.

For EACH story idea, provide:
1. **storyIdea**: A BRIEF hook/premise in 3-4 lines maximum. Just enough to intrigue - NOT a full synopsis. Focus on the core conflict and what makes this story unique.
2. **characterConcepts**: 2-3 character concepts. Each should have a name, role, and one distinctive trait. Use names appropriate to the story's setting (e.g., Western names for stories set in Western countries, period-appropriate names for historical settings).
3. **plotElements**: 2-3 key plot elements that drive the story forward.
4. **uniqueTwists**: 2 unique twists or unexpected elements that make this story stand out.

**REQUIREMENTS:**
- Each idea must be DRAMATICALLY different from the others
- Avoid cliches and overused tropes
- Keep the storyIdea BRIEF (3-4 lines max) - this is a seed idea, not a full concept
- Character names should fit the story's setting naturally (don't force diversity)
- Plot elements should hint at tension without revealing the full story
- Twists should subvert reader expectations

Return ONLY a JSON array in this exact format:
[
  {
    "id": "idea-1",
    "storyIdea": "A retired contract killer takes a job as a kindergarten teacher to hide in plain sight. When she recognizes one of her students, her carefully constructed new life begins to unravel.",
    "characterConcepts": [
      "Sarah Mitchell - The protagonist, a former assassin trying to escape her past",
      "Principal Roberts - Knows more than he lets on about Sarah's background"
    ],
    "plotElements": [
      "Sarah's old handler tracks her down with one final job",
      "A parent recognizes Sarah from her previous life"
    ],
    "uniqueTwists": [
      "The child she was hired to protect years ago is now in her class",
      "Her handler has been protecting her all along"
    ]
  }
]`;
  }

  /**
   * Build the prompt for regenerating a specific section
   */
  private buildRegeneratePrompt(
    section: RegeneratableSection,
    context: GeneratedIdea
  ): string {
    const sectionConfig: Record<RegeneratableSection, {
      name: string;
      count: string;
      instructions: string;
    }> = {
      characters: {
        name: 'Character Concepts',
        count: '2-3',
        instructions: 'Create unique characters with distinctive names, roles, and traits. Use names appropriate to the story setting.',
      },
      plot: {
        name: 'Plot Elements',
        count: '2-3',
        instructions: 'Design major events that build tension and drive the narrative forward.',
      },
      twists: {
        name: 'Unique Twists',
        count: '2',
        instructions: 'Create unexpected elements that subvert reader expectations and make the story memorable.',
      },
    };

    const config = sectionConfig[section];

    return `You are a master storyteller. Regenerate the ${config.name} for this story idea.

**Story Premise:**
${context.storyIdea}

**Current Character Concepts:**
${context.characterConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Current Plot Elements:**
${context.plotElements.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Current Unique Twists:**
${context.uniqueTwists.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Generate ${config.count} NEW ${config.name} that:
- ${config.instructions}
- Maintain coherence with the story premise
- Are DIFFERENT from the current ones
- Enhance the overall narrative

Return ONLY a JSON array of strings:
["First item here", "Second item here", "Third item here"]`;
  }

  /**
   * Parse the Claude response for generated ideas
   */
  private parseIdeasResponse(responseText: string): GeneratedIdea[] {
    try {
      const ideas = extractJsonArray(responseText);

      // Validate and ensure IDs
      return ideas.map((idea: any, index: number) => {
        if (!idea.storyIdea) {
          throw new Error(`Idea ${index + 1} missing storyIdea`);
        }

        return {
          id: idea.id || uuidv4(),
          storyIdea: idea.storyIdea,
          characterConcepts: Array.isArray(idea.characterConcepts)
            ? idea.characterConcepts
            : [],
          plotElements: Array.isArray(idea.plotElements)
            ? idea.plotElements
            : [],
          uniqueTwists: Array.isArray(idea.uniqueTwists)
            ? idea.uniqueTwists
            : [],
        };
      });
    } catch (error: any) {
      logger.error({ error: error.message, responseText: responseText.substring(0, 500) }, 'Failed to parse ideas response');
      throw new Error(`Failed to parse story ideas: ${error.message}`);
    }
  }

  /**
   * Parse the Claude response for a regenerated section
   */
  private parseSectionResponse(responseText: string): string[] {
    try {
      const items = extractJsonArray<string>(responseText);

      // Ensure all items are strings
      return items.map((item: any) => String(item));
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to parse section response');
      throw new Error(`Failed to parse regenerated section: ${error.message}`);
    }
  }
}

// Export singleton instance
export const storyIdeasGenerator = new StoryIdeasGenerator();
