/**
 * Query Letter Generator Service
 * Generates professional query letters for literary agents
 */

import { claudeService } from '../claude.service.js';
import { createLogger } from '../logger.service.js';
import { getQueryLetterTemplate } from './query-letter-templates.js';
import type { TrackingContext } from '../claude.service.js';
import db from '../../db/connection.js';

const logger = createLogger('services:publishing:query-letter-generator');

export interface QueryLetterInput {
  projectId: string;
  genre: string;
  title: string;
  wordCount: number;
  logline: string;
  synopsis: string;
  protagonistName: string;
  protagonistDescription: string;
  centralConflict: string;
  stakes: string;
  themes?: string[];
  setting?: string;
  targetAgent?: {
    name?: string;
    agency?: string;
    recentBooks?: string[];
  };
  compTitles?: Array<{
    title: string;
    author: string;
    why: string;
  }>;
  authorBio?: {
    name?: string;
    credentials?: string[];
    personalConnection?: string;
  };
}

export interface QueryLetterOutput {
  queryLetter: string;
  breakdown: {
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
  };
  wordCount: number;
  metadata: {
    genre: string;
    title: string;
    wordCount: number;
    generatedAt: string;
  };
}

/**
 * Generate a professional query letter for a project
 */
export async function generateQueryLetter(
  input: QueryLetterInput
): Promise<QueryLetterOutput> {
  logger.info({ projectId: input.projectId, genre: input.genre }, 'Generating query letter');

  const template = getQueryLetterTemplate(input.genre);

  // Get author profile for bio information
  const authorProfile = getAuthorProfile();

  // Build the system prompt with template guidance
  const systemPrompt = buildSystemPrompt(template, input);

  // Build the user prompt with all project details
  const userPrompt = buildUserPrompt(input, authorProfile);

  // Track the AI request
  const tracking: TrackingContext = {
    requestType: 'query_letter_generation',
    projectId: input.projectId,
    contextSummary: `Query letter for ${input.title} (${input.genre})`
  };

  // Generate the query letter
  const response = await claudeService.createCompletionWithUsage({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 2000,
    temperature: 0.7,
    tracking
  });

  const queryLetter = response.content.trim();

  // Parse the query letter into paragraphs
  const breakdown = parseQueryLetter(queryLetter);

  logger.info(
    {
      projectId: input.projectId,
      wordCount: countWords(queryLetter),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    },
    'Query letter generated successfully'
  );

  return {
    queryLetter,
    breakdown,
    wordCount: countWords(queryLetter),
    metadata: {
      genre: input.genre,
      title: input.title,
      wordCount: input.wordCount,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Build system prompt with template guidance
 */
function buildSystemPrompt(template: any, input: QueryLetterInput): string {
  return `You are an expert literary agent query letter writer with years of experience helping authors craft compelling query letters.

**Genre**: ${template.genre}

**Query Letter Structure** (3 paragraphs, ~250-300 words total):

**Paragraph 1: ${template.structure.paragraph1.purpose}**
${template.structure.paragraph1.elements.map((e: string) => `- ${e}`).join('\n')}

Tips:
${template.structure.paragraph1.tips.map((t: string) => `- ${t}`).join('\n')}

**Paragraph 2: ${template.structure.paragraph2.purpose}**
${template.structure.paragraph2.elements.map((e: string) => `- ${e}`).join('\n')}

Tips:
${template.structure.paragraph2.tips.map((t: string) => `- ${t}`).join('\n')}

**Paragraph 3: ${template.structure.paragraph3.purpose}**
${template.structure.paragraph3.elements.map((e: string) => `- ${e}`).join('\n')}

Tips:
${template.structure.paragraph3.tips.map((t: string) => `- ${t}`).join('\n')}

**Genre-Specific Guidance for ${template.genre}**:
${template.genreSpecificTips.map((t: string) => `- ${t}`).join('\n')}

**Example Hook for ${template.genre}**:
${template.exampleHook}

**Critical Requirements**:
- Use UK British spelling conventions throughout
- Keep total length to 250-350 words
- Professional, confident tone (not arrogant)
- No clichés or generic phrases
- Make every sentence earn its place
- End with a clear call to action

Generate a compelling, professional query letter that would make any agent want to request the full manuscript.`;
}

/**
 * Build user prompt with project details
 */
function buildUserPrompt(input: QueryLetterInput, authorProfile: any): string {
  let prompt = `Generate a professional query letter for the following novel:

**Title**: ${input.title}
**Genre**: ${input.genre}
**Word Count**: ${input.wordCount.toLocaleString()} words

**Logline**: ${input.logline}

**Synopsis**: ${input.synopsis}

**Protagonist**: ${input.protagonistName}
${input.protagonistDescription}

**Central Conflict**: ${input.centralConflict}

**Stakes**: ${input.stakes}
`;

  if (input.themes && input.themes.length > 0) {
    prompt += `\n**Themes**: ${input.themes.join(', ')}`;
  }

  if (input.setting) {
    prompt += `\n**Setting**: ${input.setting}`;
  }

  // Add comp titles if provided
  if (input.compTitles && input.compTitles.length > 0) {
    prompt += `\n\n**Comparable Titles**:\n`;
    input.compTitles.forEach(comp => {
      prompt += `- ${comp.title} by ${comp.author}: ${comp.why}\n`;
    });
  }

  // Add author bio information
  if (input.authorBio || authorProfile) {
    prompt += `\n\n**Author Information**:\n`;

    const authorName = input.authorBio?.name || authorProfile?.author_name || authorProfile?.pen_name || '[Author Name]';
    prompt += `Name: ${authorName}\n`;

    if (input.authorBio?.credentials && input.authorBio.credentials.length > 0) {
      prompt += `Credentials:\n`;
      input.authorBio.credentials.forEach(cred => {
        prompt += `- ${cred}\n`;
      });
    } else if (authorProfile?.writing_credentials) {
      try {
        const credentials = JSON.parse(authorProfile.writing_credentials);
        if (Array.isArray(credentials) && credentials.length > 0) {
          prompt += `Credentials:\n`;
          credentials.forEach((cred: any) => {
            prompt += `- ${typeof cred === 'string' ? cred : cred.description}\n`;
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (input.authorBio?.personalConnection) {
      prompt += `Personal Connection to Story: ${input.authorBio.personalConnection}\n`;
    }

    // Add short bio if available
    if (authorProfile?.author_bio_short) {
      prompt += `\nShort Bio: ${authorProfile.author_bio_short}\n`;
    }
  }

  // Add agent-specific personalisation if provided
  if (input.targetAgent) {
    prompt += `\n\n**Target Agent** (personalise the query):\n`;
    if (input.targetAgent.name) {
      prompt += `Agent Name: ${input.targetAgent.name}\n`;
    }
    if (input.targetAgent.agency) {
      prompt += `Agency: ${input.targetAgent.agency}\n`;
    }
    if (input.targetAgent.recentBooks && input.targetAgent.recentBooks.length > 0) {
      prompt += `Recent Books They've Represented: ${input.targetAgent.recentBooks.join(', ')}\n`;
      prompt += `\nIMPORTANT: Mention one of these books in paragraph 3 to show you've researched this agent.\n`;
    }
  }

  prompt += `\n\nGenerate the complete query letter following the 3-paragraph structure. Make it compelling, professional, and tailored to the ${input.genre} genre.`;

  return prompt;
}

/**
 * Parse query letter into paragraphs
 */
function parseQueryLetter(queryLetter: string): {
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
} {
  // Remove any introductory text like "Dear [Agent Name]," if present
  let text = queryLetter.trim();

  // Remove common greeting patterns
  text = text.replace(/^Dear\s+.+?,?\s*/i, '');
  text = text.replace(/^To\s+whom\s+it\s+may\s+concern,?\s*/i, '');

  // Split by double newlines or multiple newlines
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Take the first three substantial paragraphs
  return {
    paragraph1: paragraphs[0] || '',
    paragraph2: paragraphs[1] || '',
    paragraph3: paragraphs[2] || ''
  };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Get author profile from database
 */
function getAuthorProfile(): any {
  try {
    const row = db
      .prepare('SELECT * FROM author_profile WHERE id = ?')
      .get('owner');
    return row;
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch author profile');
    return null;
  }
}

/**
 * Generate personalised query letter for a specific agent
 */
export async function generatePersonalisedQueryLetter(
  baseInput: QueryLetterInput,
  agent: {
    name: string;
    agency?: string;
    recentBooks?: string[];
    notes?: string;
  }
): Promise<QueryLetterOutput> {
  logger.info(
    {
      projectId: baseInput.projectId,
      agentName: agent.name,
      agency: agent.agency
    },
    'Generating personalised query letter for agent'
  );

  const input: QueryLetterInput = {
    ...baseInput,
    targetAgent: {
      name: agent.name,
      agency: agent.agency,
      recentBooks: agent.recentBooks
    }
  };

  return generateQueryLetter(input);
}

/**
 * Save generated query letter to database (for submission tracking)
 */
export async function saveQueryLetterToSubmission(
  submissionId: string,
  queryLetter: string
): Promise<void> {
  logger.info({ submissionId }, 'Saving query letter to submission');

  db.prepare(
    `UPDATE agent_submissions
     SET query_letter = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(queryLetter, submissionId);

  logger.info({ submissionId }, 'Query letter saved to submission');
}
