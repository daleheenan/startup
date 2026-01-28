import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// BUG-007 FIX: Constants for array size limits
const MAX_JOB_UPDATES = 50;
const MAX_CHAPTER_COMPLETIONS = 100;

export interface JobUpdate {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed' | 'deleted';
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
 *
 * BUG-007 FIX: Limits array growth to prevent memory leaks
 * BUG-019 FIX: Validates parsed JSON structure
 */
export function useProgressStream(): ProgressStreamState & { reconnect: () => void } {
  const [connected, setConnected] = useState(false);
  const [jobUpdates, setJobUpdates] = useState<JobUpdate[]>([]);
  const [chapterCompletions, setChapterCompletions] = useState<ChapterComplete[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ChapterProgress>();
  const [sessionStatus, setSessionStatus] = useState<SessionUpdate>();
  const [queueStats, setQueueStats] = useState<QueueStats>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.warn('[ProgressStream] No auth token available');
      return;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Note: EventSource doesn't support custom headers directly
    // We'll pass the token as a query parameter instead
    const url = `${API_BASE_URL}/api/progress/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener('init', (e) => {
      console.log('[ProgressStream] Connected:', e.data);
      setConnected(true);
    });

    // BUG-019 FIX: Validate JSON parse and structure
    es.addEventListener('job:update', (e) => {
      try {
        const job: JobUpdate = JSON.parse(e.data);
        if (job?.id && job?.status) {
          setJobUpdates((prev) => {
            const updated = [...prev, job];
            // BUG-007 FIX: Limit array size
            return updated.length > MAX_JOB_UPDATES ? updated.slice(-MAX_JOB_UPDATES) : updated;
          });
        }
      } catch (error) {
        console.error('[ProgressStream] Failed to parse job update:', error);
      }
    });

    // BUG-007 FIX: Add size limit to chapter completions
    es.addEventListener('chapter:complete', (e) => {
      try {
        const chapter: ChapterComplete = JSON.parse(e.data);
        if (chapter?.id) {
          setChapterCompletions((prev) => {
            const updated = [...prev, chapter];
            // BUG-007 FIX: Prevent unbounded growth
            return updated.length > MAX_CHAPTER_COMPLETIONS
              ? updated.slice(-MAX_CHAPTER_COMPLETIONS)
              : updated;
          });
        }
      } catch (error) {
        console.error('[ProgressStream] Failed to parse chapter completion:', error);
      }
    });

    es.addEventListener('chapter:progress', (e) => {
      try {
        const progress: ChapterProgress = JSON.parse(e.data);
        if (progress?.chapter_id) {
          setCurrentProgress(progress);
        }
      } catch (error) {
        console.error('[ProgressStream] Failed to parse chapter progress:', error);
      }
    });

    es.addEventListener('session:update', (e) => {
      try {
        const session: SessionUpdate = JSON.parse(e.data);
        if (session && typeof session.is_active === 'boolean') {
          setSessionStatus(session);
        }
      } catch (error) {
        console.error('[ProgressStream] Failed to parse session update:', error);
      }
    });

    es.addEventListener('queue:stats', (e) => {
      try {
        const stats: QueueStats = JSON.parse(e.data);
        if (stats && typeof stats.total === 'number') {
          setQueueStats(stats);
        }
      } catch (error) {
        console.error('[ProgressStream] Failed to parse queue stats:', error);
      }
    });

    es.onerror = (error) => {
      console.error('[ProgressStream] Connection error:', error);
      setConnected(false);
      es.close();

      // Auto-reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[ProgressStream] Reconnecting...');
        connect();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, []); // No dependencies - uses refs instead of state

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

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
