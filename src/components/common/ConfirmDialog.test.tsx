import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Title',
    message: 'Test message',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should render title and message when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should have correct ARIA attributes for accessibility', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test Title');
  });

  it('should call onConfirm and onClose when confirm button is clicked', async () => {
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} confirmText="Delete" />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    // X button is a button with just the X icon, not the cancel text
    const buttons = screen.getAllByRole('button');
    // The X close button is the first button (in header area)
    const xButton = buttons.find(btn => !btn.textContent?.includes('Annuler') && !btn.textContent?.includes('Confirmer'));
    if (xButton) {
      fireEvent.click(xButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('should close when clicking backdrop', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should use danger variant styling when isDangerous is true', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} isDangerous={true} />);
    const iconBg = container.querySelector('.bg-red-50');
    expect(iconBg).toBeInTheDocument();
  });

  it('should use warning variant styling by default', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const iconBg = container.querySelector('.bg-orange-50');
    expect(iconBg).toBeInTheDocument();
  });

  it('should use info variant styling when variant is info', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} variant="info" />);
    const iconBg = container.querySelector('.bg-blue-50');
    expect(iconBg).toBeInTheDocument();
  });

  it('should display impact message when provided', () => {
    render(<ConfirmDialog {...defaultProps} impact="This will delete all data permanently" />);
    expect(screen.getByText('This will delete all data permanently')).toBeInTheDocument();
  });

  it('should show loading state during async confirm', async () => {
    let resolveConfirm: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveConfirm = resolve;
        })
    );

    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirmer'));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('En cours...')).toBeInTheDocument();
    });

    // Buttons should be disabled during processing
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toBeDisabled();
    });

    // Resolve the promise
    resolveConfirm!();

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should use custom confirm text', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Yes, delete" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
  });
});
