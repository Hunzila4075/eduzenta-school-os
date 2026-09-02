import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { ShieldAlert, Trash2, Plus, RefreshCw, CalendarCheck, UserCheck, Users, ClipboardList } from 'lucide-react';

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];
const STATUS_STYLE = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200',
  Late: 'bg-amber-50 text-amber-700 border-amber-200',
  Excused: 'bg-blue-50 text-blue-700 border-blue-200'
};

export default function AttendanceOverride() {
  const {
    attendance = [],
    students = [],
    schoolClasses = [],
    adminUpdateAttendanceRecord,
    adminDeleteAttendance,
    adminRecordClassAttendance,
    refreshAttendance,
    currentUser,
    addToast
  } = useApp();

  const safeAttendance = Array.isArray(attendance) ? attendance : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const classes = Array.isArray(schoolClasses) ? schoolClasses.filter(Boolean) : [];

  // Record modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordClass, setRecordClass] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordStatuses, setRecordStatuses] = useState({});

  // Filters (class '' = all classes of this school)
  const [filterClass, setFilterClass] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Student lookup for names/rolls (students store is school-scoped from the DB)
  const studentMap = useMemo(() => {
    const map = {};
    safeStudents.forEach(s => { if (s && s.id) map[s.id] = s; });
    return map;
  }, [safeStudents]);

  const rows = useMemo(() => {
    return safeAttendance
      .filter(r => {
        if (filterClass && String(r.classSection) !== String(filterClass)) return false;
        if (filterFrom && String(r.date).slice(0, 10) < filterFrom) return false;
        if (filterTo && String(r.date).slice(0, 10) > filterTo) return false;
        return true;
      })
      .map(r => {
        const st = studentMap[r.studentId];
        return {
          ...r,
          date: String(r.date).slice(0, 10),
          studentName: st?.name || 'Unknown Student',
          rollNo: st?.rollNo || '—'
        };
      });
  }, [safeAttendance, filterClass, filterFrom, filterTo, studentMap]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAttendance?.();
    setIsRefreshing(false);
  };

  // ---- Record attendance (strict roster: ONLY students of the selected class) ----
  const roster = useMemo(
    () => safeStudents.filter(s => s && recordClass && s.classSection === recordClass),
    [safeStudents, recordClass]
  );

  const openRecordModal = () => {
    setRecordClass('');
    setRecordStatuses({});
    setIsRecordModalOpen(true);
  };

  const handleRosterStatus = (id, status) => setRecordStatuses(prev => ({ ...prev, [id]: status }));
  const handleMarkAll = (status) => {
    const map = {};
    roster.forEach(s => { map[s.id] = status; });
    setRecordStatuses(map);
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!recordClass) { addToast('Validation', 'Select a class first.', 'warning'); return; }
    if (roster.length === 0) { addToast('Validation', 'This class has no enrolled students.', 'warning'); return; }
    const recordsArray = roster.map(s => ({
      studentId: s.id,
      studentName: s.name,
      status: recordStatuses[s.id] || 'Present'
    }));
    const res = await adminRecordClassAttendance(recordClass, recordDate, recordsArray);
    if (res?.success) setIsRecordModalOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow text-center space-y-3 max-w-sm">
          <h2 className="font-bold text-slate-900">Session Required</h2>
          <p className="text-xs text-slate-500">Please log in to access Attendance Override management.</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      label: 'Date',
      accessor: 'date',
      render: (row) => <span className="font-mono font-bold text-slate-800">{row.date}</span>
    },
    {
      label: 'Class',
      accessor: 'classSection',
      render: (row) => <span className="font-extrabold text-slate-900">{row.classSection}</span>
    },
    {
      label: 'Student',
      accessor: 'studentName',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900 text-xs">{row.studentName}</div>
          <div className="text-[10px] text-slate-400 font-mono">ID: {row.studentId}</div>
        </div>
      )
    },
    { label: 'Roll No', accessor: 'rollNo' },
    {
      label: 'Status (Override)',
      accessor: 'status',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => adminUpdateAttendanceRecord(row.id, null, e.target.value)}
          className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${STATUS_STYLE[row.status] || 'border-slate-300 bg-white text-slate-700'}`}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )
    },
    {
      label: 'Marked By',
      accessor: 'markedBy',
      render: (row) => <span className="text-[11px] text-slate-500 font-medium">{row.markedBy || '—'}</span>
    },
    {
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <button
          onClick={() => adminDeleteAttendance(row.id)}
          className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Delete attendance record (Admin exclusive)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  const totalPresent = rows.filter(r => r.status === 'Present').length;
  const totalAbsent = rows.filter(r => r.status === 'Absent').length;

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-50 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-[#5A3193]" />
              Attendance Override
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Change any saved attendance status (Present / Absent / Late / Excused). Every change persists to the database instantly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openRecordModal}
              className="px-4 py-2.5 rounded-xl bg-[#5A3193] text-white text-xs font-bold hover:bg-[#4a2878] transition-colors flex items-center gap-1.5 shadow-md min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Record Attendance</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">From</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">To</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200"><ClipboardList className="w-5 h-5 text-[#5A3193]" /></div>
            <div><div className="text-lg font-black text-slate-900">{rows.length}</div><div className="text-[10px] font-bold uppercase text-slate-500">Records (filtered)</div></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
            <div><div className="text-lg font-black text-slate-900">{totalPresent}</div><div className="text-[10px] font-bold uppercase text-slate-500">Present</div></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200"><Users className="w-5 h-5 text-rose-600" /></div>
            <div><div className="text-lg font-black text-slate-900">{totalAbsent}</div><div className="text-[10px] font-bold uppercase text-slate-500">Absent</div></div>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-black text-slate-800 text-sm mb-1">No classes in your school catalog yet</h3>
            <p className="text-xs text-slate-500">Create classes first (Academic Management) — attendance is recorded per real class only.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            title="Attendance Records"
            subtitle="Saved attendance pulled live from the database"
            searchPlaceholder="Search student, class, date, marked by..."
            filterKey="status"
            filterOptions={STATUSES}
          />
        )}

        {/* Record Attendance Modal */}
        <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Class Attendance">
          <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Class *</label>
                <select
                  value={recordClass}
                  onChange={(e) => { setRecordClass(e.target.value); setRecordStatuses({}); }}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">— Select a class —</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Date *</label>
                <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {recordClass && roster.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                No students are enrolled in {recordClass}. Enroll students first.
              </div>
            )}

            {roster.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-slate-700">{roster.length} students in {recordClass}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => handleMarkAll(s)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold hover:bg-slate-50">
                        All {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {roster.map(s => (
                    <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Roll: {s.rollNo || '—'} · {s.regNo || s.id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUSES.map(st => (
                          <button key={st} type="button"
                            onClick={() => handleRosterStatus(s.id, st)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              (recordStatuses[s.id] || 'Present') === st
                                ? 'bg-[#5A3193] text-white shadow-md'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 min-h-[44px]">
                Cancel
              </button>
              <button type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#5A3193] text-white font-bold hover:bg-[#4a2878] shadow-md flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                disabled={!recordClass || roster.length === 0}>
                <CalendarCheck className="w-4 h-4" />
                <span>Save to Database</span>
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}



