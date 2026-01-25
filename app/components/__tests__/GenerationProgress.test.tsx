import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerationProgress from '../GenerationProgress';

describe('GenerationProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should not render when inactive and no error', () => {
    const { container } = render(
      <GenerationProgress isActive={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render progress modal when active', () => {
    render(<GenerationProgress isActive={true} />);

    expect(screen.getByText('Generating with AI')).toBeInTheDocument();
  });

  it('should display custom title', () => {
    render(
      <GenerationProgress
        isActive={true}
        title="Creating Chapter"
      />
    );

    expect(screen.getByText('Creating Chapter')).toBeInTheDocument();
  });

  it('should display subtitle when provided', () => {
    render(
      <GenerationProgress
        isActive={true}
        subtitle="Chapter 5: The Showdown"
      />
    );

    expect(screen.getByText('Chapter 5: The Showdown')).toBeInTheDocument();
  });

  it('should update elapsed time', async () => {
    render(<GenerationProgress isActive={true} />);

    // Initially should show 0:00
    expect(screen.getByText(/0:00 elapsed/)).toBeInTheDocument();

    // Advance time by 5 seconds
    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => {
      expect(screen.getByText(/0:05 elapsed/)).toBeInTheDocument();
    });

    // Advance time by 1 minute
    await vi.advanceTimersByTimeAsync(60000);

    await waitFor(() => {
      expect(screen.getByText(/1:05 elapsed/)).toBeInTheDocument();
    });
  });

  it('should calculate remaining time correctly', async () => {
    render(
      <GenerationProgress
        isActive={true}
        estimatedTime={120} // 2 minutes
      />
    );

    // Initially should show ~2:00 remaining
    expect(screen.getByText(/~2:00 remaining/)).toBeInTheDocument();

    // Advance time by 30 seconds
    await vi.advanceTimersByTimeAsync(30000);

    await waitFor(() => {
      expect(screen.getByText(/~1:30 remaining/)).toBeInTheDocument();
    });
  });

  it('should display progress bar', () => {
    render(<GenerationProgress isActive={true} />);

    // Should have a progress bar element
    const progressBar = document.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should cap progress at 95%', async () => {
    render(
      <GenerationProgress
        isActive={true}
        estimatedTime={10} // 10 seconds
      />
    );

    // Advance time beyond estimated time
    await vi.advanceTimersByTimeAsync(15000);

    await waitFor(() => {
      const progressBar = document.querySelector('[style*="width: 95%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('should cycle through default messages', async () => {
    render(<GenerationProgress isActive={true} />);

    const initialMessage = screen.getByText(/Analyzing story requirements/);
    expect(initialMessage).toBeInTheDocument();

    // Advance time by 4 seconds to trigger message change
    await vi.advanceTimersByTimeAsync(4000);

    await waitFor(() => {
      expect(screen.getByText(/Crafting narrative structure/)).toBeInTheDocument();
    });
  });

  it('should display custom current step', () => {
    render(
      <GenerationProgress
        isActive={true}
        currentStep="Generating character dialogue..."
      />
    );

    expect(screen.getByText('Generating character dialogue...')).toBeInTheDocument();
  });

  it('should render steps when provided', () => {
    const steps = [
      { id: '1', label: 'Create outline', status: 'completed' as const },
      { id: '2', label: 'Generate content', status: 'active' as const },
      { id: '3', label: 'Review quality', status: 'pending' as const },
    ];

    render(
      <GenerationProgress
        isActive={true}
        steps={steps}
      />
    );

    expect(screen.getByText('Create outline')).toBeInTheDocument();
    expect(screen.getByText('Generate content')).toBeInTheDocument();
    expect(screen.getByText('Review quality')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button clicked', async () => {
    vi.useRealTimers(); // Use real timers for this test
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <GenerationProgress
        isActive={true}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel Generation');
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    vi.useFakeTimers(); // Restore fake timers
  });

  it('should render error state', () => {
    render(
      <GenerationProgress
        isActive={false}
        error="Failed to connect to AI service"
      />
    );

    expect(screen.getByText('Generation Failed')).toBeInTheDocument();
    expect(screen.getByText('Failed to connect to AI service')).toBeInTheDocument();
  });

  it('should show Try Again button in error state', async () => {
    vi.useRealTimers();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <GenerationProgress
        isActive={false}
        error="Network error"
        onCancel={onCancel}
      />
    );

    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
  });

  it('should not show cancel button when onCancel not provided', () => {
    render(<GenerationProgress isActive={true} />);

    expect(screen.queryByText('Cancel Generation')).not.toBeInTheDocument();
  });

  it('should display tip message', () => {
    render(<GenerationProgress isActive={true} />);

    expect(
      screen.getByText(/AI generation typically takes 1-3 minutes/)
    ).toBeInTheDocument();
  });

  it('should show completed step indicator', () => {
    const steps = [
      { id: '1', label: 'Step 1', status: 'completed' as const },
    ];

    render(
      <GenerationProgress
        isActive={true}
        steps={steps}
      />
    );

    // Completed steps should show a checkmark (Y)
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('should show error step indicator', () => {
    const steps = [
      { id: '1', label: 'Failed step', status: 'error' as const },
    ];

    render(
      <GenerationProgress
        isActive={true}
        steps={steps}
      />
    );

    // Error steps should show exclamation mark
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('should format elapsed time with leading zeros', async () => {
    render(<GenerationProgress isActive={true} />);

    // Advance time by 5 seconds
    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => {
      expect(screen.getByText(/0:05 elapsed/)).toBeInTheDocument();
    });
  });

  it('should reset timer when becoming active after being inactive', async () => {
    const { rerender } = render(<GenerationProgress isActive={false} />);

    // Make it active
    rerender(<GenerationProgress isActive={true} />);

    // Should start from 0
    expect(screen.getByText(/0:00 elapsed/)).toBeInTheDocument();

    // Advance time
    await vi.advanceTimersByTimeAsync(3000);

    await waitFor(() => {
      expect(screen.getByText(/0:03 elapsed/)).toBeInTheDocument();
    });

    // Make it inactive, then active again
    rerender(<GenerationProgress isActive={false} />);
    rerender(<GenerationProgress isActive={true} />);

    // Should reset to 0
    await waitFor(() => {
      expect(screen.getByText(/0:00 elapsed/)).toBeInTheDocument();
    });
  });

  it('should stop timers when becoming inactive', async () => {
    const { rerender } = render(<GenerationProgress isActive={true} />);

    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => {
      expect(screen.getByText(/0:05 elapsed/)).toBeInTheDocument();
    });

    // Make inactive
    rerender(<GenerationProgress isActive={false} />);

    // Component should unmount or not show
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });

  it('should show backdrop overlay when active', () => {
    vi.useRealTimers();
    render(<GenerationProgress isActive={true} />);

    // The overlay is the fixed position div with backdrop filter
    const overlay = document.querySelector('[style*="fixed"]');
    expect(overlay).toBeInTheDocument();
    vi.useFakeTimers();
  });

  it('should render animated spinner in normal state', () => {
    const { container } = render(<GenerationProgress isActive={true} />);

    const spinner = container.querySelector('[style*="animation: spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('should not render spinner in error state', () => {
    const { container } = render(
      <GenerationProgress
        isActive={false}
        error="Error occurred"
      />
    );

    const spinner = container.querySelector('[style*="animation: spin"]');
    expect(spinner).not.toBeInTheDocument();
  });
});
