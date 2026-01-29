import { jest } from '@jest/globals';
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
import { detectIntent } from '../editorial-intent-detector.js';

describe('Editorial Intent Detector', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Question Intent Detection', () => {
    it('should detect question intent for interrogative query "What genre would suit this better?"', async () => {
      const userQuery = 'What genre would suit this story better?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'high',
              reasoning: 'Query uses interrogative word "what" and is asking for advice about genre selection.',
            }),
          },
        ],
        usage: {
          input_tokens: 450,
          output_tokens: 80,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('question');
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('interrogative');
      expect(result.usage.input_tokens).toBe(450);
      expect(result.usage.output_tokens).toBe(80);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Verify the prompt includes UK spelling directive
      const callArgs = (mockCreate as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('UK British spelling');
    });

    it('should detect question intent for "How can I improve the pacing?"', async () => {
      const userQuery = 'How can I improve the pacing?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'high',
              reasoning: 'Query uses "how" and is asking for guidance on improving an aspect of the story.',
            }),
          },
        ],
        usage: {
          input_tokens: 445,
          output_tokens: 75,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('question');
      expect(result.confidence).toBe('high');
    });

    it('should detect question intent for "Why does this feel flat?"', async () => {
      const userQuery = 'Why does this feel flat?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'medium',
              reasoning: 'Query uses "why" seeking understanding, though it implies a problem that may need suggestions.',
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 82,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('question');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Change Intent Detection', () => {
    it('should detect change intent for imperative command "Change the genre to thriller"', async () => {
      const userQuery = 'Change the genre to thriller';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'change',
              confidence: 'high',
              reasoning: 'Direct imperative command with specific value: "change genre to thriller".',
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 70,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('change');
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('imperative');
      expect(result.usage.input_tokens).toBe(440);
      expect(result.usage.output_tokens).toBe(70);
    });

    it('should detect change intent for "Set the tone to dark and brooding"', async () => {
      const userQuery = 'Set the tone to dark and brooding';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'change',
              confidence: 'high',
              reasoning: 'Imperative verb "set" with explicit new value for tone attribute.',
            }),
          },
        ],
        usage: {
          input_tokens: 438,
          output_tokens: 68,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('change');
      expect(result.confidence).toBe('high');
    });

    it('should detect change intent for "Update the title to Dawn of Shadows"', async () => {
      const userQuery = 'Update the title to Dawn of Shadows';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'change',
              confidence: 'high',
              reasoning: 'Imperative command with specific new title value provided.',
            }),
          },
        ],
        usage: {
          input_tokens: 442,
          output_tokens: 65,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('change');
      expect(result.confidence).toBe('high');
    });
  });

  describe('Suggestion Intent Detection', () => {
    it('should detect suggestion intent for tentative language "Maybe make it darker?"', async () => {
      const userQuery = 'Maybe make it darker?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'suggestion',
              confidence: 'high',
              reasoning: 'Tentative language "maybe" with comparative improvement request "darker" but no specific value.',
            }),
          },
        ],
        usage: {
          input_tokens: 435,
          output_tokens: 78,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('suggestion');
      expect(result.confidence).toBe('high');
      expect(result.reasoning.toLowerCase()).toContain('tentative');
      expect(result.usage.input_tokens).toBe(435);
      expect(result.usage.output_tokens).toBe(78);
    });

    it('should detect suggestion intent for "Could we add more tension?"', async () => {
      const userQuery = 'Could we add more tension?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'suggestion',
              confidence: 'high',
              reasoning: 'Tentative modal verb "could" with improvement request lacking specific implementation details.',
            }),
          },
        ],
        usage: {
          input_tokens: 437,
          output_tokens: 75,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('suggestion');
      expect(result.confidence).toBe('high');
    });

    it('should detect suggestion intent for "Make it more compelling"', async () => {
      const userQuery = 'Make it more compelling';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'suggestion',
              confidence: 'high',
              reasoning: 'Comparative improvement language "more compelling" without specific changes specified.',
            }),
          },
        ],
        usage: {
          input_tokens: 436,
          output_tokens: 72,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('suggestion');
      expect(result.confidence).toBe('high');
    });

    it('should detect suggestion intent for "Perhaps emphasise the isolation theme more"', async () => {
      const userQuery = 'Perhaps emphasise the isolation theme more';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'suggestion',
              confidence: 'medium',
              reasoning: 'Tentative word "perhaps" with improvement request using comparative language.',
            }),
          },
        ],
        usage: {
          input_tokens: 441,
          output_tokens: 70,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.intent).toBe('suggestion');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Confidence Levels', () => {
    it('should return high confidence for clear question', async () => {
      const userQuery = 'What themes would work best?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'high',
              reasoning: 'Clear interrogative with "what" seeking advice.',
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 65,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.confidence).toBe('high');
    });

    it('should return medium confidence for ambiguous query', async () => {
      const userQuery = 'The tone feels off';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'suggestion',
              confidence: 'medium',
              reasoning: 'Implies a problem but unclear if seeking explanation or suggestions.',
            }),
          },
        ],
        usage: {
          input_tokens: 438,
          output_tokens: 68,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.confidence).toBe('medium');
    });

    it('should return low confidence for very vague query', async () => {
      const userQuery = 'Hmm';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'low',
              reasoning: 'Extremely vague expression, difficult to determine specific intent.',
            }),
          },
        ],
        usage: {
          input_tokens: 435,
          output_tokens: 70,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      const result = await detectIntent(userQuery, mockConcept, mockDNA);

      expect(result.confidence).toBe('low');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const userQuery = 'What genre would work?';

      (mockCreate as any).mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle missing text content in response', async () => {
      const userQuery = 'Change the genre';

      const mockResponse = {
        content: [
          {
            type: 'image',
            source: { data: 'base64data' },
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 0,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('No text response from AI');
    });

    it('should handle malformed JSON in response', async () => {
      const userQuery = 'What is the theme?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON at all',
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('Failed to extract JSON from AI response');
    });

    it('should validate response structure', async () => {
      const userQuery = 'Change genre';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'change',
              // Missing confidence and reasoning
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('Invalid response structure from AI');
    });

    it('should validate intent type', async () => {
      const userQuery = 'Do something';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'invalid_intent',
              confidence: 'high',
              reasoning: 'Some reasoning',
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('Invalid intent type: invalid_intent');
    });

    it('should validate confidence level', async () => {
      const userQuery = 'Change something';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'change',
              confidence: 'super_high',
              reasoning: 'Some reasoning',
            }),
          },
        ],
        usage: {
          input_tokens: 440,
          output_tokens: 50,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await expect(detectIntent(userQuery, mockConcept, mockDNA)).rejects.toThrow('Invalid confidence level: super_high');
    });
  });

  describe('Context Building', () => {
    it('should include story context in the prompt', async () => {
      const userQuery = 'What do you think?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'medium',
              reasoning: 'General question seeking opinion.',
            }),
          },
        ],
        usage: {
          input_tokens: 500,
          output_tokens: 60,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await detectIntent(userQuery, mockConcept, mockDNA);

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('CURRENT STORY CONTEXT:');
      expect(promptContent).toContain('Genre: Science Fiction');
      expect(promptContent).toContain('Subgenre: Speculative Fiction');
      expect(promptContent).toContain('Tone: Contemplative and mysterious');
      expect(promptContent).toContain('Themes: isolation, time, choice, truth');
      expect(promptContent).toContain('Timeframe: Contemporary');
      expect(promptContent).toContain('Title: The Last Lighthouse');
    });

    it('should handle missing DNA fields gracefully', async () => {
      const incompleteDNA: StoryDNA = {
        genre: 'Fantasy',
        themes: ['magic'],
      } as any;

      const userQuery = 'What about this?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'low',
              reasoning: 'Vague question without clear context.',
            }),
          },
        ],
        usage: {
          input_tokens: 420,
          output_tokens: 55,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await detectIntent(userQuery, mockConcept, incompleteDNA);

      const callArgs = (mockCreate as any).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain('Subgenre: Not set');
      expect(promptContent).toContain('Tone: Not set');
      expect(promptContent).toContain('Timeframe: Not set');
    });
  });

  describe('API Configuration', () => {
    it('should call Anthropic API with correct model and parameters', async () => {
      const userQuery = 'Is this good?';

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'question',
              confidence: 'medium',
              reasoning: 'Seeking validation or feedback.',
            }),
          },
        ],
        usage: {
          input_tokens: 430,
          output_tokens: 58,
        },
      };

      (mockCreate as any).mockResolvedValue(mockResponse);

      await detectIntent(userQuery, mockConcept, mockDNA);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.any(String),
          }),
        ]),
      });
    });
  });
});
