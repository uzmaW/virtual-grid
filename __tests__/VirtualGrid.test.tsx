import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// ─── Mock CSS Module ───────────────────────────────────────────────────────────
// Return a Proxy so that any property access (styles.container etc) returns a string
vi.mock('../src/components/VirtualGrid/VirtualGrid.module.css', () => {
  return { default: new Proxy({}, { get: (_target, prop) => String(prop) }) };
});

// ─── Mock react-window ─────────────────────────────────────────────────────────
vi.mock('react-window', () => ({
  List: ({ children, itemCount, itemSize }: any) => (
    <div data-testid="fixed-size-list">
      {itemCount > 0 && children({ index: 0, style: { top: 0, height: itemSize } })}
    </div>
  ),
  FixedSizeList: ({ children, itemCount, itemSize }: any) => (
    <div data-testid="fixed-size-list">
      {itemCount > 0 && children({ index: 0, style: { top: 0, height: itemSize } })}
    </div>
  ),
}));

// ─── Mock react-virtualized-auto-sizer ────────────────────────────────────────
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: any) => children({ width: 800, height: 500 }),
  AutoSizer: ({ children }: any) => children({ width: 800, height: 500 }),
}));

// Import after mocks
import VirtualGrid from '../src/components/VirtualGrid/VirtualGrid';

const mockDataSource = {
  getRows: vi.fn().mockResolvedValue({
    rows: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ],
    totalRows: 100000,
  }),
};

describe('VirtualGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders grid with correct column headers', async () => {
    render(
      <VirtualGrid
        columns={[
          { key: 'id', title: 'ID' },
          { key: 'name', title: 'Name' },
        ]}
        dataSource={mockDataSource}
        rowKey="id"
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();

    expect(mockDataSource.getRows).toHaveBeenCalledWith(
      expect.objectContaining({ startRow: 0 })
    );
  });

  it('calls dataSource.getRows on mount', async () => {
    const ds = {
      getRows: vi.fn().mockResolvedValue({ rows: [], totalRows: 0 }),
    };
    render(
      <VirtualGrid
        columns={[{ key: 'id', title: 'ID' }]}
        dataSource={ds}
        rowKey="id"
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(ds.getRows).toHaveBeenCalled();
  });

  it('renders without crashing with empty data', async () => {
    const ds = {
      getRows: vi.fn().mockResolvedValue({ rows: [], totalRows: 0 }),
    };
    const { container } = render(
      <VirtualGrid
        columns={[{ key: 'id', title: 'ID' }]}
        dataSource={ds}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(ds.getRows).toHaveBeenCalled();
    expect(container).toBeTruthy();
  });
});
