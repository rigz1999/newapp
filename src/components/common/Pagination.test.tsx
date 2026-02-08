import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination, paginate } from './Pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when totalPages is 1 or less', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={10}
        itemsPerPage={25}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render pagination controls when totalPages > 1', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText(/Affichage de/)).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display correct item range', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText('21')).toBeInTheDocument(); // Start: (2-1)*20 + 1
    expect(screen.getByText('40')).toBeInTheDocument(); // End: 2*20
  });

  it('should disable first/prev buttons on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // First page button
    expect(buttons[1]).toBeDisabled(); // Previous page button
  });

  it('should disable last/next buttons on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 2];
    const lastButton = buttons[buttons.length - 1];

    expect(nextButton).toBeDisabled();
    expect(lastButton).toBeDisabled();
  });

  it('should call onPageChange when clicking page number', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const page3Button = screen.getByRole('button', { name: '3' });
    fireEvent.click(page3Button);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when clicking next button', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 2];

    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when clicking previous button', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[1];

    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should show ellipsis for large page counts', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={20}
        totalItems={400}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('should use custom item name', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
        itemName="investisseurs"
      />
    );

    expect(screen.getByText(/investisseurs/)).toBeInTheDocument();
  });

  it('should highlight current page', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={100}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );

    const page3Button = screen.getByRole('button', { name: '3' });
    expect(page3Button).toHaveClass('bg-finixar-teal', 'text-white');
  });
});

describe('paginate utility function', () => {
  const testItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should return correct items for first page', () => {
    const result = paginate(testItems, 1, 10);

    expect(result).toHaveLength(10);
    expect(result[0].id).toBe(1);
    expect(result[9].id).toBe(10);
  });

  it('should return correct items for middle page', () => {
    const result = paginate(testItems, 5, 10);

    expect(result).toHaveLength(10);
    expect(result[0].id).toBe(41); // (5-1) * 10 + 1
    expect(result[9].id).toBe(50);
  });

  it('should return correct items for last page', () => {
    const result = paginate(testItems, 10, 10);

    expect(result).toHaveLength(10);
    expect(result[0].id).toBe(91);
    expect(result[9].id).toBe(100);
  });

  it('should handle partial last page', () => {
    const items = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(items, 6, 10);

    expect(result).toHaveLength(5); // Only 5 items on last page
    expect(result[0].id).toBe(51);
    expect(result[4].id).toBe(55);
  });

  it('should return empty array for out of range page', () => {
    const result = paginate(testItems, 20, 10);

    expect(result).toHaveLength(0);
  });

  it('should handle empty items array', () => {
    const result = paginate([], 1, 10);

    expect(result).toHaveLength(0);
  });
});
