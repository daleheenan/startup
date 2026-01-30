/**
 * Project Plot Routes
 * Handles plot structure, coherence checks, originality checks, and plot generation
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import type { Project } from '../../shared/types/index.js';
import { randomUUID } from 'crypto';
import { createLogger } from '../../services/logger.service.js';
import { safeJsonParse, syncPlotStructureToActiveVersions, calculateStringSimilarity, findSimilarValue, getPlotColor, escapeRegex } from './utils.js';
import { metricsService } from '../../services/metrics.service.js';
import { AI_REQUEST_TYPES } from '../../constants/ai-request-types.js';

const router = Router();
const logger = createLogger('routes:projects:plot');

/**
 * GET /api/projects/:id/plot-structure
 * Get plot structure for a project
 */
router.get('/:id/plot-structure', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const stmt = db.prepare<[string], any>(`
      SELECT plot_structure FROM projects WHERE id = ?
    `);
    const project = stmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const plotStructure = safeJsonParse(project.plot_structure, {
      plot_layers: [],
      act_structure: {
        act_one_end: 5,
        act_two_midpoint: 12,
        act_two_end: 20,
        act_three_climax: 23,
      },
    });

    res.json(plotStructure);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching plot structure');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/projects/:id/plot-structure
 * Update plot structure for multi-layered story tracking
 */
router.put('/:id/plot-structure', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { plot_structure } = req.body;

    if (!plot_structure) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plot_structure is required' },
      });
    }

    if (plot_structure.plot_layers && !Array.isArray(plot_structure.plot_layers)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plot_layers must be an array' },
      });
    }

    const updateStmt = db.prepare(`
      UPDATE projects
      SET plot_structure = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(plot_structure), new Date().toISOString(), projectId);

    logger.info({ projectId, layerCount: plot_structure.plot_layers?.length || 0 }, 'Plot structure updated');

    // Trigger background coherence check if plot layers exist
    if (plot_structure.plot_layers && plot_structure.plot_layers.length > 0) {
      const existingJob = db.prepare<[string], { id: string }>(`
        SELECT id FROM jobs
        WHERE target_id = ? AND type = 'coherence_check' AND status IN ('pending', 'running')
        LIMIT 1
      `).get(projectId);

      if (!existingJob) {
        const jobId = randomUUID();
        db.prepare(`
          INSERT INTO jobs (id, type, target_id, status, attempts)
          VALUES (?, 'coherence_check', ?, 'pending', 0)
        `).run(jobId, projectId);

        logger.info({ projectId, jobId }, 'Queued background coherence check');
      }

      const existingOriginalityJob = db.prepare<[string], { id: string }>(`
        SELECT id FROM jobs
        WHERE target_id = ? AND type = 'originality_check' AND status IN ('pending', 'running')
        LIMIT 1
      `).get(projectId);

      if (!existingOriginalityJob) {
        const originalityJobId = randomUUID();
        db.prepare(`
          INSERT INTO jobs (id, type, target_id, status, attempts)
          VALUES (?, 'originality_check', ?, 'pending', 0)
        `).run(originalityJobId, projectId);

        logger.info({ projectId, jobId: originalityJobId }, 'Queued background originality check');
      }
    }

    // Sync plot structure to active versions
    syncPlotStructureToActiveVersions(projectId, plot_structure);

    res.json({ success: true, plot_structure });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating plot structure');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/validate-plot-coherence
 * Validate that plots are coherent with the story concept and DNA
 */
router.post('/:id/validate-plot-coherence', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const projectStmt = db.prepare<[string], any>(`
      SELECT title, genre, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna, null);
    const storyBible = safeJsonParse(project.story_bible, null);
    const plotStructure = safeJsonParse(project.plot_structure, { plot_layers: [] });

    if (!plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
      return res.json({
        isCoherent: false,
        warnings: ['No plots defined. Your story needs at least a main plot to generate a quality outline.'],
        suggestions: ['Visit the Plot page to define your main plot and subplots.'],
      });
    }

    const hasMainPlot = plotStructure.plot_layers.some((l: any) => l.type === 'main');
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!hasMainPlot) {
      warnings.push('No main plot (golden thread) defined. Every novel needs a central narrative arc.');
      suggestions.push('Convert one of your subplots to main plot, or create a new main plot that ties everything together.');
    }

    const storyContext = `
Title: ${project.title}
Genre: ${project.genre}
${storyDNA?.themes?.length > 0 ? `Themes: ${storyDNA.themes.join(', ')}` : ''}
${storyDNA?.tone ? `Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length > 0 ? `Main Characters: ${storyBible.characters.slice(0, 5).map((c: any) => c.name).join(', ')}` : ''}
    `.trim();

    const plotSummaries = plotStructure.plot_layers.map((p: any) =>
      `- ${p.name} (${p.type}): ${p.description}`
    ).join('\n');

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `You are a story coherence validator. Analyze whether these plots fit the story concept.

**Story Context:**
${storyContext}

**Defined Plots:**
${plotSummaries}

Evaluate:
1. Does each plot fit the genre (${project.genre})?
2. Are plots thematically consistent with the story?
3. Are there any plots that seem out of place or contradictory?
4. Are character arcs connected to characters in the story?

Return ONLY a JSON object:
{
  "isCoherent": true/false,
  "plotAnalysis": [
    {
      "plotName": "Plot name",
      "isCoherent": true/false,
      "reason": "Brief explanation"
    }
  ],
  "overallWarnings": ["Any warnings about the plot structure"],
  "suggestions": ["Actionable suggestions for improvement"]
}`,
      }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Validating plot coherence with story concept'
      });
    }

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.json({
        isCoherent: hasMainPlot,
        warnings: warnings,
        suggestions: suggestions,
        plotAnalysis: [],
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    const finalWarnings = [...warnings, ...(analysis.overallWarnings || [])];
    const finalSuggestions = [...suggestions, ...(analysis.suggestions || [])];

    const incoherentPlots = (analysis.plotAnalysis || []).filter((p: any) => !p.isCoherent);
    incoherentPlots.forEach((p: any) => {
      finalWarnings.push(`"${p.plotName}" may not fit: ${p.reason}`);
    });

    res.json({
      isCoherent: hasMainPlot && (analysis.isCoherent ?? true) && incoherentPlots.length === 0,
      warnings: finalWarnings,
      suggestions: finalSuggestions,
      plotAnalysis: analysis.plotAnalysis || [],
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error validating plot coherence');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/coherence-check
 * Get the latest cached coherence check result
 */
router.get('/:id/coherence-check', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const bookData = db.prepare<[string], { book_id: string }>(`
      SELECT b.id as book_id
      FROM books b
      WHERE b.project_id = ?
      ORDER BY b.book_number
      LIMIT 1
    `).get(projectId);

    let activeVersionId: string | null = null;
    if (bookData?.book_id) {
      const activeVersion = db.prepare<[string], { id: string }>(`
        SELECT id FROM book_versions WHERE book_id = ? AND is_active = 1
      `).get(bookData.book_id);
      activeVersionId = activeVersion?.id || null;
    }

    const pendingJob = db.prepare<[string], { id: string; status: string; created_at: string }>(`
      SELECT id, status, created_at FROM jobs
      WHERE target_id = ? AND type = 'coherence_check' AND status IN ('pending', 'running')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId);

    if (pendingJob) {
      return res.json({
        status: pendingJob.status,
        jobId: pendingJob.id,
        startedAt: pendingJob.created_at,
        message: pendingJob.status === 'running' ? 'Coherence check in progress...' : 'Coherence check queued...',
        activeVersionId,
      });
    }

    // First, try to find a check for the current active version
    const matchingCheck = db.prepare<[string, string | null, string | null], any>(`
      SELECT * FROM coherence_checks
      WHERE project_id = ?
        AND (version_id = ? OR (version_id IS NULL AND ? IS NULL))
      ORDER BY checked_at DESC
      LIMIT 1
    `).get(projectId, activeVersionId, activeVersionId);

    if (matchingCheck) {
      // Found a check for the current version
      return res.json({
        status: matchingCheck.status,
        checkedAt: matchingCheck.checked_at,
        isCoherent: matchingCheck.is_coherent === 1,
        warnings: safeJsonParse(matchingCheck.warnings, []),
        suggestions: safeJsonParse(matchingCheck.suggestions, []),
        plotAnalysis: safeJsonParse(matchingCheck.plot_analysis, []),
        error: matchingCheck.error,
        versionId: matchingCheck.version_id,
        activeVersionId,
      });
    }

    // No check for current version - look for most recent check from any version
    // This allows the frontend to show "stale results" warning
    const latestCheck = db.prepare<[string], any>(`
      SELECT * FROM coherence_checks
      WHERE project_id = ?
      ORDER BY checked_at DESC
      LIMIT 1
    `).get(projectId);

    if (!latestCheck) {
      return res.json({
        status: 'none',
        message: 'No coherence check has been run for this project',
        activeVersionId,
      });
    }

    // Return the stale check with isStale flag so frontend knows it's from a different version
    res.json({
      status: latestCheck.status,
      checkedAt: latestCheck.checked_at,
      isCoherent: latestCheck.is_coherent === 1,
      warnings: safeJsonParse(latestCheck.warnings, []),
      suggestions: safeJsonParse(latestCheck.suggestions, []),
      plotAnalysis: safeJsonParse(latestCheck.plot_analysis, []),
      error: latestCheck.error,
      versionId: latestCheck.version_id,
      activeVersionId,
      isStale: true, // Explicitly mark as stale since it's from a different version
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching coherence check');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/coherence-check
 * Trigger a new coherence check
 */
router.post('/:id/coherence-check', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const existingJob = db.prepare<[string], { id: string }>(`
      SELECT id FROM jobs
      WHERE target_id = ? AND type = 'coherence_check' AND status IN ('pending', 'running')
      LIMIT 1
    `).get(projectId);

    if (existingJob) {
      return res.json({
        success: true,
        jobId: existingJob.id,
        message: 'Coherence check already in progress',
      });
    }

    const jobId = randomUUID();
    db.prepare(`
      INSERT INTO jobs (id, type, target_id, status, attempts)
      VALUES (?, 'coherence_check', ?, 'pending', 0)
    `).run(jobId, projectId);

    logger.info({ projectId, jobId }, 'Queued manual coherence check');

    res.json({
      success: true,
      jobId,
      message: 'Coherence check queued',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error triggering coherence check');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/originality-check
 * Get the latest cached originality check result
 */
router.get('/:id/originality-check', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const pendingJob = db.prepare<[string], { id: string; status: string; created_at: string }>(`
      SELECT id, status, created_at FROM jobs
      WHERE target_id = ? AND type = 'originality_check' AND status IN ('pending', 'running')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId);

    if (pendingJob) {
      return res.json({
        status: pendingJob.status,
        jobId: pendingJob.id,
        startedAt: pendingJob.created_at,
        message: pendingJob.status === 'running' ? 'Originality check in progress...' : 'Originality check queued...',
      });
    }

    const latestCheck = db.prepare<[string], any>(`
      SELECT * FROM plagiarism_checks
      WHERE content_id = ? AND content_type = 'concept'
      ORDER BY checked_at DESC
      LIMIT 1
    `).get(projectId);

    if (!latestCheck) {
      return res.json({
        status: 'none',
        message: 'No originality check has been run for this project',
      });
    }

    res.json({
      id: latestCheck.id,
      contentType: latestCheck.content_type,
      contentId: latestCheck.content_id,
      checkedAt: latestCheck.checked_at,
      status: latestCheck.status,
      originalityScore: safeJsonParse(latestCheck.originality_score, {}),
      similarWorks: safeJsonParse(latestCheck.similar_works, []),
      flags: safeJsonParse(latestCheck.flags, []),
      recommendations: safeJsonParse(latestCheck.recommendations, []),
      analysisDetails: safeJsonParse(latestCheck.analysis_details, {}),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching originality check');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/originality-check
 * Trigger a new originality check
 */
router.post('/:id/originality-check', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const existingJob = db.prepare<[string], { id: string }>(`
      SELECT id FROM jobs
      WHERE target_id = ? AND type = 'originality_check' AND status IN ('pending', 'running')
      LIMIT 1
    `).get(projectId);

    if (existingJob) {
      return res.json({
        success: true,
        jobId: existingJob.id,
        message: 'Originality check already in progress',
      });
    }

    const jobId = randomUUID();
    db.prepare(`
      INSERT INTO jobs (id, type, target_id, status, attempts)
      VALUES (?, 'originality_check', ?, 'pending', 0)
    `).run(jobId, projectId);

    logger.info({ projectId, jobId }, 'Queued manual originality check');

    res.json({
      success: true,
      jobId,
      message: 'Originality check queued',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error triggering originality check');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/generate-plot-layer-field
 * Generate a name or description for a plot layer using AI
 */
router.post('/:id/generate-plot-layer-field', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { field, layerType, existingValues: contextValues, existingNames, currentDescription } = req.body;

    if (!field || !['name', 'description'].includes(field)) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'field must be "name" or "description"' },
      });
    }

    if (!layerType) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'layerType is required' },
      });
    }

    const projectStmt = db.prepare<[string], Project>(`
      SELECT title, genre, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);
    const plotStructure = safeJsonParse((project as any).plot_structure, null);

    const existingLayerNames = existingNames || plotStructure?.plot_layers?.map((l: any) => l.name) || [];
    const existingDescriptions = field === 'description'
      ? plotStructure?.plot_layers?.map((l: any) => l.description).filter(Boolean) || []
      : [];

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    let generatedValue = '';
    let attempts = 0;
    const maxAttempts = 3;
    let similarTo: string | null = null;

    while (attempts < maxAttempts) {
      attempts++;

      let prompt: string;

      if (field === 'name') {
        const attemptNote = attempts > 1
          ? `\n\nIMPORTANT: Previous attempt "${generatedValue}" was too similar to "${similarTo}". Generate something COMPLETELY DIFFERENT.`
          : '';

        prompt = `You are a creative story structure expert. Generate a unique, creative name for a ${layerType} plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Layer Type:** ${layerType}
${contextValues?.description ? `**Description Hint:** ${contextValues.description}` : ''}

**Existing Plot Names (MUST BE DIFFERENT FROM ALL OF THESE):** ${existingLayerNames.join(', ') || 'None'}

Generate a short, evocative name for this plot layer that:
1. Reflects the type of plot thread (${layerType})
2. Hints at the emotional or dramatic content
3. Is distinctly different from all existing names
4. Is 2-4 words maximum

Return ONLY the name, nothing else.${attemptNote}`;
      } else {
        const attemptNote = attempts > 1
          ? `\n\nIMPORTANT: Previous attempt was too similar to an existing description. Generate something COMPLETELY DIFFERENT.`
          : '';

        prompt = `You are a story structure expert. Generate a brief, unique description for a plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Layer:**
- Type: ${layerType}
${contextValues?.name ? `- Name: ${contextValues.name}` : ''}

${currentDescription ? `**Current Description (generate something DIFFERENT):** ${currentDescription}` : ''}

Generate a 1-2 sentence description for this plot layer that:
1. Explains what this thread will explore
2. Hints at the central conflict or tension
3. Connects to the genre and tone
4. Is DISTINCTLY DIFFERENT from any existing plot descriptions

${existingDescriptions.length > 0 ? `**Existing Descriptions (MUST BE DIFFERENT):**\n${existingDescriptions.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}` : ''}

Return ONLY the description, nothing else.${attemptNote}`;
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0.8 + (attempts * 0.1),
        messages: [{ role: 'user', content: prompt }],
      });

      // Track AI cost
      if (message.usage) {
        metricsService.logAIRequest({
          requestType: field === 'name' ? AI_REQUEST_TYPES.PLOT_THREAD_GENERATION : AI_REQUEST_TYPES.PLOT_GENERATION,
          projectId: projectId,
          bookId: null,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          model: 'claude-sonnet-4-20250514',
          success: true,
          contextSummary: `Generating plot layer ${field} for ${layerType}`
        });
      }

      generatedValue = message.content[0].type === 'text'
        ? message.content[0].text.trim()
        : '';

      const existingValues = field === 'name' ? existingLayerNames : existingDescriptions;
      similarTo = findSimilarValue(generatedValue, existingValues);

      if (!similarTo) {
        logger.info({ projectId, field, layerType, generatedValue, attempts }, 'Plot layer field generated (unique)');

        res.json({ field, value: generatedValue, attempts, isUnique: true });
        return;
      }

      logger.warn({ projectId, field, attempt: attempts, generatedValue, similarTo }, 'Generated value too similar, retrying');
    }

    logger.warn({ projectId, field, attempts, generatedValue, similarTo }, 'Failed to generate unique value after max attempts');

    res.json({
      field,
      value: generatedValue,
      attempts,
      isUnique: false,
      warning: `Generated value may be similar to existing values. Consider editing manually.`
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating plot layer field');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/generate-plot-points
 * Generate plot points for a specific layer using AI
 */
router.post('/:id/generate-plot-points', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { layerId, layerName, layerType, layerDescription, totalChapters, actStructure } = req.body;

    if (!layerId || !layerName) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'layerId and layerName are required' },
      });
    }

    const projectStmt = db.prepare<[string], Project>(`
      SELECT title, genre, story_dna, story_bible FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna as any, null);
    const storyBible = safeJsonParse(project.story_bible as any, null);

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a story structure expert. Generate 5-7 plot points for a ${layerType} plot layer.

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

**Plot Layer:**
- Name: ${layerName}
- Type: ${layerType}
${layerDescription ? `- Description: ${layerDescription}` : ''}

**Structure:**
- Total Chapters: ${totalChapters || 25}
- Act I ends: Chapter ${actStructure?.act_one_end || 5}
- Midpoint: Chapter ${actStructure?.act_two_midpoint || 12}
- Act II ends: Chapter ${actStructure?.act_two_end || 20}
- Climax: Chapter ${actStructure?.act_three_climax || 23}

Generate plot points that:
1. Follow the three-act structure
2. Build tension progressively
3. Have varied impact levels (1-5)
4. Cover setup, rising action, midpoint, crisis, climax, falling action, and resolution phases

Return ONLY a JSON array of plot points:
[
  {
    "id": "point-1",
    "chapter_number": 3,
    "description": "Brief description of what happens",
    "phase": "setup",
    "impact_level": 2
  }
]

Phase options: setup, rising, midpoint, crisis, climax, falling, resolution
Impact levels: 1 (minor) to 5 (critical turning point)`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.PLOT_GENERATION,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: `Generating plot points for ${layerType} layer: ${layerName}`
      });
    }

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse plot points from AI response');
    }

    const points = JSON.parse(jsonMatch[0]);

    const validatedPoints = points.map((p: any, i: number) => ({
      id: `point-${Date.now()}-${i}`,
      chapter_number: Math.min(Math.max(1, p.chapter_number || 1), totalChapters || 25),
      description: p.description || 'Plot point',
      phase: ['setup', 'rising', 'midpoint', 'crisis', 'climax', 'falling', 'resolution'].includes(p.phase) ? p.phase : 'rising',
      impact_level: Math.min(Math.max(1, p.impact_level || 3), 5) as 1 | 2 | 3 | 4 | 5,
    }));

    logger.info({ projectId, layerId, pointsGenerated: validatedPoints.length }, 'Plot points generated');

    res.json({ points: validatedPoints });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error generating plot points');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/extract-plots-from-concept
 * Extract plot elements from story concept description
 */
router.post('/:id/extract-plots-from-concept', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const projectStmt = db.prepare<[string], any>(`
      SELECT id, title, genre, story_dna, story_bible, story_concept, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyDNA = safeJsonParse(project.story_dna, null);
    const storyBible = safeJsonParse(project.story_bible, null);
    const storyConcept = safeJsonParse(project.story_concept, null);

    let conceptDescription = '';

    if (storyConcept) {
      const parts: string[] = [];
      if (storyConcept.synopsis) parts.push(storyConcept.synopsis);
      if (storyConcept.logline && !storyConcept.synopsis?.includes(storyConcept.logline)) {
        parts.push(`Logline: ${storyConcept.logline}`);
      }
      if (storyConcept.hook) parts.push(`Hook: ${storyConcept.hook}`);
      if (storyConcept.protagonistHint) parts.push(`Protagonist: ${storyConcept.protagonistHint}`);
      if (storyConcept.conflictType) parts.push(`Core Conflict: ${storyConcept.conflictType}`);
      conceptDescription = parts.join('\n\n');
    }

    if (!conceptDescription) {
      const conceptStmt = db.prepare<[string], any>(`
        SELECT synopsis, logline FROM saved_concepts WHERE title = ? ORDER BY created_at DESC LIMIT 1
      `);
      const savedConcept = conceptStmt.get(project.title);
      conceptDescription = savedConcept?.synopsis || savedConcept?.logline || '';
    }

    if (!conceptDescription) {
      conceptDescription = storyDNA?.themes?.join('. ') || '';
    }

    if (!conceptDescription || conceptDescription === 'A compelling story') {
      return res.status(400).json({
        error: { code: 'NO_CONCEPT', message: 'No story concept found. Please create a story concept first.' },
      });
    }

    const prompt = `
Analyze this story concept and extract the key plot elements:

${conceptDescription}

**Story Context:**
- Title: ${project.title}
- Genre: ${project.genre}
${storyDNA?.tone ? `- Tone: ${storyDNA.tone}` : ''}
${storyBible?.characters?.length ? `- Main Characters: ${storyBible.characters.slice(0, 3).map((c: any) => c.name).join(', ')}` : ''}

Identify:
1. The MAIN PLOT (golden thread) - the primary narrative arc
2. KEY SUBPLOTS implied by the concept
3. CHARACTER ARC plots for main characters mentioned
4. THEMATIC plots (if any)

For each plot, provide:
- type: One of 'main_plot' | 'subplot' | 'character_arc' | 'mystery_thread' | 'romance_arc' | 'emotional_arc' | 'thematic_arc'
- name: A compelling, unique name for this plot thread (2-5 words)
- description: A detailed description of what this plot involves (1-2 sentences)
- isKeyPlot: true (all extracted plots are key plots)

Return ONLY a JSON array of plots with this structure:
[
  {
    "type": "main_plot",
    "name": "Plot name",
    "description": "Description of the plot thread",
    "isKeyPlot": true
  }
]

Extract 3-6 plot threads total. Focus on the most important narrative arcs.`;

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.PLOT_ANALYSIS,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Extracting plot elements from story concept'
      });
    }

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse plot extraction from AI response');
    }

    const extractedPlots = JSON.parse(jsonMatch[0]);

    const typeMapping: Record<string, 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc'> = {
      'main_plot': 'main',
      'subplot': 'subplot',
      'character_arc': 'character-arc',
      'mystery_thread': 'mystery',
      'romance_arc': 'romance',
      'emotional_arc': 'character-arc',
      'thematic_arc': 'subplot',
    };

    const plots = extractedPlots.map((plot: any, index: number) => ({
      id: `extracted-${Date.now()}-${index}`,
      type: typeMapping[plot.type] || 'subplot',
      name: plot.name || 'Untitled Plot',
      description: plot.description || '',
      isKeyPlot: true,
      sourceType: 'story_concept',
      canDelete: false,
      canEdit: true,
      color: getPlotColor(typeMapping[plot.type] || 'subplot', index),
      points: [],
      status: 'active' as const,
    }));

    const plotStructure = safeJsonParse(project.plot_structure, {
      plot_layers: [],
      act_structure: {
        act_one_end: 5,
        act_two_midpoint: 12,
        act_two_end: 20,
        act_three_climax: 23,
      },
    });

    const existingNames = new Set(plotStructure.plot_layers.map((l: any) => l.name.toLowerCase()));
    const newPlots = plots.filter((p: any) => !existingNames.has(p.name.toLowerCase()));

    if (newPlots.length > 0) {
      plotStructure.plot_layers = [...plotStructure.plot_layers, ...newPlots];

      const updateStmt = db.prepare(`
        UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(plotStructure), new Date().toISOString(), projectId);

      syncPlotStructureToActiveVersions(projectId, plotStructure);

      logger.info({ projectId, extractedCount: plots.length, addedCount: newPlots.length }, 'Plots extracted from concept');
    } else {
      logger.info({ projectId, extractedCount: plots.length }, 'Plots extracted but all already exist');
    }

    res.json({
      plots,
      addedToStructure: newPlots.length,
      totalExtracted: plots.length,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error extracting plots from concept');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/implement-originality-suggestion
 * Use AI to implement an originality recommendation
 */
router.post('/:id/implement-originality-suggestion', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { recommendation } = req.body;

    if (!recommendation || typeof recommendation !== 'string') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'recommendation is required and must be a string' },
      });
    }

    const projectStmt = db.prepare<[string], any>(`
      SELECT id, title, genre, story_concept, story_dna, story_bible FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyConcept = safeJsonParse(project.story_concept, null);
    const storyDNA = safeJsonParse(project.story_dna, null);

    if (!storyConcept) {
      return res.status(400).json({
        error: { code: 'NO_CONCEPT', message: 'Project has no story concept to improve' },
      });
    }

    logger.info({ projectId, recommendation: recommendation.substring(0, 100) }, 'Implementing originality suggestion');

    const conceptContext = `
CURRENT STORY CONCEPT:
Title: ${storyConcept.title || project.title}
Logline: ${storyConcept.logline || 'Not set'}
Synopsis: ${storyConcept.synopsis || 'Not set'}
Hook: ${storyConcept.hook || 'Not set'}
Protagonist Hint: ${storyConcept.protagonistHint || 'Not set'}

${storyDNA ? `
STORY DNA:
Themes: ${storyDNA.themes?.join(', ') || 'Not set'}
Tone: ${storyDNA.tone || 'Not set'}
Genre: ${project.genre}
` : ''}
`.trim();

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a creative writing consultant helping to improve story originality.

${conceptContext}

ORIGINALITY RECOMMENDATION TO IMPLEMENT:
"${recommendation}"

Your task is to revise the story concept to address this recommendation while:
1. Maintaining the core essence and appeal of the original concept
2. Making the changes feel natural and integrated, not forced
3. Ensuring the result is more original and unique
4. Keeping the same general genre and tone

Respond with a JSON object containing the revised concept fields. Only include fields that need to change:
{
  "title": "revised title if needed, or omit",
  "logline": "revised logline (1-2 sentences)",
  "synopsis": "revised synopsis (2-3 paragraphs)",
  "hook": "revised hook (what makes this unique)",
  "protagonistHint": "revised protagonist description if needed"
}

Be creative but practical. The changes should directly address the originality concern while keeping the story compelling.

Output ONLY valid JSON, no additional commentary:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.ORIGINALITY_CHECK,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Implementing originality suggestion to revise story concept'
      });
    }

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let revisedConcept: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        revisedConcept = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      logger.error({ parseError, response: responseText.substring(0, 500) }, 'Failed to parse AI response');
      return res.status(500).json({
        error: { code: 'PARSE_ERROR', message: 'Failed to parse AI response' },
      });
    }

    const updatedConcept = {
      ...storyConcept,
      ...revisedConcept,
    };

    const updateStmt = db.prepare(`
      UPDATE projects SET story_concept = ?, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(updatedConcept), new Date().toISOString(), projectId);

    logger.info({
      projectId,
      fieldsUpdated: Object.keys(revisedConcept),
      recommendation: recommendation.substring(0, 50),
    }, 'Originality suggestion implemented');

    res.json({
      success: true,
      updatedConcept,
      fieldsUpdated: Object.keys(revisedConcept),
      message: 'Story concept updated to address originality concern',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error implementing originality suggestion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/implement-coherence-suggestion
 * Use AI to implement a coherence recommendation
 */
router.post('/:id/implement-coherence-suggestion', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { suggestion } = req.body;

    if (!suggestion || typeof suggestion !== 'string') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'suggestion is required and must be a string' },
      });
    }

    const projectStmt = db.prepare<[string], any>(`
      SELECT id, title, genre, story_concept, story_dna, story_bible, plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const plotStructure = safeJsonParse(project.plot_structure, { plot_layers: [] });
    const storyConcept = safeJsonParse(project.story_concept, null);
    const storyDNA = safeJsonParse(project.story_dna, null);

    if (!plotStructure.plot_layers || plotStructure.plot_layers.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_PLOTS', message: 'Project has no plot layers to improve' },
      });
    }

    logger.info({ projectId, suggestion: suggestion.substring(0, 100) }, 'Implementing coherence suggestion');

    const conceptContext = storyConcept ? `
STORY CONCEPT:
Title: ${storyConcept.title || project.title}
Logline: ${storyConcept.logline || 'Not set'}
Synopsis: ${storyConcept.synopsis || 'Not set'}
Hook: ${storyConcept.hook || 'Not set'}
` : `Title: ${project.title}\nGenre: ${project.genre}`;

    const dnaContext = storyDNA ? `
STORY DNA:
Themes: ${storyDNA.themes?.join(', ') || 'Not set'}
Tone: ${storyDNA.tone || 'Not set'}
Central Conflict: ${storyDNA.centralConflict || 'Not set'}
` : '';

    const plotLayersContext = plotStructure.plot_layers.map((layer: any, index: number) => `
Plot Layer ${index + 1}:
- ID: ${layer.id}
- Name: ${layer.name}
- Type: ${layer.type}
- Description: ${layer.description}
`).join('\n');

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a story structure consultant helping to improve plot coherence.

${conceptContext}
${dnaContext}

CURRENT PLOT LAYERS:
${plotLayersContext}

COHERENCE SUGGESTION TO IMPLEMENT:
"${suggestion}"

Your task is to revise the EXISTING plot layers to address this coherence suggestion while:
1. Maintaining the core story elements and character arcs
2. Ensuring all plots connect meaningfully to the main story concept
3. Making changes that create better narrative cohesion
4. Keeping the EXACT SAME plot layer IDs (these are immutable)

CRITICAL RULES:
- You MUST NOT create new plot layers. Only modify existing ones.
- You MUST include ALL existing plot layer IDs in your response.
- You MUST NOT add any new IDs that don't exist in the current plot layers.
- Prefer SIMPLIFYING and CONSOLIDATING plots over adding complexity.
- If plots can be merged or streamlined, do so rather than expanding.
- A focused story with 4-6 well-developed plots is better than 12+ scattered plots.

Respond with a JSON object containing the revised plot_layers array:
{
  "plot_layers": [
    {
      "id": "existing-layer-id",
      "name": "revised or original name",
      "type": "main|subplot|mystery|romance|character-arc",
      "description": "revised description that better aligns with the story concept"
    }
  ],
  "explanation": "Brief explanation of what was changed and why"
}

Important:
- Use ONLY the existing layer IDs listed above
- You may modify names, types, or descriptions
- Focus changes on the layers that need better alignment
- The main plot should clearly connect to the story's central concept

Output ONLY valid JSON, no additional commentary:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Implementing coherence suggestion to revise plot layers'
      });
    }

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let revisedPlots: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        revisedPlots = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      logger.error({ parseError, response: responseText.substring(0, 500) }, 'Failed to parse AI response');
      return res.status(500).json({
        error: { code: 'PARSE_ERROR', message: 'Failed to parse AI response' },
      });
    }

    if (!revisedPlots.plot_layers || !Array.isArray(revisedPlots.plot_layers)) {
      return res.status(500).json({
        error: { code: 'INVALID_RESPONSE', message: 'AI response did not contain valid plot_layers' },
      });
    }

    const existingLayersMap = new Map<string, any>();
    for (const layer of plotStructure.plot_layers) {
      existingLayersMap.set(layer.id, layer);
    }

    // Track original count for logging
    const originalPlotCount = plotStructure.plot_layers.length;

    // Track which existing layers were updated by the AI
    const updatedLayerIds = new Set<string>();

    // DEFENSIVE: Filter out any new plot IDs that AI tried to create
    // Only process layers that have existing IDs
    const rejectedNewLayers: string[] = [];
    const mergedPlotLayers: any[] = [];

    for (const revisedLayer of revisedPlots.plot_layers) {
      const existingLayer = existingLayersMap.get(revisedLayer.id);
      if (existingLayer) {
        // Valid existing layer - update it
        updatedLayerIds.add(revisedLayer.id);
        mergedPlotLayers.push({
          ...existingLayer,
          name: revisedLayer.name,
          type: revisedLayer.type,
          description: revisedLayer.description,
        });
      } else {
        // AI tried to create a new layer - REJECT IT
        rejectedNewLayers.push(revisedLayer.name || revisedLayer.id);
        logger.warn({
          projectId,
          rejectedLayerId: revisedLayer.id,
          rejectedLayerName: revisedLayer.name,
        }, 'Rejected AI-created plot layer (new plots not allowed in coherence fixes)');
      }
    }

    // Preserve any existing layers that the AI didn't include in its response
    // This prevents accidental data loss when AI returns fewer layers
    for (const layer of plotStructure.plot_layers) {
      if (!updatedLayerIds.has(layer.id)) {
        mergedPlotLayers.push(layer);
      }
    }

    const updatedPlotStructure = {
      ...plotStructure,
      plot_layers: mergedPlotLayers,
    };

    // Log plot count changes for monitoring
    const finalPlotCount = mergedPlotLayers.length;
    if (finalPlotCount !== originalPlotCount) {
      logger.warn({
        projectId,
        originalCount: originalPlotCount,
        finalCount: finalPlotCount,
        change: finalPlotCount - originalPlotCount,
      }, 'Plot count changed during coherence suggestion implementation');
    }

    // Save to history for undo capability
    savePlotChangeHistory(
      projectId,
      'suggestion_impl',
      `Implemented suggestion: ${suggestion.substring(0, 100)}`,
      plotStructure,
      updatedPlotStructure,
      rejectedNewLayers
    );

    const updateStmt = db.prepare(`
      UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(updatedPlotStructure), new Date().toISOString(), projectId);

    syncPlotStructureToActiveVersions(projectId, updatedPlotStructure);

    const existingJob = db.prepare<[string], { id: string }>(`
      SELECT id FROM jobs
      WHERE target_id = ? AND type = 'coherence_check' AND status IN ('pending', 'running')
      LIMIT 1
    `).get(projectId);

    let newCheckJobId: string | null = null;
    if (!existingJob) {
      newCheckJobId = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, attempts)
        VALUES (?, 'coherence_check', ?, 'pending', 0)
      `).run(newCheckJobId, projectId);
      logger.info({ projectId, jobId: newCheckJobId }, 'Queued coherence re-check after suggestion implementation');
    }

    logger.info({
      projectId,
      layersUpdated: updatedLayerIds.size,
      layersRejected: rejectedNewLayers.length,
      suggestion: suggestion.substring(0, 50),
    }, 'Coherence suggestion implemented');

    res.json({
      success: true,
      updatedPlotStructure,
      explanation: revisedPlots.explanation || 'Plot structure updated to improve coherence',
      coherenceCheckQueued: !!newCheckJobId,
      message: 'Plot structure updated to address coherence concern',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error implementing coherence suggestion');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/fix-coherence-warning
 * Use AI to automatically fix a coherence warning
 */
router.post('/:id/fix-coherence-warning', async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { warning } = req.body;

    if (!warning) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'warning is required' },
      });
    }

    const projectStmt = db.prepare<[string], any>(`SELECT * FROM projects WHERE id = ?`);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyConcept = typeof project.story_concept === 'string'
      ? JSON.parse(project.story_concept || '{}')
      : project.story_concept;
    const storyDna = typeof project.story_dna === 'string'
      ? JSON.parse(project.story_dna || '{}')
      : project.story_dna;
    const plotStructure = typeof project.plot_structure === 'string'
      ? JSON.parse(project.plot_structure || '{}')
      : project.plot_structure;

    if (!plotStructure?.plot_layers || plotStructure.plot_layers.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_PLOTS', message: 'No plot layers to fix' },
      });
    }

    logger.info({ projectId, warning: warning.substring(0, 100) }, 'Fixing coherence warning with AI');

    const conceptContext = storyConcept ? `
**Story Concept:**
- Logline: ${storyConcept.logline || 'Not set'}
- Synopsis: ${storyConcept.synopsis || 'Not set'}
- Hook: ${storyConcept.hook || 'Not set'}
` : '';

    const dnaContext = storyDna ? `
**Story DNA:**
- Genre: ${storyDna.genre || 'Not set'}
- Tone: ${storyDna.tone || 'Not set'}
- Themes: ${(storyDna.themes || []).join(', ') || 'None'}
` : '';

    const currentPlotsContext = `
**Current Plot Layers:**
${plotStructure.plot_layers.map((p: any, i: number) => `
${i + 1}. ${p.name} (${p.type})
   Description: ${p.description}
`).join('\n')}`;

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    // Get existing layer IDs for the prompt
    const existingLayerIds = plotStructure.plot_layers.map((p: any) => p.id);

    const prompt = `You are a story structure consultant fixing a coherence warning.

${conceptContext}
${dnaContext}
${currentPlotsContext}

EXISTING PLOT LAYER IDs (you MUST use only these): ${existingLayerIds.join(', ')}

WARNING TO FIX:
"${warning}"

Your task is to revise the EXISTING plot layers to FIX this warning. You should:
1. Identify the root cause of the warning
2. Make specific changes to EXISTING plots to address it
3. Ensure the fix doesn't break other plot elements
4. Keep changes minimal but effective

CRITICAL RULES:
- You MUST NOT create new plot layers. Only modify existing ones.
- You MUST use ONLY the layer IDs listed above.
- You MUST NOT invent new IDs or add new plot layers.
- Prefer SIMPLIFYING plots over adding complexity.
- A focused story with fewer well-developed plots is better than many scattered plots.
- If the warning suggests adding something, find a way to address it within EXISTING plots.

Return a JSON object with:
{
  "fixed_plot_layers": [...], // Array containing ONLY modifications to existing layers (use existing IDs only)
  "changes_made": ["Description of change 1", "Description of change 2"],
  "explanation": "Brief explanation of the fix"
}

Return ONLY valid JSON, no markdown formatting.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (response.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.COHERENCE_CHECK,
        projectId: projectId,
        bookId: null,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Fixing coherence warning with AI-suggested plot revisions'
      });
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    let fixResult;
    try {
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      fixResult = JSON.parse(jsonText.trim());
    } catch (parseError) {
      logger.error({ parseError, response: content.text.substring(0, 500) }, 'Failed to parse AI fix response');
      throw new Error('Failed to parse AI fix response');
    }

    if (!fixResult.fixed_plot_layers || !Array.isArray(fixResult.fixed_plot_layers)) {
      throw new Error('Invalid fix response: missing fixed_plot_layers array');
    }

    const existingLayersMap = new Map<string, any>();
    for (const layer of plotStructure.plot_layers) {
      existingLayersMap.set(layer.id, layer);
    }

    // Track original count for logging
    const originalPlotCount = plotStructure.plot_layers.length;

    // Track which existing layers were updated by the AI
    const updatedLayerIds = new Set<string>();

    // DEFENSIVE: Filter out any new plot IDs that AI tried to create
    // Only process layers that have existing IDs
    const rejectedNewLayers: string[] = [];
    const mergedPlotLayers: any[] = [];

    for (const fixedLayer of fixResult.fixed_plot_layers) {
      const existingLayer = existingLayersMap.get(fixedLayer.id);
      if (existingLayer) {
        // Valid existing layer - update it
        updatedLayerIds.add(fixedLayer.id);
        mergedPlotLayers.push({
          ...existingLayer,
          name: fixedLayer.name,
          type: fixedLayer.type,
          description: fixedLayer.description,
        });
      } else {
        // AI tried to create a new layer - REJECT IT
        rejectedNewLayers.push(fixedLayer.name || fixedLayer.id);
        logger.warn({
          projectId,
          rejectedLayerId: fixedLayer.id,
          rejectedLayerName: fixedLayer.name,
        }, 'Rejected AI-created plot layer (new plots not allowed in coherence fixes)');
      }
    }

    // Preserve any existing layers that the AI didn't include in its response
    // This prevents accidental data loss when AI returns fewer layers
    for (const layer of plotStructure.plot_layers) {
      if (!updatedLayerIds.has(layer.id)) {
        mergedPlotLayers.push(layer);
      }
    }

    const updatedPlotStructure = {
      ...plotStructure,
      plot_layers: mergedPlotLayers,
    };

    // Log plot count changes for monitoring
    const finalPlotCount = mergedPlotLayers.length;
    if (finalPlotCount !== originalPlotCount) {
      logger.warn({
        projectId,
        originalCount: originalPlotCount,
        finalCount: finalPlotCount,
        change: finalPlotCount - originalPlotCount,
      }, 'Plot count changed during coherence warning fix');
    }

    // Save to history for undo capability
    savePlotChangeHistory(
      projectId,
      'coherence_fix',
      `Fixed warning: ${warning.substring(0, 100)}`,
      plotStructure,
      updatedPlotStructure,
      rejectedNewLayers
    );

    const updateStmt = db.prepare(`
      UPDATE projects
      SET plot_structure = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(updatedPlotStructure), new Date().toISOString(), projectId);

    syncPlotStructureToActiveVersions(projectId, updatedPlotStructure);

    const existingJob = db.prepare<[string], { id: string }>(`
      SELECT id FROM jobs
      WHERE target_id = ? AND type = 'coherence_check' AND status IN ('pending', 'running')
      LIMIT 1
    `).get(projectId);

    let newCheckJobId;
    if (!existingJob) {
      newCheckJobId = randomUUID();
      db.prepare(`
        INSERT INTO jobs (id, type, target_id, status, attempts)
        VALUES (?, 'coherence_check', ?, 'pending', 0)
      `).run(newCheckJobId, projectId);
      logger.info({ projectId, jobId: newCheckJobId }, 'Queued coherence re-check after warning fix');
    }

    logger.info({
      projectId,
      warning: warning.substring(0, 100),
      changesCount: fixResult.changes_made?.length || 0,
      layersUpdated: updatedLayerIds.size,
      layersRejected: rejectedNewLayers.length,
    }, 'Coherence warning fixed');

    res.json({
      success: true,
      updatedPlotStructure,
      changesMade: fixResult.changes_made || [],
      explanation: fixResult.explanation || 'Warning addressed',
      coherenceCheckQueued: !!newCheckJobId,
      message: 'Warning fixed and plot structure updated',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fixing coherence warning');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/regenerate-plot-structure
 * Delete all existing plot layers and regenerate from story elements
 */
router.post('/:id/regenerate-plot-structure', async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const projectStmt = db.prepare<[string], any>(`
      SELECT id, title, genre, story_concept, story_dna, story_bible, plot_structure
      FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyConcept = safeJsonParse(project.story_concept, null);
    const storyDNA = safeJsonParse(project.story_dna, null);
    const storyBible = safeJsonParse(project.story_bible, null);

    let storyContext = '';

    if (storyConcept) {
      storyContext += `
STORY CONCEPT:
Title: ${storyConcept.title || project.title}
Logline: ${storyConcept.logline || 'Not provided'}
Synopsis: ${storyConcept.synopsis || 'Not provided'}
Hook: ${storyConcept.hook || 'Not provided'}
Protagonist: ${storyConcept.protagonistHint || 'Not provided'}
Core Conflict: ${storyConcept.conflictType || 'Not provided'}
`;
    }

    if (storyDNA) {
      storyContext += `
STORY DNA:
Genre: ${storyDNA.genre || project.genre || 'Fiction'}
Subgenre: ${storyDNA.subgenre || 'Not specified'}
Tone: ${storyDNA.tone || 'Not specified'}
Themes: ${Array.isArray(storyDNA.themes) ? storyDNA.themes.join(', ') : 'Not specified'}
Prose Style: ${storyDNA.proseStyle || 'Not specified'}
Timeframe: ${storyDNA.timeframe || 'Not specified'}
`;
    }

    if (storyBible?.characters?.length > 0) {
      storyContext += `
KEY CHARACTERS:`;
      for (const char of storyBible.characters.slice(0, 6)) {
        storyContext += `
- ${char.name} (${char.role || 'Unknown role'}): ${char.description || 'No description'}
  Arc: ${char.characterArc || 'Not defined'}`;
      }
    }

    if (!storyContext.includes('Synopsis:') && !storyContext.includes('Logline:')) {
      return res.status(400).json({
        error: {
          code: 'NO_CONCEPT',
          message: 'Cannot regenerate plot structure without a story concept. Please create a story concept first.',
        },
      });
    }

    logger.info({ projectId }, 'Regenerating plot structure from story elements');

    const prompt = `You are an expert story architect. Create a comprehensive plot structure for a compelling novel.

${storyContext}

TASK: Create a complete plot structure with multiple interwoven plot layers.

REQUIRED OUTPUT FORMAT - Return ONLY valid JSON:
{
  "plot_layers": [
    {
      "id": "main-plot",
      "name": "Main Plot - [Descriptive Title]",
      "description": "Detailed description of the primary narrative arc",
      "type": "main",
      "color": "#3b82f6",
      "status": "active",
      "deletable": false,
      "editable": true,
      "points": [
        {
          "id": "point-[unique-id]",
          "chapter_number": 1,
          "description": "Specific plot point description",
          "phase": "setup",
          "impact_level": 3
        }
      ]
    }
  ],
  "act_structure": {
    "act_one_end": 8,
    "act_two_midpoint": 15,
    "act_two_end": 22,
    "act_three_climax": 28
  }
}

REQUIREMENTS:
1. Create 4-6 plot layers including main, subplot, and character-arc types
2. Each plot layer must have 5-8 plot points across all phases
3. Use phases: setup, rising, midpoint, crisis, climax, falling, resolution
4. Impact levels: 1 (minor) to 5 (critical)

Generate a rich, detailed plot structure:`;

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track AI cost
    if (message.usage) {
      metricsService.logAIRequest({
        requestType: AI_REQUEST_TYPES.PLOT_GENERATION,
        projectId: projectId,
        bookId: null,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        model: 'claude-sonnet-4-20250514',
        success: true,
        contextSummary: 'Regenerating complete plot structure from story elements'
      });
    }

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error({ responseText: responseText.substring(0, 500) }, 'Failed to extract JSON from regeneration response');
      throw new Error('Failed to parse plot structure from AI response');
    }

    let newPlotStructure: any;
    try {
      newPlotStructure = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      logger.error({ parseErr, json: jsonMatch[0].substring(0, 500) }, 'JSON parse error');
      throw new Error('Invalid JSON in AI response');
    }

    if (!newPlotStructure.plot_layers || !Array.isArray(newPlotStructure.plot_layers)) {
      throw new Error('Invalid plot structure: missing plot_layers array');
    }

    const timestamp = Date.now();
    newPlotStructure.plot_layers = newPlotStructure.plot_layers.map((layer: any, layerIndex: number) => {
      const layerId = layer.id || `layer-${timestamp}-${layerIndex}`;
      return {
        id: layerId,
        name: layer.name || 'Untitled Plot Layer',
        description: layer.description || '',
        type: ['main', 'subplot', 'mystery', 'romance', 'character-arc'].includes(layer.type) ? layer.type : 'subplot',
        color: layer.color || getPlotColor(layer.type || 'subplot', layerIndex),
        status: layer.status || 'active',
        deletable: layer.deletable !== undefined ? layer.deletable : true,
        editable: layer.editable !== undefined ? layer.editable : true,
        points: (layer.points || []).map((point: any, pointIndex: number) => ({
          id: point.id || `point-${timestamp}-${layerIndex}-${pointIndex}`,
          chapter_number: Math.min(Math.max(1, point.chapter_number || 1), 35),
          description: point.description || 'Plot point',
          phase: ['setup', 'rising', 'midpoint', 'crisis', 'climax', 'falling', 'resolution'].includes(point.phase)
            ? point.phase
            : 'rising',
          impact_level: Math.min(Math.max(1, point.impact_level || 3), 5) as 1 | 2 | 3 | 4 | 5,
        })),
      };
    });

    newPlotStructure.act_structure = {
      act_one_end: newPlotStructure.act_structure?.act_one_end || 8,
      act_two_midpoint: newPlotStructure.act_structure?.act_two_midpoint || 15,
      act_two_end: newPlotStructure.act_structure?.act_two_end || 22,
      act_three_climax: newPlotStructure.act_structure?.act_three_climax || 28,
    };

    const updateStmt = db.prepare(`
      UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(newPlotStructure), new Date().toISOString(), projectId);

    syncPlotStructureToActiveVersions(projectId, newPlotStructure);

    const totalPoints = newPlotStructure.plot_layers.reduce(
      (sum: number, layer: any) => sum + (layer.points?.length || 0),
      0
    );

    logger.info({
      projectId,
      layersGenerated: newPlotStructure.plot_layers.length,
      totalPoints,
    }, 'Plot structure regenerated successfully');

    res.json({
      success: true,
      plotStructure: newPlotStructure,
      stats: {
        layersGenerated: newPlotStructure.plot_layers.length,
        totalPoints,
        layerTypes: newPlotStructure.plot_layers.map((l: any) => l.type),
      },
      message: 'Plot structure regenerated from story elements and best practices',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error regenerating plot structure');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Helper function to save plot change to history for undo capability
 */
function savePlotChangeHistory(
  projectId: string,
  changeType: 'coherence_fix' | 'suggestion_impl' | 'manual' | 'regenerate' | 'extract',
  changeDescription: string,
  previousStructure: any,
  newStructure: any,
  rejectedNewPlots: string[] = []
): string {
  const historyId = randomUUID();
  const plotsBefore = previousStructure?.plot_layers?.length || 0;
  const plotsAfter = newStructure?.plot_layers?.length || 0;

  try {
    db.prepare(`
      INSERT INTO plot_change_history (
        id, project_id, change_type, change_description,
        previous_plot_structure, new_plot_structure,
        plots_before, plots_after, rejected_new_plots
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      projectId,
      changeType,
      changeDescription,
      JSON.stringify(previousStructure),
      JSON.stringify(newStructure),
      plotsBefore,
      plotsAfter,
      rejectedNewPlots.length > 0 ? JSON.stringify(rejectedNewPlots) : null
    );

    logger.info({
      projectId,
      historyId,
      changeType,
      plotsBefore,
      plotsAfter,
    }, 'Plot change saved to history');

    return historyId;
  } catch (error: any) {
    // Table might not exist yet, log but don't fail
    logger.warn({ error: error.message, projectId }, 'Failed to save plot change history (table may not exist)');
    return '';
  }
}

/**
 * GET /api/projects/:id/plot-change-history
 * Get plot change history for undo capability
 */
router.get('/:id/plot-change-history', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = db.prepare<[string, number], any>(`
      SELECT id, changed_at, change_type, change_description,
             plots_before, plots_after, rejected_new_plots,
             can_undo, undone_at
      FROM plot_change_history
      WHERE project_id = ?
      ORDER BY changed_at DESC
      LIMIT ?
    `).all(projectId, limit);

    const formattedHistory = history.map((h: any) => ({
      id: h.id,
      changedAt: h.changed_at,
      changeType: h.change_type,
      changeDescription: h.change_description,
      plotsBefore: h.plots_before,
      plotsAfter: h.plots_after,
      rejectedNewPlots: safeJsonParse(h.rejected_new_plots, []),
      canUndo: h.can_undo === 1 && !h.undone_at,
      undoneAt: h.undone_at,
    }));

    res.json({ history: formattedHistory });
  } catch (error: any) {
    // Table might not exist
    if (error.message?.includes('no such table')) {
      return res.json({ history: [], message: 'Plot history not available yet' });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching plot change history');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/undo-plot-change
 * Undo a specific plot change by restoring previous structure
 */
router.post('/:id/undo-plot-change', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { historyId } = req.body;

    if (!historyId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'historyId is required' },
      });
    }

    // Get the history entry
    const historyEntry = db.prepare<[string, string], any>(`
      SELECT * FROM plot_change_history
      WHERE id = ? AND project_id = ? AND can_undo = 1 AND undone_at IS NULL
    `).get(historyId, projectId);

    if (!historyEntry) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'History entry not found or cannot be undone' },
      });
    }

    const previousStructure = safeJsonParse(historyEntry.previous_plot_structure, null);

    if (!previousStructure) {
      return res.status(400).json({
        error: { code: 'INVALID_DATA', message: 'Previous plot structure is invalid' },
      });
    }

    // Restore the previous structure
    db.prepare(`
      UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(previousStructure), new Date().toISOString(), projectId);

    // Mark the history entry as undone
    db.prepare(`
      UPDATE plot_change_history SET undone_at = ? WHERE id = ?
    `).run(new Date().toISOString(), historyId);

    // Sync to active versions
    syncPlotStructureToActiveVersions(projectId, previousStructure);

    logger.info({
      projectId,
      historyId,
      changeType: historyEntry.change_type,
      restoredPlotCount: previousStructure.plot_layers?.length,
    }, 'Plot change undone');

    res.json({
      success: true,
      restoredPlotStructure: previousStructure,
      message: `Undone: ${historyEntry.change_description || historyEntry.change_type}`,
    });
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return res.status(400).json({
        error: { code: 'NOT_AVAILABLE', message: 'Undo feature not available yet - migration pending' },
      });
    }
    logger.error({ error: error.message, stack: error.stack }, 'Error undoing plot change');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/projects/:id/plot-cleanup-analysis
 * Analyse plots to identify potential cleanup candidates (empty plots, duplicates, etc.)
 */
router.get('/:id/plot-cleanup-analysis', (req, res) => {
  try {
    const { id: projectId } = req.params;

    const projectStmt = db.prepare<[string], any>(`
      SELECT plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const plotStructure = safeJsonParse(project.plot_structure, { plot_layers: [] });
    const plots = plotStructure.plot_layers || [];

    // Analyse plots
    const emptyPlots = plots.filter((p: any) => !p.points || p.points.length === 0);
    const mainPlots = plots.filter((p: any) => p.type === 'main');
    const duplicateNames = plots.filter((p: any, i: number, arr: any[]) =>
      arr.findIndex((x: any) => x.name.toLowerCase() === p.name.toLowerCase()) !== i
    );

    // Check for plots with very similar descriptions (potential duplicates)
    const similarPlots: Array<{ plot1: string; plot2: string; similarity: string }> = [];
    for (let i = 0; i < plots.length; i++) {
      for (let j = i + 1; j < plots.length; j++) {
        const desc1 = (plots[i].description || '').toLowerCase();
        const desc2 = (plots[j].description || '').toLowerCase();
        if (desc1 && desc2 && calculateStringSimilarity(desc1, desc2) > 0.7) {
          similarPlots.push({
            plot1: plots[i].name,
            plot2: plots[j].name,
            similarity: 'High description similarity',
          });
        }
      }
    }

    // Recommendations
    const recommendations: string[] = [];
    const RECOMMENDED_MAX_PLOTS = 6;

    if (plots.length > RECOMMENDED_MAX_PLOTS) {
      recommendations.push(`You have ${plots.length} plots. Consider consolidating to ${RECOMMENDED_MAX_PLOTS} or fewer for a tighter narrative.`);
    }

    if (emptyPlots.length > 0) {
      recommendations.push(`${emptyPlots.length} plot(s) have no plot points. Consider deleting or adding points to: ${emptyPlots.map((p: any) => p.name).join(', ')}`);
    }

    if (mainPlots.length > 1) {
      recommendations.push(`You have ${mainPlots.length} main plots. A novel typically needs only one main plot (golden thread).`);
    }

    if (mainPlots.length === 0) {
      recommendations.push('No main plot defined. Every novel needs a central narrative arc.');
    }

    if (similarPlots.length > 0) {
      recommendations.push(`Found ${similarPlots.length} potentially duplicate plot pair(s). Consider merging similar plots.`);
    }

    res.json({
      totalPlots: plots.length,
      recommendedMaxPlots: RECOMMENDED_MAX_PLOTS,
      emptyPlots: emptyPlots.map((p: any) => ({ id: p.id, name: p.name, type: p.type })),
      mainPlots: mainPlots.map((p: any) => ({ id: p.id, name: p.name })),
      duplicateNames: duplicateNames.map((p: any) => ({ id: p.id, name: p.name })),
      similarPlots,
      recommendations,
      plotsByType: {
        main: plots.filter((p: any) => p.type === 'main').length,
        subplot: plots.filter((p: any) => p.type === 'subplot').length,
        characterArc: plots.filter((p: any) => p.type === 'character-arc').length,
        mystery: plots.filter((p: any) => p.type === 'mystery').length,
        romance: plots.filter((p: any) => p.type === 'romance').length,
      },
      plotSummary: plots.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        pointCount: p.points?.length || 0,
        hasDescription: !!p.description,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error analysing plots for cleanup');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/projects/:id/plots/bulk-delete
 * Delete multiple plot layers at once (for cleanup)
 */
router.delete('/:id/plots/bulk-delete', (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { plotIds } = req.body;

    if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plotIds array is required' },
      });
    }

    const projectStmt = db.prepare<[string], any>(`
      SELECT plot_structure FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId);

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const plotStructure = safeJsonParse(project.plot_structure, { plot_layers: [] });
    const previousStructure = { ...plotStructure };
    const plotIdsToDelete = new Set(plotIds);

    // Filter out the plots to delete
    const remainingPlots = plotStructure.plot_layers.filter(
      (p: any) => !plotIdsToDelete.has(p.id)
    );

    const deletedCount = plotStructure.plot_layers.length - remainingPlots.length;

    if (deletedCount === 0) {
      return res.status(400).json({
        error: { code: 'NOT_FOUND', message: 'None of the specified plots were found' },
      });
    }

    const newPlotStructure = {
      ...plotStructure,
      plot_layers: remainingPlots,
    };

    // Save to history for undo
    savePlotChangeHistory(
      projectId,
      'manual',
      `Bulk deleted ${deletedCount} plot(s)`,
      previousStructure,
      newPlotStructure
    );

    // Update the database
    db.prepare(`
      UPDATE projects SET plot_structure = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(newPlotStructure), new Date().toISOString(), projectId);

    syncPlotStructureToActiveVersions(projectId, newPlotStructure);

    logger.info({
      projectId,
      deletedCount,
      remainingCount: remainingPlots.length,
    }, 'Bulk deleted plots');

    res.json({
      success: true,
      deletedCount,
      remainingPlotCount: remainingPlots.length,
      message: `Deleted ${deletedCount} plot(s). ${remainingPlots.length} plots remaining.`,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error bulk deleting plots');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
