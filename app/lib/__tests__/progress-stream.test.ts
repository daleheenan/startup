import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProgressStream } from '../progress-stream';

// Mock auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

describe('useProgressStream', () => {
  let mockEventSource: any;
  let eventListeners: Map<string, (event: MessageEvent) => void>;

  beforeEach(() => {
    eventListeners = new Map();

    // Create a mock EventSource instance
    mockEventSource = {
      url: '',
      readyState: 1,
      addEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
        eventListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };

    // Override the global EventSource constructor with a proper class
    global.EventSource = class MockEventSource {
      url: string;
      constructor(url: string) {
        this.url = url;
        Object.assign(this, mockEventSource);
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should establish SSE connection on mount', async () => {
    const { result } = renderHook(() => useProgressStream());

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/progress/stream?token=mock-token-123')
      );
    });

    // Trigger init event
    const initListener = eventListeners.get('init');
    if (initListener) {
      initListener(new MessageEvent('init', { data: 'Connected' }));
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should handle job update events', async () => {
    const { result } = renderHook(() => useProgressStream());

    const jobUpdate = {
      id: 'job-123',
      type: 'chapter_generation',
      status: 'running',
      target_id: 'chapter-456',
      timestamp: new Date().toISOString(),
    };

    // Trigger job update event
    const jobListener = eventListeners.get('job:update');
    if (jobListener) {
      jobListener(new MessageEvent('job:update', {
        data: JSON.stringify(jobUpdate)
      }));
    }

    await waitFor(() => {
      expect(result.current.jobUpdates).toHaveLength(1);
      expect(result.current.jobUpdates[0]).toEqual(jobUpdate);
    });
  });

  it('should handle chapter completion events', async () => {
    const { result } = renderHook(() => useProgressStream());

    const chapterComplete = {
      id: 'chapter-789',
      chapter_number: 5,
      title: 'Chapter Five',
      word_count: 2500,
    };

    // Trigger chapter complete event
    const chapterListener = eventListeners.get('chapter:complete');
    if (chapterListener) {
      chapterListener(new MessageEvent('chapter:complete', {
        data: JSON.stringify(chapterComplete)
      }));
    }

    await waitFor(() => {
      expect(result.current.chapterCompletions).toHaveLength(1);
      expect(result.current.chapterCompletions[0]).toEqual(chapterComplete);
    });
  });

  it('should handle chapter progress updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    const progressUpdate = {
      chapter_id: 'chapter-101',
      chapter_number: 3,
      agent: 'plot_agent',
      status: 'generating',
      progress: 45,
    };

    // Trigger chapter progress event
    const progressListener = eventListeners.get('chapter:progress');
    if (progressListener) {
      progressListener(new MessageEvent('chapter:progress', {
        data: JSON.stringify(progressUpdate)
      }));
    }

    await waitFor(() => {
      expect(result.current.currentProgress).toEqual(progressUpdate);
    });
  });

  it('should handle session status updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    const sessionUpdate = {
      is_active: true,
      requests_this_session: 25,
      time_remaining: '45 minutes',
      reset_time: '2026-01-25T15:30:00Z',
    };

    // Trigger session update event
    const sessionListener = eventListeners.get('session:update');
    if (sessionListener) {
      sessionListener(new MessageEvent('session:update', {
        data: JSON.stringify(sessionUpdate)
      }));
    }

    await waitFor(() => {
      expect(result.current.sessionStatus).toEqual(sessionUpdate);
    });
  });

  it('should handle queue statistics updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    const queueStats = {
      pending: 5,
      running: 2,
      completed: 10,
      paused: 1,
      failed: 0,
      total: 18,
    };

    // Trigger queue stats event
    const queueListener = eventListeners.get('queue:stats');
    if (queueListener) {
      queueListener(new MessageEvent('queue:stats', {
        data: JSON.stringify(queueStats)
      }));
    }

    await waitFor(() => {
      expect(result.current.queueStats).toEqual(queueStats);
    });
  });

  it('should limit job updates to last 50 entries', async () => {
    const { result } = renderHook(() => useProgressStream());

    const jobListener = eventListeners.get('job:update');

    // Send 60 job updates
    for (let i = 0; i < 60; i++) {
      const jobUpdate = {
        id: `job-${i}`,
        type: 'chapter_generation',
        status: 'running',
        target_id: `chapter-${i}`,
        timestamp: new Date().toISOString(),
      };

      if (jobListener) {
        jobListener(new MessageEvent('job:update', {
          data: JSON.stringify(jobUpdate)
        }));
      }
    }

    await waitFor(() => {
      expect(result.current.jobUpdates).toHaveLength(50);
      // Should have the last 50 (from job-10 to job-59)
      expect(result.current.jobUpdates[0].id).toBe('job-10');
      expect(result.current.jobUpdates[49].id).toBe('job-59');
    });
  });

  it('should handle connection errors and attempt reconnection', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useProgressStream());

    // Simulate connection error
    if (mockEventSource.onerror) {
      mockEventSource.onerror(new Event('error'));
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(false);
    });

    expect(mockEventSource.close).toHaveBeenCalled();

    // Fast-forward 5 seconds to trigger reconnection
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      // EventSource should be called again (once initially, once for reconnect)
      expect(global.EventSource).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() => useProgressStream());

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should provide manual reconnect function', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Initial connection
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledTimes(1);
    });

    // Call reconnect
    result.current.reconnect();

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledTimes(2);
      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });

  it('should not connect if no auth token available', async () => {
    const { getToken } = await import('../auth');
    vi.mocked(getToken).mockReturnValue(null);

    renderHook(() => useProgressStream());

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have created EventSource
    expect(global.EventSource).not.toHaveBeenCalled();

    // Restore mock
    vi.mocked(getToken).mockReturnValue('mock-token-123');
  });

  it('should update progress incrementally', async () => {
    const { result } = renderHook(() => useProgressStream());

    const progressListener = eventListeners.get('chapter:progress');

    // Send first progress update
    if (progressListener) {
      progressListener(new MessageEvent('chapter:progress', {
        data: JSON.stringify({
          chapter_id: 'chapter-1',
          chapter_number: 1,
          agent: 'plot_agent',
          status: 'generating',
          progress: 25,
        })
      }));
    }

    await waitFor(() => {
      expect(result.current.currentProgress?.progress).toBe(25);
    });

    // Send second progress update
    if (progressListener) {
      progressListener(new MessageEvent('chapter:progress', {
        data: JSON.stringify({
          chapter_id: 'chapter-1',
          chapter_number: 1,
          agent: 'plot_agent',
          status: 'generating',
          progress: 75,
        })
      }));
    }

    await waitFor(() => {
      expect(result.current.currentProgress?.progress).toBe(75);
    });
  });
});
