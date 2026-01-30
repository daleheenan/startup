/**
 * Unified Analysis Service
 *
 * Orchestrates all manuscript analysis capabilities into a cohesive system:
 * - Prose quality analysis (ProWritingAid-style reports)
 * - Bestseller formula validation (opening hooks, tension arcs, character arcs)
 * - Genre convention validation
 * - Genre-specific commercial analysis (Romance/Thriller/Sci-Fi)
 * - Publishing readiness assessment
 *
 * Features:
 * - Single entry point for comprehensive analysis
 * - Intelligent caching by content hash
 * - Parallel execution of independent analyses
 * - Version-aware analysis
 * - Genre-adaptive analysis selection
 */

import crypto from 'crypto';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { cache } from './cache.service.js';

// Prose analysis services
import {
  ReadabilityService,
  SentenceVarietyService,
  PassiveVoiceService,
  AdverbsService,
  type ReadabilityReport,
  type SentenceVarietyReport,
  type PassiveVoiceReport,
  type AdverbsReport
} from './prose-reports/index.js';

// Bestseller formula validators
import {
  OpeningHookValidatorService,
  type OpeningHookResult
} from './opening-hook-validator.service.js';
import {
  TensionArcValidatorService,
  type TensionArcResult
} from './tension-arc-validator.service.js';
import {
  CharacterArcValidatorService,
  type CharacterArcResult
} from './character-arc-validator.service.js';

// Genre services
import { genreConventionsService } from './genre-conventions.service.js';

// Genre-specific commercial services
import { RomanceCommercialService } from './romance-commercial.service.js';
import { ThrillerCommercialService } from './thriller-commercial.service.js';
import { SciFiCommercialService } from './scifi-commercial.service.js';

const logger = createLogger('services:unified-analysis');

// ============================================================================
// Type Definitions
// ============================================================================

export type AnalysisType =
  // Prose quality
  | 'readability'
  | 'sentence-variety'
  | 'passive-voice'
  | 'adverbs'
  | 'prose-full'  // All prose analyses

  // Bestseller formula
  | 'opening-hook'
  | 'tension-arc'
  | 'character-arc'
  | 'bestseller-full'  // All bestseller validations

  // Genre conventions
  | 'genre-conventions'
  | 'genre-tropes'
  | 'romance-beats'      // Romance-specific
  | 'thriller-pacing'    // Thriller-specific
  | 'scifi-consistency'  // Sci-Fi-specific

  // Publishing
  | 'publishing-readiness'

  // Comprehensive
  | 'comprehensive';  // Everything applicable to the genre

export interface AnalysisOptions {
  forceRefresh?: boolean;
  includeChapterBreakdown?: boolean;
  detailLevel?: 'minimal' | 'standard' | 'detailed';
}

export interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'prose' | 'structure' | 'genre' | 'character';
  description: string;
  location?: string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface UnifiedAnalysisReport {
  // Metadata
  bookId: string;
  projectId: string;
  bookTitle: string;
  genre: string;
  analysisTimestamp: string;
  versionId: string | null;
  contentHash: string;

  // Overall scoring
  overallScore: number;  // 0-100
  scoreBreakdown: {
    prose: number;
    bestseller: number;
    genreConventions: number;
  };

  // Prose quality results
  prose?: {
    readability: ReadabilityReport;
    sentenceVariety: SentenceVarietyReport;
    passiveVoice: PassiveVoiceReport;
    adverbs: AdverbsReport;
  };

  // Bestseller formula results
  bestseller?: {
    openingHook: OpeningHookResult;
    tensionArc: TensionArcResult;
    characterArc: CharacterArcResult;
  };

  // Genre-specific results
  genreAnalysis?: {
    conventions: any;
    tropes?: any;
    commercialBeats?: any;
  };

  // Publishing readiness
  publishing?: {
    queryLetterReady: boolean;
    synopsisReady: boolean;
    recommendedActions: string[];
  };

  // Aggregated insights
  topIssues: Issue[];
  quickWins: Recommendation[];
  warnings: string[];
  recommendations: string[];

  // Execution metadata
  executionTimeMs: number;
  cachedResults: string[];
  freshResults: string[];
}

interface BookMetadata {
  bookId: string;
  projectId: string;
  bookTitle: string;
  genre: string;
  versionId: string | null;
  chapterCount: number;
  fullText: string;
  contentHash: string;
}

// ============================================================================
// Unified Analysis Service
// ============================================================================

export class UnifiedAnalysisService {
  private openingHookValidator: OpeningHookValidatorService;
  private tensionArcValidator: TensionArcValidatorService;
  private characterArcValidator: CharacterArcValidatorService;
  private romanceService: RomanceCommercialService;
  private thrillerService: ThrillerCommercialService;
  private sciFiService: SciFiCommercialService;

  constructor() {
    this.openingHookValidator = new OpeningHookValidatorService();
    this.tensionArcValidator = new TensionArcValidatorService();
    this.characterArcValidator = new CharacterArcValidatorService();
    this.romanceService = new RomanceCommercialService();
    this.thrillerService = new ThrillerCommercialService();
    this.sciFiService = new SciFiCommercialService();
  }

  /**
   * Run comprehensive analysis on a book
   */
  async analyse(
    bookId: string,
    analysisTypes: AnalysisType[],
    options: AnalysisOptions = {}
  ): Promise<UnifiedAnalysisReport> {
    const startTime = Date.now();
    logger.info({ bookId, analysisTypes, options }, '[UnifiedAnalysis] Starting analysis');

    // Fetch book metadata and content
    const metadata = await this.fetchBookMetadata(bookId);

    // Determine which analyses to run
    const expandedTypes = this.expandAnalysisTypes(analysisTypes, metadata.genre);

    // Check cache
    const cachedResults: string[] = [];
    const freshResults: string[] = [];

    // Run analyses
    const results = await this.executeAnalyses(
      metadata,
      expandedTypes,
      options,
      cachedResults,
      freshResults
    );

    // Aggregate into unified report
    const report = this.aggregateReport(
      metadata,
      results,
      cachedResults,
      freshResults,
      Date.now() - startTime
    );

    logger.info(
      { bookId, executionTimeMs: report.executionTimeMs, cachedCount: cachedResults.length },
      '[UnifiedAnalysis] Analysis complete'
    );

    return report;
  }

  /**
   * Get cached analysis status
   */
  async getAnalysisStatus(bookId: string): Promise<{
    bookId: string;
    hasCache: boolean;
    lastAnalysis: string | null;
    contentChanged: boolean;
    availableAnalyses: string[];
    staleAnalyses: string[];
  }> {
    const metadata = await this.fetchBookMetadata(bookId);

    // Check for cached comprehensive analysis
    const cacheKey = this.getCacheKey(bookId, 'comprehensive', metadata.contentHash);
    const cached = cache.get(cacheKey);

    const availableAnalyses: string[] = [];
    const staleAnalyses: string[] = [];

    // Check each analysis type
    const allTypes: AnalysisType[] = [
      'prose-full',
      'bestseller-full',
      'genre-conventions'
    ];

    for (const type of allTypes) {
      const typeKey = this.getCacheKey(bookId, type, metadata.contentHash);
      if (cache.get(typeKey)) {
        availableAnalyses.push(type);
      } else {
        staleAnalyses.push(type);
      }
    }

    return {
      bookId,
      hasCache: !!cached,
      lastAnalysis: cached ? (cached as any).analysisTimestamp : null,
      contentChanged: false, // Content hash matches if we got here
      availableAnalyses,
      staleAnalyses
    };
  }

  /**
   * Invalidate all cached analyses for a book
   */
  invalidateCache(bookId: string): void {
    logger.info({ bookId }, '[UnifiedAnalysis] Invalidating cache');

    // Clear all possible cache keys for this book
    const allTypes: AnalysisType[] = [
      'readability',
      'sentence-variety',
      'passive-voice',
      'adverbs',
      'prose-full',
      'opening-hook',
      'tension-arc',
      'character-arc',
      'bestseller-full',
      'genre-conventions',
      'romance-beats',
      'thriller-pacing',
      'scifi-consistency',
      'comprehensive'
    ];

    // Invalidate all analysis caches for this book using pattern matching
    cache.invalidate(`analysis:${bookId}:`);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Fetch book metadata and content
   */
  private async fetchBookMetadata(bookId: string): Promise<BookMetadata> {
    // Get book details
    const bookStmt = db.prepare(`
      SELECT b.id as bookId, b.project_id as projectId, b.title as bookTitle,
             b.genre, b.active_version_id as versionId
      FROM books b
      WHERE b.id = ?
    `);

    const book = bookStmt.get(bookId) as any;

    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // Get all chapter content (version-aware)
    const chaptersStmt = db.prepare(`
      SELECT c.id, c.content, c.chapter_number, c.version_id
      FROM chapters c
      WHERE c.book_id = ?
        AND c.content IS NOT NULL
        AND (
          c.version_id IS NULL
          OR c.version_id IN (
            SELECT bv.id FROM book_versions bv
            WHERE bv.book_id = c.book_id AND bv.is_active = 1
          )
        )
      ORDER BY c.chapter_number ASC
    `);

    const chapters = chaptersStmt.all(bookId) as any[];

    // Combine all content
    const fullText = chapters.map(c => c.content || '').join('\n\n');

    // Generate content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(fullText)
      .digest('hex')
      .substring(0, 16);

    return {
      bookId: book.bookId,
      projectId: book.projectId,
      bookTitle: book.bookTitle,
      genre: book.genre || 'General Fiction',
      versionId: book.versionId,
      chapterCount: chapters.length,
      fullText,
      contentHash
    };
  }

  /**
   * Expand analysis types (e.g., 'prose-full' -> individual prose analyses)
   */
  private expandAnalysisTypes(types: AnalysisType[], genre: string): Set<AnalysisType> {
    const expanded = new Set<AnalysisType>();

    for (const type of types) {
      switch (type) {
        case 'prose-full':
          expanded.add('readability');
          expanded.add('sentence-variety');
          expanded.add('passive-voice');
          expanded.add('adverbs');
          break;

        case 'bestseller-full':
          expanded.add('opening-hook');
          expanded.add('tension-arc');
          expanded.add('character-arc');
          break;

        case 'comprehensive':
          // Add all prose
          expanded.add('readability');
          expanded.add('sentence-variety');
          expanded.add('passive-voice');
          expanded.add('adverbs');

          // Add all bestseller
          expanded.add('opening-hook');
          expanded.add('tension-arc');
          expanded.add('character-arc');

          // Add genre conventions
          expanded.add('genre-conventions');

          // Add genre-specific based on genre
          if (genre.toLowerCase().includes('romance')) {
            expanded.add('romance-beats');
          }
          if (genre.toLowerCase().includes('thriller') || genre.toLowerCase().includes('mystery')) {
            expanded.add('thriller-pacing');
          }
          if (genre.toLowerCase().includes('sci-fi') || genre.toLowerCase().includes('science fiction')) {
            expanded.add('scifi-consistency');
          }
          break;

        default:
          expanded.add(type);
      }
    }

    return expanded;
  }

  /**
   * Execute all requested analyses
   */
  private async executeAnalyses(
    metadata: BookMetadata,
    analysisTypes: Set<AnalysisType>,
    options: AnalysisOptions,
    cachedResults: string[],
    freshResults: string[]
  ): Promise<any> {
    const results: any = {};

    // Batch 1: Prose analyses (fast, text-based, no AI)
    const prosePromises: Promise<any>[] = [];

    if (analysisTypes.has('readability')) {
      prosePromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'readability',
          metadata.contentHash,
          () => Promise.resolve(ReadabilityService.generateReport(metadata.fullText)),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.readability = result; })
      );
    }

    if (analysisTypes.has('sentence-variety')) {
      prosePromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'sentence-variety',
          metadata.contentHash,
          () => Promise.resolve(SentenceVarietyService.generateReport(metadata.fullText)),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.sentenceVariety = result; })
      );
    }

    if (analysisTypes.has('passive-voice')) {
      prosePromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'passive-voice',
          metadata.contentHash,
          () => Promise.resolve(PassiveVoiceService.generateReport(metadata.fullText)),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.passiveVoice = result; })
      );
    }

    if (analysisTypes.has('adverbs')) {
      prosePromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'adverbs',
          metadata.contentHash,
          () => Promise.resolve(AdverbsService.generateReport(metadata.fullText)),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.adverbs = result; })
      );
    }

    // Execute all prose analyses in parallel
    await Promise.all(prosePromises);

    // Batch 2: Bestseller formula analyses (AI-based, heavier)
    const bestsellerPromises: Promise<any>[] = [];

    if (analysisTypes.has('opening-hook')) {
      bestsellerPromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'opening-hook',
          metadata.contentHash,
          () => this.openingHookValidator.analyseOpeningHook(metadata.bookId),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.openingHook = result; })
      );
    }

    if (analysisTypes.has('character-arc')) {
      bestsellerPromises.push(
        this.getCachedOrRun(
          metadata.bookId,
          'character-arc',
          metadata.contentHash,
          () => this.characterArcValidator.analyseCharacterArc(metadata.bookId),
          options.forceRefresh,
          cachedResults,
          freshResults
        ).then(result => { results.characterArc = result; })
      );
    }

    await Promise.all(bestsellerPromises);

    // Batch 3: Heavy analyses (sequential to avoid rate limits)
    if (analysisTypes.has('tension-arc')) {
      results.tensionArc = await this.getCachedOrRun(
        metadata.bookId,
        'tension-arc',
        metadata.contentHash,
        () => this.tensionArcValidator.analyseTensionArc(metadata.bookId),
        options.forceRefresh,
        cachedResults,
        freshResults
      );
    }

    if (analysisTypes.has('genre-conventions')) {
      results.genreConventions = await this.getCachedOrRun(
        metadata.bookId,
        'genre-conventions',
        metadata.contentHash,
        () => this.analyseGenreConventions(metadata),
        options.forceRefresh,
        cachedResults,
        freshResults
      );
    }

    // Genre-specific analyses
    if (analysisTypes.has('romance-beats')) {
      results.romanceBeats = await this.getCachedOrRun(
        metadata.bookId,
        'romance-beats',
        metadata.contentHash,
        () => Promise.resolve(this.romanceService.validateBeats(metadata.projectId, metadata.chapterCount)),
        options.forceRefresh,
        cachedResults,
        freshResults
      );
    }

    if (analysisTypes.has('thriller-pacing')) {
      results.thrillerPacing = await this.getCachedOrRun(
        metadata.bookId,
        'thriller-pacing',
        metadata.contentHash,
        () => Promise.resolve(this.thrillerService.validatePacing(metadata.projectId, metadata.chapterCount)),
        options.forceRefresh,
        cachedResults,
        freshResults
      );
    }

    if (analysisTypes.has('scifi-consistency')) {
      results.sciFiConsistency = await this.getCachedOrRun(
        metadata.bookId,
        'scifi-consistency',
        metadata.contentHash,
        () => Promise.resolve(this.sciFiService.validateConsistency(metadata.projectId)),
        options.forceRefresh,
        cachedResults,
        freshResults
      );
    }

    return results;
  }

  /**
   * Get cached result or run analysis
   */
  private async getCachedOrRun<T>(
    bookId: string,
    analysisType: string,
    contentHash: string,
    runFn: () => Promise<T>,
    forceRefresh: boolean | undefined,
    cachedResults: string[],
    freshResults: string[]
  ): Promise<T> {
    const cacheKey = this.getCacheKey(bookId, analysisType, contentHash);

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.info({ bookId, analysisType }, '[UnifiedAnalysis] Cache hit');
        cachedResults.push(analysisType);
        return cached as T;
      }
    }

    logger.info({ bookId, analysisType }, '[UnifiedAnalysis] Running fresh analysis');
    const result = await runFn();

    // Cache with appropriate TTL
    const ttl = this.getCacheTTL(analysisType);
    cache.set(cacheKey, result, ttl);

    freshResults.push(analysisType);
    return result;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(bookId: string, analysisType: string, contentHash: string): string {
    return `analysis:${bookId}:${analysisType}:${contentHash}`;
  }

  /**
   * Get cache TTL for analysis type (in seconds)
   */
  private getCacheTTL(analysisType: string): number {
    // Prose analyses: 7 days (deterministic)
    if (['readability', 'sentence-variety', 'passive-voice', 'adverbs'].includes(analysisType)) {
      return 7 * 24 * 60 * 60;
    }

    // Bestseller/genre analyses: 3 days (AI-based, may improve)
    return 3 * 24 * 60 * 60;
  }

  /**
   * Analyse genre conventions (wrapper for existing service)
   */
  private async analyseGenreConventions(metadata: BookMetadata): Promise<any> {
    // Generate a basic outline from chapter titles for validation
    const chaptersStmt = db.prepare(`
      SELECT title, chapter_number
      FROM chapters
      WHERE book_id = ?
      ORDER BY chapter_number ASC
    `);

    const chapters = chaptersStmt.all(metadata.bookId) as any[];
    const outline = chapters.map(c => `Chapter ${c.chapter_number}: ${c.title || 'Untitled'}`).join('\n');

    return genreConventionsService.validateOutline(metadata.genre, outline);
  }

  /**
   * Aggregate all results into unified report
   */
  private aggregateReport(
    metadata: BookMetadata,
    results: any,
    cachedResults: string[],
    freshResults: string[],
    executionTimeMs: number
  ): UnifiedAnalysisReport {
    // Calculate scores
    const scores = this.calculateScores(results);

    // Extract issues and recommendations
    const { topIssues, quickWins, warnings, recommendations } = this.extractInsights(results);

    return {
      // Metadata
      bookId: metadata.bookId,
      projectId: metadata.projectId,
      bookTitle: metadata.bookTitle,
      genre: metadata.genre,
      analysisTimestamp: new Date().toISOString(),
      versionId: metadata.versionId,
      contentHash: metadata.contentHash,

      // Overall scoring
      overallScore: scores.overall,
      scoreBreakdown: {
        prose: scores.prose,
        bestseller: scores.bestseller,
        genreConventions: scores.genre
      },

      // Prose quality results
      prose: results.readability || results.sentenceVariety || results.passiveVoice || results.adverbs
        ? {
            readability: results.readability,
            sentenceVariety: results.sentenceVariety,
            passiveVoice: results.passiveVoice,
            adverbs: results.adverbs
          }
        : undefined,

      // Bestseller formula results
      bestseller: results.openingHook || results.tensionArc || results.characterArc
        ? {
            openingHook: results.openingHook,
            tensionArc: results.tensionArc,
            characterArc: results.characterArc
          }
        : undefined,

      // Genre-specific results
      genreAnalysis: results.genreConventions || results.romanceBeats || results.thrillerPacing || results.sciFiConsistency
        ? {
            conventions: results.genreConventions,
            tropes: undefined, // TODO: Add when implemented
            commercialBeats: results.romanceBeats || results.thrillerPacing || results.sciFiConsistency
          }
        : undefined,

      // Publishing readiness (placeholder for future implementation)
      publishing: undefined,

      // Aggregated insights
      topIssues,
      quickWins,
      warnings,
      recommendations,

      // Execution metadata
      executionTimeMs,
      cachedResults,
      freshResults
    };
  }

  /**
   * Calculate overall and category scores
   */
  private calculateScores(results: any): {
    overall: number;
    prose: number;
    bestseller: number;
    genre: number;
  } {
    const scores: number[] = [];

    // Prose score (0-100)
    let proseScore = 0;
    let proseCount = 0;

    if (results.readability) {
      // Readability: Convert grade level to score (lower is better for fiction)
      // Grade 6-8 ideal (90-100), 9-10 good (80-89), 11-12 acceptable (70-79)
      const gradeLevel = results.readability.gradeLevel || 12;
      if (gradeLevel <= 8) proseScore += 100;
      else if (gradeLevel <= 10) proseScore += 90 - ((gradeLevel - 8) * 5);
      else proseScore += 80 - ((gradeLevel - 10) * 5);
      proseCount++;
    }

    if (results.sentenceVariety) {
      // Variety score based on diversity
      proseScore += results.sentenceVariety.diversityScore || 75;
      proseCount++;
    }

    if (results.passiveVoice) {
      // Passive voice: <5% is excellent (100), 5-10% good (80), >10% needs work (60)
      const passivePercentage = results.passiveVoice.passivePercentage || 0;
      if (passivePercentage < 5) proseScore += 100;
      else if (passivePercentage < 10) proseScore += 90 - (passivePercentage - 5);
      else proseScore += Math.max(60, 90 - passivePercentage);
      proseCount++;
    }

    if (results.adverbs) {
      // Adverbs: <3% excellent (100), 3-5% good (80), >5% needs work (60)
      const adverbPercentage = results.adverbs.adverbPercentage || 0;
      if (adverbPercentage < 3) proseScore += 100;
      else if (adverbPercentage < 5) proseScore += 90 - ((adverbPercentage - 3) * 5);
      else proseScore += Math.max(60, 80 - ((adverbPercentage - 5) * 4));
      proseCount++;
    }

    const finalProseScore = proseCount > 0 ? Math.round(proseScore / proseCount) : 0;
    if (proseCount > 0) scores.push(finalProseScore);

    // Bestseller score (0-100)
    let bestsellerScore = 0;
    let bestsellerCount = 0;

    if (results.openingHook) {
      bestsellerScore += (results.openingHook.score || 5) * 10; // Convert 1-10 to 0-100
      bestsellerCount++;
    }

    if (results.tensionArc) {
      bestsellerScore += (results.tensionArc.overallArcScore || 5) * 10;
      bestsellerCount++;
    }

    if (results.characterArc && results.characterArc.characters.length > 0) {
      const avgCompleteness = results.characterArc.characters.reduce(
        (sum: number, char: any) => sum + char.arcCompleteness,
        0
      ) / results.characterArc.characters.length;
      bestsellerScore += avgCompleteness * 10; // Convert 0-10 to 0-100
      bestsellerCount++;
    }

    const finalBestsellerScore = bestsellerCount > 0 ? Math.round(bestsellerScore / bestsellerCount) : 0;
    if (bestsellerCount > 0) scores.push(finalBestsellerScore);

    // Genre score (0-100)
    let genreScore = 0;
    if (results.genreConventions) {
      const validation = results.genreConventions;
      const totalConventions = validation.results?.length || 1;
      const metConventions = validation.results?.filter((r: any) => r.present).length || 0;
      genreScore = Math.round((metConventions / totalConventions) * 100);
      scores.push(genreScore);
    }

    // Overall score
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      overall: overallScore,
      prose: finalProseScore,
      bestseller: finalBestsellerScore,
      genre: genreScore
    };
  }

  /**
   * Extract top issues and recommendations
   */
  private extractInsights(results: any): {
    topIssues: Issue[];
    quickWins: Recommendation[];
    warnings: string[];
    recommendations: string[];
  } {
    const issues: Issue[] = [];
    const quickWins: Recommendation[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Extract from opening hook
    if (results.openingHook) {
      if (results.openingHook.score < 6) {
        issues.push({
          severity: 'high',
          category: 'structure',
          description: 'Weak opening hook',
          location: 'Chapter 1, Opening',
          recommendation: results.openingHook.recommendation,
          effort: 'medium',
          impact: 'high'
        });
      }

      results.openingHook.weakOpeners?.forEach((opener: any) => {
        issues.push({
          severity: 'medium',
          category: 'prose',
          description: `Weak opener detected: ${opener.type}`,
          location: opener.location,
          recommendation: opener.suggestion,
          effort: 'low',
          impact: 'medium'
        });
      });
    }

    // Extract from tension arc
    if (results.tensionArc?.plateaus?.length > 0) {
      results.tensionArc.plateaus.forEach((plateau: any) => {
        issues.push({
          severity: 'medium',
          category: 'structure',
          description: `Tension plateau detected (Chapters ${plateau.startChapter}-${plateau.endChapter})`,
          location: `Chapters ${plateau.startChapter}-${plateau.endChapter}`,
          recommendation: plateau.recommendation,
          effort: 'medium',
          impact: 'high'
        });
      });
    }

    // Extract from prose analyses
    if (results.passiveVoice?.passiveInstances?.length > 0) {
      const topPassive = results.passiveVoice.passiveInstances.slice(0, 3);
      topPassive.forEach((instance: any) => {
        quickWins.push({
          title: 'Convert passive to active voice',
          description: instance.suggestion,
          effort: 'low',
          impact: 'medium',
          category: 'prose'
        });
      });
    }

    if (results.adverbs?.weakAdverbs?.length > 0) {
      quickWins.push({
        title: 'Eliminate weak adverbs',
        description: `Replace ${results.adverbs.weakAdverbs.length} weak adverbs with stronger verbs`,
        effort: 'low',
        impact: 'medium',
        category: 'prose'
      });
    }

    // Extract from genre conventions
    if (results.genreConventions?.results) {
      results.genreConventions.results.forEach((result: any) => {
        if (!result.present) {
          issues.push({
            severity: 'high',
            category: 'genre',
            description: `Missing genre convention: ${result.convention}`,
            recommendation: result.recommendation || `Add ${result.convention} to meet genre expectations`,
            effort: 'high',
            impact: 'high'
          });
        }
      });
    }

    // Sort issues by severity and impact
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const impactOrder = { high: 0, medium: 1, low: 2 };

      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      return impactOrder[a.impact] - impactOrder[b.impact];
    });

    // Extract top 10 issues
    const topIssues = issues.slice(0, 10);

    // Extract quick wins (low effort, medium/high impact)
    const quickWinCandidates = issues.filter(
      i => i.effort === 'low' && (i.impact === 'medium' || i.impact === 'high')
    ).slice(0, 5);

    return {
      topIssues,
      quickWins: [...quickWins, ...quickWinCandidates.map(i => ({
        title: i.description,
        description: i.recommendation,
        effort: i.effort,
        impact: i.impact,
        category: i.category
      }))].slice(0, 10),
      warnings,
      recommendations
    };
  }
}

// Export singleton instance
export const unifiedAnalysisService = new UnifiedAnalysisService();
