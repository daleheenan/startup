import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProgressStream } from '../progress-stream';

// Mock auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

describe('useProgressStream', () => {
  let eventListeners: Map<string, (event: MessageEvent) => void>;
  let eventSourceSpy: ReturnType<typeof vi.fn>;
  let constructorCalls: string[];
  let mockClose: ReturnType<typeof vi.fn>;
  let lastInstance: any;

  beforeEach(() => {
    eventListeners = new Map();
    constructorCalls = [];
    mockClose = vi.fn();
    lastInstance = null;

    // Create a spy function that we can track
    eventSourceSpy = vi.fn();

    // Override the global EventSource constructor with a proper class
    global.EventSource = class MockEventSource {
      url: string;
      readyState = 1;
      onerror: ((ev: Event) => void) | null = null;
      close: ReturnType<typeof vi.fn>;

      constructor(url: string) {
        (eventSourceSpy as (...args: unknown[]) => void)(url);
        constructorCalls.push(url);
        this.url = url;
        this.close = mockClose;
        lastInstance = this;
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        eventListeners.set(type, listener);
      }

      removeEventListener = vi.fn();
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should establish SSE connection on mount', async () => {
    const { result } = renderHook(() => useProgressStream());

    await waitFor(() => {
      expect(eventSourceSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/progress/stream?token=mock-token-123')
      );
    });

    // Trigger init event
    const initListener = eventListeners.get('init');
    if (initListener) {
      act(() => {
        initListener(new MessageEvent('init', { data: 'Connected' }));
      });
    }

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should handle job update events', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('job:update')).toBe(true);
    });

    const jobUpdate = {
      id: 'job-123',
      type: 'chapter_generation',
      status: 'running',
      target_id: 'chapter-456',
      timestamp: new Date().toISOString(),
    };

    // Trigger job update event
    const jobListener = eventListeners.get('job:update');
    act(() => {
      jobListener!(new MessageEvent('job:update', {
        data: JSON.stringify(jobUpdate)
      }));
    });

    await waitFor(() => {
      expect(result.current.jobUpdates).toHaveLength(1);
      expect(result.current.jobUpdates[0]).toEqual(jobUpdate);
    });
  });

  it('should handle chapter completion events', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('chapter:complete')).toBe(true);
    });

    const chapterComplete = {
      id: 'chapter-789',
      chapter_number: 5,
      title: 'Chapter Five',
      word_count: 2500,
    };

    // Trigger chapter complete event
    const chapterListener = eventListeners.get('chapter:complete');
    act(() => {
      chapterListener!(new MessageEvent('chapter:complete', {
        data: JSON.stringify(chapterComplete)
      }));
    });

    await waitFor(() => {
      expect(result.current.chapterCompletions).toHaveLength(1);
      expect(result.current.chapterCompletions[0]).toEqual(chapterComplete);
    });
  });

  it('should handle chapter progress updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('chapter:progress')).toBe(true);
    });

    const progressUpdate = {
      chapter_id: 'chapter-101',
      chapter_number: 3,
      agent: 'plot_agent',
      status: 'generating',
      progress: 45,
    };

    // Trigger chapter progress event
    const progressListener = eventListeners.get('chapter:progress');
    act(() => {
      progressListener!(new MessageEvent('chapter:progress', {
        data: JSON.stringify(progressUpdate)
      }));
    });

    await waitFor(() => {
      expect(result.current.currentProgress).toEqual(progressUpdate);
    });
  });

  it('should handle session status updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('session:update')).toBe(true);
    });

    const sessionUpdate = {
      is_active: true,
      requests_this_session: 25,
      time_remaining: '45 minutes',
      reset_time: '2026-01-25T15:30:00Z',
    };

    // Trigger session update event
    const sessionListener = eventListeners.get('session:update');
    act(() => {
      sessionListener!(new MessageEvent('session:update', {
        data: JSON.stringify(sessionUpdate)
      }));
    });

    await waitFor(() => {
      expect(result.current.sessionStatus).toEqual(sessionUpdate);
    });
  });

  it('should handle queue statistics updates', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('queue:stats')).toBe(true);
    });

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
    act(() => {
      queueListener!(new MessageEvent('queue:stats', {
        data: JSON.stringify(queueStats)
      }));
    });

    await waitFor(() => {
      expect(result.current.queueStats).toEqual(queueStats);
    });
  });

  it('should limit job updates to last 50 entries', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(eventListeners.has('job:update')).toBe(true);
    });

    const jobListener = eventListeners.get('job:update');

    // Send 60 job updates
    act(() => {
      for (let i = 0; i < 60; i++) {
        const jobUpdate = {
          id: `job-${i}`,
          type: 'chapter_generation',
          status: 'running',
          target_id: `chapter-${i}`,
          timestamp: new Date().toISOString(),
        };

        jobListener!(new MessageEvent('job:update', {
          data: JSON.stringify(jobUpdate)
        }));
      }
    });

    await waitFor(() => {
      expect(result.current.jobUpdates).toHaveLength(50);
      // Should have the last 50 (from job-10 to job-59)
      expect(result.current.jobUpdates[0].id).toBe('job-10');
      expect(result.current.jobUpdates[49].id).toBe('job-59');
    });
  });

  it('should handle connection errors and attempt reconnection', async () => {
    vi.useFakeTimers();

    renderHook(() => useProgressStream());

    // Wait for EventSource to be created
    await vi.waitFor(() => {
      expect(constructorCalls.length).toBe(1);
    });

    // Simulate connection error - call the onerror callback that was set on the instance
    act(() => {
      if (lastInstance?.onerror) {
        lastInstance.onerror(new Event('error'));
      }
    });

    expect(mockClose).toHaveBeenCalled();

    // Fast-forward 5 seconds to trigger reconnection
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // EventSource should be called again (once initially, once for reconnect)
    expect(constructorCalls.length).toBe(2);

    vi.useRealTimers();
  });

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() => useProgressStream());

    unmount();

    expect(mockClose).toHaveBeenCalled();
  });

  it('should provide manual reconnect function', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Initial connection
    await waitFor(() => {
      expect(constructorCalls.length).toBe(1);
    });

    // Call reconnect
    act(() => {
      result.current.reconnect();
    });

    await waitFor(() => {
      expect(constructorCalls.length).toBe(2);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should not connect if no auth token available', async () => {
    const { getToken } = await import('../auth');
    vi.mocked(getToken).mockReturnValue(null);

    // Clear the constructor calls from previous tests
    constructorCalls.length = 0;

    renderHook(() => useProgressStream());

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have created EventSource
    expect(constructorCalls.length).toBe(0);

    // Restore mocks
    vi.mocked(getToken).mockReturnValue('mock-token-123');
  });

  it('should update progress incrementally', async () => {
    const { result } = renderHook(() => useProgressStream());

    // Wait for component to mount and register listeners
    await waitFor(() => {
      expect(eventListeners.has('chapter:progress')).toBe(true);
    });

    const progressListener = eventListeners.get('chapter:progress');

    // Send first progress update
    act(() => {
      progressListener!(new MessageEvent('chapter:progress', {
        data: JSON.stringify({
          chapter_id: 'chapter-1',
          chapter_number: 1,
          agent: 'plot_agent',
          status: 'generating',
          progress: 25,
        })
      }));
    });

    await waitFor(() => {
      expect(result.current.currentProgress?.progress).toBe(25);
    });

    // Send second progress update
    act(() => {
      progressListener!(new MessageEvent('chapter:progress', {
        data: JSON.stringify({
          chapter_id: 'chapter-1',
          chapter_number: 1,
          agent: 'plot_agent',
          status: 'generating',
          progress: 75,
        })
      }));
    });

    await waitFor(() => {
      expect(result.current.currentProgress?.progress).toBe(75);
    });
  });
});
