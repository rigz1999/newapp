import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal, AlertModal } from './Modals';

describe('ConfirmModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Test"
        message="Test message"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Action"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        confirmText="Yes"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('Yes');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        cancelText="No"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('No');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should use danger styling when type is danger', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete"
        message="This action is permanent"
        type="danger"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirmer/i });
    expect(confirmButton).toHaveClass('bg-finixar-red');
  });

  it('should use warning styling when type is warning', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Warning"
        message="Please be careful"
        type="warning"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirmer/i });
    expect(confirmButton).toHaveClass('bg-amber-600');
  });

  it('should display default button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    expect(screen.getByText('Confirmer')).toBeInTheDocument();
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should display custom button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        confirmText="Accept"
        cancelText="Decline"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('should close when clicking backdrop', () => {
    const { container } = render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        onConfirm={mockOnConfirm}
        onClose={mockOnCancel}
      />
    );

    // The backdrop is the outermost div with the onClick handler
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});

describe('AlertModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AlertModal isOpen={false} title="Alert" message="Alert message" onClose={mockOnClose} />
    );

    expect(screen.queryByText('Alert')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Important Alert"
        message="Please read this"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Important Alert')).toBeInTheDocument();
    expect(screen.getByText('Please read this')).toBeInTheDocument();
  });

  it('should call onClose when button is clicked', () => {
    render(<AlertModal isOpen={true} title="Alert" message="Message" onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display success styling', () => {
    const { container } = render(
      <AlertModal
        isOpen={true}
        title="Success"
        message="Operation completed"
        type="success"
        onClose={mockOnClose}
      />
    );

    // Success type uses green background for icon container
    const iconContainer = container.querySelector('.bg-green-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should display error styling', () => {
    const { container } = render(
      <AlertModal
        isOpen={true}
        title="Error"
        message="Something went wrong"
        type="error"
        onClose={mockOnClose}
      />
    );

    // Error type uses red background for icon container
    const iconContainer = container.querySelector('.bg-red-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should display warning styling', () => {
    const { container } = render(
      <AlertModal
        isOpen={true}
        title="Warning"
        message="Please be careful"
        type="warning"
        onClose={mockOnClose}
      />
    );

    // Warning type uses amber background for icon container
    const iconContainer = container.querySelector('.bg-amber-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should display info styling by default', () => {
    const { container } = render(
      <AlertModal isOpen={true} title="Information" message="FYI" onClose={mockOnClose} />
    );

    // Info type (default) uses blue background for icon container
    const iconContainer = container.querySelector('.bg-blue-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should use custom button text', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Alert"
        message="Message"
        buttonText="Got it"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Got it')).toBeInTheDocument();
  });

  it('should close when clicking backdrop', () => {
    const { container } = render(
      <AlertModal isOpen={true} title="Alert" message="Message" onClose={mockOnClose} />
    );

    // The backdrop is the outermost div with onClick
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
