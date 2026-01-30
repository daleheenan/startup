import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('should display message', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('should display default confirm button text', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should display default cancel button text', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should display custom confirm button text', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Delete" />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('should display custom cancel button text', () => {
    render(<ConfirmDialog {...defaultProps} cancelText="Go Back" />);

    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    const backdrop = screen.getByRole('dialog');
    await user.click(backdrop);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not call onCancel when dialog content is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    const title = screen.getByText('Confirm Action');
    await user.click(title);

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not call onCancel on Escape when dialog is closed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} isOpen={false} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should have primary style by default', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton.tagName).toBe('BUTTON');
    // Verify it has gradient background (primary style)
    expect(confirmButton.style.background).toContain('linear-gradient');
  });

  it('should have danger style when specified', () => {
    render(<ConfirmDialog {...defaultProps} confirmStyle="danger" />);

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton.style.background).toBe('rgb(239, 68, 68)');
  });

  it('should prevent background scroll when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore background scroll when closed', () => {
    const { rerender } = render(<ConfirmDialog {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(document.body.style.overflow).toBe('');
  });

  it('should restore background scroll on unmount', () => {
    const { unmount } = render(<ConfirmDialog {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('should have proper ARIA attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
  });

  it('should have title with proper ID for ARIA', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const title = screen.getByText('Confirm Action');
    expect(title).toHaveAttribute('id', 'confirm-dialog-title');
  });

  it('should have message with proper ID for ARIA', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const message = screen.getByText('Are you sure you want to proceed?');
    expect(message).toHaveAttribute('id', 'confirm-dialog-message');
  });

  it('should focus confirm button when dialog opens', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveFocus();
    });
  });

  it('should handle rapid open/close cycles', () => {
    const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    rerender(<ConfirmDialog {...defaultProps} isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<ConfirmDialog {...defaultProps} isOpen={true} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should display both buttons', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should handle long title text', () => {
    const longTitle = 'This is a very long title that should still be displayed correctly';

    render(<ConfirmDialog {...defaultProps} title={longTitle} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('should handle long message text', () => {
    const longMessage =
      'This is a very long confirmation message that explains in detail what will happen when the user confirms this action. It should wrap properly and maintain readability.';

    render(<ConfirmDialog {...defaultProps} message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('should not call handlers multiple times', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByText('Confirm'));
    await user.click(screen.getByText('Confirm'));

    // Should only be called once per click
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should render with danger style and custom text', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmStyle="danger"
        confirmText="Delete Forever"
        cancelText="Keep It"
      />
    );

    expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    expect(screen.getByText('Keep It')).toBeInTheDocument();

    const confirmButton = screen.getByText('Delete Forever');
    expect(confirmButton.style.background).toBe('rgb(239, 68, 68)');
  });
});
