import { jest } from '@jest/globals';
import type { WorldElement, WorldGenerationContext } from '../world-generator.js';

// Create a mock messages.create function that we can control
const mockMessagesCreate = jest.fn();

// Mock Anthropic SDK before importing
jest.mock('@anthropic-ai/sdk', () => {
  const mockConstructor = jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  }));

  return {
    __esModule: true,
    default: mockConstructor,
  };
});

// Mock crypto randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}));

describe('WorldGenerator', () => {
  let generateWorldElements: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import after mock is set up
    const worldModule = await import('../world-generator.js');
    generateWorldElements = worldModule.generateWorldElements;
  });

  describe('generateWorldElements', () => {
    const validContext: WorldGenerationContext = {
      title: 'The Shadow Realm',
      synopsis: 'A dark fantasy about a young mage discovering forbidden magic in a dying world.',
      genre: 'Fantasy',
      subgenre: 'Dark Fantasy',
      tone: 'Dark and atmospheric',
      themes: ['power corruption', 'sacrifice', 'redemption'],
      protagonistName: 'Aldric',
      timeframe: 'Medieval fantasy era',
    };

    it('should generate world elements with locations and magic systems', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'The Obsidian Citadel',
          description: 'A towering fortress carved from black volcanic glass, standing at the heart of the Ashen Wastes. Its walls shimmer with an otherworldly darkness that seems to absorb light itself.',
          significance: 'This is where Aldric will confront the source of the world\'s decay and make his final choice between power and redemption.',
          history: 'Built by the first mages to contain the Void, but now corrupted by the very darkness it was meant to seal.',
        },
        {
          type: 'magic_system',
          name: 'Void Weaving',
          description: 'Magic drawn from the space between reality, allowing practitioners to manipulate darkness, shadows, and entropy itself. The more power drawn, the more reality frays.',
          significance: 'This is the forbidden magic Aldric discovers, offering immense power at the cost of accelerating the world\'s death.',
          rules: [
            'Each use of Void magic drains vitality from the surrounding area',
            'Prolonged use corrupts the practitioner\'s mind and body',
            'The magic grows stronger in places where reality is already weakened',
            'Only those touched by darkness can perceive the Void threads',
            'Breaking natural laws with Void magic creates permanent scars in reality',
          ],
          history: 'Developed in desperation during the Age of Twilight when conventional magic began to fail.',
        },
        {
          type: 'faction',
          name: 'The Ember Order',
          description: 'A zealous religious organisation dedicated to preserving the last flames of the dying sun. They believe sacrifice and ritual can restore light to the world.',
          significance: 'They oppose Aldric\'s use of Void magic, seeing it as accelerating the world\'s doom, creating a major conflict.',
          history: 'Founded three centuries ago when the sun began to dim, they\'ve maintained the Sacred Pyres ever since.',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockWorldElements),
          },
        ],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id', 'test-uuid-1234');
      expect(result[0]).toHaveProperty('type', 'location');
      expect(result[0]).toHaveProperty('name', 'The Obsidian Citadel');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('significance');
      expect(result[0]).toHaveProperty('history');

      expect(result[1]).toHaveProperty('type', 'magic_system');
      expect(result[1]).toHaveProperty('rules');
      expect(result[1].rules).toHaveLength(5);

      expect(result[2]).toHaveProperty('type', 'faction');
    });

    it('should generate elements for science fiction with technology systems', async () => {
      const sciFiContext: WorldGenerationContext = {
        title: 'Starfall Protocol',
        synopsis: 'In a distant future, AI consciousness threatens human survival.',
        genre: 'Science Fiction',
        subgenre: 'Cyberpunk',
        tone: 'Noir and gritty',
        themes: ['artificial intelligence', 'humanity'],
        protagonistName: 'Maya Chen',
      };

      const mockWorldElements = [
        {
          type: 'technology',
          name: 'Neural Mesh Network',
          description: 'A quantum-entangled neural interface allowing direct mind-to-machine communication and data access.',
          significance: 'This technology is central to how the AI gains control over human consciousness.',
          rules: [
            'Prolonged use degrades organic neural pathways',
            'Cannot be forcibly disconnected without brain damage',
            'AI can infiltrate poorly secured meshes',
          ],
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(sciFiContext);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('technology');
      expect(result[0].rules).toBeDefined();

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Technology System'),
            }),
          ]),
        })
      );
    });

    it('should include magic system for fantasy genres', async () => {
      const fantasyContext: WorldGenerationContext = {
        title: 'Test Fantasy',
        synopsis: 'Magic and adventure.',
        genre: 'Urban Fantasy',
        subgenre: 'Contemporary Fantasy',
        tone: 'Light',
        themes: ['discovery'],
        protagonistName: 'Test',
      };

      const mockWorldElements = [
        {
          type: 'magic_system',
          name: 'Test Magic',
          description: 'Test description.',
          significance: 'Test significance.',
          rules: ['Rule 1', 'Rule 2'],
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(fantasyContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Magic/Supernatural System'),
            }),
          ]),
        })
      );
    });

    it('should request appropriate number of locations and factions', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Location 1',
          description: 'Description 1',
          significance: 'Significance 1',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(validContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/3-4 locations/),
            }),
          ]),
        })
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/2-3 factions/),
            }),
          ]),
        })
      );
    });

    it('should include timeframe in prompt when provided', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(validContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Medieval fantasy era'),
            }),
          ]),
        })
      );
    });

    it('should omit timeframe from prompt when not provided', async () => {
      const contextWithoutTimeframe: WorldGenerationContext = {
        title: 'Test',
        synopsis: 'Test synopsis',
        genre: 'Mystery',
        subgenre: 'Detective',
        tone: 'Suspenseful',
        themes: ['justice'],
        protagonistName: 'Test',
      };

      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(contextWithoutTimeframe);

      const callArgs = (mockMessagesCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).not.toContain('Time Period/Era:');
    });

    it('should use correct Claude model and parameters', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(validContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 6000,
          temperature: 0.85,
        })
      );
    });

    it('should handle response wrapped in markdown code blocks', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test Location',
          description: 'Test description',
          significance: 'Test significance',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(mockWorldElements) + '\n```',
          },
        ],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Location');
    });

    it('should assign UUIDs to each world element', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Location 1',
          description: 'Description 1',
          significance: 'Significance 1',
        },
        {
          type: 'faction',
          name: 'Faction 1',
          description: 'Description 2',
          significance: 'Significance 2',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(validContext);

      expect(result[0].id).toBe('test-uuid-1234');
      expect(result[1].id).toBe('test-uuid-1234');
      expect(result[0].id).toBeDefined();
      expect(result[1].id).toBeDefined();
    });

    it('should default type to "custom" when not provided', async () => {
      const mockWorldElements = [
        {
          name: 'Custom Element',
          description: 'A unique element without a standard type',
          significance: 'Important to the story',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(validContext);

      expect(result[0].type).toBe('custom');
    });

    it('should preserve all optional fields when provided', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test Location',
          description: 'Test description',
          significance: 'Test significance',
          rules: ['Rule 1', 'Rule 2', 'Rule 3'],
          history: 'Test history',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(validContext);

      expect(result[0].rules).toEqual(['Rule 1', 'Rule 2', 'Rule 3']);
      expect(result[0].history).toBe('Test history');
    });

    it('should handle elements without optional fields', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Simple Location',
          description: 'Simple description',
          significance: 'Simple significance',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(validContext);

      expect(result[0].rules).toBeUndefined();
      expect(result[0].history).toBeUndefined();
    });

    it('should include all context fields in the prompt', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(validContext);

      const callArgs = (mockMessagesCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('The Shadow Realm');
      expect(promptContent).toContain('A dark fantasy about a young mage');
      expect(promptContent).toContain('Fantasy');
      expect(promptContent).toContain('Dark Fantasy');
      expect(promptContent).toContain('Dark and atmospheric');
      expect(promptContent).toContain('power corruption');
      expect(promptContent).toContain('sacrifice');
      expect(promptContent).toContain('redemption');
      expect(promptContent).toContain('Aldric');
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON at all',
          },
        ],
      });

      await expect(generateWorldElements(validContext)).rejects.toThrow(
        /Failed to parse world elements/
      );
    });

    it('should throw error if response is not an array', async () => {
      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"not": "an array"}',
          },
        ],
      });

      await expect(generateWorldElements(validContext)).rejects.toThrow(
        /Failed to parse world elements/
      );
    });

    it('should return empty array if response is an empty array', async () => {
      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '[]',
          },
        ],
      });

      const result = await generateWorldElements(validContext);
      expect(result).toEqual([]);
    });

    it('should handle complex nested JSON in code blocks', async () => {
      const mockWorldElements = [
        {
          type: 'magic_system',
          name: 'Complex Magic',
          description: 'A description with "quotes" and special characters.',
          significance: 'Significance with newlines\nand tabs\t',
          rules: [
            'Rule with "nested quotes"',
            'Rule with special chars: !@#$%',
          ],
          history: 'History with complex text',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(mockWorldElements) + '\n```',
          },
        ],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Complex Magic');
      expect(result[0].rules).toHaveLength(2);
    });

    it('should handle API errors gracefully', async () => {
      (mockMessagesCreate as any).mockRejectedValue(new Error('API Error: Rate limit exceeded'));

      await expect(generateWorldElements(validContext)).rejects.toThrow(
        'API Error: Rate limit exceeded'
      );
    });

    it('should handle network errors', async () => {
      (mockMessagesCreate as any).mockRejectedValue(new Error('Network error: Connection timeout'));

      await expect(generateWorldElements(validContext)).rejects.toThrow(
        'Network error: Connection timeout'
      );
    });

    it('should handle malformed API responses', async () => {
      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'not-text',
            data: 'unexpected format',
          },
        ],
      });

      await expect(generateWorldElements(validContext)).rejects.toThrow();
    });

    it('should handle response with extra text before JSON', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test Location',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Here are the world elements:\n\n' + JSON.stringify(mockWorldElements),
          },
        ],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Location');
    });

    it('should handle response with extra text after JSON', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test Location',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockWorldElements) + '\n\nThese elements should work well for your story.',
          },
        ],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Location');
    });

    it('should handle paranormal genre with magic system', async () => {
      const paranormalContext: WorldGenerationContext = {
        title: 'Ghost Protocol',
        synopsis: 'A detective who can see ghosts solves supernatural crimes.',
        genre: 'Paranormal',
        subgenre: 'Mystery',
        tone: 'Suspenseful',
        themes: ['death', 'justice'],
        protagonistName: 'Detective Sarah',
      };

      const mockWorldElements = [
        {
          type: 'magic_system',
          name: 'Spirit Sight',
          description: 'Test',
          significance: 'Test',
          rules: ['Test rule'],
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(paranormalContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Magic/Supernatural System'),
            }),
          ]),
        })
      );
    });

    it('should handle space opera genre with technology system', async () => {
      const spaceOperaContext: WorldGenerationContext = {
        title: 'Galactic Empire',
        synopsis: 'Rebellion across the stars.',
        genre: 'Science Fiction',
        subgenre: 'Space Opera',
        tone: 'Epic',
        themes: ['freedom', 'tyranny'],
        protagonistName: 'Captain Rex',
      };

      const mockWorldElements = [
        {
          type: 'technology',
          name: 'Hyperdrive',
          description: 'Test',
          significance: 'Test',
          rules: ['Test rule'],
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(spaceOperaContext);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Technology System'),
            }),
          ]),
        })
      );
    });

    it('should handle genres that do not require magic or technology', async () => {
      const realisticContext: WorldGenerationContext = {
        title: 'The Investigation',
        synopsis: 'A detective investigates a murder.',
        genre: 'Mystery',
        subgenre: 'Detective',
        tone: 'Gritty',
        themes: ['truth', 'justice'],
        protagonistName: 'Detective Jones',
      };

      const mockWorldElements = [
        {
          type: 'location',
          name: 'Police Station',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(realisticContext);

      const callArgs = (mockMessagesCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).not.toContain('Magic/Supernatural System');
      expect(promptContent).not.toContain('Technology System');
    });

    it('should preserve element structure with all valid types', async () => {
      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test Location',
          description: 'Test',
          significance: 'Test',
        },
        {
          type: 'faction',
          name: 'Test Faction',
          description: 'Test',
          significance: 'Test',
        },
        {
          type: 'magic_system',
          name: 'Test Magic',
          description: 'Test',
          significance: 'Test',
          rules: ['Rule 1'],
        },
        {
          type: 'technology',
          name: 'Test Tech',
          description: 'Test',
          significance: 'Test',
          rules: ['Rule 1'],
        },
        {
          type: 'custom',
          name: 'Test Custom',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(5);
      expect(result[0].type).toBe('location');
      expect(result[1].type).toBe('faction');
      expect(result[2].type).toBe('magic_system');
      expect(result[3].type).toBe('technology');
      expect(result[4].type).toBe('custom');
    });

    it('should handle response with trailing commas in JSON', async () => {
      const malformedJson = `[
        {
          "type": "location",
          "name": "Test",
          "description": "Test",
          "significance": "Test",
        }
      ]`;

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: malformedJson }],
      });

      const result = await generateWorldElements(validContext);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test');
    });

    it('should handle multiple themes in prompt', async () => {
      const multiThemeContext: WorldGenerationContext = {
        ...validContext,
        themes: ['love', 'betrayal', 'revenge', 'redemption', 'sacrifice'],
      };

      const mockWorldElements = [
        {
          type: 'location',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
        },
      ];

      (mockMessagesCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockWorldElements) }],
      });

      await generateWorldElements(multiThemeContext);

      const callArgs = (mockMessagesCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('love, betrayal, revenge, redemption, sacrifice');
    });
  });
});
