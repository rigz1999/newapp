import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertModal } from './AlertModal';

describe('AlertModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Alert',
    message: 'Test message',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<AlertModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Alert')).not.toBeInTheDocument();
  });

  it('should render title and message when open', () => {
    render(<AlertModal {...defaultProps} />);
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    render(<AlertModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test Alert');
  });

  it('should call onClose when OK button is clicked', () => {
    render(<AlertModal {...defaultProps} />);
    fireEvent.click(screen.getByText('OK'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm and onClose when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<AlertModal {...defaultProps} onConfirm={onConfirm} confirmText="Proceed" />);
    fireEvent.click(screen.getByText('Proceed'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show cancel button for confirm type', () => {
    render(<AlertModal {...defaultProps} type="confirm" />);
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should not show cancel button for non-confirm types', () => {
    render(<AlertModal {...defaultProps} type="success" />);
    expect(screen.queryByText('Annuler')).not.toBeInTheDocument();
  });

  it('should display success styling', () => {
    const { container } = render(<AlertModal {...defaultProps} type="success" />);
    expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
  });

  it('should display error styling', () => {
    const { container } = render(<AlertModal {...defaultProps} type="error" />);
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('should display warning styling', () => {
    const { container } = render(<AlertModal {...defaultProps} type="warning" />);
    expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
  });

  it('should display info styling by default', () => {
    const { container } = render(<AlertModal {...defaultProps} />);
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('should show loading spinner when isLoading is true', () => {
    render(<AlertModal {...defaultProps} isLoading={true} />);
    // When loading, buttons should not be rendered
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('should not close on backdrop click when loading', () => {
    render(<AlertModal {...defaultProps} isLoading={true} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should close on backdrop click when not loading', () => {
    render(<AlertModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should use custom confirm and cancel text', () => {
    render(
      <AlertModal
        {...defaultProps}
        type="confirm"
        confirmText="Yes"
        cancelText="No"
      />
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});
