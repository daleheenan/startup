import { jest } from '@jest/globals';
import type { OutlineContext } from '../outline-generator.js';

// Mock dependencies before importing
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

jest.mock('../structure-templates.js', () => ({
  getStructureTemplate: jest.fn(),
}));

describe('OutlineGenerator', () => {
  let generateOutline: any;
  let Anthropic: any;
  let getStructureTemplate: any;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked modules
    const AnthropicModule = await import('@anthropic-ai/sdk');
    Anthropic = AnthropicModule.default;

    const templateModule = await import('../structure-templates.js');
    getStructureTemplate = templateModule.getStructureTemplate;

    const outlineModule = await import('../outline-generator.js');
    generateOutline = outlineModule.generateOutline;

    // Get the mock instance
    const mockInstance = new Anthropic();
    mockCreate = mockInstance.messages.create as jest.Mock;
  });

  const mockContext: OutlineContext = {
    concept: {
      title: 'The Shadow King',
      logline: 'A fallen prince must reclaim his throne.',
      synopsis: 'A prince battles corruption and darkness to save his kingdom.',
    },
    storyDNA: {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark',
      themes: ['redemption', 'power'],
    } as any,
    characters: [
      {
        id: 'char-1',
        name: 'Aldric',
        role: 'protagonist',
        voiceSample: 'I will not become the monster I fight.',
      } as any,
      {
        id: 'char-2',
        name: 'Malachar',
        role: 'antagonist',
        voiceSample: 'Power is the only truth.',
      } as any,
    ],
    world: {
      locations: [
        {
          name: 'The Fallen Capital',
          description: 'Once glorious, now in ruins.',
        } as any,
        {
          name: 'The Dark Tower',
          description: 'Seat of corrupt power.',
        } as any,
      ],
    } as any,
    structureType: 'three_act',
    targetWordCount: 90000,
  };

  const mockTemplate = {
    name: 'Three-Act Structure',
    acts: [
      {
        name: 'Setup',
        percentage: 25,
        description: 'Introduce world and character',
      },
      {
        name: 'Confrontation',
        percentage: 50,
        description: 'Rising conflict',
      },
      {
        name: 'Resolution',
        percentage: 25,
        description: 'Climax and ending',
      },
    ],
  };

  describe('generateOutline', () => {
    it('should generate complete story outline with acts and chapters', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      // Mock act breakdown response
      const mockActBreakdown = [
        {
          number: 1,
          name: 'Setup',
          description: 'Aldric loses his kingdom',
          beats: [
            {
              name: 'Opening Image',
              description: 'Aldric in exile',
              percentagePoint: 0,
            },
          ],
          targetWordCount: 22500,
          chapterCount: 10,
        },
        {
          number: 2,
          name: 'Confrontation',
          description: 'Aldric gathers allies and fights back',
          beats: [
            {
              name: 'Midpoint',
              description: 'Major setback',
              percentagePoint: 50,
            },
          ],
          targetWordCount: 45000,
          chapterCount: 21,
        },
        {
          number: 3,
          name: 'Resolution',
          description: 'Final battle and reclamation',
          beats: [
            {
              name: 'Climax',
              description: 'Confrontation with brother',
              percentagePoint: 90,
            },
          ],
          targetWordCount: 22500,
          chapterCount: 10,
        },
      ];

      // Mock chapter outlines
      const mockChapters = [
        {
          title: 'Exile',
          summary: 'Aldric flees the capital after his brother\'s coup.',
          povCharacter: 'Aldric',
          wordCountTarget: 2200,
          beatName: 'Opening Image',
        },
        {
          title: 'The Road North',
          summary: 'Aldric travels through hostile territory.',
          povCharacter: 'Aldric',
          wordCountTarget: 2300,
          beatName: 'Setup',
        },
      ];

      // Mock scene cards
      const mockScenes = [
        {
          location: 'The Fallen Capital',
          characters: ['Aldric', 'Royal Guard'],
          povCharacter: 'Aldric',
          timeOfDay: 'night',
          goal: 'Escape the city alive',
          conflict: 'Guards hunt him',
          outcome: 'yes-but',
          emotionalBeat: 'Desperate but determined',
          notes: 'First major action scene',
        },
      ];

      // Setup mock responses
      (mockCreate as any)
        .mockResolvedValueOnce({
          // Act breakdown
          content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
        })
        .mockResolvedValueOnce({
          // Chapters for Act 1
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        })
        .mockResolvedValueOnce({
          // Chapters for Act 2
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        })
        .mockResolvedValueOnce({
          // Chapters for Act 3
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        });

      // Mock scene card responses for all chapters (need many)
      for (let i = 0; i < 100; i++) {
        (mockCreate as any).mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockScenes) }],
        });
      }

      const result = await generateOutline(mockContext);

      expect(result.type).toBe('three-act');
      expect(result.acts).toHaveLength(3);
      expect(result.acts[0].number).toBe(1);
      expect(result.acts[0].chapters).toBeDefined();
      expect(result.acts[0].chapters.length).toBeGreaterThan(0);

      // Verify each chapter has scenes
      expect(result.acts[0].chapters[0].scenes).toBeDefined();
      expect(result.acts[0].chapters[0].scenes.length).toBeGreaterThan(0);

      // Verify API was called for acts, chapters, and scenes
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should calculate target chapter count based on word count', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const mockActBreakdown = [
        {
          number: 1,
          name: 'Act 1',
          description: 'Setup',
          beats: [],
          targetWordCount: 30000,
          chapterCount: 14,
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
      });

      // Mock chapter and scene responses
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const contextWithDifferentLength: OutlineContext = {
        ...mockContext,
        targetWordCount: 66000, // Should target ~30 chapters (66000 / 2200)
      };

      await generateOutline(contextWithDifferentLength);

      // Verify the prompt includes target chapter count
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('30');
    });

    it('should throw error for unknown structure type', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(null);

      const contextWithInvalidStructure: OutlineContext = {
        ...mockContext,
        structureType: 'invalid-structure' as any,
      };

      await expect(generateOutline(contextWithInvalidStructure)).rejects.toThrow(
        'Unknown structure type: invalid-structure'
      );
    });

    it('should handle act breakdown with specific story beats', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const mockActBreakdown = [
        {
          number: 1,
          name: 'Setup',
          description: 'Specific description for this story',
          beats: [
            {
              name: 'Inciting Incident',
              description: 'Brother betrays Aldric',
              percentagePoint: 12,
            },
          ],
          targetWordCount: 22500,
          chapterCount: 10,
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
      });

      // Mock empty chapters/scenes to simplify test
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const result = await generateOutline(mockContext);

      expect(result.acts[0].beats[0].name).toBe('Inciting Incident');
      expect(result.acts[0].beats[0].description).toContain('Brother betrays');
    });

    it('should include protagonist and antagonist in act breakdown prompt', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      await generateOutline(mockContext);

      const actBreakdownCall = mockCreate.mock.calls[0][0];
      expect(actBreakdownCall.messages[0].content).toContain('Aldric');
      expect(actBreakdownCall.messages[0].content).toContain('protagonist');
    });

    it('should handle stories without direct antagonist', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const contextWithoutAntagonist: OutlineContext = {
        ...mockContext,
        characters: [mockContext.characters[0]], // Only protagonist
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      await generateOutline(contextWithoutAntagonist);

      const actBreakdownCall = mockCreate.mock.calls[0][0];
      expect(actBreakdownCall.messages[0].content).toContain(
        'No direct antagonist'
      );
    });

    it('should generate chapters with POV character and beat mapping', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const mockActBreakdown = [
        {
          number: 1,
          name: 'Setup',
          description: 'Opening act',
          beats: [{ name: 'Opening Image', description: 'Start', percentagePoint: 0 }],
          targetWordCount: 20000,
          chapterCount: 5,
        },
      ];

      const mockChapters = [
        {
          title: 'Dawn of Darkness',
          summary: 'The betrayal unfolds at dawn.',
          povCharacter: 'Aldric',
          wordCountTarget: 2200,
          beatName: 'Opening Image',
        },
      ];

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        });

      // Mock scenes
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const result = await generateOutline(mockContext);

      expect(result.acts[0].chapters[0].povCharacter).toBe('Aldric');
      expect(result.acts[0].chapters[0].beatName).toBe('Opening Image');
      expect(result.acts[0].chapters[0].wordCountTarget).toBe(2200);
    });

    it('should generate scene cards with specific locations and goals', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const mockActBreakdown = [
        {
          number: 1,
          name: 'Setup',
          description: 'Opening',
          beats: [],
          targetWordCount: 20000,
          chapterCount: 1,
        },
      ];

      const mockChapters = [
        {
          title: 'Chapter 1',
          summary: 'First chapter',
          povCharacter: 'Aldric',
          wordCountTarget: 2200,
        },
      ];

      const mockScenes = [
        {
          location: 'The Fallen Capital',
          characters: ['Aldric', 'Malachar'],
          povCharacter: 'Aldric',
          timeOfDay: 'night',
          goal: 'Escape the capital',
          conflict: 'Brother\'s forces pursue',
          outcome: 'yes-but',
          emotionalBeat: 'Fear and determination',
          notes: 'High tension chase scene',
        },
      ];

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockScenes) }],
        });

      const result = await generateOutline(mockContext);

      const scene = result.acts[0].chapters[0].scenes[0];
      expect(scene.location).toBe('The Fallen Capital');
      expect(scene.goal).toBe('Escape the capital');
      expect(scene.conflict).toContain('Brother\'s forces');
      expect(scene.outcome).toBe('yes-but');
      expect(scene.emotionalBeat).toContain('Fear');
    });

    it('should include world locations in scene card prompt', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      const mockActBreakdown = [
        {
          number: 1,
          name: 'Setup',
          description: 'Opening',
          beats: [],
          targetWordCount: 20000,
          chapterCount: 1,
        },
      ];

      const mockChapters = [
        {
          title: 'Chapter 1',
          summary: 'Test',
          povCharacter: 'Aldric',
          wordCountTarget: 2200,
        },
      ];

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockActBreakdown) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockChapters) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '[]' }],
        });

      await generateOutline(mockContext);

      // Find the scene card generation call
      const sceneCardCall = mockCreate.mock.calls.find((call) =>
        call[0].messages[0].content.includes('Generate')
      );

      expect(sceneCardCall).toBeDefined();
      expect(sceneCardCall[0].messages[0].content).toContain('The Fallen Capital');
      expect(sceneCardCall[0].messages[0].content).toContain('The Dark Tower');
    });

    it('should handle parsing errors gracefully', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON response' }],
      });

      await expect(generateOutline(mockContext)).rejects.toThrow(/Failed to parse/);
    });

    it('should handle API errors during outline generation', async () => {
      (getStructureTemplate as jest.Mock).mockReturnValue(mockTemplate);

      (mockCreate as any).mockRejectedValue(new Error('API connection failed'));

      await expect(generateOutline(mockContext)).rejects.toThrow(
        'API connection failed'
      );
    });
  });
});
