import { RowData } from '../components/VirtualGrid/VirtualGrid.types';

// --- Currency Formatting ---
export const formatCurrency = (
  value: number | string,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

// --- Date Formatting ---
export const formatDate = (
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  locale: string = 'en-US'
): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
};

// --- DateTime Formatting ---
export const formatDateTime = (
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale: string = 'en-US'
): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
};

// --- Percentage Formatting ---
export const formatPercentage = (
  value: number | string,
  decimals: number = 2,
  locale: string = 'en-US'
): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue / 100);
};

// --- Number Formatting (e.g., thousands separator) ---
export const formatNumber = (
  value: number | string,
  decimals: number = 0,
  locale: string = 'en-US'
): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);
};

// --- Boolean Formatting ---
export const formatBoolean = (
  value: any,
  trueLabel: string = 'Yes',
  falseLabel: string = 'No'
): string => {
  return value ? trueLabel : falseLabel;
};

// --- Status Formatting with Color ---
export const formatStatus = (value: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: '#22c55e' },
    inactive: { label: 'Inactive', color: '#ef4444' },
    pending: { label: 'Pending', color: '#f59e0b' },
    cancelled: { label: 'Cancelled', color: '#6b7280' },
    completed: { label: 'Completed', color: '#22c55e' },
    processing: { label: 'Processing', color: '#3b82f6' },
    shipped: { label: 'Shipped', color: '#8b5cf6' },
    delivered: { label: 'Delivered', color: '#22c55e' },
  };
  const normalized = value?.toLowerCase?.() || '';
  return statusMap[normalized] || { label: String(value), color: '#6b7280' };
};

// --- Truncate Text ---
export const truncateText = (value: string, maxLength: number = 20): string => {
  if (!value) return '';
  return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
};

// --- Phone Number Formatting ---
export const formatPhoneNumber = (value: string, countryCode: string = '+92'): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return value;
};

// --- Relative Time Formatting ---
export const formatRelativeTime = (value: string | Date | number): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(value);
};

// --- Highlight Search Matches ---
export const highlightMatch = (
  value: string,
  searchTerm: string,
  caseSensitive: boolean = false
): React.ReactNode => {
  if (!value || !searchTerm) return value;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      flags
    );
    const parts = value.split(regex);
    return parts.reduce((acc: React.ReactNode[], part, i) => {
      if (i > 0) {
        const match = value.match(regex)?.[i - 1];
        acc = [...acc, <mark key={i} style={{ backgroundColor: '#fef08a', padding: '0 2px' }}>{match}</mark>, part];
      } else {
        acc = [...acc, part];
      }
      return acc;
    }, []);
  } catch {
    return value;
  }
};

// --- File Size Formatting ---
export const formatFileSize = (bytes: number | string): string => {
  const numericValue = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(numericValue)) return String(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = numericValue;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// --- Weight/Mass Formatting ---
export const formatWeight = (value: number | string, unit: string = 'kg'): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return String(value);
  return `${numericValue.toLocaleString()} ${unit}`;
};

// --- Distance Formatting ---
export const formatDistance = (km: number | string): string => {
  const numericValue = typeof km === 'string' ? parseFloat(km) : km;
  if (isNaN(numericValue)) return String(km);
  if (numericValue < 1) return `${(numericValue * 1000).toFixed(0)} m`;
  return `${numericValue.toFixed(1)} km`;
};

// --- Duration Formatting ---
export const formatDuration = (minutes: number | string): string => {
  const numericValue = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  if (isNaN(numericValue)) return String(minutes);
  if (numericValue < 60) return `${Math.round(numericValue)} min`;
  const hours = Math.floor(numericValue / 60);
  const mins = Math.round(numericValue % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// --- Uppercase Text ---
export const formatUppercase = (value: string): string => {
  return String(value).toUpperCase();
};

// --- Title Case ---
export const formatTitleCase = (value: string): string => {
  return String(value).replace(/\b\w/g, c => c.toUpperCase());
};

// --- JSON Preview ---
export const formatJsonPreview = (value: any, maxLength: number = 50): string => {
  if (typeof value !== 'object') return String(value);
  try {
    const json = JSON.stringify(value);
    return truncateText(json, maxLength);
  } catch {
    return String(value);
  }
};