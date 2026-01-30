/**
 * Commercial Beat Validator Service
 *
 * Validates story outlines against commercial beat structure requirements
 * for mass market fiction. Ensures proper pacing milestones are hit at
 * the right percentages to maximise reader engagement and commercial success.
 *
 * Key commercial beats for mass market:
 * - Hook/Inciting Incident: 10-15%
 * - First Plot Point: 20-25%
 * - Midpoint Twist: 48-52%
 * - Dark Moment/All Is Lost: 70-75%
 * - Climax: 85-92%
 * - Resolution: 95-100%
 */

import { createLogger } from './logger.service.js';
import type {
  StoryStructure,
  Act,
  ChapterOutline,
  Beat,
  StoryStructureType,
} from '../shared/types/index.js';

const logger = createLogger('services:commercial-beat-validator');

// ============================================================================
// Type Definitions
// ============================================================================

export interface CommercialBeat {
  name: string;
  description: string;
  idealPercentage: number;
  toleranceMin: number;
  toleranceMax: number;
  importance: 'critical' | 'important' | 'recommended';
  readerExpectation: string;
}

export interface BeatValidationResult {
  beatName: string;
  found: boolean;
  foundAtPercentage: number | null;
  expectedPercentage: number;
  toleranceMin: number;
  toleranceMax: number;
  withinTolerance: boolean;
  importance: 'critical' | 'important' | 'recommended';
  chapterNumber: number | null;
  issue: string | null;
  recommendation: string | null;
}

export interface CommercialValidationReport {
  isValid: boolean;
  overallScore: number; // 0-100
  criticalIssues: BeatValidationResult[];
  importantIssues: BeatValidationResult[];
  recommendations: string[];
  beatResults: BeatValidationResult[];
  pacingAnalysis: PacingAnalysis;
  wordCountAnalysis: WordCountAnalysis;
  readyForGeneration: boolean;
}

export interface PacingAnalysis {
  overall: 'too_slow' | 'well_paced' | 'too_fast' | 'uneven';
  actBalance: ActBalanceResult[];
  issues: string[];
  suggestions: string[];
}

export interface ActBalanceResult {
  actNumber: number;
  actName: string;
  actualPercentage: number;
  idealPercentage: number;
  chapterCount: number;
  wordCountTarget: number;
  status: 'under' | 'balanced' | 'over';
}

export interface WordCountAnalysis {
  totalWordCount: number;
  targetWordCount: number;
  chapterCount: number;
  averageChapterWordCount: number;
  chaptersOutOfTolerance: ChapterWordCountIssue[];
  isBalanced: boolean;
}

export interface ChapterWordCountIssue {
  chapterNumber: number;
  chapterTitle: string;
  targetWordCount: number;
  issue: 'too_short' | 'too_long';
  recommendation: string;
}

export interface GenreCommercialExpectations {
  genre: string;
  typicalWordCount: { min: number; max: number };
  chapterWordCount: { min: number; max: number };
  pacingExpectations: string;
  criticalBeats: string[];
  customBeats?: CommercialBeat[];
}

// ============================================================================
// Commercial Beat Definitions
// ============================================================================

/**
 * Standard commercial beats for mass market fiction
 * Based on industry standards and reader expectations
 */
export const COMMERCIAL_BEATS: CommercialBeat[] = [
  {
    name: 'Opening Hook',
    description: 'Compelling opening that hooks the reader within the first few pages',
    idealPercentage: 0,
    toleranceMin: 0,
    toleranceMax: 3,
    importance: 'critical',
    readerExpectation: 'Readers decide within the first chapter whether to continue reading',
  },
  {
    name: 'Inciting Incident',
    description: 'The event that disrupts the protagonist\'s normal world and sets the story in motion',
    idealPercentage: 12,
    toleranceMin: 10,
    toleranceMax: 15,
    importance: 'critical',
    readerExpectation: 'Readers expect the story to truly begin by chapter 2-3',
  },
  {
    name: 'First Plot Point',
    description: 'The protagonist commits to the journey and crosses into Act II',
    idealPercentage: 25,
    toleranceMin: 20,
    toleranceMax: 28,
    importance: 'critical',
    readerExpectation: 'By 25% the protagonist should be fully committed to their goal',
  },
  {
    name: 'First Pinch Point',
    description: 'Reminder of the antagonist\'s power and threat',
    idealPercentage: 37,
    toleranceMin: 33,
    toleranceMax: 40,
    importance: 'important',
    readerExpectation: 'Stakes should feel real and escalating',
  },
  {
    name: 'Midpoint Twist',
    description: 'Major revelation or reversal that fundamentally changes the story direction',
    idealPercentage: 50,
    toleranceMin: 48,
    toleranceMax: 52,
    importance: 'critical',
    readerExpectation: 'The middle should not sag - something major must happen',
  },
  {
    name: 'Second Pinch Point',
    description: 'Antagonist\'s power at full strength, pressure intensifies',
    idealPercentage: 62,
    toleranceMin: 58,
    toleranceMax: 67,
    importance: 'important',
    readerExpectation: 'Reader should feel the noose tightening',
  },
  {
    name: 'Dark Moment / All Is Lost',
    description: 'The protagonist\'s lowest point - all seems hopeless',
    idealPercentage: 75,
    toleranceMin: 70,
    toleranceMax: 78,
    importance: 'critical',
    readerExpectation: 'Readers need to worry the protagonist might fail',
  },
  {
    name: 'Break Into Three',
    description: 'Protagonist finds new strength or insight to face the final challenge',
    idealPercentage: 80,
    toleranceMin: 78,
    toleranceMax: 85,
    importance: 'important',
    readerExpectation: 'Hope must be rekindled before the climax',
  },
  {
    name: 'Climax',
    description: 'The final confrontation where everything comes together',
    idealPercentage: 88,
    toleranceMin: 85,
    toleranceMax: 92,
    importance: 'critical',
    readerExpectation: 'The climax should be satisfying and earned',
  },
  {
    name: 'Resolution',
    description: 'Wrap up loose ends and show the new status quo',
    idealPercentage: 97,
    toleranceMin: 95,
    toleranceMax: 100,
    importance: 'important',
    readerExpectation: 'Readers need closure but not too much lingering',
  },
];

/**
 * Genre-specific commercial expectations
 */
export const GENRE_EXPECTATIONS: Record<string, GenreCommercialExpectations> = {
  thriller: {
    genre: 'Thriller',
    typicalWordCount: { min: 70000, max: 100000 },
    chapterWordCount: { min: 1500, max: 3000 },
    pacingExpectations: 'Fast-paced with frequent tension peaks. Short chapters encouraged.',
    criticalBeats: ['Opening Hook', 'Inciting Incident', 'Midpoint Twist', 'Climax'],
  },
  romance: {
    genre: 'Romance',
    typicalWordCount: { min: 50000, max: 80000 },
    chapterWordCount: { min: 2000, max: 3500 },
    pacingExpectations: 'Emotional pacing with room for relationship development. Meet-cute early.',
    criticalBeats: ['Opening Hook', 'First Plot Point', 'Midpoint Twist', 'Dark Moment'],
    customBeats: [
      {
        name: 'Meet-Cute',
        description: 'First meeting between romantic leads',
        idealPercentage: 8,
        toleranceMin: 5,
        toleranceMax: 12,
        importance: 'critical',
        readerExpectation: 'Romance readers want to meet both leads early',
      },
    ],
  },
  fantasy: {
    genre: 'Fantasy',
    typicalWordCount: { min: 90000, max: 150000 },
    chapterWordCount: { min: 2500, max: 4500 },
    pacingExpectations: 'Allows for world-building but action must punctuate exposition regularly.',
    criticalBeats: ['Inciting Incident', 'First Plot Point', 'Midpoint Twist', 'Climax'],
  },
  mystery: {
    genre: 'Mystery',
    typicalWordCount: { min: 60000, max: 90000 },
    chapterWordCount: { min: 2000, max: 3500 },
    pacingExpectations: 'Steady pace with clues planted regularly. Multiple red herrings required.',
    criticalBeats: ['Inciting Incident', 'Midpoint Twist', 'Dark Moment', 'Climax'],
    customBeats: [
      {
        name: 'Crime/Mystery Discovery',
        description: 'The central mystery or crime is revealed',
        idealPercentage: 10,
        toleranceMin: 5,
        toleranceMax: 15,
        importance: 'critical',
        readerExpectation: 'Mystery readers want to know what needs solving early',
      },
    ],
  },
  'science fiction': {
    genre: 'Science Fiction',
    typicalWordCount: { min: 80000, max: 120000 },
    chapterWordCount: { min: 2500, max: 4000 },
    pacingExpectations: 'Balance world-building with plot advancement. Ideas should drive conflict.',
    criticalBeats: ['Opening Hook', 'Inciting Incident', 'Midpoint Twist', 'Climax'],
  },
  horror: {
    genre: 'Horror',
    typicalWordCount: { min: 60000, max: 90000 },
    chapterWordCount: { min: 1500, max: 3000 },
    pacingExpectations: 'Build dread steadily. Punctuate with scares at regular intervals.',
    criticalBeats: ['Opening Hook', 'Inciting Incident', 'Midpoint Twist', 'Climax'],
    customBeats: [
      {
        name: 'First Scare',
        description: 'First genuine horror moment that establishes the threat',
        idealPercentage: 15,
        toleranceMin: 10,
        toleranceMax: 20,
        importance: 'critical',
        readerExpectation: 'Horror readers want early confirmation of genre',
      },
    ],
  },
  'literary fiction': {
    genre: 'Literary Fiction',
    typicalWordCount: { min: 70000, max: 100000 },
    chapterWordCount: { min: 2500, max: 5000 },
    pacingExpectations: 'Character-driven pacing acceptable. Thematic resonance over plot machinery.',
    criticalBeats: ['First Plot Point', 'Midpoint Twist', 'Climax'],
  },
};

// ============================================================================
// Commercial Beat Validator Service
// ============================================================================

export class CommercialBeatValidatorService {
  /**
   * Validate a story structure against commercial beat requirements
   */
  validateStructure(
    structure: StoryStructure,
    targetWordCount: number,
    genre?: string
  ): CommercialValidationReport {
    logger.info({ structureType: structure.type, targetWordCount, genre }, 'Validating commercial beat structure');

    // Get genre-specific expectations if available
    const genreExpectations = genre ? this.getGenreExpectations(genre) : null;

    // Get all chapters with their cumulative word counts
    const chapters = this.flattenChapters(structure);
    const totalTargetWordCount = this.calculateTotalWordCount(structure);

    // Validate each commercial beat
    const beatResults = this.validateBeats(structure, chapters, totalTargetWordCount, genreExpectations);

    // Analyse pacing
    const pacingAnalysis = this.analysePacing(structure, chapters, genreExpectations);

    // Analyse word counts
    const wordCountAnalysis = this.analyseWordCounts(structure, chapters, targetWordCount, genreExpectations);

    // Separate critical and important issues
    const criticalIssues = beatResults.filter(r => !r.withinTolerance && r.importance === 'critical');
    const importantIssues = beatResults.filter(r => !r.withinTolerance && r.importance === 'important');

    // Calculate overall score
    const overallScore = this.calculateOverallScore(beatResults, pacingAnalysis, wordCountAnalysis);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      beatResults,
      pacingAnalysis,
      wordCountAnalysis,
      genreExpectations
    );

    // Determine if ready for generation
    const readyForGeneration = criticalIssues.length === 0 && overallScore >= 70;

    const report: CommercialValidationReport = {
      isValid: criticalIssues.length === 0,
      overallScore,
      criticalIssues,
      importantIssues,
      recommendations,
      beatResults,
      pacingAnalysis,
      wordCountAnalysis,
      readyForGeneration,
    };

    logger.info({
      isValid: report.isValid,
      overallScore,
      criticalIssueCount: criticalIssues.length,
      readyForGeneration,
    }, 'Commercial beat validation complete');

    return report;
  }

  /**
   * Get genre-specific commercial expectations
   */
  getGenreExpectations(genre: string): GenreCommercialExpectations | null {
    const normalised = genre.toLowerCase().trim();
    return GENRE_EXPECTATIONS[normalised] || null;
  }

  /**
   * Flatten all chapters from the structure into a single array with cumulative data
   */
  private flattenChapters(structure: StoryStructure): Array<{
    chapter: ChapterOutline;
    actNumber: number;
    cumulativeWordCount: number;
    percentage: number;
  }> {
    const chapters: Array<{
      chapter: ChapterOutline;
      actNumber: number;
      cumulativeWordCount: number;
      percentage: number;
    }> = [];

    let cumulativeWordCount = 0;
    const totalWordCount = this.calculateTotalWordCount(structure);

    for (const act of structure.acts) {
      for (const chapter of act.chapters) {
        cumulativeWordCount += chapter.wordCountTarget;
        const percentage = totalWordCount > 0 ? (cumulativeWordCount / totalWordCount) * 100 : 0;

        chapters.push({
          chapter,
          actNumber: act.number,
          cumulativeWordCount,
          percentage,
        });
      }
    }

    return chapters;
  }

  /**
   * Calculate total word count from structure
   */
  private calculateTotalWordCount(structure: StoryStructure): number {
    return structure.acts.reduce((total, act) => {
      return total + act.chapters.reduce((actTotal, ch) => actTotal + ch.wordCountTarget, 0);
    }, 0);
  }

  /**
   * Validate commercial beats against the structure
   */
  private validateBeats(
    structure: StoryStructure,
    chapters: Array<{ chapter: ChapterOutline; actNumber: number; cumulativeWordCount: number; percentage: number }>,
    totalWordCount: number,
    genreExpectations: GenreCommercialExpectations | null
  ): BeatValidationResult[] {
    const results: BeatValidationResult[] = [];

    // Get beats to validate (standard + genre-specific)
    let beatsToValidate = [...COMMERCIAL_BEATS];
    if (genreExpectations?.customBeats) {
      beatsToValidate = [...beatsToValidate, ...genreExpectations.customBeats];
    }

    // Sort by ideal percentage
    beatsToValidate.sort((a, b) => a.idealPercentage - b.idealPercentage);

    for (const beat of beatsToValidate) {
      const result = this.findBeatInStructure(beat, structure, chapters);
      results.push(result);
    }

    return results;
  }

  /**
   * Find a specific beat in the structure
   */
  private findBeatInStructure(
    beat: CommercialBeat,
    structure: StoryStructure,
    chapters: Array<{ chapter: ChapterOutline; actNumber: number; cumulativeWordCount: number; percentage: number }>
  ): BeatValidationResult {
    // Search for the beat in act beats
    for (const act of structure.acts) {
      for (const actBeat of act.beats) {
        if (this.beatsMatch(beat.name, actBeat.name)) {
          const foundPercentage = actBeat.percentagePoint;
          const withinTolerance = foundPercentage >= beat.toleranceMin && foundPercentage <= beat.toleranceMax;

          // Find the chapter this beat corresponds to
          const chapterNumber = this.findChapterForPercentage(foundPercentage, chapters);

          return {
            beatName: beat.name,
            found: true,
            foundAtPercentage: foundPercentage,
            expectedPercentage: beat.idealPercentage,
            toleranceMin: beat.toleranceMin,
            toleranceMax: beat.toleranceMax,
            withinTolerance,
            importance: beat.importance,
            chapterNumber,
            issue: withinTolerance ? null : this.generateBeatIssue(beat, foundPercentage),
            recommendation: withinTolerance ? null : this.generateBeatRecommendation(beat, foundPercentage),
          };
        }
      }
    }

    // Beat not found - check chapter summaries for implicit beats
    const implicitMatch = this.findImplicitBeat(beat, chapters);
    if (implicitMatch) {
      return implicitMatch;
    }

    // Beat not found at all
    return {
      beatName: beat.name,
      found: false,
      foundAtPercentage: null,
      expectedPercentage: beat.idealPercentage,
      toleranceMin: beat.toleranceMin,
      toleranceMax: beat.toleranceMax,
      withinTolerance: false,
      importance: beat.importance,
      chapterNumber: null,
      issue: `${beat.name} not found in outline`,
      recommendation: `Add a clear ${beat.name} at approximately ${beat.idealPercentage}% of the story (around chapter ${Math.round(chapters.length * beat.idealPercentage / 100)})`,
    };
  }

  /**
   * Check if beat names match (fuzzy matching)
   */
  private beatsMatch(commercialBeatName: string, structureBeatName: string): boolean {
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const commercialNorm = normalise(commercialBeatName);
    const structureNorm = normalise(structureBeatName);

    // Direct match
    if (commercialNorm === structureNorm) return true;

    // Partial matches for common variations
    const matchMappings: Record<string, string[]> = {
      'openinghook': ['openingimage', 'hook', 'opening'],
      'incitingincident': ['catalyst', 'inciting', 'calltoaction', 'calltoadventure'],
      'firstplotpoint': ['breakintotwo', 'crossingthreshold', 'plotpoint1', 'plotturn1'],
      'midpointtwist': ['midpoint', 'falsevictory', 'falsedefeat'],
      'darkmomentallislost': ['allislost', 'darknightofthesoul', 'darknight', 'lowpoint'],
      'breakintothree': ['breakinto3', 'secondwind', 'plotturn2'],
      'climax': ['finale', 'finalconfrontation', 'resurrection'],
      'resolution': ['denouement', 'closingimage', 'finalimage', 'conclusion'],
    };

    const mappings = matchMappings[commercialNorm];
    if (mappings) {
      return mappings.some(m => structureNorm.includes(m) || m.includes(structureNorm));
    }

    return false;
  }

  /**
   * Find implicit beat from chapter summaries
   */
  private findImplicitBeat(
    beat: CommercialBeat,
    chapters: Array<{ chapter: ChapterOutline; actNumber: number; cumulativeWordCount: number; percentage: number }>
  ): BeatValidationResult | null {
    // Keywords that suggest specific beats
    const beatKeywords: Record<string, string[]> = {
      'Opening Hook': ['hook', 'gripping', 'intrigue', 'mystery begins', 'action opens'],
      'Inciting Incident': ['discovers', 'learns', 'disrupts', 'changes everything', 'call to'],
      'First Plot Point': ['commits', 'decides', 'no turning back', 'crosses', 'accepts'],
      'Midpoint Twist': ['twist', 'revelation', 'discovers truth', 'everything changes', 'reversal'],
      'Dark Moment / All Is Lost': ['all is lost', 'lowest point', 'despair', 'hopeless', 'fails'],
      'Climax': ['final', 'confronts', 'battle', 'showdown', 'ultimate'],
      'Resolution': ['aftermath', 'new normal', 'peace', 'resolved', 'epilogue'],
    };

    const keywords = beatKeywords[beat.name];
    if (!keywords) return null;

    for (const { chapter, percentage } of chapters) {
      const summary = (chapter.summary || '').toLowerCase();
      if (keywords.some(kw => summary.includes(kw))) {
        const withinTolerance = percentage >= beat.toleranceMin && percentage <= beat.toleranceMax;
        return {
          beatName: beat.name,
          found: true,
          foundAtPercentage: percentage,
          expectedPercentage: beat.idealPercentage,
          toleranceMin: beat.toleranceMin,
          toleranceMax: beat.toleranceMax,
          withinTolerance,
          importance: beat.importance,
          chapterNumber: chapter.number,
          issue: withinTolerance ? null : this.generateBeatIssue(beat, percentage),
          recommendation: withinTolerance ? null : this.generateBeatRecommendation(beat, percentage),
        };
      }
    }

    return null;
  }

  /**
   * Find the chapter number for a given percentage
   */
  private findChapterForPercentage(
    percentage: number,
    chapters: Array<{ chapter: ChapterOutline; percentage: number }>
  ): number | null {
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].percentage >= percentage) {
        return chapters[i].chapter.number;
      }
    }
    return chapters.length > 0 ? chapters[chapters.length - 1].chapter.number : null;
  }

  /**
   * Generate issue description for a misplaced beat
   */
  private generateBeatIssue(beat: CommercialBeat, foundPercentage: number): string {
    if (foundPercentage < beat.toleranceMin) {
      return `${beat.name} occurs too early (${foundPercentage.toFixed(1)}% vs. ideal ${beat.idealPercentage}%)`;
    } else {
      return `${beat.name} occurs too late (${foundPercentage.toFixed(1)}% vs. ideal ${beat.idealPercentage}%)`;
    }
  }

  /**
   * Generate recommendation for fixing a misplaced beat
   */
  private generateBeatRecommendation(beat: CommercialBeat, foundPercentage: number): string {
    const direction = foundPercentage < beat.toleranceMin ? 'later' : 'earlier';
    return `Move ${beat.name} ${direction} to around ${beat.idealPercentage}% of the story. ${beat.readerExpectation}`;
  }

  /**
   * Analyse pacing across the structure
   */
  private analysePacing(
    structure: StoryStructure,
    chapters: Array<{ chapter: ChapterOutline; actNumber: number; cumulativeWordCount: number; percentage: number }>,
    genreExpectations: GenreCommercialExpectations | null
  ): PacingAnalysis {
    const totalWordCount = this.calculateTotalWordCount(structure);
    const actBalance: ActBalanceResult[] = [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Ideal act percentages for three-act structure
    const idealActPercentages: Record<number, number> = {
      1: 25,
      2: 50,
      3: 25,
    };

    for (const act of structure.acts) {
      const actWordCount = act.chapters.reduce((sum, ch) => sum + ch.wordCountTarget, 0);
      const actualPercentage = totalWordCount > 0 ? (actWordCount / totalWordCount) * 100 : 0;
      const idealPercentage = idealActPercentages[act.number] || 25;

      let status: 'under' | 'balanced' | 'over' = 'balanced';
      const tolerance = 5;

      if (actualPercentage < idealPercentage - tolerance) {
        status = 'under';
        issues.push(`Act ${act.number} (${act.name}) is too short at ${actualPercentage.toFixed(1)}%`);
      } else if (actualPercentage > idealPercentage + tolerance) {
        status = 'over';
        issues.push(`Act ${act.number} (${act.name}) is too long at ${actualPercentage.toFixed(1)}%`);
      }

      actBalance.push({
        actNumber: act.number,
        actName: act.name,
        actualPercentage,
        idealPercentage,
        chapterCount: act.chapters.length,
        wordCountTarget: actWordCount,
        status,
      });
    }

    // Determine overall pacing
    let overall: 'too_slow' | 'well_paced' | 'too_fast' | 'uneven' = 'well_paced';
    const actOneResult = actBalance.find(a => a.actNumber === 1);
    const actTwoResult = actBalance.find(a => a.actNumber === 2);

    if (actOneResult && actOneResult.status === 'over') {
      overall = 'too_slow';
      suggestions.push('Consider tightening Act I to get to the main conflict faster');
    }
    if (actTwoResult && actTwoResult.status === 'under') {
      overall = 'too_fast';
      suggestions.push('Act II needs more development - consider adding complications or subplots');
    }
    if (issues.length > 2) {
      overall = 'uneven';
      suggestions.push('Review overall story balance - multiple acts are out of proportion');
    }

    // Add genre-specific suggestions
    if (genreExpectations) {
      suggestions.push(`For ${genreExpectations.genre}: ${genreExpectations.pacingExpectations}`);
    }

    return {
      overall,
      actBalance,
      issues,
      suggestions,
    };
  }

  /**
   * Analyse word counts for chapters
   */
  private analyseWordCounts(
    structure: StoryStructure,
    chapters: Array<{ chapter: ChapterOutline; actNumber: number; cumulativeWordCount: number; percentage: number }>,
    targetWordCount: number,
    genreExpectations: GenreCommercialExpectations | null
  ): WordCountAnalysis {
    const totalWordCount = this.calculateTotalWordCount(structure);
    const chapterCount = chapters.length;
    const averageChapterWordCount = chapterCount > 0 ? totalWordCount / chapterCount : 0;

    // Get acceptable chapter word count range
    const minChapterWords = genreExpectations?.chapterWordCount?.min || 1800;
    const maxChapterWords = genreExpectations?.chapterWordCount?.max || 3500;

    const chaptersOutOfTolerance: ChapterWordCountIssue[] = [];

    for (const { chapter } of chapters) {
      if (chapter.wordCountTarget < minChapterWords) {
        chaptersOutOfTolerance.push({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          targetWordCount: chapter.wordCountTarget,
          issue: 'too_short',
          recommendation: `Increase Chapter ${chapter.number} to at least ${minChapterWords} words`,
        });
      } else if (chapter.wordCountTarget > maxChapterWords) {
        chaptersOutOfTolerance.push({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          targetWordCount: chapter.wordCountTarget,
          issue: 'too_long',
          recommendation: `Consider splitting Chapter ${chapter.number} or reducing to ${maxChapterWords} words`,
        });
      }
    }

    return {
      totalWordCount,
      targetWordCount,
      chapterCount,
      averageChapterWordCount,
      chaptersOutOfTolerance,
      isBalanced: chaptersOutOfTolerance.length === 0,
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(
    beatResults: BeatValidationResult[],
    pacingAnalysis: PacingAnalysis,
    wordCountAnalysis: WordCountAnalysis
  ): number {
    let score = 100;

    // Deduct for beat issues
    for (const result of beatResults) {
      if (!result.found) {
        score -= result.importance === 'critical' ? 15 : result.importance === 'important' ? 8 : 3;
      } else if (!result.withinTolerance) {
        score -= result.importance === 'critical' ? 10 : result.importance === 'important' ? 5 : 2;
      }
    }

    // Deduct for pacing issues
    if (pacingAnalysis.overall !== 'well_paced') {
      score -= 10;
    }
    score -= pacingAnalysis.issues.length * 3;

    // Deduct for word count issues
    if (!wordCountAnalysis.isBalanced) {
      score -= wordCountAnalysis.chaptersOutOfTolerance.length * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    beatResults: BeatValidationResult[],
    pacingAnalysis: PacingAnalysis,
    wordCountAnalysis: WordCountAnalysis,
    genreExpectations: GenreCommercialExpectations | null
  ): string[] {
    const recommendations: string[] = [];

    // Add beat recommendations (critical first)
    const criticalBeatIssues = beatResults.filter(r => r.recommendation && r.importance === 'critical');
    const importantBeatIssues = beatResults.filter(r => r.recommendation && r.importance === 'important');

    for (const issue of criticalBeatIssues.slice(0, 3)) {
      if (issue.recommendation) {
        recommendations.push(`[CRITICAL] ${issue.recommendation}`);
      }
    }

    for (const issue of importantBeatIssues.slice(0, 2)) {
      if (issue.recommendation) {
        recommendations.push(`[IMPORTANT] ${issue.recommendation}`);
      }
    }

    // Add pacing recommendations
    for (const suggestion of pacingAnalysis.suggestions.slice(0, 2)) {
      recommendations.push(suggestion);
    }

    // Add word count recommendations
    if (wordCountAnalysis.chaptersOutOfTolerance.length > 0) {
      recommendations.push(
        `Review chapter lengths: ${wordCountAnalysis.chaptersOutOfTolerance.length} chapters are outside ideal range`
      );
    }

    // Add genre-specific recommendation
    if (genreExpectations) {
      const typicalRange = genreExpectations.typicalWordCount;
      if (wordCountAnalysis.totalWordCount < typicalRange.min) {
        recommendations.push(
          `${genreExpectations.genre} novels typically range from ${typicalRange.min.toLocaleString()} to ${typicalRange.max.toLocaleString()} words. Consider expanding.`
        );
      } else if (wordCountAnalysis.totalWordCount > typicalRange.max) {
        recommendations.push(
          `${genreExpectations.genre} novels typically range from ${typicalRange.min.toLocaleString()} to ${typicalRange.max.toLocaleString()} words. Consider tightening.`
        );
      }
    }

    return recommendations.slice(0, 8); // Maximum 8 recommendations
  }

  /**
   * Generate a chapter brief with commercial beat context
   */
  generateChapterBrief(
    chapter: ChapterOutline,
    structure: StoryStructure,
    chapterPercentage: number,
    genre?: string
  ): ChapterBrief {
    const genreExpectations = genre ? this.getGenreExpectations(genre) : null;

    // Find which commercial beats this chapter should address
    const relevantBeats = COMMERCIAL_BEATS.filter(beat => {
      return chapterPercentage >= beat.toleranceMin && chapterPercentage <= beat.toleranceMax;
    });

    // Add genre-specific beats
    if (genreExpectations?.customBeats) {
      const genreBeats = genreExpectations.customBeats.filter(beat => {
        return chapterPercentage >= beat.toleranceMin && chapterPercentage <= beat.toleranceMax;
      });
      relevantBeats.push(...genreBeats);
    }

    // Determine pacing guidance
    let pacingGuidance: 'slow' | 'medium' | 'fast';
    if (chapterPercentage < 25) {
      pacingGuidance = 'medium'; // Setup - establish but keep moving
    } else if (chapterPercentage >= 25 && chapterPercentage < 75) {
      pacingGuidance = 'fast'; // Rising action and complications
    } else if (chapterPercentage >= 75 && chapterPercentage < 90) {
      pacingGuidance = 'fast'; // Dark moment and climax approach
    } else {
      pacingGuidance = 'medium'; // Resolution - allow breathing room
    }

    // Adjust pacing for specific beats
    if (relevantBeats.some(b => b.name === 'Dark Moment / All Is Lost')) {
      pacingGuidance = 'slow'; // Let the despair breathe
    }
    if (relevantBeats.some(b => b.name === 'Climax')) {
      pacingGuidance = 'fast'; // Keep climax intense
    }

    return {
      chapterNumber: chapter.number,
      title: chapter.title,
      summary: chapter.summary,
      wordCountTarget: chapter.wordCountTarget,
      wordCountMin: Math.round(chapter.wordCountTarget * 0.9),
      wordCountMax: Math.round(chapter.wordCountTarget * 1.1),
      storyPercentage: chapterPercentage,
      commercialBeats: relevantBeats.map(b => ({
        name: b.name,
        description: b.description,
        readerExpectation: b.readerExpectation,
      })),
      pacingGuidance,
      toneNotes: this.getToneNotes(chapterPercentage, relevantBeats),
      sceneRequirements: chapter.scenes.map(s => ({
        goal: s.goal,
        conflict: s.conflict,
        outcome: s.outcome,
        emotionalBeat: s.emotionalBeat,
      })),
      genreNotes: genreExpectations ? genreExpectations.pacingExpectations : undefined,
    };
  }

  /**
   * Get tone notes based on story percentage and beats
   */
  private getToneNotes(percentage: number, beats: CommercialBeat[]): string[] {
    const notes: string[] = [];

    if (percentage < 15) {
      notes.push('Establish character voice and world atmosphere');
      notes.push('Hook the reader with intrigue or action');
    }

    if (beats.some(b => b.name === 'Inciting Incident')) {
      notes.push('This is a pivotal moment - make the disruption feel significant');
    }

    if (beats.some(b => b.name === 'Midpoint Twist')) {
      notes.push('Subvert expectations - this revelation should recontextualise everything');
    }

    if (beats.some(b => b.name === 'Dark Moment / All Is Lost')) {
      notes.push('Allow emotional weight - the reader should feel the despair');
      notes.push('Avoid rushing through the low point');
    }

    if (beats.some(b => b.name === 'Climax')) {
      notes.push('Maximum tension and stakes');
      notes.push('Every word should drive toward resolution');
    }

    if (percentage > 95) {
      notes.push('Provide satisfying closure without overstaying');
      notes.push('Echo the opening for thematic resonance');
    }

    return notes;
  }
}

// ============================================================================
// Chapter Brief Interface
// ============================================================================

export interface ChapterBrief {
  chapterNumber: number;
  title: string;
  summary: string;
  wordCountTarget: number;
  wordCountMin: number;
  wordCountMax: number;
  storyPercentage: number;
  commercialBeats: Array<{
    name: string;
    description: string;
    readerExpectation: string;
  }>;
  pacingGuidance: 'slow' | 'medium' | 'fast';
  toneNotes: string[];
  sceneRequirements: Array<{
    goal: string;
    conflict: string;
    outcome: string;
    emotionalBeat: string;
  }>;
  genreNotes?: string;
}

// Export singleton instance
export const commercialBeatValidatorService = new CommercialBeatValidatorService();
