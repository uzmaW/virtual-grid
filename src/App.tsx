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
