'use client';

import { useMemo, useState, useEffect } from 'react';
import type { CreationProgressData, CreationStep } from '@/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// Helper to count world elements regardless of structure
function countWorldElements(world: any): number {
  if (!world) return 0;
  if (Array.isArray(world)) {
    return world.length;
  }
  // Object with categories
  return (
    (world.locations?.length || 0) +
    (world.factions?.length || 0) +
    (world.systems?.length || 0)
  );
}

// Helper to check if world has elements
function hasWorldElements(world: any): boolean {
  return countWorldElements(world) > 0;
}

interface BookData {
  id: string;
  book_number: number;
  chapters?: any[];
}

export function useProjectProgress(project: ProjectData | null, books: BookData[] = []) {
  const progressData: CreationProgressData = useMemo(() => {
    if (!project) {
      return {
        steps: [],
        completedSteps: [],
        percentComplete: 0,
        canGenerate: false,
      };
    }

    const steps: CreationStep[] = [
      {
        id: 'concept',
        name: 'Story Concept',
        route: `/projects/${project.id}`,
        required: true,
        icon: '📖',
      },
      {
        id: 'characters',
        name: 'Characters',
        route: `/projects/${project.id}/characters`,
        required: true,
        icon: '👥',
      },
      {
        id: 'world',
        name: 'World Building',
        route: `/projects/${project.id}/world`,
        required: false,
        icon: '🌍',
      },
      {
        id: 'plot',
        name: 'Plot Structure',
        route: `/projects/${project.id}/plot`,
        required: false,
        icon: '📊',
      },
      {
        id: 'outline',
        name: 'Outline',
        route: `/projects/${project.id}/outline`,
        required: true,
        icon: '📝',
      },
    ];

    const completedSteps: string[] = [];

    // Check concept (has title and genre)
    if (project.title && project.story_dna?.genre) {
      completedSteps.push('concept');
    }

    // Check characters (has at least one character)
    if (project.story_bible?.characters && project.story_bible.characters.length > 0) {
      completedSteps.push('characters');
    }

    // Check world building (has any world elements - optional)
    if (hasWorldElements(project.story_bible?.world)) {
      completedSteps.push('world');
    }

    // Check plot structure (optional - we'll check if plot layers exist)
    // For now, we'll skip this check since we need to query the database
    // This can be enhanced later with actual plot data

    // Check outline (has at least one book with chapters - required for generation)
    const firstBook = books[0];
    if (firstBook && firstBook.chapters && firstBook.chapters.length > 0) {
      completedSteps.push('outline');
    }

    // Calculate required vs optional completion
    const requiredSteps = steps.filter((s) => s.required);
    const completedRequiredSteps = requiredSteps.filter((s) =>
      completedSteps.includes(s.id)
    );

    // Percent complete based on all steps (required + optional)
    const percentComplete = Math.round((completedSteps.length / steps.length) * 100);

    // Can generate if all required steps are complete
    const canGenerate = completedRequiredSteps.length === requiredSteps.length;

    return {
      steps,
      completedSteps,
      percentComplete,
      canGenerate,
    };
  }, [project, books]);

  return progressData;
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
        const token = localStorage.getItem('novelforge_token');
        if (!token) return;

        // First get the book for this project
        const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!booksRes.ok) return;
        const booksData = await booksRes.json();
        const books = booksData.books || booksData || [];

        if (!books || books.length === 0) return;
        const bookId = books[0].id;

        // Fetch outline if not provided
        if (!providedOutline) {
          try {
            const outlineRes = await fetch(`${API_BASE_URL}/api/outlines/book/${bookId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
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
            const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${bookId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
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

    // Only fetch if we need to
    if (!providedOutline || !providedChapters) {
      fetchNavigationData();
    }
  }, [projectId, providedOutline, providedChapters]);

  // Use provided data if available, otherwise use fetched data
  const outline = providedOutline !== undefined ? providedOutline : fetchedOutline;
  const chapters = providedChapters !== undefined ? providedChapters : fetchedChapters;

  return {
    projectId,
    project,
    outline,
    chapters,
  };
}
