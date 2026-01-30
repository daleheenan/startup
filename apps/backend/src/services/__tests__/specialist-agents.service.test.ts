import { jest } from '@jest/globals';

jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');
jest.mock('../../utils/json-extractor.js');

import { SpecialistAgentsService } from '../specialist-agents.service.js';
import type { SpecialistResult } from '../specialist-agents.service.js';

describe('SpecialistAgentsService', () => {
  let service: SpecialistAgentsService;
  let mockClaudeService: any;
  let mockDb: any;
  let mockExtractJsonObject: any;

  beforeEach(async () => {
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');
    const jsonExtractor = await import('../../utils/json-extractor.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;
    mockExtractJsonObject = jsonExtractor.extractJsonObject as any;

    service = new SpecialistAgentsService();
    jest.clearAllMocks();
  });

  // Helper function to create mock chapter data
  const createMockChapterData = (overrides = {}) => ({
    id: 'chapter-1',
    chapter_number: 1,
    title: 'Test Chapter',
    content: 'This is test chapter content with dialogue and scenes.',
    project_id: 'project-1',
    book_id: 'book-1',
    scene_cards: '[]', // Stored as JSON string in database
    ...overrides,
  });

  // Helper function to create mock project data
  const createMockProjectData = (overrides = {}) => ({
    id: 'project-1',
    genre: 'Fantasy',
    timeframe: 'Medieval',
    logline: 'A hero saves the world',
    story_bible: JSON.stringify({
      characters: [
        { name: 'Hero', ethnicity: 'Various', nationality: 'Kingdom', role: 'Protagonist' },
      ],
      world: {
        locations: [{ name: 'Castle' }],
      },
    }),
    story_concept: JSON.stringify({
      logline: 'A hero saves the world',
    }),
    story_dna: JSON.stringify({
      genre: 'Fantasy',
      timeframe: 'Medieval',
    }),
    ...overrides,
  });

  // Helper to mock database queries
  const mockDatabaseQueries = (chapterData: any, projectData: any) => {
    const chapterStmt = {
      get: jest.fn().mockReturnValue(chapterData),
    };
    const projectStmt = {
      get: jest.fn().mockReturnValue(projectData),
    };

    mockDb.prepare = jest
      .fn()
      .mockImplementation((...args: any[]) => {
        const query = args[0] as string;
        if (query.includes('FROM chapters')) {
          return chapterStmt;
        }
        if (query.includes('FROM projects')) {
          return projectStmt;
        }
        return { get: jest.fn(), run: jest.fn(), all: jest.fn() };
      });
  };

  describe('sensitivityReview', () => {
    it('should review chapter for sensitivity concerns', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallAssessment: 'No significant sensitivity concerns found',
        findings: [
          {
            type: 'microaggression',
            location: 'Paragraph 2',
            issue: 'Minor language concern',
            suggestion: 'Consider alternative phrasing',
            severity: 'minor' as const,
          },
        ],
        flags: [],
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4500, output_tokens: 1500 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.sensitivityReview('chapter-1');

      expect(result.agentType).toBe('sensitivity');
      expect(result.originalContent).toBe(mockChapterData.content);
      expect(result.editedContent).toBe(mockChapterData.content);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe('microaggression');
      expect(result.flags).toHaveLength(0);
      expect(result.usage).toEqual({ input_tokens: 4500, output_tokens: 1500 });
    });

    it('should flag major sensitivity issues', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallAssessment: 'Critical sensitivity issues found',
        findings: [
          {
            type: 'stereotype',
            location: 'Scene 1',
            issue: 'Harmful stereotype present',
            suggestion: 'Complete rewrite needed',
            severity: 'critical' as const,
          },
        ],
        flags: [
          {
            type: 'sensitivity_concern',
            severity: 'critical' as const,
            description: 'Harmful content requiring immediate revision',
            location: 'Scene 1',
          },
        ],
        revisedContent: 'Revised chapter content without harmful stereotypes.',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4500, output_tokens: 2000 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.sensitivityReview('chapter-1');

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('critical');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe('sensitivity_concern');
      expect(result.editedContent).not.toBe(result.originalContent);
    });

    it('should throw error if chapter content not found', async () => {
      const mockChapterData = createMockChapterData({ content: null });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      await expect(service.sensitivityReview('chapter-1')).rejects.toThrow(
        'Chapter content not found'
      );
    });

    it('should handle empty AI response gracefully', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: '',
        usage: { input_tokens: 4500, output_tokens: 0 },
      });

      mockExtractJsonObject.mockReturnValue(null);

      const result = await service.sensitivityReview('chapter-1');

      expect(result.findings).toEqual([]);
      expect(result.flags).toEqual([]);
      expect(result.editedContent).toBe(mockChapterData.content);
    });
  });

  describe('researchReview', () => {
    it('should validate factual accuracy', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallAssessment: 'Mostly accurate with minor issues',
        findings: [
          {
            type: 'historical',
            location: 'Page 3',
            issue: 'Anachronistic technology mentioned',
            suggestion: 'Replace with period-appropriate alternative',
            severity: 'moderate' as const,
          },
        ],
        flags: [],
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 5000, output_tokens: 2000 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.researchReview('chapter-1');

      expect(result.agentType).toBe('researcher');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe('historical');
      expect(result.usage).toEqual({ input_tokens: 5000, output_tokens: 2000 });
    });

    it('should flag major factual errors', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallAssessment: 'Significant factual errors',
        findings: [
          {
            type: 'technical',
            location: 'Scene 2',
            issue: 'Scientifically impossible scenario',
            suggestion: 'Revise to align with known physics',
            severity: 'major' as const,
          },
        ],
        flags: [
          {
            type: 'research_needed',
            severity: 'major' as const,
            description: 'Technical accuracy issue',
            location: 'Scene 2',
          },
        ],
        revisedContent: 'Corrected technical content.',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 5000, output_tokens: 2200 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.researchReview('chapter-1');

      expect(result.findings[0].severity).toBe('major');
      expect(result.flags).toHaveLength(1);
      expect(result.editedContent).toBe('Corrected technical content.');
    });

    it('should throw error if chapter content not found', async () => {
      const mockChapterData = createMockChapterData({ content: null });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      await expect(service.researchReview('chapter-1')).rejects.toThrow(
        'Chapter content not found'
      );
    });
  });

  describe('betaReaderReview', () => {
    it('should provide authentic reader reactions', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallEngagement: 8,
        overallAssessment: 'Engaging chapter with strong pacing',
        emotionalJourney: 'Started curious, became invested, ended excited',
        findings: [
          {
            type: 'engagement_drop',
            location: 'Middle section',
            issue: 'Pacing slowed slightly',
            suggestion: 'Tighten exposition',
            severity: 'minor' as const,
          },
        ],
        flags: [],
        wouldContinueReading: true,
        whyOrWhyNot: 'Strong hook and interesting characters',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4000, output_tokens: 1500 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.betaReaderReview('chapter-1');

      expect(result.agentType).toBe('beta_reader');
      expect(result.score).toBe(8);
      expect(result.findings).toHaveLength(1);
      expect(result.editedContent).toBe(result.originalContent); // Beta readers don't edit
    });

    it('should identify DNF risk points', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallEngagement: 3,
        overallAssessment: 'Low engagement, likely DNF',
        emotionalJourney: 'Started confused, remained disconnected',
        findings: [
          {
            type: 'dnf_risk',
            location: 'Opening',
            issue: 'Confusing start with no hook',
            suggestion: 'Establish clear POV and stakes',
            severity: 'major' as const,
          },
        ],
        flags: [
          {
            type: 'reader_concern',
            severity: 'major' as const,
            description: 'High risk of reader abandonment',
            location: 'Overall pacing',
          },
        ],
        wouldContinueReading: false,
        whyOrWhyNot: 'Unable to connect with story or characters',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4000, output_tokens: 1600 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.betaReaderReview('chapter-1');

      expect(result.score).toBe(3);
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('major');
    });
  });

  describe('openingReview', () => {
    it('should optimise first chapter opening', async () => {
      const mockChapterData = createMockChapterData({ chapter_number: 1 });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        firstLineScore: 7,
        firstParagraphScore: 8,
        firstPageScore: 7,
        hookType: 'mystery',
        overallAssessment: 'Solid opening with room for improvement',
        findings: [
          {
            type: 'first_line',
            location: 'Opening line',
            issue: 'Could be more compelling',
            suggestion: 'Start with a question or intrigue',
            severity: 'moderate' as const,
          },
        ],
        flags: [],
        suggestedFirstLine: 'The blood on the throne was still fresh.',
        suggestedFirstParagraph: 'Revised paragraph...',
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 3500, output_tokens: 2000 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.openingReview('chapter-1');

      expect(result.agentType).toBe('opening');
      expect(result.score).toBe(7);
      expect(result.findings).toHaveLength(1);
    });

    it('should skip review for non-chapter-1', async () => {
      const mockChapterData = createMockChapterData({ chapter_number: 5 });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const result = await service.openingReview('chapter-5');

      expect(result.agentType).toBe('opening');
      expect(result.findings).toHaveLength(0);
      expect(result.flags).toHaveLength(0);
      expect(result.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
      expect(mockClaudeService.createCompletionWithUsage).not.toHaveBeenCalled();
    });

    it('should flag weak opening hooks', async () => {
      const mockChapterData = createMockChapterData({ chapter_number: 1 });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        firstLineScore: 3,
        firstParagraphScore: 4,
        firstPageScore: 3,
        hookType: 'weak',
        overallAssessment: 'Opening needs significant work',
        findings: [
          {
            type: 'hook',
            location: 'First page',
            issue: 'No compelling hook',
            suggestion: 'Introduce conflict or mystery immediately',
            severity: 'major' as const,
          },
        ],
        flags: [
          {
            type: 'opening_weakness',
            severity: 'major' as const,
            description: 'Weak opening will not hook agents or readers',
            location: 'First page',
          },
        ],
        suggestedFirstLine: 'Better first line',
        suggestedFirstParagraph: 'Better paragraph',
        revisedContent: 'Complete revised opening...',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 3500, output_tokens: 2200 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.openingReview('chapter-1');

      expect(result.score).toBe(3);
      expect(result.flags).toHaveLength(1);
      expect(result.editedContent).not.toBe(result.originalContent);
    });
  });

  describe('dialogueReview', () => {
    it('should analyse dialogue naturalness and voice distinction', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallDialogueScore: 7,
        voiceDistinctionScore: 6,
        overallAssessment: 'Generally natural with some voice blurring',
        findings: [
          {
            type: 'voice_blur',
            location: 'Dialogue between Hero and Villain',
            issue: 'Characters sound too similar',
            suggestion: 'Give villain more distinctive speech patterns',
            severity: 'moderate' as const,
          },
        ],
        flags: [],
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4000, output_tokens: 1500 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.dialogueReview('chapter-1');

      expect(result.agentType).toBe('dialogue');
      expect(result.score).toBe(7);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe('voice_blur');
    });

    it('should flag unnatural or info-dumping dialogue', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        overallDialogueScore: 4,
        voiceDistinctionScore: 5,
        overallAssessment: 'Dialogue needs significant improvement',
        findings: [
          {
            type: 'info_dump',
            location: 'Scene 2 conversation',
            issue: 'Characters explaining what they already know',
            suggestion: 'Reveal information naturally through action',
            severity: 'major' as const,
          },
          {
            type: 'unnatural',
            location: 'Hero speech',
            issue: 'Too formal, no one talks like this',
            suggestion: 'Use contractions and natural flow',
            severity: 'major' as const,
          },
        ],
        flags: [
          {
            type: 'dialogue_issue',
            severity: 'major' as const,
            description: 'Multiple dialogue problems affecting readability',
            location: 'Throughout',
          },
        ],
        revisedContent: 'Revised chapter with natural dialogue.',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 4000, output_tokens: 1800 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.dialogueReview('chapter-1');

      expect(result.findings).toHaveLength(2);
      expect(result.flags).toHaveLength(1);
      expect(result.editedContent).not.toBe(result.originalContent);
    });
  });

  describe('hookReview', () => {
    it('should evaluate chapter ending hooks', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        hookStrengthScore: 8,
        hookType: 'cliffhanger',
        lastLineImpact: 9,
        wouldReaderContinue: true,
        overallAssessment: 'Strong ending that compels continuation',
        findings: [
          {
            type: 'strong_point',
            location: 'Final paragraph',
            issue: 'Effective cliffhanger',
            suggestion: 'Consider making stakes even clearer',
            severity: 'minor' as const,
          },
        ],
        flags: [],
        suggestedLastParagraph: null,
        suggestedLastLine: null,
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 3500, output_tokens: 1000 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.hookReview('chapter-1');

      expect(result.agentType).toBe('hook');
      expect(result.score).toBe(8);
      expect(result.findings).toHaveLength(1);
    });

    it('should flag weak chapter endings', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockParsedResponse = {
        hookStrengthScore: 3,
        hookType: 'weak',
        lastLineImpact: 2,
        wouldReaderContinue: false,
        overallAssessment: 'Weak ending provides natural stopping point',
        findings: [
          {
            type: 'weak_hook',
            location: 'Chapter ending',
            issue: 'Character falls asleep - classic weak ending',
            suggestion: 'End with unanswered question or revelation',
            severity: 'major' as const,
          },
        ],
        flags: [
          {
            type: 'ending_weakness',
            severity: 'major' as const,
            description: 'Weak ending may cause readers to abandon book',
            location: 'chapter end',
          },
        ],
        suggestedLastParagraph: 'Better ending paragraph...',
        suggestedLastLine: 'Better final line.',
        revisedContent: 'Chapter with improved ending.',
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockParsedResponse),
        usage: { input_tokens: 3500, output_tokens: 1200 },
      });

      mockExtractJsonObject.mockReturnValue(mockParsedResponse);

      const result = await service.hookReview('chapter-1');

      expect(result.score).toBe(3);
      expect(result.flags).toHaveLength(1);
      expect(result.editedContent).not.toBe(result.originalContent);
    });
  });

  describe('runAllSpecialists', () => {
    it('should run all specialist agents when no options specified', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockResponse = {
        findings: [],
        flags: [],
        revisedContent: mockChapterData.content,
        overallEngagement: 7,
        overallDialogueScore: 8,
        hookStrengthScore: 7,
        firstLineScore: 8,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockResponse),
        usage: { input_tokens: 4000, output_tokens: 1500 },
      });

      mockExtractJsonObject.mockReturnValue(mockResponse);

      const result = await service.runAllSpecialists('chapter-1');

      expect(result.results).toHaveLength(6); // All 6 agents
      expect(result.totalInputTokens).toBeGreaterThan(0);
      expect(result.totalOutputTokens).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);

      // Verify cost calculation (Sonnet 3.5: $3/M input, $15/M output)
      const expectedCost = (result.totalInputTokens * 0.000003) + (result.totalOutputTokens * 0.000015);
      expect(result.estimatedCost).toBeCloseTo(expectedCost, 6);
    });

    it('should run only selected specialist agents', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      const mockResponse = {
        findings: [],
        flags: [],
        revisedContent: mockChapterData.content,
      };

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify(mockResponse),
        usage: { input_tokens: 4000, output_tokens: 1500 },
      });

      mockExtractJsonObject.mockReturnValue(mockResponse);

      const result = await service.runAllSpecialists('chapter-1', {
        sensitivity: true,
        dialogue: true,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].agentType).toBe('sensitivity');
      expect(result.results[1].agentType).toBe('dialogue');
    });

    it('should accumulate token usage from all agents', async () => {
      const mockChapterData = createMockChapterData({ chapter_number: 1 });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      let callCount = 0;
      mockClaudeService.createCompletionWithUsage.mockImplementation(async () => {
        callCount++;
        return {
          content: JSON.stringify({ findings: [], flags: [] }),
          usage: {
            input_tokens: 1000 * callCount,
            output_tokens: 500 * callCount,
          },
        };
      });

      mockExtractJsonObject.mockReturnValue({ findings: [], flags: [] });

      const result = await service.runAllSpecialists('chapter-1', {
        sensitivity: true,
        betaReader: true,
      });

      expect(result.totalInputTokens).toBe(3000); // 1000 + 2000
      expect(result.totalOutputTokens).toBe(1500); // 500 + 1000
    });
  });

  describe('applySpecialistResults', () => {
    it('should apply edits based on priority order', async () => {
      const mockChapterData = createMockChapterData();

      const updateStmt = { run: jest.fn() };
      const getStmt = { get: jest.fn().mockReturnValue({ flags: '[]' }) };

      mockDb.prepare = jest
        .fn()
        .mockReturnValueOnce(updateStmt)
        .mockReturnValueOnce(getStmt)
        .mockReturnValueOnce({ run: jest.fn() });

      const results: SpecialistResult[] = [
        {
          agentType: 'dialogue',
          originalContent: 'Original',
          editedContent: 'Dialogue edit',
          findings: [],
          flags: [],
        },
        {
          agentType: 'sensitivity',
          originalContent: 'Original',
          editedContent: 'Sensitivity edit',
          findings: [],
          flags: [],
        },
        {
          agentType: 'beta_reader',
          originalContent: 'Original',
          editedContent: 'Original', // No edit
          findings: [],
          flags: [],
        },
      ];

      await service.applySpecialistResults('chapter-1', results);

      // Should prioritise sensitivity > dialogue
      expect(updateStmt.run).toHaveBeenCalledWith(
        'Sensitivity edit',
        expect.any(String),
        'chapter-1'
      );
    });

    it('should consolidate flags from all specialists', async () => {
      const mockChapterData = createMockChapterData();

      const updateStmt = { run: jest.fn() };
      const getStmt = {
        get: jest.fn().mockReturnValue({
          flags: JSON.stringify([
            { type: 'existing', description: 'Old flag' },
          ]),
        }),
      };
      const updateFlagsStmt = { run: jest.fn() };

      mockDb.prepare = jest
        .fn()
        .mockImplementation((...args: any[]) => {
          const query = args[0] as string;
          if (query.includes('UPDATE chapters') && query.includes('SET content')) {
            return updateStmt;
          }
          if (query.includes('SELECT flags')) {
            return getStmt;
          }
          if (query.includes('UPDATE chapters') && query.includes('SET flags')) {
            return updateFlagsStmt;
          }
          return { run: jest.fn(), get: jest.fn() };
        });

      const results: SpecialistResult[] = [
        {
          agentType: 'sensitivity',
          originalContent: 'Original',
          editedContent: 'Sensitivity edit with changes',
          findings: [],
          flags: [
            {
              id: 'flag-sens-1',
              type: 'sensitivity_concern',
              severity: 'major' as const,
              description: 'Sensitivity flag',
              location: 'Scene 1',
              resolved: false,
            },
          ],
        },
        {
          agentType: 'dialogue',
          originalContent: 'Original',
          editedContent: 'Original',
          findings: [],
          flags: [
            {
              id: 'flag-dial-1',
              type: 'dialogue_issue',
              severity: 'minor' as const,
              description: 'Dialogue flag',
              location: 'Scene 2',
              resolved: false,
            },
          ],
        },
      ];

      await service.applySpecialistResults('chapter-1', results);

      expect(updateFlagsStmt.run).toHaveBeenCalled();
      const flagsArg = updateFlagsStmt.run.mock.calls[0][0] as string;
      const parsedFlags = JSON.parse(flagsArg);
      expect(parsedFlags).toHaveLength(3); // 1 existing + 2 new
    });

    it('should not update if no content changes', async () => {
      const results: SpecialistResult[] = [
        {
          agentType: 'beta_reader',
          originalContent: 'Original',
          editedContent: 'Original', // No change
          findings: [],
          flags: [],
        },
      ];

      await service.applySpecialistResults('chapter-1', results);

      expect(mockDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle AI service failures gracefully in sensitivityReview', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      mockClaudeService.createCompletionWithUsage.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(service.sensitivityReview('chapter-1')).rejects.toThrow(
        'AI service unavailable'
      );
    });

    it('should handle chapter not found', async () => {
      mockDb.prepare = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      await expect(service.sensitivityReview('nonexistent')).rejects.toThrow(
        'Chapter not found'
      );
    });

    it('should handle project not found', async () => {
      const mockChapterData = createMockChapterData();

      const chapterStmt = { get: jest.fn().mockReturnValue(mockChapterData) };
      const projectStmt = { get: jest.fn().mockReturnValue(null) };

      mockDb.prepare = jest
        .fn()
        .mockImplementation((...args: any[]) => {
          const query = args[0] as string;
          if (query.includes('FROM chapters')) {
            return chapterStmt;
          }
          if (query.includes('FROM projects')) {
            return projectStmt;
          }
          return { get: jest.fn() };
        });

      await expect(service.sensitivityReview('chapter-1')).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('configuration and options', () => {
    it('should use correct temperature settings for different agents', async () => {
      const mockChapterData = createMockChapterData({ chapter_number: 1 });
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify({ findings: [], flags: [] }),
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      mockExtractJsonObject.mockReturnValue({ findings: [], flags: [] });

      // Beta reader (high temperature for varied reactions)
      await service.betaReaderReview('chapter-1');
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.7 })
      );

      jest.clearAllMocks();

      // Research review (low temperature for accuracy)
      await service.researchReview('chapter-1');
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 })
      );
    });

    it('should use correct maxTokens settings', async () => {
      const mockChapterData = createMockChapterData();
      const mockProjectData = createMockProjectData();

      mockDatabaseQueries(mockChapterData, mockProjectData);

      mockClaudeService.createCompletionWithUsage.mockResolvedValue({
        content: JSON.stringify({ findings: [], flags: [] }),
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      mockExtractJsonObject.mockReturnValue({ findings: [], flags: [] });

      await service.sensitivityReview('chapter-1');

      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 6000 })
      );
    });
  });
});
