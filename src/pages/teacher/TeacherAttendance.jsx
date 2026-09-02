import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import Footer from '../../components/Footer';
import { fetchAttendance as apiFetchAttendance } from '../../services/api';
import { Lock, ShieldAlert, CheckCircle2, UserCheck, Calendar as CalendarIcon, Loader2, WifiOff } from 'lucide-react';

export default function TeacherAttendance() {
  const {
    students,
    myClasses,
    saveTeacherAttendance,
    getAttendanceForDate,
    addToast
  } = useApp();

  const assignedClasses = Array.isArray(myClasses) && myClasses.length ? myClasses : [];
  const [selectedClass, setSelectedClass] = useState(assignedClasses[0] || '');
  
  // Interactive Date Picker state (defaults to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Local student attendance map for selected date: { [studentId]: 'P' | 'A' } (checkbox: checked = Present)
  const [studentStatuses, setStudentStatuses] = useState({});
  const [isLocked, setIsLocked] = useState(false);

  // API sync state
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Filter actual enrolled students for the selected class — STRICT class scope.
  // No all-students fallback: if the assigned class has no students, show none.
  const classStudents = (students || []).filter(s => s && s.classSection === selectedClass);
  const activeStudents = classStudents;

  // Fetch attendance: try API first, fall back to context
  const loadAttendanceForDate = useCallback(async (cls, dt) => {
    setIsApiLoading(true);
    setApiError(null);
    try {
      const response = await apiFetchAttendance(cls, dt);
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        setIsApiConnected(!response.isMock);
        const statusMap = {};
        let anyLocked = false;
        response.data.forEach(r => {
          // API returns { studentId, status: 'Present'|'Absent' }, map to P/A
          const code = r.status === 'Present' ? 'P' : r.status === 'Absent' ? 'A' : r.status?.[0] || 'A';
          statusMap[r.studentId] = code;
          if (r.isLocked === 1 || r.isLocked === true) anyLocked = true;
        });
        setStudentStatuses(statusMap);
        setIsLocked(anyLocked);
        setIsApiLoading(false);
        return; // loaded from API, skip context
      }
    } catch {
      setIsApiConnected(false);
    }
    setIsApiLoading(false);

    // Fall back to AppContext local state
    const record = getAttendanceForDate ? getAttendanceForDate(cls, dt) : null;
    if (record && record.records && record.records.length > 0) {
      setIsLocked(!!record.isLockedByTeacher);
      const statusMap = {};
      record.records.forEach(r => {
        statusMap[r.studentId] = r.status || 'A';
      });
      setStudentStatuses(statusMap);
    } else {
      setIsLocked(false);
      setStudentStatuses({});
    }
  }, [getAttendanceForDate]);

  useEffect(() => {
    loadAttendanceForDate(selectedClass, selectedDate);
  }, [selectedClass, selectedDate, loadAttendanceForDate]);

  // Checkbox toggle: checked = Present, unchecked = Absent
  const handleToggleStatus = (studentId) => {
    if (isLocked) {
      addToast('Read-Only Record', 'Attendance for this date is locked. Only administrators can modify it via Attendance Override.', 'warning');
      return;
    }
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'P' ? 'A' : 'P'
    }));
  };

  // Submit attendance — single atomic save + lock (no separate Save/Update step).
  const handleSubmitAttendance = async () => {
    if (isLocked) {
      addToast('Already Locked', 'Attendance for this date is locked. Only administrators can modify it via Attendance Override.', 'warning');
      return;
    }
    if (activeStudents.length === 0) {
      addToast('No Students', 'No students found in this class.', 'warning');
      return;
    }
    const recordsArray = activeStudents.map(st => ({
      studentId: st.id,
      studentName: st.name,
      status: studentStatuses[st.id] === 'P' ? 'P' : 'A'
    }));

    // Persist via the context — SINGLE save path (API + store synced with server rows).
    // lock=true → the backend marks the class+date as locked for the teacher in the DB.
    if (saveTeacherAttendance) {
      setIsSaving(true);
      try {
        const res = await saveTeacherAttendance(selectedClass, selectedDate, recordsArray, true);
        if (res?.success) {
          setIsLocked(true);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Format date for visual display
  const displayFormattedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : selectedDate;

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8 justify-between">
        <div>
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Horizontal Lecture Attendance Register</h1>
              <p className="text-xs text-slate-500 font-medium">Select class & date to record or update class attendance logs.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* API Connection Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                isApiLoading ? 'bg-amber-50 text-amber-700 border-amber-200' :
                isApiConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isApiLoading
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Syncing…</>
                  : isApiConnected
                    ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> MySQL Live</>
                    : <><WifiOff className="w-3 h-3" /> Local Mode</>
                }
              </div>
              {/* Class Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-xs">
                <span className="text-[10px] font-black uppercase text-slate-400">Class:</span>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {assignedClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Interactive Date Picker Input */}
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-purple-500/30">
                <CalendarIcon className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-[10px] font-black uppercase text-slate-400 hidden sm:inline">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer font-mono"
                />
              </div>

              {/* Submit Button — single atomic save + lock */}
              {isLocked ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">
                  <Lock className="w-4 h-4" />
                  <span>Locked (Read-Only)</span>
                </div>
              ) : (
                <button
                  onClick={handleSubmitAttendance}
                  disabled={isSaving || isApiLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all qobe-btn-primary cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSaving ? 'Submitting…' : 'Submit Attendance'}</span>
                </button>
              )}
            </div>
          </div>

          {/* API Error Banner */}
          {apiError && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Banner */}
          {isLocked ? (
            <div className="mb-6 p-4 rounded-2xl bg-amber-950 text-amber-200 border border-amber-800 flex items-start gap-3 shadow-md">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-extrabold uppercase tracking-wide text-amber-300">ATTENDANCE RECORD LOCKED FOR {displayFormattedDate}</h4>
                <p className="mt-0.5 text-amber-200 leading-relaxed font-medium">
                  Attendance for this date is locked in read-only mode. Only School Administrators possess edit or override permissions.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#5A3193] shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-extrabold uppercase tracking-wide text-[#2d1a4e]">Attendance Register ({selectedClass} — {displayFormattedDate})</h4>
                <p className="mt-0.5 text-purple-800 font-medium">
                  Tick the checkbox to mark a student <strong>Present</strong>; leave it unticked for <strong>Absent</strong>, then click <strong>"Submit Attendance"</strong>. Once submitted, attendance locks automatically — only administrators can modify it afterwards.
                </p>
              </div>
            </div>
          )}

          {/* Main Attendance Table / Empty State */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Lecture Log Grid ({selectedClass})</span>
                <span className="text-xs font-normal text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {displayFormattedDate}
                </span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {activeStudents.length} Enrolled Students
              </span>
            </div>

            {activeStudents.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-extrabold text-slate-800 text-sm">No Students in {selectedClass}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Students enrolled in this class will appear here for attendance marking.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-left border-collapse border border-slate-300 min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="p-2 border border-slate-800 text-center w-12">Photo</th>
                      <th className="p-2.5 border border-slate-800">Roll / Reg No</th>
                      <th className="p-2.5 border border-slate-800">Student Name</th>
                      <th className="p-2.5 border border-slate-800 text-center w-28">
                        Present
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {activeStudents.map((std, rIdx) => {
                      const isPresent = studentStatuses[std.id] === 'P';

                      return (
                        <tr key={std.id} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="p-1.5 border border-slate-300 text-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A3193] to-pink-500 flex items-center justify-center text-white text-[10px] font-black mx-auto border border-slate-300">
                              {(std?.name || 'S').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'S'}
                            </div>
                          </td>
                          <td className="p-2 border border-slate-300 font-mono text-[11px]">
                            {std.rollNo} <span className="text-slate-400 font-normal">({std.regNo || std.id})</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-800">
                            {std.name}
                          </td>

                          {/* Present Checkbox — checked = Present, unchecked = Absent */}
                          <td className="p-2 border border-slate-300 text-center">
                            <input
                              type="checkbox"
                              checked={isPresent}
                              onChange={() => handleToggleStatus(std.id)}
                              disabled={isLocked}
                              className="w-5 h-5 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                              aria-label={`Mark ${std.name || 'student'} present`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Global Footer Credit */}
        <Footer className="mt-8" />
      </main>
    </div>
  );
}

