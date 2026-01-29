import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';
import { randomUUID } from 'crypto';

const logger = createLogger('services:veb');

// Version-aware chapter query helper for VEB
// Filters to only include chapters from active versions (or legacy chapters without version_id)
const VERSION_AWARE_CHAPTER_FILTER = `
  AND (
    c.version_id IS NULL
    OR c.version_id IN (
      SELECT bv.id FROM book_versions bv WHERE bv.book_id = c.book_id AND bv.is_active = 1
    )
  )
`;

/**
 * Virtual Editorial Board (VEB) Service
 *
 * Provides three AI personas for post-manuscript review:
 * - Module A: Beta Swarm (Marcus) - Reader engagement/sentiment
 * - Module B: Ruthless Editor - Structural analysis
 * - Module C: Market Analyst - Commercial viability
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface BetaSwarmChapterResult {
  chapterId: string;
  chapterNumber: number;
  retentionScore: number; // 1-10
  reactions: Array<{
    paragraphIndex: number;
    tag: 'BORED' | 'HOOKED' | 'CONFUSED' | 'ENGAGED' | 'EMOTIONAL';
    emotion?: string; // For EMOTIONAL tag
    explanation: string;
  }>;
  dnfRiskPoints: Array<{
    location: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  highlights: string[]; // Best moments
}

export interface BetaSwarmResult {
  chapterResults: BetaSwarmChapterResult[];
  overallEngagement: number; // 1-10
  wouldRecommend: boolean;
  summaryReaction: string;
}

export interface RuthlessEditorChapterResult {
  chapterId: string;
  chapterNumber: number;
  valueShift: {
    openingCharge: string;
    closingCharge: string;
    shiftMagnitude: number; // 1-10
    assessment: string;
  };
  expositionIssues: Array<{
    location: string;
    issue: 'telling_not_showing' | 'info_dump' | 'unnecessary_backstory' | 'on_the_nose_dialogue';
    quote: string;
    suggestion: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
  pacingIssues: Array<{
    location: string;
    issue: 'too_slow' | 'too_fast' | 'no_plot_advancement' | 'repetitive';
    suggestion: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
  scenePurpose: {
    earned: boolean;
    reasoning: string;
    recommendation?: string;
  };
}

export interface RuthlessEditorResult {
  chapterResults: RuthlessEditorChapterResult[];
  overallStructureScore: number; // 1-10
  majorIssuesCount: number;
  summaryVerdict: string;
}

export interface MarketAnalystResult {
  compTitles: Array<{
    title: string;
    author: string;
    year: number;
    similarity: string;
    whatWorks: string;
  }>;
  hookAnalysis: {
    openingLineScore: number; // 1-10
    openingParagraphScore: number; // 1-10
    openingChapterScore: number; // 1-10
    openingLine: string; // The actual line
    strengths: string[];
    weaknesses: string[];
    suggestedRewrite?: string;
  };
  tropeAnalysis: Array<{
    trope: string;
    freshness: 'fresh' | 'familiar' | 'overdone';
    execution: 'excellent' | 'good' | 'adequate' | 'poor';
    notes: string;
  }>;
  marketPositioning: {
    primaryAudience: string;
    secondaryAudience: string;
    marketingAngle: string;
    uniqueSellingPoint: string;
    potentialChallenges: string[];
  };
  commercialViabilityScore: number; // 1-10
  agentRecommendation: 'strong_yes' | 'yes_with_revisions' | 'maybe' | 'pass';
  summaryPitch: string;
}

export interface EditorialReport {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  betaSwarm?: BetaSwarmResult;
  ruthlessEditor?: RuthlessEditorResult;
  marketAnalyst?: MarketAnalystResult;
  overallScore?: number;
  summary?: string;
  recommendations?: string[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================================================
// VEB Service Class
// ============================================================================

export class VEBService {
  /**
   * Create a new editorial report and queue all three modules
   */
  async submitToVEB(projectId: string): Promise<{
    reportId: string;
    status: string;
  }> {
    logger.info({ projectId }, '[VEB] Submitting project to Virtual Editorial Board');

    // Verify project exists and has content (count active version chapters only)
    const projectStmt = db.prepare(`
      SELECT p.id, p.title, p.genre,
             (SELECT COUNT(*) FROM chapters c
              JOIN books b ON c.book_id = b.id
              LEFT JOIN book_versions bv ON c.version_id = bv.id
              WHERE b.project_id = p.id
                AND c.content IS NOT NULL
                AND (c.version_id IS NULL OR bv.is_active = 1)
             ) as chapter_count
      FROM projects p WHERE p.id = ?
    `);
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.chapter_count === 0) {
      throw new Error('Project has no completed chapters');
    }

    // Check for existing pending/processing report
    const existingStmt = db.prepare(`
      SELECT id, status FROM editorial_reports
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
      INSERT INTO editorial_reports (id, project_id, status)
      VALUES (?, ?, 'pending')
    `);
    insertStmt.run(reportId, projectId);

    logger.info({ reportId, projectId }, '[VEB] Created editorial report');

    return {
      reportId,
      status: 'pending',
    };
  }

  /**
   * Module A: Beta Swarm - Run "Marcus" reader engagement analysis
   */
  async runBetaSwarm(reportId: string): Promise<BetaSwarmResult> {
    logger.info({ reportId }, '[VEB] Running Beta Swarm analysis');

    // Update status
    const updateStatusStmt = db.prepare(`
      UPDATE editorial_reports SET beta_swarm_status = 'processing' WHERE id = ?
    `);
    updateStatusStmt.run(reportId);

    // Get report and project data
    const reportStmt = db.prepare(`
      SELECT er.*, p.genre, p.story_dna
      FROM editorial_reports er
      JOIN projects p ON er.project_id = p.id
      WHERE er.id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    const storyDNA = report.story_dna ? JSON.parse(report.story_dna) : {};
    const genre = storyDNA.genre || report.genre || 'fiction';

    // Get all chapters (active versions only)
    const chaptersStmt = db.prepare(`
      SELECT c.id, c.chapter_number, c.title, c.content
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ? AND c.content IS NOT NULL
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY b.book_number, c.chapter_number
    `);
    const chapters = chaptersStmt.all(report.project_id) as any[];

    const chapterResults: BetaSwarmChapterResult[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Process each chapter
    for (const chapter of chapters) {
      const systemPrompt = `PERSONA: You are "Marcus," an avid reader of ${genre} fiction. You consume 50+ books a year and have strong, honest opinions about what keeps you turning pages. You're not a professional critic - you're a passionate fan who knows what you like.

TASK: Read this chapter and provide your authentic reader reactions. Be honest - if you'd put the book down, say so.

REACTION TAGS:
- BORED: Attention wandering, considering skipping ahead
- HOOKED: Can't stop reading, must know what happens next
- CONFUSED: Lost or need to re-read to understand
- ENGAGED: Interested and following along nicely
- EMOTIONAL: Strong emotional response (specify which: fear, joy, sadness, anger, etc.)

OUTPUT FORMAT (JSON):
{
  "retentionScore": 1-10,
  "reactions": [
    {"paragraphIndex": 0, "tag": "HOOKED", "explanation": "Great opening line"}
  ],
  "dnfRiskPoints": [
    {"location": "paragraph 5", "reason": "Info dump about world history", "severity": "medium"}
  ],
  "highlights": ["The twist at the end", "Character dialogue"]
}`;

      const userPrompt = `Chapter ${chapter.chapter_number}${chapter.title ? `: ${chapter.title}` : ''}

${chapter.content}

Provide your reader reaction as JSON:`;

      try {
        const apiResponse = await claudeService.createCompletionWithUsage({
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 2000,
          temperature: 0.7, // Higher for authentic varied reactions
        });

        totalInputTokens += apiResponse.usage?.input_tokens || 0;
        totalOutputTokens += apiResponse.usage?.output_tokens || 0;

        const parsed = extractJsonObject(apiResponse.content) as any;

        chapterResults.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          retentionScore: parsed?.retentionScore || 5,
          reactions: parsed?.reactions || [],
          dnfRiskPoints: parsed?.dnfRiskPoints || [],
          highlights: parsed?.highlights || [],
        });
      } catch (error: any) {
        logger.error({ error: error.message, chapterId: chapter.id }, '[VEB] Beta Swarm chapter error');
        chapterResults.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          retentionScore: 0,
          reactions: [],
          dnfRiskPoints: [],
          highlights: [],
        });
      }
    }

    // Calculate overall engagement
    const avgRetention = chapterResults.reduce((sum, c) => sum + c.retentionScore, 0) / chapterResults.length;
    const wouldRecommend = avgRetention >= 7;

    const result: BetaSwarmResult = {
      chapterResults,
      overallEngagement: Math.round(avgRetention * 10) / 10,
      wouldRecommend,
      summaryReaction: avgRetention >= 8
        ? "Couldn't put it down! Would absolutely recommend."
        : avgRetention >= 6
          ? "Good read with some slow spots. Would recommend with caveats."
          : avgRetention >= 4
            ? "Had trouble staying engaged. Some good moments but needs work."
            : "Struggled to finish. Major engagement issues throughout.",
    };

    // Save results
    const saveStmt = db.prepare(`
      UPDATE editorial_reports
      SET beta_swarm_status = 'completed',
          beta_swarm_results = ?,
          beta_swarm_completed_at = ?,
          total_input_tokens = total_input_tokens + ?,
          total_output_tokens = total_output_tokens + ?
      WHERE id = ?
    `);
    saveStmt.run(
      JSON.stringify(result),
      new Date().toISOString(),
      totalInputTokens,
      totalOutputTokens,
      reportId
    );

    logger.info({ reportId, overallEngagement: result.overallEngagement }, '[VEB] Beta Swarm complete');

    return result;
  }

  /**
   * Module B: Ruthless Editor - Structural analysis
   */
  async runRuthlessEditor(reportId: string): Promise<RuthlessEditorResult> {
    logger.info({ reportId }, '[VEB] Running Ruthless Editor analysis');

    // Update status
    const updateStatusStmt = db.prepare(`
      UPDATE editorial_reports SET ruthless_editor_status = 'processing' WHERE id = ?
    `);
    updateStatusStmt.run(reportId);

    // Get report and project data
    const reportStmt = db.prepare(`
      SELECT er.*, p.genre, p.story_dna
      FROM editorial_reports er
      JOIN projects p ON er.project_id = p.id
      WHERE er.id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    // Get all chapters (active versions only)
    const chaptersStmt = db.prepare(`
      SELECT c.id, c.chapter_number, c.title, c.content, c.summary
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ? AND c.content IS NOT NULL
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY b.book_number, c.chapter_number
    `);
    const chapters = chaptersStmt.all(report.project_id) as any[];

    const chapterResults: RuthlessEditorChapterResult[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let majorIssuesCount = 0;

    for (const chapter of chapters) {
      const systemPrompt = `PERSONA: You are a senior developmental editor with 20 years of experience at major publishing houses. You've edited NYT bestsellers and have no patience for amateur mistakes. Your job is to make books better, not to make writers feel good.

TASK: Analyze this chapter with ruthless objectivity. Be specific. Quote the text. Don't sugarcoat.

ANALYSIS AREAS:
1. VALUE SHIFT: What's the emotional charge at scene start vs end? Good scenes have significant shifts.
2. EXPOSITION AUDIT: Flag "telling" vs "showing" violations, info dumps, on-the-nose dialogue.
3. PACING: Identify scenes that drag, rush, or don't advance the plot.
4. SCENE PURPOSE: Does this scene earn its place? Could the story work without it?

OUTPUT FORMAT (JSON):
{
  "valueShift": {
    "openingCharge": "tense/hopeful/etc",
    "closingCharge": "resolved/darker/etc",
    "shiftMagnitude": 1-10,
    "assessment": "Strong reversal" or "Flat, no change"
  },
  "expositionIssues": [
    {"location": "para 3", "issue": "telling_not_showing", "quote": "He felt angry", "suggestion": "Show anger through action", "severity": "moderate"}
  ],
  "pacingIssues": [
    {"location": "paras 5-8", "issue": "too_slow", "suggestion": "Trim backstory", "severity": "major"}
  ],
  "scenePurpose": {
    "earned": true/false,
    "reasoning": "Why this scene matters or doesn't",
    "recommendation": "Cut/Revise/Keep"
  }
}`;

      const userPrompt = `Chapter ${chapter.chapter_number}${chapter.title ? `: ${chapter.title}` : ''}

${chapter.summary ? `SUMMARY: ${chapter.summary}\n\n` : ''}FULL TEXT:
${chapter.content}

Provide your editorial analysis as JSON:`;

      try {
        const apiResponse = await claudeService.createCompletionWithUsage({
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 2500,
          temperature: 0.3, // Lower for consistent analytical output
        });

        totalInputTokens += apiResponse.usage?.input_tokens || 0;
        totalOutputTokens += apiResponse.usage?.output_tokens || 0;

        const parsed = extractJsonObject(apiResponse.content) as any;

        const chapterMajorIssues =
          (parsed?.expositionIssues?.filter((i: any) => i.severity === 'major')?.length || 0) +
          (parsed?.pacingIssues?.filter((i: any) => i.severity === 'major')?.length || 0) +
          (parsed?.scenePurpose?.earned === false ? 1 : 0);

        majorIssuesCount += chapterMajorIssues;

        chapterResults.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          valueShift: parsed?.valueShift || {
            openingCharge: 'unknown',
            closingCharge: 'unknown',
            shiftMagnitude: 5,
            assessment: 'Analysis unavailable',
          },
          expositionIssues: parsed?.expositionIssues || [],
          pacingIssues: parsed?.pacingIssues || [],
          scenePurpose: parsed?.scenePurpose || { earned: true, reasoning: 'Analysis unavailable' },
        });
      } catch (error: any) {
        logger.error({ error: error.message, chapterId: chapter.id }, '[VEB] Ruthless Editor chapter error');
        chapterResults.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          valueShift: { openingCharge: 'error', closingCharge: 'error', shiftMagnitude: 0, assessment: 'Error' },
          expositionIssues: [],
          pacingIssues: [],
          scenePurpose: { earned: true, reasoning: 'Error during analysis' },
        });
      }
    }

    // Calculate overall structure score
    const avgValueShift = chapterResults.reduce((sum, c) => sum + c.valueShift.shiftMagnitude, 0) / chapterResults.length;
    const earnedSceneRatio = chapterResults.filter(c => c.scenePurpose.earned).length / chapterResults.length;
    const structureScore = Math.round(((avgValueShift * 0.4) + (earnedSceneRatio * 10 * 0.6) - (majorIssuesCount * 0.5)) * 10) / 10;

    const result: RuthlessEditorResult = {
      chapterResults,
      overallStructureScore: Math.max(1, Math.min(10, structureScore)),
      majorIssuesCount,
      summaryVerdict: majorIssuesCount === 0
        ? "Solid structure. Minor polish needed but fundamentals are strong."
        : majorIssuesCount <= 3
          ? "Good bones with some structural issues to address."
          : majorIssuesCount <= 7
            ? "Significant structural problems. Needs revision before it's ready."
            : "Major structural overhaul required. Back to the drawing board on several chapters.",
    };

    // Save results
    const saveStmt = db.prepare(`
      UPDATE editorial_reports
      SET ruthless_editor_status = 'completed',
          ruthless_editor_results = ?,
          ruthless_editor_completed_at = ?,
          total_input_tokens = total_input_tokens + ?,
          total_output_tokens = total_output_tokens + ?
      WHERE id = ?
    `);
    saveStmt.run(
      JSON.stringify(result),
      new Date().toISOString(),
      totalInputTokens,
      totalOutputTokens,
      reportId
    );

    logger.info({ reportId, structureScore: result.overallStructureScore, majorIssues: majorIssuesCount }, '[VEB] Ruthless Editor complete');

    return result;
  }

  /**
   * Module C: Market Analyst - Commercial viability assessment
   */
  async runMarketAnalyst(reportId: string): Promise<MarketAnalystResult> {
    logger.info({ reportId }, '[VEB] Running Market Analyst analysis');

    // Update status
    const updateStatusStmt = db.prepare(`
      UPDATE editorial_reports SET market_analyst_status = 'processing' WHERE id = ?
    `);
    updateStatusStmt.run(reportId);

    // Get report and project data
    const reportStmt = db.prepare(`
      SELECT er.*, p.title, p.genre, p.story_dna, p.story_concept, p.story_bible
      FROM editorial_reports er
      JOIN projects p ON er.project_id = p.id
      WHERE er.id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    const storyDNA = report.story_dna ? JSON.parse(report.story_dna) : {};
    const storyConcept = report.story_concept ? JSON.parse(report.story_concept) : {};
    const storyBible = report.story_bible ? JSON.parse(report.story_bible) : {};

    // Get first 3 chapters and overall summary (active versions only)
    const chaptersStmt = db.prepare(`
      SELECT c.chapter_number, c.title, c.content, c.summary
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ? AND c.content IS NOT NULL
        AND (c.version_id IS NULL OR bv.is_active = 1)
      ORDER BY b.book_number, c.chapter_number
      LIMIT 3
    `);
    const firstChapters = chaptersStmt.all(report.project_id) as any[];

    const genre = storyDNA.genre || report.genre || 'fiction';
    const subgenre = storyDNA.subgenre || '';
    const themes = storyDNA.themes || [];

    const systemPrompt = `PERSONA: You are a literary agent at a top agency. You've reviewed thousands of manuscripts and know exactly what sells. You think in terms of market positioning, comp titles, and commercial hooks.

TASK: Evaluate this manuscript's commercial viability. Be honest about marketability - publishers don't buy "good enough."

ANALYSIS AREAS:
1. COMP TITLES: 3-5 comparable published books (2020-present). Why is this similar?
2. HOOK ANALYSIS: Grade the opening line, paragraph, and chapter (1-10 each).
3. TROPE ANALYSIS: Identify genre tropes. Are they fresh or overdone?
4. MARKET POSITIONING: Who buys this? How do we sell it?

OUTPUT FORMAT (JSON):
{
  "compTitles": [
    {"title": "Book Name", "author": "Author", "year": 2023, "similarity": "Why similar", "whatWorks": "What sells about it"}
  ],
  "hookAnalysis": {
    "openingLineScore": 1-10,
    "openingParagraphScore": 1-10,
    "openingChapterScore": 1-10,
    "openingLine": "The actual first line",
    "strengths": ["What works"],
    "weaknesses": ["What doesn't"],
    "suggestedRewrite": "If needed, a stronger opening line"
  },
  "tropeAnalysis": [
    {"trope": "Enemies to Lovers", "freshness": "familiar", "execution": "good", "notes": "Well-executed classic"}
  ],
  "marketPositioning": {
    "primaryAudience": "Who buys this",
    "secondaryAudience": "Who else might",
    "marketingAngle": "One-line pitch",
    "uniqueSellingPoint": "What makes it stand out",
    "potentialChallenges": ["Market concerns"]
  },
  "commercialViabilityScore": 1-10,
  "agentRecommendation": "strong_yes|yes_with_revisions|maybe|pass",
  "summaryPitch": "The elevator pitch I'd use"
}`;

    const userPrompt = `PROJECT: ${report.title}
GENRE: ${genre}${subgenre ? ` / ${subgenre}` : ''}
THEMES: ${themes.join(', ') || 'Not specified'}

LOGLINE: ${storyConcept.logline || 'Not available'}

SYNOPSIS: ${storyConcept.synopsis || 'Not available'}

CHARACTERS:
${(storyBible.characters || []).slice(0, 5).map((c: any) => `- ${c.name} (${c.role}): ${c.physicalDescription || 'No description'}`).join('\n')}

FIRST THREE CHAPTERS:

${firstChapters.map(c => `--- CHAPTER ${c.chapter_number}${c.title ? `: ${c.title}` : ''} ---
${c.content?.slice(0, 3000)}${c.content?.length > 3000 ? '...[truncated]' : ''}`).join('\n\n')}

Provide your market analysis as JSON:`;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      const apiResponse = await claudeService.createCompletionWithUsage({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 3000,
        temperature: 0.4,
      });

      totalInputTokens = apiResponse.usage?.input_tokens || 0;
      totalOutputTokens = apiResponse.usage?.output_tokens || 0;

      const parsed = extractJsonObject(apiResponse.content) as any;

      const result: MarketAnalystResult = {
        compTitles: parsed?.compTitles || [],
        hookAnalysis: parsed?.hookAnalysis || {
          openingLineScore: 5,
          openingParagraphScore: 5,
          openingChapterScore: 5,
          openingLine: firstChapters[0]?.content?.split('\n')[0] || '',
          strengths: [],
          weaknesses: [],
        },
        tropeAnalysis: parsed?.tropeAnalysis || [],
        marketPositioning: parsed?.marketPositioning || {
          primaryAudience: 'Unknown',
          secondaryAudience: 'Unknown',
          marketingAngle: 'Needs development',
          uniqueSellingPoint: 'Needs identification',
          potentialChallenges: [],
        },
        commercialViabilityScore: parsed?.commercialViabilityScore || 5,
        agentRecommendation: parsed?.agentRecommendation || 'maybe',
        summaryPitch: parsed?.summaryPitch || 'Pitch needs development',
      };

      // Save results
      const saveStmt = db.prepare(`
        UPDATE editorial_reports
        SET market_analyst_status = 'completed',
            market_analyst_results = ?,
            market_analyst_completed_at = ?,
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?
        WHERE id = ?
      `);
      saveStmt.run(
        JSON.stringify(result),
        new Date().toISOString(),
        totalInputTokens,
        totalOutputTokens,
        reportId
      );

      logger.info({ reportId, commercialScore: result.commercialViabilityScore, recommendation: result.agentRecommendation }, '[VEB] Market Analyst complete');

      return result;
    } catch (error: any) {
      logger.error({ error: error.message }, '[VEB] Market Analyst error');

      const saveStmt = db.prepare(`
        UPDATE editorial_reports SET market_analyst_status = 'failed' WHERE id = ?
      `);
      saveStmt.run(reportId);

      throw error;
    }
  }

  /**
   * Finalize the report after all modules complete
   */
  async finalizeReport(reportId: string): Promise<EditorialReport> {
    logger.info({ reportId }, '[VEB] Finalizing editorial report');

    const reportStmt = db.prepare(`
      SELECT * FROM editorial_reports WHERE id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    const betaSwarm = report.beta_swarm_results ? JSON.parse(report.beta_swarm_results) as BetaSwarmResult : null;
    const ruthlessEditor = report.ruthless_editor_results ? JSON.parse(report.ruthless_editor_results) as RuthlessEditorResult : null;
    const marketAnalyst = report.market_analyst_results ? JSON.parse(report.market_analyst_results) as MarketAnalystResult : null;

    // Calculate overall score (weighted average)
    let overallScore = 50; // Default
    if (betaSwarm && ruthlessEditor && marketAnalyst) {
      overallScore = Math.round(
        (betaSwarm.overallEngagement * 10 * 0.35) +
        (ruthlessEditor.overallStructureScore * 10 * 0.35) +
        (marketAnalyst.commercialViabilityScore * 10 * 0.30)
      );
    }

    // Generate summary and recommendations
    const recommendations: string[] = [];

    if (betaSwarm) {
      const lowEngagementChapters = betaSwarm.chapterResults.filter(c => c.retentionScore < 6);
      if (lowEngagementChapters.length > 0) {
        recommendations.push(`Revise chapters ${lowEngagementChapters.map(c => c.chapterNumber).join(', ')} for better reader engagement`);
      }
      const highDnfRisk = betaSwarm.chapterResults.filter(c => c.dnfRiskPoints.some(d => d.severity === 'high'));
      if (highDnfRisk.length > 0) {
        recommendations.push(`Address high DNF risk points in chapters ${highDnfRisk.map(c => c.chapterNumber).join(', ')}`);
      }
    }

    if (ruthlessEditor) {
      if (ruthlessEditor.majorIssuesCount > 5) {
        recommendations.push('Major structural revision needed before submission');
      }
      const unearnedScenes = ruthlessEditor.chapterResults.filter(c => !c.scenePurpose.earned);
      if (unearnedScenes.length > 0) {
        recommendations.push(`Evaluate necessity of chapters ${unearnedScenes.map(c => c.chapterNumber).join(', ')}`);
      }
    }

    if (marketAnalyst) {
      if (marketAnalyst.hookAnalysis.openingLineScore < 7) {
        recommendations.push('Strengthen opening line - first impression is critical');
      }
      if (marketAnalyst.agentRecommendation === 'pass') {
        recommendations.push('Significant revision needed before querying agents');
      }
    }

    const summary = `Overall Score: ${overallScore}/100. ` +
      `Engagement: ${betaSwarm?.overallEngagement || 'N/A'}/10. ` +
      `Structure: ${ruthlessEditor?.overallStructureScore || 'N/A'}/10. ` +
      `Commercial: ${marketAnalyst?.commercialViabilityScore || 'N/A'}/10. ` +
      `Agent Recommendation: ${marketAnalyst?.agentRecommendation || 'N/A'}.`;

    // Update report
    const updateStmt = db.prepare(`
      UPDATE editorial_reports
      SET status = 'completed',
          overall_score = ?,
          summary = ?,
          recommendations = ?,
          completed_at = ?
      WHERE id = ?
    `);
    updateStmt.run(
      overallScore,
      summary,
      JSON.stringify(recommendations),
      new Date().toISOString(),
      reportId
    );

    logger.info({ reportId, overallScore }, '[VEB] Editorial report finalized');

    return {
      id: report.id,
      projectId: report.project_id,
      status: 'completed',
      betaSwarm: betaSwarm || undefined,
      ruthlessEditor: ruthlessEditor || undefined,
      marketAnalyst: marketAnalyst || undefined,
      overallScore,
      summary,
      recommendations,
      createdAt: report.created_at,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the status of a report
   */
  getReportStatus(reportId: string): {
    status: string;
    modules: { betaSwarm: string; ruthlessEditor: string; marketAnalyst: string };
    progress: number;
  } {
    const reportStmt = db.prepare(`
      SELECT status, beta_swarm_status, ruthless_editor_status, market_analyst_status
      FROM editorial_reports WHERE id = ?
    `);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      throw new Error('Report not found');
    }

    const completedModules = [
      report.beta_swarm_status === 'completed',
      report.ruthless_editor_status === 'completed',
      report.market_analyst_status === 'completed',
    ].filter(Boolean).length;

    return {
      status: report.status,
      modules: {
        betaSwarm: report.beta_swarm_status,
        ruthlessEditor: report.ruthless_editor_status,
        marketAnalyst: report.market_analyst_status,
      },
      progress: Math.round((completedModules / 3) * 100),
    };
  }

  /**
   * Get the full report
   */
  getReport(reportId: string): EditorialReport | null {
    const reportStmt = db.prepare(`SELECT * FROM editorial_reports WHERE id = ?`);
    const report = reportStmt.get(reportId) as any;

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      projectId: report.project_id,
      status: report.status,
      betaSwarm: report.beta_swarm_results ? JSON.parse(report.beta_swarm_results) : undefined,
      ruthlessEditor: report.ruthless_editor_results ? JSON.parse(report.ruthless_editor_results) : undefined,
      marketAnalyst: report.market_analyst_results ? JSON.parse(report.market_analyst_results) : undefined,
      overallScore: report.overall_score,
      summary: report.summary,
      recommendations: report.recommendations ? JSON.parse(report.recommendations) : undefined,
      createdAt: report.created_at,
      completedAt: report.completed_at,
      error: report.error,
    };
  }

  /**
   * Get reports for a project
   */
  getProjectReports(projectId: string): EditorialReport[] {
    const reportsStmt = db.prepare(`
      SELECT * FROM editorial_reports WHERE project_id = ? ORDER BY created_at DESC
    `);
    const reports = reportsStmt.all(projectId) as any[];

    return reports.map(report => ({
      id: report.id,
      projectId: report.project_id,
      status: report.status,
      betaSwarm: report.beta_swarm_results ? JSON.parse(report.beta_swarm_results) : undefined,
      ruthlessEditor: report.ruthless_editor_results ? JSON.parse(report.ruthless_editor_results) : undefined,
      marketAnalyst: report.market_analyst_results ? JSON.parse(report.market_analyst_results) : undefined,
      overallScore: report.overall_score,
      summary: report.summary,
      recommendations: report.recommendations ? JSON.parse(report.recommendations) : undefined,
      createdAt: report.created_at,
      completedAt: report.completed_at,
      error: report.error,
    }));
  }
}

// Export singleton
export const vebService = new VEBService();
