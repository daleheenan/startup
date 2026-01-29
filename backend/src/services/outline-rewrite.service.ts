/**
 * Outline Rewrite Service
 *
 * Uses Claude AI to rewrite plot structure and outline based on editorial recommendations.
 * Creates a new version to preserve the original content before applying changes.
 */

import { claudeService } from './claude.service.js';
import { bookVersioningService, type BookVersion } from './book-versioning.service.js';
import db from '../db/connection.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';

const logger = createLogger('services:outline-rewrite');

// ============================================================================
// Type Definitions
// ============================================================================

export interface RewriteChange {
  area: 'plot' | 'outline';
  type: 'added' | 'modified' | 'removed';
  description: string;
}

export interface OutlineRewriteResult {
  success: boolean;
  newVersionId: string;
  changes: RewriteChange[];
  tokenUsage: { input: number; output: number };
}

export interface TokenEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  plotSize: { layers: number; points: number };
  outlineSize: { acts: number; chapters: number; scenes: number };
  recommendationsCount: number;
}

interface RewriteJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  step?: string;
  progress?: number;
  message?: string;
  newVersionId?: string;
  changes?: RewriteChange[];
  tokenUsage?: { input: number; output: number };
  error?: string;
}

interface PlotRewriteResponse {
  plot_layers: any[];
  act_structure?: any;
  changes_made: { type: string; description: string }[];
}

interface OutlineRewriteResponse {
  type: string;
  acts: any[];
  changes_made: { type: string; description: string }[];
}

// ============================================================================
// Outline Rewrite Service Class
// ============================================================================

export class OutlineRewriteService {
  /**
   * Estimate token usage for a rewrite operation
   */
  async estimateTokenUsage(projectId: string): Promise<TokenEstimate> {
    logger.info({ projectId }, '[OutlineRewrite] Estimating token usage');

    // Get project data
    const project = db.prepare(`
      SELECT p.id, p.plot_structure
      FROM projects p WHERE p.id = ?
    `).get(projectId) as any;

    if (!project) {
      throw new Error('Project not found');
    }

    // Get outline
    const outline = db.prepare(`
      SELECT o.structure FROM outlines o
      JOIN books b ON o.book_id = b.id
      WHERE b.project_id = ?
      LIMIT 1
    `).get(projectId) as any;

    // Get recommendations from latest editorial report
    const report = db.prepare(`
      SELECT recommendations FROM outline_editorial_reports
      WHERE project_id = ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 1
    `).get(projectId) as any;

    // Parse data
    const plotStructure = project.plot_structure ? JSON.parse(project.plot_structure) : null;
    const outlineStructure = outline?.structure ? JSON.parse(outline.structure) : null;
    const recommendations = report?.recommendations ? JSON.parse(report.recommendations) : [];

    // Calculate sizes
    const plotLayers = plotStructure?.plot_layers || [];
    const plotPoints = plotLayers.reduce((acc: number, layer: any) =>
      acc + (layer.points?.length || 0), 0);

    const acts = outlineStructure?.acts || [];
    const chapters = acts.reduce((acc: number, act: any) =>
      acc + (act.chapters?.length || 0), 0);
    const scenes = acts.reduce((acc: number, act: any) =>
      acc + (act.chapters?.reduce((cAcc: number, ch: any) =>
        cAcc + (ch.scenes?.length || 0), 0) || 0), 0);

    // Estimate tokens (rough approximation)
    // Plot structure: ~50 tokens per plot point
    // Outline: ~100 tokens per chapter, ~30 tokens per scene
    const plotInputTokens = 500 + (plotPoints * 50);
    const outlineInputTokens = 1000 + (chapters * 100) + (scenes * 30);
    const recommendationsTokens = recommendations.length * 50;
    const systemPromptTokens = 500;

    const estimatedInputTokens = plotInputTokens + outlineInputTokens + recommendationsTokens + (systemPromptTokens * 2);
    const estimatedOutputTokens = Math.round(estimatedInputTokens * 0.8); // Output typically 80% of input

    // Cost estimate (Claude 3.5 Sonnet pricing)
    // Input: $3 per million tokens, Output: $15 per million tokens
    const inputCost = (estimatedInputTokens / 1_000_000) * 3;
    const outputCost = (estimatedOutputTokens / 1_000_000) * 15;
    const estimatedCost = Math.round((inputCost + outputCost) * 100) / 100;

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
      plotSize: { layers: plotLayers.length, points: plotPoints },
      outlineSize: { acts: acts.length, chapters, scenes },
      recommendationsCount: recommendations.length,
    };
  }

  /**
   * Get rewrite job status from the jobs table
   */
  async getRewriteStatus(projectId: string): Promise<RewriteJobStatus | null> {
    // Check for active job
    const job = db.prepare(`
      SELECT j.*, r.id as report_id
      FROM jobs j
      JOIN outline_editorial_reports r ON j.target_id = r.id
      WHERE j.type = 'outline_rewrite'
        AND r.project_id = ?
      ORDER BY j.created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!job) {
      return null;
    }

    // Parse checkpoint for progress info
    const checkpoint = job.checkpoint ? JSON.parse(job.checkpoint) : null;

    const statusMap: Record<string, RewriteJobStatus> = {
      pending: {
        status: 'pending',
        step: 'queued',
        progress: 0,
        message: 'Rewrite job queued...',
      },
      running: {
        status: 'processing',
        step: checkpoint?.step || 'processing',
        progress: checkpoint?.progress || 25,
        message: checkpoint?.message || 'Processing...',
      },
      completed: {
        status: 'completed',
        step: 'completed',
        progress: 100,
        message: 'Rewrite completed successfully',
        newVersionId: checkpoint?.newVersionId,
        changes: checkpoint?.changes,
        tokenUsage: checkpoint?.tokenUsage,
      },
      failed: {
        status: 'failed',
        step: 'failed',
        progress: 0,
        message: 'Rewrite failed',
        error: job.error || 'Unknown error',
      },
    };

    return statusMap[job.status] || { status: 'pending', progress: 0 };
  }

  /**
   * Main rewrite method - called by the queue worker
   */
  async rewritePlotAndOutline(reportId: string): Promise<OutlineRewriteResult> {
    logger.info({ reportId }, '[OutlineRewrite] Starting rewrite');

    let newVersionId: string | null = null;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allChanges: RewriteChange[] = [];

    try {
      // 1. Fetch all required data
      const { project, book, outline, report, structureResults, characterResults, marketResults } =
        await this.fetchRewriteData(reportId);

      const projectId = project.id;
      const plotStructure = project.plot_structure ? JSON.parse(project.plot_structure) : null;
      const outlineStructure = outline?.structure ? JSON.parse(outline.structure) : null;
      const recommendations = report.recommendations ? JSON.parse(report.recommendations) : [];

      if (!plotStructure || !outlineStructure) {
        throw new Error('Plot structure or outline not found');
      }

      // 2. Create new version (snapshots current state)
      logger.info({ projectId, bookId: book.id }, '[OutlineRewrite] Creating new version');
      const version = await bookVersioningService.createVersion(book.id, {
        name: 'AI Rewrite',
        autoCreated: true,
      });
      newVersionId = version.id;
      logger.info({ newVersionId }, '[OutlineRewrite] Version created');

      // 3. Rewrite plot structure
      logger.info({ reportId }, '[OutlineRewrite] Rewriting plot structure');
      const plotResult = await this.rewritePlotStructure(
        plotStructure,
        recommendations,
        structureResults
      );
      totalInputTokens += plotResult.tokenUsage.input;
      totalOutputTokens += plotResult.tokenUsage.output;

      // Add plot changes
      plotResult.changes.forEach(change => {
        allChanges.push({
          area: 'plot',
          type: change.type as 'added' | 'modified' | 'removed',
          description: change.description,
        });
      });

      // 4. Rewrite outline structure
      logger.info({ reportId }, '[OutlineRewrite] Rewriting outline structure');
      const outlineResult = await this.rewriteOutlineStructure(
        outlineStructure,
        recommendations,
        characterResults,
        marketResults,
        plotResult.rewrittenPlot
      );
      totalInputTokens += outlineResult.tokenUsage.input;
      totalOutputTokens += outlineResult.tokenUsage.output;

      // Add outline changes
      outlineResult.changes.forEach(change => {
        allChanges.push({
          area: 'outline',
          type: change.type as 'added' | 'modified' | 'removed',
          description: change.description,
        });
      });

      // 5. Save rewritten data
      logger.info({ reportId }, '[OutlineRewrite] Saving rewritten data');

      // Update project plot_structure
      db.prepare(`
        UPDATE projects SET plot_structure = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(plotResult.rewrittenPlot), projectId);

      // Update outline structure
      db.prepare(`
        UPDATE outlines SET structure = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(outlineResult.rewrittenOutline), outline.id);

      // Update version stats
      await bookVersioningService.updateVersionStats(newVersionId);

      logger.info({
        reportId,
        newVersionId,
        changesCount: allChanges.length,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      }, '[OutlineRewrite] Rewrite completed successfully');

      return {
        success: true,
        newVersionId,
        changes: allChanges,
        tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
      };

    } catch (error: any) {
      logger.error({ error: error.message, reportId, newVersionId }, '[OutlineRewrite] Error during rewrite');

      // Rollback: delete the new version if it was created
      if (newVersionId) {
        try {
          const book = db.prepare(`
            SELECT b.id FROM books b
            JOIN projects p ON b.project_id = p.id
            JOIN outline_editorial_reports r ON r.project_id = p.id
            WHERE r.id = ?
            LIMIT 1
          `).get(reportId) as any;

          if (book) {
            await bookVersioningService.deleteVersion(book.id, newVersionId, true);
            logger.info({ newVersionId }, '[OutlineRewrite] Rolled back: deleted new version');
          }
        } catch (rollbackError: any) {
          logger.error({ error: rollbackError.message }, '[OutlineRewrite] Error during rollback');
        }
      }

      throw error;
    }
  }

  /**
   * Fetch all data needed for rewrite
   */
  private async fetchRewriteData(reportId: string): Promise<{
    project: any;
    book: any;
    outline: any;
    report: any;
    structureResults: any;
    characterResults: any;
    marketResults: any;
  }> {
    const report = db.prepare(`
      SELECT * FROM outline_editorial_reports WHERE id = ?
    `).get(reportId) as any;

    if (!report) {
      throw new Error('Editorial report not found');
    }

    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(report.project_id) as any;

    if (!project) {
      throw new Error('Project not found');
    }

    const book = db.prepare(`
      SELECT * FROM books WHERE project_id = ? LIMIT 1
    `).get(project.id) as any;

    if (!book) {
      throw new Error('Book not found');
    }

    const outline = db.prepare(`
      SELECT * FROM outlines WHERE book_id = ?
    `).get(book.id) as any;

    if (!outline) {
      throw new Error('Outline not found');
    }

    return {
      project,
      book,
      outline,
      report,
      structureResults: report.structure_analyst_results ? JSON.parse(report.structure_analyst_results) : null,
      characterResults: report.character_arc_results ? JSON.parse(report.character_arc_results) : null,
      marketResults: report.market_fit_results ? JSON.parse(report.market_fit_results) : null,
    };
  }

  /**
   * Rewrite plot structure using Claude
   */
  private async rewritePlotStructure(
    currentPlot: any,
    recommendations: string[],
    structureResults: any
  ): Promise<{
    rewrittenPlot: any;
    changes: { type: string; description: string }[];
    tokenUsage: { input: number; output: number };
  }> {
    // Filter structure-related recommendations
    const structureRecs = recommendations.filter(r =>
      r.toLowerCase().includes('structure') ||
      r.toLowerCase().includes('plot') ||
      r.toLowerCase().includes('pacing')
    );

    const prompt = this.buildPlotRewritePrompt(currentPlot, structureRecs, structureResults);

    const response = await claudeService.createCompletionWithUsage({
      system: `You are a senior developmental editor with expertise in commercial fiction structure.
You must use UK British spelling throughout your response.
Return ONLY valid JSON, no additional text or markdown.`,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8000,
      temperature: 0.4,
    });

    const result = extractJsonObject<PlotRewriteResponse>(response.content);

    if (!result || !result.plot_layers) {
      throw new Error('Failed to parse plot rewrite response');
    }

    // Merge rewritten data with original structure
    const rewrittenPlot = {
      ...currentPlot,
      plot_layers: result.plot_layers,
      act_structure: result.act_structure || currentPlot.act_structure,
    };

    return {
      rewrittenPlot,
      changes: result.changes_made || [],
      tokenUsage: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
    };
  }

  /**
   * Build the prompt for plot rewrite
   */
  private buildPlotRewritePrompt(
    currentPlot: any,
    recommendations: string[],
    structureResults: any
  ): string {
    const weaknesses = structureResults?.plotStructureAnalysis?.weaknesses || [];
    const missingBeats = structureResults?.plotStructureAnalysis?.missingBeats || [];
    const pacingSuggestions = structureResults?.pacingAssessment?.suggestions || [];

    return `You are rewriting a novel's plot structure to address editorial feedback.

CURRENT PLOT STRUCTURE:
${JSON.stringify(currentPlot, null, 2)}

EDITORIAL RECOMMENDATIONS TO ADDRESS:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

STRUCTURE ANALYST FINDINGS:
Weaknesses:
${weaknesses.map((w: string) => `- ${w}`).join('\n') || 'None identified'}

Missing Story Beats:
${missingBeats.map((b: string) => `- ${b}`).join('\n') || 'None identified'}

Pacing Suggestions:
${pacingSuggestions.map((s: string) => `- ${s}`).join('\n') || 'None'}

REQUIREMENTS:
1. Maintain the same plot_layers array structure with type, name, premise, stakes, and points
2. Address the identified weaknesses by strengthening weak elements
3. Add any missing story beats to appropriate plot layers
4. Adjust chapter_number assignments in plot points if pacing requires it
5. Preserve the story's core premise, characters, and themes
6. Use UK British spelling throughout

Return a JSON object with this exact structure:
{
  "plot_layers": [
    {
      "type": "main|subplot|character_arc|theme|mystery",
      "name": "string",
      "premise": "string",
      "stakes": "string",
      "points": [
        {
          "name": "string",
          "description": "string",
          "chapter_number": number
        }
      ]
    }
  ],
  "act_structure": {
    "act1_end_chapter": number,
    "midpoint_chapter": number,
    "act2_end_chapter": number
  },
  "changes_made": [
    { "type": "added|modified|removed", "description": "What was changed and why" }
  ]
}`;
  }

  /**
   * Rewrite outline structure using Claude
   */
  private async rewriteOutlineStructure(
    currentOutline: any,
    recommendations: string[],
    characterResults: any,
    marketResults: any,
    rewrittenPlot: any
  ): Promise<{
    rewrittenOutline: any;
    changes: { type: string; description: string }[];
    tokenUsage: { input: number; output: number };
  }> {
    // Filter character and market recommendations
    const relevantRecs = recommendations.filter(r =>
      r.toLowerCase().includes('character') ||
      r.toLowerCase().includes('market') ||
      r.toLowerCase().includes('arc') ||
      r.toLowerCase().includes('audience')
    );

    const prompt = this.buildOutlineRewritePrompt(
      currentOutline,
      relevantRecs,
      characterResults,
      marketResults,
      rewrittenPlot
    );

    const response = await claudeService.createCompletionWithUsage({
      system: `You are a master story architect specialising in commercial fiction.
You must use UK British spelling throughout your response.
Return ONLY valid JSON, no additional text or markdown.`,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 16000,
      temperature: 0.4,
    });

    const result = extractJsonObject<OutlineRewriteResponse>(response.content);

    if (!result || !result.acts) {
      throw new Error('Failed to parse outline rewrite response');
    }

    // Merge rewritten data with original structure
    const rewrittenOutline = {
      ...currentOutline,
      type: result.type || currentOutline.type,
      acts: result.acts,
    };

    return {
      rewrittenOutline,
      changes: result.changes_made || [],
      tokenUsage: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
      },
    };
  }

  /**
   * Build the prompt for outline rewrite
   */
  private buildOutlineRewritePrompt(
    currentOutline: any,
    recommendations: string[],
    characterResults: any,
    marketResults: any,
    rewrittenPlot: any
  ): string {
    const protagonistMissing = characterResults?.protagonistArc?.missingElements || [];
    const consistencyIssues = characterResults?.characterConsistencyIssues || [];
    const marketConcerns = marketResults?.concerns || [];

    return `You are rewriting a novel's outline structure to address editorial feedback.
The plot structure has already been revised - you must align the outline with these changes.

REVISED PLOT STRUCTURE (align outline with this):
${JSON.stringify(rewrittenPlot, null, 2)}

CURRENT OUTLINE STRUCTURE:
${JSON.stringify(currentOutline, null, 2)}

EDITORIAL RECOMMENDATIONS TO ADDRESS:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

CHARACTER ARC FINDINGS:
Protagonist Missing Elements:
${protagonistMissing.map((e: string) => `- ${e}`).join('\n') || 'None identified'}

Character Consistency Issues:
${consistencyIssues.map((i: any) => `- ${i.character} (Ch ${i.chapterNumber}): ${i.issue}`).join('\n') || 'None identified'}

MARKET FIT CONCERNS:
${marketConcerns.map((c: any) => `- ${c.area}: ${c.concern} (${c.severity})`).join('\n') || 'None identified'}

REQUIREMENTS:
1. Maintain the StoryStructure format with type and acts array
2. Update chapter summaries to align with the revised plot structure
3. Strengthen character arcs by adding missing elements to relevant chapters
4. Fix any character consistency issues
5. Address market concerns by adjusting pacing and hook placement
6. Preserve all scene cards but update their goals, conflicts, and outcomes as needed
7. Use UK British spelling throughout

Return a JSON object with this exact structure:
{
  "type": "${currentOutline.type || 'three_act'}",
  "acts": [
    {
      "number": number,
      "name": "string",
      "description": "string",
      "targetWordCount": number,
      "chapters": [
        {
          "number": number,
          "title": "string",
          "summary": "string",
          "actNumber": number,
          "beatName": "string",
          "povCharacter": "string",
          "wordCountTarget": number,
          "scenes": [
            {
              "id": "string",
              "order": number,
              "location": "string",
              "characters": ["string"],
              "povCharacter": "string",
              "timeOfDay": "string",
              "goal": "string",
              "conflict": "string",
              "outcome": "string",
              "emotionalBeat": "string",
              "notes": "string"
            }
          ]
        }
      ]
    }
  ],
  "changes_made": [
    { "type": "added|modified|removed", "description": "What was changed and why" }
  ]
}`;
  }
}

export const outlineRewriteService = new OutlineRewriteService();
