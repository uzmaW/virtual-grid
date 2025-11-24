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
