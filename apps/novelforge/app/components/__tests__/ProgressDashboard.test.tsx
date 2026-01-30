import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProgressDashboard } from '../ProgressDashboard';
import { useProgressStream } from '../../lib/progress-stream';

// Mock the progress stream hook
vi.mock('../../lib/progress-stream', () => ({
  useProgressStream: vi.fn(),
}));

// Mock the theme
vi.mock('../../lib/theme', () => ({
  theme: {
    colors: {
      background: '#f9fafb',
      surface: '#ffffff',
      border: '#e5e7eb',
      text: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      primary: '#667eea',
      primaryLight: '#e0e7ff',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      running: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      pending: '#f59e0b',
      paused: '#9ca3af',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
  },
}));

const mockUseProgressStream = vi.mocked(useProgressStream);

describe('ProgressDashboard', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render connected status', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/Connected to live updates/i)).toBeInTheDocument();
  });

  it('should render disconnected status', () => {
    mockUseProgressStream.mockReturnValue({
      connected: false,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/Disconnected - reconnecting/i)).toBeInTheDocument();
  });

  it('should render queue statistics', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: {
        pending: 5,
        running: 2,
        completed: 10,
        paused: 1,
        failed: 3,
        total: 21,
      },
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText('5')).toBeInTheDocument(); // Pending
    expect(screen.getByText('2')).toBeInTheDocument(); // Running
    expect(screen.getByText('10')).toBeInTheDocument(); // Completed
    expect(screen.getByText('3')).toBeInTheDocument(); // Failed
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should render current progress when available', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: {
        chapter_id: 'ch-123',
        chapter_number: 5,
        agent: 'plot_agent',
        status: 'generating',
        progress: 65,
      },
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/Chapter 5/i)).toBeInTheDocument();
    expect(screen.getByText(/plot_agent/i)).toBeInTheDocument();
  });

  it('should render session status when available', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: {
        is_active: true,
        requests_this_session: 25,
        time_remaining: '45 minutes',
        reset_time: '2026-01-25T15:30:00Z',
      },
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/Claude Max Status/i)).toBeInTheDocument();
    expect(screen.getByText(/25/i)).toBeInTheDocument();
    expect(screen.getByText(/45 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
  });

  it('should render job updates in activity log', () => {
    const timestamp = new Date().toISOString();
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [
        {
          id: 'job-1',
          type: 'chapter_generation',
          status: 'completed',
          target_id: 'ch-1',
          timestamp,
        },
        {
          id: 'job-2',
          type: 'outline_generation',
          status: 'running',
          target_id: 'outline-1',
          timestamp,
        },
      ],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText('chapter_generation')).toBeInTheDocument();
    expect(screen.getByText('outline_generation')).toBeInTheDocument();
    expect(screen.getAllByText('completed')).toHaveLength(1);
    expect(screen.getAllByText('running')).toHaveLength(1);
  });

  it('should display empty state when no job updates', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/No recent activity/i)).toBeInTheDocument();
  });

  it('should display job updates in reverse chronological order', () => {
    const baseTime = new Date('2026-01-25T12:00:00Z');
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [
        {
          id: 'job-1',
          type: 'first_job',
          status: 'completed',
          target_id: 'target-1',
          timestamp: baseTime.toISOString(),
        },
        {
          id: 'job-2',
          type: 'second_job',
          status: 'completed',
          target_id: 'target-2',
          timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
        },
        {
          id: 'job-3',
          type: 'third_job',
          status: 'completed',
          target_id: 'target-3',
          timestamp: new Date(baseTime.getTime() + 120000).toISOString(),
        },
      ],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    const jobTypes = screen.getAllByText(/job$/);
    // Most recent should be first (reverse order)
    expect(jobTypes[0]).toHaveTextContent('third_job');
    expect(jobTypes[1]).toHaveTextContent('second_job');
    expect(jobTypes[2]).toHaveTextContent('first_job');
  });

  it('should handle paused session status', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: {
        is_active: false,
        requests_this_session: 50,
        time_remaining: '0 minutes',
        reset_time: '2026-01-25T16:00:00Z',
      },
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    expect(screen.getByText(/Paused/i)).toBeInTheDocument();
  });

  it('should render all queue statistics as zero when not available', () => {
    mockUseProgressStream.mockReturnValue({
      connected: true,
      jobUpdates: [],
      chapterCompletions: [],
      currentProgress: undefined,
      sessionStatus: undefined,
      queueStats: undefined,
      reconnect: vi.fn(),
    });

    render(<ProgressDashboard />);

    // All stats should show 0
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4); // At least 4 stat cards
  });
});
