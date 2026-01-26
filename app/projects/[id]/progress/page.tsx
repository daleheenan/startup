'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FlagsSummary from '../../../components/FlagsSummary';
import GenerationStatusBanner from '../../../components/GenerationStatusBanner';
import { getToken, logout } from '../../../lib/auth';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { useProjectNavigation } from '../../../hooks/useProjectProgress';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProgressData {
  project: {
    id: string;
    title: string;
    status: string;
  };
  chapters: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  wordCount: {
    current: number;
    target: number;
    averagePerChapter: number;
  };
  timeEstimates: {
    averageChapterTime: number;
    estimatedRemaining: number;
  };
  queue: {
    pending: number;
    running: number;
    completed: number;
    paused: number;
  };
  currentActivity?: {
    chapterId: string;
    chapterNumber: number;
    jobType: string;
    startedAt: string;
  };
  recentEvents: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
  flags: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  rateLimitStatus?: {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  };
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  status: string;
  word_count: number;
}

interface Book {
  id: string;
  book_number: number;
  title: string;
  chapters: Chapter[];
}

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    if (projectId) {
      fetchProgressAndChapters();
      const interval = setInterval(fetchProgressAndChapters, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const fetchProgressAndChapters = async () => {
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch progress data
      const progressResponse = await fetch(`${API_BASE_URL}/api/projects/${projectId}/progress`, {
        headers,
      });

      if (progressResponse.status === 401) {
        logout();
        window.location.href = '/login';
        return;
      }

      let progressData: ProgressData | null = null;

      if (!progressResponse.ok) {
        // Fallback: construct basic progress data from project
        const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
        if (!projectRes.ok) throw new Error('Failed to fetch project');

        const projectData = await projectRes.json();
        setProject(projectData);

        progressData = {
          project: {
            id: projectData.id,
            title: projectData.title,
            status: projectData.status,
          },
          chapters: {
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
          },
          wordCount: {
            current: 0,
            target: 80000,
            averagePerChapter: 2250,
          },
          timeEstimates: {
            averageChapterTime: 0,
            estimatedRemaining: 0,
          },
          queue: { pending: 0, running: 0, completed: 0, paused: 0 },
          recentEvents: [],
          flags: {
            total: 0,
            critical: 0,
            warning: 0,
            info: 0,
          },
        };
      } else {
        progressData = await progressResponse.json();
        // Always fetch full project data for navigation prerequisites
        const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
        if (projectRes.ok) {
          const fullProjectData = await projectRes.json();
          setProject(fullProjectData);
        } else if (progressData) {
          // Fallback to minimal data if full project fetch fails
          setProject({ id: progressData.project.id, title: progressData.project.title, status: progressData.project.status });
        }
      }

      if (progressData) {
        setProgress(progressData);
      }

      // Fetch books and chapters
      const booksRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/books`, { headers });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        const fetchedBooks = booksData.books || [];

        // Get chapters for each book
        const booksWithChapters: Book[] = [];
        for (const book of fetchedBooks) {
          const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${book.id}`, { headers });
          if (chaptersRes.ok) {
            const chaptersData = await chaptersRes.json();
            booksWithChapters.push({
              ...book,
              chapters: chaptersData.chapters || [],
            });
          }
        }
        setBooks(booksWithChapters);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError(err.message || 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  // Use progress API data directly - backend now correctly counts chapters with word_count > 0 as completed
  const effectiveTotalChapters = progress?.chapters.total || 0;
  const effectiveCompletedChapters = progress?.chapters.completed || 0;
  const effectiveWordCount = progress?.wordCount.current || 0;

  const getGenerationStatus = () => {
    if (!progress) return 'none';

    // Check for pending jobs FIRST - if jobs are queued, generation is in progress
    if (progress.queue.pending > 0 || progress.queue.running > 0) {
      return 'generating';
    }

    // If no chapters at all and no pending jobs, generation hasn't started
    if (effectiveTotalChapters === 0) return 'none';

    // All chapters complete
    if (effectiveCompletedChapters === effectiveTotalChapters && effectiveTotalChapters > 0) return 'completed';

    // Active work in progress
    if (progress.chapters.inProgress > 0) return 'generating';

    // Queue paused
    if (progress.queue.paused > 0) return 'paused';

    // If we have chapters with content but no active queue, consider it completed
    if (effectiveCompletedChapters > 0) {
      return 'completed';
    }

    return 'none';
  };

  const getChapterStatus = (chapter: Chapter) => {
    if (chapter.status === 'completed') return 'completed';
    // Consider chapters with content as readable (even if still being edited)
    if ((chapter.status === 'editing' || chapter.status === 'processing') && chapter.word_count > 0) return 'completed';
    if (chapter.status === 'writing' || chapter.status === 'editing' || chapter.status === 'processing') return 'in-progress';
    return 'pending';
  };

  const getChapterStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          background: '#DCFCE7',
          color: '#15803D',
          text: 'Completed',
          icon: '✓',
        };
      case 'in-progress':
        return {
          background: '#DBEAFE',
          color: '#1D4ED8',
          text: 'Generating...',
          icon: '⟳',
        };
      default:
        return {
          background: '#FEF3C7',
          color: '#B45309',
          text: 'Waiting',
          icon: '○',
        };
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <p style={{ color: '#64748B' }}>Loading progress...</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div style={{
        minHeight: '100vh',
        padding: '2rem',
        background: '#F8FAFC',
      }}>
        <p style={{ color: '#DC2626' }}>Error: {error || 'No progress data'}</p>
      </div>
    );
  }

  const generationStatus = getGenerationStatus();

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          N
        </Link>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header style={{
          padding: '1rem 2rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1A1A2E',
              margin: 0,
            }}>
              {progress.project.title}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Chapter Generation Progress
            </p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Project
          </Link>
        </header>

        {/* Project Navigation */}
        <ProjectNavigation
          projectId={projectId}
          project={navigation.project}
          outline={navigation.outline}
          chapters={navigation.chapters}
        />

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* No Generation Started State */}
            {generationStatus === 'none' && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1.5rem',
                }}>
                  📖
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#1A1A2E',
                  marginBottom: '1rem',
                }}>
                  No Generation Started
                </h2>
                <p style={{
                  fontSize: '1rem',
                  color: '#64748B',
                  marginBottom: '2rem',
                  maxWidth: '500px',
                  margin: '0 auto 2rem',
                }}>
                  Complete your story outline and submit for novel generation to begin.
                </p>
                <Link
                  href={`/projects/${projectId}/outline`}
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  Go to Outline
                </Link>
              </div>
            )}

            {/* Generation Complete State */}
            {generationStatus === 'completed' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)',
                  border: '1px solid #10B981',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                  }}>
                    ✓
                  </div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#15803D',
                    marginBottom: '1rem',
                  }}>
                    Generation Complete!
                  </h2>
                  <p style={{
                    fontSize: '1rem',
                    color: '#166534',
                    marginBottom: '1.5rem',
                  }}>
                    Your novel is ready to read and export.
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                  }}>
                    <button
                      onClick={() => {
                        if (books.length > 0 && books[0].chapters.length > 0) {
                          router.push(`/projects/${projectId}/chapters/${books[0].chapters[0].id}`);
                        }
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#10B981',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Read Novel
                    </button>
                    <Link
                      href={`/projects/${projectId}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.75rem 1.5rem',
                        background: '#FFFFFF',
                        border: '1px solid #10B981',
                        borderRadius: '8px',
                        color: '#10B981',
                        fontSize: '1rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Export
                    </Link>
                  </div>
                </div>

                {/* Chapter List for Completed */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1A1A2E',
                    marginBottom: '1rem',
                  }}>
                    All Chapters
                  </h3>
                  {books.map((book) => (
                    <div key={book.id} style={{ marginBottom: '1.5rem' }}>
                      {books.length > 1 && (
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '0.75rem',
                        }}>
                          Book {book.book_number}: {book.title}
                        </h4>
                      )}
                      <div style={{
                        display: 'grid',
                        gap: '0.5rem',
                      }}>
                        {book.chapters.map((chapter) => {
                          const status = getChapterStatus(chapter);
                          const badge = getChapterStatusBadge(status);

                          return (
                            <div
                              key={chapter.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  marginBottom: '0.25rem',
                                }}>
                                  <span style={{
                                    fontSize: '1.25rem',
                                    color: badge.color,
                                  }}>
                                    {badge.icon}
                                  </span>
                                  <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    color: '#1A1A2E',
                                  }}>
                                    Chapter {chapter.chapter_number}
                                  </span>
                                  {chapter.title && (
                                    <span style={{
                                      fontSize: '0.875rem',
                                      color: '#64748B',
                                    }}>
                                      {chapter.title}
                                    </span>
                                  )}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#64748B',
                                }}>
                                  {chapter.word_count.toLocaleString()} words
                                </div>
                              </div>
                              <Link
                                href={`/projects/${projectId}/chapters/${chapter.id}`}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '6px',
                                  color: '#10B981',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  transition: 'all 0.2s',
                                }}
                              >
                                Read
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Generation In Progress State */}
            {(generationStatus === 'generating' || generationStatus === 'paused') && (
              <>
                {/* Status Banner */}
                <GenerationStatusBanner
                  status={generationStatus}
                  completedChapters={effectiveCompletedChapters}
                  totalChapters={effectiveTotalChapters}
                  currentWordCount={effectiveWordCount}
                  targetWordCount={progress.wordCount.target}
                  estimatedTimeRemaining={progress.timeEstimates.estimatedRemaining}
                  currentActivity={progress.currentActivity}
                />

                {/* Chapter List */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1A1A2E',
                    marginBottom: '1rem',
                  }}>
                    Chapter Progress
                  </h3>
                  {books.map((book) => (
                    <div key={book.id} style={{ marginBottom: '1.5rem' }}>
                      {books.length > 1 && (
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '0.75rem',
                        }}>
                          Book {book.book_number}: {book.title}
                        </h4>
                      )}
                      <div style={{
                        display: 'grid',
                        gap: '0.5rem',
                      }}>
                        {book.chapters.map((chapter) => {
                          const status = getChapterStatus(chapter);
                          const badge = getChapterStatusBadge(status);
                          const isCurrentlyGenerating = progress.currentActivity?.chapterId === chapter.id;

                          return (
                            <div
                              key={chapter.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: isCurrentlyGenerating ? '#EEF2FF' : '#F8FAFC',
                                border: isCurrentlyGenerating ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                borderRadius: '8px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  marginBottom: '0.25rem',
                                }}>
                                  <span style={{
                                    fontSize: '1.25rem',
                                    color: badge.color,
                                  }}>
                                    {badge.icon}
                                  </span>
                                  <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    color: '#1A1A2E',
                                  }}>
                                    Chapter {chapter.chapter_number}
                                  </span>
                                  {chapter.title && (
                                    <span style={{
                                      fontSize: '0.875rem',
                                      color: '#64748B',
                                    }}>
                                      {chapter.title}
                                    </span>
                                  )}
                                  <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    background: badge.background,
                                    color: badge.color,
                                    fontWeight: 600,
                                  }}>
                                    {badge.text}
                                  </span>
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#64748B',
                                }}>
                                  {chapter.word_count > 0
                                    ? `${chapter.word_count.toLocaleString()} words`
                                    : 'Not started'
                                  }
                                </div>
                              </div>
                              {status === 'completed' && (
                                <Link
                                  href={`/projects/${projectId}/chapters/${chapter.id}`}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '6px',
                                    color: '#10B981',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  Read
                                </Link>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Flagged Issues Summary */}
                {progress.flags.total > 0 && (
                  <FlagsSummary projectId={projectId} flags={progress.flags} />
                )}

                {/* Recent Events */}
                {progress.recentEvents.length > 0 && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      color: '#1A1A2E',
                      marginBottom: '1rem',
                      fontWeight: 600,
                    }}>
                      Recent Activity
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      {progress.recentEvents.slice(0, 10).map((event, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.75rem',
                            background: '#F8FAFC',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{
                            color: '#374151',
                            fontSize: '0.875rem',
                          }}>
                            {event.message}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#94A3B8',
                          }}>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
