import React, { useState, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import styles from '@/VirtualGrid.module.css';
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
