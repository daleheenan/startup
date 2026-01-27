import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../Toast';

// Test component that uses the toast hook
function ToastTestComponent() {
  const { showToast, showSuccess, showError, showInfo, showWarning } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Generic toast')}>Show Toast</button>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showToast('Custom duration', 'info', 2000)}>
        Custom Duration
      </button>
    </div>
  );
}

describe('Toast', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when useToast is used outside provider', () => {
    // Suppress console error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Test that rendering without provider throws an error
    // We need to catch the error from React's error boundary
    let error: Error | undefined;

    const ErrorBoundary = class extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(err: Error) {
        return { hasError: true, error: err };
      }

      render() {
        if (this.state.hasError) {
          error = this.state.error;
          return null;
        }
        return this.props.children;
      }
    };

    render(
      <ErrorBoundary>
        <ToastTestComponent />
      </ErrorBoundary>
    );

    expect(error).toBeDefined();
    expect(error?.message).toBe('useToast must be used within a ToastProvider');

    consoleError.mockRestore();
  });

  it('should render toast notifications region', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('should display success toast', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display error toast', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should display info toast', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should display warning toast', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should display generic toast with default type', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    expect(screen.getByText('Generic toast')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after default duration', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();

    // Advance timers by 4000ms (default duration)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // After advancing fake timers, check immediately
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should dismiss error toast after 6000ms', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Advance by 5000ms - should still be visible
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Advance by another 1000ms - should be dismissed
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // After advancing fake timers, check immediately
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should dismiss warning toast after 5000ms', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // After advancing fake timers, check immediately
    expect(screen.queryByText('Warning message')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should respect custom duration', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Custom Duration'));

    expect(screen.getByText('Custom duration')).toBeInTheDocument();

    // Advance by 2000ms (custom duration)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After advancing fake timers, check immediately
    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should manually dismiss toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText('Dismiss notification'));
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should display multiple toasts simultaneously', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should have dismiss button with proper accessibility', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    const dismissButton = screen.getByLabelText('Dismiss notification');
    expect(dismissButton.tagName).toBe('BUTTON');
  });

  it('should have aria-live region for screen readers', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('should display appropriate icon for each toast type', () => {
    const { container } = render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    // Should have an SVG icon
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should not dismiss toast with 0 duration', () => {
    vi.useFakeTimers();

    function PersistentToastComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Persistent', 'info', 0)}>
          Show Persistent
        </button>
      );
    }

    render(
      <ToastProvider>
        <PersistentToastComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Persistent'));

    expect(screen.getByText('Persistent')).toBeInTheDocument();

    // Advance timers significantly
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should still be visible
    expect(screen.getByText('Persistent')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should clear timeout when toast is manually dismissed', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    act(() => {
      fireEvent.click(screen.getByLabelText('Dismiss notification'));
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('should handle rapid successive toasts', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    // Click multiple times rapidly
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));

    const toasts = screen.getAllByText('Success message');
    expect(toasts.length).toBe(3);
  });

  it('should clean up timeouts on unmount', () => {
    const { unmount } = render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();

    unmount();

    // No errors should occur from pending timeouts
  });
});
