'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '../../../components/shared/PageLayout';
import LoadingState from '../../../components/shared/LoadingState';
import ErrorMessage from '../../../components/shared/ErrorMessage';
import { fetchJson } from '../../../lib/fetch-utils';
import { useProjectNavigation } from '../../../hooks/useProjectProgress';
import { colors, borderRadius } from '../../../lib/constants';
import { card } from '../../../lib/styles';

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  content: string | null;
  status: string;
  word_count: number;
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: string;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  author_name?: string | null;
}

export default function ReadBookPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation hook
  const navigation = useProjectNavigation(projectId, project, null, chapters);

  // Fetch project and books
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const projectData = await fetchJson<Project>(`/api/projects/${projectId}`);
      setProject(projectData);

      // Fetch books
      const booksData = await fetchJson<Book[]>(`/api/books/project/${projectId}`);
      setBooks(booksData);

      if (booksData.length > 0) {
        const firstBook = booksData[0];
        setSelectedBookId(firstBook.id);

        // Fetch chapters for first book
        const chaptersResponse = await fetchJson<{ chapters: Chapter[] } | Chapter[]>(
          `/api/chapters/book/${firstBook.id}`
        );
        const chaptersData = Array.isArray(chaptersResponse)
          ? chaptersResponse
          : chaptersResponse?.chapters || [];
        setChapters(chaptersData);

        // Select first chapter with content
        const firstWithContent = chaptersData.find(ch => ch.content);
        if (firstWithContent) {
          setSelectedChapter(firstWithContent);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load book');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle book selection change
  const handleBookChange = async (bookId: string) => {
    setSelectedBookId(bookId);
    setSelectedChapter(null);

    try {
      const chaptersResponse = await fetchJson<{ chapters: Chapter[] } | Chapter[]>(
        `/api/chapters/book/${bookId}`
      );
      const chaptersData = Array.isArray(chaptersResponse)
        ? chaptersResponse
        : chaptersResponse?.chapters || [];
      setChapters(chaptersData);

      const firstWithContent = chaptersData.find(ch => ch.content);
      if (firstWithContent) {
        setSelectedChapter(firstWithContent);
      }
    } catch (err: any) {
      console.error('Error fetching chapters:', err);
    }
  };

  // Navigate chapters
  const goToChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    // Scroll to top of reading area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousChapter = () => {
    if (!selectedChapter) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter.id);
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      if (prevChapter.content) {
        goToChapter(prevChapter);
      }
    }
  };

  const goToNextChapter = () => {
    if (!selectedChapter) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter.id);
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      if (nextChapter.content) {
        goToChapter(nextChapter);
      }
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your book..." />;
  }

  if (error || !project) {
    return (
      <PageLayout
        title="Error"
        backLink={`/projects/${projectId}`}
        backText="Back to Project"
      >
        <ErrorMessage message={error || 'Failed to load book'} />
      </PageLayout>
    );
  }

  const chaptersWithContent = chapters.filter(ch => ch.content);
  const currentChapterIndex = selectedChapter
    ? chaptersWithContent.findIndex(ch => ch.id === selectedChapter.id)
    : -1;
  const hasPrevious = currentChapterIndex > 0;
  const hasNext = currentChapterIndex < chaptersWithContent.length - 1;

  const subtitle = (
    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem', color: colors.textSecondary }}>
      <span>{project.genre}</span>
      {project.author_name && (
        <>
          <span>by</span>
          <span style={{ fontWeight: 500 }}>{project.author_name}</span>
        </>
      )}
    </div>
  );

  return (
    <PageLayout
      title={project.title}
      subtitle={subtitle as any}
      backLink={`/projects/${projectId}`}
      backText="Back to Project"
      projectNavigation={navigation}
    >
      <div style={{ display: 'flex', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Chapter Navigation Sidebar */}
        <aside style={{
          width: '280px',
          flexShrink: 0,
          position: 'sticky',
          top: '2rem',
          height: 'fit-content',
          maxHeight: 'calc(100vh - 4rem)',
          overflowY: 'auto',
        }}>
          <div style={{ ...card, padding: '1rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: colors.text,
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Chapters
            </h3>

            {/* Book selector for multi-book projects */}
            {books.length > 1 && (
              <select
                value={selectedBookId || ''}
                onChange={(e) => handleBookChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  marginBottom: '1rem',
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: '0.875rem',
                }}
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>
                    Book {book.book_number}: {book.title}
                  </option>
                ))}
              </select>
            )}

            {/* Chapter list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {chapters.map(chapter => {
                const hasContent = !!chapter.content;
                const isSelected = selectedChapter?.id === chapter.id;

                return (
                  <button
                    key={chapter.id}
                    onClick={() => hasContent && goToChapter(chapter)}
                    disabled={!hasContent}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 0.75rem',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                        : 'transparent',
                      border: 'none',
                      borderRadius: borderRadius.sm,
                      cursor: hasContent ? 'pointer' : 'not-allowed',
                      opacity: hasContent ? 1 : 0.5,
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isSelected ? colors.brandText : colors.textSecondary,
                      minWidth: '1.5rem',
                    }}>
                      {chapter.chapter_number}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem',
                      color: isSelected ? colors.brandText : colors.text,
                      fontWeight: isSelected ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {chapter.title || `Chapter ${chapter.chapter_number}`}
                    </span>
                    {!hasContent && (
                      <span style={{
                        fontSize: '0.625rem',
                        color: colors.textSecondary,
                        marginLeft: 'auto',
                      }}>
                        (pending)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {chaptersWithContent.length === 0 && (
              <p style={{
                color: colors.textSecondary,
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '1rem',
              }}>
                No chapters have been generated yet.
              </p>
            )}
          </div>
        </aside>

        {/* Reading Area */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {selectedChapter ? (
            <article style={{
              ...card,
              padding: '3rem',
              maxWidth: '800px',
              margin: '0 auto',
            }}>
              {/* Chapter Header */}
              <header style={{
                textAlign: 'center',
                marginBottom: '2.5rem',
                paddingBottom: '2rem',
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem',
                }}>
                  Chapter {selectedChapter.chapter_number}
                </div>
                {selectedChapter.title && (
                  <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    color: colors.text,
                    margin: 0,
                  }}>
                    {selectedChapter.title}
                  </h1>
                )}
                <div style={{
                  fontSize: '0.8125rem',
                  color: colors.textSecondary,
                  marginTop: '0.75rem',
                }}>
                  {selectedChapter.word_count.toLocaleString()} words
                </div>
              </header>

              {/* Chapter Content */}
              <div style={{
                fontSize: '1.0625rem',
                lineHeight: '1.8',
                color: colors.text,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}>
                {selectedChapter.content?.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  // Scene break
                  if (trimmed === '* * *' || trimmed === '---' || trimmed === '***') {
                    return (
                      <div
                        key={index}
                        style={{
                          textAlign: 'center',
                          margin: '2rem 0',
                          color: colors.textSecondary,
                        }}
                      >
                        * * *
                      </div>
                    );
                  }

                  // Regular paragraph
                  return (
                    <p
                      key={index}
                      style={{
                        margin: '0 0 1.25rem 0',
                        textIndent: index > 0 ? '2rem' : 0,
                      }}
                    >
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Chapter Navigation */}
              <footer style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: `1px solid ${colors.border}`,
              }}>
                <button
                  onClick={goToPreviousChapter}
                  disabled={!hasPrevious}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: hasPrevious ? colors.surface : colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: hasPrevious ? colors.text : colors.textSecondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: hasPrevious ? 'pointer' : 'not-allowed',
                    opacity: hasPrevious ? 1 : 0.5,
                  }}
                >
                  Previous Chapter
                </button>

                <span style={{
                  fontSize: '0.8125rem',
                  color: colors.textSecondary,
                }}>
                  {currentChapterIndex + 1} of {chaptersWithContent.length}
                </span>

                <button
                  onClick={goToNextChapter}
                  disabled={!hasNext}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: hasNext
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : colors.background,
                    border: hasNext ? 'none' : `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: hasNext ? '#FFFFFF' : colors.textSecondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                    opacity: hasNext ? 1 : 0.5,
                  }}
                >
                  Next Chapter
                </button>
              </footer>
            </article>
          ) : (
            <div style={{
              ...card,
              padding: '3rem',
              textAlign: 'center',
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                color: colors.text,
                marginBottom: '1rem',
              }}>
                Select a Chapter to Read
              </h2>
              <p style={{
                color: colors.textSecondary,
                fontSize: '0.9375rem',
              }}>
                Choose a chapter from the sidebar to start reading your book.
              </p>
              {chaptersWithContent.length === 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>
                    No chapters have been generated yet.
                  </p>
                  <Link
                    href={`/projects/${projectId}/outline`}
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: borderRadius.md,
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Create Outline & Generate
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </PageLayout>
  );
}
