import { jest } from '@jest/globals';

// Mock logger first to prevent initialization errors
jest.mock('../logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');
jest.mock('../../utils/json-extractor.js');

import { VEBService } from '../editing/veb.js';
import type {
  BetaSwarmResult,
  RuthlessEditorResult,
  MarketAnalystResult,
  EditorialReport,
} from '../editing/veb.js';

describe('VEBService', () => {
  let service: VEBService;
  let mockClaudeService: any;
  let mockDb: any;
  let mockExtractJsonObject: any;

  beforeEach(async () => {
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');
    const jsonExtractorModule = await import('../../utils/json-extractor.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;
    mockExtractJsonObject = jsonExtractorModule.extractJsonObject as any;

    service = new VEBService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // submitToVEB
  // ============================================================================

  describe('submitToVEB', () => {
    it('should create a new editorial report successfully', async () => {
      const projectId = 'project-123';
      const reportId = 'report-456';

      // Mock project exists with chapters
      const mockProjectStmt = {
        get: jest.fn().mockReturnValue({
          id: projectId,
          title: 'Test Novel',
          genre: 'Fantasy',
          chapter_count: 5,
        }),
      };

      // Mock no existing reports
      const mockExistingStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      // Mock insert
      const mockInsertStmt = {
        run: jest.fn(),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockProjectStmt)
        .mockReturnValueOnce(mockExistingStmt)
        .mockReturnValueOnce(mockInsertStmt);

      // Mock UUID generation
      jest.spyOn(require('crypto'), 'randomUUID').mockReturnValue(reportId);

      const result = await service.submitToVEB(projectId);

      expect(result.reportId).toBe(reportId);
      expect(result.status).toBe('pending');
      expect(mockInsertStmt.run).toHaveBeenCalledWith(reportId, projectId);
    });

    it('should throw error if project not found', async () => {
      const mockProjectStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockProjectStmt);

      await expect(service.submitToVEB('non-existent')).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw error if project has no chapters', async () => {
      const mockProjectStmt = {
        get: jest.fn().mockReturnValue({
          id: 'project-123',
          title: 'Empty Project',
          chapter_count: 0,
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockProjectStmt);

      await expect(service.submitToVEB('project-123')).rejects.toThrow(
        'Project has no completed chapters'
      );
    });

    it('should return existing report if one is pending', async () => {
      const existingReport = {
        id: 'report-existing',
        status: 'processing',
      };

      const mockProjectStmt = {
        get: jest.fn().mockReturnValue({
          id: 'project-123',
          chapter_count: 3,
        }),
      };

      const mockExistingStmt = {
        get: jest.fn().mockReturnValue(existingReport),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockProjectStmt)
        .mockReturnValueOnce(mockExistingStmt);

      const result = await service.submitToVEB('project-123');

      expect(result.reportId).toBe('report-existing');
      expect(result.status).toBe('processing');
    });
  });

  // ============================================================================
  // runBetaSwarm (Module A)
  // ============================================================================

  describe('runBetaSwarm', () => {
    it('should analyze chapters for reader engagement successfully', async () => {
      const reportId = 'report-123';
      const projectId = 'project-456';

      // Mock report data
      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: projectId,
          genre: 'Fantasy',
          story_dna: JSON.stringify({ genre: 'Epic Fantasy', themes: ['heroism'] }),
        }),
      };

      // Mock chapters
      const mockChapters = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: 'The Beginning',
          content: 'Once upon a time, in a land far away...',
        },
        {
          id: 'chapter-2',
          chapter_number: 2,
          title: 'The Journey',
          content: 'The hero set forth on a journey...',
        },
      ];

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue(mockChapters),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      // Mock AI responses
      const mockChapterResponse = {
        retentionScore: 8,
        reactions: [
          {
            paragraphIndex: 0,
            tag: 'HOOKED',
            explanation: 'Great opening line draws reader in',
          },
        ],
        dnfRiskPoints: [],
        highlights: ['Strong character introduction'],
      };

      mockExtractJsonObject.mockReturnValue(mockChapterResponse);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: JSON.stringify(mockChapterResponse),
          usage: { input_tokens: 500, output_tokens: 200 },
        })
      );

      const result = await service.runBetaSwarm(reportId);

      expect(result.chapterResults).toHaveLength(2);
      expect(result.overallEngagement).toBe(8);
      expect(result.wouldRecommend).toBe(true);
      expect(result.summaryReaction).toContain('Couldn\'t put it down');
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledTimes(2);
    });

    it('should handle chapter analysis errors gracefully', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          genre: 'Fantasy',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'chapter-1',
            chapter_number: 1,
            content: 'Chapter content...',
          },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      // Simulate AI error
      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.reject(new Error('AI service unavailable'))
      );

      const result = await service.runBetaSwarm(reportId);

      // Should return fallback values for failed chapter
      expect(result.chapterResults).toHaveLength(1);
      expect(result.chapterResults[0].retentionScore).toBe(0);
      expect(result.chapterResults[0].reactions).toEqual([]);
    });

    it('should calculate engagement score correctly for low retention', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          genre: 'Fantasy',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          { id: 'chapter-1', chapter_number: 1, content: 'Content...' },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      mockExtractJsonObject.mockReturnValue({
        retentionScore: 3,
        reactions: [{ paragraphIndex: 0, tag: 'BORED', explanation: 'Slow start' }],
        dnfRiskPoints: [
          { location: 'para 5', reason: 'Info dump', severity: 'high' },
        ],
        highlights: [],
      });

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: '{}',
          usage: { input_tokens: 100, output_tokens: 50 },
        })
      );

      const result = await service.runBetaSwarm(reportId);

      expect(result.overallEngagement).toBe(3);
      expect(result.wouldRecommend).toBe(false);
      expect(result.summaryReaction).toContain('Struggled to finish');
    });

    it('should throw error if report not found', async () => {
      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt);

      await expect(service.runBetaSwarm('invalid-report')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  // ============================================================================
  // runRuthlessEditor (Module B)
  // ============================================================================

  describe('runRuthlessEditor', () => {
    it('should analyze chapter structure successfully', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          genre: 'Thriller',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'chapter-1',
            chapter_number: 1,
            title: 'Opening Scene',
            content: 'The detective arrived at the crime scene...',
            summary: 'Detective investigates a murder',
          },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      const mockEditorResponse = {
        valueShift: {
          openingCharge: 'calm',
          closingCharge: 'tense',
          shiftMagnitude: 8,
          assessment: 'Strong dramatic shift',
        },
        expositionIssues: [
          {
            location: 'para 3',
            issue: 'telling_not_showing',
            quote: 'He felt angry',
            suggestion: 'Show anger through action',
            severity: 'minor',
          },
        ],
        pacingIssues: [],
        scenePurpose: {
          earned: true,
          reasoning: 'Establishes main conflict effectively',
        },
      };

      mockExtractJsonObject.mockReturnValue(mockEditorResponse);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 600, output_tokens: 300 },
        })
      );

      const result = await service.runRuthlessEditor(reportId);

      expect(result.chapterResults).toHaveLength(1);
      expect(result.chapterResults[0].valueShift.shiftMagnitude).toBe(8);
      expect(result.chapterResults[0].expositionIssues).toHaveLength(1);
      expect(result.majorIssuesCount).toBe(0);
      expect(result.overallStructureScore).toBeGreaterThan(0);
    });

    it('should count major issues correctly', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          genre: 'Fantasy',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'chapter-1',
            chapter_number: 1,
            content: 'Content...',
          },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      const mockEditorResponse = {
        valueShift: {
          openingCharge: 'neutral',
          closingCharge: 'neutral',
          shiftMagnitude: 2,
          assessment: 'Flat, no significant change',
        },
        expositionIssues: [
          {
            location: 'para 1',
            issue: 'info_dump',
            quote: 'Long backstory...',
            suggestion: 'Integrate backstory naturally',
            severity: 'major',
          },
        ],
        pacingIssues: [
          {
            location: 'paras 5-10',
            issue: 'too_slow',
            suggestion: 'Trim unnecessary details',
            severity: 'major',
          },
        ],
        scenePurpose: {
          earned: false,
          reasoning: 'Scene does not advance plot',
          recommendation: 'Cut or revise',
        },
      };

      mockExtractJsonObject.mockReturnValue(mockEditorResponse);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 400, output_tokens: 250 },
        })
      );

      const result = await service.runRuthlessEditor(reportId);

      // 2 major issues + 1 unearned scene = 3 total
      expect(result.majorIssuesCount).toBe(3);
      expect(result.summaryVerdict).toContain('structural issues');
    });

    it('should handle editor analysis errors', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          { id: 'chapter-1', chapter_number: 1, content: 'Content...' },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.reject(new Error('AI timeout'))
      );

      const result = await service.runRuthlessEditor(reportId);

      // Should return error fallback values
      expect(result.chapterResults[0].valueShift.assessment).toBe('Error');
      expect(result.chapterResults[0].scenePurpose.reasoning).toBe(
        'Error during analysis'
      );
    });

    it('should throw error if report not found', async () => {
      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt);

      await expect(service.runRuthlessEditor('invalid-report')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  // ============================================================================
  // runMarketAnalyst (Module C)
  // ============================================================================

  describe('runMarketAnalyst', () => {
    it('should analyze commercial viability successfully', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          title: 'The Shadow War',
          genre: 'Fantasy',
          story_dna: JSON.stringify({
            genre: 'Epic Fantasy',
            subgenre: 'Military Fantasy',
            themes: ['war', 'betrayal', 'redemption'],
          }),
          story_concept: JSON.stringify({
            logline: 'A disgraced general must unite rival kingdoms',
            synopsis: 'Epic tale of war and redemption...',
          }),
          story_bible: JSON.stringify({
            characters: [
              {
                name: 'General Marcus',
                role: 'Protagonist',
                physicalDescription: 'Battle-scarred veteran',
              },
            ],
          }),
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          {
            chapter_number: 1,
            title: 'The Fall',
            content: 'The arrow struck without warning...',
            summary: 'General Marcus is ambushed',
          },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      const mockAnalystResponse = {
        compTitles: [
          {
            title: 'The Rage of Dragons',
            author: 'Evan Winter',
            year: 2023,
            similarity: 'Military fantasy with redemption arc',
            whatWorks: 'Fast-paced action and deep worldbuilding',
          },
        ],
        hookAnalysis: {
          openingLineScore: 8,
          openingParagraphScore: 7,
          openingChapterScore: 8,
          openingLine: 'The arrow struck without warning...',
          strengths: ['Immediate action', 'Strong tension'],
          weaknesses: ['Could establish stakes faster'],
        },
        tropeAnalysis: [
          {
            trope: 'Redemption arc',
            freshness: 'familiar',
            execution: 'excellent',
            notes: 'Well-executed classic trope',
          },
        ],
        marketPositioning: {
          primaryAudience: 'Adult fantasy readers who love grimdark',
          secondaryAudience: 'Military fiction crossover',
          marketingAngle: 'Game of Thrones meets Black Hawk Down',
          uniqueSellingPoint: 'Tactical military detail in fantasy setting',
          potentialChallenges: ['Crowded epic fantasy market'],
        },
        commercialViabilityScore: 8,
        agentRecommendation: 'yes_with_revisions',
        summaryPitch:
          'A fresh take on military fantasy with commercial appeal',
      };

      mockExtractJsonObject.mockReturnValue(mockAnalystResponse);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: JSON.stringify(mockAnalystResponse),
          usage: { input_tokens: 1000, output_tokens: 500 },
        })
      );

      const result = await service.runMarketAnalyst(reportId);

      expect(result.compTitles).toHaveLength(1);
      expect(result.hookAnalysis.openingLineScore).toBe(8);
      expect(result.tropeAnalysis).toHaveLength(1);
      expect(result.commercialViabilityScore).toBe(8);
      expect(result.agentRecommendation).toBe('yes_with_revisions');
      expect(mockSaveStmt.run).toHaveBeenCalled();
    });

    it('should use fallback values for missing story data', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          title: 'Untitled Project',
          genre: null,
          story_dna: null,
          story_concept: null,
          story_bible: null,
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          {
            chapter_number: 1,
            content: 'Some content...',
          },
        ]),
      };

      const mockSaveStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockSaveStmt);

      mockExtractJsonObject.mockReturnValue({
        compTitles: [],
        hookAnalysis: {
          openingLineScore: 5,
          openingParagraphScore: 5,
          openingChapterScore: 5,
          openingLine: 'Some content...',
          strengths: [],
          weaknesses: [],
        },
        tropeAnalysis: [],
        marketPositioning: {
          primaryAudience: 'Unknown',
          secondaryAudience: 'Unknown',
          marketingAngle: 'Needs development',
          uniqueSellingPoint: 'Needs identification',
          potentialChallenges: [],
        },
        commercialViabilityScore: 5,
        agentRecommendation: 'maybe',
        summaryPitch: 'Pitch needs development',
      });

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.resolve({
          content: '{}',
          usage: { input_tokens: 200, output_tokens: 100 },
        })
      );

      const result = await service.runMarketAnalyst(reportId);

      expect(result.commercialViabilityScore).toBe(5);
      expect(result.agentRecommendation).toBe('maybe');
    });

    it('should handle AI analysis failure and update status', async () => {
      const reportId = 'report-123';

      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          title: 'Test',
        }),
      };

      const mockChaptersStmt = {
        all: jest.fn().mockReturnValue([
          { chapter_number: 1, content: 'Content...' },
        ]),
      };

      const mockFailedStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockChaptersStmt)
        .mockReturnValueOnce(mockFailedStmt);

      (mockClaudeService.createCompletionWithUsage as any).mockImplementation(() =>
        Promise.reject(new Error('API error'))
      );

      await expect(service.runMarketAnalyst(reportId)).rejects.toThrow(
        'API error'
      );

      // Should update status to failed
      expect(mockFailedStmt.run).toHaveBeenCalledWith(reportId);
    });

    it('should throw error if report not found', async () => {
      const mockUpdateStatusStmt = { run: jest.fn() };
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockUpdateStatusStmt)
        .mockReturnValueOnce(mockReportStmt);

      await expect(service.runMarketAnalyst('invalid-report')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  // ============================================================================
  // finalizeReport
  // ============================================================================

  describe('finalizeReport', () => {
    it('should finalize report with all module results', async () => {
      const reportId = 'report-123';

      const betaSwarmResult: BetaSwarmResult = {
        chapterResults: [
          {
            chapterId: 'chapter-1',
            chapterNumber: 1,
            retentionScore: 8,
            reactions: [],
            dnfRiskPoints: [],
            highlights: [],
          },
        ],
        overallEngagement: 8,
        wouldRecommend: true,
        summaryReaction: 'Great read',
      };

      const ruthlessEditorResult: RuthlessEditorResult = {
        chapterResults: [
          {
            chapterId: 'chapter-1',
            chapterNumber: 1,
            valueShift: {
              openingCharge: 'calm',
              closingCharge: 'intense',
              shiftMagnitude: 8,
              assessment: 'Strong shift',
            },
            expositionIssues: [],
            pacingIssues: [],
            scenePurpose: { earned: true, reasoning: 'Good scene' },
          },
        ],
        overallStructureScore: 8,
        majorIssuesCount: 0,
        summaryVerdict: 'Solid structure',
      };

      const marketAnalystResult: MarketAnalystResult = {
        compTitles: [],
        hookAnalysis: {
          openingLineScore: 8,
          openingParagraphScore: 8,
          openingChapterScore: 8,
          openingLine: 'Great opening',
          strengths: [],
          weaknesses: [],
        },
        tropeAnalysis: [],
        marketPositioning: {
          primaryAudience: 'Adult readers',
          secondaryAudience: 'YA crossover',
          marketingAngle: 'Fresh take',
          uniqueSellingPoint: 'Unique voice',
          potentialChallenges: [],
        },
        commercialViabilityScore: 8,
        agentRecommendation: 'strong_yes',
        summaryPitch: 'Compelling story',
      };

      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          beta_swarm_results: JSON.stringify(betaSwarmResult),
          ruthless_editor_results: JSON.stringify(ruthlessEditorResult),
          market_analyst_results: JSON.stringify(marketAnalystResult),
          created_at: '2026-01-01T00:00:00Z',
        }),
      };

      const mockUpdateStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      const result = await service.finalizeReport(reportId);

      expect(result.status).toBe('completed');
      expect(result.overallScore).toBe(80); // (8*10*0.35 + 8*10*0.35 + 8*10*0.30)
      expect(result.betaSwarm).toEqual(betaSwarmResult);
      expect(result.ruthlessEditor).toEqual(ruthlessEditorResult);
      expect(result.marketAnalyst).toEqual(marketAnalystResult);
      expect(result.recommendations).toBeDefined();
      expect(mockUpdateStmt.run).toHaveBeenCalledWith(
        80,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        reportId
      );
    });

    it('should generate recommendations based on findings', async () => {
      const reportId = 'report-123';

      const betaSwarmResult: BetaSwarmResult = {
        chapterResults: [
          {
            chapterId: 'chapter-1',
            chapterNumber: 1,
            retentionScore: 4, // Low engagement
            reactions: [],
            dnfRiskPoints: [
              { location: 'para 5', reason: 'Info dump', severity: 'high' },
            ],
            highlights: [],
          },
        ],
        overallEngagement: 4,
        wouldRecommend: false,
        summaryReaction: 'Struggled',
      };

      const ruthlessEditorResult: RuthlessEditorResult = {
        chapterResults: [
          {
            chapterId: 'chapter-1',
            chapterNumber: 1,
            valueShift: {
              openingCharge: 'neutral',
              closingCharge: 'neutral',
              shiftMagnitude: 2,
              assessment: 'Flat',
            },
            expositionIssues: [],
            pacingIssues: [],
            scenePurpose: { earned: false, reasoning: 'Scene not needed' },
          },
        ],
        overallStructureScore: 3,
        majorIssuesCount: 8, // Many issues
        summaryVerdict: 'Needs major revision',
      };

      const marketAnalystResult: MarketAnalystResult = {
        compTitles: [],
        hookAnalysis: {
          openingLineScore: 5, // Weak opening
          openingParagraphScore: 5,
          openingChapterScore: 5,
          openingLine: 'Weak opening',
          strengths: [],
          weaknesses: [],
        },
        tropeAnalysis: [],
        marketPositioning: {
          primaryAudience: 'Unknown',
          secondaryAudience: 'Unknown',
          marketingAngle: 'Unclear',
          uniqueSellingPoint: 'Unclear',
          potentialChallenges: [],
        },
        commercialViabilityScore: 4,
        agentRecommendation: 'pass',
        summaryPitch: 'Needs work',
      };

      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          beta_swarm_results: JSON.stringify(betaSwarmResult),
          ruthless_editor_results: JSON.stringify(ruthlessEditorResult),
          market_analyst_results: JSON.stringify(marketAnalystResult),
          created_at: '2026-01-01T00:00:00Z',
        }),
      };

      const mockUpdateStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      const result = await service.finalizeReport(reportId);

      expect(result.recommendations).toContain(
        'Revise chapters 1 for better reader engagement'
      );
      expect(result.recommendations).toContain(
        'Address high DNF risk points in chapters 1'
      );
      expect(result.recommendations).toContain(
        'Major structural revision needed before submission'
      );
      expect(result.recommendations).toContain(
        'Evaluate necessity of chapters 1'
      );
      expect(result.recommendations).toContain(
        'Strengthen opening line - first impression is critical'
      );
      expect(result.recommendations).toContain(
        'Significant revision needed before querying agents'
      );
    });

    it('should handle partial results gracefully', async () => {
      const reportId = 'report-123';

      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          beta_swarm_results: null,
          ruthless_editor_results: null,
          market_analyst_results: null,
          created_at: '2026-01-01T00:00:00Z',
        }),
      };

      const mockUpdateStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockReportStmt)
        .mockReturnValueOnce(mockUpdateStmt);

      const result = await service.finalizeReport(reportId);

      expect(result.status).toBe('completed');
      expect(result.overallScore).toBe(50); // Default score
      expect(result.betaSwarm).toBeUndefined();
      expect(result.ruthlessEditor).toBeUndefined();
      expect(result.marketAnalyst).toBeUndefined();
    });

    it('should throw error if report not found', async () => {
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      await expect(service.finalizeReport('invalid-report')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  // ============================================================================
  // getReportStatus
  // ============================================================================

  describe('getReportStatus', () => {
    it('should return report status and progress', () => {
      const reportId = 'report-123';

      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          status: 'processing',
          beta_swarm_status: 'completed',
          ruthless_editor_status: 'processing',
          market_analyst_status: 'pending',
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      const result = service.getReportStatus(reportId);

      expect(result.status).toBe('processing');
      expect(result.modules.betaSwarm).toBe('completed');
      expect(result.modules.ruthlessEditor).toBe('processing');
      expect(result.modules.marketAnalyst).toBe('pending');
      expect(result.progress).toBe(33); // 1 out of 3 completed
    });

    it('should calculate 100% progress when all modules complete', () => {
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          status: 'completed',
          beta_swarm_status: 'completed',
          ruthless_editor_status: 'completed',
          market_analyst_status: 'completed',
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      const result = service.getReportStatus('report-123');

      expect(result.progress).toBe(100);
    });

    it('should throw error if report not found', () => {
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      expect(() => service.getReportStatus('invalid-report')).toThrow(
        'Report not found'
      );
    });
  });

  // ============================================================================
  // getReport
  // ============================================================================

  describe('getReport', () => {
    it('should return full editorial report', () => {
      const reportId = 'report-123';

      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: reportId,
          project_id: 'project-456',
          status: 'completed',
          beta_swarm_results: JSON.stringify({ overallEngagement: 8 }),
          ruthless_editor_results: JSON.stringify({ overallStructureScore: 7 }),
          market_analyst_results: JSON.stringify({
            commercialViabilityScore: 8,
          }),
          overall_score: 78,
          summary: 'Good manuscript with minor issues',
          recommendations: JSON.stringify(['Polish chapter 3']),
          created_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-01-01T02:00:00Z',
          error: null,
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      const result = service.getReport(reportId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(reportId);
      expect(result?.projectId).toBe('project-456');
      expect(result?.status).toBe('completed');
      expect(result?.overallScore).toBe(78);
      expect(result?.betaSwarm).toEqual({ overallEngagement: 8 });
      expect(result?.ruthlessEditor).toEqual({ overallStructureScore: 7 });
      expect(result?.marketAnalyst).toEqual({ commercialViabilityScore: 8 });
    });

    it('should return null if report not found', () => {
      const mockReportStmt = {
        get: jest.fn().mockReturnValue(null),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      const result = service.getReport('invalid-report');

      expect(result).toBeNull();
    });

    it('should handle reports without JSON results', () => {
      const mockReportStmt = {
        get: jest.fn().mockReturnValue({
          id: 'report-123',
          project_id: 'project-456',
          status: 'pending',
          beta_swarm_results: null,
          ruthless_editor_results: null,
          market_analyst_results: null,
          overall_score: null,
          summary: null,
          recommendations: null,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: null,
          error: null,
        }),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportStmt);

      const result = service.getReport('report-123');

      expect(result).not.toBeNull();
      expect(result?.betaSwarm).toBeUndefined();
      expect(result?.ruthlessEditor).toBeUndefined();
      expect(result?.marketAnalyst).toBeUndefined();
    });
  });

  // ============================================================================
  // getProjectReports
  // ============================================================================

  describe('getProjectReports', () => {
    it('should return all reports for a project', () => {
      const projectId = 'project-456';

      const mockReportsStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'report-1',
            project_id: projectId,
            status: 'completed',
            beta_swarm_results: null,
            ruthless_editor_results: null,
            market_analyst_results: null,
            overall_score: 75,
            summary: 'First report',
            recommendations: null,
            created_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T02:00:00Z',
            error: null,
          },
          {
            id: 'report-2',
            project_id: projectId,
            status: 'pending',
            beta_swarm_results: null,
            ruthless_editor_results: null,
            market_analyst_results: null,
            overall_score: null,
            summary: null,
            recommendations: null,
            created_at: '2026-01-02T00:00:00Z',
            completed_at: null,
            error: null,
          },
        ]),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportsStmt);

      const result = service.getProjectReports(projectId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('report-1');
      expect(result[0].status).toBe('completed');
      expect(result[1].id).toBe('report-2');
      expect(result[1].status).toBe('pending');
    });

    it('should return empty array if no reports found', () => {
      const mockReportsStmt = {
        all: jest.fn().mockReturnValue([]),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportsStmt);

      const result = service.getProjectReports('project-with-no-reports');

      expect(result).toEqual([]);
    });

    it('should parse JSON results correctly', () => {
      const mockReportsStmt = {
        all: jest.fn().mockReturnValue([
          {
            id: 'report-1',
            project_id: 'project-456',
            status: 'completed',
            beta_swarm_results: JSON.stringify({ overallEngagement: 9 }),
            ruthless_editor_results: JSON.stringify({
              overallStructureScore: 8,
            }),
            market_analyst_results: JSON.stringify({
              commercialViabilityScore: 9,
            }),
            overall_score: 87,
            summary: 'Excellent manuscript',
            recommendations: JSON.stringify(['Submit to agents']),
            created_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T02:00:00Z',
            error: null,
          },
        ]),
      };

      mockDb.prepare = jest.fn().mockReturnValueOnce(mockReportsStmt);

      const result = service.getProjectReports('project-456');

      expect(result[0].betaSwarm).toEqual({ overallEngagement: 9 });
      expect(result[0].ruthlessEditor).toEqual({ overallStructureScore: 8 });
      expect(result[0].marketAnalyst).toEqual({ commercialViabilityScore: 9 });
      expect(result[0].recommendations).toEqual(['Submit to agents']);
    });
  });
});
