import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { fetchAttendanceHistory } from '../../services/api';
import {
  History,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

const STATUS_BADGES = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  excused: 'bg-blue-50 text-blue-700 border-blue-200'
};

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];

function normalizeRecord(raw) {
  return {
    id: String(raw.id ?? `${raw.student_id ?? raw.studentId ?? 'x'}-${raw.date ?? raw.attendance_date ?? ''}`),
    date: String(raw.date || raw.attendance_date || '').slice(0, 10),
    classSection: raw.classSection || raw.class_section || '',
    studentName: raw.studentName || raw.student_name || raw.name || '—',
    rollNo: raw.rollNo || raw.roll_number || raw.rollNumber || '—',
    status: String(raw.status || ''),
    markedBy: raw.markedBy || raw.marked_by || '—',
    time: raw.time || raw.marked_time || raw.marked_at || raw.markedAt || raw.created_at || raw.createdAt || ''
  };
}

function formatTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
}

export default function AttendanceHistory() {
  const { isTeacher, myClasses, schoolClasses } = useApp();

  // RULE 1 — Teacher: ONLY assigned classes. Admin: full school catalog.
  const classOptions = useMemo(() => {
    const source = isTeacher ? myClasses : schoolClasses;
    return Array.isArray(source) ? source.filter(Boolean) : [];
  }, [isTeacher, myClasses, schoolClasses]);

  const [classSection, setClassSection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce the student search box so typing does not spam the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setStudentQuery(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Teacher defaults to their first assigned class (never the whole school)
  useEffect(() => {
    if (isTeacher && !classSection && classOptions.length > 0) {
      setClassSection(classOptions[0]);
    }
  }, [isTeacher, classSection, classOptions]);

  const loadHistory = useCallback(async () => {
    if (isTeacher && classOptions.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAttendanceHistory({
        classSection: classSection || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        q: studentQuery || undefined,
        status: status || undefined,
        page,
        pageSize: limit
      });
      const rows = Array.isArray(response?.data) ? response.data : [];
      setRecords(rows.map(normalizeRecord));
      const totalCount = Number(response?.pagination?.total ?? response?.total ?? rows.length);
      setTotal(totalCount);
      const pagesCount = Number(response?.pagination?.totalPages) ||
        Math.max(1, Math.ceil(totalCount / limit));
      setPages(pagesCount);
    } catch (err) {
      setError(err?.message || 'Failed to load attendance history.');
      setRecords([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [classSection, dateFrom, dateTo, studentQuery, status, page, limit, isTeacher, classOptions.length]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const goToPage = (next) => setPage(Math.min(Math.max(1, next), pages));

  const exportCsv = () => {
    const header = ['Date', 'Class', 'Student', 'Roll No.', 'Status', 'Marked By', 'Time'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    records.forEach(r => {
      lines.push([r.date, r.classSection, r.studentName, r.rollNo, r.status.toUpperCase(), r.markedBy, formatTime(r.time)].map(esc).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClassChange = (e) => { setClassSection(e.target.value); setPage(1); };
  const handleStatusChange = (e) => { setStatus(e.target.value); setPage(1); };

  const inputCls = "px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center shadow-md">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Attendance History</h1>
              <p className="text-xs text-slate-500 font-medium">Complete attendance log with filters, search & CSV export.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadHistory} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCsv} disabled={records.length === 0} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* RULE 1 — Teacher with no assigned classes: show notice, never the school roster */}
        {isTeacher && classOptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
            <h2 className="text-base font-black text-slate-800 mb-1">No classes assigned yet</h2>
            <p className="text-xs text-slate-500">Contact your administrator to get classes assigned.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Class</label>
                  <select value={classSection} onChange={handleClassChange} className={`${inputCls} w-full font-medium`}>
                    {!isTeacher && <option value="">All Classes</option>}
                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Status</label>
                  <select value={status} onChange={handleStatusChange} className={`${inputCls} w-full font-medium`}>
                    <option value="">All</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Search student</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Name or roll no..." className={`${inputCls} w-full pl-8`} />
                  </div>
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Date', 'Class', 'Student', 'Roll No.', 'Status', 'Marked By', 'Time'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                      </td></tr>
                    ) : error ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-bold text-rose-600">{error}</td></tr>
                    ) : records.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-semibold text-slate-400">No attendance records found for the selected filters.</td></tr>
                    ) : records.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">{r.date || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">{r.classSection}</td>
                        <td className="px-4 py-3 text-xs font-extrabold text-slate-900">{r.studentName}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.rollNo}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_BADGES[String(r.status).toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {r.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">{r.markedBy}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{formatTime(r.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-bold text-slate-500">
                  {total > 0 ? `Showing page ${page} of ${pages} • ${total} record${total === 1 ? '' : 's'}` : '0 records'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs font-black text-slate-700">{page} / {pages}</span>
                  <button onClick={() => goToPage(page + 1)} disabled={page >= pages} className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}