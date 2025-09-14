import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

const mockItems = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
}));

describe('usePagination', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockItems })
    );

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3); // 25 items / 10 per page = 3 pages
    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it('should handle custom itemsPerPage', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockItems, itemsPerPage: 5 })
    );

    expect(result.current.totalPages).toBe(5); // 25 items / 5 per page = 5 pages
    expect(result.current.paginatedItems).toHaveLength(5);
  });

  it('should navigate to different pages', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockItems })
    );

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0].id).toBe(11); // Second page starts at item 11
    expect(result.current.hasPrevPage).toBe(true);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should navigate to next and previous pages', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockItems })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should not go beyond page boundaries', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockItems })
    );

    act(() => {
      result.current.goToPage(5); // Beyond total pages
    });

    expect(result.current.currentPage).toBe(1); // Should stay at current page

    act(() => {
      result.current.goToPage(3); // Valid page
    });

    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.nextPage(); // Try to go beyond
    });

    expect(result.current.currentPage).toBe(3); // Should stay at last page
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() =>
      usePagination({ items: [] })
    );

    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedItems).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it('should update paginated items when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination({ items }),
      { initialProps: { items: mockItems.slice(0, 10) } }
    );

    expect(result.current.totalPages).toBe(1);

    rerender({ items: mockItems });

    expect(result.current.totalPages).toBe(3);
  });
});
