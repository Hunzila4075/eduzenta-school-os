import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { CalendarCheck, ShieldAlert, Edit3, Trash2, CheckCircle2, XCircle, Clock, Plus, Check, X, Calendar, UserCheck } from 'lucide-react';

export default function AttendanceOverride() {
  const context = useApp() || {};
  const {
    attendance = [],
    attendanceOverrides = [],
    students = [],
    adminUpdateAttendanceRecord,
    adminDeleteAttendance,
    adminRecordClassAttendance,
    updateAttendanceOverride,
    deleteAttendanceOverride,
    currentUser
  } = context;

  // ALL hooks must come before any conditional return (React Rules of Hooks)
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('Class 10');
  const [selectedSection, setSelectedSection] = useState('A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState({});

  const safeAttendanceOverrides = Array.isArray(attendanceOverrides) ? attendanceOverrides : [];
  const safeAttendance = Array.isArray(attendance) ? attendance : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const overridesList = safeAttendanceOverrides.length > 0 ? safeAttendanceOverrides : safeAttendance;

  const classSectionKey = `${selectedClass}-${selectedSection}`;
  const matchingStudents = safeStudents.filter(s => s && s.classSection === classSectionKey);
  const displayStudents = matchingStudents.length > 0 ? matchingStudents : safeStudents;

  useEffect(() => {
    const initialMap = {};
    displayStudents.forEach(s => {
      if (s && s.id) initialMap[s.id] = 'Present';
    });
    setStudentStatuses(initialMap);
  }, [selectedClass, selectedSection, isRecordModalOpen]);

  // Safe null guard AFTER all hooks — shows recoverable UI if not logged in
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 font-sans">
        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow text-center space-y-3 max-w-sm">
          <h2 className="font-bold text-slate-900">Session Required</h2>
          <p className="text-xs text-slate-500">Please log in to access Attendance Override management.</p>
        </div>
      </div>
    );
  }

  const selectedEntry = overridesList.find(a => a && a.id === selectedEntryId);

  const handleOpenDetails = (entry) => {
    if (!entry) return;
    setSelectedEntryId(entry.id);
    setIsDetailModalOpen(true);
  };

  const handleSetSingleStatus = (stdId, status) => {
    setStudentStatuses(prev => ({ ...prev, [stdId]: status }));
  };

  const handleMarkAll = (status) => {
    const updatedMap = {};
    (displayStudents || []).forEach(s => {
      if (s && s.id) updatedMap[s.id] = status;
    });
    setStudentStatuses(updatedMap);
  };

  const handleSaveAttendance = (e) => {
    e.preventDefault();
    if (!displayStudents || displayStudents.length === 0) return;

    const recordsArray = displayStudents.map(s => ({
      studentId: s.id,
      studentName: s.name,
      status: studentStatuses[s.id] || 'Present'
    }));

    if (adminRecordClassAttendance) {
      adminRecordClassAttendance(classSectionKey, attendanceDate, recordsArray);
    }
    setIsRecordModalOpen(false);
  };

  const handleUpdateRecord = (entryObjId, studentId, status) => {
    if (updateAttendanceOverride) {
      updateAttendanceOverride(entryObjId, studentId, status);
    } else if (adminUpdateAttendanceRecord) {
      adminUpdateAttendanceRecord(entryObjId, studentId, status);
    }
  };

  const handleDeleteRecord = (entryObjId) => {
    if (deleteAttendanceOverride) {
      deleteAttendanceOverride(entryObjId);
    } else if (adminDeleteAttendance) {
      adminDeleteAttendance(entryObjId);
    }
  };

  const columns = [
    {
      label: 'Class & Date',
      accessor: 'classSection',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row?.classSection || 'Class 10-A'}</div>
          <div className="text-[11px] text-slate-500 font-mono">Date: {row?.date || 'N/A'}</div>
        </div>
      )
    },
    {
      label: 'Submission Lock Status',
      accessor: 'isLockedByTeacher',
      render: () => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-300">
          Admin Lock Enforced (Override Available)
        </span>
      )
    },
    {
      label: 'Present Ratio',
      accessor: 'records',
      render: (row) => {
        const recs = row?.records || [];
        const presentCount = recs.filter(r => r?.status === 'Present').length;
        const total = recs.length;
        const pct = total > 0 ? ((presentCount / total) * 100).toFixed(0) : 0;
        return (
          <span className="font-bold text-slate-900">
            {presentCount} / {total} Students Present ({pct}%)
          </span>
        );
      }
    },
    {
      label: 'School Admin Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDetails(row)}
            className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 min-h-[44px]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manage & Override</span>
          </button>

          <button
            onClick={() => handleDeleteRecord(row?.id)}
            className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Delete Attendance Record (Admin Exclusive)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Overrides & Management Engine</h1>
            <p className="text-xs text-slate-500 font-medium">Record class attendance for any date, modify existing entries, and manage school-wide overrides.</p>
          </div>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Record / Take Class Attendance</span>
          </button>
        </div>

        {/* Lock Rule Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-extrabold uppercase tracking-wide">Strict Admin Control & Lock Enforcement</h4>
            <p className="mt-0.5 text-amber-800 font-medium">
              Teacher submissions automatically lock to prevent unauthorized edits. As a School Administrator ({currentUser?.name || 'Admin'}), you hold full authority to record backdated logs, override individual records, or delete entries.
            </p>
          </div>
        </div>

        <DataTable
          title="School-wide Attendance Overrides Logs"
          subtitle="All class attendance records synced with student reports and result cards."
          columns={columns}
          data={overridesList || []}
          searchPlaceholder="Search class, date..."
        />

        {/* Record Class Attendance Modal */}
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          title="Admin Class Attendance Register Engine"
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Class</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:border-purple-500"
                >
                  {Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Section</label>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:border-purple-500"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" /> Attendance Date
                </label>
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Batch Action Toolbar */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-extrabold text-slate-800">
                Enrolled Students ({displayStudents.length}) — {classSectionKey}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll('Present')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] hover:bg-emerald-200 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Absent')}
                  className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[11px] hover:bg-rose-200 transition-colors"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Student Attendance List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(displayStudents || []).map((s) => {
                const status = studentStatuses[s.id] || 'Present';
                return (
                  <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Roll #{s.rollNo} • ID: {s.id}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetSingleStatus(s.id, 'Present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSingleStatus(s.id, 'Absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          status === 'Absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSingleStatus(s.id, 'Leave')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                          status === 'Leave' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md flex items-center gap-1.5 min-h-[44px]"
              >
                <UserCheck className="w-4 h-4" />
                <span>Save Class Attendance Log</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Detail & Override Modal */}
        <Modal
          isOpen={isDetailModalOpen && !!selectedEntry}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedEntry ? `Override Attendance: ${selectedEntry.classSection} (${selectedEntry.date})` : 'Override Attendance'}
        >
          {selectedEntry && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Click any student status below to immediately override attendance status:
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {(selectedEntry.records || []).map((rec, idx) => (
                  <div key={rec?.studentId || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{rec?.studentName || 'Student'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {rec?.studentId}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateRecord(selectedEntry.id, rec.studentId, 'Present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rec?.status === 'Present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleUpdateRecord(selectedEntry.id, rec.studentId, 'Absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rec?.status === 'Absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => handleUpdateRecord(selectedEntry.id, rec.studentId, 'Leave')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          rec?.status === 'Leave' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white border text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}
