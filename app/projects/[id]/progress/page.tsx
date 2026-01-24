'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import FlagsSummary from '../../../components/FlagsSummary';

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
    averageChapterTime: number; // milliseconds
    estimatedRemaining: number; // milliseconds
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
      // Poll every 5 seconds
      const interval = setInterval(fetchProgress, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/progress`);
      if (!response.ok) {
        // If endpoint doesn't exist, construct progress from available data
        const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`);
        const queueRes = await fetch(`http://localhost:3001/api/queue/stats`);

        if (!projectRes.ok) throw new Error('Failed to fetch project');

        const project = await projectRes.json();
        const queue = queueRes.ok ? await queueRes.json() : { queue: { pending: 0, running: 0, completed: 0, paused: 0 } };

        // Construct basic progress data
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
        justifyContent: 'center'
      }}>
        <p style={{ color: '#888' }}>Loading progress...</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <p style={{ color: '#ef4444' }}>Error: {error || 'No progress data'}</p>
      </div>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {progress.project.title}
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#888' }}>Generation Progress</p>
        </div>

        {/* Overall Progress Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#ededed', margin: 0 }}>Overall Progress</h2>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{percentComplete}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '40px',
            background: 'rgba(255, 255, 255, 0.1)',
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '0.5rem' }}>Chapters</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ededed', margin: 0 }}>
              {progress.chapters.completed} / {progress.chapters.total}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '0.5rem' }}>
              {progress.chapters.inProgress} in progress, {progress.chapters.pending} pending
            </p>
          </div>

          {/* Word Count */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '0.5rem' }}>Word Count</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ededed', margin: 0 }}>
              {progress.wordCount.current.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '0.5rem' }}>
              Target: {progress.wordCount.target.toLocaleString()}
            </p>
          </div>

          {/* Time Estimates */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '0.5rem' }}>Time Remaining</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ededed', margin: 0 }}>
              {formatDuration(progress.timeEstimates.estimatedRemaining)}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '0.5rem' }}>
              Avg: {formatDuration(progress.timeEstimates.averageChapterTime)}/chapter
            </p>
          </div>

          {/* Queue Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '0.5rem' }}>Queue Status</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24', margin: 0 }}>
                  {progress.queue.pending}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#888' }}>Pending</p>
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa', margin: 0 }}>
                  {progress.queue.running}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#888' }}>Running</p>
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80', margin: 0 }}>
                  {progress.queue.completed}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#888' }}>Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Activity */}
        {progress.currentActivity && (
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', color: '#ededed', marginBottom: '0.5rem' }}>
              Current Activity
            </h3>
            <p style={{ color: '#888', margin: 0 }}>
              {progress.currentActivity.jobType} on Chapter {progress.currentActivity.chapterNumber}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', color: '#ededed', marginBottom: '1rem' }}>
              Recent Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {progress.recentEvents.slice(0, 10).map((event, i) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#ededed' }}>{event.message}</span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href={`/projects/${projectId}`}
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Project
          </a>
        </div>
      </div>
    </main>
  );
}
