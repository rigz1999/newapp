import { describe, it, expect, vi } from 'vitest';
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
        onCancel={mockOnCancel}
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
        onCancel={mockOnCancel}
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
        onCancel={mockOnCancel}
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
        onCancel={mockOnCancel}
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
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirmer/i });
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('should use warning styling when type is warning', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Warning"
        message="Please be careful"
        type="warning"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirmer/i });
    expect(confirmButton).toHaveClass('bg-orange-600');
  });

  it('should display default button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
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
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('should close when clicking backdrop if allowed', () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm"
        message="Proceed?"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const backdrop = screen.getByRole('button', { hidden: true });
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
      <AlertModal
        isOpen={false}
        title="Alert"
        message="Alert message"
        onClose={mockOnClose}
      />
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
    render(
      <AlertModal
        isOpen={true}
        title="Alert"
        message="Message"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display success styling', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Success"
        message="Operation completed"
        type="success"
        onClose={mockOnClose}
      />
    );

    const icon = screen.getByTitle('Success');
    expect(icon).toBeInTheDocument();
  });

  it('should display error styling', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Error"
        message="Something went wrong"
        type="error"
        onClose={mockOnClose}
      />
    );

    const icon = screen.getByTitle('Error');
    expect(icon).toBeInTheDocument();
  });

  it('should display warning styling', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Warning"
        message="Please be careful"
        type="warning"
        onClose={mockOnClose}
      />
    );

    const icon = screen.getByTitle('Warning');
    expect(icon).toBeInTheDocument();
  });

  it('should display info styling by default', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Information"
        message="FYI"
        onClose={mockOnClose}
      />
    );

    const icon = screen.getByTitle('Info');
    expect(icon).toBeInTheDocument();
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

  it('should close when clicking X button', () => {
    render(
      <AlertModal
        isOpen={true}
        title="Alert"
        message="Message"
        onClose={mockOnClose}
      />
    );

    const xButton = screen.getAllByRole('button')[0]; // First button is the X
    fireEvent.click(xButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
