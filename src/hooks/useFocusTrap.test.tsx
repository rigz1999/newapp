import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

function TestModal({ isOpen: initialOpen = true }: { isOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const ref = useFocusTrap(isOpen);

  if (!isOpen) return <button onClick={() => setIsOpen(true)}>Open</button>;

  return (
    <div data-testid="modal-backdrop">
      <div ref={ref} data-testid="modal-content">
        <button data-testid="first-btn">First</button>
        <input data-testid="middle-input" />
        <button data-testid="last-btn" onClick={() => setIsOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyModal() {
  const ref = useFocusTrap(true);
  return (
    <div ref={ref} data-testid="empty-modal">
      <p>No focusable elements here</p>
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should focus the first focusable element when opened', async () => {
    render(<TestModal />);

    // Wait for the setTimeout(0) in the hook
    await vi.waitFor(() => {
      expect(screen.getByTestId('first-btn')).toHaveFocus();
    });
  });

  it('should trap Tab within the modal (last -> first)', async () => {
    render(<TestModal />);

    await vi.waitFor(() => {
      expect(screen.getByTestId('first-btn')).toHaveFocus();
    });

    // Focus the last button
    screen.getByTestId('last-btn').focus();
    expect(screen.getByTestId('last-btn')).toHaveFocus();

    // Tab from the last element should wrap to first
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByTestId('first-btn')).toHaveFocus();
  });

  it('should trap Shift+Tab within the modal (first -> last)', async () => {
    render(<TestModal />);

    await vi.waitFor(() => {
      expect(screen.getByTestId('first-btn')).toHaveFocus();
    });

    // Shift+Tab from first should wrap to last
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('last-btn')).toHaveFocus();
  });

  it('should not interfere with non-Tab keys', async () => {
    render(<TestModal />);

    await vi.waitFor(() => {
      expect(screen.getByTestId('first-btn')).toHaveFocus();
    });

    // Pressing Enter should not change focus
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByTestId('first-btn')).toHaveFocus();
  });

  it('should restore focus when modal closes', async () => {
    // Create a button that will open the modal
    const outerButtonFocusSpy = vi.fn();

    function TestWithTrigger() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onFocus={outerButtonFocusSpy} onClick={() => setIsOpen(true)} data-testid="trigger">
            Open Modal
          </button>
          {isOpen && <TestModalInner onClose={() => setIsOpen(false)} />}
        </>
      );
    }

    function TestModalInner({ onClose }: { onClose: () => void }) {
      const ref = useFocusTrap(true);
      return (
        <div ref={ref}>
          <button onClick={onClose} data-testid="close-btn">
            Close
          </button>
        </div>
      );
    }

    render(<TestWithTrigger />);

    // Focus and click the trigger
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    fireEvent.click(trigger);

    // Modal should appear
    await vi.waitFor(() => {
      expect(screen.getByTestId('close-btn')).toHaveFocus();
    });

    // Close the modal
    fireEvent.click(screen.getByTestId('close-btn'));

    // Focus should be restored to the trigger
    await vi.waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('should handle modal with no focusable elements', async () => {
    render(<EmptyModal />);

    // The container should receive tabindex="-1" and focus
    await vi.waitFor(() => {
      const modal = screen.getByTestId('empty-modal');
      expect(modal.getAttribute('tabindex')).toBe('-1');
    });
  });
});
