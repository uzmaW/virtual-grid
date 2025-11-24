import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
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
  it('renders grid with correct columns', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    expect(mockDataSource.getRows).toHaveBeenCalledWith(
      expect.objectContaining({ startRow: 0, endRow: 100 })
    );
  });

  it('displays total row count', async () => {
    render(
      <VirtualGrid
        columns={[{ key: 'id', title: 'ID' }]}
        dataSource={mockDataSource}
        rowKey="id"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rows: 100000/)).toBeInTheDocument();
    });
  });
});
