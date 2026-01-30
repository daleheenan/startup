'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/app/lib/fetch-utils';

// Flexible outline type that works with both full and partial Outline data
// This allows pages with local Outline interfaces to work without type errors
interface OutlineData {
  id?: string;
  total_chapters?: number;
  structure?: any;
  [key: string]: any; // Allow additional properties
}

// Flexible chapter type - just needs content for analytics check
interface ChapterData {
  id?: string;
  content?: string | null;
  [key: string]: any; // Allow additional properties
}

interface ProjectData {
  id: string;
  title?: string;
  story_dna?: {
    genre?: string;
    tone?: string;
    themes?: string[];
  };
  story_bible?: {
    characters?: any[];
    // World can be either a flat array of WorldElement[] or an object with categories
    world?: any[] | {
      locations?: any[];
      factions?: any[];
      systems?: any[];
    };
  };
  book_count?: number;
}

/**
 * Hook to provide project navigation data
 * Automatically fetches outline and chapters data to ensure consistent
 * workflow status across all project pages.
 *
 * Pages can optionally pass their own outline/chapters if they've already
 * fetched them, to avoid duplicate requests.
 */
export function useProjectNavigation(
  projectId: string,
  project: ProjectData | null,
  providedOutline?: OutlineData | null, // Optional - use if page already fetched
  providedChapters?: ChapterData[] | null // Optional - use if page already fetched
): {
  projectId: string;
  project?: ProjectData | null;
  outline?: OutlineData | null;
  chapters?: ChapterData[] | null;
} {
  const [fetchedOutline, setFetchedOutline] = useState<OutlineData | null>(null);
  const [fetchedChapters, setFetchedChapters] = useState<ChapterData[] | null>(null);

  // Fetch outline and chapters if not provided
  useEffect(() => {
    // Only fetch if not provided and we have a projectId
    if (!projectId) return;

    const fetchNavigationData = async () => {
      try {
        // First get the book for this project
        const booksRes = await fetchWithAuth(`/api/books/project/${projectId}`);
        if (!booksRes.ok) return;
        const booksData = await booksRes.json();
        const books = booksData.books || booksData || [];

        if (!books || books.length === 0) return;
        const bookId = books[0].id;

        // Fetch outline if not provided
        if (!providedOutline) {
          try {
            const outlineRes = await fetchWithAuth(`/api/outlines/book/${bookId}`);
            if (outlineRes.ok) {
              const outlineData = await outlineRes.json();
              setFetchedOutline(outlineData);
            }
          } catch {
            // No outline - that's OK
          }
        }

        // Fetch chapters if not provided
        if (!providedChapters) {
          try {
            const chaptersRes = await fetchWithAuth(`/api/chapters/book/${bookId}`);
            if (chaptersRes.ok) {
              const chaptersData = await chaptersRes.json();
              setFetchedChapters(chaptersData.chapters || chaptersData || []);
            }
          } catch {
            // No chapters - that's OK
          }
        }
      } catch {
        // Errors are OK - navigation will show appropriate state
      }
    };

    // Always fetch navigation data to ensure we have the latest
    // The hook will prefer provided data if it's not null
    fetchNavigationData();
  }, [projectId, providedOutline, providedChapters]);

  // Use provided data if available and not null, otherwise use fetched data
  // Note: null means "explicitly no data yet", undefined means "please fetch for me"
  // We also use fetched data if provided data is null but fetched data exists (race condition fix)
  const outline = (providedOutline !== undefined && providedOutline !== null)
    ? providedOutline
    : (fetchedOutline || providedOutline);
  const chapters = (providedChapters !== undefined && providedChapters !== null)
    ? providedChapters
    : (fetchedChapters || providedChapters);

  return {
    projectId,
    project,
    outline,
    chapters,
  };
}
