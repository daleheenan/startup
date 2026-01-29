'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import FlagsSummary from '../../../components/FlagsSummary';
import GenerationStatusBanner from '../../../components/GenerationStatusBanner';
import ExportButtons from '../../../components/ExportButtons';
import { getToken, logout } from '../../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

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

interface Job {
  id: string;
  type: string;
  target_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  attempts: number;
  error: string | null;
  chapter_number: number;
  chapter_title: string | null;
}

interface Book {
  id: string;
  book_number: number;
  title: string;
  chapters: Chapter[];
}

export default function ProgressPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [jobActionLoading, setJobActionLoading] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  // Editing state for book details
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [authorValue, setAuthorValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeVersion, setActiveVersion] = useState<{ id: string; version_name: string | null; version_number: number } | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProgressAndChapters();
      const interval = setInterval(fetchProgressAndChapters, 15000);
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

      // Fetch books and chapters (for active version only)
      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        const fetchedBooks = booksData.books || [];

        // Get chapters for each book (active version only)
        const booksWithChapters: Book[] = [];
        for (const book of fetchedBooks) {
          // Fetch active version first to get the version ID
          let versionId: string | null = null;
          try {
            const versionRes = await fetch(`${API_BASE_URL}/api/books/${book.id}/versions/active`, { headers });
            if (versionRes.ok) {
              const versionData = await versionRes.json();
              versionId = versionData.id;
              // Set active version for UI display (first book only)
              if (booksWithChapters.length === 0) {
                setActiveVersion(versionData);
              }
            }
          } catch {
            // Ignore version fetch errors
          }

          // Fetch chapters for the active version
          const chaptersUrl = versionId
            ? `${API_BASE_URL}/api/chapters/book/${book.id}?versionId=${versionId}`
            : `${API_BASE_URL}/api/chapters/book/${book.id}`;
          const chaptersRes = await fetch(chaptersUrl, { headers });
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

      // Fetch jobs for this project
      const jobsRes = await fetch(`${API_BASE_URL}/api/queue/jobs?projectId=${projectId}`, { headers });
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError(err.message || 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize edit values when project loads
  useEffect(() => {
    if (project) {
      setTitleValue(project.title || '');
      setAuthorValue(project.author_name || '');
    }
  }, [project]);

  const saveProjectDetails = async (field: 'title' | 'authorName', value: string) => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // Update local state
      setProject((prev: any) => ({
        ...prev,
        [field === 'authorName' ? 'author_name' : field]: value,
      }));

      // Close edit mode
      if (field === 'title') setEditingTitle(false);
      if (field === 'authorName') setEditingAuthor(false);
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Get the job for a specific chapter
  const getChapterJob = (chapterId: string): Job | undefined => {
    return jobs.find(j => j.target_id === chapterId && (j.status === 'pending' || j.status === 'running' || j.status === 'paused'));
  };

  // Get failed jobs for a chapter
  const getFailedJob = (chapterId: string): Job | undefined => {
    return jobs.find(j => j.target_id === chapterId && j.status === 'failed');
  };

  // Delete/cancel a pending or running job
  const handleDeleteJob = async (jobId: string) => {
    setJobActionLoading(jobId);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/queue/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete job');
      }

      // Refresh data
      await fetchProgressAndChapters();
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job');
    } finally {
      setJobActionLoading(null);
    }
  };

  // Regenerate a chapter
  const handleRegenerateChapter = async (chapterId: string) => {
    setJobActionLoading(chapterId);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to queue regeneration');
      }

      // Refresh data
      await fetchProgressAndChapters();
    } catch (err) {
      console.error('Error regenerating chapter:', err);
      alert('Failed to queue chapter for regeneration');
    } finally {
      setJobActionLoading(null);
    }
  };

  // Cancel all pending jobs
  const handleCancelAllPending = async () => {
    if (!confirm('Are you sure you want to cancel all pending jobs?')) return;

    setCancellingAll(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/queue/jobs?status=pending`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel pending jobs');
      }

      // Refresh data
      await fetchProgressAndChapters();
    } catch (err) {
      console.error('Error cancelling jobs:', err);
      alert('Failed to cancel pending jobs');
    } finally {
      setCancellingAll(false);
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

    // If we have chapters with content and no pending/running jobs, consider it completed
    // This handles cases where data might be inconsistent (e.g., duplicate chapters)
    if (effectiveCompletedChapters > 0 && progress.queue.pending === 0 && progress.queue.running === 0) {
      return 'completed';
    }

    return 'none';
  };

  const getChapterStatus = (chapter: Chapter, job?: Job) => {
    // Any chapter with content is considered completed/readable
    if (chapter.word_count > 0) return 'completed';
    if (chapter.status === 'completed') return 'completed';

    // Check job status
    if (job) {
      if (job.status === 'running') return 'in-progress';
      if (job.status === 'pending') return 'queued';
      if (job.status === 'failed') return 'failed';
      if (job.status === 'paused') return 'paused';
    }

    if (chapter.status === 'writing' || chapter.status === 'editing' || chapter.status === 'processing') return 'in-progress';
    return 'pending';
  };

  const getChapterStatusBadge = (status: string, job?: Job) => {
    // If there's a failed job, show failed status
    if (job?.status === 'failed') {
      return {
        background: '#FEE2E2',
        color: '#DC2626',
        text: job.error ? `Failed: ${job.error.substring(0, 30)}${job.error.length > 30 ? '...' : ''}` : 'Failed',
        icon: '✗',
      };
    }

    // If there's a paused job
    if (job?.status === 'paused') {
      return {
        background: '#FEF3C7',
        color: '#D97706',
        text: 'Paused',
        icon: '⏸',
      };
    }

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
      case 'queued':
        return {
          background: '#E0E7FF',
          color: '#4F46E5',
          text: 'Queued',
          icon: '⏳',
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
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Chapter Generation Progress' }}
      >
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          Loading progress...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !progress) {
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Chapter Generation Progress' }}
      >
        <p style={{ color: '#DC2626' }}>Error: {error || 'No progress data'}</p>
      </DashboardLayout>
    );
  }

  const generationStatus = getGenerationStatus();

  return (
    <DashboardLayout
      header={{ title: progress.project.title, subtitle: 'Chapter Generation Progress' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Active Version Indicator */}
        {activeVersion && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>📑</span>
              <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Active Version:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E' }}>
                {activeVersion.version_name || `Version ${activeVersion.version_number}`}
              </span>
            </div>
            <Link
              href={`/projects/${projectId}/versions`}
              style={{
                fontSize: '0.8125rem',
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Manage Versions
            </Link>
          </div>
        )}
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

                  {/* Book Details Editor */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                  }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        Book Title
                      </label>
                      {editingTitle ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid #10B981',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                            }}
                          />
                          <button
                            onClick={() => saveProjectDetails('title', titleValue)}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#10B981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingTitle(false); setTitleValue(project?.title || ''); }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#E5E7EB',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>{project?.title || 'Untitled'}</span>
                          <button
                            onClick={() => setEditingTitle(true)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'transparent',
                              color: '#10B981',
                              border: '1px solid #10B981',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        Author Name
                      </label>
                      {editingAuthor ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={authorValue}
                            onChange={(e) => setAuthorValue(e.target.value)}
                            placeholder="Enter author name for exports"
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid #10B981',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                            }}
                          />
                          <button
                            onClick={() => saveProjectDetails('authorName', authorValue)}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#10B981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingAuthor(false); setAuthorValue(project?.author_name || ''); }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#E5E7EB',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: project?.author_name ? '#1A1A2E' : '#9CA3AF', fontStyle: project?.author_name ? 'normal' : 'italic' }}>
                            {project?.author_name || 'Not set'}
                          </span>
                          <button
                            onClick={() => setEditingAuthor(true)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'transparent',
                              color: '#10B981',
                              border: '1px solid #10B981',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                  }}>
                    {books.length > 0 && books[0].chapters.length > 0 ? (
                      <Link
                        href={`/projects/${projectId}/chapters/${books[0].chapters[0].id}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.75rem 1.5rem',
                          background: '#10B981',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                      >
                        Read Novel
                      </Link>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.75rem 1.5rem',
                          background: '#9CA3AF',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                        }}
                      >
                        Loading chapters...
                      </span>
                    )}
                  </div>
                  <ExportButtons projectId={projectId} />
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
                          const chapterJob = getChapterJob(chapter.id);
                          const failedJob = getFailedJob(chapter.id);
                          const activeJob = chapterJob || failedJob;
                          const status = getChapterStatus(chapter, activeJob);
                          const badge = getChapterStatusBadge(status, activeJob);
                          const isLoading = jobActionLoading === (chapterJob?.id || chapter.id);

                          return (
                            <div
                              key={chapter.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: failedJob ? '#FEF2F2' : '#F8FAFC',
                                border: failedJob ? '1px solid #FECACA' : '1px solid #E2E8F0',
                                borderRadius: '8px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  marginBottom: '0.25rem',
                                  flexWrap: 'wrap',
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
                                  {failedJob && (
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      background: badge.background,
                                      color: badge.color,
                                      fontWeight: 600,
                                      maxWidth: '200px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {badge.text}
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
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {failedJob && (
                                  <button
                                    onClick={() => handleRegenerateChapter(chapter.id)}
                                    disabled={isLoading}
                                    title="Retry failed generation"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#DBEAFE',
                                      border: '1px solid #3B82F6',
                                      borderRadius: '6px',
                                      color: '#1D4ED8',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: isLoading ? 'not-allowed' : 'pointer',
                                      opacity: isLoading ? 0.5 : 1,
                                    }}
                                  >
                                    {isLoading ? '...' : 'Retry'}
                                  </button>
                                )}
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

                {/* Cancel All Pending Button */}
                {progress.queue.pending > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: '1rem',
                  }}>
                    <button
                      onClick={handleCancelAllPending}
                      disabled={cancellingAll}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#FEE2E2',
                        border: '1px solid #EF4444',
                        borderRadius: '6px',
                        color: '#DC2626',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: cancellingAll ? 'not-allowed' : 'pointer',
                        opacity: cancellingAll ? 0.5 : 1,
                      }}
                    >
                      {cancellingAll ? 'Cancelling...' : `Cancel All Pending (${progress.queue.pending})`}
                    </button>
                  </div>
                )}

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
                          const chapterJob = getChapterJob(chapter.id);
                          const failedJob = getFailedJob(chapter.id);
                          const activeJob = chapterJob || failedJob;
                          const status = getChapterStatus(chapter, activeJob);
                          const badge = getChapterStatusBadge(status, activeJob);
                          const isCurrentlyGenerating = progress.currentActivity?.chapterId === chapter.id;
                          const isLoading = jobActionLoading === (chapterJob?.id || chapter.id);

                          return (
                            <div
                              key={chapter.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: isCurrentlyGenerating ? '#EEF2FF' : failedJob ? '#FEF2F2' : '#F8FAFC',
                                border: isCurrentlyGenerating ? '1px solid #C7D2FE' : failedJob ? '1px solid #FECACA' : '1px solid #E2E8F0',
                                borderRadius: '8px',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  marginBottom: '0.25rem',
                                  flexWrap: 'wrap',
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
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
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
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {/* Job control buttons */}
                                {chapterJob && chapterJob.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteJob(chapterJob.id)}
                                    disabled={isLoading}
                                    title="Cancel queued job"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#FEF3C7',
                                      border: '1px solid #F59E0B',
                                      borderRadius: '6px',
                                      color: '#B45309',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: isLoading ? 'not-allowed' : 'pointer',
                                      opacity: isLoading ? 0.5 : 1,
                                    }}
                                  >
                                    {isLoading ? '...' : 'Cancel'}
                                  </button>
                                )}
                                {chapterJob && chapterJob.status === 'running' && (
                                  <button
                                    onClick={() => handleDeleteJob(chapterJob.id)}
                                    disabled={isLoading}
                                    title="Stop running job"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#FEE2E2',
                                      border: '1px solid #EF4444',
                                      borderRadius: '6px',
                                      color: '#DC2626',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: isLoading ? 'not-allowed' : 'pointer',
                                      opacity: isLoading ? 0.5 : 1,
                                    }}
                                  >
                                    {isLoading ? '...' : 'Stop'}
                                  </button>
                                )}
                                {failedJob && (
                                  <button
                                    onClick={() => handleRegenerateChapter(chapter.id)}
                                    disabled={isLoading}
                                    title="Retry failed generation"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#DBEAFE',
                                      border: '1px solid #3B82F6',
                                      borderRadius: '6px',
                                      color: '#1D4ED8',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: isLoading ? 'not-allowed' : 'pointer',
                                      opacity: isLoading ? 0.5 : 1,
                                    }}
                                  >
                                    {isLoading ? '...' : 'Retry'}
                                  </button>
                                )}
                                {/* Show regenerate for stuck chapters (no job, no content) */}
                                {!chapterJob && !failedJob && chapter.word_count === 0 && status === 'pending' && (
                                  <button
                                    onClick={() => handleRegenerateChapter(chapter.id)}
                                    disabled={isLoading}
                                    title="Queue for generation"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#E0E7FF',
                                      border: '1px solid #6366F1',
                                      borderRadius: '6px',
                                      color: '#4F46E5',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: isLoading ? 'not-allowed' : 'pointer',
                                      opacity: isLoading ? 0.5 : 1,
                                    }}
                                  >
                                    {isLoading ? '...' : 'Generate'}
                                  </button>
                                )}
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
    </DashboardLayout>
  );
}
