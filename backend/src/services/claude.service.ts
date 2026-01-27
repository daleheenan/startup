import Anthropic from '@anthropic-ai/sdk';
import { sessionTracker } from './session-tracker.js';
import { RateLimitError } from '../queue/rate-limit-handler.js';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:claude');

export interface ClaudeResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * ClaudeService wraps the Anthropic SDK with session tracking and error handling
 */
export class ClaudeService {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'placeholder-key-will-be-set-later') {
      logger.warn('[ClaudeService] Warning: ANTHROPIC_API_KEY not configured');
      // Don't throw error to allow CLI commands to work
      this.client = null as any;
      this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';
      return;
    }

    this.client = new Anthropic({
      apiKey,
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });

    this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';
    logger.info({ model: this.model }, 'ClaudeService initialized');
  }

  /**
   * Create a completion with automatic session tracking
   * @deprecated Use createCompletionWithUsage() to get token usage data
   */
  async createCompletion(params: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const response = await this.createCompletionWithUsage(params);
    return response.content;
  }

  /**
   * Create a completion with automatic session tracking and return token usage
   */
  async createCompletionWithUsage(params: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<ClaudeResponse> {
    if (!this.client) {
      throw new Error('Claude API not configured. Set ANTHROPIC_API_KEY in .env file');
    }

    // Track this request
    sessionTracker.trackRequest();

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature || 1.0,
        system: params.system,
        messages: params.messages,
      });

      // Extract text content from response
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      return {
        content: textContent,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (error: any) {
      // Check for rate limit error (429) or overloaded error (529 - "too fast")
      const isRateLimit = error?.status === 429 || error?.error?.type === 'rate_limit_error';
      const isOverloaded = error?.status === 529 || error?.error?.type === 'overloaded_error' ||
                           error?.message?.toLowerCase().includes('overloaded') ||
                           error?.message?.toLowerCase().includes('too fast');

      if (isRateLimit || isOverloaded) {
        const session = sessionTracker.getCurrentSession();
        const resetTime = session?.session_resets_at
          ? new Date(session.session_resets_at)
          : new Date(Date.now() + (isOverloaded ? 5 * 60 * 1000 : 5 * 60 * 60 * 1000)); // 5 min for overloaded, 5 hours for rate limit

        const errorType = isOverloaded ? 'Server overloaded (too fast)' : 'Rate limit exceeded';
        throw new RateLimitError(
          `${errorType}. Retry after ${resetTime.toISOString()}`,
          resetTime
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Test the Claude API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.createCompletion({
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Reply with "OK" if you can read this.' }],
        maxTokens: 10,
      });

      return response.includes('OK');
    } catch (error) {
      logger.error({ error }, 'ClaudeService connection test failed');
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return sessionTracker.getSessionStats();
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
