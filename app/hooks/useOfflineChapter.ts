'use client';

import { useState, useEffect, useCallback } from 'react';

interface ChapterContent {
  id: string;
  bookId: string;
  content: string;
  title: string;
  chapterNumber: number;
  cachedAt?: number;
}

const DB_NAME = 'novelforge-offline';
const DB_VERSION = 1;
const STORE_NAME = 'chapters';

/**
 * Hook for offline chapter caching using IndexedDB
 * Provides methods to cache, retrieve, and manage offline chapters
 */
export function useOfflineChapter() {
  const [isOnline, setIsOnline] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize IndexedDB
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB');
    };

    request.onsuccess = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      setDb(database);
      setIsDbReady(true);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create chapters store with indexes
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('bookId', 'bookId', { unique: false });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };

    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  // Track online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache a chapter for offline viewing
  const cacheChapter = useCallback(
    async (chapter: Omit<ChapterContent, 'cachedAt'>): Promise<boolean> => {
      if (!db || !isDbReady) return false;

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const chapterWithTimestamp: ChapterContent = {
          ...chapter,
          cachedAt: Date.now(),
        };

        const request = store.put(chapterWithTimestamp);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error('Failed to cache chapter');
          resolve(false);
        };
      });
    },
    [db, isDbReady]
  );

  // Get a cached chapter
  const getCachedChapter = useCallback(
    async (chapterId: string): Promise<ChapterContent | null> => {
      if (!db || !isDbReady) return null;

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(chapterId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('Failed to get cached chapter');
          resolve(null);
        };
      });
    },
    [db, isDbReady]
  );

  // Get all cached chapters for a book
  const getCachedChaptersForBook = useCallback(
    async (bookId: string): Promise<ChapterContent[]> => {
      if (!db || !isDbReady) return [];

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('bookId');
        const request = index.getAll(bookId);

        request.onsuccess = () => {
          const chapters = request.result || [];
          // Sort by chapter number
          chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
          resolve(chapters);
        };

        request.onerror = () => {
          console.error('Failed to get cached chapters');
          resolve([]);
        };
      });
    },
    [db, isDbReady]
  );

  // Get all cached chapters
  const getAllCachedChapters = useCallback(async (): Promise<ChapterContent[]> => {
    if (!db || !isDbReady) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to get all cached chapters');
        resolve([]);
      };
    });
  }, [db, isDbReady]);

  // Delete a cached chapter
  const deleteCachedChapter = useCallback(
    async (chapterId: string): Promise<boolean> => {
      if (!db || !isDbReady) return false;

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(chapterId);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error('Failed to delete cached chapter');
          resolve(false);
        };
      });
    },
    [db, isDbReady]
  );

  // Clear all cached chapters
  const clearAllCachedChapters = useCallback(async (): Promise<boolean> => {
    if (!db || !isDbReady) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to clear cached chapters');
        resolve(false);
      };
    });
  }, [db, isDbReady]);

  // Clear old cached chapters (older than specified days)
  const clearOldCache = useCallback(
    async (maxAgeDays: number = 30): Promise<number> => {
      if (!db || !isDbReady) return 0;

      const maxAge = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('cachedAt');
        const range = IDBKeyRange.upperBound(maxAge);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          console.error('Failed to clear old cache');
          resolve(deletedCount);
        };
      });
    },
    [db, isDbReady]
  );

  // Check if a chapter is cached
  const isChapterCached = useCallback(
    async (chapterId: string): Promise<boolean> => {
      const chapter = await getCachedChapter(chapterId);
      return chapter !== null;
    },
    [getCachedChapter]
  );

  // Get cache statistics
  const getCacheStats = useCallback(async (): Promise<{
    totalChapters: number;
    totalBooks: number;
    oldestCache: Date | null;
    newestCache: Date | null;
  }> => {
    const chapters = await getAllCachedChapters();

    if (chapters.length === 0) {
      return {
        totalChapters: 0,
        totalBooks: 0,
        oldestCache: null,
        newestCache: null,
      };
    }

    const bookIds = new Set(chapters.map((c) => c.bookId));
    const timestamps = chapters
      .map((c) => c.cachedAt)
      .filter((t): t is number => t !== undefined);

    return {
      totalChapters: chapters.length,
      totalBooks: bookIds.size,
      oldestCache: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestCache: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    };
  }, [getAllCachedChapters]);

  return {
    isOnline,
    isDbReady,
    cacheChapter,
    getCachedChapter,
    getCachedChaptersForBook,
    getAllCachedChapters,
    deleteCachedChapter,
    clearAllCachedChapters,
    clearOldCache,
    isChapterCached,
    getCacheStats,
  };
}

export type { ChapterContent };
