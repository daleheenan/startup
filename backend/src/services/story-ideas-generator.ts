import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger.service.js';

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
  private anthropic: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'placeholder-key-will-be-set-later') {
      logger.warn('ANTHROPIC_API_KEY not configured');
      this.anthropic = null as any;
    } else {
      this.anthropic = new Anthropic({ apiKey });
    }
    this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';
  }

  /**
   * Generate a batch of creative story ideas
   * @param params - Generation parameters including genre, tone, themes
   * @returns Array of generated ideas with structured sections
   */
  async generateIdeas(params: GenerateIdeasParams): Promise<GeneratedIdea[]> {
    if (!this.anthropic) {
      throw new Error('Claude API not configured. Set ANTHROPIC_API_KEY in .env file');
    }

    const { genre, subgenre, tone, themes, count = 5 } = params;

    const prompt = this.buildGeneratePrompt(genre, subgenre, tone, themes, count);

    logger.info({
      genre,
      subgenre,
      tone,
      themesCount: themes?.length || 0,
      count,
    }, 'Generating story ideas');

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 1.0, // High creativity for diverse ideas
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
    if (!this.anthropic) {
      throw new Error('Claude API not configured. Set ANTHROPIC_API_KEY in .env file');
    }

    const prompt = this.buildRegeneratePrompt(section, context);

    logger.info({
      ideaId,
      section,
    }, 'Regenerating idea section');

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1500,
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

      const items = this.parseSectionResponse(responseText);

      logger.info({ section, itemCount: items.length }, 'Successfully regenerated section');

      return items;
    } catch (error: any) {
      logger.error({ error, section }, 'Section regeneration failed');
      throw error;
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
    count: number
  ): string {
    const uniqueSeed = Date.now();
    const genreText = subgenre ? `${genre} (${subgenre})` : genre;
    const toneText = tone || 'engaging';
    const themesText = themes?.length ? themes.join(', ') : 'universal themes';

    return `You are a master storyteller with decades of experience crafting compelling narratives. Generate ${count} UNIQUE and CREATIVE story ideas.

[Generation ID: ${uniqueSeed}]

**Genre:** ${genreText}
**Tone:** ${toneText}
**Themes:** ${themesText}

For EACH story idea, provide:
1. **storyIdea**: A compelling 2-3 sentence premise that hooks the reader. Include the protagonist, their challenge, and what makes this story special.
2. **characterConcepts**: 3-4 unique character concepts (protagonist and key supporting characters). Each should have a name, role, and one distinctive trait.
3. **plotElements**: 3-4 major plot elements or events that drive the story forward.
4. **uniqueTwists**: 2-3 unique twists or unexpected elements that make this story stand out.

**REQUIREMENTS:**
- Each idea must be DRAMATICALLY different from the others
- Avoid cliches and overused tropes
- Characters should have unique, culturally diverse names
- Plot elements should build tension and stakes
- Twists should subvert reader expectations

Return ONLY a JSON array in this exact format:
[
  {
    "id": "idea-1",
    "storyIdea": "A compelling premise...",
    "characterConcepts": [
      "Yuki Tanaka - A retired assassin turned kindergarten teacher who still receives mysterious contracts",
      "Marcus Chen - The school principal who knows more about Yuki's past than he should",
      "Little Maya - A five-year-old student who can see ghosts and accidentally reveals a conspiracy"
    ],
    "plotElements": [
      "Yuki discovers one of her students is the child of her final target",
      "A rival assassin arrives, forcing Yuki to confront her past",
      "The school becomes the center of a supernatural event"
    ],
    "uniqueTwists": [
      "The ghosts Maya sees are not dead people but alternate versions from parallel timelines",
      "Yuki's final target is still alive and is Maya's father"
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
        count: '3-4',
        instructions: 'Create unique characters with distinctive names, roles, and traits. Use diverse cultural backgrounds.',
      },
      plot: {
        name: 'Plot Elements',
        count: '3-4',
        instructions: 'Design major events that build tension and drive the narrative forward.',
      },
      twists: {
        name: 'Unique Twists',
        count: '2-3',
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
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const ideas = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(ideas)) {
        throw new Error('Response is not an array');
      }

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
      logger.error({ error, responseText: responseText.substring(0, 500) }, 'Failed to parse ideas response');
      throw new Error(`Failed to parse story ideas: ${error.message}`);
    }
  }

  /**
   * Parse the Claude response for a regenerated section
   */
  private parseSectionResponse(responseText: string): string[] {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const items = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(items)) {
        throw new Error('Response is not an array');
      }

      // Ensure all items are strings
      return items.map((item: any) => String(item));
    } catch (error: any) {
      logger.error({ error }, 'Failed to parse section response');
      throw new Error(`Failed to parse regenerated section: ${error.message}`);
    }
  }
}

// Export singleton instance
export const storyIdeasGenerator = new StoryIdeasGenerator();
