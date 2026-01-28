import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { randomUUID } from 'crypto';

const logger = createLogger('services:outline-editorial');

/**
 * Outline Editorial Board Service
 *
 * Provides three AI personas for pre-chapter outline review:
 * - Module A: Story Structure Analyst - Plot structure, pacing plan, story arc
 * - Module B: Character Arc Reviewer - Character development across planned outline
 * - Module C: Market Fit Analyst - Commercial viability based on outline/concept
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface StructureAnalystResult {
  plotStructureScore: number; // 1-10
  plotStructureAnalysis: {
    structureType: string;
    strengths: string[];
    weaknesses: string[];
    missingBeats: string[];
  };
  pacingAssessment: {
    overallPacing: 'too_slow' | 'well_paced' | 'too_fast' | 'uneven';
    actBalance: Array<{
      act: number;
      assessment: string;
      percentageOfStory: number;
      idealPercentage: number;
    }>;
    suggestions: string[];
  };
  storyArcAnalysis: {
    tensionCurve: 'flat' | 'rising' | 'peaks_and_valleys' | 'front_loaded' | 'back_loaded';
    climaxPlacement: string;
    resolutionAssessment: string;
    emotionalJourney: string;
  };
  chapterByChapterNotes: Array<{
    chapterNumber: number;
    purpose: string;
    concerns: string[];
    suggestions: string[];
  }>;
  summaryVerdict: string;
}

export interface CharacterArcResult {
  overallCharacterScore: number; // 1-10
  protagonistArc: {
    characterName: string;
    arcType: string; // e.g., 'positive change', 'negative change', 'flat arc'
    startingState: string;
    endingState: string;
    transformationClarity: number; // 1-10
    keyMoments: string[];
    missingElements: string[];
  };
  supportingCharacterArcs: Array<{
    characterName: string;
    role: string;
    arcPresent: boolean;
    arcSummary: string;
    screenTimeBalance: 'too_little' | 'balanced' | 'too_much';
    suggestions: string[];
  }>;
  relationshipDynamics: Array<{
    characters: string[];
    relationshipType: string;
    evolutionThroughStory: string;
    effectivenessScore: number; // 1-10
  }>;
  characterConsistencyIssues: Array<{
    character: string;
    issue: string;
    chapterNumber: number;
    suggestion: string;
  }>;
  summaryVerdict: string;
}

export interface MarketFitResult {
  marketViabilityScore: number; // 1-10
  genreAlignment: {
    primaryGenre: string;
    genreExpectationsMet: boolean;
    tropesIdentified: string[];
    freshElements: string[];
    familiarElements: string[];
  };
  targetAudience: {
    primary: string;
    secondary: string;
    ageRange: string;
    readerExpectations: string[];
  };
  competitiveAnalysis: {
    comparableTitles: Array<{
      title: string;
      author: string;
      similarity: string;
    }>;
    marketDifferentiation: string;
    uniqueSellingPoints: string[];
  };
  hookAssessment: {
    conceptHookStrength: number; // 1-10
    openingChapterHook: number; // 1-10
    marketingPotential: string;
    elevatorPitch: string;
  };
  concerns: Array<{
    area: string;
    concern: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestion: string;
  }>;
  summaryVerdict: string;
  agentRecommendation: 'proceed' | 'revise_then_proceed' | 'major_revision_needed';
}

export interface OutlineEditorialReport {
  id: string;
  projectId: string;
  outlineId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  structureAnalyst?: StructureAnalystResult;
  characterArc?: CharacterArcResult;
  marketFit?: MarketFitResult;
  overallScore?: number;
  summary?: string;
  recommendations?: string[];
  readyForGeneration: boolean;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================================================
// Outline Editorial Service Class
// ============================================================================

export class OutlineEditorialService {
  /**
   * Create a new outline editorial report and queue all three modules
   */
  async submitOutlineForReview(projectId: string): Promise<{
    reportId: string;
    status: string;
  }> {
    logger.info({ projectId }, '[OutlineEditorial] Submitting outline for editorial review');

    // Verify project exists and has an outline
    const projectStmt = db.prepare(`
      SELECT p.id, p.title, p.genre, p.story_dna, p.story_bible,
             (SELECT o.id FROM outlines o JOIN books b ON o.book_id = b.id WHERE b.project_id = p.id LIMIT 1) as outline_id,
             (SELECT o.structure FROM outlines o JOIN books b ON o.book_id = b.id WHERE b.project_id = p.id LIMIT 1) as outline_structure
      FROM projects p WHERE p.id = ?
    `);
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.outline_id || !project.outline_structure) {
      throw new Error('Project has no outline to review');
    }

    // Check for existing pending/processing report
    const existingStmt = db.prepare(`
      SELECT id, status FROM outline_editorial_reports
      WHERE project_id = ? AND status IN ('pending', 'processing')
      ORDER BY created_at DESC LIMIT 1
    `);
    const existing = existingStmt.get(projectId) as any;

    if (existing) {
      return {
        reportId: existing.id,
        status: existing.status,
      };
    }

    // Create new report
    const reportId = randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO outline_editorial_reports (id, project_id, outline_id, status)
      VALUES (?, ?, ?, 'pending')
    `);
    insertStmt.run(reportId, projectId, project.outline_id);

    // Update project review status
    const updateProjectStmt = db.prepare(`
      UPDATE projects SET outline_review_status = 'in_review', updated_at = datetime('now') WHERE id = ?
    `);
    updateProjectStmt.run(projectId);

    logger.info({ reportId, projectId, outlineId: project.outline_id }, '[OutlineEditorial] Created outline editorial report');

    return {
      reportId,
      status: 'pending',
    };
  }

  /**
   * Module A: Story Structure Analyst
   */
  async runStructureAnalyst(reportId: string): Promise<StructureAnalystResult> {
    logger.info({ reportId }, '[OutlineEditorial] Running Story Structure Analyst');

    // Update status
    const updateStmt = db.prepare(`
      UPDATE outline_editorial_reports SET structure_analyst_status = 'processing' WHERE id = ?
    `);
    updateStmt.run(reportId);

    try {
      // Get report and project data
      const reportStmt = db.prepare(`
        SELECT r.*, p.title, p.genre, p.story_dna, p.story_bible,
               o.structure as outline_structure, o.total_chapters, o.target_word_count
        FROM outline_editorial_reports r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN outlines o ON r.outline_id = o.id
        WHERE r.id = ?
      `);
      const report = reportStmt.get(reportId) as any;

      if (!report || !report.outline_structure) {
        throw new Error('Report or outline not found');
      }

      const storyDNA = report.story_dna ? JSON.parse(report.story_dna) : null;
      const outlineStructure = JSON.parse(report.outline_structure);

      // Build the prompt
      const prompt = this.buildStructureAnalystPrompt(
        report.title,
        report.genre,
        storyDNA,
        outlineStructure,
        report.total_chapters
      );

      // Call Claude
      const response = await claudeService.createCompletionWithUsage({
        system: 'You are a senior developmental editor and story structure expert. Return ONLY valid JSON, no additional text.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4000,
        temperature: 0.3,
      });

      // Parse the response
      const result = extractJsonObject<StructureAnalystResult>(response.content);

      if (!result) {
        throw new Error('Failed to parse Structure Analyst response');
      }

      // Save results
      const saveStmt = db.prepare(`
        UPDATE outline_editorial_reports
        SET structure_analyst_status = 'completed',
            structure_analyst_results = ?,
            structure_analyst_completed_at = datetime('now'),
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?
        WHERE id = ?
      `);
      saveStmt.run(
        JSON.stringify(result),
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0,
        reportId
      );

      logger.info({ reportId, plotStructureScore: result.plotStructureScore }, '[OutlineEditorial] Structure Analyst completed');

      return result;
    } catch (error) {
      const failStmt = db.prepare(`
        UPDATE outline_editorial_reports SET structure_analyst_status = 'failed' WHERE id = ?
      `);
      failStmt.run(reportId);
      throw error;
    }
  }

  /**
   * Module B: Character Arc Reviewer
   */
  async runCharacterArcReviewer(reportId: string): Promise<CharacterArcResult> {
    logger.info({ reportId }, '[OutlineEditorial] Running Character Arc Reviewer');

    const updateStmt = db.prepare(`
      UPDATE outline_editorial_reports SET character_arc_status = 'processing' WHERE id = ?
    `);
    updateStmt.run(reportId);

    try {
      const reportStmt = db.prepare(`
        SELECT r.*, p.title, p.genre, p.story_dna, p.story_bible,
               o.structure as outline_structure
        FROM outline_editorial_reports r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN outlines o ON r.outline_id = o.id
        WHERE r.id = ?
      `);
      const report = reportStmt.get(reportId) as any;

      if (!report) {
        throw new Error('Report not found');
      }

      const storyBible = report.story_bible ? JSON.parse(report.story_bible) : null;
      const outlineStructure = report.outline_structure ? JSON.parse(report.outline_structure) : null;

      const prompt = this.buildCharacterArcPrompt(
        report.title,
        report.genre,
        storyBible?.characters || [],
        outlineStructure
      );

      const response = await claudeService.createCompletionWithUsage({
        system: 'You are a character development specialist. Return ONLY valid JSON, no additional text.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4000,
        temperature: 0.3,
      });

      const result = extractJsonObject<CharacterArcResult>(response.content);

      if (!result) {
        throw new Error('Failed to parse Character Arc Reviewer response');
      }

      const saveStmt = db.prepare(`
        UPDATE outline_editorial_reports
        SET character_arc_status = 'completed',
            character_arc_results = ?,
            character_arc_completed_at = datetime('now'),
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?
        WHERE id = ?
      `);
      saveStmt.run(
        JSON.stringify(result),
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0,
        reportId
      );

      logger.info({ reportId, overallCharacterScore: result.overallCharacterScore }, '[OutlineEditorial] Character Arc Reviewer completed');

      return result;
    } catch (error) {
      const failStmt = db.prepare(`
        UPDATE outline_editorial_reports SET character_arc_status = 'failed' WHERE id = ?
      `);
      failStmt.run(reportId);
      throw error;
    }
  }

  /**
   * Module C: Market Fit Analyst
   */
  async runMarketFitAnalyst(reportId: string): Promise<MarketFitResult> {
    logger.info({ reportId }, '[OutlineEditorial] Running Market Fit Analyst');

    const updateStmt = db.prepare(`
      UPDATE outline_editorial_reports SET market_fit_status = 'processing' WHERE id = ?
    `);
    updateStmt.run(reportId);

    try {
      const reportStmt = db.prepare(`
        SELECT r.*, p.title, p.genre, p.story_dna, p.story_bible, p.story_concept,
               o.structure as outline_structure
        FROM outline_editorial_reports r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN outlines o ON r.outline_id = o.id
        WHERE r.id = ?
      `);
      const report = reportStmt.get(reportId) as any;

      if (!report) {
        throw new Error('Report not found');
      }

      const storyDNA = report.story_dna ? JSON.parse(report.story_dna) : null;
      const storyConcept = report.story_concept ? JSON.parse(report.story_concept) : null;
      const outlineStructure = report.outline_structure ? JSON.parse(report.outline_structure) : null;

      const prompt = this.buildMarketFitPrompt(
        report.title,
        report.genre,
        storyDNA,
        storyConcept,
        outlineStructure
      );

      const response = await claudeService.createCompletionWithUsage({
        system: 'You are a literary agent with expertise in commercial fiction. Return ONLY valid JSON, no additional text.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4000,
        temperature: 0.3,
      });

      const result = extractJsonObject<MarketFitResult>(response.content);

      if (!result) {
        throw new Error('Failed to parse Market Fit Analyst response');
      }

      const saveStmt = db.prepare(`
        UPDATE outline_editorial_reports
        SET market_fit_status = 'completed',
            market_fit_results = ?,
            market_fit_completed_at = datetime('now'),
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?
        WHERE id = ?
      `);
      saveStmt.run(
        JSON.stringify(result),
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0,
        reportId
      );

      logger.info({ reportId, marketViabilityScore: result.marketViabilityScore }, '[OutlineEditorial] Market Fit Analyst completed');

      return result;
    } catch (error) {
      const failStmt = db.prepare(`
        UPDATE outline_editorial_reports SET market_fit_status = 'failed' WHERE id = ?
      `);
      failStmt.run(reportId);
      throw error;
    }
  }

  /**
   * Finalise the outline editorial report
   */
  async finaliseReport(reportId: string): Promise<OutlineEditorialReport> {
    logger.info({ reportId }, '[OutlineEditorial] Finalising report');

    const reportStmt = db.prepare(`
      SELECT * FROM outline_editorial_reports WHERE id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    // Parse results
    const structureResults = report.structure_analyst_results ? JSON.parse(report.structure_analyst_results) : null;
    const characterResults = report.character_arc_results ? JSON.parse(report.character_arc_results) : null;
    const marketResults = report.market_fit_results ? JSON.parse(report.market_fit_results) : null;

    // Calculate overall score (weighted average)
    let overallScore = 0;
    let weights = 0;

    if (structureResults?.plotStructureScore) {
      overallScore += structureResults.plotStructureScore * 35; // 35% weight
      weights += 35;
    }
    if (characterResults?.overallCharacterScore) {
      overallScore += characterResults.overallCharacterScore * 35; // 35% weight
      weights += 35;
    }
    if (marketResults?.marketViabilityScore) {
      overallScore += marketResults.marketViabilityScore * 30; // 30% weight
      weights += 30;
    }

    overallScore = weights > 0 ? Math.round((overallScore / weights) * 10) : 0;

    // Generate summary and recommendations
    const summary = this.generateSummary(structureResults, characterResults, marketResults);
    const recommendations = this.generateRecommendations(structureResults, characterResults, marketResults);

    // Determine if ready for generation (score >= 60 or user can override)
    const readyForGeneration = overallScore >= 60;

    // Update report
    const updateStmt = db.prepare(`
      UPDATE outline_editorial_reports
      SET status = 'completed',
          overall_score = ?,
          summary = ?,
          recommendations = ?,
          ready_for_generation = ?,
          completed_at = datetime('now')
      WHERE id = ?
    `);
    updateStmt.run(overallScore, summary, JSON.stringify(recommendations), readyForGeneration ? 1 : 0, reportId);

    // Update project status
    const projectUpdateStmt = db.prepare(`
      UPDATE projects
      SET outline_review_status = 'approved',
          outline_review_completed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    projectUpdateStmt.run(report.project_id);

    logger.info({ reportId, overallScore, readyForGeneration }, '[OutlineEditorial] Report finalised');

    return {
      id: reportId,
      projectId: report.project_id,
      outlineId: report.outline_id,
      status: 'completed',
      structureAnalyst: structureResults,
      characterArc: characterResults,
      marketFit: marketResults,
      overallScore,
      summary,
      recommendations,
      readyForGeneration,
      createdAt: report.created_at,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Skip outline review and proceed directly to chapters
   */
  async skipOutlineReview(projectId: string): Promise<void> {
    logger.info({ projectId }, '[OutlineEditorial] Skipping outline review');

    const updateStmt = db.prepare(`
      UPDATE projects
      SET outline_review_status = 'skipped',
          outline_review_completed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    updateStmt.run(projectId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildStructureAnalystPrompt(
    title: string,
    genre: string,
    storyDNA: any,
    outlineStructure: any,
    totalChapters: number
  ): string {
    return `You are a senior developmental editor and story structure expert with 25 years of experience. Analyse this story outline with ruthless objectivity.

STORY: "${title}"
GENRE: ${genre}
${storyDNA ? `STORY DNA: ${JSON.stringify(storyDNA)}` : ''}
TOTAL CHAPTERS: ${totalChapters}

OUTLINE STRUCTURE:
${JSON.stringify(outlineStructure, null, 2)}

Analyse this outline and return a JSON object with the following structure:

{
  "plotStructureScore": <1-10>,
  "plotStructureAnalysis": {
    "structureType": "<identified structure type>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "missingBeats": ["<missing beat 1>", "<missing beat 2>"]
  },
  "pacingAssessment": {
    "overallPacing": "<too_slow|well_paced|too_fast|uneven>",
    "actBalance": [
      {
        "act": 1,
        "assessment": "<assessment>",
        "percentageOfStory": <number>,
        "idealPercentage": <number>
      }
    ],
    "suggestions": ["<suggestion 1>"]
  },
  "storyArcAnalysis": {
    "tensionCurve": "<flat|rising|peaks_and_valleys|front_loaded|back_loaded>",
    "climaxPlacement": "<assessment>",
    "resolutionAssessment": "<assessment>",
    "emotionalJourney": "<description>"
  },
  "chapterByChapterNotes": [
    {
      "chapterNumber": 1,
      "purpose": "<chapter purpose>",
      "concerns": ["<concern>"],
      "suggestions": ["<suggestion>"]
    }
  ],
  "summaryVerdict": "<overall assessment paragraph>"
}

Be specific and actionable in your feedback. Focus on structural issues that could derail the story.`;
  }

  private buildCharacterArcPrompt(
    title: string,
    genre: string,
    characters: any[],
    outlineStructure: any
  ): string {
    return `You are a character development specialist and story consultant. Analyse how characters develop across this story outline.

STORY: "${title}"
GENRE: ${genre}

CHARACTERS:
${JSON.stringify(characters, null, 2)}

OUTLINE STRUCTURE:
${JSON.stringify(outlineStructure, null, 2)}

Analyse character arcs and return a JSON object with the following structure:

{
  "overallCharacterScore": <1-10>,
  "protagonistArc": {
    "characterName": "<name>",
    "arcType": "<positive change|negative change|flat arc|etc>",
    "startingState": "<description>",
    "endingState": "<description>",
    "transformationClarity": <1-10>,
    "keyMoments": ["<moment 1>", "<moment 2>"],
    "missingElements": ["<element 1>"]
  },
  "supportingCharacterArcs": [
    {
      "characterName": "<name>",
      "role": "<role in story>",
      "arcPresent": <true|false>,
      "arcSummary": "<summary>",
      "screenTimeBalance": "<too_little|balanced|too_much>",
      "suggestions": ["<suggestion>"]
    }
  ],
  "relationshipDynamics": [
    {
      "characters": ["<char1>", "<char2>"],
      "relationshipType": "<type>",
      "evolutionThroughStory": "<description>",
      "effectivenessScore": <1-10>
    }
  ],
  "characterConsistencyIssues": [
    {
      "character": "<name>",
      "issue": "<description>",
      "chapterNumber": <number>,
      "suggestion": "<fix>"
    }
  ],
  "summaryVerdict": "<overall assessment paragraph>"
}

Focus on whether character arcs are satisfying and well-developed across the planned outline.`;
  }

  private buildMarketFitPrompt(
    title: string,
    genre: string,
    storyDNA: any,
    storyConcept: any,
    outlineStructure: any
  ): string {
    return `You are a literary agent with 20 years of experience in commercial fiction. Assess this story's market potential based on its outline and concept.

STORY: "${title}"
GENRE: ${genre}
${storyDNA ? `STORY DNA: ${JSON.stringify(storyDNA)}` : ''}
${storyConcept ? `CONCEPT: ${JSON.stringify(storyConcept)}` : ''}

OUTLINE STRUCTURE:
${JSON.stringify(outlineStructure, null, 2)}

Analyse market fit and return a JSON object with the following structure:

{
  "marketViabilityScore": <1-10>,
  "genreAlignment": {
    "primaryGenre": "<genre>",
    "genreExpectationsMet": <true|false>,
    "tropesIdentified": ["<trope 1>", "<trope 2>"],
    "freshElements": ["<element 1>"],
    "familiarElements": ["<element 1>"]
  },
  "targetAudience": {
    "primary": "<audience description>",
    "secondary": "<audience description>",
    "ageRange": "<range>",
    "readerExpectations": ["<expectation 1>"]
  },
  "competitiveAnalysis": {
    "comparableTitles": [
      {
        "title": "<book title>",
        "author": "<author>",
        "similarity": "<how it's similar>"
      }
    ],
    "marketDifferentiation": "<what makes this stand out>",
    "uniqueSellingPoints": ["<USP 1>", "<USP 2>"]
  },
  "hookAssessment": {
    "conceptHookStrength": <1-10>,
    "openingChapterHook": <1-10>,
    "marketingPotential": "<assessment>",
    "elevatorPitch": "<one-sentence pitch>"
  },
  "concerns": [
    {
      "area": "<area of concern>",
      "concern": "<description>",
      "severity": "<minor|moderate|major>",
      "suggestion": "<how to address>"
    }
  ],
  "summaryVerdict": "<overall market assessment paragraph>",
  "agentRecommendation": "<proceed|revise_then_proceed|major_revision_needed>"
}

Be honest about marketability. Focus on what would make an agent request the full manuscript.`;
  }

  private generateSummary(
    structureResults: StructureAnalystResult | null,
    characterResults: CharacterArcResult | null,
    marketResults: MarketFitResult | null
  ): string {
    const parts: string[] = [];

    if (structureResults) {
      parts.push(`Structure: ${structureResults.summaryVerdict}`);
    }
    if (characterResults) {
      parts.push(`Characters: ${characterResults.summaryVerdict}`);
    }
    if (marketResults) {
      parts.push(`Market: ${marketResults.summaryVerdict}`);
    }

    return parts.join(' ') || 'Analysis incomplete.';
  }

  private generateRecommendations(
    structureResults: StructureAnalystResult | null,
    characterResults: CharacterArcResult | null,
    marketResults: MarketFitResult | null
  ): string[] {
    const recommendations: string[] = [];

    // Structure recommendations
    if (structureResults?.plotStructureAnalysis?.weaknesses) {
      structureResults.plotStructureAnalysis.weaknesses.slice(0, 2).forEach(w => {
        recommendations.push(`Structure: Address ${w}`);
      });
    }

    // Character recommendations
    if (characterResults?.protagonistArc?.missingElements) {
      characterResults.protagonistArc.missingElements.slice(0, 2).forEach(m => {
        recommendations.push(`Character: Add ${m}`);
      });
    }

    // Market recommendations
    if (marketResults?.concerns) {
      marketResults.concerns
        .filter(c => c.severity === 'major')
        .slice(0, 2)
        .forEach(c => {
          recommendations.push(`Market: ${c.suggestion}`);
        });
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }
}

export const outlineEditorialService = new OutlineEditorialService();
