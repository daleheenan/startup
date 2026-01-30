/**
 * Test Helpers and Utilities
 * Provides common test fixtures, mock helpers, and utility functions
 */

import { jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';

// ============================================================================
// Database Mocks
// ============================================================================

/**
 * Creates a mock database instance with common methods
 */
export function createMockDatabase(): Database {
  const mockStatement = {
    run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: jest.fn().mockReturnValue(null),
    all: jest.fn().mockReturnValue([]),
    iterate: jest.fn().mockReturnValue([]),
    pluck: jest.fn().mockReturnThis(),
    expand: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    bind: jest.fn().mockReturnThis(),
    finalize: jest.fn(),
  };

  const mockDb = {
    prepare: jest.fn().mockReturnValue(mockStatement),
    exec: jest.fn(),
    transaction: jest.fn((fn: Function) => fn),
    close: jest.fn(),
    pragma: jest.fn(),
    backup: jest.fn(),
    serialize: jest.fn(),
    function: jest.fn(),
    aggregate: jest.fn(),
    loadExtension: jest.fn(),
    defaultSafeIntegers: jest.fn().mockReturnThis(),
    unsafeMode: jest.fn().mockReturnThis(),
  } as unknown as Database;

  return mockDb;
}

/**
 * Helper to set up database mock responses
 */
export function mockDbResponse(db: Database, method: 'get' | 'all' | 'run', data: any) {
  const mockStatement = (db.prepare as jest.Mock).mock.results[0]?.value || db.prepare('');
  (mockStatement[method] as jest.Mock).mockReturnValue(data);
}

// ============================================================================
// Claude API Mocks
// ============================================================================

/**
 * Creates a mock Claude API response
 */
export function createMockClaudeResponse(content: string, options: {
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage?: { input_tokens: number; output_tokens: number };
} = {}) {
  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: content }],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: options.stopReason || 'end_turn',
    stop_sequence: null,
    usage: options.usage || { input_tokens: 100, output_tokens: 200 },
  };
}

/**
 * Creates a mock streaming Claude API response
 */
export function createMockClaudeStream(content: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { type: 'message_start', message: { id: `msg_${Date.now()}`, role: 'assistant' } };
      yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };

      // Split content into chunks for realistic streaming
      const chunks = content.match(/.{1,50}/g) || [content];
      for (const chunk of chunks) {
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunk } };
      }

      yield { type: 'content_block_stop', index: 0 };
      yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 200 } };
      yield { type: 'message_stop' };
    },
  };
}

/**
 * Mock Claude service with preset responses
 */
export function createMockClaudeService(defaultResponse?: string) {
  return {
    createCompletion: jest.fn().mockResolvedValue(
      createMockClaudeResponse(defaultResponse || 'Mock response')
    ),
    streamCompletion: jest.fn().mockResolvedValue(
      createMockClaudeStream(defaultResponse || 'Mock streaming response')
    ),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Common user fixture
 */
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

/**
 * Common book fixture
 */
export const mockBook = {
  id: 1,
  user_id: 1,
  title: 'Test Novel',
  genre: 'Fantasy',
  target_word_count: 80000,
  status: 'in_progress',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Common series fixture
 */
export const mockSeries = {
  id: 1,
  user_id: 1,
  title: 'Epic Series',
  description: 'A test series',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Common character fixture
 */
export const mockCharacter = {
  id: 1,
  book_id: 1,
  name: 'John Doe',
  role: 'protagonist',
  description: 'A brave hero',
  traits: JSON.stringify(['brave', 'loyal', 'determined']),
  backstory: 'Born in a small village...',
  arc: JSON.stringify({ beginning: 'naive', end: 'experienced' }),
  created_at: new Date().toISOString(),
};

/**
 * Common chapter fixture
 */
export const mockChapter = {
  id: 1,
  book_id: 1,
  chapter_number: 1,
  title: 'The Beginning',
  content: 'Once upon a time...',
  word_count: 2500,
  status: 'complete',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Common outline fixture
 */
export const mockOutline = {
  id: 1,
  book_id: 1,
  structure_type: 'three_act',
  total_chapters: 30,
  outline_data: JSON.stringify({
    acts: [
      { name: 'Act I', chapters: 10 },
      { name: 'Act II', chapters: 15 },
      { name: 'Act III', chapters: 5 },
    ],
  }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Common story DNA fixture
 */
export const mockStoryDNA = {
  id: 1,
  book_id: 1,
  themes: JSON.stringify(['redemption', 'sacrifice']),
  tone: 'dark',
  pacing: 'fast',
  voice: 'third-person limited',
  style_notes: 'Descriptive prose with sharp dialogue',
  created_at: new Date().toISOString(),
};

/**
 * Creates a mock express request object
 */
export function createMockRequest(options: {
  body?: any;
  params?: any;
  query?: any;
  user?: any;
  headers?: any;
} = {}) {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || mockUser,
    headers: options.headers || {},
    get: jest.fn((header: string) => options.headers?.[header]),
  };
}

/**
 * Creates a mock express response object
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Creates a mock express next function
 */
export function createMockNext() {
  return jest.fn();
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Captures console output during test execution
 */
export function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = jest.fn((...args) => logs.push(args.join(' ')));
  console.error = jest.fn((...args) => errors.push(args.join(' ')));
  console.warn = jest.fn((...args) => warns.push(args.join(' ')));

  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Resets all mocks to their initial state
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * Helper to test async errors
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect((error as Error).message).toContain(expectedError);
      } else {
        expect((error as Error).message).toMatch(expectedError);
      }
    }
  }
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generates a random ID
 */
export function generateId(): number {
  return Math.floor(Math.random() * 1000000);
}

/**
 * Generates a mock timestamp
 */
export function generateTimestamp(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Creates multiple mock items using a factory function
 */
export function createMockArray<T>(
  factory: (index: number) => T,
  count: number
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}

/**
 * Creates a mock book with custom overrides
 */
export function createMockBook(overrides: Partial<typeof mockBook> = {}) {
  return { ...mockBook, ...overrides };
}

/**
 * Creates a mock character with custom overrides
 */
export function createMockCharacter(overrides: Partial<typeof mockCharacter> = {}) {
  return { ...mockCharacter, ...overrides };
}

/**
 * Creates a mock chapter with custom overrides
 */
export function createMockChapter(overrides: Partial<typeof mockChapter> = {}) {
  return { ...mockChapter, ...overrides };
}
