import { jest } from '@jest/globals';

jest.mock('../claude.service.js');
jest.mock('../../db/connection.js');

import { RegenerationService } from '../regeneration.service.js';
import type {
  RegenerationMode,
  VariationResult,
  ApplyVariationResult,
  SceneRegenerationResult,
  HistoryResult,
  StoryDNA,
  SceneCard,
} from '../../shared/types/index.js';

describe('RegenerationService', () => {
  let service: RegenerationService;
  let mockClaudeService: any;
  let mockDb: any;

  const mockStoryDNA: StoryDNA = {
    genre: 'Fantasy',
    subgenre: 'Epic Fantasy',
    themes: ['redemption', 'power'],
    tone: 'dark and atmospheric',
    proseStyle: 'literary with rich prose',
    timeframe: 'medieval fantasy',
  };

  const mockSceneCards: SceneCard[] = [
    {
      id: 'scene-1',
      order: 1,
      location: 'Ancient temple',
      povCharacter: 'Hero',
      goal: 'Introduce the protagonist',
      conflict: 'Internal struggle with their past',
      outcome: 'Decision to seek redemption',
      characters: ['Hero', 'Mentor'],
      emotionalBeat: 'Regret turning to determination',
      timeOfDay: 'night',
    },
    {
      id: 'scene-2',
      order: 2,
      location: 'Town square',
      povCharacter: 'Hero',
      goal: 'Establish the quest',
      conflict: 'External threat appears',
      outcome: 'Hero accepts the mission',
      characters: ['Hero', 'Antagonist'],
      emotionalBeat: 'Fear turning to courage',
      timeOfDay: 'morning',
    },
  ];

  beforeEach(async () => {
    const { claudeService } = await import('../claude.service.js');
    const dbModule = await import('../../db/connection.js');

    mockClaudeService = claudeService as any;
    mockDb = dbModule.default as any;

    service = new RegenerationService();
    jest.clearAllMocks();
  });

  describe('generateVariations', () => {
    const mockChapterContent = `The old temple stood silent in the moonlight. Marcus approached slowly, his heart heavy with regret.

"Are you sure about this?" whispered Elena beside him.

"I have no choice," Marcus replied, his voice firm despite his doubt.

The stone doors loomed before them, ancient and forbidding.`;

    it('should generate 3 variations of selected text with dialogue mode', async () => {
      const selectionStart = mockChapterContent.indexOf('"Are you sure');
      const selectionEnd = mockChapterContent.indexOf('doubt.') + 6;

      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      // Mock Claude responses for 3 variations
      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('"Are you certain about this?" Elena whispered, her voice trembling.\n\n"I must," Marcus said, though doubt clouded his eyes.')
        .mockResolvedValueOnce('"Do you truly want to do this?" Elena asked softly.\n\n"There\'s no turning back now," Marcus answered, his resolve wavering.')
        .mockResolvedValueOnce('"Second thoughts?" Elena murmured.\n\n"Too late for that," Marcus said, forcing confidence into his tone.');

      // Mock database operations
      const mockInsertStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };
      const mockPrepare = jest.fn();
      mockDb.prepare = mockPrepare;
      mockPrepare
        .mockReturnValueOnce(mockInsertStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.generateVariations(
        'chapter-123',
        selectionStart,
        selectionEnd,
        'dialogue',
        500
      );

      // Assertions
      expect(result.variationId).toMatch(/^var_\d+_[a-z0-9]+$/);
      expect(result.originalText).toContain('"Are you sure about this?"');
      expect(result.variations).toHaveLength(3);
      expect(result.variations[0]).toContain('Are you certain');
      expect(result.variations[1]).toContain('Do you truly want');
      expect(result.variations[2]).toContain('Second thoughts');
      expect(result.mode).toBe('dialogue');
      expect(result.contextBefore).toBeTruthy();
      expect(result.contextAfter).toBeTruthy();

      // Verify Claude was called 3 times with increasing temperature
      expect(mockClaudeService.createCompletion).toHaveBeenCalledTimes(3);
      expect(mockClaudeService.createCompletion).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ temperature: 0.8 })
      );
      expect(mockClaudeService.createCompletion).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ temperature: 0.9 })
      );
      expect(mockClaudeService.createCompletion).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ temperature: 1.0 })
      );

      // Verify database inserts
      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.stringMatching(/^var_/),
        'chapter-123',
        selectionStart,
        selectionEnd,
        expect.any(String),
        expect.stringContaining('Are you certain'),
        expect.stringContaining('Do you truly want'),
        expect.stringContaining('Second thoughts'),
        'dialogue',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );

      expect(mockHistoryStmt.run).toHaveBeenCalledWith(
        expect.stringMatching(/^hist_/),
        'chapter-123',
        expect.stringMatching(/^var_/),
        'generate_variations',
        selectionStart,
        selectionEnd,
        expect.any(String),
        'dialogue',
        expect.any(String)
      );
    });

    it('should generate variations with description mode', async () => {
      const selectionStart = 0;
      const selectionEnd = mockChapterContent.indexOf('moonlight.') + 10;

      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('The ancient temple rose from the mist, bathed in silver moonlight.')
        .mockResolvedValueOnce('Moonbeams danced across the temple\'s weathered stones, casting long shadows.')
        .mockResolvedValueOnce('The temple\'s silhouette stood stark against the luminous moon.');

      const mockInsertStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockInsertStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.generateVariations(
        'chapter-123',
        selectionStart,
        selectionEnd,
        'description',
        500
      );

      expect(result.mode).toBe('description');
      expect(result.variations[0]).toContain('ancient temple');
      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('DESCRIPTION'),
        })
      );
    });

    it('should generate variations with scene mode', async () => {
      const selectionStart = 0;
      const selectionEnd = mockChapterContent.length;

      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('Scene variation 1...')
        .mockResolvedValueOnce('Scene variation 2...')
        .mockResolvedValueOnce('Scene variation 3...');

      const mockInsertStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockInsertStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.generateVariations(
        'chapter-123',
        selectionStart,
        selectionEnd,
        'scene',
        500
      );

      expect(result.mode).toBe('scene');
      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('ENTIRE SCENE'),
        })
      );
    });

    it('should use edited content if available', async () => {
      const editedContent = 'This is edited content with changes.';
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: editedContent,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('Variation 1')
        .mockResolvedValueOnce('Variation 2')
        .mockResolvedValueOnce('Variation 3');

      const mockInsertStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockInsertStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.generateVariations('chapter-123', 0, 20, 'general', 500);

      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        'chapter-123',
        0,
        20,
        'This is edited conte', // First 20 chars
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'general',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: null,
        editedContent: null,
        scene_cards: [],
        story_dna: mockStoryDNA,
      });

      await expect(
        service.generateVariations('chapter-123', 0, 10, 'general')
      ).rejects.toThrow('Chapter content not found');
    });

    it('should throw error for invalid selection range - start negative', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.generateVariations('chapter-123', -1, 10, 'general')
      ).rejects.toThrow('Invalid selection range');
    });

    it('should throw error for invalid selection range - end beyond content', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.generateVariations('chapter-123', 0, mockChapterContent.length + 100, 'general')
      ).rejects.toThrow('Invalid selection range');
    });

    it('should throw error for invalid selection range - start >= end', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.generateVariations('chapter-123', 50, 50, 'general')
      ).rejects.toThrow('Invalid selection range');
    });

    it('should extract context with specified token limit', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const extractContextSpy = jest.spyOn(service as any, 'extractContext');

      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('Var 1')
        .mockResolvedValueOnce('Var 2')
        .mockResolvedValueOnce('Var 3');

      const mockInsertStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };
      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockInsertStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.generateVariations('chapter-123', 50, 100, 'general', 300);

      expect(extractContextSpy).toHaveBeenCalledWith(
        mockChapterContent,
        50,
        100,
        300
      );
    });
  });

  describe('applyVariation', () => {
    const mockVariationData = {
      id: 'var-123',
      chapter_id: 'chapter-456',
      selection_start: 50,
      selection_end: 150,
      original_text: 'Original text here',
      variation_1: 'First variation text',
      variation_2: 'Second variation text',
      variation_3: 'Third variation text',
      regeneration_mode: 'dialogue',
      context_before: 'Context before...',
      context_after: 'Context after...',
      selected_variation: null,
      created_at: '2025-01-01T00:00:00Z',
    };

    it('should apply variation 1 to chapter content', async () => {
      const mockChapterData = {
        content: 'Beginning text. Original text here. Ending text.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.applyVariation('chapter-456', 'var-123', 1);

      expect(result.success).toBe(true);
      expect(result.updatedContent).toContain('First variation text');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.historyId).toMatch(/^hist_/);

      expect(mockInsertEditStmt.run).toHaveBeenCalledWith(
        expect.stringMatching(/^edit_/),
        'chapter-456',
        expect.stringContaining('First variation text'),
        expect.any(Number),
        0,
        expect.any(String),
        expect.any(String)
      );

      expect(mockUpdateVariationStmt.run).toHaveBeenCalledWith(1, 'var-123');
    });

    it('should apply variation 2 to chapter content', async () => {
      const mockChapterData = {
        content: 'Start. Original text here. End.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.applyVariation('chapter-456', 'var-123', 2);

      expect(result.updatedContent).toContain('Second variation text');
      expect(mockUpdateVariationStmt.run).toHaveBeenCalledWith(2, 'var-123');
    });

    it('should apply variation 3 to chapter content', async () => {
      const mockChapterData = {
        content: 'Start. Original text here. End.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.applyVariation('chapter-456', 'var-123', 3);

      expect(result.updatedContent).toContain('Third variation text');
      expect(mockUpdateVariationStmt.run).toHaveBeenCalledWith(3, 'var-123');
    });

    it('should revert to original text when variation 0 is selected', async () => {
      const mockChapterData = {
        content: 'Start. Modified text. End.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.applyVariation('chapter-456', 'var-123', 0);

      expect(result.updatedContent).toContain('Original text here');
      expect(mockUpdateVariationStmt.run).toHaveBeenCalledWith(0, 'var-123');
    });

    it('should update existing chapter edit if one exists', async () => {
      const mockChapterData = {
        content: 'Original chapter content.',
        editedContent: 'Existing edited content. Original text here. More edited content.',
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue({ id: 'edit-789' }) };
      const mockUpdateEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockUpdateEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.applyVariation('chapter-456', 'var-123', 1);

      expect(mockUpdateEditStmt.run).toHaveBeenCalledWith(
        expect.stringContaining('First variation text'),
        expect.any(Number),
        expect.any(String),
        'chapter-456'
      );
    });

    it('should throw error for invalid variation selection - negative', async () => {
      await expect(
        service.applyVariation('chapter-456', 'var-123', -1)
      ).rejects.toThrow('Invalid variation selection (must be 0-3)');
    });

    it('should throw error for invalid variation selection - too high', async () => {
      await expect(
        service.applyVariation('chapter-456', 'var-123', 4)
      ).rejects.toThrow('Invalid variation selection (must be 0-3)');
    });

    it('should throw error if variation not found', async () => {
      const mockVariationStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockVariationStmt);

      await expect(
        service.applyVariation('chapter-456', 'var-999', 1)
      ).rejects.toThrow('Variation not found');
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: null,
        editedContent: null,
        scene_cards: [],
        story_dna: mockStoryDNA,
      });

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockVariationStmt);

      await expect(
        service.applyVariation('chapter-456', 'var-123', 1)
      ).rejects.toThrow('Chapter content not found');
    });

    it('should record action in history with correct details', async () => {
      const mockChapterData = {
        content: 'Content before. Original text here. Content after.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.applyVariation('chapter-456', 'var-123', 2);

      expect(mockHistoryStmt.run).toHaveBeenCalledWith(
        expect.stringMatching(/^hist_/),
        'chapter-456',
        'var-123',
        'apply_variation',
        50,
        150,
        'Original text here',
        'Second variation text',
        'dialogue',
        expect.any(String)
      );
    });
  });

  describe('regenerateScene', () => {
    const mockChapterContent = `Scene 1 paragraph 1.

Scene 1 paragraph 2.

Scene 2 paragraph 1.

Scene 2 paragraph 2.`;

    it('should regenerate a specific scene within a chapter', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const regeneratedScene = 'This is the regenerated scene with improved prose and pacing.';
      (mockClaudeService.createCompletion as any).mockResolvedValue(regeneratedScene);

      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.regenerateScene('chapter-123', 0);

      expect(result.success).toBe(true);
      expect(result.sceneContent).toBe(regeneratedScene);
      expect(result.sceneIndex).toBe(0);
      expect(result.historyId).toMatch(/^hist_/);
      expect(result.fullContent).toContain(regeneratedScene);

      expect(mockClaudeService.createCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Author Agent'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('SCENE CARD'),
            }),
          ]),
          maxTokens: 4096,
          temperature: 0.9,
        })
      );
    });

    it('should regenerate the last scene in a chapter', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const regeneratedScene = 'Regenerated final scene.';
      (mockClaudeService.createCompletion as any).mockResolvedValue(regeneratedScene);

      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.regenerateScene('chapter-123', 1);

      expect(result.success).toBe(true);
      expect(result.sceneIndex).toBe(1);
    });

    it('should update existing chapter edit when regenerating scene', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const regeneratedScene = 'Updated scene.';
      (mockClaudeService.createCompletion as any).mockResolvedValue(regeneratedScene);

      const mockExistingEditStmt = { get: jest.fn().mockReturnValue({ id: 'edit-456' }) };
      const mockUpdateEditStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockUpdateEditStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.regenerateScene('chapter-123', 0);

      expect(mockUpdateEditStmt.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'chapter-123'
      );
    });

    it('should throw error if chapter content not found', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: null,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.regenerateScene('chapter-123', 0)
      ).rejects.toThrow('Invalid scene index or chapter data');
    });

    it('should throw error if scene cards are missing', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: mockChapterContent,
        editedContent: null,
        scene_cards: null,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.regenerateScene('chapter-123', 0)
      ).rejects.toThrow('Invalid scene index or chapter data');
    });

    it('should throw error for invalid scene index', async () => {
      jest.spyOn(service as any, 'getChapterData').mockReturnValue({
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      });

      await expect(
        service.regenerateScene('chapter-123', 99)
      ).rejects.toThrow('Invalid scene index or chapter data');
    });

    it('should include story DNA and scene card in regeneration prompt', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any).mockResolvedValue('Regenerated.');

      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.regenerateScene('chapter-123', 0);

      const callArgs = (mockClaudeService.createCompletion as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('STORY DNA');
      expect(callArgs.messages[0].content).toContain('SCENE CARD');
      expect(callArgs.messages[0].content).toContain(mockSceneCards[0].goal);
    });

    it('should record scene regeneration in history', async () => {
      const mockChapterData = {
        content: mockChapterContent,
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const regeneratedScene = 'New scene content.';
      (mockClaudeService.createCompletion as any).mockResolvedValue(regeneratedScene);

      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      await service.regenerateScene('chapter-123', 0);

      expect(mockHistoryStmt.run).toHaveBeenCalledWith(
        expect.stringMatching(/^hist_/),
        'chapter-123',
        'scene_regen',
        expect.any(String),
        regeneratedScene,
        'scene',
        expect.any(String)
      );
    });
  });

  describe('getHistory', () => {
    it('should retrieve regeneration history for a chapter', () => {
      const mockHistoryRecords = [
        {
          id: 'hist-1',
          action_type: 'generate_variations',
          original_text: 'Original text 1',
          final_text: null,
          regeneration_mode: 'dialogue',
          selection_start: 0,
          selection_end: 50,
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          id: 'hist-2',
          action_type: 'apply_variation',
          original_text: 'Original text 2',
          final_text: 'Applied variation text',
          regeneration_mode: 'description',
          selection_start: 100,
          selection_end: 200,
          created_at: '2025-01-01T11:00:00Z',
        },
      ];

      const mockHistoryStmt = { all: jest.fn().mockReturnValue(mockHistoryRecords) };
      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 2 }) };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockHistoryStmt)
        .mockReturnValueOnce(mockCountStmt);

      const result = service.getHistory('chapter-123', 20, 0);

      expect(result.history).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.history[0].id).toBe('hist-1');
      expect(result.history[0].actionType).toBe('generate_variations');
      expect(result.history[1].id).toBe('hist-2');
      expect(result.history[1].actionType).toBe('apply_variation');

      expect(mockHistoryStmt.all).toHaveBeenCalledWith('chapter-123', 20, 0);
    });

    it('should apply limit and offset correctly', () => {
      const mockHistoryStmt = { all: jest.fn().mockReturnValue([]) };
      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockHistoryStmt)
        .mockReturnValueOnce(mockCountStmt);

      service.getHistory('chapter-123', 10, 5);

      expect(mockHistoryStmt.all).toHaveBeenCalledWith('chapter-123', 10, 5);
    });

    it('should use default limit and offset if not provided', () => {
      const mockHistoryStmt = { all: jest.fn().mockReturnValue([]) };
      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockHistoryStmt)
        .mockReturnValueOnce(mockCountStmt);

      service.getHistory('chapter-123');

      expect(mockHistoryStmt.all).toHaveBeenCalledWith('chapter-123', 20, 0);
    });

    it('should handle empty history', () => {
      const mockHistoryStmt = { all: jest.fn().mockReturnValue([]) };
      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockHistoryStmt)
        .mockReturnValueOnce(mockCountStmt);

      const result = service.getHistory('chapter-999');

      expect(result.history).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle null count result', () => {
      const mockHistoryStmt = { all: jest.fn().mockReturnValue([]) };
      const mockCountStmt = { get: jest.fn().mockReturnValue(undefined) };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockHistoryStmt)
        .mockReturnValueOnce(mockCountStmt);

      const result = service.getHistory('chapter-123');

      expect(result.total).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    describe('extractContext', () => {
      it('should extract context before, after, and selected text', () => {
        const content = 'A'.repeat(100) + 'SELECTED' + 'B'.repeat(100);
        const start = 100;
        const end = 108;

        const result = (service as any).extractContext(content, start, end, 10);

        expect(result.selected).toBe('SELECTED');
        expect(result.before).toHaveLength(40); // 10 tokens * 4 chars
        expect(result.after).toHaveLength(40);
      });

      it('should handle selection at start of content', () => {
        const content = 'SELECTED' + 'B'.repeat(100);

        const result = (service as any).extractContext(content, 0, 8, 10);

        expect(result.selected).toBe('SELECTED');
        expect(result.before).toBe('');
        expect(result.after).toHaveLength(40);
      });

      it('should handle selection at end of content', () => {
        const content = 'A'.repeat(100) + 'SELECTED';

        const result = (service as any).extractContext(content, 100, 108, 10);

        expect(result.selected).toBe('SELECTED');
        expect(result.before).toHaveLength(40);
        expect(result.after).toBe('');
      });
    });

    describe('buildRegenerationPrompt', () => {
      it('should build prompt for dialogue mode', () => {
        const result = (service as any).buildRegenerationPrompt(
          'dialogue',
          'Selected text',
          'Before context',
          'After context',
          mockStoryDNA
        );

        expect(result.system).toContain('DIALOGUE');
        expect(result.system).toContain('natural and character-specific');
        expect(result.user).toContain('Selected text');
        expect(result.user).toContain('Before context');
        expect(result.user).toContain('After context');
      });

      it('should build prompt for description mode', () => {
        const result = (service as any).buildRegenerationPrompt(
          'description',
          'Selected text',
          'Before',
          'After',
          mockStoryDNA
        );

        expect(result.system).toContain('DESCRIPTION');
        expect(result.system).toContain('sensory details');
      });

      it('should build prompt for scene mode', () => {
        const result = (service as any).buildRegenerationPrompt(
          'scene',
          'Selected text',
          'Before',
          'After',
          mockStoryDNA
        );

        expect(result.system).toContain('ENTIRE SCENE');
        expect(result.system).toContain('pacing and flow');
      });

      it('should build prompt for general mode', () => {
        const result = (service as any).buildRegenerationPrompt(
          'general',
          'Selected text',
          'Before',
          'After',
          mockStoryDNA
        );

        expect(result.system).toContain('OVERALL PROSE QUALITY');
        expect(result.system).toContain('sentence structure');
      });

      it('should include story DNA in prompt', () => {
        const result = (service as any).buildRegenerationPrompt(
          'general',
          'Text',
          'Before',
          'After',
          mockStoryDNA
        );

        expect(result.system).toContain('Fantasy');
        expect(result.system).toContain('redemption');
      });
    });

    describe('getChapterData', () => {
      it('should retrieve chapter data with story DNA and scene cards', () => {
        const mockRow = {
          content: 'Chapter content',
          edited_content: 'Edited content',
          scene_cards: JSON.stringify(mockSceneCards),
          story_dna: JSON.stringify(mockStoryDNA),
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = (service as any).getChapterData('chapter-123');

        expect(result.content).toBe('Chapter content');
        expect(result.editedContent).toBe('Edited content');
        expect(result.scene_cards).toHaveLength(2);
        expect(result.story_dna.genre).toBe('Fantasy');
      });

      it('should handle missing edited content', () => {
        const mockRow = {
          content: 'Chapter content',
          edited_content: null,
          scene_cards: JSON.stringify(mockSceneCards),
          story_dna: JSON.stringify(mockStoryDNA),
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = (service as any).getChapterData('chapter-123');

        expect(result.editedContent).toBeNull();
      });

      it('should handle missing scene cards', () => {
        const mockRow = {
          content: 'Chapter content',
          edited_content: null,
          scene_cards: null,
          story_dna: JSON.stringify(mockStoryDNA),
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        const result = (service as any).getChapterData('chapter-123');

        expect(result.scene_cards).toEqual([]);
      });

      it('should throw error if chapter not found', () => {
        const mockStmt = { get: jest.fn().mockReturnValue(undefined) };
        mockDb.prepare = jest.fn().mockReturnValue(mockStmt);

        expect(() => (service as any).getChapterData('chapter-999')).toThrow(
          'Chapter not found: chapter-999'
        );
      });
    });

    describe('extractSceneText', () => {
      it('should extract scene text by dividing paragraphs equally', () => {
        const content = 'Para 1\n\nPara 2\n\nPara 3\n\nPara 4';

        const result = (service as any).extractSceneText(content, 0, 2);

        expect(result).toContain('Para 1');
        expect(result).toContain('Para 2');
        expect(result).not.toContain('Para 3');
      });

      it('should extract last scene including all remaining paragraphs', () => {
        const content = 'Para 1\n\nPara 2\n\nPara 3\n\nPara 4\n\nPara 5';

        const result = (service as any).extractSceneText(content, 1, 2);

        expect(result).toContain('Para 3');
        expect(result).toContain('Para 4');
        expect(result).toContain('Para 5');
      });
    });

    describe('replaceSceneInContent', () => {
      it('should replace scene text while preserving other scenes', () => {
        const content = 'Scene 1 para 1\n\nScene 1 para 2\n\nScene 2 para 1\n\nScene 2 para 2';
        const newSceneText = 'New scene 1 content';

        const result = (service as any).replaceSceneInContent(content, 0, 2, newSceneText);

        expect(result).toContain('New scene 1 content');
        expect(result).toContain('Scene 2 para 1');
        expect(result).toContain('Scene 2 para 2');
      });

      it('should replace last scene correctly', () => {
        const content = 'Scene 1\n\nScene 2\n\nScene 3';
        const newSceneText = 'New scene 3';

        const result = (service as any).replaceSceneInContent(content, 2, 3, newSceneText);

        expect(result).toContain('Scene 1');
        expect(result).toContain('Scene 2');
        expect(result).toContain('New scene 3');
        expect(result).not.toContain('Scene 3');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Claude API errors during variation generation', async () => {
      const mockChapterData = {
        content: 'Some content here',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any).mockRejectedValue(
        new Error('Claude API error')
      );

      await expect(
        service.generateVariations('chapter-123', 0, 10, 'general')
      ).rejects.toThrow('Claude API error');
    });

    it('should handle database errors during variation storage', async () => {
      const mockChapterData = {
        content: 'Some content here',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      (mockClaudeService.createCompletion as any)
        .mockResolvedValueOnce('Var 1')
        .mockResolvedValueOnce('Var 2')
        .mockResolvedValueOnce('Var 3');

      const mockInsertStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database insert error');
        }),
      };
      mockDb.prepare = jest.fn().mockReturnValueOnce(mockInsertStmt);

      await expect(
        service.generateVariations('chapter-123', 0, 10, 'general')
      ).rejects.toThrow('Database insert error');
    });

    it('should calculate word count correctly when applying variation', async () => {
      const mockChapterData = {
        content: 'Short content.',
        editedContent: null,
        scene_cards: mockSceneCards,
        story_dna: mockStoryDNA,
      };

      jest.spyOn(service as any, 'getChapterData').mockReturnValue(mockChapterData);

      const mockVariationData = {
        id: 'var-123',
        selection_start: 0,
        selection_end: 14,
        original_text: 'Short content.',
        variation_1: 'This is a much longer variation with many more words in it.',
        regeneration_mode: 'general',
      };

      const mockVariationStmt = { get: jest.fn().mockReturnValue(mockVariationData) };
      const mockExistingEditStmt = { get: jest.fn().mockReturnValue(null) };
      const mockInsertEditStmt = { run: jest.fn() };
      const mockUpdateVariationStmt = { run: jest.fn() };
      const mockHistoryStmt = { run: jest.fn() };

      mockDb.prepare = jest.fn()
        .mockReturnValueOnce(mockVariationStmt)
        .mockReturnValueOnce(mockExistingEditStmt)
        .mockReturnValueOnce(mockInsertEditStmt)
        .mockReturnValueOnce(mockUpdateVariationStmt)
        .mockReturnValueOnce(mockHistoryStmt);

      const result = await service.applyVariation('chapter-456', 'var-123', 1);

      // "This is a much longer variation with many more words in it." = 12 words
      expect(result.wordCount).toBe(12);
    });
  });
});
