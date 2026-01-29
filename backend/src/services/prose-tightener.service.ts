/**
 * Prose Tightener Service
 *
 * Analyses prose for style issues and suggests rewrites based on the
 * style principles. Works in two modes:
 *
 * 1. Pattern Detection: Fast regex-based scanning for common anti-patterns
 * 2. AI Editorial Review: Deep analysis with suggested rewrites
 *
 * This service implements the editorial thinking from our style principles:
 * - Eliminate redundant enumeration
 * - Trust concrete details
 * - Cut the obvious
 * - Trust subtext
 * - Prefer strength over qualification
 */

import { claudeService } from './claude.service.js';
import { createLogger } from './logger.service.js';
import {
  PROSE_ANTI_PATTERNS,
  PATTERN_CATEGORIES,
  getFullStylePrinciples,
  type StyleIssue,
  type StyleSeverity,
  type StyleCategory,
} from '../shared/style-principles.js';

const logger = createLogger('services:prose-tightener');

/**
 * Result of a prose tightening analysis
 */
export interface TighteningAnalysis {
  /** Original text that was analysed */
  originalText: string;
  /** Pattern-based issues detected */
  patternIssues: StyleIssue[];
  /** AI-suggested rewrites for flagged passages */
  suggestedRewrites: SuggestedRewrite[];
  /** Overall assessment */
  summary: {
    totalIssues: number;
    byCategory: Record<StyleCategory, number>;
    bySeverity: Record<StyleSeverity, number>;
    estimatedWordsSaveable: number;
  };
  /** Token usage from AI analysis */
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * A specific rewrite suggestion from AI analysis
 */
export interface SuggestedRewrite {
  /** The original passage that could be tightened */
  original: string;
  /** The suggested tighter version */
  suggested: string;
  /** Why this change improves the prose */
  rationale: string;
  /** Approximate location in the text */
  paragraphIndex: number;
  /** Which principle this addresses */
  principle: string;
  /** Words saved by this change */
  wordsSaved: number;
  /** Confidence in this suggestion (0-1) */
  confidence: number;
}

/**
 * ProseTightenerService provides pattern detection and AI-powered
 * editorial suggestions for tightening prose.
 */
export class ProseTightenerService {
  /**
   * Run pattern-based detection only (fast, no AI calls)
   */
  detectPatterns(text: string): StyleIssue[] {
    const issues: StyleIssue[] = [];
    const paragraphs = text.split(/\n\n+/);

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex];

      for (const pattern of PROSE_ANTI_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;

        while ((match = regex.exec(paragraph)) !== null) {
          issues.push({
            patternId: pattern.id,
            name: pattern.name,
            text: match[0],
            location: {
              paragraph: pIndex,
              offset: match.index,
              length: match[0].length,
            },
            severity: pattern.severity as StyleSeverity,
            category: PATTERN_CATEGORIES[pattern.id] || 'economy',
          });
        }
      }
    }

    logger.info({ issueCount: issues.length }, 'Pattern detection complete');
    return issues;
  }

  /**
   * Run full AI-powered analysis with rewrite suggestions
   */
  async analyseWithAI(text: string, options?: {
    /** Maximum passages to suggest rewrites for */
    maxRewrites?: number;
    /** Focus on specific categories */
    focusCategories?: StyleCategory[];
  }): Promise<TighteningAnalysis> {
    const maxRewrites = options?.maxRewrites ?? 10;

    // First, run pattern detection
    const patternIssues = this.detectPatterns(text);

    // Build the AI prompt
    const systemPrompt = `You are an expert fiction editor specialising in prose economy. Your task is to identify passages that could be tightened and suggest specific rewrites.

${getFullStylePrinciples()}

ANALYSIS APPROACH:
1. Read the text carefully, looking for opportunities to tighten prose
2. Identify specific passages (not whole paragraphs) that violate style principles
3. Suggest concrete rewrites that preserve meaning while reducing wordiness
4. Explain why each change improves the prose
5. Be conservative - only suggest changes where the improvement is clear

FOCUS AREAS:
- Redundant enumeration (listing examples then restating as category)
- Telling after showing (explaining what action already conveyed)
- Weak qualifiers (very, quite, rather, somewhat)
- Filter words (she noticed, he could hear)
- Passive perception (seemed to, appeared to)
- Overexplanation of subtext
- Unnecessary preambles (began to, started to)

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "rewrites": [
    {
      "original": "the exact passage from the text",
      "suggested": "your tighter version",
      "rationale": "brief explanation of why this is better",
      "paragraphIndex": 0,
      "principle": "which style principle this addresses",
      "wordsSaved": 5,
      "confidence": 0.9
    }
  ],
  "overallNotes": "brief summary of the prose's strengths and main areas for improvement"
}

IMPORTANT:
- Quote the EXACT original text, character for character
- Only suggest changes where you're confident (0.7+ confidence)
- Preserve the author's voice and intent
- Don't rewrite entire paragraphs - focus on specific phrases
- Maximum ${maxRewrites} rewrites`;

    const userPrompt = `Analyse this prose and suggest specific tightening rewrites.

${options?.focusCategories ? `Focus especially on: ${options.focusCategories.join(', ')}` : ''}

TEXT TO ANALYSE:
${text}

Return your analysis as JSON:`;

    const apiResponse = await claudeService.createCompletionWithUsage({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Parse AI response
    let aiAnalysis: { rewrites: SuggestedRewrite[]; overallNotes: string };
    try {
      const jsonMatch = apiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        aiAnalysis = { rewrites: [], overallNotes: 'Failed to parse AI response' };
      }
    } catch (e) {
      logger.error({ error: e }, 'Failed to parse AI analysis response');
      aiAnalysis = { rewrites: [], overallNotes: 'Failed to parse AI response' };
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(patternIssues, aiAnalysis.rewrites);

    logger.info({
      patternIssues: patternIssues.length,
      aiRewrites: aiAnalysis.rewrites.length,
      estimatedWordsSaveable: summary.estimatedWordsSaveable,
    }, 'AI analysis complete');

    return {
      originalText: text,
      patternIssues,
      suggestedRewrites: aiAnalysis.rewrites,
      summary,
      usage: apiResponse.usage,
    };
  }

  /**
   * Apply suggested rewrites to text (with user confirmation)
   */
  applyRewrites(text: string, rewrites: SuggestedRewrite[]): string {
    let result = text;

    // Sort rewrites by position (reverse order to avoid offset issues)
    const sortedRewrites = [...rewrites].sort((a, b) => {
      // Find positions in text
      const posA = text.indexOf(a.original);
      const posB = text.indexOf(b.original);
      return posB - posA; // Reverse order
    });

    for (const rewrite of sortedRewrites) {
      if (result.includes(rewrite.original)) {
        result = result.replace(rewrite.original, rewrite.suggested);
        logger.debug({
          original: rewrite.original.substring(0, 50),
          suggested: rewrite.suggested.substring(0, 50),
        }, 'Applied rewrite');
      } else {
        logger.warn({
          original: rewrite.original.substring(0, 50),
        }, 'Could not find original text to replace');
      }
    }

    return result;
  }

  /**
   * Generate a report of style issues for human review
   */
  generateReport(analysis: TighteningAnalysis): string {
    const lines: string[] = [];

    lines.push('# Prose Tightening Report\n');

    // Summary
    lines.push('## Summary\n');
    lines.push(`- **Total Issues Detected**: ${analysis.summary.totalIssues}`);
    lines.push(`- **Estimated Words Saveable**: ${analysis.summary.estimatedWordsSaveable}`);
    lines.push('');

    // By category
    lines.push('### Issues by Category\n');
    for (const [category, count] of Object.entries(analysis.summary.byCategory)) {
      if (count > 0) {
        lines.push(`- ${category}: ${count}`);
      }
    }
    lines.push('');

    // Suggested rewrites
    if (analysis.suggestedRewrites.length > 0) {
      lines.push('## Suggested Rewrites\n');
      for (let i = 0; i < analysis.suggestedRewrites.length; i++) {
        const rewrite = analysis.suggestedRewrites[i];
        lines.push(`### ${i + 1}. ${rewrite.principle}\n`);
        lines.push(`**Original**: "${rewrite.original}"\n`);
        lines.push(`**Suggested**: "${rewrite.suggested}"\n`);
        lines.push(`**Rationale**: ${rewrite.rationale}\n`);
        lines.push(`*Words saved: ${rewrite.wordsSaved} | Confidence: ${(rewrite.confidence * 100).toFixed(0)}%*\n`);
      }
    }

    // Pattern issues
    if (analysis.patternIssues.length > 0) {
      lines.push('## Pattern-Based Issues\n');
      const grouped = this.groupByPattern(analysis.patternIssues);
      for (const [patternName, issues] of Object.entries(grouped)) {
        lines.push(`### ${patternName} (${issues.length} instances)\n`);
        for (const issue of issues.slice(0, 5)) { // Show first 5
          lines.push(`- "${issue.text}" (paragraph ${issue.location.paragraph + 1})`);
        }
        if (issues.length > 5) {
          lines.push(`- *...and ${issues.length - 5} more*`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    patternIssues: StyleIssue[],
    rewrites: SuggestedRewrite[]
  ): TighteningAnalysis['summary'] {
    const byCategory: Record<StyleCategory, number> = {
      redundancy: 0,
      economy: 0,
      trust_reader: 0,
      precision: 0,
      rhythm: 0,
      voice: 0,
      strength: 0,
    };

    const bySeverity: Record<StyleSeverity, number> = {
      minor: 0,
      moderate: 0,
      major: 0,
    };

    for (const issue of patternIssues) {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    }

    const estimatedWordsSaveable = rewrites.reduce((sum, r) => sum + r.wordsSaved, 0);

    return {
      totalIssues: patternIssues.length + rewrites.length,
      byCategory,
      bySeverity,
      estimatedWordsSaveable,
    };
  }

  /**
   * Group issues by pattern name
   */
  private groupByPattern(issues: StyleIssue[]): Record<string, StyleIssue[]> {
    const grouped: Record<string, StyleIssue[]> = {};
    for (const issue of issues) {
      if (!grouped[issue.name]) {
        grouped[issue.name] = [];
      }
      grouped[issue.name].push(issue);
    }
    return grouped;
  }
}

// Export singleton instance
export const proseTightenerService = new ProseTightenerService();
