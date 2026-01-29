/**
 * Project Editorial Routes
 * Handles editorial assistant and story refinement
 */

import { Router } from 'express';
import db from '../../db/connection.js';
import { metricsService } from '../../services/metrics.service.js';
import { createLogger } from '../../services/logger.service.js';
import { detectIntent } from '../../services/editorial-intent-detector.js';
import { generateEditorialResponse } from '../../services/editorial-response-generator.js';
import type { ConversationMessage } from '../../services/editorial-response-generator.js';
import { safeJsonParse } from './utils.js';

const router = Router();
const logger = createLogger('routes:projects:editorial');

/**
 * POST /api/projects/:id/refine-story
 * Use AI to refine/amend story concept and DNA based on user feedback
 */
router.post('/:id/refine-story', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { feedback, currentConcept, currentDNA } = req.body;

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Feedback is required' },
      });
    }

    // Get project to validate it exists
    const projectStmt = db.prepare(`
      SELECT id, title, genre, story_concept, story_dna FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const storyConcept = currentConcept || safeJsonParse(project.story_concept, {});
    const storyDNA = currentDNA || safeJsonParse(project.story_dna, {});

    logger.info({ projectId, feedbackLength: feedback.length }, 'Refining story with AI feedback');

    const conceptContext = `
CURRENT STORY CONCEPT:
Title: ${storyConcept.title || project.title || 'Not set'}
Logline: ${storyConcept.logline || 'Not set'}
Synopsis: ${storyConcept.synopsis || 'Not set'}
Hook: ${storyConcept.hook || 'Not set'}
Protagonist Hint: ${storyConcept.protagonistHint || 'Not set'}
Conflict Type: ${storyConcept.conflictType || 'Not set'}

CURRENT STORY DNA:
Genre: ${storyDNA.genre || project.genre || 'Not set'}
Subgenre: ${storyDNA.subgenre || 'Not set'}
Tone: ${storyDNA.tone || 'Not set'}
Themes: ${Array.isArray(storyDNA.themes) ? storyDNA.themes.join(', ') : 'Not set'}
Prose Style: ${storyDNA.proseStyle || 'Not set'}
Timeframe: ${storyDNA.timeframe || 'Not set'}
`.trim();

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const prompt = `You are a skilled story development consultant. The user wants to refine their story concept and DNA based on their feedback.

${conceptContext}

USER FEEDBACK:
${feedback}

Based on this feedback, provide updated versions of the story concept and DNA. Make changes that address the user's feedback while maintaining consistency and quality. Only change fields that are relevant to the feedback - leave others unchanged.

IMPORTANT: Use UK British spelling conventions throughout (e.g., 'colour' not 'color', 'realise' not 'realize', 'behaviour' not 'behavior').

Respond with a JSON object in this exact format:
{
  "refinedConcept": {
    "title": "string",
    "logline": "string (1-2 sentences)",
    "synopsis": "string (2-4 paragraphs)",
    "hook": "string (the compelling opening hook)",
    "protagonistHint": "string (brief protagonist description)",
    "conflictType": "string (e.g., 'man vs nature', 'man vs self', etc.)"
  },
  "refinedDNA": {
    "genre": "string",
    "subgenre": "string",
    "tone": "string",
    "themes": ["array", "of", "theme", "strings"],
    "proseStyle": "string",
    "timeframe": "string (e.g., '1920s', 'Medieval Era', 'Near Future')"
  },
  "changes": ["array of strings describing what was changed and why"]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.refinedConcept || !result.refinedDNA || !result.changes) {
      throw new Error('Invalid response structure from AI');
    }

    if (result.refinedDNA.themes && !Array.isArray(result.refinedDNA.themes)) {
      result.refinedDNA.themes = [result.refinedDNA.themes];
    }

    logger.info({ projectId, changesCount: result.changes.length }, 'Story refinement completed');

    res.json({
      success: true,
      refinedConcept: result.refinedConcept,
      refinedDNA: result.refinedDNA,
      changes: result.changes,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error refining story');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/projects/:id/editorial-assistant
 * Conversational AI assistant for story concept and DNA refinement
 */
router.post('/:id/editorial-assistant', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userQuery, currentConcept, currentDNA, conversationHistory } = req.body;

    // Validate request body
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'User query is required and cannot be empty' },
      });
    }

    if (userQuery.length > 2000) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'User query must be 2000 characters or less' },
      });
    }

    if (!currentConcept || typeof currentConcept !== 'object') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Current concept is required' },
      });
    }

    if (!currentDNA || typeof currentDNA !== 'object') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Current DNA is required' },
      });
    }

    // Validate and limit conversation history
    let history: ConversationMessage[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      history = conversationHistory.slice(-20);
    }

    // Get project to validate it exists
    const projectStmt = db.prepare(`
      SELECT id, title FROM projects WHERE id = ?
    `);
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    logger.info(
      { projectId, queryLength: userQuery.length, historyLength: history.length },
      'Processing editorial assistant request'
    );

    // Step 1: Detect intent
    const intentResult = await detectIntent(userQuery, currentConcept, currentDNA);

    logger.info(
      { projectId, intent: intentResult.intent, confidence: intentResult.confidence },
      'Intent detected'
    );

    // Step 2: Generate response based on intent
    const editorialResponse = await generateEditorialResponse(
      intentResult,
      userQuery,
      currentConcept,
      currentDNA,
      history
    );

    // Calculate total token usage
    const totalInputTokens = intentResult.usage.input_tokens + editorialResponse.usage.input_tokens;
    const totalOutputTokens = intentResult.usage.output_tokens + editorialResponse.usage.output_tokens;

    // Log AI request for cost tracking
    metricsService.logAIRequest({
      requestType: 'editorial_assistant',
      projectId,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model: 'claude-sonnet-4-20250514',
      success: true,
      contextSummary: `Intent: ${intentResult.intent}, Response: ${editorialResponse.responseType}`,
    });

    logger.info(
      {
        projectId,
        responseType: editorialResponse.responseType,
        intent: intentResult.intent,
        totalInputTokens,
        totalOutputTokens,
      },
      'Editorial assistant response generated'
    );

    res.json({
      success: true,
      data: {
        responseType: editorialResponse.responseType,
        content: editorialResponse.content,
        appliedChanges: editorialResponse.appliedChanges,
        recommendedChanges: editorialResponse.recommendedChanges,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
      },
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in editorial assistant');

    // Log failed AI request
    try {
      metricsService.logAIRequest({
        requestType: 'editorial_assistant',
        projectId: req.params.id,
        inputTokens: 0,
        outputTokens: 0,
        model: 'claude-sonnet-4-20250514',
        success: false,
        errorMessage: error.message,
        contextSummary: 'Failed editorial assistant request',
      });
    } catch (logError) {
      // Ignore logging errors
    }

    let errorCode = 'INTERNAL_ERROR';
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorCode = 'AI_ERROR';
    }

    res.status(500).json({
      error: {
        code: errorCode,
        message: 'An error occurred while processing your request'
      }
    });
  }
});

export default router;
