'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import FlagsSummary from '../../../components/FlagsSummary';
import { getToken, logout } from '../../../lib/auth';

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

export default function ProgressPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const fetchProgress = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const queueRes = await fetch(`${API_BASE_URL}/api/queue/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!projectRes.ok) throw new Error('Failed to fetch project');

        const project = await projectRes.json();
        const queue = queueRes.ok ? await queueRes.json() : { queue: { pending: 0, running: 0, completed: 0, paused: 0 } };

        setProgress({
          project: {
            id: project.id,
            title: project.title,
            status: project.status,
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
          queue: queue.queue || { pending: 0, running: 0, completed: 0, paused: 0 },
          recentEvents: [],
          flags: {
            total: 0,
            critical: 0,
            warning: 0,
            info: 0,
          },
        });
      } else {
        const data = await response.json();
        setProgress(data);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError(err.message || 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms === 0) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const percentComplete = progress
    ? progress.chapters.total > 0
      ? Math.round((progress.chapters.completed / progress.chapters.total) * 100)
      : 0
    : 0;

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
              Generation Progress
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

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Overall Progress Bar */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#1A1A2E', margin: 0, fontWeight: 600 }}>Overall Progress</h2>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{percentComplete}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '40px',
                background: '#E2E8F0',
                borderRadius: '20px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentComplete}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Chapters */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: 500 }}>Chapters</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1A1A2E', margin: 0 }}>
                  {progress.chapters.completed} / {progress.chapters.total}
                </p>
                <p style={{ fontSize: '0.813rem', color: '#64748B', marginTop: '0.5rem' }}>
                  {progress.chapters.inProgress} in progress, {progress.chapters.pending} pending
                </p>
              </div>

              {/* Word Count */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: 500 }}>Word Count</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1A1A2E', margin: 0 }}>
                  {progress.wordCount.current.toLocaleString()}
                </p>
                <p style={{ fontSize: '0.813rem', color: '#64748B', marginTop: '0.5rem' }}>
                  Target: {progress.wordCount.target.toLocaleString()}
                </p>
              </div>

              {/* Time Estimates */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: 500 }}>Time Remaining</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1A1A2E', margin: 0 }}>
                  {formatDuration(progress.timeEstimates.estimatedRemaining)}
                </p>
                <p style={{ fontSize: '0.813rem', color: '#64748B', marginTop: '0.5rem' }}>
                  Avg: {formatDuration(progress.timeEstimates.averageChapterTime)}/chapter
                </p>
              </div>

              {/* Queue Status */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: 500 }}>Queue Status</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F59E0B', margin: 0 }}>
                      {progress.queue.pending}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Pending</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6', margin: 0 }}>
                      {progress.queue.running}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Running</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981', margin: 0 }}>
                      {progress.queue.completed}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Done</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Limit Status */}
            {progress.rateLimitStatus && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: 500 }}>Rate Limit</h3>
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Status:</span>
                    <span style={{ color: progress.rateLimitStatus.isActive ? '#10B981' : '#64748B', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      {progress.rateLimitStatus.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {progress.rateLimitStatus.isActive && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Requests:</span>
                        <span style={{ color: '#1A1A2E', fontSize: '0.875rem' }}>
                          {progress.rateLimitStatus.requestsThisSession}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Resets in:</span>
                        <span style={{ color: '#667eea', fontSize: '0.875rem', fontWeight: 'bold' }}>
                          {progress.rateLimitStatus.timeRemaining}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Current Activity */}
            {progress.currentActivity && (
              <div style={{
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}>
                <h3 style={{ fontSize: '1.125rem', color: '#1A1A2E', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Current Activity
                </h3>
                <p style={{ color: '#64748B', margin: 0 }}>
                  {progress.currentActivity.jobType} on Chapter {progress.currentActivity.chapterNumber}
                </p>
                <p style={{ fontSize: '0.813rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                  Started {new Date(progress.currentActivity.startedAt).toLocaleTimeString()}
                </p>
              </div>
            )}

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
                <h3 style={{ fontSize: '1.125rem', color: '#1A1A2E', marginBottom: '1rem', fontWeight: 600 }}>
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {progress.recentEvents.slice(0, 10).map((event, i) => (
                    <div key={i} style={{
                      padding: '0.75rem',
                      background: '#F8FAFC',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#374151', fontSize: '0.875rem' }}>{event.message}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
