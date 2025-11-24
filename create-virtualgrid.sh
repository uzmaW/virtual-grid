#!/bin/bash

# Create project structure
mkdir -p src/components/VirtualGrid
mkdir -p src/services
mkdir -p __tests__

# Create Vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "__tests__"]
}
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "virtual-grid",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-virtualized-auto-sizer": "^1.0.7",
    "react-window": "^1.8.10"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/ui": "^2.1.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.4.5",
    "vite": "^5.2.0",
    "vitest": "^2.1.4"
  }
}
EOF

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Virtual Grid</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create main.tsx
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
EOF

# Create App.tsx
cat > src/App.tsx << 'EOF'
import React from 'react';
import VirtualGrid from './components/VirtualGrid/VirtualGrid';
import { mockDataSource } from './services/mockDataSource';

const App: React.FC = () => {
  const columns = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: 'Name', width: 200, resizable: true },
    { key: 'email', title: 'Email', width: 250, resizable: true },
  ];

  return (
    <div style={{ height: '100vh' }}>
      <VirtualGrid
        columns={columns}
        dataSource={mockDataSource}
        rowKey="id"
        selectionMode="multiple"
        onSelectionChange={(rows) => console.log('Selected:', rows)}
      />
    </div>
  );
};

export default App;
EOF

# Create mockDataSource.ts
mkdir -p src/services
cat > src/services/mockDataSource.ts << 'EOF'
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
EOF

# Create VirtualGrid.types.ts
cat > src/components/VirtualGrid/VirtualGrid.types.ts << 'EOF'
export interface ColumnDef {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

export interface RowData {
  [key: string]: any;
}

export interface SortModel {
  colId: string;
  sort: 'asc' | 'desc';
}

export interface FilterModel {
  [field: string]: { type: string; value: any };
}

export interface GridDataParams {
  startRow: number;
  endRow: number;
  sortModel?: SortModel[];
  filterModel?: FilterModel;
  searchTerm?: string;
}

export interface DataSource {
  getRows(params: GridDataParams): Promise<{ rows: RowData[]; totalRows: number }>;
}

export interface VirtualGridProps {
  columns: ColumnDef[];
  dataSource: DataSource;
  rowHeight?: number;
  bufferSize?: number;
  cacheSize?: number;
  enableVirtualScrolling?: boolean;
  enableInfiniteScroll?: boolean;
  rowKey?: string;
  selectionMode?: 'none' | 'single' | 'multiple';
  onRowClick?: (row: RowData) => void;
  onSelectionChange?: (selectedRows: RowData[]) => void;
}
EOF

# Create useRowCache.ts
cat > src/components/VirtualGrid/useRowCache.ts << 'EOF'
import { useState, useCallback } from 'react';
import { RowData } from './VirtualGrid.types';

export type RowCache = {
  get: (key: string) => RowData[] | undefined;
  set: (key: string, value: RowData[]) => void;
  has: (key: string) => boolean;
  entries: () => IterableIterator<[string, RowData[]]>;
  clear: () => void;
};

export const useRowCache = (maxSize: number): RowCache => {
  const [cache, setCache] = useState<Map<string, RowData[]>>(new Map());

  const get = useCallback((key: string) => cache.get(key), [cache]);
  const has = useCallback((key: string) => cache.has(key), [cache]);
  const entries = useCallback(() => cache.entries(), [cache]);
  const clear = useCallback(() => setCache(new Map()), []);

  const set = useCallback(
    (key: string, rows: RowData[]) => {
      setCache(prev => {
        const next = new Map(prev);
        next.set(key, rows);
        if (next.size > maxSize) {
          const oldestKey = next.keys().next().value;
          if (oldestKey !== undefined) next.delete(oldestKey);
        }
        return next;
      });
    },
    [maxSize]
  );

  return { get, set, has, entries, clear };
};
EOF

# Create VirtualGrid.module.css
cat > src/components/VirtualGrid/VirtualGrid.module.css << 'EOF'
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.controls {
  padding: 10px;
  display: flex;
  gap: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.searchInput {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.stats {
  padding: 6px 12px;
  font-size: 0.85rem;
  color: #666;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.header {
  display: flex;
  background: #f1f3f5;
  height: 40px;
  align-items: center;
  border-bottom: 2px solid #ddd;
  font-weight: 600;
}
.headerCell {
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.body {
  flex: 1;
  overflow: auto;
}
.row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  background: white;
}
.row.selected {
  background: #e3f2fd;
}
.cell {
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 100%;
  display: flex;
  align-items: center;
}
.checkboxCell {
  display: flex;
  justify-content: center;
  width: 40px !important;
  min-width: 40px !important;
  padding: 0;
}
.resizeHandle {
  width: 4px;
  height: 20px;
  background: #ccc;
  margin-left: 4px;
  cursor: col-resize;
  border-radius: 1px;
}
EOF

# Create VirtualGrid.tsx (simplified for testability)
cat > src/components/VirtualGrid/VirtualGrid.tsx << 'EOF'
import React, { useState, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styles from './VirtualGrid.module.css';
import { VirtualGridProps } from './VirtualGrid.types';
import { useRowCache } from './useRowCache';

const CHUNK_SIZE = 100;

const VirtualGrid: React.FC<VirtualGridProps> = ({
  columns,
  dataSource,
  rowHeight = 48,
  cacheSize = 1000,
  rowKey = 'id',
  selectionMode = 'none',
  onSelectionChange,
}) => {
  const [totalRows, setTotalRows] = useState(0);
  const cache = useRowCache(cacheSize);
  const previousRequestRef = useRef<{ start: number; end: number } | null>(null);

  const fetchRows = useCallback(
    async (startRow: number, endRow: number) => {
      const cacheKey = `${startRow}-${endRow}`;
      if (cache.has(cacheKey) || 
          (previousRequestRef.current?.start === startRow && 
           previousRequestRef.current?.end === endRow)) {
        return;
      }

      previousRequestRef.current = { start: startRow, end: endRow };
      try {
        const result = await dataSource.getRows({ startRow, endRow });
        cache.set(cacheKey, result.rows);
        setTotalRows(result.totalRows);
      } finally {
        previousRequestRef.current = null;
      }
    },
    [dataSource, cache]
  );

  // Initial load
  React.useEffect(() => {
    fetchRows(0, CHUNK_SIZE);
  }, [fetchRows]);

  const RowRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chunkStart = Math.floor(index / CHUNK_SIZE) * CHUNK_SIZE;
    const chunk = cache.get(`${chunkStart}-${chunkStart + CHUNK_SIZE}`) || [];
    const row = chunk[index - chunkStart];
    if (!row) return <div style={style}>Loading...</div>;

    return (
      <div style={style} className={styles.row}>
        {selectionMode !== 'none' && (
          <div className={`${styles.cell} ${styles.checkboxCell}`} style={{ width: 40 }}></div>
        )}
        {columns.map((col) => (
          <div
            key={col.key}
            className={styles.cell}
            style={{ width: col.width ?? 150 }}
          >
            {row[col.key]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.stats}>Total Rows: {totalRows}</div>
      <div className={styles.header}>
        {selectionMode !== 'none' && <div className={styles.headerCell} style={{ width: 40 }}></div>}
        {columns.map((col) => (
          <div
            key={col.key}
            className={styles.headerCell}
            style={{ width: col.width ?? 150 }}
          >
            {col.title}
          </div>
        ))}
      </div>
      <div className={styles.body}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={totalRows}
              itemSize={rowHeight}
            >
              {RowRenderer}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default VirtualGrid;
EOF

# Create test file
cat > __tests__/VirtualGrid.test.tsx << 'EOF'
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
EOF

# Create setupTests.ts
cat > src/setupTests.ts << 'EOF'
import '@testing-library/jest-dom';
EOF

echo "✅ Virtual Grid project created!"
echo "Run these commands:"
echo "  npm install"
echo "  npm run dev          # Start dev server"
echo "  npm run test         # Run unit tests"
echo "  npm run test:ui      # Open Vitest UI"