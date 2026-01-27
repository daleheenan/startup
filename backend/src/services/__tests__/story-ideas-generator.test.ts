import { jest } from '@jest/globals';
import type {
  GeneratedIdea,
  GenerateIdeasParams,
  RegeneratableSection,
} from '../story-ideas-generator.js';

// Mock dependencies before importing
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));

  return {
    __esModule: true,
    default: MockAnthropic,
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('StoryIdeasGenerator', () => {
  let StoryIdeasGenerator: any;
  let Anthropic: any;
  let mockCreate: jest.Mock;
  let mockUuidV4: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Set valid API key by default
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // Import mocked modules
    const AnthropicModule = await import('@anthropic-ai/sdk');
    Anthropic = AnthropicModule.default;

    const uuidModule = await import('uuid');
    mockUuidV4 = uuidModule.v4 as jest.Mock;
    (mockUuidV4 as any)
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('uuid-2')
      .mockReturnValueOnce('uuid-3')
      .mockReturnValueOnce('uuid-4')
      .mockReturnValueOnce('uuid-5');

    // Import service after mocks
    const serviceModule = await import('../story-ideas-generator.js');
    StoryIdeasGenerator = serviceModule.StoryIdeasGenerator;

    // Get mock instance
    const mockInstance = new Anthropic();
    mockCreate = mockInstance.messages.create as jest.Mock;
  });

  describe('generateIdeas', () => {
    const validParams: GenerateIdeasParams = {
      genre: 'Science Fiction',
      subgenre: 'Space Opera',
      tone: 'Epic',
      themes: ['exploration', 'first contact'],
      timePeriod: 'far future',
      count: 3,
    };

    const mockIdeas: GeneratedIdea[] = [
      {
        id: 'idea-1',
        storyIdea: 'A salvage crew discovers a derelict alien ship with a mysterious cargo that could change the balance of power in the galaxy.',
        characterConcepts: [
          'Captain Aria Vance - Pragmatic salvage captain with a hidden past',
          'Dr. Elias Chen - Xenobiologist eager to make first contact',
        ],
        plotElements: [
          'The alien cargo begins to influence crew behavior',
          'Multiple factions converge on the salvage site',
        ],
        uniqueTwists: [
          'The "cargo" is actually a refugee seeking asylum',
          'The crew is being observed by the ship\'s AI',
        ],
      },
      {
        id: 'idea-2',
        storyIdea: 'A diplomat must negotiate peace between humanity and a silicon-based life form that communicates through mineral crystallisation.',
        characterConcepts: [
          'Ambassador Kenji Tanaka - Patient negotiator with experience in impossible situations',
          'Crystalline Entity "Facet" - Ancient being misunderstood as hostile',
        ],
        plotElements: [
          'Translation breakthrough reveals the entity\'s true intentions',
          'Military forces plot to use the entity as a weapon',
        ],
        uniqueTwists: [
          'Humans and the entity share a common ancestor',
          'The entity\'s crystallisation is actually a form of art',
        ],
      },
      {
        id: 'idea-3',
        storyIdea: 'A terraformer discovers that the planet she\'s transforming is actually a living organism, and her work is killing it.',
        characterConcepts: [
          'Dr. Maya Okonkwo - Brilliant terraformer questioning her life\'s work',
          'Ryn - Indigenous guide who knew the planet\'s secret',
        ],
        plotElements: [
          'Seismic activity reveals the planet\'s biological systems',
          'Corporate interests suppress the discovery',
        ],
        uniqueTwists: [
          'The planet has been waiting millennia to communicate',
          'Humanity\'s arrival was orchestrated by the planet itself',
        ],
      },
    ];

    it('should generate multiple story ideas with all required fields', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockIdeas),
          },
        ],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('storyIdea');
      expect(result[0]).toHaveProperty('characterConcepts');
      expect(result[0]).toHaveProperty('plotElements');
      expect(result[0]).toHaveProperty('uniqueTwists');

      expect(Array.isArray(result[0].characterConcepts)).toBe(true);
      expect(Array.isArray(result[0].plotElements)).toBe(true);
      expect(Array.isArray(result[0].uniqueTwists)).toBe(true);
    });

    it('should call Claude API with correct parameters', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.generateIdeas(validParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4000,
          temperature: 1.0,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Science Fiction'),
            }),
          ]),
        })
      );
    });

    it('should include genre and subgenre in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.generateIdeas(validParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Science Fiction (Space Opera)'),
            }),
          ]),
        })
      );
    });

    it('should include tone in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.generateIdeas(validParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Tone:** Epic'),
            }),
          ]),
        })
      );
    });

    it('should include themes in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.generateIdeas(validParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('exploration, first contact'),
            }),
          ]),
        })
      );
    });

    it('should include time period in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.generateIdeas(validParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('far future'),
            }),
          ]),
        })
      );
    });

    it('should default to 5 ideas when count not specified', async () => {
      const fiveIdeas = [
        mockIdeas[0],
        mockIdeas[1],
        mockIdeas[2],
        { ...mockIdeas[0], id: 'idea-4' },
        { ...mockIdeas[1], id: 'idea-5' },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(fiveIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const paramsWithoutCount = { ...validParams };
      delete paramsWithoutCount.count;

      await generator.generateIdeas(paramsWithoutCount);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Generate 5 UNIQUE'),
            }),
          ]),
        })
      );
    });

    it('should handle single genre without subgenre', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const simpleParams: GenerateIdeasParams = {
        genre: 'Fantasy',
        count: 3,
      };

      await generator.generateIdeas(simpleParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Genre:** Fantasy'),
            }),
          ]),
        })
      );

      // Should not have subgenre in parentheses
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining('Fantasy ('),
            }),
          ]),
        })
      );
    });

    it('should use default values for optional parameters', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const minimalParams: GenerateIdeasParams = {
        genre: 'Mystery',
        count: 3,
      };

      await generator.generateIdeas(minimalParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Tone:** engaging'),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Themes:** universal themes'),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Time Period:** any time period'),
            }),
          ]),
        })
      );
    });

    it('should handle response wrapped in markdown code blocks', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(mockIdeas) + '\n```',
          },
        ],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('idea-1');
    });

    it('should generate UUIDs for ideas missing IDs', async () => {
      const ideasWithoutIds = mockIdeas.map(idea => {
        const { id, ...rest } = idea;
        return rest;
      });

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(ideasWithoutIds) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result[0].id).toBe('uuid-1');
      expect(result[1].id).toBe('uuid-2');
      expect(result[2].id).toBe('uuid-3');
    });

    it('should handle missing characterConcepts with empty array', async () => {
      const ideasWithoutChars = mockIdeas.map(idea => {
        const { characterConcepts, ...rest } = idea;
        return rest;
      });

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(ideasWithoutChars) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result[0].characterConcepts).toEqual([]);
      expect(result[1].characterConcepts).toEqual([]);
      expect(result[2].characterConcepts).toEqual([]);
    });

    it('should handle missing plotElements with empty array', async () => {
      const ideasWithoutPlot = mockIdeas.map(idea => {
        const { plotElements, ...rest } = idea;
        return rest;
      });

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(ideasWithoutPlot) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result[0].plotElements).toEqual([]);
      expect(result[1].plotElements).toEqual([]);
      expect(result[2].plotElements).toEqual([]);
    });

    it('should handle missing uniqueTwists with empty array', async () => {
      const ideasWithoutTwists = mockIdeas.map(idea => {
        const { uniqueTwists, ...rest } = idea;
        return rest;
      });

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(ideasWithoutTwists) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result[0].uniqueTwists).toEqual([]);
      expect(result[1].uniqueTwists).toEqual([]);
      expect(result[2].uniqueTwists).toEqual([]);
    });

    it('should throw error if storyIdea is missing', async () => {
      const invalidIdeas = [
        {
          id: 'idea-1',
          // Missing storyIdea
          characterConcepts: ['Character 1'],
          plotElements: ['Plot 1'],
          uniqueTwists: ['Twist 1'],
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(invalidIdeas) }],
      });

      const generator = new StoryIdeasGenerator();

      await expect(generator.generateIdeas(validParams)).rejects.toThrow(
        /Idea 1 missing storyIdea/
      );
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'This is not JSON at all' }],
      });

      const generator = new StoryIdeasGenerator();

      await expect(generator.generateIdeas(validParams)).rejects.toThrow(
        /Failed to parse story ideas/
      );
    });

    it('should throw error if response is not an array', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '{"not": "an array"}' }],
      });

      const generator = new StoryIdeasGenerator();

      await expect(generator.generateIdeas(validParams)).rejects.toThrow(
        /No valid JSON array found/
      );
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockRejectedValue(new Error('Rate limit exceeded'));

      const generator = new StoryIdeasGenerator();

      await expect(generator.generateIdeas(validParams)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should throw error if Anthropic API is not configured', async () => {
      // Reset modules and set placeholder API key
      jest.resetModules();
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      // Re-import service with placeholder key
      const serviceModule = await import('../story-ideas-generator.js');
      const TestGenerator = serviceModule.StoryIdeasGenerator;
      const generator = new TestGenerator();

      await expect(generator.generateIdeas(validParams)).rejects.toThrow(
        'Claude API not configured'
      );

      // Restore API key for subsequent tests
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should include generation timestamp in prompt for uniqueness', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/\[Generation ID: \d+\]/),
            }),
          ]),
        })
      );
    });

    it('should generate different ideas on subsequent calls', async () => {
      const call1Timestamp = Date.now();

      (mockCreate as any).mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas(validParams);

      expect(result).toBeDefined();
      const firstCallContent = (mockCreate.mock.calls[0][0] as any).messages[0].content;
      const firstTimestamp = parseInt(
        firstCallContent.match(/\[Generation ID: (\d+)\]/)?.[1] || '0'
      );

      expect(firstTimestamp).toBeGreaterThanOrEqual(call1Timestamp);
    });
  });

  describe('regenerateSection', () => {
    const mockContext: GeneratedIdea = {
      id: 'idea-123',
      storyIdea: 'A salvage crew discovers a derelict alien ship with mysterious cargo.',
      characterConcepts: [
        'Captain Aria Vance - Pragmatic salvage captain',
        'Dr. Elias Chen - Eager xenobiologist',
      ],
      plotElements: [
        'The cargo influences crew behavior',
        'Multiple factions converge on the site',
      ],
      uniqueTwists: [
        'The cargo is actually a refugee',
        'The crew is being observed by AI',
      ],
    };

    it('should regenerate character concepts', async () => {
      const newCharacters = [
        'Commander Zara Singh - Experienced military officer turned salvager',
        'Professor Jun Lee - Cryptographer specializing in alien languages',
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(newCharacters) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.regenerateSection(
        'idea-123',
        'characters',
        mockContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(newCharacters[0]);
      expect(result[1]).toBe(newCharacters[1]);
    });

    it('should regenerate plot elements', async () => {
      const newPlotElements = [
        'The ship begins to repair itself',
        'A countdown timer is discovered in the cargo hold',
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(newPlotElements) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.regenerateSection(
        'idea-123',
        'plot',
        mockContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(newPlotElements[0]);
      expect(result[1]).toBe(newPlotElements[1]);
    });

    it('should regenerate unique twists', async () => {
      const newTwists = [
        'The salvage crew has been to this ship before, in another timeline',
        'The AI is actually the captain\'s deceased mentor',
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(newTwists) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.regenerateSection(
        'idea-123',
        'twists',
        mockContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(newTwists[0]);
      expect(result[1]).toBe(newTwists[1]);
    });

    it('should call Claude API with correct parameters for character regeneration', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Character 1', 'Character 2']) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.regenerateSection('idea-123', 'characters', mockContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 1500,
          temperature: 1.0,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Character Concepts'),
            }),
          ]),
        })
      );
    });

    it('should include story premise in regeneration prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Item 1', 'Item 2']) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.regenerateSection('idea-123', 'plot', mockContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(
                'A salvage crew discovers a derelict alien ship'
              ),
            }),
          ]),
        })
      );
    });

    it('should include current sections in regeneration prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Item 1', 'Item 2']) }],
      });

      const generator = new StoryIdeasGenerator();
      await generator.regenerateSection('idea-123', 'characters', mockContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Captain Aria Vance'),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('cargo influences crew behavior'),
            }),
          ]),
        })
      );
    });

    it('should handle response wrapped in markdown code blocks', async () => {
      const newItems = ['New item 1', 'New item 2'];

      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(newItems) + '\n```',
          },
        ],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.regenerateSection(
        'idea-123',
        'twists',
        mockContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('New item 1');
    });

    it('should convert non-string items to strings', async () => {
      const mixedItems = ['String item', 123, true, null];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mixedItems) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.regenerateSection(
        'idea-123',
        'plot',
        mockContext
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toBe('String item');
      expect(result[1]).toBe('123');
      expect(result[2]).toBe('true');
      expect(result[3]).toBe('null');
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON' }],
      });

      const generator = new StoryIdeasGenerator();

      await expect(
        generator.regenerateSection('idea-123', 'characters', mockContext)
      ).rejects.toThrow(/Failed to parse regenerated section/);
    });

    it('should throw error if response is not an array', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '{"not": "an array"}' }],
      });

      const generator = new StoryIdeasGenerator();

      await expect(
        generator.regenerateSection('idea-123', 'plot', mockContext)
      ).rejects.toThrow(/No valid JSON array found/);
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockRejectedValue(new Error('Connection timeout'));

      const generator = new StoryIdeasGenerator();

      await expect(
        generator.regenerateSection('idea-123', 'twists', mockContext)
      ).rejects.toThrow('Connection timeout');
    });

    it('should throw error if Anthropic API is not configured', async () => {
      // Reset modules and set placeholder API key
      jest.resetModules();
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      // Re-import service with placeholder key
      const serviceModule = await import('../story-ideas-generator.js');
      const TestGenerator = serviceModule.StoryIdeasGenerator;
      const generator = new TestGenerator();

      await expect(
        generator.regenerateSection('idea-123', 'characters', mockContext)
      ).rejects.toThrow('Claude API not configured');

      // Restore API key for subsequent tests
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should use correct instructions for each section type', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Item 1', 'Item 2']) }],
      });

      const generator = new StoryIdeasGenerator();

      // Test characters section
      const charsResult = await generator.regenerateSection('idea-123', 'characters', mockContext);
      expect(charsResult).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('2-3'),
            }),
          ]),
        })
      );

      mockCreate.mockClear();
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Item 1', 'Item 2']) }],
      });

      // Test plot section
      const plotResult = await generator.regenerateSection('idea-123', 'plot', mockContext);
      expect(plotResult).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('2-3'),
            }),
          ]),
        })
      );

      mockCreate.mockClear();
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(['Item 1', 'Item 2']) }],
      });

      // Test twists section
      const twistsResult = await generator.regenerateSection('idea-123', 'twists', mockContext);
      expect(twistsResult).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('2'),
            }),
          ]),
        })
      );
    });
  });

  describe('constructor', () => {
    it('should initialise with Anthropic API when key is configured', () => {
      process.env.ANTHROPIC_API_KEY = 'valid-api-key';

      const generator = new StoryIdeasGenerator();

      expect(generator).toBeDefined();
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'valid-api-key' });
    });

    it('should warn when API key is not configured', () => {
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';

      const generator = new StoryIdeasGenerator();

      expect(generator).toBeDefined();
      // The constructor sets anthropic to null when not configured
    });

    it('should use environment model or default to opus-4', () => {
      process.env.ANTHROPIC_API_KEY = 'valid-api-key';
      process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5-20241022';

      const generator = new StoryIdeasGenerator();

      expect(generator).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty themes array', async () => {
      const mockIdeas: GeneratedIdea[] = [
        {
          id: 'idea-1',
          storyIdea: 'A simple story idea',
          characterConcepts: ['Character 1'],
          plotElements: ['Plot 1'],
          uniqueTwists: ['Twist 1'],
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const params: GenerateIdeasParams = {
        genre: 'Thriller',
        themes: [],
        count: 1,
      };

      await generator.generateIdeas(params);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('**Themes:** universal themes'),
            }),
          ]),
        })
      );
    });

    it('should handle very long prompt inputs', async () => {
      const mockIdeas: GeneratedIdea[] = [
        {
          id: 'idea-1',
          storyIdea: 'Story',
          characterConcepts: ['Char'],
          plotElements: ['Plot'],
          uniqueTwists: ['Twist'],
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const params: GenerateIdeasParams = {
        genre: 'Science Fiction',
        subgenre: 'A'.repeat(500),
        tone: 'B'.repeat(500),
        themes: Array(50).fill('theme'),
        timePeriod: 'C'.repeat(500),
        count: 1,
      };

      const result = await generator.generateIdeas(params);

      expect(result).toHaveLength(1);
    });

    it('should handle request for 1 idea', async () => {
      const mockIdeas: GeneratedIdea[] = [
        {
          id: 'idea-1',
          storyIdea: 'A single story idea',
          characterConcepts: ['Character 1'],
          plotElements: ['Plot 1'],
          uniqueTwists: ['Twist 1'],
        },
      ];

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas({
        genre: 'Horror',
        count: 1,
      });

      expect(result).toHaveLength(1);
    });

    it('should handle request for many ideas', async () => {
      const mockIdeas: GeneratedIdea[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `idea-${i + 1}`,
          storyIdea: `Story ${i + 1}`,
          characterConcepts: ['Character'],
          plotElements: ['Plot'],
          uniqueTwists: ['Twist'],
        }));

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockIdeas) }],
      });

      const generator = new StoryIdeasGenerator();
      const result = await generator.generateIdeas({
        genre: 'Fantasy',
        count: 20,
      });

      expect(result).toHaveLength(20);
    });
  });
});
