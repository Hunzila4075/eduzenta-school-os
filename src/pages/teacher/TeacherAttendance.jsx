import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import Footer from '../../components/Footer';
import { fetchAttendance as apiFetchAttendance, saveAttendance as apiSaveAttendance } from '../../services/api';
import { CalendarCheck, Lock, ShieldAlert, Save, Plus, CheckCircle2, UserCheck, Calendar as CalendarIcon, RotateCcw, Loader2, WifiOff } from 'lucide-react';

export default function TeacherAttendance() {
  const {
    currentUser,
    students,
    attendance = [],
    saveTeacherAttendance,
    getAttendanceForDate,
    addToast
  } = useApp();

  const assignedClasses = currentUser?.assignedClasses || ['Class 10-A', 'Class 9-B'];
  const [selectedClass, setSelectedClass] = useState(assignedClasses[0] || 'Class 10-A');
  
  // Interactive Date Picker state (defaults to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Local student attendance map for selected date: { [studentId]: 'P' | 'A' | 'L' }
  const [studentStatuses, setStudentStatuses] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);

  // API sync state
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Filter actual enrolled students for the selected class
  const classStudents = (students || []).filter(s => s && (s.classSection === selectedClass || (!s.classSection && selectedClass === 'Class 10-A')));
  const activeStudents = classStudents.length > 0 ? classStudents : (students || []);

  // Fetch attendance: try API first, fall back to context
  const loadAttendanceForDate = useCallback(async (cls, dt) => {
    setIsApiLoading(true);
    setApiError(null);
    try {
      const response = await apiFetchAttendance(cls, dt);
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        setIsApiConnected(!response.isMock);
        const statusMap = {};
        response.data.forEach(r => {
          // API returns { studentId, status: 'Present'|'Absent' }, map to P/A
          const code = r.status === 'Present' ? 'P' : r.status === 'Absent' ? 'A' : r.status?.[0] || 'P';
          statusMap[r.studentId] = code;
        });
        setStudentStatuses(statusMap);
        setHasExistingRecord(true);
        setIsLocked(false);
        setIsApiLoading(false);
        return; // loaded from API, skip context
      }
    } catch (_) {
      setIsApiConnected(false);
    }
    setIsApiLoading(false);

    // Fall back to AppContext local state
    const record = getAttendanceForDate ? getAttendanceForDate(cls, dt) : null;
    if (record && record.records && record.records.length > 0) {
      setHasExistingRecord(true);
      setIsLocked(!!record.isLockedByTeacher);
      const statusMap = {};
      record.records.forEach(r => {
        statusMap[r.studentId] = r.status || 'P';
      });
      setStudentStatuses(statusMap);
    } else {
      setHasExistingRecord(false);
      setIsLocked(false);
      setStudentStatuses({});
    }
  }, [getAttendanceForDate]);

  useEffect(() => {
    loadAttendanceForDate(selectedClass, selectedDate);
  }, [selectedClass, selectedDate, loadAttendanceForDate]);

  // Start / Take Attendance for the Selected Date
  const handleTakeAttendanceForDate = () => {
    const initialMap = {};
    activeStudents.forEach(st => {
      if (st && st.id) {
        initialMap[st.id] = 'P';
      }
    });
    setStudentStatuses(initialMap);
    setHasExistingRecord(true);

    const formattedDateStr = new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    addToast('Attendance Started', `Attendance initialized for ${selectedClass} on ${formattedDateStr}. Toggle student statuses and click Save.`, 'success');
  };

  // Toggle student status (P -> A -> P)
  const handleToggleStatus = (studentId) => {
    if (isLocked) {
      addToast('Read-Only Record', 'Attendance for this date has been submitted and locked by admin/teacher.', 'warning');
      return;
    }
    setStudentStatuses(prev => {
      const current = prev[studentId] || 'P';
      const next = current === 'P' ? 'A' : 'P';
      return { ...prev, [studentId]: next };
    });
  };

  // Save / Update Attendance for Selected Date
  const handleSaveAttendance = async (lockRecord = false) => {
    if (!hasExistingRecord || Object.keys(studentStatuses).length === 0) {
      addToast('No Session', 'Please initialize attendance for this date first.', 'warning');
      return;
    }

    const recordsArray = activeStudents.map(st => ({
      studentId: st.id,
      studentName: st.name,
      status: studentStatuses[st.id] || 'P'
    }));

    // Save to AppContext (local state & localStorage)
    if (saveTeacherAttendance) {
      saveTeacherAttendance(selectedClass, selectedDate, recordsArray, lockRecord);
    }

    // Also try to persist to MySQL via API
    setIsSaving(true);
    setApiError(null);
    try {
      const apiRecords = recordsArray.map(r => ({
        studentId: r.studentId,
        status: r.status === 'P' ? 'Present' : 'Absent'
      }));
      const response = await apiSaveAttendance({
        classSection: selectedClass,
        date: selectedDate,
        records: apiRecords,
        markedBy: currentUser?.name || 'Teacher'
      });
      if (response?.success) {
        setIsApiConnected(!response.isMock);
      }
    } catch (_) {
      setApiError('Saved locally — API sync failed.');
    } finally {
      setIsSaving(false);
    }

    if (lockRecord) {
      setIsLocked(true);
    }

    const formattedDateStr = new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    addToast(
      lockRecord ? 'Attendance Locked' : 'Attendance Saved',
      `Attendance for ${selectedClass} on ${formattedDateStr} has been successfully ${lockRecord ? 'submitted and locked' : 'saved'}.`,
      'success'
    );
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

              {/* Action Buttons */}
              {!hasExistingRecord ? (
                <button
                  onClick={handleTakeAttendanceForDate}
                  disabled={isApiLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-60"
                >
                  {isApiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Take Attendance for {selectedDate}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSaveAttendance(false)}
                    disabled={isLocked || isSaving}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                      isLocked || isSaving
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    }`}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save / Update</span>
                  </button>

                  <button
                    onClick={() => handleSaveAttendance(true)}
                    disabled={isLocked || isSaving}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                      isLocked || isSaving
                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed border border-slate-400'
                        : 'qobe-btn-primary cursor-pointer'
                    }`}
                  >
                    {isLocked ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isLocked ? 'Attendance Locked' : 'Submit & Lock'}</span>
                  </button>
                </>
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
                  Select any date using the date picker above. Click status cells to toggle between <strong>Present (P)</strong> and <strong>Absent (A)</strong>, then click <strong>"Save / Update"</strong>.
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

            {!hasExistingRecord ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-extrabold text-slate-800 text-sm">No Active Attendance Sessions for {displayFormattedDate}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  There are no attendance records saved for {selectedClass} on {displayFormattedDate}. Click below to start recording.
                </p>
                <button
                  onClick={handleTakeAttendanceForDate}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Take Attendance for {selectedDate}</span>
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-left border-collapse border border-slate-300 min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="p-2 border border-slate-800 text-center w-12">Photo</th>
                      <th className="p-2.5 border border-slate-800">Roll / Reg No</th>
                      <th className="p-2.5 border border-slate-800">Student Name</th>
                      <th className="p-2 border border-slate-800 text-center w-28">
                        Status ({selectedDate})
                      </th>
                      <th className="p-2.5 border border-slate-800 text-center bg-[#5A3193] w-36">
                        Status Indicator
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {activeStudents.map((std, rIdx) => {
                      const status = studentStatuses[std.id] || 'P';
                      const isPresent = status === 'P';

                      return (
                        <tr key={std.id} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="p-1.5 border border-slate-300 text-center">
                            <img
                              src={std.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=250&q=80"}
                              alt={std.name}
                              className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-300"
                            />
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-[11px]">
                            {std.rollNo} <span className="text-slate-400 font-normal">({std.regNo || std.id})</span>
                          </td>
                          <td className="p-2 border border-slate-300 font-extrabold text-slate-900">
                            {std.name}
                          </td>

                          {/* Status Cell */}
                          <td
                            onClick={() => handleToggleStatus(std.id)}
                            className={`p-2 border border-slate-300 text-center cursor-pointer select-none transition-colors ${
                              isPresent ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            <span className="font-black text-xs px-3 py-1 rounded-md inline-block">
                              {isPresent ? 'Present (P)' : 'Absent (A)'}
                            </span>
                          </td>

                          {/* Indicator Column */}
                          <td className="p-2.5 border border-slate-300 text-center font-bold text-xs bg-purple-50">
                            {isPresent ? (
                              <span className="text-emerald-700 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="text-rose-700 flex items-center justify-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> Absent
                              </span>
                            )}
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

