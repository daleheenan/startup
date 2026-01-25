import { jest } from '@jest/globals';
import { EditingService } from '../editing.service.js';

jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');

describe('EditingService', () => {
  let service: EditingService;
  let mockClaudeService: any;
  let mockDb: any;

  beforeEach(async () => {
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;

    service = new EditingService();
    jest.clearAllMocks();
  });

  describe('developmentalEdit', () => {
    it('should analyze chapter structure and pacing', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Chapter content here...',
        scene_cards: [{ goal: 'Introduce hero', conflict: 'First challenge', outcome: 'Success' }],
      };

      const mockEditorResponse = {
        overallAssessment: 'Strong opening with good pacing',
        strengths: ['Clear character goals', 'Engaging conflict'],
        suggestions: [
          {
            type: 'pacing',
            location: 'Middle section',
            issue: 'Scene drags slightly',
            suggestion: 'Tighten dialogue',
            severity: 'minor',
          },
        ],
        flags: [],
        needsRevision: false,
        revisionGuidance: null,
      };

      // Mock service methods using jest.spyOn
      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);
      jest.spyOn(service as any, 'generateFlagId').mockReturnValue('flag-123');

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.developmentalEdit('chapter-1');

      expect(result.editorType).toBe('developmental');
      expect(result.approved).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.flags).toHaveLength(0);
      expect(result.suggestions[0].type).toBe('pacing');
    });

    it('should create flags for major issues', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Chapter content...',
        scene_cards: [],
      };

      const mockEditorResponse = {
        overallAssessment: 'Needs revision',
        strengths: [],
        suggestions: [],
        flags: [
          {
            type: 'plot_hole',
            severity: 'major',
            description: 'Character motivation unclear',
            location: 'Opening scene',
          },
        ],
        needsRevision: true,
        revisionGuidance: 'Clarify character goals',
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);
      jest.spyOn(service as any, 'generateFlagId').mockReturnValue('flag-456');

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.developmentalEdit('chapter-1');

      expect(result.approved).toBe(false);
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe('plot_hole');
      expect(result.flags[0].severity).toBe('major');
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({ content: null });

      await expect(service.developmentalEdit('chapter-1')).rejects.toThrow(
        'Chapter content not found'
      );
    });
  });

  describe('lineEdit', () => {
    it('should polish prose and dialogue', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Original prose here...',
        scene_cards: [],
      };

      const mockEditorResponse = {
        editedContent: 'Improved prose here...',
        suggestions: [
          {
            type: 'prose',
            location: 'Paragraph 3',
            issue: 'Passive voice',
            suggestion: 'Use active voice',
            severity: 'minor',
          },
        ],
        flags: [],
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);
      jest.spyOn(service as any, 'generateFlagId').mockReturnValue('flag-789');

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.lineEdit('chapter-1');

      expect(result.editorType).toBe('line');
      expect(result.editedContent).toBe('Improved prose here...');
      expect(result.suggestions).toHaveLength(1);
      expect(result.approved).toBe(true);
    });
  });

  describe('continuityEdit', () => {
    it('should verify consistency with story bible', async () => {
      const mockChapterData = {
        chapter_number: 5,
        content: 'Chapter content...',
        scene_cards: [],
      };

      const mockStoryBible = {
        characters: [{ id: 'char-1', name: 'Hero', traits: ['brave'] }],
      };

      const mockEditorResponse = {
        continuityIssues: [],
        flags: [],
        approved: true,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'getStoryBibleContext').mockReturnValue(mockStoryBible);
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);
      jest.spyOn(service as any, 'generateFlagId').mockReturnValue('flag-101');

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.continuityEdit('chapter-1');

      expect(result.editorType).toBe('continuity');
      expect(result.approved).toBe(true);
      expect(result.flags).toHaveLength(0);
    });

    it('should flag continuity errors', async () => {
      const mockChapterData = {
        chapter_number: 5,
        content: 'Content with error...',
        scene_cards: [],
      };

      const mockEditorResponse = {
        continuityIssues: [
          {
            type: 'character_inconsistency',
            description: 'Character acting out of character',
            location: 'Scene 2',
          },
        ],
        flags: [
          {
            type: 'continuity_error',
            severity: 'major',
            description: 'Character contradiction',
            location: 'Scene 2',
          },
        ],
        approved: false,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'getStoryBibleContext').mockReturnValue({});
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);
      jest.spyOn(service as any, 'generateFlagId').mockReturnValue('flag-102');

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.continuityEdit('chapter-1');

      expect(result.approved).toBe(false);
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe('continuity_error');
    });
  });

  describe('copyEdit', () => {
    it('should fix grammar and style issues', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Content with typos...',
        scene_cards: [],
      };

      const mockEditorResponse = {
        editedContent: 'Content without typos...',
        corrections: [
          {
            type: 'grammar',
            location: 'Line 5',
            issue: 'Subject-verb agreement',
            correction: 'Fixed verb tense',
          },
        ],
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);
      jest.spyOn(service as any, 'parseEditorResponse').mockReturnValue(mockEditorResponse);

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: JSON.stringify(mockEditorResponse),
          usage: { input_tokens: 100, output_tokens: 50 },
        });

      const result = await service.copyEdit('chapter-1');

      expect(result.editorType).toBe('copy');
      expect(result.editedContent).toBe('Content without typos...');
      expect(result.approved).toBe(true);
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({ content: null });

      await expect(service.copyEdit('chapter-1')).rejects.toThrow(
        'Chapter content not found'
      );
    });
  });

  describe('authorRevision', () => {
    it('should revise chapter based on developmental feedback', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Original chapter content needing revision...',
        scene_cards: [],
      };

      const mockDevEditResult = {
        editorType: 'developmental' as const,
        originalContent: 'Original content',
        editedContent: 'Original content',
        suggestions: [
          {
            type: 'plot' as const,
            location: 'Opening',
            issue: 'Weak opening hook',
            suggestion: 'Start with action',
            severity: 'major' as const,
          },
        ],
        flags: [],
        approved: false,
      };

      const mockRevisedContent = 'Revised chapter with stronger opening...';

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      mockClaudeService.createCompletionWithUsage = jest
        .fn()
        .mockResolvedValue({
          content: mockRevisedContent,
          usage: { input_tokens: 200, output_tokens: 150 },
        });

      const result = await service.authorRevision('chapter-1', mockDevEditResult);

      expect(result.content).toBe(mockRevisedContent);
      expect(result.usage).toBeDefined();
      expect(result.usage.input_tokens).toBe(200);
      expect(mockClaudeService.createCompletionWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Author Agent'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('DEVELOPMENTAL EDITOR FEEDBACK'),
            }),
          ]),
        })
      );
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({ content: null });

      const mockDevEditResult = {
        editorType: 'developmental' as const,
        originalContent: '',
        editedContent: '',
        suggestions: [],
        flags: [],
        approved: false,
      };

      await expect(service.authorRevision('chapter-1', mockDevEditResult)).rejects.toThrow(
        'Chapter content not found'
      );
    });

    it('should throw error if dev edit result not approved', async () => {
      const mockChapterData = {
        chapter_number: 1,
        content: 'Content',
        scene_cards: [],
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockDevEditResult = {
        editorType: 'developmental' as const,
        originalContent: '',
        editedContent: '',
        suggestions: [],
        flags: [],
        approved: true,
      };

      await expect(service.authorRevision('chapter-1', mockDevEditResult)).rejects.toThrow(
        'Cannot revise without developmental editor feedback'
      );
    });
  });

  describe('applyEditResult', () => {
    it('should update chapter with edited content and flags', async () => {
      const mockExistingChapter = {
        flags: JSON.stringify([
          {
            id: 'flag-1',
            type: 'existing',
            severity: 'minor',
            description: 'Old flag',
            location: 'Scene 1',
            resolved: false,
          },
        ]),
      };

      const mockEditResult = {
        editorType: 'line' as const,
        originalContent: 'Old content',
        editedContent: 'New polished content',
        suggestions: [],
        flags: [
          {
            id: 'flag-2',
            type: 'needs_review',
            severity: 'major' as const,
            description: 'Needs author attention',
            location: 'Paragraph 5',
            resolved: false,
          },
        ],
        approved: true,
      };

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const getStmt = { get: jest.fn().mockReturnValue(mockExistingChapter) };
      const updateStmt = { run: jest.fn() };

      mockPrepare.mockReturnValueOnce(getStmt).mockReturnValueOnce(updateStmt);

      await service.applyEditResult('chapter-1', mockEditResult);

      expect(updateStmt.run).toHaveBeenCalledWith(
        'New polished content',
        expect.stringContaining('flag-1'),
        expect.any(String),
        'chapter-1'
      );
    });
  });

  describe('getPreviousChapterSummaries', () => {
    it('should retrieve previous chapter summaries for continuity checking', () => {
      const mockSummaries = [
        { chapter_number: 1, summary: 'Chapter 1 summary' },
        { chapter_number: 2, summary: 'Chapter 2 summary' },
        { chapter_number: 3, summary: 'Chapter 3 summary' },
      ];

      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;

      const stmt = { all: jest.fn().mockReturnValue(mockSummaries) };
      mockPrepare.mockReturnValueOnce(stmt);

      const result = (service as any).getPreviousChapterSummaries('chapter-5', 5);

      expect(result).toHaveLength(3);
      expect(result[0].chapter_number).toBe(1);
      expect(result[2].chapter_number).toBe(3);
    });
  });

  describe('extractAuthorFlags', () => {
    it('should extract [NEEDS AUTHOR: ...] markers from text', () => {
      const text = `This is some content.
[NEEDS AUTHOR: Clarify this motivation]
More content here.
[NEEDS AUTHOR: Add sensory details]
Final content.`;

      const result = (service as any).extractAuthorFlags(text);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('needs_review');
      expect(result[0].description).toBe('Clarify this motivation');
      expect(result[1].description).toBe('Add sensory details');
    });

    it('should return empty array if no markers found', () => {
      const text = 'This is clean content with no markers.';

      const result = (service as any).extractAuthorFlags(text);

      expect(result).toHaveLength(0);
    });
  });

  describe('parseEditorResponse', () => {
    it('should parse valid JSON response', () => {
      const response = '{"key": "value", "items": [1, 2, 3]}';

      const result = (service as any).parseEditorResponse(response);

      expect(result).toEqual({ key: 'value', items: [1, 2, 3] });
    });

    it('should parse JSON from markdown code blocks', () => {
      const response = '```json\n{"key": "value"}\n```';

      const result = (service as any).parseEditorResponse(response);

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON without language specifier in code block', () => {
      const response = '```\n{"key": "value"}\n```';

      const result = (service as any).parseEditorResponse(response);

      expect(result).toEqual({ key: 'value' });
    });

    it('should throw error for invalid JSON', () => {
      const response = 'This is not JSON at all';

      expect(() => (service as any).parseEditorResponse(response)).toThrow(
        'Failed to parse editor response as JSON'
      );
    });
  });
});
