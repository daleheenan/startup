import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');
jest.mock('../logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { PlagiarismCheckerService } from '../plagiarism-checker.service.js';
import type {
  PlagiarismCheckResult,
  PlagiarismCheckStatus,
  OriginalityScore,
  SimilarWork,
  PlagiarismFlag,
  BatchPlagiarismResult,
} from '../../shared/types/index.js';

describe('PlagiarismCheckerService', () => {
  let service: PlagiarismCheckerService;
  let mockClaudeService: any;
  let mockDb: any;

  const mockOriginalityScore: OriginalityScore = {
    overall: 85,
    plotOriginality: 82,
    characterOriginality: 88,
    settingOriginality: 85,
    themeOriginality: 90,
    premiseOriginality: 80,
  };

  const mockSimilarWork: SimilarWork = {
    title: 'The Fantasy Quest',
    author: 'Jane Author',
    similarity: 45,
    matchedElements: ['plot', 'setting'],
    description: 'A hero embarks on a journey to save the kingdom',
    publicationYear: 2015,
  };

  const mockAnalysisResponse = {
    originalityScore: mockOriginalityScore,
    similarWorks: [mockSimilarWork],
    flags: [],
    recommendations: ['Consider adding unique elements to differentiate', 'Develop character motivations further'],
    analysisDetails: {
      tropesIdentified: ['chosen one', 'mentor figure'],
      archetypesUsed: ['hero', 'mentor'],
      uniqueElements: ['innovative magic system', 'unique political intrigue'],
      concerningPatterns: [],
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;

    service = new PlagiarismCheckerService();
  });

  describe('checkConcept', () => {
    it('should check a saved concept for originality', async () => {
      const mockConcept = {
        id: 'concept-1',
        title: 'The Shadow Kingdom',
        logline: 'A prince must reclaim his throne',
        synopsis: 'Full synopsis here',
        hook: 'Redemption through darkness',
        protagonist_hint: 'Exiled prince',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockConcept) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await service.checkConcept('concept-1');

      expect(result).toMatchObject({
        contentType: 'concept',
        contentId: 'concept-1',
        status: 'passed',
        originalityScore: mockOriginalityScore,
        similarWorks: [mockSimilarWork],
        flags: [],
      });
      expect(result.id).toMatch(/^check_/);
      expect(result.checkedAt).toBeTruthy();
      expect(result.recommendations).toHaveLength(2);
    });

    it('should throw error if concept not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockPrepare.mockReturnValueOnce(getStmt);

      await expect(service.checkConcept('nonexistent-concept')).rejects.toThrow(
        'Concept not found: nonexistent-concept'
      );
    });

    it('should handle concepts with minimal fields', async () => {
      const mockConcept = {
        id: 'concept-2',
        title: 'Minimal Concept',
        logline: 'A brief story',
        synopsis: null,
        hook: null,
        protagonist_hint: null,
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockConcept) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 200, output_tokens: 150 },
      });

      const result = await service.checkConcept('concept-2');

      expect(result.status).toBe('passed');
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          maxTokens: 3000,
        })
      );
    });
  });

  describe('checkConceptSummary', () => {
    it('should check a concept summary for originality', async () => {
      const mockSummary = {
        id: 'summary-1',
        title: 'Brief Concept',
        logline: 'A short logline',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockSummary) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 300, output_tokens: 200 },
      });

      const result = await service.checkConceptSummary('summary-1');

      expect(result.contentType).toBe('summary');
      expect(result.contentId).toBe('summary-1');
      expect(result.status).toBe('passed');
    });

    it('should throw error if summary not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockPrepare.mockReturnValueOnce(getStmt);

      await expect(service.checkConceptSummary('nonexistent-summary')).rejects.toThrow(
        'Concept summary not found: nonexistent-summary'
      );
    });
  });

  describe('checkStoryIdea', () => {
    it('should check a story idea for originality', async () => {
      const mockIdea = {
        id: 'idea-1',
        story_idea: 'A unique story about time travel',
        character_concepts: JSON.stringify(['Time traveller scientist', 'Victorian detective']),
        plot_elements: JSON.stringify(['Paradox creation', 'Historical mystery']),
        unique_twists: JSON.stringify(['Time loops create alternate realities']),
        genre: 'Science Fiction',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockIdea) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 600, output_tokens: 400 },
      });

      const result = await service.checkStoryIdea('idea-1');

      expect(result.contentType).toBe('story_idea');
      expect(result.contentId).toBe('idea-1');
      expect(result.status).toBe('passed');
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Time traveller scientist'),
            }),
          ]),
        })
      );
    });

    it('should throw error if idea not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockPrepare.mockReturnValueOnce(getStmt);

      await expect(service.checkStoryIdea('nonexistent-idea')).rejects.toThrow(
        'Story idea not found: nonexistent-idea'
      );
    });

    it('should handle null array fields gracefully', async () => {
      const mockIdea = {
        id: 'idea-2',
        story_idea: 'Simple idea',
        character_concepts: null,
        plot_elements: null,
        unique_twists: null,
        genre: 'Fantasy',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockIdea) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 250, output_tokens: 150 },
      });

      const result = await service.checkStoryIdea('idea-2');

      expect(result.status).toBe('passed');
    });
  });

  describe('checkChapter', () => {
    it('should check a chapter for originality', async () => {
      const mockChapter = {
        id: 'chapter-1',
        content: 'This is the chapter content with at least 100 words of actual prose and storytelling.',
        summary: 'Chapter summary',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 800, output_tokens: 500 },
      });

      const result = await service.checkChapter('chapter-1');

      expect(result.contentType).toBe('chapter');
      expect(result.contentId).toBe('chapter-1');
      expect(result.status).toBe('passed');
    });

    it('should throw error if chapter not found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockPrepare.mockReturnValueOnce(getStmt);

      await expect(service.checkChapter('nonexistent-chapter')).rejects.toThrow(
        'Chapter not found: nonexistent-chapter'
      );
    });

    it('should throw error if chapter has no content', async () => {
      const mockChapter = {
        id: 'chapter-2',
        content: null,
        summary: 'Summary only',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      mockPrepare.mockReturnValueOnce(getStmt);

      await expect(service.checkChapter('chapter-2')).rejects.toThrow(
        'Chapter chapter-2 has no content to check'
      );
    });

    it('should truncate long chapter content for analysis', async () => {
      const longContent = 'A'.repeat(5000);
      const mockChapter = {
        id: 'chapter-3',
        content: longContent,
        summary: 'Long chapter summary',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockChapter) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 900, output_tokens: 600 },
      });

      await service.checkChapter('chapter-3');

      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('excerpt'),
            }),
          ]),
        })
      );
    });
  });

  describe('checkRawContent', () => {
    it('should check raw content without saving to database', async () => {
      const rawContent = {
        title: 'Test Title',
        logline: 'Test logline',
        synopsis: 'Test synopsis',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 400, output_tokens: 250 },
      });

      const result = await service.checkRawContent(rawContent);

      expect(result.contentType).toBe('concept');
      expect(result.contentId).toMatch(/^raw_\d+$/);
      expect(result.status).toBe('passed');
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent = {};

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 100, output_tokens: 75 },
      });

      const result = await service.checkRawContent(emptyContent);

      expect(result.status).toBe('passed');
    });
  });

  describe('checkAllConcepts', () => {
    it('should batch check all saved concepts', async () => {
      const mockConcepts = [
        { id: 'concept-1' },
        { id: 'concept-2' },
        { id: 'concept-3' },
      ];

      const mockConceptData = {
        id: 'concept-1',
        title: 'Test',
        logline: 'Test',
        synopsis: 'Test',
        hook: 'Test',
        protagonist_hint: 'Test',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const allStmt = { all: jest.fn().mockReturnValue(mockConcepts) };
      const getStmt = { get: jest.fn().mockReturnValue(mockConceptData) };
      const insertStmt = { run: jest.fn() };

      // First call is to get all concepts, then alternating get/insert for each concept
      mockPrepare
        .mockReturnValueOnce(allStmt)
        .mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt)
        .mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt)
        .mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      // Mock three different analysis responses
      const responses = [
        { ...mockAnalysisResponse, originalityScore: { ...mockOriginalityScore, overall: 85 } },
        { ...mockAnalysisResponse, originalityScore: { ...mockOriginalityScore, overall: 70 }, flags: [{ type: 'plot_similarity', severity: 'medium' }] },
        { ...mockAnalysisResponse, originalityScore: { ...mockOriginalityScore, overall: 45 }, flags: [{ type: 'premise_similarity', severity: 'high' }, { type: 'character_similarity', severity: 'high' }] },
      ];

      let callCount = 0;
      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() => {
        return Promise.resolve({
          content: JSON.stringify(responses[callCount++]),
          usage: { input_tokens: 400, output_tokens: 250 },
        });
      });

      const result = await service.checkAllConcepts();

      expect(result.totalChecked).toBe(3);
      expect(result.passedCount).toBe(1);
      expect(result.flaggedCount).toBe(1);
      expect(result.averageOriginalityScore).toBeCloseTo(66.67, 1);
      expect(result.results).toHaveLength(3);
    });

    it('should handle empty concept list', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const allStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(allStmt);

      const result = await service.checkAllConcepts();

      expect(result.totalChecked).toBe(0);
      expect(result.passedCount).toBe(0);
      expect(result.flaggedCount).toBe(0);
      expect(result.averageOriginalityScore).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should continue checking other concepts if one fails', async () => {
      const mockConcepts = [
        { id: 'concept-1' },
        { id: 'concept-2' },
      ];

      const mockConceptData = {
        id: 'concept-1',
        title: 'Test',
        logline: 'Test',
        synopsis: 'Test',
        hook: 'Test',
        protagonist_hint: 'Test',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const allStmt = { all: jest.fn().mockReturnValue(mockConcepts) };
      const getStmt = { get: jest.fn().mockReturnValue(mockConceptData) };
      const insertStmt = { run: jest.fn() };

      // First call is to get all concepts, then get for first (which will fail), then get/insert for second
      mockPrepare
        .mockReturnValueOnce(allStmt)
        .mockReturnValueOnce(getStmt)
        .mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      let callCount = 0;
      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() => {
        if (callCount++ === 0) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({
          content: JSON.stringify(mockAnalysisResponse),
          usage: { input_tokens: 400, output_tokens: 250 },
        });
      });

      const result = await service.checkAllConcepts();

      expect(result.totalChecked).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  describe('determineStatus', () => {
    it('should return "passed" for high originality with no flags', () => {
      const analysis = {
        originalityScore: { overall: 85 },
        flags: [],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('passed');
    });

    it('should return "passed" for high originality with one medium flag', () => {
      const analysis = {
        originalityScore: { overall: 80 },
        flags: [{ severity: 'medium' }],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('passed');
    });

    it('should return "requires_review" for moderate originality', () => {
      const analysis = {
        originalityScore: { overall: 65 },
        flags: [{ severity: 'medium' }],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('requires_review');
    });

    it('should return "requires_review" for high originality with multiple medium flags', () => {
      const analysis = {
        originalityScore: { overall: 80 },
        flags: [{ severity: 'medium' }, { severity: 'medium' }],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('requires_review');
    });

    it('should return "flagged" for low originality', () => {
      const analysis = {
        originalityScore: { overall: 45 },
        flags: [],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('flagged');
    });

    it('should return "flagged" for multiple high severity flags', () => {
      const analysis = {
        originalityScore: { overall: 70 },
        flags: [{ severity: 'high' }, { severity: 'high' }],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('flagged');
    });

    it('should return "requires_review" for one high severity flag', () => {
      const analysis = {
        originalityScore: { overall: 70 },
        flags: [{ severity: 'high' }],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('requires_review');
    });

    it('should use default score of 75 if overall score is missing', () => {
      const analysis = {
        originalityScore: {},
        flags: [],
      };

      const status = (service as any).determineStatus(analysis);

      expect(status).toBe('passed');
    });
  });

  describe('parseAnalysisResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify(mockAnalysisResponse);

      const result = (service as any).parseAnalysisResponse(response);

      expect(result).toEqual(mockAnalysisResponse);
    });

    it('should parse JSON from markdown code blocks', () => {
      const response = '```json\n' + JSON.stringify(mockAnalysisResponse) + '\n```';

      const result = (service as any).parseAnalysisResponse(response);

      expect(result).toEqual(mockAnalysisResponse);
    });

    it('should parse JSON without language specifier', () => {
      const response = '```\n' + JSON.stringify(mockAnalysisResponse) + '\n```';

      const result = (service as any).parseAnalysisResponse(response);

      expect(result).toEqual(mockAnalysisResponse);
    });

    it('should return default safe values on parse error', () => {
      const invalidResponse = 'This is not valid JSON';

      const result = (service as any).parseAnalysisResponse(invalidResponse);

      expect(result.originalityScore.overall).toBe(75);
      expect(result.similarWorks).toEqual([]);
      expect(result.flags).toEqual([]);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]).toContain('Unable to fully analyze');
    });

    it('should handle empty response', () => {
      const emptyResponse = '';

      const result = (service as any).parseAnalysisResponse(emptyResponse);

      expect(result.originalityScore.overall).toBe(75);
    });

    it('should handle partial JSON', () => {
      const partialResponse = '{"originalityScore": {"overall": 90';

      const result = (service as any).parseAnalysisResponse(partialResponse);

      expect(result.originalityScore.overall).toBe(75);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should generate appropriate system prompt', () => {
      const systemPrompt = (service as any).buildSystemPrompt();

      expect(systemPrompt).toContain('literary analyst');
      expect(systemPrompt).toContain('plagiarism detection');
      expect(systemPrompt).toContain('Similarities to Published Works');
      expect(systemPrompt).toContain('Trope Analysis');
      expect(systemPrompt).toContain('Originality Scoring');
      expect(systemPrompt).toContain('0-100');
    });
  });

  describe('buildUserPrompt', () => {
    it('should include all concept fields in prompt', () => {
      const content = {
        title: 'Test Title',
        logline: 'Test logline',
        synopsis: 'Test synopsis',
        hook: 'Test hook',
        protagonistHint: 'Test protagonist',
      };

      const prompt = (service as any).buildUserPrompt(content, 'concept');

      expect(prompt).toContain('Test Title');
      expect(prompt).toContain('Test logline');
      expect(prompt).toContain('Test synopsis');
      expect(prompt).toContain('Test hook');
      expect(prompt).toContain('Test protagonist');
      expect(prompt).toContain('concept');
    });

    it('should include story idea fields in prompt', () => {
      const content = {
        storyIdea: 'A time travel adventure',
        characterConcepts: ['Scientist', 'Detective'],
        plotElements: ['Time paradox', 'Mystery'],
        uniqueTwists: ['Multiple timelines'],
      };

      const prompt = (service as any).buildUserPrompt(content, 'story_idea');

      expect(prompt).toContain('A time travel adventure');
      expect(prompt).toContain('Scientist; Detective');
      expect(prompt).toContain('Time paradox; Mystery');
      expect(prompt).toContain('Multiple timelines');
    });

    it('should truncate long chapter content', () => {
      const longContent = 'A'.repeat(5000);
      const content = {
        chapterContent: longContent,
        chapterSummary: 'Summary',
      };

      const prompt = (service as any).buildUserPrompt(content, 'chapter');

      expect(prompt).toContain('excerpt');
      expect(prompt.length).toBeLessThan(longContent.length);
    });

    it('should request JSON output', () => {
      const content = { title: 'Test' };

      const prompt = (service as any).buildUserPrompt(content, 'concept');

      expect(prompt).toContain('JSON format');
      expect(prompt).toContain('originalityScore');
      expect(prompt).toContain('similarWorks');
      expect(prompt).toContain('flags');
    });

    it('should handle empty content fields gracefully', () => {
      const content = {};

      const prompt = (service as any).buildUserPrompt(content, 'concept');

      expect(prompt).toContain('concept');
      expect(prompt).toContain('JSON format');
    });
  });

  describe('storeResult', () => {
    it('should store plagiarism check result in database', async () => {
      const mockResult: PlagiarismCheckResult = {
        id: 'check-123',
        contentType: 'concept',
        contentId: 'concept-1',
        checkedAt: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        originalityScore: mockOriginalityScore,
        similarWorks: [mockSimilarWork],
        flags: [],
        recommendations: ['Test recommendation'],
        analysisDetails: {
          tropesIdentified: ['hero'],
          archetypesUsed: ['protagonist'],
          uniqueElements: ['magic'],
          concerningPatterns: [],
        },
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      await (service as any).storeResult(mockResult);

      expect(insertStmt.run).toHaveBeenCalledWith(
        'check-123',
        'concept',
        'concept-1',
        '2024-01-01T00:00:00.000Z',
        'passed',
        expect.stringContaining('85'),
        expect.stringContaining('The Fantasy Quest'),
        '[]',
        expect.stringContaining('Test recommendation'),
        expect.stringContaining('hero')
      );
    });

    it('should not throw if table does not exist', async () => {
      const mockResult: PlagiarismCheckResult = {
        id: 'check-456',
        contentType: 'concept',
        contentId: 'concept-2',
        checkedAt: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        originalityScore: mockOriginalityScore,
        similarWorks: [],
        flags: [],
        recommendations: [],
        analysisDetails: {
          tropesIdentified: [],
          archetypesUsed: [],
          uniqueElements: [],
          concerningPatterns: [],
        },
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Table does not exist');
        }),
      };
      mockPrepare.mockReturnValueOnce(insertStmt);

      await expect((service as any).storeResult(mockResult)).resolves.not.toThrow();
    });
  });

  describe('getCheckResults', () => {
    it('should retrieve all check results for content', async () => {
      const mockRows = [
        {
          id: 'check-1',
          content_type: 'concept',
          content_id: 'concept-1',
          checked_at: '2024-01-01T00:00:00.000Z',
          status: 'passed',
          originality_score: JSON.stringify(mockOriginalityScore),
          similar_works: JSON.stringify([mockSimilarWork]),
          flags: '[]',
          recommendations: JSON.stringify(['Recommendation 1']),
          analysis_details: JSON.stringify({
            tropesIdentified: ['hero'],
            archetypesUsed: ['protagonist'],
            uniqueElements: ['magic'],
            concerningPatterns: [],
          }),
        },
        {
          id: 'check-2',
          content_type: 'concept',
          content_id: 'concept-1',
          checked_at: '2024-01-02T00:00:00.000Z',
          status: 'requires_review',
          originality_score: JSON.stringify({ ...mockOriginalityScore, overall: 65 }),
          similar_works: '[]',
          flags: '[]',
          recommendations: '[]',
          analysis_details: JSON.stringify({
            tropesIdentified: [],
            archetypesUsed: [],
            uniqueElements: [],
            concerningPatterns: [],
          }),
        },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = { all: jest.fn().mockReturnValue(mockRows) };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const results = await service.getCheckResults('concept-1');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('check-1');
      expect(results[0].status).toBe('passed');
      expect(results[1].id).toBe('check-2');
      expect(results[1].status).toBe('requires_review');
    });

    it('should return empty array if table does not exist', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Table does not exist');
        }),
      };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const results = await service.getCheckResults('concept-1');

      expect(results).toEqual([]);
    });

    it('should return empty array if no results found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const results = await service.getCheckResults('nonexistent-concept');

      expect(results).toEqual([]);
    });
  });

  describe('getLatestCheckResult', () => {
    it('should retrieve the latest check result', async () => {
      const mockRows = [
        {
          id: 'check-2',
          content_type: 'concept',
          content_id: 'concept-1',
          checked_at: '2024-01-02T00:00:00.000Z',
          status: 'passed',
          originality_score: JSON.stringify(mockOriginalityScore),
          similar_works: '[]',
          flags: '[]',
          recommendations: '[]',
          analysis_details: JSON.stringify({
            tropesIdentified: [],
            archetypesUsed: [],
            uniqueElements: [],
            concerningPatterns: [],
          }),
        },
        {
          id: 'check-1',
          content_type: 'concept',
          content_id: 'concept-1',
          checked_at: '2024-01-01T00:00:00.000Z',
          status: 'passed',
          originality_score: JSON.stringify(mockOriginalityScore),
          similar_works: '[]',
          flags: '[]',
          recommendations: '[]',
          analysis_details: JSON.stringify({
            tropesIdentified: [],
            archetypesUsed: [],
            uniqueElements: [],
            concerningPatterns: [],
          }),
        },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = { all: jest.fn().mockReturnValue(mockRows) };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const result = await service.getLatestCheckResult('concept-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('check-2');
      expect(result?.checkedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should return null if no results found', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = { all: jest.fn().mockReturnValue([]) };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const result = await service.getLatestCheckResult('nonexistent-concept');

      expect(result).toBeNull();
    });

    it('should return null if table does not exist', async () => {
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const selectStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Table does not exist');
        }),
      };
      mockPrepare.mockReturnValueOnce(selectStmt);

      const result = await service.getLatestCheckResult('concept-1');

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle Claude API errors gracefully', async () => {
      const mockConcept = {
        id: 'concept-1',
        title: 'Test',
        logline: 'Test',
        synopsis: 'Test',
        hook: 'Test',
        protagonist_hint: 'Test',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockConcept) };
      mockPrepare.mockReturnValueOnce(getStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(service.checkConcept('concept-1')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should handle malformed Claude response', async () => {
      const mockConcept = {
        id: 'concept-1',
        title: 'Test',
        logline: 'Test',
        synopsis: 'Test',
        hook: 'Test',
        protagonist_hint: 'Test',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockConcept) };
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: 'This is not JSON at all',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      // Should not throw, should use default values
      const result = await service.checkConcept('concept-1');

      expect(result.originalityScore.overall).toBe(75);
      expect(result.recommendations[0]).toContain('Unable to fully analyze');
    });

    it('should handle network timeout', async () => {
      const mockConcept = {
        id: 'concept-1',
        title: 'Test',
        logline: 'Test',
        synopsis: 'Test',
        hook: 'Test',
        protagonist_hint: 'Test',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const getStmt = { get: jest.fn().mockReturnValue(mockConcept) };
      mockPrepare.mockReturnValueOnce(getStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(service.checkConcept('concept-1')).rejects.toThrow('Network timeout');
    });
  });

  describe('edge cases', () => {
    it('should handle very short text', async () => {
      const shortContent = {
        title: 'A',
        logline: 'B',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 50, output_tokens: 30 },
      });

      const result = await service.checkRawContent(shortContent);

      expect(result.status).toBe('passed');
    });

    it('should handle special characters in content', async () => {
      const specialContent = {
        title: 'Test with "quotes" and \'apostrophes\'',
        logline: 'Content with\nnewlines\tand\ttabs',
        synopsis: 'Unicode characters: 你好 мир 🎉',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 200, output_tokens: 150 },
      });

      const result = await service.checkRawContent(specialContent);

      expect(result.status).toBe('passed');
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceContent = {
        title: '   ',
        logline: '\n\n\n',
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      const insertStmt = { run: jest.fn() };
      mockPrepare.mockReturnValueOnce(insertStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockResolvedValue({
        content: JSON.stringify(mockAnalysisResponse),
        usage: { input_tokens: 80, output_tokens: 50 },
      });

      const result = await service.checkRawContent(whitespaceContent);

      expect(result.status).toBe('passed');
    });
  });
});
