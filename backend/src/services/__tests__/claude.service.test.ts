import { jest } from '@jest/globals';

// Set environment variables BEFORE any imports
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.ANTHROPIC_MODEL = 'claude-opus-4-5-20251101';

// Mock Anthropic SDK
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

// Mock session tracker
const mockTrackRequest = jest.fn();
const mockGetCurrentSession = jest.fn();
const mockGetSessionStats = jest.fn();

jest.mock('../session-tracker.js', () => ({
  __esModule: true,
  sessionTracker: {
    trackRequest: mockTrackRequest,
    getCurrentSession: mockGetCurrentSession,
    getSessionStats: mockGetSessionStats,
  },
}));

// Mock rate limit handler
jest.mock('../../queue/rate-limit-handler.js', () => ({
  __esModule: true,
  RateLimitError: class RateLimitError extends Error {
    constructor(message: string, public resetsAt?: string) {
      super(message);
      this.name = 'RateLimitError';
    }
  },
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

// Import the service after mocks are set up
import { ClaudeService } from '../claude.service.js';
import { sessionTracker } from '../session-tracker.js';
import Anthropic from '@anthropic-ai/sdk';

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-5-20251101';

    // Create new service instance
    service = new ClaudeService();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(mockAnthropicConstructor).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 5 * 60 * 1000,
      });
    });

    it('should use default model if not specified in environment', () => {
      delete process.env.ANTHROPIC_MODEL;
      const newService = new ClaudeService();
      // Model defaults to claude-opus-4-5-20251101
      expect(newService).toBeDefined();
    });

    it('should use custom model from environment', () => {
      process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5';
      const newService = new ClaudeService();
      expect(newService).toBeDefined();
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const newService = new ClaudeService();
      expect(newService).toBeDefined();
    });

    it('should handle placeholder API key', () => {
      process.env.ANTHROPIC_API_KEY = 'placeholder-key-will-be-set-later';
      const newService = new ClaudeService();
      expect(newService).toBeDefined();
    });
  });

  describe('createCompletion', () => {
    const validParams = {
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user' as const, content: 'Hello, Claude!' }],
    };

    it('should create completion successfully', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: 'Hello! How can I help you today?',
          },
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 8,
        },
      }));

      const result = await service.createCompletion(validParams);

      expect(result).toBe('Hello! How can I help you today?');
      expect(mockTrackRequest).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4096,
        temperature: 1.0,
        system: validParams.system,
        messages: validParams.messages,
      });
    });

    it('should use custom maxTokens if provided', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      }));

      await service.createCompletion({
        ...validParams,
        maxTokens: 2000,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        })
      );
    });

    it('should use custom temperature if provided', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      }));

      await service.createCompletion({
        ...validParams,
        temperature: 0.7,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it('should handle multiple text blocks in response', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
          { type: 'text', text: 'Part 3' },
        ],
        usage: { input_tokens: 10, output_tokens: 15 },
      }));

      const result = await service.createCompletion(validParams);

      expect(result).toBe('Part 1\nPart 2\nPart 3');
    });

    it('should filter out non-text content blocks', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [
          { type: 'text', text: 'Text response' },
          { type: 'image', data: 'image-data' },
          { type: 'text', text: 'More text' },
        ],
        usage: { input_tokens: 10, output_tokens: 10 },
      }));

      const result = await service.createCompletion(validParams);

      expect(result).toBe('Text response\nMore text');
    });

    it('should throw error if API key is not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const unconfiguredService = new ClaudeService();

      await expect(
        unconfiguredService.createCompletion(validParams)
      ).rejects.toThrow('Claude API not configured');
    });

    it('should throw RateLimitError on 429 status', async () => {
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;

      (mockCreate as any).mockImplementation(() => Promise.reject(rateLimitError));

      mockGetCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-24T12:00:00Z',
      });

      await expect(service.createCompletion(validParams)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });

    it('should throw RateLimitError on rate_limit_error type', async () => {
      const rateLimitError: any = new Error('Rate limit');
      rateLimitError.error = { type: 'rate_limit_error' };

      (mockCreate as any).mockImplementation(() => Promise.reject(rateLimitError));

      mockGetCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-24T12:00:00Z',
      });

      await expect(service.createCompletion(validParams)).rejects.toThrow();
    });

    it('should use default reset time if session reset time unknown', async () => {
      const rateLimitError: any = new Error('Rate limit');
      rateLimitError.status = 429;

      (mockCreate as any).mockImplementation(() => Promise.reject(rateLimitError));

      mockGetCurrentSession.mockReturnValue(null);

      await expect(service.createCompletion(validParams)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });

    it('should rethrow non-rate-limit errors', async () => {
      (mockCreate as any).mockImplementation(() => Promise.reject(new Error('API connection failed')));

      await expect(service.createCompletion(validParams)).rejects.toThrow(
        'API connection failed'
      );
    });
  });

  describe('createCompletionWithUsage', () => {
    const validParams = {
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user' as const, content: 'Hello!' }],
    };

    it('should return content and usage data', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Hello there!' }],
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      }));

      const result = await service.createCompletionWithUsage(validParams);

      expect(result.content).toBe('Hello there!');
      expect(result.usage.input_tokens).toBe(15);
      expect(result.usage.output_tokens).toBe(8);
    });

    it('should track request before API call', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }));

      await service.createCompletionWithUsage(validParams);

      expect(mockTrackRequest).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return true if connection successful', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 5, output_tokens: 1 },
      }));

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 10,
        })
      );
    });

    it('should return true if response contains OK', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'OK, I can read this.' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      }));

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false if response does not contain OK', async () => {
      (mockCreate as any).mockImplementation(() => Promise.resolve({
        content: [{ type: 'text', text: 'Something else' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      }));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (mockCreate as any).mockImplementation(() => Promise.reject(new Error('Connection failed')));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on connection failure', async () => {
      (mockCreate as any).mockImplementation(() => Promise.reject(new Error('Network error')));

      const result = await service.testConnection();

      expect(result).toBe(false);
      // Logger handles error logging - no need to verify console calls
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', () => {
      const mockStats = {
        requests: 42,
        resetTime: '2026-01-24T12:00:00Z',
      };

      mockGetSessionStats.mockReturnValue(mockStats);

      const result = service.getSessionStats();

      expect(result).toEqual(mockStats);
      expect(mockGetSessionStats).toHaveBeenCalled();
    });
  });
});
