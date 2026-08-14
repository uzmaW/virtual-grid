// @ts-nocheck
import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useReducer } from 'react';
import { List } from 'react-window';
import type { ListProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import styles from './VirtualGrid.module.css';
import { VirtualGridProps, VirtualGridRef, RowData, ColumnDef, SortModel, FilterModel, defaultTheme, GridTheme } from './VirtualGrid.types';
import { HybridCache, debounce, throttle } from '../../utils/cache';
import { highlightMatch, truncateText } from '../../utils/formatters';

// Default configuration
const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_CACHE_SIZE = 20;
const DEFAULT_ROW_HEIGHT = 48;

interface GridState {
  totalRows: number;
  loadingChunks: number;
  error: Error | null;
  isLoading: boolean;
  sortModel: SortModel[];
  filterModel: FilterModel;
  searchTerm: string;
  columnWidths: Record<string, number>;
  columnOrder: string[];
}

type GridAction =
  | { type: 'SET_TOTAL_ROWS'; payload: number }
  | { type: 'SET_LOADING'; payload: number }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_SORT'; payload: SortModel[] }
  | { type: 'SET_FILTER'; payload: FilterModel }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_COLUMN_WIDTH'; payload: { key: string; width: number } }
  | { type: 'REORDER_COLUMNS'; payload: string[] }
  | { type: 'RESET' };

const initialState: GridState = {
  totalRows: 0,
  loadingChunks: 0,
  error: null,
  isLoading: false,
  sortModel: [],
  filterModel: {},
  searchTerm: '',
  columnWidths: {},
  columnOrder: [],
};

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'SET_TOTAL_ROWS':
      return { ...state, totalRows: action.payload };
    case 'SET_LOADING':
      return { ...state, loadingChunks: Math.max(0, state.loadingChunks + action.payload), isLoading: action.payload > 0 };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SORT':
      return { ...state, sortModel: action.payload };
    case 'SET_FILTER':
      return { ...state, filterModel: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload };
    case 'SET_COLUMN_WIDTH':
      return { ...state, columnWidths: { ...state.columnWidths, [action.payload.key]: action.payload.width } };
    case 'REORDER_COLUMNS':
      return { ...state, columnOrder: action.payload };
    case 'RESET':
      return { ...initialState, columnWidths: state.columnWidths, columnOrder: state.columnOrder };
    default:
      return state;
  }
}

const VirtualGrid = forwardRef<VirtualGridRef, VirtualGridProps>(({
  columns,
  dataSource,
  rowHeight = DEFAULT_ROW_HEIGHT,
  height = 500,
  width = '100%',
  cacheSize = DEFAULT_CACHE_SIZE,
  enableOfflineCache = true,
  chunkSize = DEFAULT_CHUNK_SIZE,
  enablePredictiveFetch = true,
  rowKey = 'id',
  selectionMode = 'none',
  onSelectionChange,
  onRowClick,
  onRowDoubleClick,
  onCellClick,
  emptyState,
  loadingIndicator,
  onError,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  defaultSortModel = [],
  onSortChange,
  onFilterChange,
  enableColumnResize = true,
  enableColumnReorder = true,
  enableKeyboardNavigation = true,
}, ref) => {
  const [state, dispatch] = useReducer(gridReducer, initialState);

  // Initialize cache
  const cacheRef = useRef<HybridCache | null>(null);
  const pendingRequestsRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousRequestRef = useRef<{ start: number; end: number } | null>(null);
  const listRef = useRef<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedRowsMap, setSelectedRowsMap] = useState<Map<any, RowData>>(new Map());

  // Resize state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  // Scroll velocity tracking for predictive fetching
  const scrollVelocityRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const lastScrollTopRef = useRef(0);

  // Initialize cache
  useEffect(() => {
    cacheRef.current = new HybridCache(cacheSize, enableOfflineCache);
  }, [cacheSize, enableOfflineCache]);

  // Initialize column order
  useEffect(() => {
    dispatch({ type: 'REORDER_COLUMNS', payload: columns.map(c => c.key) });
    if (defaultSortModel.length > 0) {
      dispatch({ type: 'SET_SORT', payload: defaultSortModel });
    }
  }, [columns]);

  // Fetch rows with all optimizations
  const fetchRows = useCallback(
    debounce(async (startRow: number, endRow: number, forceRefresh: boolean = false) => {
      if (!cacheRef.current) return;

      const cacheKey = `${startRow}-${endRow}-${JSON.stringify(state.sortModel)}-${JSON.stringify(state.filterModel)}-${state.searchTerm}`;

      // Check cache first
      if (!forceRefresh) {
        const cached = await cacheRef.current.get(cacheKey);
        if (cached) {
          dispatch({ type: 'SET_TOTAL_ROWS', payload: cached.totalRows });
          return;
        }
      }

      // Deduplicate requests
      if (pendingRequestsRef.current.has(cacheKey)) {
        return;
      }

      // Cancel previous request if needed
      if (previousRequestRef.current?.start === startRow && previousRequestRef.current?.end === endRow) {
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      previousRequestRef.current = { start: startRow, end: endRow };

      pendingRequestsRef.current.add(cacheKey);
      dispatch({ type: 'SET_LOADING', payload: 1 });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const result = await dataSource.getRows({
          startRow,
          endRow,
          sortModel: state.sortModel,
          filterModel: state.filterModel,
          searchTerm: state.searchTerm,
          signal: abortControllerRef.current.signal,
        });

        if (cacheRef.current) {
          await cacheRef.current.set(cacheKey, {
            rows: result.rows,
            totalRows: result.totalRows,
          });
          await cacheRef.current.setLastUpdated(Date.now());
        }

        dispatch({ type: 'SET_TOTAL_ROWS', payload: result.totalRows });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err : new Error(String(err)) });
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        pendingRequestsRef.current.delete(cacheKey);
        dispatch({ type: 'SET_LOADING', payload: -1 });
        previousRequestRef.current = null;
      }
    }, 50),
    [dataSource, state.sortModel, state.filterModel, state.searchTerm, onError]
  );

  // Handle row selection
  const handleRowSelection = useCallback((row: RowData) => {
    if (selectionMode === 'none') return;
    const key = row[rowKey];
    setSelectedRowsMap(prev => {
      const next = new Map(prev);
      if (selectionMode === 'single') {
        next.clear();
        next.set(key, row);
      } else {
        if (next.has(key)) next.delete(key);
        else next.set(key, row);
      }
      onSelectionChange?.(Array.from(next.values()));
      return next;
    });
  }, [selectionMode, rowKey, onSelectionChange]);

  // Handle row click
  const handleRowClick = useCallback((row: RowData, index: number) => {
    onRowClick?.(row, index);
  }, [onRowClick]);

  // Handle row double click
  const handleRowDoubleClick = useCallback((row: RowData, index: number) => {
    onRowDoubleClick?.(row, index);
  }, [onRowDoubleClick]);

  // Handle cell click
  const handleCellClick = useCallback((col: ColumnDef, row: RowData, index: number) => {
    onCellClick?.(col, row, index);
  }, [onCellClick]);

  // Handle sort
  const handleSort = useCallback((colId: string) => {
    const existing = state.sortModel.find(c => c.colId === colId);
    let newSortModel: SortModel[];
    if (existing) {
      newSortModel = state.sortModel.map(c =>
        c.colId === colId ? { ...c, sort: c.sort === 'asc' ? 'desc' : 'asc' } : c
      );
    } else {
      newSortModel = [...state.sortModel, { colId, sort: 'asc' }];
    }
    onSortChange?.(newSortModel);
    dispatch({ type: 'SET_SORT', payload: newSortModel });
  }, [onSortChange, state.sortModel]);

  // Handle filter
  const handleFilter = useCallback((colId: string, value: string) => {
    const newFilterModel = { ...state.filterModel };
    if (value) {
      newFilterModel[colId] = { type: 'contains', value };
    } else {
      delete newFilterModel[colId];
    }
    onFilterChange?.(newFilterModel);
    dispatch({ type: 'SET_FILTER', payload: newFilterModel });
  }, [onFilterChange, state.filterModel]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH', payload: term });
  }, []);

  // Column resize handlers
  const startResize = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(key);
    resizeStartRef.current = {
      x: e.clientX,
      width: state.columnWidths[key] || columns.find(c => c.key === key)?.width || 150,
    };
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }, [state.columnWidths, columns]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (resizingColumn && resizeStartRef.current) {
      const newWidth = resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x);
      if (newWidth >= 50) {
        dispatch({ type: 'SET_COLUMN_WIDTH', payload: { key: resizingColumn, width: newWidth } });
      }
    }
  }, [resizingColumn]);

  const stopResize = useCallback(() => {
    setResizingColumn(null);
    resizeStartRef.current = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }, [handleResize]);

  // Column reorder handlers
  const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
    e.dataTransfer.setData('text/plain', key);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropKey: string) => {
    e.preventDefault();
    const draggedKey = e.dataTransfer.getData('text/plain');
    if (draggedKey !== dropKey) {
      const newOrder = [...state.columnOrder];
      const draggedIndex = newOrder.indexOf(draggedKey);
      const dropIndex = newOrder.indexOf(dropKey);
      if (draggedIndex !== -1 && dropIndex !== -1) {
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, draggedKey);
      }
      dispatch({ type: 'REORDER_COLUMNS', payload: newOrder });
    }
  }, [state.columnOrder]);

  // Handle scroll with velocity tracking for predictive fetching
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      if (!enablePredictiveFetch) return;

      const now = Date.now();
      const timeDiff = now - lastScrollTimeRef.current;
      const scrollDiff = e.currentTarget.scrollTop - lastScrollTopRef.current;

      if (timeDiff > 0) {
        scrollVelocityRef.current = scrollDiff / timeDiff;
      }

      lastScrollTimeRef.current = now;
      lastScrollTopRef.current = e.currentTarget.scrollTop;

      // Predictive fetch based on velocity
      if (Math.abs(scrollVelocityRef.current) > 0.1) {
        const direction = scrollVelocityRef.current > 0 ? 'down' : 'up';
        if (direction === 'down') {
          const nextStart = Math.floor((state.totalRows) / chunkSize) * chunkSize;
          if (nextStart < state.totalRows) {
            fetchRows(nextStart, nextStart + chunkSize * 2);
          }
        }
      }
    }, 100),
    [enablePredictiveFetch, state.totalRows, chunkSize]
  );

  // Handle items rendered - fetch more data
  const handleItemsRendered = useCallback(({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
    if (state.totalRows === 0 || startIndex === undefined || stopIndex === undefined) return;

    const startChunk = Math.floor(startIndex / chunkSize) * chunkSize;
    const endChunk = Math.floor(stopIndex / chunkSize) * chunkSize + chunkSize;

    for (let chunkStart = startChunk; chunkStart <= endChunk && chunkStart < state.totalRows; chunkStart += chunkSize) {
      fetchRows(chunkStart, Math.min(chunkStart + chunkSize, state.totalRows));
    }
  }, [state.totalRows, chunkSize, fetchRows]);

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    const { key, shiftKey } = e;

    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, state.totalRows - 1);
          listRef.current?.scrollToItem(next, 'smart');
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.max(prev - 1, 0);
          listRef.current?.scrollToItem(next, 'smart');
          return next;
        });
        break;
      case ' ':
        e.preventDefault();
        if (focusedIndex !== null) {
          const chunkStart = Math.floor(focusedIndex / chunkSize) * chunkSize;
          const chunk = cacheRef.current ? cacheRef.current.getSync(`${chunkStart}-${chunkStart + chunkSize}`) : null;
          const row = chunk?.rows?.[focusedIndex - chunkStart];
          if (row) handleRowSelection(row);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        listRef.current?.scrollToItem(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(state.totalRows - 1);
        listRef.current?.scrollToItem(state.totalRows - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? chunkSize : Math.min(prev + chunkSize, state.totalRows - 1);
          listRef.current?.scrollToItem(next, 'smart');
          return next;
        });
        break;
      case 'PageUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.max(prev - chunkSize, 0);
          listRef.current?.scrollToItem(next, 'smart');
          return next;
        });
        break;
    }
  }, [enableKeyboardNavigation, state.totalRows, chunkSize, focusedIndex, handleRowSelection]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      if (cacheRef.current) {
        await cacheRef.current.clear();
      }
      dispatch({ type: 'RESET' });
      await fetchRows(0, chunkSize, true);
    },
    clearCache: async () => {
      if (cacheRef.current) {
        await cacheRef.current.clear();
      }
    },
    scrollToRow: (index: number) => {
      listRef.current?.scrollToItem(index, 'smart');
      setFocusedIndex(index);
    },
    getSelectedRows: () => Array.from(selectedRowsMap.values()),
  }), [fetchRows, chunkSize, selectedRowsMap]);

  // Initial load
  useEffect(() => {
    fetchRows(0, chunkSize);
  }, []);

  // Fetch on sort/filter/search change
  useEffect(() => {
    if (state.sortModel || state.filterModel || state.searchTerm) {
      cacheRef.current?.clear();
      fetchRows(0, chunkSize, true);
    }
  }, [state.sortModel, state.filterModel, state.searchTerm]);

  // Get ordered columns
  const orderedColumns = useMemo(() => {
    return state.columnOrder
      .map(key => columns.find(c => c.key === key))
      .filter(Boolean) as ColumnDef[];
  }, [state.columnOrder, columns]);

  // Row renderer
  const RowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chunkStart = Math.floor(index / chunkSize) * chunkSize;
    const cacheKey = `${chunkStart}-${chunkStart + chunkSize}`;
    const chunk = cacheRef.current ? cacheRef.current.getSync(cacheKey) : null;
    const rows = chunk?.rows || [];
    const row = rows[index - chunkStart];

    if (!row) {
      return (
        <div style={style} className={`${styles.row} ${styles.loadingRow}`}>
          <div className={styles.skeleton} />
        </div>
      );
    }

    const isSelected = selectedRowsMap.has(row[rowKey]);
    const isFocused = focusedIndex === index;

    return (
      <div
        style={style}
        className={`${styles.row} ${isSelected ? styles.selectedRow : ''} ${isFocused ? styles.focusedRow : ''}`}
        onClick={() => handleRowClick(row, index)}
        onDoubleClick={() => handleRowDoubleClick(row, index)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {selectionMode !== 'none' && (
          <div
            className={`${styles.cell} ${styles.checkboxCell}`}
            style={{ width: 40 }}
            onClick={(e) => {
              e.stopPropagation();
              handleRowSelection(row);
            }}
          >
            <input
              type={selectionMode === 'single' ? 'radio' : 'checkbox'}
              checked={isSelected}
              readOnly
            />
          </div>
        )}
        {orderedColumns.map((col) => {
          const value = row[col.key];
          const displayValue = col.valueFormatter ? col.valueFormatter(value, row) : (value ?? '');
          const cellStyle = col.cellStyle?.({ value, row, index }) || {};
          const cellClassName = col.cellClassName?.({ value, row, index }) || '';

          return (
            <div
              key={col.key}
              className={`${styles.cell} ${cellClassName}`}
              style={{ width: state.columnWidths[col.key] || col.width || 150, ...cellStyle }}
              onClick={(e) => {
                e.stopPropagation();
                handleCellClick(col, row, index);
              }}
            >
              {col.cellRenderer ? col.cellRenderer({ value, row, index }) : (
                state.searchTerm && col.filterable ? highlightMatch(String(displayValue), state.searchTerm) : displayValue
              )}
            </div>
          );
        })}
      </div>
    );
  }, [
    chunkSize, selectedRowsMap, focusedIndex, orderedColumns, state.columnWidths, state.searchTerm,
    rowKey, handleRowClick, handleRowDoubleClick, handleRowSelection, handleCellClick, handleKeyDown
  ]);

  // Header renderer
  const renderHeader = () => (
    <div className={styles.header}>
      {selectionMode !== 'none' && (
        <div className={styles.headerCell} style={{ width: 40 }}>
          <input
            type={selectionMode === 'single' ? 'radio' : 'checkbox'}
            checked={selectedRowsMap.size > 0 && selectedRowsMap.size === state.totalRows}
            ref={(el) => {
              if (el) {
                el.indeterminate = selectedRowsMap.size > 0 && selectedRowsMap.size < state.totalRows;
              }
            }}
            onChange={() => {
              // Select all / deselect all logic
            }}
          />
        </div>
      )}
      {orderedColumns.map((col) => {
        const width = state.columnWidths[col.key] || col.width || 150;
        const sort = state.sortModel.find(s => s.colId === col.key);

        return (
          <div
            key={col.key}
            className={styles.headerCell}
            style={{ width, minWidth: col.minWidth || 50 }}
            draggable={enableColumnReorder}
            onDragStart={(e) => handleDragStart(e, col.key)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div
              className={styles.headerContent}
              onClick={() => col.sortable && handleSort(col.key)}
            >
              <span>{col.title}</span>
              {col.sortable && sort && (
                <span className={styles.sortIcon}>{sort.sort === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
            </div>
            {col.filterable && (
              <input
                type="text"
                placeholder={`Filter...`}
                className={styles.filterInput}
                onChange={(e) => handleFilter(col.key, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {enableColumnResize && (
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) => startResize(col.key, e)}
                style={{ backgroundColor: resizingColumn === col.key ? '#3498db' : undefined }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Search bar
  const renderSearchBar = () => (
    enableSearch && (
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={state.searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />
        {state.searchTerm && (
          <button
            className={styles.clearSearch}
            onClick={() => handleSearch('')}
          >
            ×
          </button>
        )}
      </div>
    )
  );

  // Loading indicator
  const renderLoadingIndicator = () => (
    <div className={styles.loadingBar}>
      <div className={styles.loadingProgress} />
    </div>
  );

  // Error state
  const renderError = () => {
    if (!state.error) return null;
    return (
      <div className={styles.errorBanner}>
        <span>Error: {state.error.message}</span>
        <button onClick={() => fetchRows(0, chunkSize, true)}>Retry</button>
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className={styles.container}
      style={{ height, width }}
      onKeyDown={handleKeyDown}
    >
      {renderError()}
      {renderSearchBar()}
      {renderHeader()}

      <div className={styles.body} onScroll={handleScroll}>
        {state.totalRows === 0 && !state.isLoading ? (
          <div className={styles.emptyState}>
            {emptyState || <p>No data available to display</p>}
          </div>
        ) : (
          <AutoSizer>
            {({ height: autoHeight, width: autoWidth }: any) => (
              <List
                ref={listRef as any}
                height={autoHeight}
                width={autoWidth}
                itemCount={state.totalRows}
                itemSize={rowHeight}
                onItemsRendered={handleItemsRendered as any}
              >
                {RowRenderer as any}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

      {state.isLoading && (loadingIndicator || renderLoadingIndicator())}

      <div className={styles.footer}>
        <span>Total Rows: {state.totalRows.toLocaleString()}</span>
        {selectedRowsMap.size > 0 && (
          <span>Selected: {selectedRowsMap.size}</span>
        )}
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;
export type { RowData, ColumnDef, SortModel, FilterModel, DataSource, VirtualGridRef, VirtualGridProps } from './VirtualGrid.types';