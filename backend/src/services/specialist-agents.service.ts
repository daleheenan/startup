import { claudeService } from './claude.service.js';
import db from '../db/connection.js';
import type { Flag } from '../shared/types/index.js';
import { createLogger } from './logger.service.js';
import { extractJsonObject } from '../utils/json-extractor.js';

const logger = createLogger('services:specialist-agents');

/**
 * SpecialistResult captures the output of a specialist agent review
 */
export interface SpecialistResult {
  agentType: 'sensitivity' | 'researcher' | 'beta_reader' | 'opening' | 'dialogue' | 'hook';
  originalContent: string;
  editedContent: string;
  findings: SpecialistFinding[];
  flags: Flag[];
  score?: number; // Optional engagement/quality score
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SpecialistFinding {
  type: string;
  location: string;
  issue: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

/**
 * SpecialistAgentsService provides specialized review agents for publication-quality novels
 *
 * These agents run after the main editing pipeline to provide specialized analysis:
 * - Sensitivity Reader: Reviews for harmful stereotypes and cultural accuracy
 * - Historical/Technical Researcher: Validates period details and technical accuracy
 * - Beta Reader: Simulates reader engagement and identifies confusion points
 * - Opening Specialist: Optimizes first chapter hooks and opening lines
 * - Dialogue Coach: Ensures natural dialogue and distinct character voices
 * - Chapter Hook Specialist: Ensures each chapter ends with forward momentum
 *
 * TOKEN COST ESTIMATES (per chapter, ~3000 words):
 * - Sensitivity Reader: ~4,500 input + ~1,500 output = ~$0.045
 * - Researcher: ~5,000 input + ~2,000 output = ~$0.055
 * - Beta Reader: ~4,000 input + ~1,500 output = ~$0.040
 * - Opening Specialist: ~3,500 input + ~2,000 output = ~$0.042
 * - Dialogue Coach: ~4,000 input + ~1,500 output = ~$0.040
 * - Hook Specialist: ~3,500 input + ~1,000 output = ~$0.032
 *
 * BOOK TOTAL (25 chapters): ~$6.35 additional for all specialist agents
 */
export class SpecialistAgentsService {
  /**
   * Sensitivity Reader - Reviews for harmful stereotypes, cultural accuracy, representation
   *
   * Estimated tokens: ~4,500 input, ~1,500 output per chapter
   * Cost per chapter: ~$0.045 (Sonnet 3.5)
   * Cost per 25-chapter book: ~$1.13
   */
  async sensitivityReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running sensitivity review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are a professional sensitivity reader with expertise in diverse representation, cultural authenticity, and inclusive storytelling.

Your task is to review fiction for potentially harmful content:

1. **Stereotypes & Tropes**: Identify harmful stereotypes about any group (racial, ethnic, gender, disability, LGBTQ+, religious, socioeconomic)
2. **Cultural Accuracy**: Flag inaccurate cultural depictions, appropriation concerns, or misrepresented traditions
3. **Representation Quality**: Evaluate if diverse characters are fully realized or tokenized
4. **Microaggressions**: Identify subtle harmful language patterns
5. **Power Dynamics**: Review depictions of marginalized groups and power imbalances
6. **Disability Representation**: Check for ableist language or "inspiration porn"
7. **Historical Sensitivity**: For period pieces, note anachronistic attitudes that need framing

CHARACTER CONTEXT:
${JSON.stringify(projectData.characters?.map((c: any) => ({ name: c.name, ethnicity: c.ethnicity, nationality: c.nationality, role: c.role })) || [], null, 2)}

GENRE/SETTING: ${projectData.genre} - ${projectData.timeframe || 'Contemporary'}

Be specific. Quote problematic passages. Provide alternative phrasing when possible.
Rate severity as: minor (consider changing), moderate (should change), major (must change), critical (potentially harmful if published).

For findings that require revision, suggest specific rewrites that maintain the story intent while removing harm.`;

    const userPrompt = `Review this chapter for sensitivity concerns.

CHAPTER ${chapterData.chapter_number}: ${chapterData.title || ''}

CHAPTER CONTENT:
${chapterData.content}

Provide your analysis in this JSON format:
{
  "overallAssessment": "1-2 sentence summary",
  "findings": [
    {
      "type": "stereotype|cultural_accuracy|representation|microaggression|power_dynamics|disability|historical",
      "location": "quote or paragraph reference",
      "issue": "what's problematic",
      "suggestion": "alternative approach or wording",
      "severity": "minor|moderate|major|critical"
    }
  ],
  "flags": [
    {
      "type": "sensitivity_concern",
      "severity": "minor|major|critical",
      "description": "what needs attention",
      "location": "where in chapter"
    }
  ],
  "revisedContent": "If major or critical findings exist, provide the full revised chapter. Otherwise, output the original."
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 6000,
      temperature: 0.3,
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      revisedContent?: string;
    } | null;

    logger.info(`[SpecialistAgents] Sensitivity review complete: ${parsed?.findings?.length || 0} findings`);

    return {
      agentType: 'sensitivity',
      originalContent: chapterData.content,
      editedContent: parsed?.revisedContent || chapterData.content,
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      usage: apiResponse.usage,
    };
  }

  /**
   * Historical/Technical Researcher - Validates period details and technical accuracy
   *
   * Estimated tokens: ~5,000 input, ~2,000 output per chapter
   * Cost per chapter: ~$0.055 (Sonnet 3.5)
   * Cost per 25-chapter book: ~$1.38
   */
  async researchReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running research review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are a fact-checker and research specialist for fiction. Your expertise spans historical accuracy, technical details, and real-world consistency.

Your task is to validate factual elements:

1. **Historical Accuracy**: Verify period-appropriate technology, language, customs, social structures
2. **Technical Details**: Check accuracy of professional jargon (medical, legal, military, scientific)
3. **Geography & Locations**: Validate real-world locations, travel times, physical descriptions
4. **Temporal Consistency**: Verify dates, timelines, historical events referenced
5. **Scientific Accuracy**: Check plausibility of scientific/technical elements
6. **Cultural Practices**: Validate cultural customs, traditions, religious practices
7. **Language & Dialects**: Check period-appropriate speech patterns and terminology
8. **Material Culture**: Verify period-appropriate objects, clothing, food, transportation

STORY SETTING:
- Genre: ${projectData.genre}
- Time Period: ${projectData.timeframe || 'Not specified - assume contemporary'}
- Locations: ${JSON.stringify(projectData.locations?.map((l: any) => l.name) || [])}

Focus on errors that would break reader immersion or draw criticism from knowledgeable readers.
Distinguish between artistic license (acceptable) and factual errors (needs fixing).`;

    const userPrompt = `Research-check this chapter for factual accuracy.

CHAPTER ${chapterData.chapter_number}: ${chapterData.title || ''}

CHAPTER CONTENT:
${chapterData.content}

Provide your analysis in this JSON format:
{
  "overallAssessment": "1-2 sentence summary of accuracy",
  "findings": [
    {
      "type": "historical|technical|geographic|temporal|scientific|cultural|language|material",
      "location": "quote or paragraph reference",
      "issue": "what's inaccurate",
      "suggestion": "accurate alternative",
      "severity": "minor|moderate|major|critical"
    }
  ],
  "flags": [
    {
      "type": "research_needed",
      "severity": "minor|major|critical",
      "description": "what needs verification",
      "location": "where in chapter"
    }
  ],
  "revisedContent": "If major findings exist, provide the full revised chapter with corrections. Otherwise, output the original."
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 6000,
      temperature: 0.2,
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      revisedContent?: string;
    } | null;

    logger.info(`[SpecialistAgents] Research review complete: ${parsed?.findings?.length || 0} findings`);

    return {
      agentType: 'researcher',
      originalContent: chapterData.content,
      editedContent: parsed?.revisedContent || chapterData.content,
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      usage: apiResponse.usage,
    };
  }

  /**
   * Beta Reader Agent - Simulates reader engagement and identifies confusion points
   *
   * Estimated tokens: ~4,000 input, ~1,500 output per chapter
   * Cost per chapter: ~$0.040 (Sonnet 3.5)
   * Cost per 25-chapter book: ~$1.00
   */
  async betaReaderReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running beta reader review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are a beta reader providing authentic reader reactions. You represent the target audience for ${projectData.genre} fiction.

Read as a genuine reader would - tracking your emotional engagement, confusion, and investment.

Your task is to report:

1. **Engagement Level**: Where did you feel drawn in? Where did attention wander?
2. **Emotional Reactions**: What emotions did you feel and when? Were they intended?
3. **Confusion Points**: Where did you get lost or need to re-read?
4. **Questions Raised**: What questions does this chapter raise? Are they intentional hooks?
5. **Character Investment**: Do you care about the characters? Why/why not?
6. **Pacing Feel**: Did it feel too slow? Too rushed? Just right?
7. **Page-Turner Test**: At chapter end, would you keep reading? Why/why not?
8. **Memorable Moments**: What stuck with you? What will you remember?
9. **DNF Risk Points**: Any moments where a reader might put the book down?

Be honest and specific. Good beta readers tell authors what's not working, even when it's hard to hear.
Score engagement on a 1-10 scale at various points throughout the chapter.`;

    const userPrompt = `Read this chapter as a beta reader and provide your authentic reactions.

GENRE: ${projectData.genre}
CHAPTER ${chapterData.chapter_number}: ${chapterData.title || ''}

CHAPTER CONTENT:
${chapterData.content}

Provide your beta reader report in this JSON format:
{
  "overallEngagement": 1-10,
  "overallAssessment": "2-3 sentence gut reaction",
  "emotionalJourney": "Description of how your feelings changed through the chapter",
  "findings": [
    {
      "type": "engagement_drop|confusion|pacing|character_disconnect|dnf_risk|highlight",
      "location": "paragraph or quote reference",
      "issue": "what happened to your reading experience",
      "suggestion": "what might improve it",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "reader_concern",
      "severity": "minor|major|critical",
      "description": "significant reader experience issue",
      "location": "where in chapter"
    }
  ],
  "wouldContinueReading": true/false,
  "whyOrWhyNot": "explanation"
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4000,
      temperature: 0.7, // Higher temperature for more authentic/varied reactions
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      overallEngagement?: number;
    } | null;

    logger.info(`[SpecialistAgents] Beta reader review complete: engagement ${parsed?.overallEngagement}/10`);

    return {
      agentType: 'beta_reader',
      originalContent: chapterData.content,
      editedContent: chapterData.content, // Beta readers don't edit, just report
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      score: parsed?.overallEngagement,
      usage: apiResponse.usage,
    };
  }

  /**
   * Opening Specialist - Optimizes first chapter hooks and opening lines
   * Only runs on Chapter 1
   *
   * Estimated tokens: ~3,500 input, ~2,000 output per book (chapter 1 only)
   * Cost per book: ~$0.042 (Sonnet 3.5)
   */
  async openingReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running opening specialist review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    // Only meaningful for chapter 1
    if (chapterData.chapter_number !== 1) {
      logger.info(`[SpecialistAgents] Skipping opening review - not chapter 1`);
      return {
        agentType: 'opening',
        originalContent: chapterData.content,
        editedContent: chapterData.content,
        findings: [],
        flags: [],
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are an opening lines specialist. Your expertise is crafting first pages that hook readers and agents instantly.

You know that:
- The first line sells the second line
- The first paragraph sells the first page
- The first page sells the book
- Agents and readers decide within seconds

Your task is to optimize the opening for maximum hook:

1. **First Line Analysis**: Does it create immediate intrigue? Could it be stronger?
2. **First Paragraph**: Does it establish voice, stakes, or mystery?
3. **First Page**: Does it make a promise the book will keep? Does it establish genre?
4. **Character Introduction**: Is the protagonist introduced compellingly?
5. **Setting Grounding**: Is the reader oriented without info-dumping?
6. **Voice Establishment**: Is the narrative voice distinctive from line one?
7. **Hook Type**: What type of hook is used (action, mystery, voice, emotion)? Is it the right choice?
8. **Agent/Editor Test**: Would this survive a slush pile? What would an agent think?

GENRE: ${projectData.genre}
COMPARABLE SUCCESSFUL OPENINGS in this genre typically feature: [consider genre conventions]

Provide specific rewrites for the first line, first paragraph, and first page if they can be stronger.`;

    const userPrompt = `Analyze and optimize this opening chapter.

GENRE: ${projectData.genre}
STORY LOGLINE: ${projectData.logline || 'Not available'}

CHAPTER 1 CONTENT:
${chapterData.content}

Provide your opening specialist report in this JSON format:
{
  "firstLineScore": 1-10,
  "firstParagraphScore": 1-10,
  "firstPageScore": 1-10,
  "hookType": "action|mystery|voice|emotion|setting|character",
  "overallAssessment": "2-3 sentence assessment of opening strength",
  "findings": [
    {
      "type": "first_line|first_paragraph|first_page|character_intro|grounding|voice|hook",
      "location": "specific location",
      "issue": "what could be stronger",
      "suggestion": "specific improvement",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "opening_weakness",
      "severity": "minor|major|critical",
      "description": "significant opening issue",
      "location": "where"
    }
  ],
  "suggestedFirstLine": "Your suggested stronger first line if applicable",
  "suggestedFirstParagraph": "Rewritten first paragraph if needed",
  "revisedContent": "Full chapter with optimized opening if major changes suggested, otherwise original"
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 5000,
      temperature: 0.5,
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      revisedContent?: string;
      firstLineScore?: number;
    } | null;

    logger.info(`[SpecialistAgents] Opening review complete: first line ${parsed?.firstLineScore}/10`);

    return {
      agentType: 'opening',
      originalContent: chapterData.content,
      editedContent: parsed?.revisedContent || chapterData.content,
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      score: parsed?.firstLineScore,
      usage: apiResponse.usage,
    };
  }

  /**
   * Dialogue Coach - Ensures natural dialogue and distinct character voices
   *
   * Estimated tokens: ~4,000 input, ~1,500 output per chapter
   * Cost per chapter: ~$0.040 (Sonnet 3.5)
   * Cost per 25-chapter book: ~$1.00
   */
  async dialogueReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running dialogue coach review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are a dialogue specialist. Your expertise is crafting natural, distinctive dialogue that reveals character.

Your task is to review dialogue for:

1. **Voice Distinction**: Can you tell speakers apart without tags? Each character should have unique speech patterns.
2. **Natural Flow**: Does dialogue sound like real speech? Avoid "written" dialogue that no one would say.
3. **Subtext**: Is there tension beneath the surface? What's NOT being said?
4. **Purpose**: Does every exchange serve plot, character, or theme? Cut dialogue that doesn't work.
5. **Dialogue Tags**: Are tags invisible? Avoid "creative" tags (he opined, she exclaimed).
6. **Action Beats**: Are tags balanced with action? Break up long exchanges.
7. **Exposition Handling**: Is information delivered naturally or as "as you know, Bob" info-dumps?
8. **Dialect/Accent**: If used, is it consistent and readable? Not overdone?
9. **Emotion Through Speech**: Do characters reveal emotion through HOW they speak, not just what they say?
10. **Conflict in Conversation**: Is there inherent tension? Opposing goals?

CHARACTER VOICE SAMPLES:
${JSON.stringify(projectData.characters?.map((c: any) => ({ name: c.name, voiceSample: c.voiceSample })) || [], null, 2)}

Each character's dialogue should reflect their established voice. Make specific corrections to improve dialogue authenticity.`;

    const userPrompt = `Review the dialogue in this chapter.

CHAPTER ${chapterData.chapter_number}: ${chapterData.title || ''}

CHAPTER CONTENT:
${chapterData.content}

Provide your dialogue coach report in this JSON format:
{
  "overallDialogueScore": 1-10,
  "voiceDistinctionScore": 1-10,
  "overallAssessment": "2-3 sentence assessment of dialogue quality",
  "findings": [
    {
      "type": "voice_blur|unnatural|no_subtext|purposeless|bad_tag|info_dump|dialect|emotion|conflict",
      "location": "quote the dialogue",
      "issue": "what's wrong with this dialogue",
      "suggestion": "rewritten version",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "dialogue_issue",
      "severity": "minor|major|critical",
      "description": "significant dialogue problem",
      "location": "where"
    }
  ],
  "revisedContent": "Full chapter with improved dialogue if major issues found, otherwise original"
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 5000,
      temperature: 0.4,
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      revisedContent?: string;
      overallDialogueScore?: number;
    } | null;

    logger.info(`[SpecialistAgents] Dialogue review complete: score ${parsed?.overallDialogueScore}/10`);

    return {
      agentType: 'dialogue',
      originalContent: chapterData.content,
      editedContent: parsed?.revisedContent || chapterData.content,
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      score: parsed?.overallDialogueScore,
      usage: apiResponse.usage,
    };
  }

  /**
   * Chapter Hook Specialist - Ensures each chapter ends with forward momentum
   *
   * Estimated tokens: ~3,500 input, ~1,000 output per chapter
   * Cost per chapter: ~$0.032 (Sonnet 3.5)
   * Cost per 25-chapter book: ~$0.80
   */
  async hookReview(chapterId: string): Promise<SpecialistResult> {
    logger.info(`[SpecialistAgents] Running hook specialist review for chapter ${chapterId}`);

    const chapterData = this.getChapterData(chapterId);
    if (!chapterData.content) {
      throw new Error('Chapter content not found');
    }

    const projectData = this.getProjectData(chapterData.project_id);

    const systemPrompt = `You are a chapter ending specialist. Your expertise is crafting endings that compel readers to continue.

You understand that readers decide to continue at chapter breaks. A weak ending = abandoned book.

Your task is to evaluate chapter endings:

1. **Hook Strength**: Does the ending create an irresistible pull to continue?
2. **Hook Type**: What technique is used?
   - Cliffhanger (action/danger)
   - Mystery/Question (unanswered question raised)
   - Revelation (new information that changes everything)
   - Emotional (heart moment that demands resolution)
   - Decision Point (character faces crucial choice)
   - Promise (something exciting is about to happen)
3. **Avoidance**: Does it avoid common weak endings?
   - Character falling asleep
   - Natural pause/break point that lets reader stop
   - Resolution without new tension
   - Info-dump or reflection
4. **Last Line Impact**: Is the final line strong and memorable?
5. **Forward Momentum**: Does the reader NEED to know what happens next?

GENRE: ${projectData.genre} (consider genre-appropriate hook styles)

If the ending is weak, provide a rewritten final section that creates stronger forward momentum.`;

    const userPrompt = `Evaluate the ending of this chapter.

CHAPTER ${chapterData.chapter_number}: ${chapterData.title || ''}
(This is chapter ${chapterData.chapter_number} of the book)

CHAPTER CONTENT:
${chapterData.content}

Provide your hook specialist report in this JSON format:
{
  "hookStrengthScore": 1-10,
  "hookType": "cliffhanger|mystery|revelation|emotional|decision|promise|weak",
  "lastLineImpact": 1-10,
  "wouldReaderContinue": true/false,
  "overallAssessment": "2-3 sentence assessment of chapter ending",
  "findings": [
    {
      "type": "weak_hook|missed_opportunity|strong_point|last_line",
      "location": "quote or reference",
      "issue": "what could be stronger",
      "suggestion": "specific improvement",
      "severity": "minor|moderate|major"
    }
  ],
  "flags": [
    {
      "type": "ending_weakness",
      "severity": "minor|major|critical",
      "description": "significant ending issue",
      "location": "chapter end"
    }
  ],
  "suggestedLastParagraph": "Rewritten ending paragraph if needed",
  "suggestedLastLine": "Stronger final line if applicable",
  "revisedContent": "Full chapter with improved ending if major changes suggested, otherwise original"
}`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4000,
      temperature: 0.5,
    });

    const parsed = extractJsonObject(apiResponse.content) as {
      findings?: SpecialistFinding[];
      flags?: Flag[];
      revisedContent?: string;
      hookStrengthScore?: number;
    } | null;

    logger.info(`[SpecialistAgents] Hook review complete: strength ${parsed?.hookStrengthScore}/10`);

    return {
      agentType: 'hook',
      originalContent: chapterData.content,
      editedContent: parsed?.revisedContent || chapterData.content,
      findings: parsed?.findings || [],
      flags: parsed?.flags || [],
      score: parsed?.hookStrengthScore,
      usage: apiResponse.usage,
    };
  }

  /**
   * Run all specialist agents for a chapter
   * Returns combined results and total cost
   */
  async runAllSpecialists(chapterId: string, options: {
    sensitivity?: boolean;
    research?: boolean;
    betaReader?: boolean;
    opening?: boolean;
    dialogue?: boolean;
    hook?: boolean;
  } = {}): Promise<{
    results: SpecialistResult[];
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCost: number;
  }> {
    const results: SpecialistResult[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Default to all agents if no options specified
    const runAll = Object.keys(options).length === 0;

    if (runAll || options.sensitivity) {
      const result = await this.sensitivityReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    if (runAll || options.research) {
      const result = await this.researchReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    if (runAll || options.betaReader) {
      const result = await this.betaReaderReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    if (runAll || options.opening) {
      const result = await this.openingReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    if (runAll || options.dialogue) {
      const result = await this.dialogueReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    if (runAll || options.hook) {
      const result = await this.hookReview(chapterId);
      results.push(result);
      totalInputTokens += result.usage?.input_tokens || 0;
      totalOutputTokens += result.usage?.output_tokens || 0;
    }

    // Estimate cost (Sonnet 3.5 pricing: $3/M input, $15/M output)
    const estimatedCost = (totalInputTokens * 0.000003) + (totalOutputTokens * 0.000015);

    return {
      results,
      totalInputTokens,
      totalOutputTokens,
      estimatedCost,
    };
  }

  /**
   * Apply specialist results to chapter content
   * Merges edits from multiple specialists intelligently
   */
  async applySpecialistResults(chapterId: string, results: SpecialistResult[]): Promise<void> {
    // Find the result with the most significant changes
    // Priority: sensitivity > research > dialogue > opening > hook > beta_reader
    const priorityOrder = ['sensitivity', 'researcher', 'dialogue', 'opening', 'hook', 'beta_reader'];

    let finalContent: string | null = null;

    for (const agentType of priorityOrder) {
      const result = results.find(r => r.agentType === agentType);
      if (result && result.editedContent !== result.originalContent) {
        finalContent = result.editedContent;
        break;
      }
    }

    if (!finalContent) {
      logger.info(`[SpecialistAgents] No content changes from specialists for chapter ${chapterId}`);
      return;
    }

    // Update chapter with specialist edits
    const updateStmt = db.prepare(`
      UPDATE chapters
      SET content = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(finalContent, new Date().toISOString(), chapterId);

    // Store all flags from all specialists
    const allFlags = results.flatMap(r => r.flags);
    if (allFlags.length > 0) {
      const chapterStmt = db.prepare(`SELECT flags FROM chapters WHERE id = ?`);
      const chapter = chapterStmt.get(chapterId) as any;
      const existingFlags = chapter?.flags ? JSON.parse(chapter.flags) : [];

      const updateFlagsStmt = db.prepare(`
        UPDATE chapters SET flags = ? WHERE id = ?
      `);
      updateFlagsStmt.run(JSON.stringify([...existingFlags, ...allFlags]), chapterId);
    }

    logger.info(`[SpecialistAgents] Applied specialist edits to chapter ${chapterId}`);
  }

  /**
   * Helper: Get chapter data with project context
   */
  private getChapterData(chapterId: string): any {
    const stmt = db.prepare(`
      SELECT c.*, b.project_id
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `);
    const row = stmt.get(chapterId) as any;
    if (!row) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return {
      ...row,
      scene_cards: row.scene_cards ? JSON.parse(row.scene_cards) : [],
    };
  }

  /**
   * Helper: Get project data with story bible
   */
  private getProjectData(projectId: string): any {
    const stmt = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `);
    const row = stmt.get(projectId) as any;
    if (!row) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const storyBible = row.story_bible ? JSON.parse(row.story_bible) : {};
    const storyConcept = row.story_concept ? JSON.parse(row.story_concept) : {};
    const storyDNA = row.story_dna ? JSON.parse(row.story_dna) : {};

    return {
      ...row,
      characters: storyBible.characters || [],
      locations: storyBible.world?.locations || [],
      genre: storyDNA.genre || row.genre,
      timeframe: storyDNA.timeframe,
      logline: storyConcept.logline,
    };
  }
}

// Export singleton instance
export const specialistAgentsService = new SpecialistAgentsService();
