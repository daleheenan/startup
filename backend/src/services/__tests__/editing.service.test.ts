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

    mockClaudeService = claudeService;
    mockDb = dbModule.default;

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

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

      (mockClaudeService.createCompletion as jest.Mock) = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockEditorResponse));

      const result = await service.copyEdit('chapter-1');

      expect(result.editorType).toBe('copy');
      expect(result.editedContent).toBe('Content without typos...');
      expect(result.approved).toBe(true);
    });
  });
});
