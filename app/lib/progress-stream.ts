import { useState, useEffect, useCallback } from 'react';
import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface JobUpdate {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed';
  target_id: string;
  timestamp: string;
}

export interface ChapterComplete {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
}

export interface ChapterProgress {
  chapter_id: string;
  chapter_number: number;
  agent: string;
  status: string;
  progress: number;
}

export interface SessionUpdate {
  is_active: boolean;
  requests_this_session: number;
  time_remaining: string;
  reset_time: string;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  paused: number;
  failed: number;
  total: number;
}

export interface ProgressStreamState {
  connected: boolean;
  jobUpdates: JobUpdate[];
  chapterCompletions: ChapterComplete[];
  currentProgress?: ChapterProgress;
  sessionStatus?: SessionUpdate;
  queueStats?: QueueStats;
}

/**
 * React hook for subscribing to real-time progress updates via Server-Sent Events
 */
export function useProgressStream(): ProgressStreamState & { reconnect: () => void } {
  const [connected, setConnected] = useState(false);
  const [jobUpdates, setJobUpdates] = useState<JobUpdate[]>([]);
  const [chapterCompletions, setChapterCompletions] = useState<ChapterComplete[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ChapterProgress>();
  const [sessionStatus, setSessionStatus] = useState<SessionUpdate>();
  const [queueStats, setQueueStats] = useState<QueueStats>();
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.warn('[ProgressStream] No auth token available');
      return;
    }

    // Close existing connection
    if (eventSource) {
      eventSource.close();
    }

    // Note: EventSource doesn't support custom headers directly
    // We'll pass the token as a query parameter instead
    const url = `${API_BASE_URL}/api/progress/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener('init', (e) => {
      console.log('[ProgressStream] Connected:', e.data);
      setConnected(true);
    });

    es.addEventListener('job:update', (e) => {
      const job: JobUpdate = JSON.parse(e.data);
      setJobUpdates((prev) => [...prev.slice(-49), job]); // Keep last 50
    });

    es.addEventListener('chapter:complete', (e) => {
      const chapter: ChapterComplete = JSON.parse(e.data);
      setChapterCompletions((prev) => [...prev, chapter]);
    });

    es.addEventListener('chapter:progress', (e) => {
      const progress: ChapterProgress = JSON.parse(e.data);
      setCurrentProgress(progress);
    });

    es.addEventListener('session:update', (e) => {
      const session: SessionUpdate = JSON.parse(e.data);
      setSessionStatus(session);
    });

    es.addEventListener('queue:stats', (e) => {
      const stats: QueueStats = JSON.parse(e.data);
      setQueueStats(stats);
    });

    es.onerror = (error) => {
      console.error('[ProgressStream] Connection error:', error);
      setConnected(false);
      es.close();

      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('[ProgressStream] Reconnecting...');
        connect();
      }, 5000);
    };

    setEventSource(es);
  }, [eventSource]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return {
    connected,
    jobUpdates,
    chapterCompletions,
    currentProgress,
    sessionStatus,
    queueStats,
    reconnect: connect,
  };
}
