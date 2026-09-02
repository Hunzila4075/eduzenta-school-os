import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, FileSpreadsheet, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function DataTable({
  columns,
  data,
  searchPlaceholder = "Search records...",
  title,
  subtitle,
  actions,
  filterOptions = [],
  filterKey = null,
  onPdfExport
}) {
  const { addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Debounced search — avoids re-filtering the full dataset on every keystroke
  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Null-safe data guard — prevents crash if parent passes undefined/null
  const safeData = Array.isArray(data) ? data : [];

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return safeData.filter(item => {
      // Dropdown filter
      if (filterKey && selectedFilter !== 'ALL') {
        if (item[filterKey] !== selectedFilter) return false;
      }

      // Search match
      if (!debouncedTerm) return true;
      const term = debouncedTerm.toLowerCase();
      return Object.values(item).some(val =>
        val && String(val).toLowerCase().includes(term)
      );
    });
  }, [safeData, debouncedTerm, selectedFilter, filterKey]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage]);

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    if (!sortedData.length) return;
    const keys = columns.map(c => c.key || c.accessor);
    const headers = columns.map(c => c.label);
    const rows = sortedData.map(row => keys.map(k => `"${row[k] || ''}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `eduzenta_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Export Successful', 'Data exported as CSV file.', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden w-full max-w-full">
      {/* Header & Control Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/40">
        <div>
          {title && <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] md:min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="datatable-search"
              name="searchTerm"
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Filter Dropdown */}
          {filterOptions.length > 0 && (
            <select
              id="datatable-filter"
              name="selectedFilter"
              value={selectedFilter}
              onChange={e => { setSelectedFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filter category"
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              {filterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={exportCSV}
              title="Export as CSV"
              aria-label="Export table data as CSV"
              className="flex items-center gap-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors min-h-[38px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            {onPdfExport && (
              <button
                onClick={onPdfExport}
                title="Export as PDF"
                aria-label="Export table data as Bulk PDF"
                className="flex items-center gap-1 py-2 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold shadow-xs transition-colors min-h-[38px]"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Bulk PDF</span>
              </button>
            )}
          </div>

          {/* Custom Action Buttons */}
          {actions}
        </div>
      </div>

      {/* Table Body Container with overflow scroll */}
      <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 select-none">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable !== false && handleSort(col.key || col.accessor)}
                  className={`py-3.5 px-4 ${col.sortable !== false ? 'cursor-pointer hover:text-slate-900' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable !== false && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-blue-50/30 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      {col.render ? col.render(row) : row[col.key || col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  No records match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/30">
        <div>
          Showing <span className="font-bold text-slate-800">{paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
          <span className="font-bold text-slate-800">{sortedData.length}</span> entries
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-700 px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
