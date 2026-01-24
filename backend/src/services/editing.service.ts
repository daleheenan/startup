import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import type { Chapter, Flag } from '../../../shared/types/index.js';

/**
 * EditResult captures the output of an editing pass
 */
export interface EditResult {
  editorType: 'developmental' | 'line' | 'continuity' | 'copy';
  originalContent: string;
  editedContent: string;
  suggestions: EditorSuggestion[];
  flags: Flag[];
  approved: boolean;
}

export interface EditorSuggestion {
  type: 'plot' | 'character' | 'pacing' | 'prose' | 'dialogue' | 'continuity' | 'grammar';
  location: string;
  issue: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major';
}

/**
 * EditingService provides specialized editing agents for chapter refinement
 *
 * The editing pipeline runs after the Author Agent writes a chapter:
 * 1. Developmental Editor - Big-picture feedback on structure, pacing, character arcs
 * 2. Author Revision (optional) - Author Agent revises based on dev feedback
 * 3. Line Editor - Polish prose, dialogue, sensory details
 * 4. Continuity Editor - Check consistency with story bible and previous chapters
 * 5. Copy Editor - Grammar, punctuation, style guide adherence
 */
export class EditingService {
  /**
   * Developmental Editor - Analyzes story structure, pacing, character development
   */
  async developmentalEdit(chapterId: string): Promise<EditResult> {
    console.log(`[EditingService] Running developmental edit for chapter ${chapterId}`);

    // Get chapter data
    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const systemPrompt = `You are a developmental editor for fiction. Your expertise is in story structure, pacing, character development, and plot logic.

Your task is to analyze a chapter and provide constructive feedback on:
1. **Plot & Structure**: Does the scene accomplish its goals? Is there a clear arc (setup → conflict → outcome)?
2. **Pacing**: Is the pacing appropriate? Too slow? Too rushed? Are there dead spots?
3. **Character Consistency**: Do characters act in ways consistent with their established motivations and personality?
4. **Character Development**: Do we see meaningful character growth or change?
5. **Conflict & Tension**: Is there sufficient conflict? Does tension escalate appropriately?
6. **Emotional Beats**: Do emotional moments land effectively?
7. **Foreshadowing & Setup**: Are there missed opportunities for setup/payoff?

Be specific. Point to exact locations in the text. Offer concrete suggestions for improvement.

For minor issues, just note them. For moderate to major issues that need addressing, create a FLAG.`;

    const userPrompt = `Review this chapter for developmental issues.

CHAPTER NUMBER: ${chapterData.chapter_number}

EXPECTED SCENE GOALS:
${JSON.stringify(chapterData.scene_cards, null, 2)}

CHAPTER CONTENT:
${chapterData.content}

Provide your analysis in this JSON format:
{
  "overallAssessment": "1-2 sentence summary of chapter quality",
  "strengths": ["strength 1", "strength 2"],
  "suggestions": [
    {
      "type": "plot|character|pacing",
      "location": "paragraph or scene reference",
      "issue": "what's the problem",
      "suggestion": "how to fix it",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "unresolved|needs_review|plot_hole",
      "severity": "minor|major|critical",
      "description": "what needs attention",
      "location": "where in the chapter"
    }
  ],
  "needsRevision": true|false,
  "revisionGuidance": "If needsRevision is true, provide clear guidance for the Author Agent on what to fix"
}

Output only valid JSON, no commentary:`;

    const response = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Parse response
    const analysis = this.parseEditorResponse(response);

    // Store suggestions and flags
    const suggestions: EditorSuggestion[] = analysis.suggestions || [];
    const flags: Flag[] = (analysis.flags || []).map((f: any) => ({
      id: this.generateFlagId(),
      type: f.type,
      severity: f.severity,
      description: f.description,
      location: f.location,
      resolved: false,
    }));

    console.log(`[EditingService] Dev edit complete: ${suggestions.length} suggestions, ${flags.length} flags`);
    console.log(`[EditingService] Needs revision: ${analysis.needsRevision}`);

    return {
      editorType: 'developmental',
      originalContent: chapterData.content,
      editedContent: chapterData.content, // Dev editor doesn't modify content directly
      suggestions,
      flags,
      approved: !analysis.needsRevision,
    };
  }

  /**
   * Line Editor - Polishes prose, dialogue, sensory details
   */
  async lineEdit(chapterId: string): Promise<EditResult> {
    console.log(`[EditingService] Running line edit for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const systemPrompt = `You are a line editor for fiction. Your expertise is in prose craft, dialogue, and sensory writing.

Your task is to polish the chapter at the sentence and paragraph level:
1. **Sentence Structure**: Vary sentence length and structure for rhythm
2. **Active Voice**: Prefer active over passive voice (unless passive is intentional)
3. **Show vs Tell**: Strengthen showing through concrete sensory details
4. **Dialogue**: Make dialogue natural, character-specific, with proper beats and tags
5. **Word Choice**: Replace weak or generic words with specific, vivid alternatives
6. **Sensory Details**: Add or enhance sensory descriptions (sight, sound, smell, touch, taste)
7. **Redundancy**: Eliminate unnecessary repetition
8. **Clichés**: Replace clichéd phrases with fresh language

Make direct edits to improve the prose. Mark sections that need author attention with [NEEDS AUTHOR: reason].`;

    const userPrompt = `Polish this chapter at the line level. Focus on prose quality, dialogue, and sensory details.

GENRE & STYLE:
${JSON.stringify(chapterData.story_dna, null, 2)}

CHAPTER CONTENT:
${chapterData.content}

Return the edited chapter content, making direct improvements to prose while preserving the plot and character voice.

Output the edited chapter text:`;

    const editedContent = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.8,
    });

    // Extract any [NEEDS AUTHOR: ...] markers as flags
    const flags = this.extractAuthorFlags(editedContent);

    console.log(`[EditingService] Line edit complete: ${flags.length} flags for author review`);

    return {
      editorType: 'line',
      originalContent: chapterData.content,
      editedContent: editedContent.trim(),
      suggestions: [],
      flags,
      approved: true,
    };
  }

  /**
   * Continuity Editor - Checks consistency with story bible and previous chapters
   */
  async continuityEdit(chapterId: string): Promise<EditResult> {
    console.log(`[EditingService] Running continuity check for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    // Get previous chapter summaries for context
    const previousSummaries = this.getPreviousChapterSummaries(chapterId, 5);

    const systemPrompt = `You are a continuity editor for fiction. Your job is to catch inconsistencies and continuity errors.

Check for:
1. **Character Names**: Are character names spelled consistently?
2. **Physical Descriptions**: Do character appearances match established descriptions?
3. **Character Knowledge**: Do characters know things they shouldn't, or not know things they should?
4. **Timeline**: Is the sequence of events consistent? Time of day, season, etc.?
5. **Locations**: Do location descriptions match previous mentions?
6. **World Rules**: Are magic/technology systems used consistently?
7. **Relationships**: Are character relationships consistent with previous chapters?
8. **Object Tracking**: Do objects appear/disappear illogically?

For each inconsistency, provide the conflicting information and suggest a fix.`;

    const userPrompt = `Check this chapter for continuity errors.

STORY BIBLE:
${JSON.stringify(chapterData.story_bible, null, 2)}

PREVIOUS CHAPTERS SUMMARY:
${previousSummaries.map((s, i) => `Chapter ${s.chapter_number}: ${s.summary}`).join('\n\n')}

CURRENT CHAPTER:
${chapterData.content}

Provide your analysis in this JSON format:
{
  "errors": [
    {
      "type": "continuity",
      "location": "where in current chapter",
      "issue": "what's inconsistent",
      "conflictsWith": "what it conflicts with (story bible or previous chapter)",
      "suggestion": "how to fix it",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "continuity_error",
      "severity": "minor|major|critical",
      "description": "description of the continuity issue",
      "location": "where in the chapter"
    }
  ]
}

Output only valid JSON, no commentary:`;

    const response = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.5,
    });

    const analysis = this.parseEditorResponse(response);

    const suggestions: EditorSuggestion[] = (analysis.errors || []).map((e: any) => ({
      type: 'continuity',
      location: e.location,
      issue: e.issue,
      suggestion: e.suggestion,
      severity: e.severity,
    }));

    const flags: Flag[] = (analysis.flags || []).map((f: any) => ({
      id: this.generateFlagId(),
      type: f.type,
      severity: f.severity,
      description: f.description,
      location: f.location,
      resolved: false,
    }));

    console.log(`[EditingService] Continuity check complete: ${suggestions.length} issues, ${flags.length} flags`);

    return {
      editorType: 'continuity',
      originalContent: chapterData.content,
      editedContent: chapterData.content, // Continuity editor doesn't modify content
      suggestions,
      flags,
      approved: flags.length === 0,
    };
  }

  /**
   * Copy Editor - Grammar, punctuation, style consistency
   */
  async copyEdit(chapterId: string): Promise<EditResult> {
    console.log(`[EditingService] Running copy edit for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const systemPrompt = `You are a copy editor for fiction. Your focus is on grammar, punctuation, and style consistency.

Check and fix:
1. **Grammar**: Subject-verb agreement, tense consistency, pronoun agreement
2. **Punctuation**: Dialogue tags, commas, apostrophes, em-dashes
3. **Spelling**: Consistent spelling of names and places
4. **Style Guide**:
   - Use em-dashes (—) not hyphens for interruptions
   - Dialogue: "Quote," tag. OR "Quote."
   - Numbers: spell out one through nine, use numerals for 10+
   - Oxford comma: use it
5. **Formatting**: Consistent paragraph breaks, scene breaks (use * * *)
6. **Capitalization**: Proper nouns, beginning of sentences

Make direct corrections. Do NOT change word choice, sentence structure, or prose style unless it's a clear grammatical error.`;

    const userPrompt = `Copy edit this chapter. Fix grammar, punctuation, and style issues.

CHAPTER CONTENT:
${chapterData.content}

Return the copy-edited chapter with all corrections applied.

Output the corrected chapter text:`;

    const editedContent = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.3, // Lower temperature for more precise corrections
    });

    console.log(`[EditingService] Copy edit complete`);

    return {
      editorType: 'copy',
      originalContent: chapterData.content,
      editedContent: editedContent.trim(),
      suggestions: [],
      flags: [],
      approved: true,
    };
  }

  /**
   * Author Revision - Author Agent revises chapter based on developmental feedback
   */
  async authorRevision(chapterId: string, devEditResult: EditResult): Promise<string> {
    console.log(`[EditingService] Running author revision for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    if (!devEditResult.approved) {
      throw new Error('Cannot revise without developmental editor feedback');
    }

    const systemPrompt = `You are the Author Agent for this novel. You've written a chapter, and your developmental editor has provided feedback.

Your task is to revise the chapter to address the editor's concerns while maintaining:
- The core plot beats from the scene cards
- Character voices and personalities
- The genre and tone of the story

Make substantive revisions where needed, not just surface changes.`;

    const userPrompt = `Revise this chapter based on the developmental editor's feedback.

ORIGINAL CHAPTER:
${chapterData.content}

DEVELOPMENTAL EDITOR FEEDBACK:
${JSON.stringify(devEditResult.suggestions, null, 2)}

${devEditResult.suggestions.find(s => s.severity === 'major') ? 'REVISION GUIDANCE:\nPay special attention to the major issues identified above. These need significant revision.' : ''}

Rewrite the chapter, addressing the editor's feedback while maintaining the story's voice and plot.

Output the revised chapter:`;

    const revisedContent = await claudeService.createCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 1.0,
    });

    console.log(`[EditingService] Author revision complete`);

    return revisedContent.trim();
  }

  /**
   * Helper: Get chapter data with related context
   */
  private getChapterData(chapterId: string): {
    id: string;
    chapter_number: number;
    content: string | null;
    scene_cards: any[];
    story_bible: any;
    story_dna: any;
  } {
    const stmt = db.prepare<[string], any>(`
      SELECT
        c.id,
        c.chapter_number,
        c.content,
        c.scene_cards,
        p.story_bible,
        p.story_dna
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      JOIN projects p ON b.project_id = p.id
      WHERE c.id = ?
    `);

    const row = stmt.get(chapterId);
    if (!row) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    return {
      id: row.id,
      chapter_number: row.chapter_number,
      content: row.content,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
      story_bible: row.story_bible ? JSON.parse(row.story_bible) : null,
      story_dna: row.story_dna ? JSON.parse(row.story_dna) : null,
    };
  }

  /**
   * Helper: Get summaries of previous chapters for continuity checking
   */
  private getPreviousChapterSummaries(
    chapterId: string,
    limit: number
  ): Array<{ chapter_number: number; summary: string }> {
    const stmt = db.prepare<[string, number], { chapter_number: number; summary: string }>(`
      SELECT c2.chapter_number, c2.summary
      FROM chapters c1
      JOIN chapters c2 ON c2.book_id = c1.book_id
      WHERE c1.id = ?
        AND c2.chapter_number < c1.chapter_number
        AND c2.summary IS NOT NULL
      ORDER BY c2.chapter_number DESC
      LIMIT ?
    `);

    return stmt.all(chapterId, limit).reverse(); // Return in chronological order
  }

  /**
   * Helper: Parse JSON response from editor, handling markdown wrappers
   */
  private parseEditorResponse(response: string): any {
    try {
      // Try direct parse first
      return JSON.parse(response);
    } catch {
      // Extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || response.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse editor response as JSON');
    }
  }

  /**
   * Helper: Extract [NEEDS AUTHOR: ...] markers from edited text
   */
  private extractAuthorFlags(editedContent: string): Flag[] {
    const flags: Flag[] = [];
    const regex = /\[NEEDS AUTHOR:\s*([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(editedContent)) !== null) {
      flags.push({
        id: this.generateFlagId(),
        type: 'needs_review',
        severity: 'major',
        description: match[1],
        location: 'See marked location in chapter text',
        resolved: false,
      });
    }

    return flags;
  }

  /**
   * Helper: Generate unique flag ID
   */
  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Update chapter with edit result
   */
  async applyEditResult(chapterId: string, result: EditResult): Promise<void> {
    console.log(`[EditingService] Applying ${result.editorType} edit to chapter ${chapterId}`);

    // Get existing flags
    const getStmt = db.prepare<[string], { flags: string | null }>(`
      SELECT flags FROM chapters WHERE id = ?
    `);
    const row = getStmt.get(chapterId);
    const existingFlags: Flag[] = row && row.flags ? JSON.parse(row.flags) : [];

    // Merge flags
    const allFlags = [...existingFlags, ...result.flags];

    // Update chapter
    const updateStmt = db.prepare(`
      UPDATE chapters
      SET content = ?, flags = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      result.editedContent,
      JSON.stringify(allFlags),
      new Date().toISOString(),
      chapterId
    );

    console.log(`[EditingService] Applied edit: ${result.flags.length} new flags added`);
  }
}

// Export singleton instance
export const editingService = new EditingService();
