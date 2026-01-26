import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import type {
  PlagiarismCheckResult,
  PlagiarismCheckStatus,
  OriginalityScore,
  SimilarWork,
  PlagiarismFlag,
  BatchPlagiarismResult,
} from '../shared/types/index.js';

const logger = createLogger('services:plagiarism-checker');

/**
 * Content to check for plagiarism/originality
 */
interface ContentToCheck {
  title?: string;
  logline?: string;
  synopsis?: string;
  hook?: string;
  protagonistHint?: string;
  storyIdea?: string;
  characterConcepts?: string[];
  plotElements?: string[];
  uniqueTwists?: string[];
  chapterContent?: string;
  chapterSummary?: string;
}

/**
 * PlagiarismCheckerService analyzes story concepts and content for originality
 *
 * This service uses Claude to:
 * 1. Identify similarities to known published works
 * 2. Score originality across multiple dimensions
 * 3. Flag concerning similarities with suggestions for differentiation
 * 4. Track common tropes and archetypes to ensure unique twists
 */
export class PlagiarismCheckerService {
  /**
   * Check a saved concept for originality
   */
  async checkConcept(conceptId: string): Promise<PlagiarismCheckResult> {
    logger.info(`[PlagiarismChecker] Checking concept ${conceptId}`);

    const stmt = db.prepare<[string], any>(`
      SELECT id, title, logline, synopsis, hook, protagonist_hint
      FROM saved_concepts
      WHERE id = ?
    `);
    const concept = stmt.get(conceptId);

    if (!concept) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    const content: ContentToCheck = {
      title: concept.title,
      logline: concept.logline,
      synopsis: concept.synopsis,
      hook: concept.hook,
      protagonistHint: concept.protagonist_hint,
    };

    return this.analyzeContent(content, 'concept', conceptId);
  }

  /**
   * Check a concept summary for originality
   */
  async checkConceptSummary(summaryId: string): Promise<PlagiarismCheckResult> {
    logger.info(`[PlagiarismChecker] Checking concept summary ${summaryId}`);

    const stmt = db.prepare<[string], any>(`
      SELECT id, title, logline
      FROM saved_concept_summaries
      WHERE id = ?
    `);
    const summary = stmt.get(summaryId);

    if (!summary) {
      throw new Error(`Concept summary not found: ${summaryId}`);
    }

    const content: ContentToCheck = {
      title: summary.title,
      logline: summary.logline,
    };

    return this.analyzeContent(content, 'summary', summaryId);
  }

  /**
   * Check a saved story idea for originality
   */
  async checkStoryIdea(ideaId: string): Promise<PlagiarismCheckResult> {
    logger.info(`[PlagiarismChecker] Checking story idea ${ideaId}`);

    const stmt = db.prepare<[string], any>(`
      SELECT id, story_idea, character_concepts, plot_elements, unique_twists, genre
      FROM saved_story_ideas
      WHERE id = ?
    `);
    const idea = stmt.get(ideaId);

    if (!idea) {
      throw new Error(`Story idea not found: ${ideaId}`);
    }

    const content: ContentToCheck = {
      storyIdea: idea.story_idea,
      characterConcepts: idea.character_concepts ? JSON.parse(idea.character_concepts) : [],
      plotElements: idea.plot_elements ? JSON.parse(idea.plot_elements) : [],
      uniqueTwists: idea.unique_twists ? JSON.parse(idea.unique_twists) : [],
    };

    return this.analyzeContent(content, 'story_idea', ideaId);
  }

  /**
   * Check a chapter for originality
   */
  async checkChapter(chapterId: string): Promise<PlagiarismCheckResult> {
    logger.info(`[PlagiarismChecker] Checking chapter ${chapterId}`);

    const stmt = db.prepare<[string], any>(`
      SELECT id, content, summary
      FROM chapters
      WHERE id = ?
    `);
    const chapter = stmt.get(chapterId);

    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    if (!chapter.content) {
      throw new Error(`Chapter ${chapterId} has no content to check`);
    }

    const content: ContentToCheck = {
      chapterContent: chapter.content,
      chapterSummary: chapter.summary,
    };

    return this.analyzeContent(content, 'chapter', chapterId);
  }

  /**
   * Check raw content (for inline checking before saving)
   */
  async checkRawContent(content: ContentToCheck): Promise<PlagiarismCheckResult> {
    logger.info('[PlagiarismChecker] Checking raw content');
    return this.analyzeContent(content, 'concept', `raw_${Date.now()}`);
  }

  /**
   * Batch check all saved concepts
   */
  async checkAllConcepts(): Promise<BatchPlagiarismResult> {
    logger.info('[PlagiarismChecker] Batch checking all saved concepts');

    const stmt = db.prepare<[], { id: string }>(`
      SELECT id FROM saved_concepts WHERE status = 'saved'
    `);
    const concepts = stmt.all();

    const results: PlagiarismCheckResult[] = [];
    let passedCount = 0;
    let flaggedCount = 0;
    let totalScore = 0;

    for (const concept of concepts) {
      try {
        const result = await this.checkConcept(concept.id);
        results.push(result);

        if (result.status === 'passed') {
          passedCount++;
        } else if (result.status === 'flagged') {
          flaggedCount++;
        }

        totalScore += result.originalityScore.overall;
      } catch (error) {
        logger.error({ error, conceptId: concept.id }, 'Failed to check concept');
      }
    }

    return {
      totalChecked: results.length,
      passedCount,
      flaggedCount,
      averageOriginalityScore: results.length > 0 ? totalScore / results.length : 0,
      results,
    };
  }

  /**
   * Core analysis function that calls Claude to evaluate originality
   */
  private async analyzeContent(
    content: ContentToCheck,
    contentType: 'concept' | 'summary' | 'chapter' | 'story_idea',
    contentId: string
  ): Promise<PlagiarismCheckResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(content, contentType);

    try {
      const apiResponse = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 3000,
        temperature: 0.5, // Lower temperature for consistent analysis
      });

      const analysis = this.parseAnalysisResponse(apiResponse.content);

      // Determine status based on scores and flags
      const status = this.determineStatus(analysis);

      const result: PlagiarismCheckResult = {
        id: `check_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        contentType,
        contentId,
        checkedAt: new Date().toISOString(),
        status,
        originalityScore: analysis.originalityScore,
        similarWorks: analysis.similarWorks,
        flags: analysis.flags.map((f: any) => ({
          ...f,
          id: `flag_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        })),
        recommendations: analysis.recommendations,
        analysisDetails: analysis.analysisDetails,
        usage: apiResponse.usage,
      };

      // Store result in database
      await this.storeResult(result);

      logger.info({
        contentId,
        status,
        overallScore: analysis.originalityScore.overall,
        flagCount: analysis.flags.length,
      }, 'Plagiarism check complete');

      return result;
    } catch (error) {
      logger.error({ error, contentId }, 'Plagiarism check failed');
      throw error;
    }
  }

  /**
   * Build system prompt for plagiarism analysis
   */
  private buildSystemPrompt(): string {
    return `You are an expert literary analyst and plagiarism detection specialist. Your role is to evaluate story concepts and content for originality, identifying:

1. **Similarities to Published Works**: Compare against your knowledge of published novels, films, TV shows, and other media. Focus on:
   - Plot structure similarities
   - Character archetype matches
   - Premise/concept overlap
   - Setting similarities
   - Theme combinations

2. **Trope Analysis**: Identify common tropes and evaluate if they're used with sufficient originality:
   - Overused tropes without fresh angles
   - Combination of tropes that feel derivative
   - Unique twists on familiar elements

3. **Originality Scoring**: Evaluate across dimensions:
   - Plot Originality (0-100): How unique is the story's structure and events?
   - Character Originality (0-100): How fresh are the character concepts?
   - Setting Originality (0-100): How unique is the world/environment?
   - Theme Originality (0-100): How novel is the thematic exploration?
   - Premise Originality (0-100): How fresh is the core concept/hook?

4. **Differentiation Suggestions**: When similarities are found, provide actionable suggestions for making the content more unique.

IMPORTANT GUIDELINES:
- Being influenced by or riffing on existing works is NORMAL and ACCEPTABLE - we're looking for problematic direct copying or lack of originality
- Many stories share common tropes - that's fine as long as there's a unique angle
- Focus on substantial similarities, not surface-level genre conventions
- Consider the COMBINATION of elements - unique combinations of familiar elements ARE original
- A story can reference or pay homage to other works and still be original
- Score generously for creative combinations and fresh takes on familiar elements`;
  }

  /**
   * Build user prompt based on content type
   */
  private buildUserPrompt(content: ContentToCheck, contentType: string): string {
    let contentDescription = '';

    if (content.title) {
      contentDescription += `**Title:** ${content.title}\n`;
    }
    if (content.logline) {
      contentDescription += `**Logline:** ${content.logline}\n`;
    }
    if (content.synopsis) {
      contentDescription += `**Synopsis:** ${content.synopsis}\n`;
    }
    if (content.hook) {
      contentDescription += `**Hook:** ${content.hook}\n`;
    }
    if (content.protagonistHint) {
      contentDescription += `**Protagonist:** ${content.protagonistHint}\n`;
    }
    if (content.storyIdea) {
      contentDescription += `**Story Idea:** ${content.storyIdea}\n`;
    }
    if (content.characterConcepts && content.characterConcepts.length > 0) {
      contentDescription += `**Character Concepts:** ${content.characterConcepts.join('; ')}\n`;
    }
    if (content.plotElements && content.plotElements.length > 0) {
      contentDescription += `**Plot Elements:** ${content.plotElements.join('; ')}\n`;
    }
    if (content.uniqueTwists && content.uniqueTwists.length > 0) {
      contentDescription += `**Unique Twists:** ${content.uniqueTwists.join('; ')}\n`;
    }
    if (content.chapterContent) {
      // For chapters, only analyze the first portion to avoid token limits
      const excerpt = content.chapterContent.substring(0, 3000);
      contentDescription += `**Chapter Content (excerpt):**\n${excerpt}\n`;
    }
    if (content.chapterSummary) {
      contentDescription += `**Chapter Summary:** ${content.chapterSummary}\n`;
    }

    return `Analyze this ${contentType} for originality and potential plagiarism concerns:

${contentDescription}

Provide your analysis in this exact JSON format:
{
  "originalityScore": {
    "overall": <0-100>,
    "plotOriginality": <0-100>,
    "characterOriginality": <0-100>,
    "settingOriginality": <0-100>,
    "themeOriginality": <0-100>,
    "premiseOriginality": <0-100>
  },
  "similarWorks": [
    {
      "title": "Name of similar work",
      "author": "Author/Creator name",
      "similarity": <0-100>,
      "matchedElements": ["plot", "character", "setting", etc.],
      "description": "Brief description of how it's similar",
      "publicationYear": <year or null>
    }
  ],
  "flags": [
    {
      "type": "plot_similarity|character_similarity|premise_similarity|title_similarity|trope_overuse",
      "severity": "low|medium|high",
      "description": "What the concern is",
      "similarTo": "What existing work it's similar to",
      "suggestion": "How to differentiate and make more original"
    }
  ],
  "recommendations": [
    "Actionable suggestion 1",
    "Actionable suggestion 2"
  ],
  "analysisDetails": {
    "tropesIdentified": ["trope 1", "trope 2"],
    "archetypesUsed": ["archetype 1", "archetype 2"],
    "uniqueElements": ["unique element 1", "unique element 2"],
    "concerningPatterns": ["pattern 1 if any"]
  }
}

SCORING GUIDELINES:
- 90-100: Highly original, unique concept with fresh execution
- 75-89: Original with some familiar elements used creatively
- 60-74: Moderately original, uses common elements with some unique angles
- 40-59: Derivative, closely resembles existing works
- 0-39: Highly derivative or potentially plagiarized

Only flag works with similarity > 50%. Include at most 5 similar works, prioritizing the most concerning matches.

Output ONLY valid JSON, no additional commentary:`;
  }

  /**
   * Parse the analysis response from Claude
   */
  private parseAnalysisResponse(response: string): any {
    try {
      return extractJsonObject(response);
    } catch (error) {
      logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse analysis response');

      // Return default safe values if parsing fails
      return {
        originalityScore: {
          overall: 75,
          plotOriginality: 75,
          characterOriginality: 75,
          settingOriginality: 75,
          themeOriginality: 75,
          premiseOriginality: 75,
        },
        similarWorks: [],
        flags: [],
        recommendations: ['Unable to fully analyze - please try again'],
        analysisDetails: {
          tropesIdentified: [],
          archetypesUsed: [],
          uniqueElements: [],
          concerningPatterns: [],
        },
      };
    }
  }

  /**
   * Determine the overall status based on analysis
   */
  private determineStatus(analysis: any): PlagiarismCheckStatus {
    const overallScore = analysis.originalityScore?.overall ?? 75;
    const highSeverityFlags = (analysis.flags || []).filter(
      (f: any) => f.severity === 'high'
    ).length;
    const mediumSeverityFlags = (analysis.flags || []).filter(
      (f: any) => f.severity === 'medium'
    ).length;

    if (overallScore >= 75 && highSeverityFlags === 0 && mediumSeverityFlags <= 1) {
      return 'passed';
    } else if (overallScore < 50 || highSeverityFlags >= 2) {
      return 'flagged';
    } else {
      return 'requires_review';
    }
  }

  /**
   * Store plagiarism check result in database
   */
  private async storeResult(result: PlagiarismCheckResult): Promise<void> {
    try {
      const stmt = db.prepare(`
        INSERT INTO plagiarism_checks (
          id, content_type, content_id, checked_at, status,
          originality_score, similar_works, flags, recommendations, analysis_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        result.id,
        result.contentType,
        result.contentId,
        result.checkedAt,
        result.status,
        JSON.stringify(result.originalityScore),
        JSON.stringify(result.similarWorks),
        JSON.stringify(result.flags),
        JSON.stringify(result.recommendations),
        JSON.stringify(result.analysisDetails)
      );
    } catch (error) {
      // Table might not exist yet - log but don't fail
      logger.warn({ error }, 'Failed to store plagiarism result - table may not exist');
    }
  }

  /**
   * Get previous check results for content
   */
  async getCheckResults(contentId: string): Promise<PlagiarismCheckResult[]> {
    try {
      const stmt = db.prepare<[string], any>(`
        SELECT * FROM plagiarism_checks
        WHERE content_id = ?
        ORDER BY checked_at DESC
      `);
      const rows = stmt.all(contentId);

      return rows.map((row: any) => ({
        id: row.id,
        contentType: row.content_type,
        contentId: row.content_id,
        checkedAt: row.checked_at,
        status: row.status,
        originalityScore: JSON.parse(row.originality_score),
        similarWorks: JSON.parse(row.similar_works),
        flags: JSON.parse(row.flags),
        recommendations: JSON.parse(row.recommendations),
        analysisDetails: JSON.parse(row.analysis_details),
      }));
    } catch (error) {
      logger.warn({ error }, 'Failed to get check results - table may not exist');
      return [];
    }
  }

  /**
   * Get the latest check result for content
   */
  async getLatestCheckResult(contentId: string): Promise<PlagiarismCheckResult | null> {
    const results = await this.getCheckResults(contentId);
    return results.length > 0 ? results[0] : null;
  }
}

// Export singleton instance
export const plagiarismCheckerService = new PlagiarismCheckerService();
