import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for consistent testing
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      bottom: 120,
      right: 200,
      width: 100,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children without showing tooltip initially', () => {
      render(
        <Tooltip content="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByText('Hover me')).toBeInTheDocument();
      expect(screen.queryByText('Test tooltip')).not.toBeInTheDocument();
    });

    it('should render children directly when disabled', () => {
      const { container } = render(
        <Tooltip content="Test tooltip" disabled>
          <button>Button</button>
        </Tooltip>
      );

      expect(screen.getByText('Button')).toBeInTheDocument();
      // Should not have the wrapper div when disabled
      expect(container.querySelector('.relative.inline-block')).not.toBeInTheDocument();
    });

    it('should not show tooltip when disabled even on hover', () => {
      render(
        <Tooltip content="Test tooltip" disabled>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByText('Hover me');
      fireEvent.mouseEnter(button);

      expect(screen.queryByText('Test tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Visibility Toggle', () => {
    it('should show tooltip on mouse enter', async () => {
      render(
        <Tooltip content="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        expect(screen.getByText('Test tooltip')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <Tooltip content="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        expect(screen.getByText('Test tooltip')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(wrapper!);

      await waitFor(() => {
        expect(screen.queryByText('Test tooltip')).not.toBeInTheDocument();
      });
    });

    it('should not show tooltip if content is empty', () => {
      render(
        <Tooltip content="">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Position Handling', () => {
    it('should position tooltip at top by default', async () => {
      render(
        <Tooltip content="Top tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Top tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('-translate-x-1/2');
        expect(tooltipWrapper).toHaveClass('-translate-y-full');
      });
    });

    it('should position tooltip at bottom when specified', async () => {
      render(
        <Tooltip content="Bottom tooltip" position="bottom">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Bottom tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('-translate-x-1/2');
        expect(tooltipWrapper).not.toHaveClass('-translate-y-full');
      });
    });

    it('should position tooltip at left when specified', async () => {
      render(
        <Tooltip content="Left tooltip" position="left">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Left tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('-translate-x-full');
        expect(tooltipWrapper).toHaveClass('-translate-y-1/2');
      });
    });

    it('should position tooltip at right when specified', async () => {
      render(
        <Tooltip content="Right tooltip" position="right">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Right tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('-translate-y-1/2');
        expect(tooltipWrapper).not.toHaveClass('-translate-x-full');
      });
    });

    it('should calculate correct coordinates for top position', async () => {
      render(
        <Tooltip content="Top tooltip" position="top">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Top tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        // top = rect.top - tooltipOffset = 100 - 8 = 92
        // left = rect.left + rect.width / 2 = 100 + 100/2 = 150
        expect(tooltipWrapper).toHaveStyle({ top: '92px', left: '150px' });
      });
    });

    it('should calculate correct coordinates for bottom position', async () => {
      render(
        <Tooltip content="Bottom tooltip" position="bottom">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Bottom tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        // top = rect.bottom + tooltipOffset = 120 + 8 = 128
        // left = rect.left + rect.width / 2 = 100 + 100/2 = 150
        expect(tooltipWrapper).toHaveStyle({ top: '128px', left: '150px' });
      });
    });

    it('should calculate correct coordinates for left position', async () => {
      render(
        <Tooltip content="Left tooltip" position="left">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Left tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        // top = rect.top + rect.height / 2 = 100 + 20/2 = 110
        // left = rect.left - tooltipOffset = 100 - 8 = 92
        expect(tooltipWrapper).toHaveStyle({ top: '110px', left: '92px' });
      });
    });

    it('should calculate correct coordinates for right position', async () => {
      render(
        <Tooltip content="Right tooltip" position="right">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Right tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        // top = rect.top + rect.height / 2 = 100 + 20/2 = 110
        // left = rect.right + tooltipOffset = 200 + 8 = 208
        expect(tooltipWrapper).toHaveStyle({ top: '110px', left: '208px' });
      });
    });
  });

  describe('Content Display', () => {
    it('should display the provided content text', async () => {
      render(
        <Tooltip content="This is my tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        expect(screen.getByText('This is my tooltip content')).toBeInTheDocument();
      });
    });

    it('should display arrow for top position', async () => {
      render(
        <Tooltip content="Top" position="top">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const arrows = document.querySelectorAll('.border-t-slate-800');
        expect(arrows.length).toBeGreaterThan(0);
      });
    });

    it('should display arrow for bottom position', async () => {
      render(
        <Tooltip content="Bottom" position="bottom">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const arrows = document.querySelectorAll('.border-b-slate-800');
        expect(arrows.length).toBeGreaterThan(0);
      });
    });

    it('should display arrow for left position', async () => {
      render(
        <Tooltip content="Left" position="left">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const arrows = document.querySelectorAll('.border-l-slate-800');
        expect(arrows.length).toBeGreaterThan(0);
      });
    });

    it('should display arrow for right position', async () => {
      render(
        <Tooltip content="Right" position="right">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const arrows = document.querySelectorAll('.border-r-slate-800');
        expect(arrows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Styling & Accessibility', () => {
    it('should have high z-index for proper layering', async () => {
      render(
        <Tooltip content="Tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('z-[9999]');
      });
    });

    it('should have pointer-events-none class', async () => {
      render(
        <Tooltip content="Tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('pointer-events-none');
      });
    });

    it('should have fade-in animation', async () => {
      render(
        <Tooltip content="Tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('animate-fade-in');
      });
    });

    it('should have fixed positioning', async () => {
      render(
        <Tooltip content="Tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed');
        expect(tooltipWrapper).toHaveClass('fixed');
      });
    });
  });

  describe('Portal Rendering', () => {
    it('should render tooltip to document.body using portal', async () => {
      render(
        <Tooltip content="Portal tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltip = screen.getByText('Portal tooltip');
        // Portal should render to document.body
        expect(tooltip.closest('body')).toBe(document.body);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content text', async () => {
      const longContent =
        'This is a very long tooltip content that might cause overflow issues if not handled properly';
      render(
        <Tooltip content={longContent}>
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltip = screen.getByText(longContent);
        expect(tooltip).toBeInTheDocument();
        // Should have max-width class
        expect(tooltip).toHaveClass('max-w-xs');
      });
    });

    it('should recalculate position when position prop changes', async () => {
      const { rerender } = render(
        <Tooltip content="Tooltip" position="top">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        expect(tooltipWrapper).toHaveStyle({ top: '92px' });
      });

      // Change position to bottom
      rerender(
        <Tooltip content="Tooltip" position="bottom">
          <button>Hover me</button>
        </Tooltip>
      );

      await waitFor(() => {
        const tooltipContent = screen.getByText('Tooltip');
        const tooltipWrapper = tooltipContent.closest('.fixed') as HTMLElement;
        expect(tooltipWrapper).toHaveStyle({ top: '128px' });
      });
    });

    it('should handle multiple tooltips on the same page', async () => {
      render(
        <>
          <Tooltip content="First tooltip">
            <button>First button</button>
          </Tooltip>
          <Tooltip content="Second tooltip">
            <button>Second button</button>
          </Tooltip>
        </>
      );

      const firstWrapper = screen.getByText('First button').parentElement;
      const secondWrapper = screen.getByText('Second button').parentElement;

      fireEvent.mouseEnter(firstWrapper!);
      await waitFor(() => {
        expect(screen.getByText('First tooltip')).toBeInTheDocument();
      });

      fireEvent.mouseEnter(secondWrapper!);
      await waitFor(() => {
        expect(screen.getByText('Second tooltip')).toBeInTheDocument();
      });

      // Both should be visible
      expect(screen.getByText('First tooltip')).toBeInTheDocument();
      expect(screen.getByText('Second tooltip')).toBeInTheDocument();
    });

    it('should clean up when unmounted while visible', async () => {
      const { unmount } = render(
        <Tooltip content="Tooltip">
          <button>Hover me</button>
        </Tooltip>
      );

      const wrapper = screen.getByText('Hover me').parentElement;
      fireEvent.mouseEnter(wrapper!);

      await waitFor(() => {
        expect(screen.getByText('Tooltip')).toBeInTheDocument();
      });

      unmount();

      // Tooltip should be removed from DOM
      expect(screen.queryByText('Tooltip')).not.toBeInTheDocument();
    });
  });
});
