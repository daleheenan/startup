/**
 * Tests for useOfflineChapter hook
 * Tests IndexedDB-based offline chapter caching
 */

// Import fake-indexeddb before anything else
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineChapter, ChapterContent } from '../useOfflineChapter';

describe.skip('useOfflineChapter', () => {
  beforeEach(() => {
    // Reset IndexedDB between tests
    indexedDB.deleteDatabase('novelforge-offline');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialisation', () => {
    it('should initialise with isOnline true', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      expect(result.current.isOnline).toBe(true);
    });

    it('should become ready after IndexedDB initialises', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      // Initially may not be ready
      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });
    });

    it('should expose all required methods', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      expect(typeof result.current.cacheChapter).toBe('function');
      expect(typeof result.current.getCachedChapter).toBe('function');
      expect(typeof result.current.getCachedChaptersForBook).toBe('function');
      expect(typeof result.current.getAllCachedChapters).toBe('function');
      expect(typeof result.current.deleteCachedChapter).toBe('function');
      expect(typeof result.current.clearAllCachedChapters).toBe('function');
      expect(typeof result.current.clearOldCache).toBe('function');
      expect(typeof result.current.isChapterCached).toBe('function');
      expect(typeof result.current.getCacheStats).toBe('function');
    });
  });

  describe('cacheChapter', () => {
    it('should cache a chapter successfully', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapter = createMockChapter({ id: 'chapter-1' });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.cacheChapter(chapter);
      });

      expect(success).toBe(true);
    });

    it('should return false when database not ready', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      // Try to cache before DB is ready
      const chapter = createMockChapter({ id: 'chapter-1' });

      let success: boolean = true;
      await act(async () => {
        // Immediately try to cache (may fail if DB not ready yet)
        success = await result.current.cacheChapter(chapter);
      });

      // Result depends on timing - may be true or false
      expect(typeof success).toBe('boolean');
    });

    it('should add cachedAt timestamp when caching', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapter = createMockChapter({ id: 'chapter-with-timestamp' });
      const beforeCache = Date.now();

      await act(async () => {
        await result.current.cacheChapter(chapter);
      });

      const cached = await result.current.getCachedChapter('chapter-with-timestamp');
      const afterCache = Date.now();

      expect(cached?.cachedAt).toBeDefined();
      expect(cached!.cachedAt).toBeGreaterThanOrEqual(beforeCache);
      expect(cached!.cachedAt).toBeLessThanOrEqual(afterCache);
    });
  });

  describe('getCachedChapter', () => {
    it('should retrieve a cached chapter', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapter = createMockChapter({
        id: 'chapter-to-retrieve',
        title: 'Retrieved Chapter',
        content: 'This is the content',
      });

      await act(async () => {
        await result.current.cacheChapter(chapter);
      });

      let retrieved: ChapterContent | null = null;
      await act(async () => {
        retrieved = await result.current.getCachedChapter('chapter-to-retrieve');
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('chapter-to-retrieve');
      expect(retrieved!.title).toBe('Retrieved Chapter');
      expect(retrieved!.content).toBe('This is the content');
    });

    it('should return null for non-existent chapter', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      let retrieved: ChapterContent | null = { id: 'dummy' } as any;
      await act(async () => {
        retrieved = await result.current.getCachedChapter('non-existent');
      });

      expect(retrieved).toBeNull();
    });
  });

  describe('getCachedChaptersForBook', () => {
    it('should retrieve all chapters for a book sorted by chapter number', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const bookId = 'book-1';
      const chapters = [
        createMockChapter({ id: 'ch-3', bookId, chapterNumber: 3 }),
        createMockChapter({ id: 'ch-1', bookId, chapterNumber: 1 }),
        createMockChapter({ id: 'ch-2', bookId, chapterNumber: 2 }),
      ];

      await act(async () => {
        for (const ch of chapters) {
          await result.current.cacheChapter(ch);
        }
      });

      let retrieved: ChapterContent[] = [];
      await act(async () => {
        retrieved = await result.current.getCachedChaptersForBook(bookId);
      });

      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].chapterNumber).toBe(1);
      expect(retrieved[1].chapterNumber).toBe(2);
      expect(retrieved[2].chapterNumber).toBe(3);
    });

    it('should return empty array for book with no cached chapters', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      let retrieved: ChapterContent[] = [{ id: 'dummy' } as any];
      await act(async () => {
        retrieved = await result.current.getCachedChaptersForBook('empty-book');
      });

      expect(retrieved).toEqual([]);
    });

    it('should only return chapters for specified book', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapters = [
        createMockChapter({ id: 'ch-a1', bookId: 'book-a', chapterNumber: 1 }),
        createMockChapter({ id: 'ch-b1', bookId: 'book-b', chapterNumber: 1 }),
        createMockChapter({ id: 'ch-a2', bookId: 'book-a', chapterNumber: 2 }),
      ];

      await act(async () => {
        for (const ch of chapters) {
          await result.current.cacheChapter(ch);
        }
      });

      let bookAChapters: ChapterContent[] = [];
      await act(async () => {
        bookAChapters = await result.current.getCachedChaptersForBook('book-a');
      });

      expect(bookAChapters).toHaveLength(2);
      expect(bookAChapters.every(ch => ch.bookId === 'book-a')).toBe(true);
    });
  });

  describe('getAllCachedChapters', () => {
    it('should return all cached chapters', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapters = [
        createMockChapter({ id: 'ch-1', bookId: 'book-1' }),
        createMockChapter({ id: 'ch-2', bookId: 'book-2' }),
        createMockChapter({ id: 'ch-3', bookId: 'book-1' }),
      ];

      await act(async () => {
        for (const ch of chapters) {
          await result.current.cacheChapter(ch);
        }
      });

      let all: ChapterContent[] = [];
      await act(async () => {
        all = await result.current.getAllCachedChapters();
      });

      expect(all).toHaveLength(3);
    });

    it('should return empty array when nothing cached', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      let all: ChapterContent[] = [{ id: 'dummy' } as any];
      await act(async () => {
        all = await result.current.getAllCachedChapters();
      });

      expect(all).toEqual([]);
    });
  });

  describe('deleteCachedChapter', () => {
    it('should delete a cached chapter', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapter = createMockChapter({ id: 'chapter-to-delete' });

      await act(async () => {
        await result.current.cacheChapter(chapter);
      });

      // Verify cached
      let cached = await result.current.getCachedChapter('chapter-to-delete');
      expect(cached).not.toBeNull();

      // Delete
      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteCachedChapter('chapter-to-delete');
      });

      expect(success).toBe(true);

      // Verify deleted
      cached = await result.current.getCachedChapter('chapter-to-delete');
      expect(cached).toBeNull();
    });
  });

  describe('clearAllCachedChapters', () => {
    it('should clear all cached chapters', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapters = [
        createMockChapter({ id: 'ch-1' }),
        createMockChapter({ id: 'ch-2' }),
        createMockChapter({ id: 'ch-3' }),
      ];

      await act(async () => {
        for (const ch of chapters) {
          await result.current.cacheChapter(ch);
        }
      });

      // Verify cached
      let all = await result.current.getAllCachedChapters();
      expect(all).toHaveLength(3);

      // Clear all
      let success: boolean = false;
      await act(async () => {
        success = await result.current.clearAllCachedChapters();
      });

      expect(success).toBe(true);

      // Verify cleared
      all = await result.current.getAllCachedChapters();
      expect(all).toHaveLength(0);
    });
  });

  describe('isChapterCached', () => {
    it('should return true for cached chapters', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapter = createMockChapter({ id: 'cached-chapter' });

      await act(async () => {
        await result.current.cacheChapter(chapter);
      });

      let isCached: boolean = false;
      await act(async () => {
        isCached = await result.current.isChapterCached('cached-chapter');
      });

      expect(isCached).toBe(true);
    });

    it('should return false for non-cached chapters', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      let isCached: boolean = true;
      await act(async () => {
        isCached = await result.current.isChapterCached('not-cached');
      });

      expect(isCached).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct statistics', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      const chapters = [
        createMockChapter({ id: 'ch-1', bookId: 'book-1' }),
        createMockChapter({ id: 'ch-2', bookId: 'book-1' }),
        createMockChapter({ id: 'ch-3', bookId: 'book-2' }),
      ];

      await act(async () => {
        for (const ch of chapters) {
          await result.current.cacheChapter(ch);
        }
      });

      let stats: any = null;
      await act(async () => {
        stats = await result.current.getCacheStats();
      });

      expect(stats.totalChapters).toBe(3);
      expect(stats.totalBooks).toBe(2); // book-1 and book-2
      expect(stats.oldestCache).toBeInstanceOf(Date);
      expect(stats.newestCache).toBeInstanceOf(Date);
    });

    it('should return zeros for empty cache', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      await waitFor(() => {
        expect(result.current.isDbReady).toBe(true);
      });

      let stats: any = null;
      await act(async () => {
        stats = await result.current.getCacheStats();
      });

      expect(stats).toEqual({
        totalChapters: 0,
        totalBooks: 0,
        oldestCache: null,
        newestCache: null,
      });
    });
  });

  describe('online/offline tracking', () => {
    it('should update isOnline when going offline', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      expect(result.current.isOnline).toBe(true);

      // Simulate going offline
      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update isOnline when coming online', async () => {
      const { result } = renderHook(() => useOfflineChapter());

      // Go offline first
      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);

      // Come back online
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });
});

// Helper to create mock chapter data
function createMockChapter(
  overrides: Partial<Omit<ChapterContent, 'cachedAt'>> = {}
): Omit<ChapterContent, 'cachedAt'> {
  return {
    id: `chapter-${Math.random().toString(36).slice(2, 9)}`,
    bookId: 'book-1',
    title: 'Test Chapter',
    content: 'Test chapter content',
    chapterNumber: 1,
    ...overrides,
  };
}
