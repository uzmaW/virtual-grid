import { DataSource } from '../components/VirtualGrid/VirtualGrid.types';

export const mockDataSource: DataSource = {
  async getRows({ startRow, endRow }) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const rows = [];
    for (let i = startRow; i < Math.min(endRow, 100_000); i++) {
      rows.push({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      });
    }
    return { rows, totalRows: 100_000 };
  },
};
