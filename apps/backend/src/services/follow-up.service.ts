import db from '../db/connection.js';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.service.js';
import { claudeService } from './claude.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';
import type {
  SequelIdea,
  UnresolvedThread,
  CharacterContinuation,
  WorldExpansion,
  SeriesArcSuggestion,
  ToneVariation,
  FollowUpRecommendations,
  Book,
  Project,
  Chapter,
} from '../shared/types/index.js';

const logger = createLogger('services:follow-up');

/**
 * Follow-Up Recommendations Service
 * Sprint 38: Generates sequel ideas, series arcs, and continuation content
 */

interface FollowUpRecord {
  id: string;
  project_id: string;
  book_id: string;
  status: string;
  generated_at: string | null;
  sequel_ideas: string | null;
  unresolved_threads: string | null;
  character_continuations: string | null;
  world_expansion: string | null;
  series_structure: string | null;
  tone_variations: string | null;
  input_tokens: number;
  output_tokens: number;
}

class FollowUpService {
  /**
   * Generate all follow-up recommendations for a completed book
   */
  async generateFollowUpRecommendations(bookId: string): Promise<FollowUpRecommendations> {
    // Get book and project data
    const bookStmt = db.prepare<[string], Book & { project_id: string }>(`
      SELECT * FROM books WHERE id = ?
    `);
    const book = bookStmt.get(bookId);

    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const projectStmt = db.prepare<[string], Project>(`
      SELECT * FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(book.project_id);

    if (!project) {
      throw new Error(`Project not found: ${book.project_id}`);
    }

    // Get the active version for the book
    const activeVersionStmt = db.prepare<[string], { id: string }>(`
      SELECT id FROM book_versions WHERE book_id = ? AND is_active = 1
    `);
    const activeVersion = activeVersionStmt.get(bookId);

    // Get all chapter content - query by version_id if available, otherwise fall back to book_id
    let chapters: Chapter[];
    if (activeVersion) {
      const chaptersStmt = db.prepare<[string], Chapter>(`
        SELECT * FROM chapters WHERE version_id = ? ORDER BY chapter_number ASC
      `);
      chapters = chaptersStmt.all(activeVersion.id);
    } else {
      // Legacy chapters without version_id
      const chaptersStmt = db.prepare<[string], Chapter>(`
        SELECT * FROM chapters WHERE book_id = ? AND version_id IS NULL ORDER BY chapter_number ASC
      `);
      chapters = chaptersStmt.all(bookId);
    }

    if (chapters.length === 0) {
      throw new Error('No chapters found for this book');
    }

    // Create or update follow-up record
    const followUpId = await this.createOrUpdateRecord(book.project_id, bookId);

    // Update status to generating
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE follow_up_recommendations
      SET status = 'generating', updated_at = ?
      WHERE id = ?
    `).run(now, followUpId);

    try {
      // Assemble context for AI analysis
      const manuscriptContext = this.assembleManuscriptContext(project, chapters);

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Generate each section in parallel where possible
      logger.info({ bookId }, 'Generating sequel ideas');
      const [sequelIdeas, unresolvedThreads, characterContinuations, worldExpansions, seriesStructure, toneVariations] =
        await Promise.all([
          this.generateSequelIdeas(manuscriptContext, project),
          this.generateUnresolvedThreads(manuscriptContext, chapters),
          this.generateCharacterContinuations(manuscriptContext, project),
          this.generateWorldExpansions(manuscriptContext, project),
          this.generateSeriesStructure(manuscriptContext, project),
          this.generateToneVariations(manuscriptContext, project),
        ]);

      // Aggregate token usage
      totalInputTokens += sequelIdeas.usage.input_tokens + unresolvedThreads.usage.input_tokens;
      totalInputTokens += characterContinuations.usage.input_tokens + worldExpansions.usage.input_tokens;
      totalInputTokens += seriesStructure.usage.input_tokens + toneVariations.usage.input_tokens;

      totalOutputTokens += sequelIdeas.usage.output_tokens + unresolvedThreads.usage.output_tokens;
      totalOutputTokens += characterContinuations.usage.output_tokens + worldExpansions.usage.output_tokens;
      totalOutputTokens += seriesStructure.usage.output_tokens + toneVariations.usage.output_tokens;

      // Save results
      const updateStmt = db.prepare(`
        UPDATE follow_up_recommendations
        SET status = 'completed',
            generated_at = ?,
            sequel_ideas = ?,
            unresolved_threads = ?,
            character_continuations = ?,
            world_expansion = ?,
            series_structure = ?,
            tone_variations = ?,
            input_tokens = ?,
            output_tokens = ?,
            updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        now,
        JSON.stringify(sequelIdeas.data),
        JSON.stringify(unresolvedThreads.data),
        JSON.stringify(characterContinuations.data),
        JSON.stringify(worldExpansions.data),
        JSON.stringify(seriesStructure.data),
        JSON.stringify(toneVariations.data),
        totalInputTokens,
        totalOutputTokens,
        now,
        followUpId
      );

      logger.info({
        bookId,
        sequelCount: sequelIdeas.data.length,
        threadsCount: unresolvedThreads.data.length,
        totalInputTokens,
        totalOutputTokens
      }, 'Follow-up recommendations generated');

      return {
        id: followUpId,
        projectId: book.project_id,
        bookId,
        status: 'completed',
        generatedAt: now,
        sequelIdeas: sequelIdeas.data,
        unresolvedThreads: unresolvedThreads.data,
        characterContinuations: characterContinuations.data,
        worldExpansions: worldExpansions.data,
        seriesStructure: seriesStructure.data,
        toneVariations: toneVariations.data,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      };
    } catch (error) {
      // Mark as failed
      db.prepare(`
        UPDATE follow_up_recommendations
        SET status = 'failed', updated_at = ?
        WHERE id = ?
      `).run(now, followUpId);

      throw error;
    }
  }

  /**
   * Get follow-up recommendations for a book
   */
  getFollowUpRecommendations(bookId: string): FollowUpRecommendations | null {
    const stmt = db.prepare<[string], FollowUpRecord>(`
      SELECT * FROM follow_up_recommendations WHERE book_id = ?
    `);
    const record = stmt.get(bookId);

    if (!record) {
      return null;
    }

    return this.parseFollowUpRecord(record);
  }

  /**
   * Create or get existing follow-up record
   */
  private async createOrUpdateRecord(projectId: string, bookId: string): Promise<string> {
    const existingStmt = db.prepare<[string], { id: string }>(`
      SELECT id FROM follow_up_recommendations WHERE book_id = ?
    `);
    const existing = existingStmt.get(bookId);

    if (existing) {
      return existing.id;
    }

    const id = randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO follow_up_recommendations (id, project_id, book_id, status)
      VALUES (?, ?, ?, 'pending')
    `);
    insertStmt.run(id, projectId, bookId);

    return id;
  }

  /**
   * Assemble manuscript context for AI analysis
   */
  private assembleManuscriptContext(project: Project, chapters: Chapter[]): string {
    const storyBible = project.story_bible ? JSON.parse(JSON.stringify(project.story_bible)) : null;
    const storyConcept = project.story_concept;

    // Get the last few chapters for ending context
    const lastChapters = chapters.slice(-3);
    const endingContent = lastChapters
      .map(ch => `=== Chapter ${ch.chapter_number} ===\n${ch.content?.slice(-2000) || ''}`)
      .join('\n\n');

    // Get chapter summaries for overall plot
    const summaries = chapters
      .filter(ch => ch.summary)
      .map(ch => `Chapter ${ch.chapter_number}: ${ch.summary}`)
      .join('\n');

    let context = `# MANUSCRIPT ANALYSIS CONTEXT

## Story Information
Title: ${project.title}
Genre: ${project.genre}
Type: ${project.type}

`;

    if (storyConcept) {
      context += `## Story Concept
Logline: ${storyConcept.logline || 'N/A'}
Synopsis: ${storyConcept.synopsis || 'N/A'}
Hook: ${storyConcept.hook || 'N/A'}
Protagonist: ${storyConcept.protagonistHint || 'N/A'}
Conflict Type: ${storyConcept.conflictType || 'N/A'}

`;
    }

    if (storyBible) {
      if (storyBible.characters && storyBible.characters.length > 0) {
        context += `## Main Characters\n`;
        storyBible.characters.slice(0, 5).forEach((char: any) => {
          context += `- ${char.name} (${char.role}): ${char.characterArc || 'N/A'}\n`;
        });
        context += '\n';
      }

      if (storyBible.world) {
        context += `## World Elements\n`;
        if (storyBible.world.locations) {
          storyBible.world.locations.slice(0, 3).forEach((loc: any) => {
            context += `- ${loc.name}: ${loc.significance || 'N/A'}\n`;
          });
        }
        context += '\n';
      }
    }

    if (summaries) {
      context += `## Chapter Summaries\n${summaries}\n\n`;
    }

    context += `## Ending Content (Last 3 Chapters)\n${endingContent}\n`;

    return context;
  }

  /**
   * Generate sequel story ideas
   */
  private async generateSequelIdeas(
    context: string,
    project: Project
  ): Promise<{ data: SequelIdea[]; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a creative writing consultant specialising in story development and sequel planning. Your task is to generate compelling sequel ideas that naturally continue from an existing story.`;

    const userPrompt = `Based on the following manuscript analysis, generate 3-5 unique sequel story ideas. Each sequel should:
- Naturally continue from where the story ended
- Introduce new conflicts while honouring established character development
- Expand the world in interesting ways
- Feel like a satisfying next chapter in the characters' journeys

${context}

Respond with a JSON array of sequel ideas. Each idea should have:
- title: A compelling title for the sequel
- logline: A one-sentence hook
- synopsis: A 2-3 paragraph plot summary
- continuityNotes: How it connects to the original story
- mainConflict: The central conflict
- potentialThemes: Array of 2-4 themes

Output only valid JSON:`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 3000,
      temperature: 0.8,
      tracking: {
        requestType: AI_REQUEST_TYPES.SEQUEL_IDEAS,
        projectId: project.id,
        contextSummary: `Sequel ideas for book`,
      },
    });

    try {
      const ideas = extractJsonObject(response.content) as SequelIdea[];
      return { data: Array.isArray(ideas) ? ideas : [], usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse sequel ideas');
      return { data: [], usage: response.usage };
    }
  }

  /**
   * Generate unresolved plot threads
   */
  private async generateUnresolvedThreads(
    context: string,
    chapters: Chapter[]
  ): Promise<{ data: UnresolvedThread[]; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a story analyst specialising in identifying plot threads and narrative potential. Your task is to find unresolved elements that could be expanded in future stories.`;

    const userPrompt = `Analyse the following manuscript and identify 3-6 unresolved plot threads that could be expanded in a sequel. These could be:
- Questions left unanswered
- Relationships not fully resolved
- Mysteries hinted at but not explored
- Conflicts set up but not addressed
- Character backstories mentioned but not delved into

${context}

Respond with a JSON array of unresolved threads. Each should have:
- thread: Description of the unresolved element
- introduction: { chapter: number, context: brief description of where introduced }
- expansionPotential: How this could become a major plot point
- suggestedResolution: A possible way to resolve it in a sequel

Output only valid JSON:`;

    const projectId = chapters[0] ? await this.getProjectIdFromChapter(chapters[0].id) : null;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.7,
      tracking: {
        requestType: AI_REQUEST_TYPES.UNRESOLVED_THREADS,
        projectId,
        contextSummary: `Unresolved plot threads analysis`,
      },
    });

    try {
      const threads = extractJsonObject(response.content) as UnresolvedThread[];
      return { data: Array.isArray(threads) ? threads : [], usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse unresolved threads');
      return { data: [], usage: response.usage };
    }
  }

  /**
   * Generate character continuation arcs
   */
  private async generateCharacterContinuations(
    context: string,
    project: Project
  ): Promise<{ data: CharacterContinuation[]; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a character development specialist who helps authors plan meaningful character arcs for future stories.`;

    const userPrompt = `Based on the following manuscript, suggest character arc continuations for the main characters. Consider:
- Where each character ended emotionally and physically
- What growth opportunities remain
- Relationship dynamics that could evolve
- Internal conflicts not fully resolved

${context}

Respond with a JSON array of character continuations. Each should have:
- characterName: The character's name
- currentState: Their state at the end of this story
- potentialArcs: Array of 2-3 possible character arcs for a sequel
- relationshipDevelopments: Array of relationship changes to explore
- growthOpportunities: Array of ways they could grow

Output only valid JSON:`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2500,
      temperature: 0.7,
      tracking: {
        requestType: AI_REQUEST_TYPES.CHARACTER_CONTINUATIONS,
        projectId: project.id,
        contextSummary: `Character continuation arcs`,
      },
    });

    try {
      const continuations = extractJsonObject(response.content) as CharacterContinuation[];
      return { data: Array.isArray(continuations) ? continuations : [], usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse character continuations');
      return { data: [], usage: response.usage };
    }
  }

  /**
   * Generate world expansion ideas
   */
  private async generateWorldExpansions(
    context: string,
    project: Project
  ): Promise<{ data: WorldExpansion[]; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a worldbuilding consultant who helps authors expand their fictional universes in engaging ways.`;

    const userPrompt = `Based on the following manuscript, identify 4-6 aspects of the world that could be expanded in future stories. Consider:
- Locations mentioned but not explored
- Cultures referenced but not detailed
- Historical events alluded to
- Magic systems or technologies that could go deeper
- Factions or organisations with untold stories

${context}

Respond with a JSON array of world expansion ideas. Each should have:
- element: Name of the world element
- type: One of "location", "culture", "history", "magic_system", "technology", "faction", or "other"
- explorationIdeas: Array of 2-3 ways to explore this element
- storyPotential: How this could drive a new story

Output only valid JSON:`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.8,
      tracking: {
        requestType: AI_REQUEST_TYPES.WORLD_EXPANSIONS,
        projectId: project.id,
        contextSummary: `World expansion ideas`,
      },
    });

    try {
      const expansions = extractJsonObject(response.content) as WorldExpansion[];
      return { data: Array.isArray(expansions) ? expansions : [], usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse world expansions');
      return { data: [], usage: response.usage };
    }
  }

  /**
   * Generate series structure suggestion
   */
  private async generateSeriesStructure(
    context: string,
    project: Project
  ): Promise<{ data: SeriesArcSuggestion | null; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a series planning consultant who helps authors structure multi-book story arcs.`;

    const userPrompt = `Based on the following completed manuscript, suggest how this could become a trilogy or five-book series. Consider:
- The overarching conflict that could span multiple books
- How to distribute revelations and character growth
- Thematic progression across the series
- Each book having its own satisfying arc while contributing to the whole

${context}

Respond with a JSON object for series structure suggestion:
{
  "structureType": "trilogy" or "five_book",
  "overallArc": "Description of the series-spanning narrative",
  "bookBreakdowns": [
    {
      "bookNumber": 1,
      "workingTitle": "Title",
      "focus": "What this book focuses on",
      "majorEvents": ["Event 1", "Event 2", "Event 3"]
    },
    // ... more books
  ],
  "centralConflict": "The conflict that drives the whole series",
  "thematicProgression": ["Theme 1 explored in book 1", "Theme 2 deepened in book 2", ...]
}

Output only valid JSON:`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2500,
      temperature: 0.7,
    });

    try {
      const structure = extractJsonObject(response.content) as SeriesArcSuggestion;
      return { data: structure && structure.structureType ? structure : null, usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse series structure');
      return { data: null, usage: response.usage };
    }
  }

  /**
   * Generate tone variations
   */
  private async generateToneVariations(
    context: string,
    project: Project
  ): Promise<{ data: ToneVariation[]; usage: { input_tokens: number; output_tokens: number } }> {
    const systemPrompt = `You are a creative story consultant who helps authors explore alternative directions for their stories.`;

    const userPrompt = `Based on the following manuscript, suggest 4-6 alternative directions for sequel stories. These variations could include:
- A darker continuation exploring shadowy themes
- A lighter spin-off with comedic elements
- A prequel exploring backstory
- A parallel story from another character's perspective
- A genre-shifted version (e.g., romance focus, thriller focus)

${context}

Respond with a JSON array of tone variations. Each should have:
- variationType: One of "darker", "lighter", "spin_off", "prequel", "parallel", or "genre_shift"
- description: Brief description of this variation
- whatChanges: Array of 2-4 key changes from the original tone
- potentialStory: A brief story concept in this new direction

Output only valid JSON:`;

    const response = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.9,
      tracking: {
        requestType: AI_REQUEST_TYPES.TONE_VARIATIONS,
        projectId: project.id,
        contextSummary: `Tone variation ideas`,
      },
    });

    try {
      const variations = extractJsonObject(response.content) as ToneVariation[];
      return { data: Array.isArray(variations) ? variations : [], usage: response.usage };
    } catch (error) {
      logger.error({ error }, 'Failed to parse tone variations');
      return { data: [], usage: response.usage };
    }
  }

  /**
   * Parse follow-up record from database
   */
  private parseFollowUpRecord(record: FollowUpRecord): FollowUpRecommendations {
    return {
      id: record.id,
      projectId: record.project_id,
      bookId: record.book_id,
      status: record.status as any,
      generatedAt: record.generated_at,
      sequelIdeas: record.sequel_ideas ? JSON.parse(record.sequel_ideas) : [],
      unresolvedThreads: record.unresolved_threads ? JSON.parse(record.unresolved_threads) : [],
      characterContinuations: record.character_continuations ? JSON.parse(record.character_continuations) : [],
      worldExpansions: record.world_expansion ? JSON.parse(record.world_expansion) : [],
      seriesStructure: record.series_structure ? JSON.parse(record.series_structure) : null,
      toneVariations: record.tone_variations ? JSON.parse(record.tone_variations) : [],
      inputTokens: record.input_tokens || 0,
      outputTokens: record.output_tokens || 0,
    };
  }

  /**
   * Regenerate follow-up recommendations
   */
  async regenerateFollowUp(bookId: string): Promise<FollowUpRecommendations> {
    // Reset existing record
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE follow_up_recommendations
      SET status = 'pending',
          sequel_ideas = NULL,
          unresolved_threads = NULL,
          character_continuations = NULL,
          world_expansion = NULL,
          series_structure = NULL,
          tone_variations = NULL,
          generated_at = NULL,
          input_tokens = 0,
          output_tokens = 0,
          updated_at = ?
      WHERE book_id = ?
    `).run(now, bookId);

    return this.generateFollowUpRecommendations(bookId);
  }

  /**
   * Helper: Get project ID from chapter ID
   */
  private async getProjectIdFromChapter(chapterId: string): Promise<string | null> {
    try {
      const stmt = db.prepare<[string], { project_id: string }>(`
        SELECT b.project_id
        FROM chapters c
        JOIN books b ON c.book_id = b.id
        WHERE c.id = ?
      `);
      const result = stmt.get(chapterId);
      return result?.project_id || null;
    } catch (error) {
      logger.warn({ chapterId, error }, 'Failed to get project ID from chapter');
      return null;
    }
  }
}

export const followUpService = new FollowUpService();
