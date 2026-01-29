import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import type {
  RegenerationMode,
  RegenerationActionType,
  VariationResult,
  ApplyVariationResult,
  SceneRegenerationResult,
  HistoryResult,
  StoryDNA,
  SceneCard,
} from '../shared/types/index.js';
import { createLogger } from './logger.service.js';
import { AI_REQUEST_TYPES } from '../constants/ai-request-types.js';

const logger = createLogger('services:regeneration');

/**
 * RegenerationService handles targeted text regeneration and variations
 *
 * Sprint 17: Enables users to regenerate specific selections without full chapter regen
 */
export class RegenerationService {
  /**
   * Generate 3 variations of selected text
   */
  async generateVariations(
    chapterId: string,
    selectionStart: number,
    selectionEnd: number,
    mode: RegenerationMode,
    contextTokens: number = 500
  ): Promise<VariationResult> {
    logger.info(`[RegenerationService] Generating variations for chapter ${chapterId}, mode: ${mode}`);

    // Get chapter data
    const chapterData = this.getChapterData(chapterId);
    const content = chapterData.editedContent || chapterData.content;

    if (!content) {
      throw new Error('Chapter content not found');
    }

    // Validate selection bounds
    if (selectionStart < 0 || selectionEnd > content.length || selectionStart >= selectionEnd) {
      throw new Error('Invalid selection range');
    }

    // Extract context
    const { before, after, selected } = this.extractContext(
      content,
      selectionStart,
      selectionEnd,
      contextTokens
    );

    // Build prompts based on mode
    const { system, user } = this.buildRegenerationPrompt(
      mode,
      selected,
      before,
      after,
      chapterData.story_dna
    );

    // Get projectId for tracking
    const projectId = this.getProjectIdFromChapter(chapterId);

    // Generate 3 variations from Claude
    const variations: [string, string, string] = ['', '', ''];

    for (let i = 0; i < 3; i++) {
      logger.info(`[RegenerationService] Generating variation ${i + 1}/3`);

      const variation = await claudeService.createCompletionWithUsage({
        system,
        messages: [{ role: 'user', content: user }],
        maxTokens: Math.min(4096, (selectionEnd - selectionStart) * 2),
        temperature: 0.8 + (i * 0.1), // Slightly different temperature for variety
        tracking: {
          requestType: AI_REQUEST_TYPES.REGENERATION,
          projectId,
          chapterId,
          contextSummary: `Variation ${i + 1} for ${mode} regeneration`,
        },
      });

      variations[i] = variation.content.trim();
    }

    // Store in database
    const variationId = `var_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO regeneration_variations (
        id, chapter_id, selection_start, selection_end,
        original_text, variation_1, variation_2, variation_3,
        regeneration_mode, context_before, context_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      variationId,
      chapterId,
      selectionStart,
      selectionEnd,
      selected,
      variations[0],
      variations[1],
      variations[2],
      mode,
      before,
      after,
      now
    );

    // Record in history
    const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const historyStmt = db.prepare(`
      INSERT INTO regeneration_history (
        id, chapter_id, variation_id, action_type, selection_start, selection_end,
        original_text, regeneration_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    historyStmt.run(
      historyId,
      chapterId,
      variationId,
      'generate_variations',
      selectionStart,
      selectionEnd,
      selected,
      mode,
      now
    );

    logger.info(`[RegenerationService] Variations generated successfully: ${variationId}`);

    return {
      variationId,
      originalText: selected,
      variations,
      contextBefore: before,
      contextAfter: after,
      mode,
    };
  }

  /**
   * Apply selected variation to chapter edit
   */
  async applyVariation(
    chapterId: string,
    variationId: string,
    selectedVariation: number
  ): Promise<ApplyVariationResult> {
    logger.info(`[RegenerationService] Applying variation ${selectedVariation} for ${variationId}`);

    // Validate selectedVariation
    if (selectedVariation < 0 || selectedVariation > 3) {
      throw new Error('Invalid variation selection (must be 0-3)');
    }

    // Get variation data
    const varStmt = db.prepare<[string], any>(`
      SELECT * FROM regeneration_variations WHERE id = ?
    `);

    const variation = varStmt.get(variationId);
    if (!variation) {
      throw new Error('Variation not found');
    }

    // Get current chapter content
    const chapterData = this.getChapterData(chapterId);
    let content = chapterData.editedContent || chapterData.content;

    if (!content) {
      throw new Error('Chapter content not found');
    }

    // Determine which text to use
    let replacementText: string;
    if (selectedVariation === 0) {
      replacementText = variation.original_text;
    } else {
      replacementText = variation[`variation_${selectedVariation}`];
    }

    // Replace text
    const before = content.substring(0, variation.selection_start);
    const after = content.substring(variation.selection_end);
    const updatedContent = before + replacementText + after;

    // Calculate word count
    const wordCount = updatedContent.trim().split(/\s+/).length;

    // Update or create chapter edit
    const existingEdit = db.prepare<[string], { id: string }>(`
      SELECT id FROM chapter_edits WHERE chapter_id = ?
    `).get(chapterId);

    const now = new Date().toISOString();

    if (existingEdit) {
      const updateStmt = db.prepare(`
        UPDATE chapter_edits
        SET edited_content = ?, word_count = ?, updated_at = ?
        WHERE chapter_id = ?
      `);
      updateStmt.run(updatedContent, wordCount, now, chapterId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO chapter_edits (
          id, chapter_id, edited_content, word_count, is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const editId = `edit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      insertStmt.run(editId, chapterId, updatedContent, wordCount, 0, now, now);
    }

    // Update variation record
    const updateVarStmt = db.prepare(`
      UPDATE regeneration_variations
      SET selected_variation = ?
      WHERE id = ?
    `);
    updateVarStmt.run(selectedVariation, variationId);

    // Record in history
    const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const historyStmt = db.prepare(`
      INSERT INTO regeneration_history (
        id, chapter_id, variation_id, action_type, selection_start, selection_end,
        original_text, final_text, regeneration_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    historyStmt.run(
      historyId,
      chapterId,
      variationId,
      'apply_variation',
      variation.selection_start,
      variation.selection_end,
      variation.original_text,
      replacementText,
      variation.regeneration_mode,
      now
    );

    logger.info(`[RegenerationService] Variation applied successfully`);

    return {
      success: true,
      updatedContent,
      wordCount,
      historyId,
    };
  }

  /**
   * Regenerate entire scene within chapter
   */
  async regenerateScene(
    chapterId: string,
    sceneIndex: number
  ): Promise<SceneRegenerationResult> {
    logger.info(`[RegenerationService] Regenerating scene ${sceneIndex} for chapter ${chapterId}`);

    // Get chapter data
    const chapterData = this.getChapterData(chapterId);
    const content = chapterData.editedContent || chapterData.content;

    if (!content || !chapterData.scene_cards || sceneIndex >= chapterData.scene_cards.length) {
      throw new Error('Invalid scene index or chapter data');
    }

    const sceneCard = chapterData.scene_cards[sceneIndex];

    // Build scene regeneration prompt
    const systemPrompt = `You are the Author Agent for this novel. You are regenerating a specific scene within a chapter.

Maintain:
- The overall story flow and continuity
- Character voices and personalities
- The genre and tone established in the story DNA
- Plot points from the scene card

Your task is to rewrite this scene with improved prose, pacing, and emotional impact while keeping the same essential story beats.`;

    const userPrompt = `Regenerate the following scene based on this scene card.

STORY DNA:
${JSON.stringify(chapterData.story_dna, null, 2)}

SCENE CARD:
${JSON.stringify(sceneCard, null, 2)}

CURRENT SCENE TEXT:
${this.extractSceneText(content, sceneIndex, chapterData.scene_cards.length)}

Rewrite this scene maintaining the plot points but improving the prose quality, pacing, and emotional depth.

Output only the regenerated scene text:`;

    // Get projectId for tracking
    const projectId = this.getProjectIdFromChapter(chapterId);

    const sceneContent = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.9,
      tracking: {
        requestType: AI_REQUEST_TYPES.REGENERATION,
        projectId,
        chapterId,
        contextSummary: `Scene ${sceneIndex} regeneration`,
      },
    });

    // Replace scene in full content
    const fullContent = this.replaceSceneInContent(
      content,
      sceneIndex,
      chapterData.scene_cards.length,
      sceneContent.content.trim()
    );

    // Calculate word count
    const wordCount = fullContent.trim().split(/\s+/).length;

    // Update chapter edit
    const existingEdit = db.prepare<[string], { id: string }>(`
      SELECT id FROM chapter_edits WHERE chapter_id = ?
    `).get(chapterId);

    const now = new Date().toISOString();

    if (existingEdit) {
      const updateStmt = db.prepare(`
        UPDATE chapter_edits
        SET edited_content = ?, word_count = ?, updated_at = ?
        WHERE chapter_id = ?
      `);
      updateStmt.run(fullContent, wordCount, now, chapterId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO chapter_edits (
          id, chapter_id, edited_content, word_count, is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const editId = `edit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      insertStmt.run(editId, chapterId, fullContent, wordCount, 0, now, now);
    }

    // Record in history
    const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const historyStmt = db.prepare(`
      INSERT INTO regeneration_history (
        id, chapter_id, action_type, original_text, final_text, regeneration_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const originalScene = this.extractSceneText(content, sceneIndex, chapterData.scene_cards.length);
    historyStmt.run(
      historyId,
      chapterId,
      'scene_regen',
      originalScene,
      sceneContent.content.trim(),
      'scene',
      now
    );

    logger.info(`[RegenerationService] Scene regenerated successfully`);

    return {
      success: true,
      sceneContent: sceneContent.content.trim(),
      fullContent,
      sceneIndex,
      historyId,
    };
  }

  /**
   * Helper: Get project ID from chapter ID
   */
  private getProjectIdFromChapter(chapterId: string): string | null {
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

  /**
   * Get regeneration history for a chapter
   */
  getHistory(chapterId: string, limit: number = 20, offset: number = 0): HistoryResult {
    const stmt = db.prepare<[string, number, number], any>(`
      SELECT * FROM regeneration_history
      WHERE chapter_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const history = stmt.all(chapterId, limit, offset);

    const countStmt = db.prepare<[string], { total: number }>(`
      SELECT COUNT(*) as total FROM regeneration_history
      WHERE chapter_id = ?
    `);

    const { total } = countStmt.get(chapterId) || { total: 0 };

    return {
      history: history.map((h: any) => ({
        id: h.id,
        actionType: h.action_type,
        originalText: h.original_text,
        finalText: h.final_text,
        mode: h.regeneration_mode,
        selectionStart: h.selection_start,
        selectionEnd: h.selection_end,
        createdAt: h.created_at,
      })),
      total,
    };
  }

  /**
   * Helper: Extract context around selection
   */
  private extractContext(
    content: string,
    start: number,
    end: number,
    tokens: number
  ): { before: string; after: string; selected: string } {
    const selected = content.substring(start, end);

    // Approximate: 1 token ≈ 4 characters
    const charLimit = tokens * 4;

    // Get context before
    const beforeStart = Math.max(0, start - charLimit);
    const before = content.substring(beforeStart, start);

    // Get context after
    const afterEnd = Math.min(content.length, end + charLimit);
    const after = content.substring(end, afterEnd);

    return { before, after, selected };
  }

  /**
   * Helper: Build regeneration prompt based on mode
   */
  private buildRegenerationPrompt(
    mode: RegenerationMode,
    selectedText: string,
    contextBefore: string,
    contextAfter: string,
    storyDNA: any
  ): { system: string; user: string } {
    const baseSystem = `You are an expert prose editor helping to improve a novel.

Story Context:
${JSON.stringify(storyDNA, null, 2)}

Your task is to generate improved alternatives for a selected passage.`;

    let modeInstructions = '';

    switch (mode) {
      case 'dialogue':
        modeInstructions = `Focus on DIALOGUE:
- Make dialogue more natural and character-specific
- Improve dialogue tags and beats
- Add subtext and emotional nuance
- Preserve all non-dialogue text exactly as-is
- Maintain character voices`;
        break;

      case 'description':
        modeInstructions = `Focus on DESCRIPTION:
- Enhance sensory details (sight, sound, smell, touch, taste)
- Improve setting and atmosphere
- Add vivid, specific imagery
- Preserve all dialogue exactly as-is
- Use fresh, evocative language`;
        break;

      case 'scene':
        modeInstructions = `Focus on the ENTIRE SCENE:
- Improve overall pacing and flow
- Enhance both dialogue and description
- Strengthen emotional beats
- Maintain plot points and character actions
- Improve prose quality throughout`;
        break;

      case 'general':
      default:
        modeInstructions = `Focus on OVERALL PROSE QUALITY:
- Vary sentence structure and length
- Strengthen word choice
- Improve clarity and impact
- Maintain the author's voice
- Preserve plot and character actions`;
        break;
    }

    const system = `${baseSystem}\n\n${modeInstructions}`;

    const user = `Here is the passage to improve, with context:

CONTEXT BEFORE:
${contextBefore}

[SELECTED TEXT TO REGENERATE:]
${selectedText}

CONTEXT AFTER:
${contextAfter}

Generate an improved version of the SELECTED TEXT. Output ONLY the improved text, no explanations or commentary:`;

    return { system, user };
  }

  /**
   * Helper: Get chapter data with related context
   */
  private getChapterData(chapterId: string): {
    content: string | null;
    editedContent: string | null;
    scene_cards: SceneCard[];
    story_dna: StoryDNA | null;
  } {
    const stmt = db.prepare<[string], any>(`
      SELECT
        c.content,
        c.scene_cards,
        ce.edited_content,
        p.story_dna
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN chapter_edits ce ON ce.chapter_id = c.id
      WHERE c.id = ?
    `);

    const row = stmt.get(chapterId);
    if (!row) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    return {
      content: row.content,
      editedContent: row.edited_content,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
      story_dna: row.story_dna ? JSON.parse(row.story_dna) : null,
    };
  }

  /**
   * Helper: Extract scene text from chapter content
   * Simple heuristic: divide content equally by scene count
   */
  private extractSceneText(content: string, sceneIndex: number, totalScenes: number): string {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const parasPerScene = Math.floor(paragraphs.length / totalScenes);

    const startPara = sceneIndex * parasPerScene;
    const endPara = sceneIndex === totalScenes - 1
      ? paragraphs.length
      : (sceneIndex + 1) * parasPerScene;

    return paragraphs.slice(startPara, endPara).join('\n\n');
  }

  /**
   * Helper: Replace scene in content
   */
  private replaceSceneInContent(
    content: string,
    sceneIndex: number,
    totalScenes: number,
    newSceneText: string
  ): string {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const parasPerScene = Math.floor(paragraphs.length / totalScenes);

    const startPara = sceneIndex * parasPerScene;
    const endPara = sceneIndex === totalScenes - 1
      ? paragraphs.length
      : (sceneIndex + 1) * parasPerScene;

    const before = paragraphs.slice(0, startPara);
    const after = paragraphs.slice(endPara);

    return [...before, newSceneText, ...after].join('\n\n');
  }
}

// Export singleton instance
export const regenerationService = new RegenerationService();
