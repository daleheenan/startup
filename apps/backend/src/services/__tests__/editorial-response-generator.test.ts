import { jest } from '@jest/globals';
import type { EditorialResponse, ConversationMessage } from '../editorial-response-generator.js';
import type { IntentDetectionResult, IntentType } from '../editorial-intent-detector.js';
import type { StoryConcept, StoryDNA } from '../../shared/types/index.js';

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

// Import the function after mocks are set up
import { generateEditorialResponse } from '../editorial-response-generator.js';

describe('Editorial Response Generator', () => {
  // Sample test data
  const mockConcept: StoryConcept = {
    title: 'The Last Lighthouse',
    logline: 'A keeper discovers secrets hidden in the light',
    synopsis: 'On a remote island, a reclusive lighthouse keeper uncovers ancient secrets that challenge everything he knows about time and reality. As strange phenomena intensify, he must choose between preserving the past or embracing an uncertain future.',
    hook: 'What if light could reveal hidden truths about time itself?',
    protagonistHint: 'Reclusive lighthouse keeper with a troubled past',
    conflictType: 'man vs nature',
  };

  const mockDNA: StoryDNA = {
    genre: 'Science Fiction',
    subgenre: 'Speculative Fiction',
    tone: 'Contemplative and mysterious',
    themes: ['isolation', 'time', 'choice', 'truth'],
    proseStyle: 'Lyrical and introspective with vivid sensory details',
    timeframe: 'Contemporary',
  };

  const mockConversationHistory: ConversationMessage[] = [
    {
      role: 'user',
      content: 'What genre would work best?',
      timestamp: '2026-01-29T10:00:00Z',
    },
    {
      role: 'assistant',
      content: 'Science Fiction would suit the time manipulation themes well.',
      timestamp: '2026-01-29T10:00:05Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Question Intent Response', () => {
    it('should generate answer response for question intent with no changes', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'User is asking for advice',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const userQuery = 'What themes would work best for this story?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Given your story about isolation and time, themes like "truth vs perception", "the weight of choices", and "human connection vs solitude" would complement the existing themes beautifully. These would enhance the philosophical depth whilst maintaining the contemplative tone.',
            }),
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 120,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        mockConversationHistory
      );

      expect(result.responseType).toBe('answer');
      expect(result.content).toContain('themes');
      expect(result.appliedChanges).toBeUndefined();
      expect(result.recommendedChanges).toBeUndefined();
      expect(result.usage.input_tokens).toBe(850);
      expect(result.usage.output_tokens).toBe(120);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should include UK British spelling directive in prompt for question intent', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Interrogative query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const userQuery = 'How can I improve pacing?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'To improve pacing, consider varying sentence lengths and balancing action with introspection.',
            }),
          },
        ],
        usage: {
          input_tokens: 820,
          output_tokens: 95,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(intentResult, userQuery, mockConcept, mockDNA, []);

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('UK BRITISH SPELLING');
      expect(promptContent).toContain('colour');
      expect(promptContent).toContain('realise');
      expect(promptContent).toContain('organise');
      expect(promptContent).toContain('behaviour');
    });
  });

  describe('Change Intent Response', () => {
    it('should generate change_applied response with appliedChanges for change intent', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Direct command to change genre',
        usage: { input_tokens: 440, output_tokens: 70 },
      };

      const userQuery = 'Change the genre to Horror';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'I\'ve changed the genre to Horror. This shift will emphasise the unsettling elements of the story.',
              appliedChanges: {
                dna: {
                  genre: 'Horror',
                },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 880,
          output_tokens: 110,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.responseType).toBe('change_applied');
      expect(result.content).toContain('changed the genre');
      expect(result.appliedChanges).toBeDefined();
      expect(result.appliedChanges?.dna?.genre).toBe('Horror');
      expect(result.recommendedChanges).toBeUndefined();
      expect(result.usage.input_tokens).toBe(880);
      expect(result.usage.output_tokens).toBe(110);
    });

    it('should apply changes to concept fields', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command to change title',
        usage: { input_tokens: 442, output_tokens: 65 },
      };

      const userQuery = 'Change the title to "Shadows of the Beacon"';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'I\'ve updated the title to "Shadows of the Beacon". This title better emphasises the mystery and darkness.',
              appliedChanges: {
                concept: {
                  title: 'Shadows of the Beacon',
                },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 875,
          output_tokens: 105,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.responseType).toBe('change_applied');
      expect(result.appliedChanges?.concept?.title).toBe('Shadows of the Beacon');
      expect(result.appliedChanges?.dna).toBeUndefined();
    });

    it('should apply changes to both concept and DNA', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command to change multiple fields',
        usage: { input_tokens: 455, output_tokens: 72 },
      };

      const userQuery = 'Change the tone to dark and ominous and update the logline';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'I\'ve updated the tone to dark and ominous, and revised the logline to match this darker approach.',
              appliedChanges: {
                concept: {
                  logline: 'A keeper uncovers sinister secrets that threaten his sanity',
                },
                dna: {
                  tone: 'Dark and ominous',
                },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 890,
          output_tokens: 125,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.responseType).toBe('change_applied');
      expect(result.appliedChanges?.concept?.logline).toBe('A keeper uncovers sinister secrets that threaten his sanity');
      expect(result.appliedChanges?.dna?.tone).toBe('Dark and ominous');
    });

    it('should handle themes array in appliedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command to change themes',
        usage: { input_tokens: 448, output_tokens: 68 },
      };

      const userQuery = 'Change themes to madness and obsession';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'I\'ve updated the themes to focus on madness and obsession.',
              appliedChanges: {
                dna: {
                  themes: ['madness', 'obsession'],
                },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 875,
          output_tokens: 100,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.appliedChanges?.dna?.themes).toEqual(['madness', 'obsession']);
      expect(Array.isArray(result.appliedChanges?.dna?.themes)).toBe(true);
    });

    it('should convert non-array themes to array in appliedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command to change theme',
        usage: { input_tokens: 445, output_tokens: 66 },
      };

      const userQuery = 'Set theme to redemption';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'I\'ve set the theme to redemption.',
              appliedChanges: {
                dna: {
                  themes: 'redemption', // Intentionally wrong type to test conversion
                },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 870,
          output_tokens: 95,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(Array.isArray(result.appliedChanges?.dna?.themes)).toBe(true);
      expect(result.appliedChanges?.dna?.themes).toEqual(['redemption']);
    });
  });

  describe('Suggestion Intent Response', () => {
    it('should generate recommendation response with recommendedChanges for suggestion intent', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'high',
        reasoning: 'User requesting improvements',
        usage: { input_tokens: 435, output_tokens: 78 },
      };

      const userQuery = 'Maybe make it darker and more mysterious?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'recommendation',
              content: 'I recommend enhancing the dark and mysterious elements of your story.',
              recommendedChanges: {
                dna: {
                  tone: 'Dark, ominous, and deeply mysterious',
                  themes: ['isolation', 'time', 'choice', 'truth', 'madness', 'the unknown'],
                },
                concept: {
                  hook: 'What if light revealed truths that were never meant to be discovered?',
                },
                rationale: 'A darker tone with enhanced mystery will create more tension and intrigue. Adding themes of madness and the unknown deepens the psychological horror elements, whilst the revised hook emphasises the dangerous nature of the revelation. This aligns with the contemplative style but adds an unsettling edge that will keep readers engaged.',
              },
            }),
          },
        ],
        usage: {
          input_tokens: 920,
          output_tokens: 180,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.responseType).toBe('recommendation');
      expect(result.content).toContain('recommend');
      expect(result.recommendedChanges).toBeDefined();
      expect(result.recommendedChanges?.dna?.tone).toContain('Dark');
      expect(result.recommendedChanges?.rationale).toContain('tension');
      expect(result.appliedChanges).toBeUndefined();
      expect(result.usage.input_tokens).toBe(920);
      expect(result.usage.output_tokens).toBe(180);
    });

    it('should handle themes array in recommendedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'high',
        reasoning: 'Request for improvement',
        usage: { input_tokens: 437, output_tokens: 75 },
      };

      const userQuery = 'Could we explore more psychological elements?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'recommendation',
              content: 'I suggest adding psychological depth to your themes.',
              recommendedChanges: {
                dna: {
                  themes: ['isolation', 'time', 'choice', 'truth', 'sanity', 'perception'],
                },
                rationale: 'Adding themes of sanity and perception creates psychological complexity that enriches the speculative elements and provides opportunities for character depth.',
              },
            }),
          },
        ],
        usage: {
          input_tokens: 895,
          output_tokens: 145,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.recommendedChanges?.dna?.themes).toEqual(['isolation', 'time', 'choice', 'truth', 'sanity', 'perception']);
      expect(Array.isArray(result.recommendedChanges?.dna?.themes)).toBe(true);
    });

    it('should convert non-array themes to array in recommendedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'medium',
        reasoning: 'Tentative improvement request',
        usage: { input_tokens: 438, output_tokens: 72 },
      };

      const userQuery = 'Perhaps focus more on revenge?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'recommendation',
              content: 'Consider emphasising revenge as a central theme.',
              recommendedChanges: {
                dna: {
                  themes: 'revenge', // Intentionally wrong type to test conversion
                },
                rationale: 'A revenge motivation adds compelling drive to the protagonist and creates clear stakes.',
              },
            }),
          },
        ],
        usage: {
          input_tokens: 885,
          output_tokens: 130,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(Array.isArray(result.recommendedChanges?.dna?.themes)).toBe(true);
      expect(result.recommendedChanges?.dna?.themes).toEqual(['revenge']);
    });

    it('should include rationale in recommendation response', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'high',
        reasoning: 'Request for improvement',
        usage: { input_tokens: 440, output_tokens: 76 },
      };

      const userQuery = 'Make it more compelling';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'recommendation',
              content: 'I recommend several changes to enhance the story\'s appeal.',
              recommendedChanges: {
                concept: {
                  logline: 'A haunted keeper must decode cryptic warnings before time runs out',
                },
                dna: {
                  tone: 'Urgent and suspenseful',
                },
                rationale: 'Adding urgency through the "time runs out" element creates immediate tension. The "haunted" descriptor adds intrigue, whilst "cryptic warnings" provides mystery. The more urgent tone drives pacing and maintains reader engagement throughout the narrative.',
              },
            }),
          },
        ],
        usage: {
          input_tokens: 905,
          output_tokens: 165,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      expect(result.recommendedChanges?.rationale).toContain('urgency');
      expect(result.recommendedChanges?.rationale).toContain('tension');
      expect(result.recommendedChanges?.rationale.length).toBeGreaterThan(50);
    });
  });

  describe('Conversation History', () => {
    it('should include conversation history in prompt', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Follow-up question',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const userQuery = 'What about the subgenre?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Given our previous discussion about Science Fiction, Speculative Fiction or Time Travel would work well.',
            }),
          },
        ],
        usage: {
          input_tokens: 950,
          output_tokens: 100,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        mockConversationHistory
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('CONVERSATION HISTORY:');
      expect(promptContent).toContain('User: What genre would work best?');
      expect(promptContent).toContain('Assistant: Science Fiction would suit the time manipulation themes well.');
    });

    it('should limit conversation history to last 10 messages', async () => {
      const longHistory: ConversationMessage[] = Array.from({ length: 15 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i + 1}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'medium',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Based on our conversation...',
            }),
          },
        ],
        usage: {
          input_tokens: 1200,
          output_tokens: 90,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        'Follow up question',
        mockConcept,
        mockDNA,
        longHistory
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      // Should contain last 10 messages (6-15), not earlier ones
      // Check for specific message boundaries to avoid substring matches
      expect(promptContent).not.toMatch(/Message 1\s*$/m);
      expect(promptContent).not.toContain('Message 2\n');
      expect(promptContent).not.toContain('Message 3\n');
      expect(promptContent).not.toContain('Message 4\n');
      expect(promptContent).not.toContain('Message 5\n');
      expect(promptContent).toContain('Message 6');
      expect(promptContent).toContain('Message 15');
    });

    it('should handle empty conversation history', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'First question',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const userQuery = 'What do you think?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Your story concept has strong foundations.',
            }),
          },
        ],
        usage: {
          input_tokens: 750,
          output_tokens: 85,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        userQuery,
        mockConcept,
        mockDNA,
        []
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).not.toContain('CONVERSATION HISTORY:');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      (mockCreate as any).mockRejectedValue(new Error('Network timeout'));

      await expect(
        generateEditorialResponse(
          intentResult,
          'What about this?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Network timeout');
    });

    it('should handle missing text content in response', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'image',
            source: { data: 'base64data' },
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 0,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Question?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('No text response from AI');
    });

    it('should handle malformed JSON in response', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'This is plain text, not JSON',
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Question?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Failed to extract JSON from AI response');
    });

    it('should validate response structure', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              // Missing content field
            }),
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Question?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Invalid response structure from AI');
    });

    it('should validate response type matches intent for question', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'Some content',
            }),
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Question?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Response type mismatch: expected answer for question intent');
    });

    it('should validate response type matches intent for change', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command',
        usage: { input_tokens: 440, output_tokens: 70 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Some content',
            }),
          },
        ],
        usage: {
          input_tokens: 880,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Change something',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Response type mismatch: expected change_applied for change intent');
    });

    it('should validate response type matches intent for suggestion', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'high',
        reasoning: 'Suggestion',
        usage: { input_tokens: 435, output_tokens: 78 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Some content',
            }),
          },
        ],
        usage: {
          input_tokens: 920,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Maybe improve?',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('Response type mismatch: expected recommendation for suggestion intent');
    });

    it('should validate change_applied has appliedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Command',
        usage: { input_tokens: 440, output_tokens: 70 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'Changed something',
              // Missing appliedChanges
            }),
          },
        ],
        usage: {
          input_tokens: 880,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Change something',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('change_applied response must include appliedChanges');
    });

    it('should validate recommendation has recommendedChanges', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'suggestion',
        confidence: 'high',
        reasoning: 'Suggestion',
        usage: { input_tokens: 435, output_tokens: 78 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'recommendation',
              content: 'Here is my recommendation',
              // Missing recommendedChanges
            }),
          },
        ],
        usage: {
          input_tokens: 920,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(
        generateEditorialResponse(
          intentResult,
          'Suggest improvements',
          mockConcept,
          mockDNA,
          []
        )
      ).rejects.toThrow('recommendation response must include recommendedChanges');
    });
  });

  describe('Context Building', () => {
    it('should include story context in prompt', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Answer',
            }),
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 80,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        'Question?',
        mockConcept,
        mockDNA,
        []
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('CURRENT STORY CONCEPT:');
      expect(promptContent).toContain('Title: The Last Lighthouse');
      expect(promptContent).toContain('Logline: A keeper discovers secrets hidden in the light');
      expect(promptContent).toContain('CURRENT STORY DNA:');
      expect(promptContent).toContain('Genre: Science Fiction');
      expect(promptContent).toContain('Themes: isolation, time, choice, truth');
    });

    it('should handle missing DNA fields', async () => {
      const incompleteDNA: StoryDNA = {
        genre: 'Fantasy',
        themes: ['magic'],
      } as any;

      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'medium',
        reasoning: 'Query',
        usage: { input_tokens: 420, output_tokens: 75 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Answer',
            }),
          },
        ],
        usage: {
          input_tokens: 750,
          output_tokens: 70,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        'Question?',
        mockConcept,
        incompleteDNA,
        []
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('Subgenre: Not set');
      expect(promptContent).toContain('Tone: Not set');
      expect(promptContent).toContain('Prose Style: Not set');
      expect(promptContent).toContain('Timeframe: Not set');
    });

    it('should include detected intent in prompt', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'change',
        confidence: 'high',
        reasoning: 'Direct command',
        usage: { input_tokens: 440, output_tokens: 70 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'change_applied',
              content: 'Changed',
              appliedChanges: {
                dna: { genre: 'Horror' },
              },
            }),
          },
        ],
        usage: {
          input_tokens: 880,
          output_tokens: 100,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        'Change genre',
        mockConcept,
        mockDNA,
        []
      );

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('DETECTED INTENT: change (confidence: high)');
    });
  });

  describe('API Configuration', () => {
    it('should call Anthropic API with correct model and parameters', async () => {
      const intentResult: IntentDetectionResult = {
        intent: 'question',
        confidence: 'high',
        reasoning: 'Query',
        usage: { input_tokens: 450, output_tokens: 80 },
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              responseType: 'answer',
              content: 'Answer',
            }),
          },
        ],
        usage: {
          input_tokens: 850,
          output_tokens: 80,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await generateEditorialResponse(
        intentResult,
        'Question?',
        mockConcept,
        mockDNA,
        []
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('UK British Spelling Enforcement', () => {
    it('should include British spelling directive for all intent types', async () => {
      const intents: Array<{ intent: IntentType; responseType: string }> = [
        { intent: 'question', responseType: 'answer' },
        { intent: 'change', responseType: 'change_applied' },
        { intent: 'suggestion', responseType: 'recommendation' },
      ];

      for (const { intent, responseType } of intents) {
        jest.clearAllMocks();

        const intentResult: IntentDetectionResult = {
          intent,
          confidence: 'high',
          reasoning: 'Test',
          usage: { input_tokens: 450, output_tokens: 80 },
        };

        const mockResponseData: any = {
          responseType,
          content: 'Test content',
        };

        if (responseType === 'change_applied') {
          mockResponseData.appliedChanges = { dna: { genre: 'Horror' } };
        } else if (responseType === 'recommendation') {
          mockResponseData.recommendedChanges = {
            dna: { genre: 'Horror' },
            rationale: 'Test rationale',
          };
        }

        const mockResponse = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockResponseData),
            },
          ],
          usage: {
            input_tokens: 850,
            output_tokens: 100,
          },
        };

        (mockCreate as any).mockResolvedValue(mockResponse);

        await generateEditorialResponse(
          intentResult,
          'Test query',
          mockConcept,
          mockDNA,
          []
        );

        const callArgs = (mockCreate as any).mock.calls[0][0];
        const promptContent = callArgs.messages[0].content;

        expect(promptContent).toContain('CRITICAL INSTRUCTION - UK BRITISH SPELLING');
        expect(promptContent).toContain('colour');
        expect(promptContent).toContain('realise');
        expect(promptContent).toContain('organise');
        expect(promptContent).toContain('behaviour');
        expect(promptContent).toContain('favour');
        expect(promptContent).toContain('centre');
        expect(promptContent).toContain('defence');
        expect(promptContent).toContain('analyse');
      }
    });
  });
});
