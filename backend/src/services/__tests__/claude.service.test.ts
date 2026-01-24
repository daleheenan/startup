import { jest } from '@jest/globals';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

// Mock session tracker
jest.mock('../session-tracker.js', () => ({
  sessionTracker: {
    trackRequest: jest.fn(),
    getCurrentSession: jest.fn(),
    getSessionStats: jest.fn(),
  },
}));

describe('ClaudeService', () => {
  let ClaudeService: any;
  let Anthropic: any;
  let sessionTracker: any;
  let mockCreate: jest.Mock;
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Set environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-5-20251101';

    // Import mocked modules
    const AnthropicModule = await import('@anthropic-ai/sdk');
    Anthropic = AnthropicModule.default;

    const trackerModule = await import('../session-tracker.js');
    sessionTracker = trackerModule.sessionTracker;

    const serviceModule = await import('../claude.service.js');
    ClaudeService = serviceModule.ClaudeService;

    // Create new service instance
    service = new ClaudeService();

    // Get the mock create function
    const mockInstance = new Anthropic();
    mockCreate = mockInstance.messages.create as jest.Mock;
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
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
      mockCreate.mockResolvedValue({
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
      });

      const result = await service.createCompletion(validParams);

      expect(result).toBe('Hello! How can I help you today?');
      expect(sessionTracker.trackRequest).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4096,
        temperature: 1.0,
        system: validParams.system,
        messages: validParams.messages,
      });
    });

    it('should use custom maxTokens if provided', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

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
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

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
      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: 'Part 2' },
          { type: 'text', text: 'Part 3' },
        ],
        usage: { input_tokens: 10, output_tokens: 15 },
      });

      const result = await service.createCompletion(validParams);

      expect(result).toBe('Part 1\nPart 2\nPart 3');
    });

    it('should filter out non-text content blocks', async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'Text response' },
          { type: 'image', data: 'image-data' },
          { type: 'text', text: 'More text' },
        ],
        usage: { input_tokens: 10, output_tokens: 10 },
      });

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

      mockCreate.mockRejectedValue(rateLimitError);

      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-24T12:00:00Z',
      });

      await expect(service.createCompletion(validParams)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });

    it('should throw RateLimitError on rate_limit_error type', async () => {
      const rateLimitError: any = new Error('Rate limit');
      rateLimitError.error = { type: 'rate_limit_error' };

      mockCreate.mockRejectedValue(rateLimitError);

      sessionTracker.getCurrentSession.mockReturnValue({
        session_resets_at: '2026-01-24T12:00:00Z',
      });

      await expect(service.createCompletion(validParams)).rejects.toThrow();
    });

    it('should use default reset time if session reset time unknown', async () => {
      const rateLimitError: any = new Error('Rate limit');
      rateLimitError.status = 429;

      mockCreate.mockRejectedValue(rateLimitError);

      sessionTracker.getCurrentSession.mockReturnValue(null);

      await expect(service.createCompletion(validParams)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });

    it('should rethrow non-rate-limit errors', async () => {
      mockCreate.mockRejectedValue(new Error('API connection failed'));

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
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello there!' }],
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      });

      const result = await service.createCompletionWithUsage(validParams);

      expect(result.content).toBe('Hello there!');
      expect(result.usage.input_tokens).toBe(15);
      expect(result.usage.output_tokens).toBe(8);
    });

    it('should track request before API call', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 10 },
      });

      await service.createCompletionWithUsage(validParams);

      expect(sessionTracker.trackRequest).toHaveBeenCalledBefore(mockCreate);
    });
  });

  describe('testConnection', () => {
    it('should return true if connection successful', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 5, output_tokens: 1 },
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 10,
        })
      );
    });

    it('should return true if response contains OK', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'OK, I can read this.' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false if response does not contain OK', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Something else' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should log error on connection failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockCreate.mockRejectedValue(new Error('Network error'));

      await service.testConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ClaudeService] Connection test failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', () => {
      const mockStats = {
        requests: 42,
        resetTime: '2026-01-24T12:00:00Z',
      };

      sessionTracker.getSessionStats.mockReturnValue(mockStats);

      const result = service.getSessionStats();

      expect(result).toEqual(mockStats);
      expect(sessionTracker.getSessionStats).toHaveBeenCalled();
    });
  });
});
