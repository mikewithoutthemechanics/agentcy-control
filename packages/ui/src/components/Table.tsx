'use client';

import * as React from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  rowActions?: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  rowActions,
  emptyState,
  className = '',
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="h-12 w-12 text-slate-300 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m0 0V16.5m0-10.875v1.5c0 .621.504 1.125 1.125 1.125m8.625-1.125h-7.5c-.621 0-1.125.504-1.125 1.125m9-1.125V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 0V16.5m0-10.875v1.5c0 .621.504 1.125 1.125 1.125m-7.5 0h7.5"
            />
          </svg>
          <p className="text-sm font-medium text-slate-900">No data available</p>
          <p className="text-sm text-slate-500 mt-1">
            {emptyState || 'There are no items to display at this time.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 font-semibold text-slate-700 ${column.width || ''} ${onSort ? 'cursor-pointer select-none hover:text-slate-900' : ''}`}
                  onClick={() => onSort && onSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {onSort && sortColumn === column.key && (
                      <span className="text-slate-500">
                        {sortDirection === 'asc' ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && <th className="px-6 py-3 w-px" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-slate-50 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-3 text-slate-700">
                    {column.render ? column.render(item) : (item as Record<string, unknown>)[column.key] as React.ReactNode}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {rowActions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
