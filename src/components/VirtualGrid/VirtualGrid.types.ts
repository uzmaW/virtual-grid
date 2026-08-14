import React from 'react';

export interface RowData {
  [key: string]: any;
}

export interface ColumnDef {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  frozen?: 'left' | 'right' | boolean;
  // Cell rendering
  cellRenderer?: (params: { value: any; row: RowData; index: number }) => React.ReactNode;
  // Simple value formatting
  valueFormatter?: (value: any, row: RowData) => string;
  // Dynamic cell styling
  cellStyle?: (params: { value: any; row: RowData; index: number }) => React.CSSProperties;
  // Cell className
  cellClassName?: (params: { value: any; row: RowData; index: number }) => string;
}

export interface VirtualGridRef {
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
  scrollToRow: (index: number) => void;
  getSelectedRows: () => RowData[];
}

export interface SortModel {
  colId: string;
  sort: 'asc' | 'desc';
}

export interface FilterModel {
  [field: string]: { type: 'contains' | 'equals' | 'startsWith' | 'endsWith'; value: any };
}

export interface GridDataParams {
  startRow: number;
  endRow: number;
  sortModel?: SortModel[];
  filterModel?: FilterModel;
  searchTerm?: string;
  signal?: AbortSignal;
}

export interface DataSource {
  getRows(params: GridDataParams): Promise<{ rows: RowData[]; totalRows: number }>;
}

export interface VirtualGridProps {
  columns: ColumnDef[];
  dataSource: DataSource;
  // Grid dimensions
  rowHeight?: number;
  height?: number;
  width?: number | string;
  // Caching
  cacheSize?: number;
  enableOfflineCache?: boolean;
  // Data fetching
  chunkSize?: number;
  enablePredictiveFetch?: boolean;
  enableInfiniteScroll?: boolean;
  // Selection
  rowKey?: string;
  selectionMode?: 'none' | 'single' | 'multiple';
  onSelectionChange?: (selectedRows: RowData[]) => void;
  // Events
  onRowClick?: (row: RowData, index: number) => void;
  onRowDoubleClick?: (row: RowData, index: number) => void;
  onCellClick?: (col: ColumnDef, row: RowData, index: number) => void;
  // Empty/Loading states
  emptyState?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  // Error handling
  onError?: (error: Error) => void;
  // Search
  enableSearch?: boolean;
  searchPlaceholder?: string;
  // Sorting
  defaultSortModel?: SortModel[];
  onSortChange?: (sortModel: SortModel[]) => void;
  // Filtering
  onFilterChange?: (filterModel: FilterModel) => void;
  // Feature flags
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableKeyboardNavigation?: boolean;
}

export type SelectionMode = 'none' | 'single' | 'multiple';

// --- Grid Theme ---
export interface GridTheme {
  headerBg?: string;
  headerColor?: string;
  rowHoverBg?: string;
  rowSelectedBg?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export const defaultTheme: GridTheme = {
  headerBg: '#f8f9fa',
  headerColor: '#212529',
  rowHoverBg: '#f1f3f5',
  rowSelectedBg: '#e7f5ff',
  borderColor: '#dee2e6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
};