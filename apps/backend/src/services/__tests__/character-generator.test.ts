import { jest } from '@jest/globals';
import type {
  Character,
  CharacterRole,
  CharacterGenerationContext,
  NationalityDistribution,
} from '../character-generator.js';

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

jest.mock('../name-generator.js', () => ({
  generateNameByNationality: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('CharacterGenerator', () => {
  let generateProtagonist: any;
  let generateSupportingCast: any;
  let regenerateDependentFields: any;
  let assignNationalities: any;
  let Anthropic: any;
  let mockCreate: jest.Mock;
  let mockGenerateNameByNationality: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Import after mocks are set up and modules are reset
    const AnthropicModule = await import('@anthropic-ai/sdk');
    Anthropic = AnthropicModule.default;

    const nameGeneratorModule = await import('../name-generator.js');
    mockGenerateNameByNationality = nameGeneratorModule.generateNameByNationality as jest.Mock;
    (mockGenerateNameByNationality as any).mockResolvedValue('Generated Name');

    const cryptoModule = await import('crypto');
    const mockRandomUUID = cryptoModule.randomUUID as jest.Mock;
    (mockRandomUUID as any).mockReturnValue('mock-uuid-1234');

    const characterModule = await import('../character-generator.js');
    generateProtagonist = characterModule.generateProtagonist;
    generateSupportingCast = characterModule.generateSupportingCast;
    regenerateDependentFields = characterModule.regenerateDependentFields;
    assignNationalities = characterModule.assignNationalities;

    // Get the mock instance
    const mockInstance = new Anthropic();
    mockCreate = mockInstance.messages.create as jest.Mock;
  });

  describe('generateProtagonist', () => {
    const validContext: CharacterGenerationContext = {
      title: 'The Shadow Realm',
      synopsis: 'A dark fantasy about a warrior seeking redemption.',
      genre: 'Fantasy',
      tone: 'Dark and gritty',
      themes: ['redemption', 'sacrifice'],
    };

    const mockProtagonistData = {
      name: 'Aldric Blackwood',
      ethnicity: 'British',
      nationality: 'British',
      physicalDescription: 'Tall and battle-scarred with dark hair and grey eyes.',
      personality: ['stoic', 'determined', 'haunted', 'loyal', 'tactical'],
      voiceSample: 'Every scar tells a story. Mine speak of failure, of lost comrades, of the price of ambition. I thought power would make me strong enough to protect those I loved. Instead, it made me weak. Now I stand at the precipice, wondering if redemption is even possible for someone like me.',
      goals: ['Redeem himself for past failures', 'Protect the innocent', 'Defeat the Shadow King'],
      conflicts: {
        internal: ['Guilt over past failures', 'Fear of repeating mistakes'],
        external: ['The Shadow King\'s army', 'Political intrigue'],
      },
      backstory: 'Once a noble commander, Aldric led his army to ruin through hubris. Now exiled, he seeks to make amends.',
      currentState: 'Living in exile, haunted by his past.',
      characterArc: 'Aldric will transform from a guilt-ridden exile to a selfless hero willing to sacrifice everything.',
    };

    it('should generate a protagonist with all required fields', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockProtagonistData),
          },
        ],
      });

      const result = await generateProtagonist(validContext);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Aldric Blackwood');
      expect(result).toHaveProperty('role', 'protagonist');
      expect(result).toHaveProperty('ethnicity', 'British');
      expect(result).toHaveProperty('nationality', 'British');
      expect(result).toHaveProperty('physicalDescription');
      expect(result).toHaveProperty('personality');
      expect(result).toHaveProperty('voiceSample');
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('backstory');
      expect(result).toHaveProperty('currentState');
      expect(result).toHaveProperty('characterArc');
      expect(result).toHaveProperty('relationships');

      expect(Array.isArray(result.personality)).toBe(true);
      expect(Array.isArray(result.goals)).toBe(true);
      expect(result.conflicts).toHaveProperty('internal');
      expect(result.conflicts).toHaveProperty('external');
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('should call Claude API with correct parameters', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockProtagonistData) }],
      });

      await generateProtagonist(validContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 3000,
          temperature: 0.9,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('The Shadow Realm'),
            }),
          ]),
        })
      );
    });

    it('should include story context in the prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockProtagonistData) }],
      });

      await generateProtagonist(validContext);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/The Shadow Realm/),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/Fantasy/),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/redemption/),
            }),
          ]),
        })
      );
    });

    it('should handle assigned nationality and generate appropriate name', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...mockProtagonistData, nationality: 'Japanese' }),
          },
        ],
      });

      (mockGenerateNameByNationality as any).mockResolvedValue('Takeshi Yamamoto');

      const result = await generateProtagonist(validContext, 'Japanese');

      expect(result.nationality).toBe('Japanese');
      expect(result.name).toBe('Takeshi Yamamoto');
      expect(mockGenerateNameByNationality).toHaveBeenCalledWith(
        'Japanese',
        expect.any(String),
        expect.objectContaining({
          ethnicity: mockProtagonistData.ethnicity,
          role: 'protagonist',
          genre: 'Fantasy',
        })
      );
    });

    it('should include assigned nationality in prompt when provided', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...mockProtagonistData, nationality: 'French' }),
          },
        ],
      });

      await generateProtagonist(validContext, 'French');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('MUST be from French'),
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
            text: '```json\n' + JSON.stringify(mockProtagonistData) + '\n```',
          },
        ],
      });

      const result = await generateProtagonist(validContext);

      expect(result.name).toBe('Aldric Blackwood');
    });

    it('should throw error if response is missing required fields', async () => {
      const invalidData = {
        name: 'Test Character',
        // Missing voiceSample and goals
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(invalidData) }],
      });

      await expect(generateProtagonist(validContext)).rejects.toThrow(
        /Character missing required fields/
      );
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'This is not JSON' }],
      });

      await expect(generateProtagonist(validContext)).rejects.toThrow(
        /Failed to parse character/
      );
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(generateProtagonist(validContext)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should assign UUID to generated character', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockProtagonistData) }],
      });

      const result = await generateProtagonist(validContext);

      expect(result.id).toBe('mock-uuid-1234');
    });

    it('should set role to protagonist', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockProtagonistData) }],
      });

      const result = await generateProtagonist(validContext);

      expect(result.role).toBe('protagonist');
    });

    it('should handle empty conflicts gracefully', async () => {
      const dataWithoutConflicts = {
        ...mockProtagonistData,
        conflicts: undefined,
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(dataWithoutConflicts) }],
      });

      const result = await generateProtagonist(validContext);

      expect(result.conflicts).toEqual({ internal: [], external: [] });
    });

    it('should handle empty personality array gracefully', async () => {
      const dataWithoutPersonality = {
        ...mockProtagonistData,
        personality: undefined,
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(dataWithoutPersonality) }],
      });

      const result = await generateProtagonist(validContext);

      expect(result.personality).toEqual([]);
    });
  });

  describe('generateSupportingCast', () => {
    const validContext: CharacterGenerationContext = {
      title: 'The Shadow Realm',
      synopsis: 'A dark fantasy about a warrior seeking redemption.',
      genre: 'Fantasy',
      tone: 'Dark and gritty',
      themes: ['redemption', 'sacrifice'],
    };

    const mockProtagonist: Character = {
      id: 'protagonist-id',
      name: 'Aldric Blackwood',
      role: 'protagonist',
      ethnicity: 'British',
      nationality: 'British',
      physicalDescription: 'Tall and battle-scarred.',
      personality: ['stoic', 'determined'],
      voiceSample: 'Sample text',
      goals: ['Redemption'],
      conflicts: { internal: [], external: [] },
      backstory: 'Backstory text',
      currentState: 'Current state',
      characterArc: 'Character arc',
      relationships: [],
    };

    const mockSupportingCastData = [
      {
        name: 'Lord Malakai',
        role: 'antagonist',
        ethnicity: 'British',
        nationality: 'British',
        physicalDescription: 'Imposing figure with cold eyes.',
        personality: ['ruthless', 'calculating', 'charismatic'],
        voiceSample: 'Power is the only truth. Everything else is illusion.',
        goals: ['Conquer the realm', 'Eliminate opposition'],
        conflicts: {
          internal: ['Fear of losing power'],
          external: ['Rebellions', 'Aldric'],
        },
        backstory: 'Rose to power through dark magic.',
        currentState: 'At the height of power.',
        characterArc: 'Will face consequences of his choices.',
        relationshipToProtagonist: 'Former ally turned enemy',
      },
      {
        name: 'Elara Moonwhisper',
        role: 'mentor',
        ethnicity: 'Elven',
        nationality: 'Fictional',
        physicalDescription: 'Ageless elf with silver hair.',
        personality: ['wise', 'patient', 'mysterious'],
        voiceSample: 'The path to redemption is not found, it is forged.',
        goals: ['Guide Aldric', 'Preserve balance'],
        conflicts: {
          internal: ['Doubt about her guidance'],
          external: ['Ancient enemies'],
        },
        backstory: 'Ancient guardian of the realm.',
        currentState: 'Living in hiding.',
        characterArc: 'Will make the ultimate sacrifice.',
        relationshipToProtagonist: 'Mentor and guide',
      },
    ];

    it('should generate supporting cast characters', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      const result = await generateSupportingCast(validContext, mockProtagonist);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name', 'Lord Malakai');
      expect(result[0]).toHaveProperty('role', 'antagonist');
      expect(result[1]).toHaveProperty('name', 'Elara Moonwhisper');
      expect(result[1]).toHaveProperty('role', 'mentor');
    });

    it('should include protagonist details in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      await generateSupportingCast(validContext, mockProtagonist);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Aldric Blackwood'),
            }),
          ]),
        })
      );
    });

    it('should convert relationshipToProtagonist to relationships array', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      const result = await generateSupportingCast(validContext, mockProtagonist);

      expect(result[0].relationships).toEqual([
        {
          characterId: '',
          characterName: 'Protagonist',
          relationship: 'Former ally turned enemy',
        },
      ]);

      expect(result[1].relationships).toEqual([
        {
          characterId: '',
          characterName: 'Protagonist',
          relationship: 'Mentor and guide',
        },
      ]);
    });

    it('should handle assigned nationalities and generate appropriate names', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { ...mockSupportingCastData[0], nationality: 'Japanese' },
              { ...mockSupportingCastData[1], nationality: 'Chinese' },
            ]),
          },
        ],
      });

      (mockGenerateNameByNationality as any)
        .mockResolvedValueOnce('Takeshi Yamamoto')
        .mockResolvedValueOnce('Wei Zhang');

      const result = await generateSupportingCast(
        validContext,
        mockProtagonist,
        ['Japanese', 'Chinese']
      );

      expect(result[0].name).toBe('Takeshi Yamamoto');
      expect(result[1].name).toBe('Wei Zhang');
      expect(mockGenerateNameByNationality).toHaveBeenCalledTimes(2);
    });

    it('should include assigned nationalities in prompt', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      await generateSupportingCast(
        validContext,
        mockProtagonist,
        ['French', 'German']
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/Character 1: French/),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/Character 2: German/),
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
            text: '```json\n' + JSON.stringify(mockSupportingCastData) + '\n```',
          },
        ],
      });

      const result = await generateSupportingCast(validContext, mockProtagonist);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Lord Malakai');
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON response' }],
      });

      await expect(
        generateSupportingCast(validContext, mockProtagonist)
      ).rejects.toThrow(/Failed to parse supporting cast/);
    });

    it('should throw error if response is not an array', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: '{"not": "an array"}' }],
      });

      await expect(
        generateSupportingCast(validContext, mockProtagonist)
      ).rejects.toThrow(/No valid JSON array found/);
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockRejectedValue(new Error('Connection timeout'));

      await expect(
        generateSupportingCast(validContext, mockProtagonist)
      ).rejects.toThrow('Connection timeout');
    });

    it('should assign unique UUIDs to each character', async () => {
      const crypto = await import('crypto');
      const mockRandomUUID = crypto.randomUUID as jest.Mock;
      mockRandomUUID
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      const result = await generateSupportingCast(validContext, mockProtagonist);

      expect(result[0].id).toBe('uuid-1');
      expect(result[1].id).toBe('uuid-2');
    });

    it('should handle characters without relationshipToProtagonist field', async () => {
      const dataWithoutRelationships = mockSupportingCastData.map(char => {
        const { relationshipToProtagonist, ...rest } = char;
        return rest;
      });

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(dataWithoutRelationships) }],
      });

      const result = await generateSupportingCast(validContext, mockProtagonist);

      expect(result[0].relationships).toEqual([]);
      expect(result[1].relationships).toEqual([]);
    });

    it('should call Claude API with correct parameters', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockSupportingCastData) }],
      });

      await generateSupportingCast(validContext, mockProtagonist);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 8000,
          temperature: 0.9,
        })
      );
    });
  });

  describe('regenerateDependentFields', () => {
    const mockCharacter: Character = {
      id: 'char-id',
      name: 'Old Name',
      role: 'protagonist',
      ethnicity: 'British',
      nationality: 'British',
      physicalDescription: 'Tall with dark hair.',
      personality: ['brave', 'loyal'],
      voiceSample: 'Sample',
      goals: ['Save the kingdom'],
      conflicts: { internal: [], external: [] },
      backstory: 'Old Name grew up in a small village.',
      currentState: 'Old Name is currently on a quest.',
      characterArc: 'Old Name will learn to trust others.',
      relationships: [],
    };

    it('should regenerate backstory when requested', async () => {
      const mockResponse = {
        backstory: 'New Name grew up in a small village. New Name faced many challenges.',
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory'],
      });

      expect(result).toHaveProperty('backstory');
      expect(result.backstory).toContain('New Name');
      expect(result).not.toHaveProperty('characterArc');
    });

    it('should regenerate character arc when requested', async () => {
      const mockResponse = {
        characterArc: 'New Name will transform from a loner to a team player.',
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['characterArc'],
      });

      expect(result).toHaveProperty('characterArc');
      expect(result.characterArc).toContain('New Name');
      expect(result).not.toHaveProperty('backstory');
    });

    it('should regenerate both fields when requested', async () => {
      const mockResponse = {
        backstory: 'New Name grew up in a village.',
        characterArc: 'New Name will learn courage.',
      };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory', 'characterArc'],
      });

      expect(result).toHaveProperty('backstory');
      expect(result).toHaveProperty('characterArc');
      expect(result.backstory).toContain('New Name');
      expect(result.characterArc).toContain('New Name');
    });

    it('should include story context in prompt when provided', async () => {
      const mockResponse = { backstory: 'New backstory' };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory'],
        storyContext: {
          genre: 'Fantasy',
          tone: 'Dark',
          themes: ['redemption', 'sacrifice'],
        },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/Genre: Fantasy/),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringMatching(/Tone: Dark/),
            }),
          ]),
        })
      );
    });

    it('should include character details in prompt', async () => {
      const mockResponse = { backstory: 'New backstory' };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory'],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('New Name'),
            }),
          ]),
        })
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Old Name'),
            }),
          ]),
        })
      );
    });

    it('should call Claude API with correct parameters', async () => {
      const mockResponse = { backstory: 'New backstory' };

      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory'],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 2000,
          temperature: 0.8,
        })
      );
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON' }],
      });

      await expect(
        regenerateDependentFields({
          projectId: 'project-id',
          characterId: 'char-id',
          newName: 'New Name',
          character: mockCharacter,
          fieldsToUpdate: ['backstory'],
        })
      ).rejects.toThrow(/Failed to parse dependent fields/);
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockRejectedValue(new Error('Service unavailable'));

      await expect(
        regenerateDependentFields({
          projectId: 'project-id',
          characterId: 'char-id',
          newName: 'New Name',
          character: mockCharacter,
          fieldsToUpdate: ['backstory'],
        })
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle response wrapped in markdown code blocks', async () => {
      const mockResponse = { backstory: 'New backstory' };

      (mockCreate as any).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(mockResponse) + '\n```',
          },
        ],
      });

      const result = await regenerateDependentFields({
        projectId: 'project-id',
        characterId: 'char-id',
        newName: 'New Name',
        character: mockCharacter,
        fieldsToUpdate: ['backstory'],
      });

      expect(result.backstory).toBe('New backstory');
    });
  });

  describe('assignNationalities', () => {
    it('should return undefined for "none" mode', () => {
      const result = assignNationalities(5, { mode: 'none' });
      expect(result).toBeUndefined();
    });

    it('should return undefined for "custom" mode', () => {
      const result = assignNationalities(5, { mode: 'custom' });
      expect(result).toBeUndefined();
    });

    it('should return undefined when no config provided', () => {
      const result = assignNationalities(5);
      expect(result).toBeUndefined();
    });

    it('should assign same nationality to all characters in "single" mode', () => {
      const result = assignNationalities(5, {
        mode: 'single',
        singleNationality: 'British',
      });

      expect(result).toEqual(['British', 'British', 'British', 'British', 'British']);
    });

    it('should distribute nationalities according to counts in "mixed" mode', () => {
      const distribution: NationalityDistribution[] = [
        { nationality: 'British', count: 2 },
        { nationality: 'French', count: 2 },
        { nationality: 'German', count: 1 },
      ];

      const result = assignNationalities(5, {
        mode: 'mixed',
        distribution,
      });

      expect(result).toHaveLength(5);

      // Count occurrences
      const counts = result!.reduce((acc: Record<string, number>, nat: string) => {
        acc[nat] = (acc[nat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(counts['British']).toBe(2);
      expect(counts['French']).toBe(2);
      expect(counts['German']).toBe(1);
    });

    it('should shuffle nationalities in "mixed" mode', () => {
      // This test checks that the nationalities are not in predictable order
      // Note: This test might occasionally fail due to random chance
      const distribution: NationalityDistribution[] = [
        { nationality: 'A', count: 5 },
        { nationality: 'B', count: 5 },
      ];

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(assignNationalities(10, { mode: 'mixed', distribution }));
      }

      // Check that at least some results differ (not all identical)
      const uniqueResults = new Set(results.map(r => JSON.stringify(r)));
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should slice to character count in "mixed" mode', () => {
      const distribution: NationalityDistribution[] = [
        { nationality: 'British', count: 10 },
        { nationality: 'French', count: 10 },
      ];

      const result = assignNationalities(5, {
        mode: 'mixed',
        distribution,
      });

      expect(result).toHaveLength(5);
    });

    it('should handle edge case of 0 characters', () => {
      const result = assignNationalities(0, {
        mode: 'single',
        singleNationality: 'British',
      });

      expect(result).toEqual([]);
    });

    it('should handle edge case of 1 character', () => {
      const result = assignNationalities(1, {
        mode: 'single',
        singleNationality: 'Japanese',
      });

      expect(result).toEqual(['Japanese']);
    });

    it('should return undefined if single nationality not specified', () => {
      const result = assignNationalities(5, {
        mode: 'single',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined if distribution not specified in mixed mode', () => {
      const result = assignNationalities(5, {
        mode: 'mixed',
      });

      expect(result).toBeUndefined();
    });

    it('should handle empty distribution array', () => {
      const result = assignNationalities(5, {
        mode: 'mixed',
        distribution: [],
      });

      expect(result).toEqual([]);
    });
  });
});
