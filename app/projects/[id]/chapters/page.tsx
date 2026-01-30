'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import BookVersionSelector from '@/app/components/BookVersionSelector';
import { fetchWithAuth } from '../../../lib/fetch-utils';
import { colors, borderRadius, spacing, typography, transitions } from '../../../lib/design-tokens';
import CollapsibleSection from '../../../components/CollapsibleSection';
import AgentWorkflowVisualization from '../../../components/AgentWorkflowVisualization';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'locked';
  word_count: number;
  is_locked?: boolean;
  created_at: string;
  updated_at: string;
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  chapter_count: number;
}

/**
 * Chapters Management Page
 *
 * Provides overview and management for all chapters in a project:
 * - Chapter list with status indicators
 * - Search and filter functionality
 * - Quick navigation to chapter editor
 * - Chapter reordering (future)
 * - Bulk actions (future)
 *
 * Resolves Issue #26 from UX Review Report
 */
export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);  // Initial page load
  const [chaptersLoading, setChaptersLoading] = useState(false);  // Chapters being fetched
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Note: Book selector removed - page always uses first book (projects are single-book)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [hasQueuedJobs, setHasQueuedJobs] = useState(false);
  const [versionLoaded, setVersionLoaded] = useState(false);
  const [selectedVersionHasNoData, setSelectedVersionHasNoData] = useState(false);


  // Fetch chapters for a specific book with optional version filter
  const fetchChaptersForBook = useCallback(async (bookId: string, versionId?: string | null) => {
    // Use the correct endpoint: /api/chapters/book/:bookId
    let url = `/api/chapters/book/${bookId}`;
    if (versionId) {
      url += `?versionId=${versionId}`;
    }
    const chaptersRes = await fetchWithAuth(url);
    if (chaptersRes.ok) {
      const data = await chaptersRes.json();
      // API returns { chapters: [...] } or just an array
      return (data.chapters || data) as Chapter[];
    }
    return [];
  }, []);

  // Fetch chapters for a specific version (called when version is selected/loaded)
  // bookIdOverride allows passing the book ID directly to avoid race conditions with state
  const fetchChaptersForVersion = async (versionId: string, bookIdOverride?: string) => {
    try {
      // Use override if provided, otherwise use first book
      const effectiveBookId = bookIdOverride || books[0]?.id;

      console.log('[Chapters] fetchChaptersForVersion called:', { versionId, bookIdOverride, effectiveBookId, booksCount: books.length });

      if (!effectiveBookId) {
        console.warn('[Chapters] No effective book ID, cannot fetch chapters');
        return;
      }

      setChaptersLoading(true);
      const bookChapters = await fetchChaptersForBook(effectiveBookId, versionId);
      console.log('[Chapters] Fetched chapters:', bookChapters.length);
      setChapters(bookChapters);
    } catch (err: any) {
      console.error('Error fetching chapters for version:', err);
    } finally {
      setChaptersLoading(false);
    }
  };

  // Initial data load - fetch project and books only, defer chapter loading until version is known
  useEffect(() => {
    fetchProjectAndBooksOnly();
  }, [projectId]);

  // Fetch only project and book metadata (not chapters) on initial load
  const fetchProjectAndBooksOnly = async () => {
    try {
      setInitialLoading(true);

      // Fetch project info
      const projectRes = await fetchWithAuth(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // Fetch books (without chapters initially)
      const booksRes = await fetchWithAuth(`/api/books/project/${projectId}`);
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        const booksArray: Book[] = (booksData.books || []).map((book: any) => ({
          id: book.id,
          project_id: book.project_id,
          book_number: book.book_number,
          title: book.title,
          chapter_count: book.chapter_count || 0,
        }));
        setBooks(booksArray);
      }

      // Check if there are queued jobs for this project
      try {
        const progressRes = await fetchWithAuth(`/api/projects/${projectId}/progress`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const hasJobs = (progressData.queue?.pending || 0) + (progressData.queue?.running || 0) > 0;
          setHasQueuedJobs(hasJobs);
        }
      } catch {
        // No progress data
      }

      // Set initialLoading to false so the page renders and the BookVersionSelector can load
      // The version selector will trigger chapter loading via onVersionChange callback
      setInitialLoading(false);
    } catch (err: any) {
      console.error('Error fetching project/books:', err);
      setError(err.message || 'Failed to load project');
      setInitialLoading(false);
    }
  };

  // Refetch chapters when BOOK selection changes (not version - that's handled by onVersionChange)
  const fetchChaptersData = async () => {
    try {
      setChaptersLoading(true);

      // Use optimised endpoint to fetch project, books, and chapters in a single request
      // This fixes the N+1 query problem (was making N API calls for N books)
      const booksWithChaptersRes = await fetchWithAuth(`/api/projects/${projectId}/books-with-chapters`);
      if (!booksWithChaptersRes.ok) {
        const errorData = await booksWithChaptersRes.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch chapters (HTTP ${booksWithChaptersRes.status})`);
      }

      const data = await booksWithChaptersRes.json();

      // Extract project
      setProject(data.project);

      // Extract books (without chapters for the books array)
      const booksData: Book[] = data.books.map((book: any) => ({
        id: book.id,
        project_id: book.project_id,
        book_number: book.book_number,
        title: book.title,
        chapter_count: book.chapterCount,
      }));
      setBooks(booksData);

      // Flatten all chapters from all books
      const allChapters: Chapter[] = data.books.flatMap((book: any) =>
        book.chapters.map((ch: any) => ({
          ...ch,
          book_id: book.id,
        }))
      );

      setChapters(allChapters);

      // Check if there are queued jobs for this project
      try {
        const progressRes = await fetchWithAuth(`/api/projects/${projectId}/progress`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const hasJobs = (progressData.queue?.pending || 0) + (progressData.queue?.running || 0) > 0;
          setHasQueuedJobs(hasJobs);
        }
      } catch {
        // No progress data
      }
    } catch (err: any) {
      console.error('Error fetching chapters:', err);
      setError(err.message || 'Failed to load chapters');
    } finally {
      setChaptersLoading(false);
    }
  };

  // Filter chapters based on search and filters
  const filteredChapters = chapters.filter((chapter) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = chapter.title?.toLowerCase().includes(query);
      const matchesNumber = chapter.chapter_number.toString().includes(query);
      if (!matchesTitle && !matchesNumber) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (chapter.is_locked && statusFilter !== 'locked') return false;
      if (!chapter.is_locked && chapter.status !== statusFilter) return false;
    }

    return true;
  });

  // Get status colour and label
  const getStatusInfo = (chapter: Chapter) => {
    if (chapter.is_locked) {
      return {
        colour: colors.text.disabled,
        label: 'Locked',
        icon: '🔒',
        bg: colors.background.surfaceHover,
      };
    }
    switch (chapter.status) {
      case 'completed':
        return {
          colour: colors.semantic.successDark,
          label: 'Completed',
          icon: '✓',
          bg: colors.semantic.successLight,
        };
      case 'in_progress':
        return {
          colour: colors.semantic.info,
          label: 'In Progress',
          icon: '►',
          bg: colors.semantic.infoLight,
        };
      case 'draft':
        return {
          colour: colors.semantic.warning,
          label: 'Draft',
          icon: '○',
          bg: colors.semantic.warningLight,
        };
      default:
        return {
          colour: colors.text.tertiary,
          label: 'Unknown',
          icon: '?',
          bg: colors.background.surfaceHover,
        };
    }
  };

  // Get book title for a chapter
  const getBookTitle = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book ? `${book.title} (Book ${book.book_number})` : 'Unknown Book';
  };

  // Only show full-page loading during initial load (before version selector can mount)
  if (initialLoading) {
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Chapters' }}
        projectId={projectId}
      >
        <div style={{ padding: spacing[8], textAlign: 'center' }}>
          <p style={{ color: colors.text.secondary }}>Loading project...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Chapters', subtitle: 'Unable to load chapters' }}
        projectId={projectId}
      >
        <div style={{
          maxWidth: '500px',
          margin: '2rem auto',
          padding: spacing[8],
          textAlign: 'center',
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: spacing[4] }}>📚</div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}>
            Chapters Not Available
          </h2>
          <p style={{
            color: colors.text.secondary,
            marginBottom: spacing[4],
            fontSize: typography.fontSize.base,
          }}>
            {error}
          </p>
          <p style={{
            color: colors.text.tertiary,
            marginBottom: spacing[6],
            fontSize: typography.fontSize.sm,
          }}>
            Make sure you have generated an outline and started chapter generation first.
          </p>
          <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={fetchChaptersData}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                background: colors.brand.gradient,
                color: colors.text.inverse,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Retry
            </button>
            <Link
              href={`/projects/${projectId}/outline`}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                background: colors.background.surface,
                color: colors.text.primary,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                textDecoration: 'none',
                fontWeight: typography.fontWeight.medium,
              }}
            >
              Go to Outline
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{ title: project?.title || 'Loading...', subtitle: `Manage and edit ${chapters.length} chapter${chapters.length !== 1 ? 's' : ''}` }}
      projectId={projectId}
    >
      {/* Agent Workflow Visualization */}
      {(hasQueuedJobs || chapters.length > 0) && (
        <CollapsibleSection
          sectionId={`chapters-workflow-${projectId}`}
          title="Generation Pipeline"
          description="Track chapter generation through 15 specialist agents"
          defaultOpen={hasQueuedJobs}
        >
          <AgentWorkflowVisualization
            projectId={projectId}
            bookId={books[0]?.id}
            showMultipleChapters={true}
          />
        </CollapsibleSection>
      )}

      {/* Filters and Search */}
      <div
        style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          padding: spacing[6],
          marginBottom: spacing[6],
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[4],
          }}
        >
          {/* Search */}
          <div>
            <label
              htmlFor="chapter-search"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Search Chapters
            </label>
            <input
              id="chapter-search"
              type="text"
              placeholder="Search by title or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status-filter"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="draft">Draft</option>
              <option value="locked">Locked</option>
            </select>
          </div>

          {/* Version Selector - always show when we have books */}
          {books.length > 0 && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.secondary,
                  marginBottom: spacing[2],
                }}
              >
                Version
              </label>
              <BookVersionSelector
                bookId={books[0]?.id}
                compact={true}
                onVersionChange={(version) => {
                  console.log('[Chapters] onVersionChange called:', { versionId: version.id, versionNumber: version.version_number, actualChapterCount: (version as any).actual_chapter_count, chapterCount: version.chapter_count, bookId: books[0]?.id });

                  setSelectedVersionId(version.id);
                  setVersionLoaded(true);

                  // Get the actual chapter count for this version
                  const actualChapterCount = (version as any).actual_chapter_count ?? (version as any).chapter_count ?? 0;

                  // If version has no chapters, show "no data" state
                  if (actualChapterCount === 0) {
                    console.log('[Chapters] Version has no chapters, showing no data state');
                    setSelectedVersionHasNoData(true);
                    setChapters([]);
                    setChaptersLoading(false);
                  } else {
                    console.log('[Chapters] Version has chapters, fetching...');
                    setSelectedVersionHasNoData(false);
                    // Fetch chapters for this version
                    fetchChaptersForVersion(version.id, books[0]?.id);
                  }
                }}
              />
            </div>
          )}

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: colors.background.surfaceHover,
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  transition: transitions.colors,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background.surfaceHover;
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        <div
          style={{
            marginTop: spacing[4],
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
          }}
        >
          Showing {filteredChapters.length} of {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Message when selected version has no chapters yet */}
      {selectedVersionHasNoData && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: borderRadius.lg,
          padding: spacing[8],
          marginBottom: spacing[6],
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: spacing[4] }}>📝</div>
          <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#92400E', marginBottom: spacing[2] }}>
            No Chapters for This Version
          </h3>
          <p style={{ color: '#92400E', fontSize: typography.fontSize.base, marginBottom: spacing[4] }}>
            This version hasn&apos;t been generated yet. You need to create an outline and start chapter generation first.
          </p>
          <Link
            href={`/projects/${projectId}/outline`}
            style={{
              display: 'inline-block',
              padding: `${spacing[3]} ${spacing[6]}`,
              background: colors.brand.gradient,
              color: colors.text.inverse,
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
              textDecoration: 'none',
            }}
          >
            Go to Outline
          </Link>
        </div>
      )}

      {/* Loading indicator for chapters */}
      {chaptersLoading && (
        <div style={{ padding: spacing[8], textAlign: 'center' }}>
          <p style={{ color: colors.text.secondary }}>Loading chapters...</p>
        </div>
      )}

      {/* Chapters List */}
      {!chaptersLoading && !selectedVersionHasNoData && filteredChapters.length === 0 ? (
        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[8],
            textAlign: 'center',
          }}
        >
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            {searchQuery || statusFilter !== 'all'
              ? 'No chapters match your filters'
              : 'No chapters found'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                background: colors.brand.gradient,
                color: colors.text.inverse,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : !chaptersLoading && !selectedVersionHasNoData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {filteredChapters.map((chapter) => {
            const statusInfo = getStatusInfo(chapter);
            return (
              <Link
                key={chapter.id}
                href={`/projects/${projectId}/chapters/${chapter.id}`}
                style={{
                  display: 'block',
                  background: colors.background.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderLeft: `4px solid ${statusInfo.colour}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing[5],
                  textDecoration: 'none',
                  transition: transitions.all,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background.surfaceHover;
                  e.currentTarget.style.borderColor = colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background.surface;
                  e.currentTarget.style.borderColor = colors.border.default;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[4] }}>
                  {/* Chapter Number */}
                  <div
                    style={{
                      minWidth: '60px',
                      height: '60px',
                      background: statusInfo.bg,
                      borderRadius: borderRadius.md,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Ch.
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.xl,
                        color: statusInfo.colour,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      {chapter.chapter_number}
                    </span>
                  </div>

                  {/* Chapter Info */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}
                    >
                      {chapter.title || `Chapter ${chapter.chapter_number}`}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: spacing[3],
                        alignItems: 'center',
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {/* Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          padding: `${spacing[1]} ${spacing[3]}`,
                          background: statusInfo.bg,
                          color: statusInfo.colour,
                          borderRadius: borderRadius.sm,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        <span aria-hidden="true">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>

                      {/* Word Count */}
                      <span style={{ color: colors.text.tertiary }}>
                        {chapter.word_count.toLocaleString()} words
                      </span>

                      {/* Book (if multiple books) */}
                      {books.length > 1 && (
                        <span style={{ color: colors.text.tertiary }}>
                          {getBookTitle(chapter.book_id)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Arrow */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: colors.brand.primary,
                      fontSize: typography.fontSize.xl,
                    }}
                    aria-hidden="true"
                  >
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
