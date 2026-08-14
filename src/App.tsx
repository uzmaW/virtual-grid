import React, { useState, useMemo, useRef } from 'react';
import VirtualGrid, { VirtualGridRef, ColumnDef } from './components/VirtualGrid/VirtualGrid';
import { mockDataSource } from './services/mockDataSource';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercentage,
  formatNumber,
  formatBoolean,
  formatStatus,
  truncateText,
  formatRelativeTime,
  formatPhoneNumber,
  formatWeight,
  formatDistance,
  formatDuration,
} from './utils/formatters';
import './App.css';

const App: React.FC = () => {
  const gridRef = useRef<VirtualGridRef>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Define columns with all the formatting options
  const columns: ColumnDef[] = [
    {
      key: 'id',
      title: 'ID',
      width: 80,
      sortable: true,
      valueFormatter: (value) => formatNumber(value),
    },
    {
      key: 'name',
      title: 'Product Name',
      width: 180,
      sortable: true,
      filterable: true,
      valueFormatter: (value) => truncateText(value, 25),
    },
    {
      key: 'email',
      title: 'Email',
      width: 220,
      filterable: true,
      valueFormatter: (value) => truncateText(value, 30),
    },
    {
      key: 'price',
      title: 'Price',
      width: 130,
      sortable: true,
      valueFormatter: (value) => formatCurrency(value, 'PKR', 'ur-PK'),
      cellStyle: ({ value }) => ({
        fontWeight: 'bold',
        color: value > 5000 ? '#22c55e' : '#6b7280',
      }),
    },
    {
      key: 'cost',
      title: 'Cost',
      width: 130,
      sortable: true,
      valueFormatter: (value) => formatCurrency(value, 'PKR', 'ur-PK'),
    },
    {
      key: 'profit',
      title: 'Profit',
      width: 130,
      valueFormatter: (value, row) => {
        const profit = (row.price || 0) - (row.cost || 0);
        return profit >= 0 ? `+${formatCurrency(profit, 'PKR', 'ur-PK')}` : formatCurrency(profit, 'PKR', 'ur-PK');
      },
      cellStyle: ({ value, row }) => ({
        color: (row.price || 0) - (row.cost || 0) >= 0 ? '#22c55e' : '#ef4444',
        fontWeight: 'bold',
      }),
    },
    {
      key: 'quantity',
      title: 'Qty',
      width: 100,
      sortable: true,
      valueFormatter: (value) => formatNumber(value),
    },
    {
      key: 'discount',
      title: 'Discount',
      width: 110,
      sortable: true,
      valueFormatter: (value) => formatPercentage(value, 1),
      cellStyle: ({ value }) => ({
        color: value > 20 ? '#22c55e' : value > 10 ? '#f59e0b' : '#6b7280',
      }),
    },
    {
      key: 'status',
      title: 'Status',
      width: 130,
      sortable: true,
      filterable: true,
      valueFormatter: (value) => formatStatus(value).label,
      cellStyle: ({ value }) => ({
        color: formatStatus(value).color,
        fontWeight: 500,
      }),
    },
    {
      key: 'category',
      title: 'Category',
      width: 130,
      sortable: true,
      filterable: true,
    },
    {
      key: 'city',
      title: 'City',
      width: 130,
      sortable: true,
      filterable: true,
    },
    {
      key: 'rating',
      title: 'Rating',
      width: 140,
      sortable: true,
      cellRenderer: ({ value }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              style={{
                color: star <= value ? '#fbbf24' : '#d1d5db',
                fontSize: '14px',
              }}
            >
              ★
            </span>
          ))}
          <span style={{ marginLeft: '6px', color: '#6b7280', fontSize: '12px' }}>
            {value}/5
          </span>
        </div>
      ),
    },
    {
      key: 'inStock',
      title: 'In Stock',
      width: 100,
      sortable: true,
      valueFormatter: (value) => formatBoolean(value, '✓', '✗'),
      cellStyle: ({ value }) => ({
        color: value ? '#22c55e' : '#ef4444',
        fontWeight: 'bold',
      }),
    },
    {
      key: 'lastUpdated',
      title: 'Last Updated',
      width: 150,
      sortable: true,
      valueFormatter: (value) => formatRelativeTime(value),
    },
    {
      key: 'createdAt',
      title: 'Created At',
      width: 150,
      sortable: true,
      valueFormatter: (value) => formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' }),
    },
    {
      key: 'weight',
      title: 'Weight',
      width: 120,
      valueFormatter: (value) => formatWeight(value, 'kg'),
    },
    {
      key: 'distance',
      title: 'Distance',
      width: 120,
      valueFormatter: (value) => formatDistance(value),
    },
    {
      key: 'duration',
      title: 'Duration',
      width: 120,
      valueFormatter: (value) => formatDuration(value),
    },
    {
      key: 'phone',
      title: 'Phone',
      width: 150,
      valueFormatter: (value) => formatPhoneNumber(value),
    },
    {
      key: 'description',
      title: 'Description',
      width: 250,
      valueFormatter: (value) => truncateText(value, 40),
      cellStyle: ({ value }) => ({
        fontStyle: value.length > 30 ? 'italic' : 'normal',
        color: '#6b7280',
      }),
    },
  ];

  const handleSelectionChange = (rows: any[]) => {
    console.log('Selected rows:', rows);
  };

  const handleSortChange = (sortModel: any[]) => {
    console.log('Sort changed:', sortModel);
  };

  const handleFilterChange = (filterModel: any) => {
    console.log('Filter changed:', filterModel);
  };

  const handleError = (error: Error) => {
    console.error('Grid error:', error);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>VirtualGrid - Enhanced Demo</h1>
        <p>100,000 rows with virtual scrolling, sorting, filtering, and custom formatters</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button onClick={() => gridRef.current?.refresh()}>Refresh</button>
          <button onClick={() => gridRef.current?.clearCache()}>Clear Cache</button>
          <button onClick={() => gridRef.current?.scrollToRow(500)}>Go to Row 500</button>
        </div>
        <div className="toolbar-right">
          <input
            type="text"
            placeholder="External search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="grid-wrapper">
        <VirtualGrid
          ref={gridRef}
          columns={columns}
          dataSource={mockDataSource}
          rowKey="id"
          rowHeight={52}
          height={600}
          chunkSize={100}
          cacheSize={20}
          enableOfflineCache={true}
          enablePredictiveFetch={true}
          selectionMode="multiple"
          onSelectionChange={handleSelectionChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onError={handleError}
          enableSearch={true}
          searchPlaceholder="Search all columns..."
          enableColumnResize={true}
          enableColumnReorder={true}
          enableKeyboardNavigation={true}
        />
      </div>

      <div className="info-panel">
        <h3>Features Implemented:</h3>
        <ul>
          <li>✓ Virtual Scrolling (react-window)</li>
          <li>✓ Chunk-based Data Fetching</li>
          <li>✓ LRU + IndexedDB Caching</li>
          <li>✓ Predictive Fetching</li>
          <li>✓ Request Deduplication & Cancellation</li>
          <li>✓ Sorting & Filtering</li>
          <li>✓ Search with Highlight</li>
          <li>✓ Column Resizing & Reordering</li>
          <li>✓ Selection (Single/Multiple)</li>
          <li>✓ Keyboard Navigation</li>
          <li>✓ Error Handling & Retry</li>
          <li>✓ Custom Cell Formatting</li>
          <li>✓ Conditional Styling</li>
          <li>✓ Loading States</li>
          <li>✓ Empty State</li>
        </ul>
      </div>
    </div>
  );
};

export default App;