/**
 * Test utilities for React component and hook testing
 * Provides wrappers for React Query, custom render functions, and mock factories
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ============================================================================
// QUERY CLIENT SETUP
// ============================================================================

/**
 * Create a fresh QueryClient for testing
 * Uses shorter cache times and disables retries for predictable test behaviour
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// WRAPPER COMPONENTS
// ============================================================================

interface WrapperProps {
  children: ReactNode;
}

/**
 * Create a wrapper component with QueryClient provider
 */
export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// CUSTOM RENDER FUNCTIONS
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all required providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, ...renderOptions } = options;
  const Wrapper = createWrapper(queryClient);

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  };
}

/**
 * Custom renderHook function for testing React Query hooks
 */
export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'> & { queryClient?: QueryClient }
) {
  const { queryClient, ...hookOptions } = options || {};
  const client = queryClient || createTestQueryClient();
  const Wrapper = createWrapper(client);

  return {
    ...renderHook(hook, { wrapper: Wrapper, ...hookOptions }),
    queryClient: client,
  };
}

// ============================================================================
// FETCH MOCK UTILITIES
// ============================================================================

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: Headers;
};

/**
 * Create a mock fetch response
 */
export function createMockResponse(data: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
  };
}

/**
 * Mock fetch to return specific data for specific URLs
 */
export function mockFetch(responses: Record<string, unknown | (() => unknown)>) {
  return vi.fn().mockImplementation((url: string) => {
    const urlPath = url.replace(/^https?:\/\/[^/]+/, '');

    for (const [pattern, response] of Object.entries(responses)) {
      // Support exact match or pattern match
      if (urlPath === pattern || urlPath.includes(pattern)) {
        const data = typeof response === 'function' ? response() : response;
        return Promise.resolve(createMockResponse(data));
      }
    }

    // Default: return empty success
    return Promise.resolve(createMockResponse({}));
  });
}

/**
 * Mock fetch to fail with a specific error
 */
export function mockFetchError(status = 500, message = 'Internal Server Error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
    headers: new Headers(),
  });
}

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Factory for creating test project data
 */
export const projectFactory = {
  create: (overrides: Partial<TestProject> = {}): TestProject => ({
    id: `project-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test Project',
    genre: 'Fantasy',
    subGenre: 'Epic Fantasy',
    logline: 'A test story about testing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    ...overrides,
  }),

  createMany: (count: number, overrides: Partial<TestProject> = {}): TestProject[] => {
    return Array.from({ length: count }, (_, i) =>
      projectFactory.create({ ...overrides, title: `Test Project ${i + 1}` })
    );
  },
};

export interface TestProject {
  id: string;
  title: string;
  genre: string;
  subGenre?: string;
  logline?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

/**
 * Factory for creating test book data
 */
export const bookFactory = {
  create: (overrides: Partial<TestBook> = {}): TestBook => ({
    id: `book-${Math.random().toString(36).slice(2, 9)}`,
    projectId: 'project-1',
    title: 'Test Book',
    bookNumber: 1,
    targetWordCount: 80000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  createMany: (count: number, projectId: string): TestBook[] => {
    return Array.from({ length: count }, (_, i) =>
      bookFactory.create({ projectId, bookNumber: i + 1, title: `Book ${i + 1}` })
    );
  },
};

export interface TestBook {
  id: string;
  projectId: string;
  title: string;
  bookNumber: number;
  targetWordCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Factory for creating test chapter data
 */
export const chapterFactory = {
  create: (overrides: Partial<TestChapter> = {}): TestChapter => ({
    id: `chapter-${Math.random().toString(36).slice(2, 9)}`,
    bookId: 'book-1',
    title: 'Test Chapter',
    chapterNumber: 1,
    content: 'This is test chapter content.',
    wordCount: 5,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  createMany: (count: number, bookId: string): TestChapter[] => {
    return Array.from({ length: count }, (_, i) =>
      chapterFactory.create({
        bookId,
        chapterNumber: i + 1,
        title: `Chapter ${i + 1}`,
        content: `Content for chapter ${i + 1}.`,
      })
    );
  },
};

export interface TestChapter {
  id: string;
  bookId: string;
  title: string;
  chapterNumber: number;
  content: string;
  wordCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Factory for creating test character data
 */
export const characterFactory = {
  create: (overrides: Partial<TestCharacter> = {}): TestCharacter => ({
    id: `char-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Character',
    role: 'protagonist',
    description: 'A character for testing purposes',
    goals: ['Goal 1', 'Goal 2'],
    backstory: 'Test backstory',
    ...overrides,
  }),

  createProtagonist: (name = 'Hero'): TestCharacter =>
    characterFactory.create({ name, role: 'protagonist' }),

  createAntagonist: (name = 'Villain'): TestCharacter =>
    characterFactory.create({ name, role: 'antagonist' }),

  createSupporting: (name = 'Sidekick'): TestCharacter =>
    characterFactory.create({ name, role: 'supporting' }),
};

export interface TestCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  goals: string[];
  backstory: string;
}

/**
 * Factory for creating test story idea data
 */
export const storyIdeaFactory = {
  create: (overrides: Partial<TestStoryIdea> = {}): TestStoryIdea => ({
    id: `idea-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test Story Idea',
    genre: 'Fantasy',
    premise: 'A test premise for a story',
    status: 'saved',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  createSaved: (): TestStoryIdea =>
    storyIdeaFactory.create({ status: 'saved' }),

  createExpanded: (): TestStoryIdea =>
    storyIdeaFactory.create({ status: 'expanded' }),
};

export interface TestStoryIdea {
  id: string;
  title: string;
  genre: string;
  premise: string;
  status: string;
  createdAt: string;
}

/**
 * Factory for creating navigation counts data
 */
export const navigationCountsFactory = {
  create: (overrides: Partial<TestNavigationCounts> = {}): TestNavigationCounts => ({
    storyIdeas: 3,
    savedConcepts: 2,
    activeProjects: 1,
    ...overrides,
  }),

  empty: (): TestNavigationCounts => ({
    storyIdeas: 0,
    savedConcepts: 0,
    activeProjects: 0,
  }),
};

export interface TestNavigationCounts {
  storyIdeas: number;
  savedConcepts: number;
  activeProjects: number;
}

// ============================================================================
// WAIT UTILITIES
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for React Query to settle (no pending queries)
 */
export async function waitForQueryToSettle(queryClient: QueryClient): Promise<void> {
  await waitFor(() => !queryClient.isFetching());
}

// ============================================================================
// INDEXEDDB MOCK (for useOfflineChapter tests)
// ============================================================================

/**
 * Simple IndexedDB mock for offline chapter testing
 */
export class MockIndexedDB {
  private stores: Map<string, Map<string, unknown>> = new Map();

  createObjectStore(name: string) {
    this.stores.set(name, new Map());
    return {
      createIndex: vi.fn(),
    };
  }

  transaction(storeNames: string | string[], mode: string) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const stores = names.map(name => this.stores.get(name) || new Map());

    return {
      objectStore: (name: string) => {
        const store = this.stores.get(name) || new Map();
        return {
          get: (key: string) => ({
            onsuccess: null as ((e: { target: { result: unknown } }) => void) | null,
            onerror: null as ((e: unknown) => void) | null,
            result: store.get(key),
          }),
          put: (value: unknown, key?: string) => {
            const k = key || (value as { id: string }).id;
            store.set(k, value);
            return { onsuccess: null, onerror: null };
          },
          delete: (key: string) => {
            store.delete(key);
            return { onsuccess: null, onerror: null };
          },
          getAll: () => ({
            onsuccess: null as ((e: { target: { result: unknown[] } }) => void) | null,
            onerror: null as ((e: unknown) => void) | null,
            result: Array.from(store.values()),
          }),
          clear: () => {
            store.clear();
            return { onsuccess: null, onerror: null };
          },
        };
      },
      oncomplete: null as (() => void) | null,
      onerror: null as ((e: unknown) => void) | null,
    };
  }
}

/**
 * Setup IndexedDB mock for tests
 */
export function setupIndexedDBMock() {
  const mockDB = new MockIndexedDB();

  const mockOpen = vi.fn().mockImplementation(() => ({
    onupgradeneeded: null as ((e: { target: { result: MockIndexedDB } }) => void) | null,
    onsuccess: null as ((e: { target: { result: MockIndexedDB } }) => void) | null,
    onerror: null as ((e: unknown) => void) | null,
    result: mockDB,
  }));

  global.indexedDB = {
    open: mockOpen,
    deleteDatabase: vi.fn(),
  } as unknown as IDBFactory;

  return mockDB;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { render, renderHook } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
export { vi } from 'vitest';
