import { jest } from '@jest/globals';
import type { StoryConcept, StoryPreferences } from '../concept-generator.js';

// Set environment variables BEFORE any imports
process.env.ANTHROPIC_API_KEY = 'test-api-key';

// Mock Anthropic SDK before importing
const mockCreate = jest.fn();
const mockAnthropicConstructor = jest.fn().mockImplementation(() => ({
  messages: {
    create: mockCreate,
  },
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: mockAnthropicConstructor,
}));

// Mock logger
jest.mock('../logger.service.js', () => ({
  __esModule: true,
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock database
jest.mock('../../db/connection.js', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn(),
  },
}));

// Mock genre helpers
jest.mock('../../utils/genre-helpers.js', () => ({
  __esModule: true,
  formatGenre: jest.fn((preferences: any) => {
    const { genre, genres } = preferences;
    return genre || (genres && genres.length > 0 ? genres.join(' + ') : 'Not specified');
  }),
  formatSubgenre: jest.fn((preferences: any) => {
    const { subgenre, subgenres } = preferences;
    return subgenre || (subgenres && subgenres.length > 0 ? subgenres.join(', ') : 'Not specified');
  }),
  formatModifiers: jest.fn((modifiers: any) => {
    return modifiers && modifiers.length > 0 ? modifiers.join(', ') : null;
  }),
  getWordCountContext: jest.fn((targetLength: any) => {
    if (targetLength < 60000) return 'novella or short novel';
    if (targetLength < 90000) return 'standard novel';
    if (targetLength < 120000) return 'longer novel';
    return 'epic-length novel';
  }),
}));

// Mock JSON extractor
jest.mock('../../utils/json-extractor.js', () => ({
  __esModule: true,
  extractJsonArray: jest.fn((response: any) => {
    // Try to parse JSON directly or from code blocks
    const responseStr = response as string;
    const jsonMatch = responseStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || responseStr.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(responseStr);
  }),
}));

// Import the functions after mocks are set up
import { generateConcepts, refineConcepts } from '../concept-generator.js';

describe('ConceptGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('generateConcepts', () => {
    const validPreferences: StoryPreferences = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark and gritty',
      themes: ['redemption', 'power corruption'],
      targetLength: 90000,
    };

    it('should generate 5 diverse story concepts', async () => {
      const mockConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'The Shadow King',
          logline: 'A fallen prince must reclaim his throne from his corrupted brother.',
          synopsis: 'Once a noble prince, Aldric watched his kingdom fall to darkness. His brother, consumed by forbidden magic, now rules with an iron fist. Aldric must gather allies from the ashes.\n\nWith only a handful of loyal followers, he begins a desperate campaign to expose his brother\'s crimes. But each victory brings him closer to the same dark power that corrupted his sibling.\n\nNow Aldric faces an impossible choice: embrace the darkness to save his people, or remain pure and watch them suffer under tyranny.',
          hook: 'A prince must decide if redemption is worth damnation.',
          protagonistHint: 'Aldric - exiled prince seeking redemption',
          conflictType: 'both',
        },
        {
          id: 'concept-2',
          title: 'Ashes of Empire',
          logline: 'A slave discovers she has the power to unmake the empire that enslaved her.',
          synopsis: 'Kira has known nothing but chains. But when she accidentally kills an overseer with a thought, everything changes. She possesses a rare gift: the ability to destroy magical constructs.\n\nThe empire is built on magic-forged steel and enchanted walls. Without these, it would crumble. A rebel group seeks to use Kira as a weapon, but she has her own plans.\n\nAs Kira learns to control her power, she must decide: join the rebellion, or tear down the empire herself—no matter how many innocents die in the collapse.',
          hook: 'Ultimate power to destroy, but at what cost?',
          protagonistHint: 'Kira - enslaved girl with anti-magic powers',
          conflictType: 'both',
        },
        {
          id: 'concept-3',
          title: 'The Oathbreaker',
          logline: 'A knight bound by sacred vows must break them all to save the kingdom.',
          synopsis: 'Sir Marcus swore three unbreakable oaths: never kill an innocent, never lie, never abandon his post. For twenty years, he\'s kept them all. Until now.\n\nA conspiracy reaches the highest levels of the kingdom. To expose it, Marcus must lie. To stop it, he must kill. To save his king, he must abandon his post.\n\nEach broken oath strips away a piece of his soul. But if he doesn\'t break them all, the kingdom falls. Can a knight be a hero if he becomes a villain?',
          hook: 'Breaking sacred oaths to uphold sacred duty.',
          protagonistHint: 'Sir Marcus - oath-bound knight facing impossible choices',
          conflictType: 'internal',
        },
        {
          id: 'concept-4',
          title: 'The Last Truthsayer',
          logline: 'In a world where everyone lies, the only person who cannot is hunted.',
          synopsis: 'Elara was born unable to lie. In a society built on deception, this should have killed her. Instead, she learned to stay silent, to speak in riddles, to survive.\n\nWhen a plague of madness spreads through the royal court, Elara discovers why: the kingdom\'s foundation is a lie so profound that truth itself has become toxic.\n\nTo cure the madness, she must speak the forbidden truth. But doing so will shatter the kingdom, expose ancient crimes, and make her the most wanted person alive.',
          hook: 'The truth can set you free—or destroy everything.',
          protagonistHint: 'Elara - woman cursed to speak only truth',
          conflictType: 'external',
        },
        {
          id: 'concept-5',
          title: 'Crown of Thorns',
          logline: 'A pacifist heir must lead a war to prevent genocide.',
          synopsis: 'Prince Darien has dedicated his life to peace. He negotiated the end of three wars without bloodshed. His philosophy: violence begets violence.\n\nBut when a neighboring empire launches a campaign of extermination against his people, words fail. His advisors demand war. His people demand vengeance. His conscience demands peace.\n\nDarien must choose: stay true to his principles and watch his people die, or lead them to war and become the very monster he despises.',
          hook: 'Can a pacifist wage war without losing his soul?',
          protagonistHint: 'Prince Darien - pacifist forced to lead a war',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockConcepts),
          },
        ],
      }));

      const result = await generateConcepts(validPreferences);

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('logline');
      expect(result[0]).toHaveProperty('synopsis');
      expect(result[0]).toHaveProperty('hook');
      expect(result[0]).toHaveProperty('protagonistHint');
      expect(result[0]).toHaveProperty('conflictType');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4000,
          temperature: 1.0,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Fantasy'),
            }),
          ]),
        })
      );
    });

    it('should handle multi-genre format', async () => {
      const multiGenrePreferences: StoryPreferences = {
        genre: '',
        genres: ['Fantasy', 'Science Fiction'],
        subgenres: ['Space Opera', 'Urban Fantasy'],
        modifiers: ['Cyberpunk'],
        tone: 'Dark',
        themes: ['identity'],
        targetLength: 80000,
      };

      const mockConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Test Concept',
          logline: 'A test logline for validation.',
          synopsis: 'Test synopsis.',
          hook: 'Test hook.',
          protagonistHint: 'Test protagonist',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockConcepts),
          },
        ],
      }));

      await generateConcepts(multiGenrePreferences);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Fantasy + Science Fiction'),
            }),
          ]),
        })
      );
    });

    it('should include regeneration timestamp in prompt for uniqueness', async () => {
      const preferencesWithTimestamp: StoryPreferences = {
        ...validPreferences,
        regenerationTimestamp: 1234567890,
      };

      const mockConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Test',
          logline: 'Test logline.',
          synopsis: 'Test synopsis.',
          hook: 'Test hook.',
          protagonistHint: 'Test',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(mockConcepts) }],
      }));

      await generateConcepts(preferencesWithTimestamp);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('[Generation ID: 1234567890'),
            }),
          ]),
        })
      );
    });

    it('should handle Claude response wrapped in markdown code blocks', async () => {
      const mockConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Test',
          logline: 'Test logline.',
          synopsis: 'Test synopsis.',
          hook: 'Test hook.',
          protagonistHint: 'Test',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(mockConcepts) + '\n```',
          },
        ],
      }));

      const result = await generateConcepts(validPreferences);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should throw error if response is not valid JSON', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: 'This is not JSON',
          },
        ],
      }));

      await expect(generateConcepts(validPreferences)).rejects.toThrow(
        /Failed to parse concepts/
      );
    });

    it('should throw error if response is not an array', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: '{"not": "an array"}',
          },
        ],
      }));

      await expect(generateConcepts(validPreferences)).rejects.toThrow(
        /Failed to parse concepts/
      );
    });

    it('should throw error if concepts are missing required fields', async () => {
      const invalidConcepts = [
        {
          id: 'concept-1',
          title: 'Test',
          // Missing logline, synopsis, etc.
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: JSON.stringify(invalidConcepts),
          },
        ],
      }));

      await expect(generateConcepts(validPreferences)).rejects.toThrow(
        /Concept missing required fields/
      );
    });

    it('should throw error if no concepts returned', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: '[]',
          },
        ],
      }));

      await expect(generateConcepts(validPreferences)).rejects.toThrow(
        /Failed to parse concepts from Claude response/
      );
    });

    it('should adjust word count context based on target length', async () => {
      const shortNovel: StoryPreferences = {
        ...validPreferences,
        targetLength: 50000, // novella
      };

      const mockConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Test',
          logline: 'Test.',
          synopsis: 'Test.',
          hook: 'Test.',
          protagonistHint: 'Test',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(mockConcepts) }],
      }));

      await generateConcepts(shortNovel);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('novella or short novel'),
            }),
          ]),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (mockCreate as any).mockImplementation(() => Promise.reject(new Error('API Error: Service unavailable')));

      await expect(generateConcepts(validPreferences)).rejects.toThrow(
        'API Error: Service unavailable'
      );
    });
  });

  describe('refineConcepts', () => {
    const validPreferences: StoryPreferences = {
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      tone: 'Dark',
      themes: ['redemption'],
      targetLength: 90000,
    };

    const existingConcepts: StoryConcept[] = [
      {
        id: 'concept-1',
        title: 'Old Concept',
        logline: 'An old logline about a generic fantasy quest.',
        synopsis: 'A hero goes on a quest.',
        hook: 'Standard quest hook.',
        protagonistHint: 'Generic hero',
        conflictType: 'external',
      },
    ];

    const feedback = 'I want more focus on internal character conflict rather than external battles.';

    it('should refine concepts based on user feedback', async () => {
      const mockRefinedConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Inner Demons',
          logline: 'A warrior must conquer his own guilt before he can save his kingdom.',
          synopsis: 'Refined synopsis focusing on internal conflict.',
          hook: 'Internal struggle hook.',
          protagonistHint: 'Guilt-ridden warrior',
          conflictType: 'internal',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockRefinedConcepts),
          },
        ],
      }));

      const result = await refineConcepts(validPreferences, existingConcepts, feedback);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inner Demons');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(feedback),
            }),
          ]),
        })
      );
    });

    it('should include previous concepts in the refinement prompt', async () => {
      const mockRefinedConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'New Concept',
          logline: 'New.',
          synopsis: 'New.',
          hook: 'New.',
          protagonistHint: 'New',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(mockRefinedConcepts) }],
      }));

      await refineConcepts(validPreferences, existingConcepts, feedback);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Old Concept'),
            }),
          ]),
        })
      );
    });

    it('should handle multi-genre format in refinement', async () => {
      const multiGenrePreferences: StoryPreferences = {
        genre: '',
        genres: ['Mystery', 'Horror'],
        subgenres: ['Psychological Thriller'],
        tone: 'Suspenseful',
        themes: ['fear'],
        targetLength: 70000,
      };

      const mockRefinedConcepts: StoryConcept[] = [
        {
          id: 'concept-1',
          title: 'Test',
          logline: 'Test.',
          synopsis: 'Test.',
          hook: 'Test.',
          protagonistHint: 'Test',
          conflictType: 'both',
        },
      ];

      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(mockRefinedConcepts) }],
      }));

      await refineConcepts(multiGenrePreferences, existingConcepts, feedback);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Mystery + Horror'),
            }),
          ]),
        })
      );
    });

    it('should throw error if refinement returns invalid JSON', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Invalid JSON' }],
      }));

      await expect(
        refineConcepts(validPreferences, existingConcepts, feedback)
      ).rejects.toThrow(/Failed to parse/);
    });

    it('should handle API errors during refinement', async () => {
      (mockCreate as any).mockImplementation(() => Promise.reject(new Error('Rate limit exceeded')));

      await expect(
        refineConcepts(validPreferences, existingConcepts, feedback)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
