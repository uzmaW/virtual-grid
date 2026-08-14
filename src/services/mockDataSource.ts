import { DataSource } from '../components/VirtualGrid/VirtualGrid.types';

export const mockDataSource: DataSource = {
  async getRows({ startRow, endRow, sortModel, filterModel, searchTerm }) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const allRows = [];
    const statuses = ['active', 'inactive', 'pending', 'processing', 'completed', 'cancelled'];
    const categories = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Books', 'Toys'];
    const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

    for (let i = startRow; i < Math.min(endRow, 100_000); i++) {
      const row = {
        id: i + 1,
        name: `Product ${i + 1}`,
        email: `user${i + 1}@example.com`,
        price: Math.random() * 10000,
        cost: Math.random() * 5000,
        quantity: Math.floor(Math.random() * 1000),
        discount: Math.random() * 30,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        rating: Math.floor(Math.random() * 5) + 1,
        inStock: Math.random() > 0.3,
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        weight: Math.random() * 100,
        distance: Math.random() * 500,
        duration: Math.random() * 480,
        phone: `+92${Math.floor(Math.random() * 1000000000)}`,
        description: `This is a description for Product ${i + 1}. It can be quite long and contain detailed information.`,
      };

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const match = Object.values(row).some(val =>
          String(val).toLowerCase().includes(search)
        );
        if (!match) continue;
      }

      // Apply column filters
      if (filterModel) {
        let passes = true;
        for (const [key, filter] of Object.entries(filterModel)) {
          const value = String((row as any)[key] || '').toLowerCase();
          const filterValue = String(filter.value).toLowerCase();
          switch (filter.type) {
            case 'contains':
              passes = value.includes(filterValue);
              break;
            case 'equals':
              passes = value === filterValue;
              break;
            case 'startsWith':
              passes = value.startsWith(filterValue);
              break;
            case 'endsWith':
              passes = value.endsWith(filterValue);
              break;
          }
          if (!passes) break;
        }
        if (!passes) continue;
      }

      allRows.push(row);
    }

    // Apply sorting
    if (sortModel?.length) {
      const { colId, sort } = sortModel[0];
      allRows.sort((a, b) => {
        const aVal = (a as any)[colId];
        const bVal = (b as any)[colId];
        if (aVal === bVal) return 0;
        const comparison = aVal > bVal ? 1 : -1;
        return sort === 'asc' ? comparison : -comparison;
      });
    }

    const totalRows = allRows.length;
    const rows = allRows.slice(0, endRow - startRow);

    return { rows, totalRows };
  },
};

// REST API DataSource Template
export const createRestDataSource = (baseUrl: string): DataSource => {
  return {
    async getRows({ startRow, endRow, sortModel, filterModel, searchTerm, signal }) {
      const params = new URLSearchParams({
        offset: String(startRow),
        limit: String(endRow - startRow),
      });

      if (sortModel?.length) {
        params.set('sort', sortModel.map(s => `${s.colId}:${s.sort}`).join(','));
      }

      if (filterModel) {
        params.set('filter', JSON.stringify(filterModel));
      }

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const response = await fetch(`${baseUrl}?${params}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      return { rows: data.items, totalRows: data.total };
    },
  };
};

// GraphQL DataSource Template
export const createGraphQLDataSource = (endpoint: string, query: string): DataSource => {
  return {
    async getRows({ startRow, endRow, sortModel, filterModel, searchTerm, signal }) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            offset: startRow,
            limit: endRow - startRow,
            sort: sortModel,
            filter: filterModel,
            search: searchTerm,
          },
        }),
        signal,
      });

      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      return { rows: data.rows.items, totalRows: data.rows.total };
    },
  };
};

// Local DataSource
export const createLocalDataSource = (data: any[]): DataSource => {
  return {
    async getRows({ startRow, endRow, sortModel, filterModel, searchTerm }) {
      let result = [...data];

      // Apply search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        result = result.filter(row =>
          Object.values(row).some(val =>
            String(val).toLowerCase().includes(search)
          )
        );
      }

      // Apply filters
      if (filterModel) {
        for (const [key, filter] of Object.entries(filterModel)) {
          result = result.filter(row => {
            const value = String(row[key] || '').toLowerCase();
            return value.includes(String(filter.value).toLowerCase());
          });
        }
      }

      // Apply sorting
      if (sortModel?.length) {
        const { colId, sort } = sortModel[0];
        result.sort((a, b) => {
          const aVal = a[colId];
          const bVal = b[colId];
          return sort === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
      }

      const totalRows = result.length;
      const rows = result.slice(startRow, endRow);

      return { rows, totalRows };
    },
  };
};