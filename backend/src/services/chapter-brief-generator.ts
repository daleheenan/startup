/**
 * Chapter Brief Generator Service
 *
 * Generates detailed chapter briefs that guide chapter generation and revision.
 * Each brief includes pacing notes, tone targets, word count budgets, scene
 * requirements, and commercial beat context to ensure consistent quality.
 *
 * Used in two contexts:
 * 1. During initial chapter generation (proactive quality control)
 * 2. During editorial revision (informed regeneration)
 */

import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { randomUUID } from 'crypto';
import {
  commercialBeatValidatorService,
  type ChapterBrief,
  type CommercialBeat,
  COMMERCIAL_BEATS,
} from './commercial-beat-validator.js';
import type {
  StoryStructure,
  ChapterOutline,
  SceneCard,
  StoryDNA,
  Character,
} from '../shared/types/index.js';

const logger = createLogger('services:chapter-brief-generator');

// ============================================================================
// Type Definitions
// ============================================================================

export interface DetailedChapterBrief extends ChapterBrief {
  id: string;
  bookId: string;
  chapterId?: string;
  versionId?: string;

  // Enhanced context
  previousChapterSummary: string | null;
  nextChapterPreview: string | null;
  characterStates: CharacterBriefState[];
  plotThreads: PlotThreadBrief[];

  // Editorial context (for revisions)
  editorialGuidance?: EditorialGuidance;
  lessonsLearned?: string[];

  // Generation metadata
  createdAt: string;
  updatedAt: string;
}

export interface CharacterBriefState {
  characterId: string;
  characterName: string;
  role: string;
  currentEmotionalState: string;
  currentLocation: string;
  currentGoals: string[];
  relevanceToChapter: 'pov' | 'major' | 'minor' | 'mentioned';
  voiceNotes: string;
}

export interface PlotThreadBrief {
  threadName: string;
  threadType: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
  currentPhase: string;
  chapterRole: 'advances' | 'maintains' | 'resolves' | 'introduces' | 'none';
  notes: string;
}

export interface EditorialGuidance {
  vebIssues?: VEBIssueSummary[];
  priorityScore: number;
  focusAreas: string[];
  avoidPatterns: string[];
  styleGuidance: string;
}

export interface VEBIssueSummary {
  issueType: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  remedy: string;
}

export interface ChapterBriefGenerationOptions {
  bookId: string;
  chapterNumber: number;
  includeEditorialGuidance?: boolean;
  previousBriefs?: DetailedChapterBrief[];
}

export interface BulkBriefGenerationResult {
  briefs: DetailedChapterBrief[];
  totalWordCountBudget: number;
  pacingOverview: string;
  generationOrder: number[];
}

// ============================================================================
// Chapter Brief Generator Service
// ============================================================================

export class ChapterBriefGeneratorService {
  /**
   * Generate a detailed brief for a single chapter
   */
  async generateChapterBrief(options: ChapterBriefGenerationOptions): Promise<DetailedChapterBrief> {
    const { bookId, chapterNumber, includeEditorialGuidance } = options;

    logger.info({ bookId, chapterNumber }, 'Generating chapter brief');

    // Get book and project context
    const context = await this.getBookContext(bookId);
    if (!context) {
      throw new Error('Book context not found');
    }

    // Get the chapter outline
    const chapterOutline = this.findChapterOutline(context.structure, chapterNumber);
    if (!chapterOutline) {
      throw new Error(`Chapter ${chapterNumber} not found in outline`);
    }

    // Calculate chapter percentage in story
    const chapterPercentage = this.calculateChapterPercentage(context.structure, chapterNumber);

    // Get base commercial brief
    const baseBrief = commercialBeatValidatorService.generateChapterBrief(
      chapterOutline,
      context.structure,
      chapterPercentage,
      context.genre
    );

    // Get previous and next chapter context
    const previousSummary = await this.getPreviousChapterSummary(bookId, chapterNumber);
    const nextPreview = this.getNextChapterPreview(context.structure, chapterNumber);

    // Get character states
    const characterStates = await this.getCharacterStates(bookId, context.characters, chapterOutline);

    // Get plot thread briefs
    const plotThreads = this.getPlotThreadBriefs(context.plotStructure, chapterNumber);

    // Get editorial guidance if requested
    let editorialGuidance: EditorialGuidance | undefined;
    let lessonsLearned: string[] | undefined;

    if (includeEditorialGuidance) {
      editorialGuidance = await this.getEditorialGuidance(bookId, chapterNumber);
      lessonsLearned = await this.getLessonsLearned(bookId);
    }

    const briefId = `brief_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const detailedBrief: DetailedChapterBrief = {
      ...baseBrief,
      id: briefId,
      bookId,
      previousChapterSummary: previousSummary,
      nextChapterPreview: nextPreview,
      characterStates,
      plotThreads,
      editorialGuidance,
      lessonsLearned,
      createdAt: now,
      updatedAt: now,
    };

    // Store the brief
    await this.storeBrief(detailedBrief);

    logger.info({
      briefId,
      chapterNumber,
      wordCountTarget: detailedBrief.wordCountTarget,
      commercialBeats: detailedBrief.commercialBeats.length,
    }, 'Chapter brief generated');

    return detailedBrief;
  }

  /**
   * Generate briefs for all chapters in a book
   */
  async generateAllChapterBriefs(
    bookId: string,
    includeEditorialGuidance: boolean = false
  ): Promise<BulkBriefGenerationResult> {
    logger.info({ bookId }, 'Generating briefs for all chapters');

    const context = await this.getBookContext(bookId);
    if (!context) {
      throw new Error('Book context not found');
    }

    const briefs: DetailedChapterBrief[] = [];
    let totalWordCountBudget = 0;
    const generationOrder: number[] = [];

    // Generate briefs in chapter order
    for (const act of context.structure.acts) {
      for (const chapter of act.chapters) {
        const brief = await this.generateChapterBrief({
          bookId,
          chapterNumber: chapter.number,
          includeEditorialGuidance,
          previousBriefs: briefs,
        });

        briefs.push(brief);
        totalWordCountBudget += brief.wordCountTarget;
        generationOrder.push(chapter.number);
      }
    }

    // Generate pacing overview
    const pacingOverview = this.generatePacingOverview(briefs, context.structure);

    logger.info({
      bookId,
      briefCount: briefs.length,
      totalWordCountBudget,
    }, 'All chapter briefs generated');

    return {
      briefs,
      totalWordCountBudget,
      pacingOverview,
      generationOrder,
    };
  }

  /**
   * Generate a revision brief for a chapter (includes editorial context)
   */
  async generateRevisionBrief(
    bookId: string,
    chapterNumber: number,
    vebIssues?: any
  ): Promise<DetailedChapterBrief> {
    logger.info({ bookId, chapterNumber }, 'Generating revision brief');

    const brief = await this.generateChapterBrief({
      bookId,
      chapterNumber,
      includeEditorialGuidance: true,
    });

    // Enhance with specific VEB issues if provided
    if (vebIssues && brief.editorialGuidance) {
      brief.editorialGuidance.vebIssues = this.summariseVEBIssues(vebIssues);
    }

    return brief;
  }

  /**
   * Build the chapter generation prompt using the brief
   */
  buildChapterPromptFromBrief(brief: DetailedChapterBrief, storyDNA: StoryDNA): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Chapter ${brief.chapterNumber}: "${brief.title}"\n`);

    // Word count guidance
    sections.push(`## Word Count Budget`);
    sections.push(`- Target: ${brief.wordCountTarget} words`);
    sections.push(`- Acceptable range: ${brief.wordCountMin} - ${brief.wordCountMax} words`);
    sections.push(`- Story position: ${brief.storyPercentage.toFixed(1)}% through the narrative\n`);

    // Commercial beats
    if (brief.commercialBeats.length > 0) {
      sections.push(`## Commercial Beat Requirements`);
      sections.push(`This chapter must deliver the following story beats:`);
      for (const beat of brief.commercialBeats) {
        sections.push(`- **${beat.name}**: ${beat.description}`);
        sections.push(`  - Reader expectation: ${beat.readerExpectation}`);
      }
      sections.push('');
    }

    // Pacing and tone
    sections.push(`## Pacing & Tone`);
    sections.push(`- Pacing: **${brief.pacingGuidance.toUpperCase()}**`);
    for (const note of brief.toneNotes) {
      sections.push(`- ${note}`);
    }
    if (brief.genreNotes) {
      sections.push(`- Genre guidance: ${brief.genreNotes}`);
    }
    sections.push('');

    // Chapter summary
    sections.push(`## Chapter Synopsis`);
    sections.push(brief.summary);
    sections.push('');

    // Previous chapter context
    if (brief.previousChapterSummary) {
      sections.push(`## Previous Chapter Context`);
      sections.push(brief.previousChapterSummary);
      sections.push('');
    }

    // Character states
    if (brief.characterStates.length > 0) {
      sections.push(`## Character States at Chapter Start`);
      for (const char of brief.characterStates) {
        sections.push(`### ${char.characterName} (${char.role}) - ${char.relevanceToChapter.toUpperCase()}`);
        sections.push(`- Location: ${char.currentLocation}`);
        sections.push(`- Emotional state: ${char.currentEmotionalState}`);
        sections.push(`- Goals: ${char.currentGoals.join(', ')}`);
        sections.push(`- Voice notes: ${char.voiceNotes}`);
      }
      sections.push('');
    }

    // Plot threads
    if (brief.plotThreads.length > 0) {
      sections.push(`## Active Plot Threads`);
      for (const thread of brief.plotThreads.filter(t => t.chapterRole !== 'none')) {
        sections.push(`- **${thread.threadName}** (${thread.threadType}): ${thread.chapterRole.toUpperCase()}`);
        sections.push(`  - Current phase: ${thread.currentPhase}`);
        sections.push(`  - Notes: ${thread.notes}`);
      }
      sections.push('');
    }

    // Scene requirements
    if (brief.sceneRequirements.length > 0) {
      sections.push(`## Scene Requirements`);
      brief.sceneRequirements.forEach((scene, index) => {
        sections.push(`### Scene ${index + 1}`);
        sections.push(`- Goal: ${scene.goal}`);
        sections.push(`- Conflict: ${scene.conflict}`);
        sections.push(`- Outcome: ${scene.outcome}`);
        sections.push(`- Emotional beat: ${scene.emotionalBeat}`);
      });
      sections.push('');
    }

    // Editorial guidance (for revisions)
    if (brief.editorialGuidance) {
      sections.push(`## Editorial Guidance`);
      sections.push(`Priority score: ${brief.editorialGuidance.priorityScore}/100\n`);

      if (brief.editorialGuidance.focusAreas.length > 0) {
        sections.push(`**Focus Areas:**`);
        for (const area of brief.editorialGuidance.focusAreas) {
          sections.push(`- ${area}`);
        }
      }

      if (brief.editorialGuidance.avoidPatterns.length > 0) {
        sections.push(`\n**Patterns to Avoid:**`);
        for (const pattern of brief.editorialGuidance.avoidPatterns) {
          sections.push(`- ${pattern}`);
        }
      }

      if (brief.editorialGuidance.vebIssues && brief.editorialGuidance.vebIssues.length > 0) {
        sections.push(`\n**Specific Issues to Address:**`);
        for (const issue of brief.editorialGuidance.vebIssues) {
          sections.push(`- [${issue.severity.toUpperCase()}] ${issue.issueType}: ${issue.description}`);
          sections.push(`  - Remedy: ${issue.remedy}`);
        }
      }

      sections.push('');
    }

    // Lessons learned
    if (brief.lessonsLearned && brief.lessonsLearned.length > 0) {
      sections.push(`## Lessons from Previous Chapters`);
      for (const lesson of brief.lessonsLearned) {
        sections.push(`- ${lesson}`);
      }
      sections.push('');
    }

    // Style reminder
    sections.push(`## Style Requirements`);
    sections.push(`- Tone: ${storyDNA.tone}`);
    sections.push(`- Prose style: ${storyDNA.proseStyle}`);
    sections.push(`- Themes to reinforce: ${storyDNA.themes.join(', ')}`);

    return sections.join('\n');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get full book context for brief generation
   */
  private async getBookContext(bookId: string): Promise<{
    structure: StoryStructure;
    genre: string;
    storyDNA: StoryDNA;
    characters: Character[];
    plotStructure: any;
  } | null> {
    const bookStmt = db.prepare<[string], any>(`
      SELECT b.id, b.project_id, p.genre, p.story_dna, p.story_bible, p.plot_structure,
             o.structure as outline_structure
      FROM books b
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN outlines o ON o.book_id = b.id
      WHERE b.id = ?
    `);

    const book = bookStmt.get(bookId);
    if (!book || !book.outline_structure) {
      return null;
    }

    const structure = JSON.parse(book.outline_structure);
    const storyDNA = book.story_dna ? JSON.parse(book.story_dna) : {
      genre: book.genre,
      subgenre: '',
      tone: 'neutral',
      themes: [],
      proseStyle: 'standard',
    };
    const storyBible = book.story_bible ? JSON.parse(book.story_bible) : { characters: [] };
    const plotStructure = book.plot_structure ? JSON.parse(book.plot_structure) : null;

    return {
      structure,
      genre: book.genre,
      storyDNA,
      characters: storyBible.characters || [],
      plotStructure,
    };
  }

  /**
   * Find chapter outline in structure
   */
  private findChapterOutline(structure: StoryStructure, chapterNumber: number): ChapterOutline | null {
    for (const act of structure.acts) {
      const chapter = act.chapters.find(c => c.number === chapterNumber);
      if (chapter) {
        return chapter;
      }
    }
    return null;
  }

  /**
   * Calculate chapter percentage through story
   */
  private calculateChapterPercentage(structure: StoryStructure, chapterNumber: number): number {
    let totalWords = 0;
    let wordsBeforeChapter = 0;

    for (const act of structure.acts) {
      for (const chapter of act.chapters) {
        totalWords += chapter.wordCountTarget;
        if (chapter.number < chapterNumber) {
          wordsBeforeChapter += chapter.wordCountTarget;
        }
      }
    }

    return totalWords > 0 ? (wordsBeforeChapter / totalWords) * 100 : 0;
  }

  /**
   * Get previous chapter summary
   */
  private async getPreviousChapterSummary(bookId: string, chapterNumber: number): Promise<string | null> {
    if (chapterNumber <= 1) {
      return null;
    }

    const stmt = db.prepare<[string, number], { summary: string | null }>(`
      SELECT summary FROM chapters
      WHERE book_id = ? AND chapter_number = ?
    `);

    const result = stmt.get(bookId, chapterNumber - 1);
    return result?.summary || null;
  }

  /**
   * Get next chapter preview from outline
   */
  private getNextChapterPreview(structure: StoryStructure, chapterNumber: number): string | null {
    const nextChapter = this.findChapterOutline(structure, chapterNumber + 1);
    return nextChapter ? `Next: "${nextChapter.title}" - ${nextChapter.summary}` : null;
  }

  /**
   * Get character states for brief
   */
  private async getCharacterStates(
    bookId: string,
    characters: Character[],
    chapterOutline: ChapterOutline
  ): Promise<CharacterBriefState[]> {
    const states: CharacterBriefState[] = [];

    // Get POV character
    const povCharacter = characters.find(c => c.name === chapterOutline.povCharacter);
    if (povCharacter) {
      states.push({
        characterId: povCharacter.id,
        characterName: povCharacter.name,
        role: povCharacter.role,
        currentEmotionalState: povCharacter.currentState?.emotionalState || 'neutral',
        currentLocation: povCharacter.currentState?.location || 'unknown',
        currentGoals: povCharacter.currentState?.goals || povCharacter.goals,
        relevanceToChapter: 'pov',
        voiceNotes: povCharacter.voiceSample || 'Standard voice',
      });
    }

    // Get other characters in scenes
    const sceneCharacters = new Set<string>();
    for (const scene of chapterOutline.scenes) {
      for (const charName of scene.characters) {
        if (charName !== chapterOutline.povCharacter) {
          sceneCharacters.add(charName);
        }
      }
    }

    for (const charName of sceneCharacters) {
      const character = characters.find(c => c.name === charName);
      if (character) {
        states.push({
          characterId: character.id,
          characterName: character.name,
          role: character.role,
          currentEmotionalState: character.currentState?.emotionalState || 'neutral',
          currentLocation: character.currentState?.location || 'unknown',
          currentGoals: character.currentState?.goals || character.goals,
          relevanceToChapter: 'major',
          voiceNotes: character.voiceSample || 'Standard voice',
        });
      }
    }

    return states;
  }

  /**
   * Get plot thread briefs
   */
  private getPlotThreadBriefs(plotStructure: any, chapterNumber: number): PlotThreadBrief[] {
    if (!plotStructure?.plot_layers) {
      return [];
    }

    const briefs: PlotThreadBrief[] = [];

    for (const layer of plotStructure.plot_layers) {
      // Find if this chapter has a plot point for this layer
      const chapterPoint = layer.points?.find((p: any) => p.chapter_number === chapterNumber);

      let chapterRole: 'advances' | 'maintains' | 'resolves' | 'introduces' | 'none' = 'maintains';

      if (chapterPoint) {
        switch (chapterPoint.phase) {
          case 'setup':
            chapterRole = 'introduces';
            break;
          case 'resolution':
            chapterRole = 'resolves';
            break;
          case 'climax':
            chapterRole = 'resolves';
            break;
          default:
            chapterRole = 'advances';
        }
      } else if (layer.status === 'resolved' && layer.resolution_chapter && layer.resolution_chapter < chapterNumber) {
        chapterRole = 'none';
      }

      briefs.push({
        threadName: layer.name,
        threadType: layer.type,
        currentPhase: chapterPoint?.phase || layer.status,
        chapterRole,
        notes: chapterPoint?.description || `${layer.name} continues`,
      });
    }

    return briefs;
  }

  /**
   * Get editorial guidance from VEB and lessons
   */
  private async getEditorialGuidance(bookId: string, chapterNumber: number): Promise<EditorialGuidance> {
    // Get VEB results if available
    const vebStmt = db.prepare<[string], { ruthless_editor_results: string | null }>(`
      SELECT er.ruthless_editor_results
      FROM editorial_reports er
      JOIN projects p ON er.project_id = p.id
      JOIN books b ON b.project_id = p.id
      WHERE b.id = ? AND er.status = 'completed'
      ORDER BY er.completed_at DESC LIMIT 1
    `);

    const veb = vebStmt.get(bookId);
    let vebIssues: VEBIssueSummary[] = [];
    let priorityScore = 50;

    if (veb?.ruthless_editor_results) {
      const results = JSON.parse(veb.ruthless_editor_results);
      const chapterResult = results.chapterResults?.find((cr: any) => cr.chapterNumber === chapterNumber);

      if (chapterResult) {
        vebIssues = this.summariseVEBIssues(chapterResult);
        priorityScore = this.calculatePriorityFromVEB(chapterResult);
      }
    }

    return {
      vebIssues,
      priorityScore,
      focusAreas: this.determineFocusAreas(vebIssues),
      avoidPatterns: this.determineAvoidPatterns(vebIssues),
      styleGuidance: 'Maintain consistent voice and pacing',
    };
  }

  /**
   * Summarise VEB issues for the brief
   */
  private summariseVEBIssues(chapterResult: any): VEBIssueSummary[] {
    const summaries: VEBIssueSummary[] = [];

    // Scene purpose issues
    if (chapterResult.scenePurpose && !chapterResult.scenePurpose.earned) {
      summaries.push({
        issueType: 'Scene Purpose',
        description: chapterResult.scenePurpose.reasoning || 'Scene does not earn its place',
        severity: 'major',
        remedy: chapterResult.scenePurpose.recommendation || 'Ensure every scene advances plot or character',
      });
    }

    // Exposition issues
    if (chapterResult.expositionIssues) {
      for (const issue of chapterResult.expositionIssues) {
        summaries.push({
          issueType: `Exposition: ${issue.issue}`,
          description: issue.quote ? `"${issue.quote}"` : issue.issue,
          severity: issue.severity === 'high' ? 'major' : issue.severity === 'medium' ? 'moderate' : 'minor',
          remedy: issue.suggestion,
        });
      }
    }

    // Pacing issues
    if (chapterResult.pacingIssues) {
      for (const issue of chapterResult.pacingIssues) {
        summaries.push({
          issueType: `Pacing: ${issue.issue}`,
          description: `At ${issue.location}`,
          severity: issue.severity === 'high' ? 'major' : issue.severity === 'medium' ? 'moderate' : 'minor',
          remedy: issue.suggestion,
        });
      }
    }

    return summaries;
  }

  /**
   * Calculate priority score from VEB results
   */
  private calculatePriorityFromVEB(chapterResult: any): number {
    let score = 50;

    if (chapterResult.scenePurpose && !chapterResult.scenePurpose.earned) {
      score += 30;
    }

    const expIssues = chapterResult.expositionIssues?.length || 0;
    score += Math.min(25, expIssues * 5);

    const pacingIssues = chapterResult.pacingIssues?.length || 0;
    score += Math.min(25, pacingIssues * 5);

    return Math.min(100, score);
  }

  /**
   * Determine focus areas from issues
   */
  private determineFocusAreas(issues: VEBIssueSummary[]): string[] {
    const areas: string[] = [];

    const hasExpositionIssues = issues.some(i => i.issueType.includes('Exposition'));
    const hasPacingIssues = issues.some(i => i.issueType.includes('Pacing'));
    const hasScenePurposeIssues = issues.some(i => i.issueType.includes('Scene Purpose'));

    if (hasScenePurposeIssues) {
      areas.push('Ensure every scene advances plot or reveals character');
    }
    if (hasExpositionIssues) {
      areas.push('Show rather than tell - weave information into action');
    }
    if (hasPacingIssues) {
      areas.push('Maintain narrative momentum - avoid stagnation');
    }

    if (areas.length === 0) {
      areas.push('Maintain quality and consistency');
    }

    return areas;
  }

  /**
   * Determine patterns to avoid from issues
   */
  private determineAvoidPatterns(issues: VEBIssueSummary[]): string[] {
    const patterns: string[] = [];

    for (const issue of issues) {
      if (issue.issueType.includes('info_dump')) {
        patterns.push('Information dumps - break up exposition with action');
      }
      if (issue.issueType.includes('telling_not_showing')) {
        patterns.push('Telling emotions directly - show through action and dialogue');
      }
      if (issue.issueType.includes('too_slow')) {
        patterns.push('Extended passages without conflict or tension');
      }
      if (issue.issueType.includes('repetitive')) {
        patterns.push('Repetitive descriptions or actions');
      }
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Get lessons learned from previous generations
   */
  private async getLessonsLearned(bookId: string): Promise<string[]> {
    // This would integrate with an editorial lessons service
    // For now, return standard guidance
    return [
      'Maintain consistent character voice throughout',
      'End scenes on a hook or tension point',
      'Balance dialogue with action and interiority',
      'Ground scenes with sensory details',
    ];
  }

  /**
   * Store brief in database
   */
  private async storeBrief(brief: DetailedChapterBrief): Promise<void> {
    const stmt = db.prepare(`
      INSERT INTO chapter_briefs (
        id, book_id, chapter_number, brief_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(book_id, chapter_number) DO UPDATE SET
        brief_data = excluded.brief_data,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      brief.id,
      brief.bookId,
      brief.chapterNumber,
      JSON.stringify(brief),
      brief.createdAt,
      brief.updatedAt
    );
  }

  /**
   * Generate pacing overview for all briefs
   */
  private generatePacingOverview(briefs: DetailedChapterBrief[], structure: StoryStructure): string {
    const sections: string[] = [];

    sections.push('# Pacing Overview\n');

    // Word count summary
    const totalWords = briefs.reduce((sum, b) => sum + b.wordCountTarget, 0);
    sections.push(`Total word count budget: ${totalWords.toLocaleString()} words`);
    sections.push(`Chapter count: ${briefs.length}`);
    sections.push(`Average chapter length: ${Math.round(totalWords / briefs.length).toLocaleString()} words\n`);

    // Commercial beats timeline
    sections.push('## Commercial Beat Timeline');
    for (const brief of briefs) {
      if (brief.commercialBeats.length > 0) {
        sections.push(`- Chapter ${brief.chapterNumber} (${brief.storyPercentage.toFixed(1)}%): ${brief.commercialBeats.map(b => b.name).join(', ')}`);
      }
    }

    // Pacing distribution
    sections.push('\n## Pacing Distribution');
    const pacingCounts = { slow: 0, medium: 0, fast: 0 };
    for (const brief of briefs) {
      pacingCounts[brief.pacingGuidance]++;
    }
    sections.push(`- Slow chapters: ${pacingCounts.slow}`);
    sections.push(`- Medium chapters: ${pacingCounts.medium}`);
    sections.push(`- Fast chapters: ${pacingCounts.fast}`);

    return sections.join('\n');
  }
}

// Export singleton instance
export const chapterBriefGeneratorService = new ChapterBriefGeneratorService();
