import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchMe as fetchMeApi,
  fetchUsers as fetchUsersApi,
  fetchSchools as fetchSchoolsApi,
  fetchStudents as fetchStudentsApi,
  createUser as createUserApi,
  addStudent as addStudentApi,
  updateStudent as updateStudentApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  deleteStudent as deleteStudentApi,
  updateProfile as updateProfileApi,
  updatePassword as updatePasswordApi,
  fetchBroadcasts as fetchBroadcastsApi,
  createBroadcast as createBroadcastApi,
  deleteBroadcast as deleteBroadcastApi,
  saveAttendance as saveAttendanceApi,
  toggleSchoolStatus as toggleSchoolStatusApi,
  fetchAttendance as fetchAttendanceApi,
  // CORE RULE 1 — teacher class isolation helpers
  fetchClasses as fetchClassesApi,
  createClass as createClassApi,
  fetchTeacherClasses as fetchTeacherClassesApi,
  assignTeacherClasses as assignTeacherClassesApi,
  // Marks / results
  fetchMarks as fetchMarksApi,
  saveMarks as saveMarksApi,
  saveMarksBulk as saveMarksBulkApi,
  // Activities (class assessments) — real persistence
  fetchActivities as fetchActivitiesApi,
  createActivity as createActivityApi,
  updateActivity as updateActivityApi,
  deleteActivity as deleteActivityApi,
  // Fee challans
  fetchChallans as fetchChallansApi,
  createChallan as createChallanApi,
    updateChallanStatus as updateChallanStatusApi,
  updateChallan as updateChallanApi,
  deleteChallan as deleteChallanApi,
  // Admit cards
  fetchAdmitCards as fetchAdmitCardsApi,
  createAdmitCard as createAdmitCardApi,
  updateAdmitCardApi as updateAdmitCardApiRequest,
  deleteAdmitCardApi as deleteAdmitCardApiRequest,
  // Attendance admin override endpoints
  overrideAttendance as overrideAttendanceApi,
  deleteAttendanceRecord as deleteAttendanceRecordApi,
  // Attendance History (paginated, server-filtered)
  fetchAttendanceHistory as fetchAttendanceHistoryApi,
  // Unified login (role resolved server-side)
  loginUser as loginUserApi,
  // Super Admin: update school branding (name/logo/address)
  updateSchoolBranding as updateSchoolBrandingApi
} from '../services/api';

// Safe localStorage helper — strips large base64 avatar before storing
function safeStoreUser(user) {
  if (!user) return;
  const lightweight = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    school_id: user.school_id || user.schoolId || null,
    schoolId: user.school_id || user.schoolId || null,
    school_name: user.school_name || user.schoolName || null,
    schoolName: user.school_name || user.schoolName || null,
    school_logo_url: user.school_logo_url || user.schoolLogoUrl || null,
    schoolLogoUrl: user.school_logo_url || user.schoolLogoUrl || null,
    school_address: user.school_address || user.schoolAddress || null,
    schoolAddress: user.school_address || user.schoolAddress || null
  };
  try {
    // Single canonical key. Reads still fall back to 'eduzenta_user' for
    // sessions stored by older builds.
    localStorage.setItem('user', JSON.stringify(lightweight));
  } catch (e) {
    // Fallback ignored
  }
}

// Sanitize existing localStorage on startup — remove any stale base64 bloat
function sanitizeLocalStorage() {
  try {
    ['user', 'eduzenta_user'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.avatar && String(parsed.avatar).startsWith('data:')) {
        delete parsed.avatar;
      }
      if (parsed?.avatar_url && String(parsed.avatar_url).startsWith('data:')) {
        delete parsed.avatar_url;
      }
      localStorage.setItem(key, JSON.stringify(parsed));
    });
  } catch (_) { /* ignore */ }
}

const AppContext = createContext();

// ------------------------------------------------------------
// Module-level toast bus — toast state lives OUTSIDE AppContext so every
// addToast() no longer re-renders the entire component tree (only the toast
// stack inside <ToastProvider> re-renders).
// addToast() no longer re-renders the entire component tree (only the toast
// stack inside <ToastProvider> re-renders).
// ------------------------------------------------------------
const toastListeners = [];
const toastBus = {
  emit(toast) {
    toastListeners.forEach(fn => { try { fn(toast); } catch (_) { /* listener error ignored */ } });
  },
  subscribe(fn) {
    toastListeners.push(fn);
    return () => {
      const idx = toastListeners.indexOf(fn);
      if (idx !== -1) toastListeners.splice(idx, 1);
    };
  }
};

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

// Holds the toast queue + the 4.5s auto-dismiss timer. Wrap the app ONCE so
// toast updates re-render only <ToastAlert />, never the whole app.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => toastBus.subscribe(toast => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 4500);
  }), []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, removeToast }), [toasts]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// Default branding is EMPTY — branding always comes from the authenticated
// server payload (/auth/me). No fake school name/logo/address fallbacks.
const EMPTY_BRANDING = { name: '', logoUrl: '', address: '' };

// Extract branding (name/logo/address) from any user/school payload shape.
function extractBranding(payload) {
  if (!payload) return { ...EMPTY_BRANDING };
  const u = payload.user || payload;
  const s = payload.school || u.school || {};
  const pick = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };
  return {
    name: pick(s.name, u.school_name, u.schoolName),
    logoUrl: pick(s.logo_url, s.logoUrl, u.school_logo_url, u.schoolLogoUrl, s.logo, u.avatar_url && s.logo ? s.logo : ''),
    address: pick(s.address, u.school_address, u.schoolAddress)
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserStr = localStorage.getItem('user') || localStorage.getItem('eduzenta_user');
      const savedToken = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');
      if (savedUserStr && savedToken) {
        return JSON.parse(savedUserStr);
      }
    } catch (_) {}
    return null;
  });

  const [currentView, setCurrentViewState] = useState(() => {
    try {
      const savedToken = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');
      const savedUserStr = localStorage.getItem('user') || localStorage.getItem('eduzenta_user');
      const savedView = localStorage.getItem('eduzenta_current_view');

      if (savedToken && savedUserStr) {
        if (savedView && savedView !== 'landing' && savedView !== 'login') {
          return savedView;
        }
        const user = JSON.parse(savedUserStr);
        const role = String(user?.role || '').toLowerCase();
        if (role === 'superadmin' || role === 'super_admin') return 'superadmin-dash';
        if (role === 'admin') return 'admin-dash';
        if (role === 'teacher') return 'teacher-dash';
      }
    } catch (_) {}
    return 'landing';
  });

  const setCurrentView = (view) => {
    try {
      if (view && view !== 'landing' && view !== 'login') {
        localStorage.setItem('eduzenta_current_view', view);
      } else {
        localStorage.removeItem('eduzenta_current_view');
      }
    } catch (_) {}
    setCurrentViewState(view);
  };

  const [lockedModal, setLockedModal] = useState({ open: false, email: '', message: '' });

  // Core Data States — start EMPTY; populated from MySQL on mount
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  const [chalans, setChalans] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // CORE RULE 1 — Single source of truth for class dropdowns:
  //   Admin    → schoolClasses = GET /api/admin/classes (real DB catalog)
  //   Teacher  → myClasses      = /auth/me assignedClasses + GET /api/teacher/classes/my
  // NO hardcoded 'Class 10-A' style arrays anywhere. No fake fallbacks.
  const [schoolClasses, setSchoolClasses] = useState([]);

  // BRANDING — single source of truth for school name/logo/address.
  // Populated ONLY from authenticated server data (/auth/me or /auth/login).
  // No hardcoded school name/logo/address fallbacks anywhere.
  const [branding, setBranding] = useState(EMPTY_BRANDING);

  // Teacher's assigned classes — server state from /teacher/classes (kept in
  // dedicated state so it survives even if the cached user payload omits it)
  const [assignedClassesState, setAssignedClassesState] = useState([]);

  // Teacher's assigned classes — derived from live /auth/me + /teacher/classes
  const myClasses = React.useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role !== 'teacher') return [];
    const fromUser = Array.isArray(currentUser?.assignedClasses) ? currentUser.assignedClasses.filter(Boolean) : [];
    return [...new Set([...fromUser, ...assignedClassesState].filter(Boolean))];
  }, [currentUser?.role, currentUser?.assignedClasses, assignedClassesState]);

  const isSuperAdmin = React.useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    return role === 'super_admin' || role === 'superadmin';
  }, [currentUser?.role]);

  const isAdmin = React.useMemo(() => String(currentUser?.role || '').toLowerCase() === 'admin', [currentUser?.role]);

  const isTeacher = React.useMemo(() => String(currentUser?.role || '').toLowerCase() === 'teacher', [currentUser?.role]);

  // Sanitize localStorage on first render to remove old base64 blobs
  React.useEffect(() => { sanitizeLocalStorage(); }, []);
  const [activities, setActivities] = useState([]);

  // Computed live current school for active session.
  // BRANDING RULE: server-provided branding (branding state, hydrated from
  // /auth/me) always wins. No fake school name/logo/address fallbacks.
  const currentSchool = React.useMemo(() => {
    if (!currentUser) return null;
    const targetSchoolId = currentUser.school_id || currentUser.schoolId;
    const found = schools.find(s => String(s.id) === String(targetSchoolId));
    if (found) {
      return {
        ...found,
        name: found.name || branding.name,
        logoUrl: found.logoUrl || found.logo_url || branding.logoUrl,
        logo_url: found.logo_url || found.logoUrl || branding.logoUrl,
        address: found.address || branding.address
      };
    }
    const fallbackName = branding.name || currentUser.schoolName || currentUser.school_name || '';
    if (fallbackName || branding.logoUrl) {
      return {
        id: targetSchoolId,
        name: fallbackName,
        logoUrl: branding.logoUrl || currentUser.schoolLogoUrl || currentUser.school_logo_url || '',
        logo_url: branding.logoUrl || currentUser.schoolLogoUrl || currentUser.school_logo_url || '',
        address: branding.address || currentUser.school_address || currentUser.schoolAddress || '',
        status: 'Active'
      };
    }
    return null;
  }, [schools, currentUser, branding]);

  // Database Re-Hydration on Mount / Refresh (Fast, Non-Blocking Parallel Execution)
  const loadDatabaseStateNonBlocking = React.useCallback(async () => {
    const savedToken = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');
    if (!savedToken) {
      fetchBroadcastsApi('all').then(res => {
        if (res?.data && Array.isArray(res.data)) setBroadcastNotes(res.data);
      }).catch(() => {});
      return;
    }

    // Run all secondary API calls concurrently in parallel without blocking UI thread
    // Teachers are not permitted to list users (requireSchoolAdmin) — skip the doomed 403 call
    // Schools list (requireSuperAdmin) is ONLY fetched by super admins; admin/teacher branding
    // comes from /auth/me (single authoritative currentSchool source).
    let canListUsers = false;
    let isSuper = false;
    let callRole = '';
    try {
      const savedUserStr = localStorage.getItem('user') || localStorage.getItem('eduzenta_user');
      callRole = String(JSON.parse(savedUserStr || '{}')?.role || '').toLowerCase();
      canListUsers = callRole === 'admin' || callRole === 'super_admin' || callRole === 'superadmin';
      isSuper = callRole === 'super_admin' || callRole === 'superadmin';
    } catch (_) { /* role probe ignored */ }

    Promise.allSettled([
      fetchMeApi(),
      canListUsers ? fetchUsersApi() : Promise.resolve({ users: null }),
      isSuper ? fetchSchoolsApi() : Promise.resolve({ schools: null }),
      fetchStudentsApi(),
      fetchBroadcastsApi('all'),
      fetchAttendanceApi(),
      // Class catalog (admin) or teacher's own assignments (teacher)
      canListUsers ? fetchClassesApi() : Promise.resolve({ data: [] }),
      callRole === 'teacher' ? fetchTeacherClassesApi() : Promise.resolve({ assignedClasses: [] }),
      // Real persisted academic data — marks, fee challans, admit cards, activities
      fetchMarksApi(),
      fetchChallansApi(),
      fetchAdmitCardsApi(),
      fetchActivitiesApi()
    ]).then(([meResult, usersResult, schoolsResult, studentsResult, broadcastsResult, attendanceResult, classesResult, teacherClassesResult, marksResult, challansResult, admitCardsResult, activitiesResult]) => {
      // 1. Live profile — includes live branding + teacher assignedClasses
      if (meResult.status === 'fulfilled' && meResult.value?.user) {
        const u = meResult.value.user;
        const userWithAvatar = {
          ...u,
          schoolId: u.school_id || u.schoolId,
          schoolName: u.school_name || u.schoolName,
          schoolLogoUrl: u.school_logo_url || u.schoolLogoUrl,
          avatar: u.avatar_url || u.avatar || null
        };
        setCurrentUser(prev => ({ ...(prev || {}), ...userWithAvatar }));
        safeStoreUser(userWithAvatar);
        // BRANDING: fresh server data always wins over cached localStorage
        setBranding(extractBranding(meResult.value));
      }
      // 2. Users list — strip raw avatar blobs from React state to prevent memory bloat
      if (usersResult.status === 'fulfilled' && usersResult.value?.users) {
        setUsers(usersResult.value.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: String(u.role || '').toLowerCase(),
          assignedClasses: Array.isArray(u.assignedClasses) ? u.assignedClasses.filter(Boolean) : [],
          assignedSubjects: Array.isArray(u.assignedSubjects) ? u.assignedSubjects.filter(Boolean) : [],

          schoolId: u.school_id,
          school_id: u.school_id,
          schoolName: u.school_name || u.schoolName || null,
          schoolLogoUrl: u.school_logo_url || u.schoolLogoUrl || null,
          // Store avatar as URL string only — never store raw base64 blobs in React state
          avatar: (u.avatar_url && !String(u.avatar_url).startsWith('data:')) ? u.avatar_url : null,
          avatar_url: (u.avatar_url && !String(u.avatar_url).startsWith('data:')) ? u.avatar_url : null,
          isActive: Boolean(u.is_active),
          created_at: u.created_at
        })));
      }
      // 3. Schools list
      if (schoolsResult.status === 'fulfilled' && schoolsResult.value?.schools) {
        setSchools(schoolsResult.value.schools.map(s => ({
          id: s.id,
          name: s.name,
          logo_url: s.logo_url || s.logoUrl || null,
          logoUrl: s.logo_url || s.logoUrl || null,
          status: s.status || 'Active',
          adminEmail: s.admin_email || 'No Admin Assigned',
          adminName: s.admin_name || 'Unassigned',
          monthlyRevenue: 0,
          studentsCount: 0,
          teachersCount: 0,
          createdAt: s.created_at
        })));
      }
      // 4. Students list
      if (studentsResult.status === 'fulfilled' && studentsResult.value?.data) {
        setStudents(studentsResult.value.data.map(st => ({
          id: st.id,
          rollNo: st.rollNo,
          regNo: st.regNo,
          name: st.name,
          classSection: st.classSection,
          gender: st.gender,
          phone: st.phone,
          guardianName: st.guardianName,
          photo: st.photo || st.photoUrl || null,
          photoUrl: st.photo || st.photoUrl || null,
          status: st.status || 'Active',
          createdAt: st.createdAt
        })));
      }
      // 5. Broadcast notes
      if (broadcastsResult.status === 'fulfilled' && broadcastsResult.value?.data) {
        setBroadcastNotes(broadcastsResult.value.data);
      }
      // 6. Attendance — real persisted records (was previously never hydrated!)
      if (attendanceResult.status === 'fulfilled' && attendanceResult.value?.data) {
        setAttendance(attendanceResult.value.data.map(a => ({
          id: a.id,
          studentId: a.studentId,
          classSection: a.classSection,
          date: a.date,
          status: a.status,
          markedBy: a.markedBy,
          isLocked: a.isLocked === true || a.isLocked === 1 || a.is_locked === 1 || a.is_locked === true,
          createdAt: a.createdAt
        })));
      }
      // 7. Class catalog (admin) — single source of truth for class dropdowns
      if (classesResult.status === 'fulfilled' && Array.isArray(classesResult.value?.data)) {
        setSchoolClasses(classesResult.value.data.map(c => c.classSection));
      }
      // 8. Teacher's own assigned classes — refresh into currentUser + dedicated state
      if (teacherClassesResult.status === 'fulfilled' && Array.isArray(teacherClassesResult.value?.assignedClasses)) {
        setAssignedClassesState(teacherClassesResult.value.assignedClasses);
        setCurrentUser(prev => {
          const merged = {
            ...(prev || {}),
            assignedClasses: teacherClassesResult.value.assignedClasses
          };
          if (prev) safeStoreUser(merged);
          return merged;
        });
      }
      // 9. Marks — real persisted results grouped per student+term by the server
      if (marksResult.status === 'fulfilled' && marksResult.value?.success && Array.isArray(marksResult.value.data)) {
        setMarks(marksResult.value.data.map(m => ({
          studentId: m.studentId,
          classSection: m.classSection,
          term: m.term || '1st Term',
          teacherRemarks: m.teacherRemarks || '',
          markedBy: m.markedBy || '',
          subjects: (m.subjects || []).map(s => ({
            subject: s.subject || s.name || '',
            maxMarks: Number(s.maxMarks || 0),
            obtainedMarks: Number(s.obtainedMarks || 0),
            remarks: s.remarks || ''
          }))
        })));
      }
      // 10. Fee challans — real persisted rows (server computes totals)
      if (challansResult.status === 'fulfilled' && challansResult.value?.success && Array.isArray(challansResult.value.data)) {
        setChalans(challansResult.value.data);
      }
      // 11. Admit cards — real persisted rows
      if (admitCardsResult.status === 'fulfilled' && admitCardsResult.value?.success && Array.isArray(admitCardsResult.value.data)) {
        setAdmitCards(admitCardsResult.value.data);
      }
      // 12. Activities — real persisted rows (activities table). Previously
      // activities lived only in React state and vanished on every
      // refresh / logout-login; now they are hydrated from MySQL.
      if (activitiesResult.status === 'fulfilled' && activitiesResult.value?.success && Array.isArray(activitiesResult.value.data)) {
        setActivities(activitiesResult.value.data.map(a => ({
          id: a.id,
          name: a.name,
          subject: a.subject,
          maxMarks: Number(a.maxMarks || 100),
          term: a.term || '1st Term',
          classSection: a.classSection,
          createdAt: a.createdAt
        })));
      }
    });
  }, []);

  React.useEffect(() => {
    loadDatabaseStateNonBlocking();
  }, [loadDatabaseStateNonBlocking]);

  // Communication & Broadcast Notes State (Super Admin -> School Admins)
  const [broadcastNotes, setBroadcastNotes] = useState([]);

  // Create a new activity (subject/assessment) for a class/term.
  // PERSISTENCE FIX: activities previously lived ONLY in React state, so an
  // activity vanished on refresh / logout-login. It is now persisted to the
  // `activities` MySQL table via POST /api/activities and the persisted row
  // (real numeric id) is merged into state immediately — so it stays visible
  // without any refresh AND survives reloads / re-login.
  const createActivity = async (activity) => {
    try {
      const res = await createActivityApi({
        name: activity.name,
        subject: activity.subject,
        maxMarks: activity.maxMarks || 100,
        term: activity.term || '1st Term',
        classSection: activity.classSection
      });
      const persisted = res?.data;
      if (!persisted) throw new Error(res?.message || 'Activity could not be saved.');
      const newActivity = {
        id: persisted.id,
        name: persisted.name,
        subject: persisted.subject,
        maxMarks: Number(persisted.maxMarks || 100),
        term: persisted.term || '1st Term',
        classSection: persisted.classSection,
        createdAt: persisted.createdAt || new Date().toISOString()
      };
      setActivities(prev => [...prev.filter(a => String(a.id) !== String(newActivity.id)), newActivity]);
      addToast('Activity Created', `${newActivity.name} added for ${newActivity.classSection}.`, 'success');
      return newActivity;
    } catch (err) {
      console.error('[CREATE ACTIVITY ERROR]:', err);
      addToast('Activity Failed', err.message || 'Failed to save activity to database.', 'warning');
      return null;
    }
  };

  // Update marks for multiple students for a specific activity.
  // PERSISTENCE: outcome marks live in the SAME `marks` table the marks grid
  // uses, keyed by (student_id, term, subject) — they survive refresh / re-login.
  // PERF FIX: previously this looped one POST /api/marks PER STUDENT (N
  // sequential round-trips per class save). It now issues ONE POST /api/marks/bulk.
  const updateStudentMarksForActivity = async (activityId, marksArray) => {
    // marksArray: [{ studentId, obtainedMarks, remarks }]
    const activity = activities.find(a => String(a.id) === String(activityId));
    if (!activity) {
      addToast('Activity Missing', 'The activity could not be found.', 'warning');
      return { success: false };
    }
    const term = activity.term || '1st Term';
    const entries = (Array.isArray(marksArray) ? marksArray : []).map(({ studentId, obtainedMarks, remarks }) => {
      return {
        studentId,
        subjects: [{
          subject: activity.subject || 'Subject',
          maxMarks: activity.maxMarks || 100,
          obtainedMarks: Number(obtainedMarks) || 0,
          remarks: remarks || ''
        }]
      };
    }).filter(e => e.studentId && (activity.classSection || students.find(s => s.id === e.studentId)?.classSection));

    if (entries.length === 0) {
      addToast('Nothing To Save', 'No valid students were found for this activity.', 'warning');
      return { success: false };
    }

    const batchClass = activity.classSection || students.find(s => s.id === entries[0].studentId)?.classSection;
    if (!batchClass) {
      addToast('Error', 'This activity has no class assigned.', 'warning');
      return { success: false };
    }

    try {
      if (activity.classSection) {
        // ONE request + ONE multi-row upsert in MySQL (same table & unique key)
        await saveMarksBulkApi({
          classSection: activity.classSection,
          term,
          teacherRemarks: '',
          entries
        });
      } else {
        // Legacy fallback (activity without a class): preserve the original
        // per-student behaviour through the single-student endpoint.
        for (const entry of entries) {
          await saveMarksApi({
            studentId: entry.studentId,
            classSection: students.find(s => s.id === entry.studentId)?.classSection,
            term,
            subjects: entry.subjects,
            teacherRemarks: ''
          });
        }
      }

      // Reflect the persisted marks in local state (canonical `subject` key,
      // matching the server response shape, so entries are UPDATED in place
      // instead of duplicated under a `name` key).
      setMarks(prev => {
        let next = [...(Array.isArray(prev) ? prev : [])];
        entries.forEach(({ studentId, subjects }) => {
          const subjectEntry = subjects[0];
          const idx = next.findIndex(m => String(m.studentId) === String(studentId) && m.term === term);
          if (idx >= 0) {
            const group = next[idx];
            const subs = [...(group.subjects || [])];
            const subIdx = subs.findIndex(s => (s.subject || s.name) === subjectEntry.subject);
            if (subIdx >= 0) subs[subIdx] = { ...subs[subIdx], subject: subjectEntry.subject, maxMarks: subjectEntry.maxMarks, obtainedMarks: subjectEntry.obtainedMarks, remarks: subjectEntry.remarks };
            else subs.push(subjectEntry);
            next[idx] = { ...group, subjects: subs };
          } else {
            const std = students.find(s => s.id === studentId);
            next = [{
              studentId,
              studentName: std?.name || 'Student',
              classSection: activity.classSection || std?.classSection || '',
              rollNo: std?.rollNo || '',
              term,
              subjects: [subjectEntry],
              teacherRemarks: ''
            }, ...next];
          }
        });
        return next;
      });

      addToast('Activity Marks Updated', `Marks saved to database for ${entries.length} student(s).`, 'success');
      return { success: true, saved: entries.length };
    } catch (err) {
      console.error('[ACTIVITY MARKS SAVE ERROR]:', err);
      addToast('Activity Marks Save Failed', err.message || 'Failed to save activity marks.', 'warning');
      return { success: false, error: err.message };
    }
  };
  const [reminders, setReminders] = useState([]);
  const [lectureRegister, setLectureRegister] = useState([]);

  // Admit Cards State (Shared CRUD for Admin and Teacher)
  const [admitCards, setAdmitCards] = useState([]);

  // ====================
  // Attendance Management (Admin Override)
  // ====================

  const adminUpdateAttendanceRecord = async (attendanceId, studentId, newStatus) => {
    // Ensure only admins can perform this action
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update attendance records.', 'warning');
      return;
    }
    try {
      // Student references a flat DB attendance row id. If only a grouped entry
      // id is passed, resolve to the actual row id by (studentId + class + date).
      let targetId = attendanceId;
      if (studentId && !Number.isInteger(Number(attendanceId))) {
        const row = (attendance || []).find(r => String(r.studentId) === String(studentId));
        if (row) targetId = row.id;
      }
      const res = await overrideAttendanceApi(targetId || attendanceId, newStatus);
      if (res?.success) {
        setAttendance(prev => (prev || []).map(att =>
          String(att.id) === String(attendanceId) || String(att.id) === String(targetId)
            ? { ...att, status: newStatus }
            : att
        ));
        addToast('Attendance Updated', `Student attendance set to ${newStatus} in database.`, 'success');
      }
    } catch (err) {
      console.error('[ATTENDANCE OVERRIDE ERROR]:', err);
      addToast('Override Failed', err.message || 'Failed to update attendance in database.', 'warning');
    }
  };

  const adminDeleteAttendance = async (attendanceId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete attendance records.', 'warning');
      return;
    }
    try {
      const res = await deleteAttendanceRecordApi(attendanceId);
      if (res?.success) {
        setAttendance(prev => (prev || []).filter(att => String(att.id) !== String(attendanceId)));
        addToast('Attendance Deleted', 'Record removed from database.', 'warning');
      }
    } catch (err) {
      console.error('[ATTENDANCE DELETE ERROR]:', err);
      addToast('Delete Failed', err.message || 'Failed to delete attendance record.', 'warning');
    }
  };

  // ---- Attendance status normalization (single source of truth) ----
  // DB statuses: Present | Absent | Late | Excused. UI may pass short codes P/A/L/E.
  const ATT_STATUS_TO_CODE = { Present: 'P', Absent: 'A', Late: 'L', Excused: 'E' };
  const ATT_CODE_TO_STATUS = { P: 'Present', A: 'Absent', L: 'Late', E: 'Excused' };
  const normalizeAttendanceStatus = (raw) => {
    const s = String(raw || '').trim();
    if (ATT_CODE_TO_STATUS[s]) return ATT_CODE_TO_STATUS[s];
    const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return ATT_STATUS_TO_CODE[cap] ? cap : 'Present';
  };

  // Replace all rows for one class+date with a fresh set (server truth), keep the rest.
  const mergeAttendanceRows = (prev, classSection, date, freshRows) => [
    ...(freshRows || []),
    ...(Array.isArray(prev) ? prev : []).filter(r =>
      !(String(r.classSection) === String(classSection) && String(r.date).slice(0, 10) === String(date).slice(0, 10))
    )
  ];

  const adminRecordClassAttendance = async (classSection, date, recordsArray) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can record class attendance.', 'warning');
      return { success: false, error: 'Permission denied' };
    }
    const schoolId = currentUser.school_id || currentUser.schoolId || null;
    const marker = `${currentUser.name || 'Admin'} (Admin)`;
    // Optimistic FLAT rows (same shape as the DB/API) for instant UI feedback
    const tempRows = recordsArray.map((r, i) => ({
      id: `temp_${Date.now()}_${i}`,
      studentId: r.studentId,
      classSection,
      date,
      status: normalizeAttendanceStatus(r.status),
      markedBy: marker,
      _optimistic: true
    }));
    setAttendance(prev => mergeAttendanceRows(prev, classSection, date, tempRows));
    try {
      await saveAttendanceApi({
        classSection, date, school_id: schoolId,
        records: recordsArray.map(r => ({ studentId: r.studentId, status: normalizeAttendanceStatus(r.status) })),
        markedBy: marker
      });
      // Swap optimistic rows for server truth (real row ids from the database)
      const fresh = await fetchAttendanceApi(classSection, date);
      const rows = (fresh?.data || []).map(a => ({
        id: a.id, studentId: a.studentId, classSection: a.classSection,
        date: a.date, status: a.status, markedBy: a.markedBy,
        isLocked: a.isLocked === true || a.isLocked === 1 || a.is_locked === 1 || a.is_locked === true,
        createdAt: a.createdAt
      }));
      setAttendance(prev => mergeAttendanceRows(prev, classSection, date, rows));
      addToast('Attendance Saved', `${classSection} on ${date} saved to database.`, 'success');
      return { success: true };
    } catch (err) {
      console.error('[ADMIN ATTENDANCE ERROR]:', err);
      // Roll back optimistic rows so the UI never shows un-persisted data
      setAttendance(prev => (Array.isArray(prev) ? prev : []).filter(r => !r._optimistic));
      addToast('Attendance Save Failed', err.message || 'Failed to save attendance to database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Teacher attendance save: single persist path (DB), then sync store with server rows.
  const saveTeacherAttendance = async (classSection, date, recordsArray, lock = false) => {
    if (!currentUser) return { success: false, error: 'No session' };
    const schoolId = currentUser.school_id || currentUser.schoolId || null;
    const marker = `${currentUser.name || 'Teacher'} (Teacher${lock ? ' — Locked' : ''})`;
    // Optimistic FLAT rows (same shape as the DB/API) for instant UI feedback
    const tempRows = recordsArray.map((r, i) => ({
      id: `temp_${Date.now()}_${i}`,
      studentId: r.studentId,
      classSection,
      date,
      status: normalizeAttendanceStatus(r.status),
      markedBy: marker,
      isLocked: Boolean(lock),
      _optimistic: true
    }));
    setAttendance(prev => mergeAttendanceRows(prev, classSection, date, tempRows));
    try {
      await saveAttendanceApi({
        classSection, date, school_id: schoolId,
        records: recordsArray.map(r => ({ studentId: r.studentId, status: normalizeAttendanceStatus(r.status) })),
        markedBy: marker,
        lock: Boolean(lock)
      });
      // Swap optimistic rows for server truth (real row ids from the database)
      const fresh = await fetchAttendanceApi(classSection, date);
      const rows = (fresh?.data || []).map(a => ({
        id: a.id, studentId: a.studentId, classSection: a.classSection,
        date: a.date, status: a.status, markedBy: a.markedBy,
        isLocked: a.isLocked === true || a.isLocked === 1 || a.is_locked === 1 || a.is_locked === true,
        createdAt: a.createdAt
      }));
      setAttendance(prev => mergeAttendanceRows(prev, classSection, date, rows));
      addToast(lock ? 'Attendance Submitted & Locked' : 'Attendance Saved', `${classSection} on ${date} saved to database.`, 'success');
      return { success: true };
    } catch (err) {
      console.error('[SAVE ATTENDANCE ERROR]:', err);
      // Roll back optimistic rows so the UI never shows un-persisted data
      setAttendance(prev => (Array.isArray(prev) ? prev : []).filter(r => !r._optimistic));
      addToast('Attendance Save Failed', err.message || 'Failed to save attendance to database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Teacher attendance load: derived grouped view over the FLAT attendance rows.
  // Returns { classSection, date, records: [{ studentId, status: 'P'|'A'|'L'|'E' }] } or null.
  const getAttendanceForDate = (classSection, date) => {
    const rows = (Array.isArray(attendance) ? attendance : []).filter(r =>
      String(r.classSection) === String(classSection) &&
      String(r.date).slice(0, 10) === String(date).slice(0, 10)
    );
    if (rows.length === 0) return null;
    return {
      classSection,
      date,
      isLockedByTeacher: rows.some(r => r.isLocked === true || r.isLocked === 1 || r.is_locked === 1 || r.is_locked === true),
      records: rows.map(r => ({
        studentId: r.studentId,
        status: ATT_STATUS_TO_CODE[normalizeAttendanceStatus(r.status)] || 'P'
      }))
    };
  };

  // Full re-hydration of attendance from the database (used by Refresh buttons).
  const refreshAttendance = async () => {
    try {
      const fresh = await fetchAttendanceApi();
      if (fresh?.data && Array.isArray(fresh.data)) {
        setAttendance(fresh.data.map(a => ({
          id: a.id, studentId: a.studentId, classSection: a.classSection,
          date: a.date, status: a.status, markedBy: a.markedBy,
          isLocked: a.isLocked === true || a.isLocked === 1 || a.is_locked === 1 || a.is_locked === true,
          createdAt: a.createdAt
        })));
      }
      return fresh;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ====================
  // ATTENDANCE HISTORY — server-paginated, scope-enforced (Rule 5)
  // Teacher: only assigned classes (backend enforces 403 on unassigned).
  // Admin: any class of their school. No full-table downloads.
  // ====================
  const [attendanceHistory, setAttendanceHistory] = useState({ rows: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [attendanceHistoryError, setAttendanceHistoryError] = useState(null);

  const loadAttendanceHistory = React.useCallback(async (filters = {}) => {
    setAttendanceHistoryLoading(true);
    setAttendanceHistoryError(null);
    try {
      const res = await fetchAttendanceHistoryApi(filters);
      if (res?.success && res?.data) {
        setAttendanceHistory({
          rows: Array.isArray(res.data.rows) ? res.data.rows : [],
          total: res.data.total || 0,
          page: res.data.page || 1,
          pageSize: res.data.pageSize || 25,
          totalPages: res.data.totalPages || 0
        });
      } else {
        setAttendanceHistory({ rows: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
      }
      return res;
    } catch (err) {
      setAttendanceHistory({ rows: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
      setAttendanceHistoryError(err.message || 'Failed to load attendance history.');
      return { success: false, error: err.message };
    } finally {
      setAttendanceHistoryLoading(false);
    }
  }, [isTeacher]);

  // After a teacher saves attendance for a class, evict cached rows for that
  // class+date so Attendance History refetches fresh data (Rule 26).
  const clearAttendanceHistoryForClass = React.useCallback((classSection, date) => {
    setAttendanceHistory(prev => ({
      ...prev,
      rows: (prev.rows || []).filter(r =>
        !(String(r.classSection) === String(classSection) && (!date || String(r.date) === String(date)))
      )
    }));
  }, []);

  // (legacy attendanceOverrides duplicate store removed — the flat `attendance`
  // store hydrated from the DB is the single source of truth.)

  // ====================
  // Chalans management permission guards
  // ====================

  // ROOT-CAUSE FIX: resolve a challan's REAL numeric DB id. The previous
  // `parseInt(String(chalanId).replace(/\D/g, ''))` concatenated every digit
  // inside the chalan_no string — e.g. "FC-1788293844331-0853" became
  // 17882938443310852 — so PATCH/DELETE hit a non-existent id and every
  // status update failed with "Fee challan not found in your school."
  // Challan rows in state always carry the real `id` returned by the DB
  // (from both GET /challans and the POST create response).
  const resolveChallanDbId = (chalanId) => {
    const rec = (Array.isArray(chalans) ? chalans : []).find(c =>
      String(c.chalanId) === String(chalanId) || String(c.id) === String(chalanId)
    );
    const n = parseInt(rec?.id ?? chalanId, 10);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  };

    const createFeeChalan = async (data) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can create fee chalans.', 'warning');
      return { success: false, error: 'Permission denied' };
    }
    try {
      const res = await createChallanApi({
        studentId: data.studentId, studentName: data.studentName, rollNo: data.rollNo, regNo: data.regNo,
        classSection: data.classSection, term: data.term, monthYear: data.monthYear,
        tuitionFee: parseFloat(data.tuitionFee || 0), developmentFee: parseFloat(data.developmentFee || 0),
        examFee: parseFloat(data.examFee || 0), libraryFee: parseFloat(data.libraryFee || 0),
        computerFee: parseFloat(data.computerFee || 0), activityFee: parseFloat(data.activityFee || 0),
        prevBalance: parseFloat(data.prevBalance || 0), lateFee: parseFloat(data.lateFee || 0),
        discounts: parseFloat(data.discounts || 0), dueDate: data.dueDate, status: data.status || 'Unpaid'
      });
      const persisted = res?.challan || res?.data || res;
      setChalans(prev => [persisted, ...prev]);
      addToast('Chalan Created', 'Fee chalan saved to database for ' + (data.studentName || 'student') + '.', 'success');
      return { success: true, data: persisted };
    } catch (err) {
      console.error('[CREATE FEE CHALAN ERROR]:', err);
      addToast('Chalan Creation Failed', err.message || 'Failed to save fee chalan.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deleteFeeChalan = async (chalanId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete fee chalans.', 'warning');
      return;
    }
    const numericId = resolveChallanDbId(chalanId);
    if (!Number.isFinite(numericId)) {
      addToast('Delete Failed', 'Could not resolve this chalan record in the database.', 'warning');
      return;
    }
    try {
      await deleteChallanApi(numericId);
      setChalans(prev => prev.filter(c => c.chalanId !== chalanId && c.id !== numericId));
      addToast('Chalan Deleted', `Chalan ${chalanId} deleted from database.`, 'warning');
    } catch (err) {
      console.error('[DELETE CHALAN ERROR]:', err);
      addToast('Delete Failed', err.message || 'Failed to delete fee chalan.', 'warning');
    }
  };

  const updateFeeStatus = async (chalanId, newStatus) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update fee status.', 'warning');
      return;
    }
    // Use the REAL DB row id (the chalanId display string is not the primary key)
    const numericId = resolveChallanDbId(chalanId);
    if (!Number.isFinite(numericId)) {
      addToast('Status Update Failed', 'Could not resolve this chalan record in the database.', 'warning');
      return;
    }
    try {
      const res = await updateChallanStatusApi(numericId, newStatus);
      // Merge the DB-confirmed status (and server-computed total if returned)
      setChalans(prev =>
        prev.map(c => {
          if (c.chalanId !== chalanId && c.id !== numericId) return c;
          const merged = { ...c, status: newStatus };
          if (typeof res?.totalAmount === 'number') merged.totalAmount = res.totalAmount;
          return merged;
        })
      );
      addToast('Status Updated', `Chalan ${chalanId} set to "${newStatus}" in database.`, 'info');
    } catch (err) {
      console.error('[UPDATE CHALAN STATUS ERROR]:', err);
      addToast('Status Update Failed', err.message || 'Failed to update fee status.', 'warning');
    }
  };

  const updateFeeChalan = async (chalanId, updatedData) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update fee chalans.', 'warning');
      return;
    }
    const numericId = resolveChallanDbId(chalanId);
    if (!Number.isFinite(numericId)) {
      addToast('Fee Slip Update Failed', 'Could not resolve this chalan record in the database.', 'warning');
      return;
    }
    try {
      // Server recalculates the total amount — the frontend never invents totals
      const res = await updateChallanApi(numericId, updatedData);
      // FIX: server returns { success, message, totalAmount }; merge totalAmount into state
      setChalans(prev =>
        prev.map(c => {
          if (c.chalanId !== chalanId && c.id !== numericId) return c;
          const merged = { ...c, ...updatedData };
          if (typeof res?.totalAmount === 'number') merged.totalAmount = res.totalAmount;
          return merged;
        })
      );
      addToast('Fee Slip Updated', `Chalan ${chalanId} updated successfully.`, 'success');
    } catch (err) {
      console.error('[UPDATE CHALAN ERROR]:', err);
      addToast('Fee Slip Update Failed', err.message || 'Failed to update fee chalan.', 'warning');
    }
  };

  // Update activity metadata — persisted via PUT /api/activities/:id
  const updateActivity = async (activityId, updatedFields) => {
    try {
      await updateActivityApi(activityId, {
        ...(updatedFields.name !== undefined ? { name: updatedFields.name } : {}),
        ...(updatedFields.subject !== undefined ? { subject: updatedFields.subject } : {}),
        ...(updatedFields.maxMarks !== undefined ? { maxMarks: updatedFields.maxMarks } : {}),
        ...(updatedFields.term !== undefined ? { term: updatedFields.term } : {}),
        ...(updatedFields.classSection !== undefined ? { classSection: updatedFields.classSection } : {})
      });
      setActivities(prev => prev.map(a => String(a.id) === String(activityId) ? { ...a, ...updatedFields } : a));
      addToast('Activity Updated', 'Activity metadata updated successfully.', 'success');
      return { success: true };
    } catch (err) {
      console.error('[UPDATE ACTIVITY ERROR]:', err);
      addToast('Activity Update Failed', err.message || 'Failed to update activity in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Delete activity — persisted via DELETE /api/activities/:id
  const deleteActivity = async (activityId) => {
    try {
      await deleteActivityApi(activityId);
      setActivities(prev => prev.filter(a => String(a.id) !== String(activityId)));
      addToast('Activity Deleted', 'Activity removed from database.', 'warning');
      return { success: true };
    } catch (err) {
      console.error('[DELETE ACTIVITY ERROR]:', err);
      addToast('Activity Delete Failed', err.message || 'Failed to delete activity from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const createBroadcastNote = async (noteData) => {
    try {
      const res = await createBroadcastApi({
        title: noteData.title,
        description: noteData.description || noteData.message,
        imageUrl: noteData.imageUrl || null,
        videoUrl: noteData.videoUrl || null,
        targetSchoolId: noteData.targetSchoolId || 'all',
        sender: noteData.sender || `${currentUser?.name || 'Super Admin'} (Super Admin HQ)`
      });
      if (res?.data) {
        setBroadcastNotes(prev => [res.data, ...prev]);
        addToast('Broadcast Note Sent', `Directive "${noteData.title}" published to database.`, 'success');
        return { success: true, data: res.data };
      }
    } catch (err) {
      console.error('[CREATE BROADCAST NOTE ERROR]:', err);
      addToast('Broadcast Failed', err.message || 'Failed to save broadcast note in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deleteBroadcastNote = async (noteId) => {
    const numericId = parseInt(String(noteId).replace(/\D/g, ''));
    try {
      if (!isNaN(numericId) && numericId > 0) {
        await deleteBroadcastApi(numericId);
      } else {
        await deleteBroadcastApi(noteId);
      }
      setBroadcastNotes(prev => prev.filter(n => String(n.id) !== String(noteId) && String(n.id) !== String(numericId)));
      addToast('Directive Deleted', 'Broadcast note deleted from database.', 'warning');
      return { success: true };
    } catch (err) {
      console.error('[DELETE BROADCAST NOTE ERROR]:', err);
      addToast('Deletion Failed', err.message || 'Failed to delete broadcast note from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const markNoteAsRead = (noteId) => {
    if (!currentUser) return;
    setBroadcastNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const readSet = new Set(n.isReadBy || []);
        readSet.add(currentUser.email || currentUser.id);
        return { ...n, isReadBy: Array.from(readSet) };
      }
      return n;
    }));
  };

  // Toast notifications are dispatched through the module-level bus above and
  // rendered by <ToastProvider>. addToast is a stable callback — calling it
  // never re-renders consumers of this context.
  const addToast = useCallback((title, message, type = 'info') => {
    toastBus.emit({ id: Date.now() + Math.random(), title, message, type });
  }, []);

  // Session login helper after successful backend API verification
  const loginWithSession = (user, token) => {
    if (!user || !token) {
      return { success: false, error: 'Invalid authentication session response.' };
    }

    localStorage.setItem('token', token);
    safeStoreUser(user);

    setCurrentUser(user);
    // BRANDING: apply server-provided branding immediately on login
    setBranding(extractBranding(user));
    addToast('Authentication Success', `Welcome back, ${user.name || user.email}`, 'success');

    const roleStr = String(user.role || '').toLowerCase();
    if (roleStr === 'superadmin' || roleStr === 'super_admin') {
      setCurrentView('superadmin-dash');
    } else if (roleStr === 'admin') {
      setCurrentView('admin-dash');
    } else if (roleStr === 'teacher') {
      setCurrentView('teacher-dash');
    } else {
      setCurrentView('admin-dash');
    }

    // Hydrate live data (profile, users, schools, students, broadcasts) immediately after login.
    // The mount effect runs before a token exists, so without this call dashboards stay empty
    // until a manual refresh.
    loadDatabaseStateNonBlocking();

    // Teachers: pull their assigned classes immediately (no F5 needed)
    if (String(user.role || '').toLowerCase() === 'teacher') {
      fetchTeacherClassesApi()
        .then(res => {
          if (Array.isArray(res?.assignedClasses)) {
            setAssignedClassesState(res.assignedClasses);
            setCurrentUser(prev => {
              const merged = { ...(prev || {}), assignedClasses: res.assignedClasses };
              safeStoreUser(merged);
              return merged;
            });
          }
        })
        .catch(() => {});
    }

    return { success: true };
  };

  // Unified Real API Login Handler
  const loginUser = async (email, password) => {
    if (!email || !email.trim()) {
      return { success: false, error: 'User Name cannot be blank.' };
    }
    if (!password) {
      return { success: false, error: 'Password cannot be blank.' };
    }

    try {
      const apiRes = await loginUserApi(email, password);
      if (apiRes?.token && apiRes?.user) {
        return loginWithSession(apiRes.user, apiRes.token);
      }
      return { success: false, error: apiRes?.message || 'Login failed.' };
    } catch (err) {
      if (err.code === 'ACCOUNT_LOCKED' || (err.message && err.message.includes('Account locked'))) {
        setLockedModal({
          open: true,
          email,
          message: err.message || 'Your school account is currently locked because of pending payment. Please contact your School Administrator or Super Admin.'
        });
        return { success: false, locked: true, error: err.message || 'Account Locked — Pending Payment' };
      }
      return { success: false, error: err.message || 'Invalid email or password.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('eduzenta_token');
    localStorage.removeItem('eduzenta_user');
    setCurrentUser(null);
    setBranding({ ...EMPTY_BRANDING });
    setAssignedClassesState([]);
    setSchoolClasses([]);
    setCurrentView('landing');
    addToast('Logged Out', 'You have been safely signed out of Eduzenta.', 'info');
  };

  // Super Admin actions: Toggle School Lockout
  const toggleSchoolLockout = async (schoolId) => {
    const targetSchool = schools.find(s => String(s.id) === String(schoolId));
    const currentStatus = targetSchool?.status || 'Active';
    const isCurrentlyLocked = String(currentStatus).toLowerCase().includes('lock');
    const newStatus = isCurrentlyLocked ? 'Active' : 'Locked';

    try {
      await toggleSchoolStatusApi(schoolId, newStatus);
      setSchools(prev => prev.map(s => String(s.id) === String(schoolId) ? { ...s, status: newStatus } : s));
      setUsers(uPrev => uPrev.map(u => {
        if (String(u.schoolId) === String(schoolId) || String(u.school_id) === String(schoolId)) {
          return { ...u, locked: !isCurrentlyLocked };
        }
        return u;
      }));
      addToast(
        'Lock status updated',
        `School status set to "${newStatus}" in MySQL database.`,
        isCurrentlyLocked ? 'success' : 'warning'
      );
    } catch (err) {
      console.error('[TOGGLE SCHOOL LOCK ERROR]:', err);
      addToast('Status Update Failed', err.message || 'Failed to update school status in database.', 'warning');
    }
  };

  // Super Admin Reset Password for School Admin
  const resetAdminPassword = async (userId, newPassword) => {
    const numericId = parseInt(String(userId).replace(/\D/g, ''));
    if (isNaN(numericId) || numericId <= 0) {
      addToast('Validation Error', 'Invalid numeric database user ID.', 'warning');
      return { success: false, error: 'Invalid numeric database user ID.' };
    }
    if (!newPassword || newPassword.length < 6) {
      addToast('Validation Error', 'Password must be at least 6 characters.', 'warning');
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    try {
      const res = await updateUserApi(numericId, { password: newPassword });
      if (res?.user || res?.success) {
        addToast('Password Reset', `Password updated successfully in database.`, 'success');
        return { success: true };
      }
      throw new Error(res?.message || 'Failed to reset password.');
    } catch (err) {
      console.error('[RESET ADMIN PASSWORD ERROR]:', err);
      addToast('Password Reset Failed', err.message || 'Failed to reset password in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Onboard School Admin — uses real DB IDs returned from API (called after createSchoolAdminApi succeeds)
  const addSchoolAdmin = (data) => {
    // data.id and data.schoolId come from API response (real numeric DB IDs)
    const logoUrl = data.schoolLogoUrl || null;

    const newSchool = {
      id: data.schoolId,  // Real DB school id
      name: data.schoolName,
      logoUrl: logoUrl,
      adminEmail: data.email,
      adminName: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    const newUser = {
      id: data.id,  // Real DB user id (numeric)
      name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      email: data.email,
      role: 'admin',
      schoolId: data.schoolId,
      schoolName: data.schoolName,
      schoolLogoUrl: logoUrl,
      isActive: true,
      locked: false
    };

    setSchools(prev => [...prev, newSchool]);
    setUsers(prev => [...prev, newUser]);
  };

  const updateSchoolAdmin = async (userId, updatedFields) => {
    const numericId = parseInt(String(userId).replace(/\D/g, ''));
    const cleanName = updatedFields.name || `${updatedFields.firstName || ''} ${updatedFields.lastName || ''}`.trim();

    try {
      if (!isNaN(numericId) && numericId > 0) {
        const payload = {
          name: cleanName,
          school_name: updatedFields.schoolName
        };
        // BRANDING FIX — the Super Admin's uploaded school logo must be sent to
        // the API (PUT /admin/users/:id persists it into the schools table as
        // logo_url, the single authoritative branding source). It was previously
        // dropped here, so logo changes never survived refresh / re-login.
        const logoToSave =
          (updatedFields.schoolLogoUrl && String(updatedFields.schoolLogoUrl).trim()) ||
          (updatedFields.school_logo_url && String(updatedFields.school_logo_url).trim()) ||
          (updatedFields.logoUrl && String(updatedFields.logoUrl).trim()) ||
          (updatedFields.logo_url && String(updatedFields.logo_url).trim()) ||
          '';
        if (logoToSave) payload.school_logo_url = logoToSave;
        if (updatedFields.email) payload.email = updatedFields.email;
        if (updatedFields.password) payload.password = updatedFields.password;

        const res = await updateUserApi(numericId, payload);
        if (res?.user) {
          setUsers(prev => prev.map(u => (u.id === userId || u.id === numericId) ? {
            ...u,
            ...updatedFields,
            name: res.user.name,
            email: res.user.email,
            schoolName: res.user.school_name || u.schoolName || u.school_name || null,
            school_name: res.user.school_name || u.school_name || u.schoolName || null,
            schoolLogoUrl: res.user.school_logo_url || u.schoolLogoUrl || u.school_logo_url || null,
            school_logo_url: res.user.school_logo_url || u.school_logo_url || u.schoolLogoUrl || null
          } : u));
          // BRANDING FIX — reflect the persisted school name AND logo in the
          // schools list + branding state immediately so the Super Admin table,
          // edit modal and current session stay in sync right after Save.
          if (res.user.school_name || res.user.school_logo_url) {
            const persistedLogo = res.user.school_logo_url || null;
            const persistedName = res.user.school_name || null;
            const targetSchoolId = res.user.school_id ?? numericId;
            setSchools(prev => prev.map(s => (String(s.id) === String(targetSchoolId)) ? {
              ...s,
              name: persistedName || s.name,
              logo_url: persistedLogo || s.logo_url || null,
              logoUrl: persistedLogo || s.logoUrl || null
            } : s));
            if (persistedName || persistedLogo) {
              setBranding(prev => ({
                ...prev,
                name: persistedName || prev.name,
                logoUrl: persistedLogo || prev.logoUrl
              }));
            }
          }
        }
      } else {
        setUsers(prev => prev.map(u => (u.id === userId) ? { ...u, ...updatedFields } : u));
      }
      addToast('Account Updated', 'School Admin profile updated in database.', 'success');
      return { success: true };
    } catch (err) {
      console.error('[UPDATE SCHOOL ADMIN ERROR]:', err);
      addToast('Update Failed', err.message || 'Failed to update admin in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deleteSchoolAdmin = async (userId) => {
    const numericId = parseInt(String(userId).replace(/\D/g, ''));
    try {
      if (!isNaN(numericId) && numericId > 0) {
        // The server transactionally deletes the ENTIRE school owned by this
        // admin (teachers, students, attendance, marks/results, exams,
        // admit cards, fee challans, assignments, broadcasts) — never any
        // other school's data.
        const res = await deleteUserApi(numericId);
        const schoolName = res?.deletedCounts ? ' and all its school data were' : ' were';
        const userToDelete = users.find(u => u.id === userId || u.id === numericId);
        setUsers(prev => prev.filter(u => u.id !== userId && u.id !== numericId));
        if (userToDelete?.schoolId) {
          setSchools(prev => prev.filter(s => s.id !== userToDelete.schoolId));
        }
        addToast('Account Removed', `School Admin deleted from database. The school${schoolName} permanently removed.`, 'warning');
      } else {
        setUsers(prev => prev.filter(u => u.id !== userId));
        addToast('Account Removed', 'School Admin deleted from database.', 'warning');
      }
      return { success: true };
    } catch (err) {
      console.error('[DELETE SCHOOL ADMIN ERROR]:', err);
      addToast('Deletion Failed', err.message || 'Failed to delete admin from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

    // Teacher CRUD — Teachers are stored in MySQL users table with role=teacher
  // CLASS ASSIGNMENT persists via PUT /api/admin/teachers/:id/classes
  // (teacher_class_assignments is the single source of truth — never hardcoded)
  const addTeacher = async (teacherData) => {
    const schoolId = currentUser?.school_id || currentUser?.schoolId || null;
    try {
      const res = await createUserApi({
        name: teacherData.name,
        email: teacherData.email,
        password: teacherData.password || 'teacher123',
        role: 'teacher',
        school_id: schoolId
      });
      if (res?.user) {
        const realId = res.user.id;
        // Persist class assignments to the DB immediately after user creation
        const classesToAssign = Array.isArray(teacherData.assignedClasses) ? teacherData.assignedClasses : [];
        if (classesToAssign.length > 0) {
          try {
            await assignTeacherClassesApi(realId, classesToAssign);
          } catch (classErr) {
            console.error('[ASSIGN CLASSES ERROR]:', classErr.message);
            addToast('Warning', 'Teacher created but class assignment failed.', 'warning');
          }
        }
        // Persist assigned subjects to users.assigned_subjects (existing UPDATE endpoint)
        const subjectsToAssign = Array.isArray(teacherData.assignedSubjects) ? teacherData.assignedSubjects : [];
        if (subjectsToAssign.length > 0) {
          try {
            await updateUserApi(realId, { assigned_subjects: subjectsToAssign });
          } catch (subjErr) {
            console.error('[ASSIGN SUBJECTS ERROR]:', subjErr.message);
            addToast('Warning', 'Teacher created but subject assignment failed.', 'warning');
          }
        }
        const newTeacher = {
          id: realId,
          name: res.user.name,
          email: res.user.email,
          role: 'teacher',
          schoolId: res.user.school_id,
          assignedClasses: classesToAssign,
          assignedSubjects: Array.isArray(teacherData.assignedSubjects) ? teacherData.assignedSubjects : [],
          isActive: true,
          locked: false
        };
        setUsers(prev => [...prev, newTeacher]);
        addToast('Faculty Added', `Teacher account created for ${teacherData.email}`, 'success');
        return { success: true, user: newTeacher };
      }
      throw new Error(res?.message || 'Failed to create teacher.');
    } catch (err) {
      console.error('[ADD TEACHER ERROR]:', err);
      addToast('Teacher Creation Failed', err.message || 'Failed to add teacher to database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const updateTeacher = async (teacherId, updatedData) => {
    const numericId = parseInt(String(teacherId).replace(/\D/g, ''));
    try {
      if (!isNaN(numericId) && numericId > 0) {
        // FIX: Include assignedSubjects in the user update payload so subject
        // allocations persist to users.assigned_subjects column (issue #4)
        const updateUserPayload = {
          name: updatedData.name,
          ...(updatedData.email ? { email: updatedData.email } : {}),
          ...(updatedData.password ? { password: updatedData.password } : {})
        };
        if (updatedData.assignedSubjects !== undefined) {
          updateUserPayload.assigned_subjects = Array.isArray(updatedData.assignedSubjects)
            ? updatedData.assignedSubjects.join(',')
            : updatedData.assignedSubjects;
        }

        const res = await updateUserApi(numericId, updateUserPayload);
        // Persist class assignments via dedicated endpoint
        if (updatedData.assignedClasses !== undefined && Array.isArray(updatedData.assignedClasses)) {
          try {
            await assignTeacherClassesApi(numericId, updatedData.assignedClasses);
          } catch (classErr) {
            console.error('[ASSIGN CLASSES ERROR]:', classErr.message);
            addToast('Warning', 'Teacher updated but class assignment could not be saved.', 'warning');
          }
        }
        // Update state with confirmed DB values
        if (res?.user) {
          setUsers(prev => prev.map(u => (u.id === teacherId || u.id === numericId) ? {
            ...u,
            name: res.user.name,
            email: res.user.email,
            assignedClasses: updatedData.assignedClasses !== undefined ? updatedData.assignedClasses : u.assignedClasses,
            assignedSubjects: updatedData.assignedSubjects !== undefined ? updatedData.assignedSubjects : u.assignedSubjects
          } : u));
        }
      }
      addToast('Teacher Updated', 'Faculty details saved to database.', 'success');
      return { success: true };
    } catch (err) {
      // Revert optimistic update on failure
      setUsers(prev => prev.map(u => u.id === teacherId ? { ...u, ...updatedData } : u));
      console.error('[UPDATE TEACHER ERROR]:', err);
      addToast('Update Failed', err.message || 'Failed to update teacher in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deleteTeacher = async (teacherId) => {
    const numericId = parseInt(String(teacherId).replace(/\D/g, ''));
    try {
      if (!isNaN(numericId) && numericId > 0) {
        await deleteUserApi(numericId);
      } else {
        await deleteUserApi(teacherId);
      }
      setUsers(prev => prev.filter(u => u.id !== teacherId && u.id !== numericId));
      addToast('Teacher Removed', 'Faculty account deleted from database.', 'warning');
      return { success: true };
    } catch (err) {
      console.error('[DELETE TEACHER ERROR]:', err);
      addToast('Deletion Failed', err.message || 'Failed to delete teacher from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Student CRUD
  // Student CRUD — Students are stored in MySQL students table
  const addStudent = async (studentData) => {
    // Roll number and class are mandatory — the DB requires them and the
    // roll number must be the real value chosen by the admin/teacher.
    if (!studentData?.rollNo || !studentData?.classSection) {
      addToast('Missing Information', 'Roll Number and Class are required to enroll a student.', 'warning');
      return { success: false, error: 'Roll Number and Class are required.' };
    }
    try {
      const res = await addStudentApi({
        rollNo: String(studentData.rollNo).trim(),
        regNo: studentData.regNo ? String(studentData.regNo).trim() : null,
        name: studentData.name,
        classSection: studentData.classSection,
        gender: studentData.gender || 'Male',
        phone: studentData.phone || null,
        guardianName: studentData.guardianName || null
      });
      if (res?.data) {
        setStudents(prev => [res.data, ...prev]);
        addToast('Student Enrolled', `${studentData.name} added to database.`, 'success');
        return { success: true, student: res.data };
      }
      throw new Error(res?.error || 'Failed to enroll student.');
    } catch (err) {
      console.error('[ADD STUDENT ERROR]:', err);
      addToast('Enrollment Failed', err.message || 'Failed to add student to database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const updateStudent = async (id, data) => {
    // Optimistic update for instant UI feedback
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    try {
      const res = await updateStudentApi(id, data);
      if (res?.data) {
        // Sync with confirmed DB values
        setStudents(prev => prev.map(s => s.id === id ? { ...s, ...res.data } : s));
      }
      addToast('Student Updated', 'Record saved to database.', 'success');
      return { success: true };
    } catch (err) {
      console.error('[UPDATE STUDENT ERROR]:', err);
      addToast('Update Failed', err.message || 'Failed to update student in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deactivateStudent = async (id) => {
    const currentStudent = students.find(s => s.id === id);
    const newStatus = currentStudent?.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    try {
      await updateStudentApi(id, { status: newStatus });
      addToast('Status Updated', `Student set to ${newStatus} in database.`, 'info');
      return { success: true };
    } catch (err) {
      // Revert on failure
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status: currentStudent?.status || 'Active' } : s));
      console.error('[DEACTIVATE STUDENT ERROR]:', err);
      addToast('Update Failed', err.message || 'Failed to update student status.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const deleteStudent = async (studentId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete student profiles.', 'warning');
      return { success: false, error: 'Permission denied' };
    }
    try {
      await deleteStudentApi(studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      addToast('Student Removed', 'Student profile deleted from database.', 'warning');
      return { success: true };
    } catch (err) {
      console.error('[DELETE STUDENT ERROR]:', err);
      addToast('Deletion Failed', err.message || 'Failed to delete student from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Auto-generate monthly challans — persisted through the API (server
  // calculates totals). No fake amounts: fees default to 0 unless supplied.
  const autoGenerateMonthlyChalans = async (monthYear, dueDate, term = '1st Term', customFeeData = {}) => {
    // `students` state is already school-scoped by the server (GET /students),
    // and the mapping does not carry schoolId — so filter by the school's own
    // student list as-is. The previous schoolId comparison always failed
    // (students rows carry no schoolId field) and aborted with "No Students".
    const currentSchoolStudents = Array.isArray(students) ? students : [];
    if (currentSchoolStudents.length === 0) {
      addToast('No Students', 'No students found to generate challans for.', 'warning');
      return { success: false, created: 0 };
    }
    const now = new Date();
    const sessYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const session = `${sessYear}-${sessYear + 1}`;
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    // PERF FIX: create all challans concurrently and use each POST response —
    // the saved DB record — to update state. No sequential round-trips and no
    // full challans re-fetch after the writes.
    const results = await Promise.allSettled(currentSchoolStudents.map(std =>
      createChallanApi({
        studentId: std.id,
        classSection: std.classSection,
        term,
        monthYear,
        session,
        tuitionFee: num(customFeeData.tuitionFee),
        developmentFee: num(customFeeData.developmentFee),
        examFee: num(customFeeData.examFee),
        libraryFee: num(customFeeData.libraryFee),
        computerFee: num(customFeeData.computerFee),
        activityFee: num(customFeeData.activityFee),
        prevBalance: num(customFeeData.prevBalance),
        lateFee: num(customFeeData.lateFee),
        discounts: num(customFeeData.discounts),
        dueDate,
        status: 'Unpaid'
      })
    ));
    const persistedRows = [];
    let created = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value?.success && r.value?.data) {
        created++;
        persistedRows.push(r.value.data);
      } else if (r.status === 'rejected') {
        console.error('[AUTO GENERATE CHALLAN ERROR]:', r.reason?.message);
      }
    });
    if (persistedRows.length > 0) {
      setChalans(prev => [...persistedRows, ...(Array.isArray(prev) ? prev : [])]);
    }
    addToast('Bulk Generation', `Generated ${created} challans for ${monthYear}.`, created > 0 ? 'success' : 'warning');
    return { success: created > 0, created };
  };

  // Single Student All-Subject Marks Grid Engine (3 Terms Support)
  // CORE RULE 1: uses the student's REAL persisted classSection (never hardcoded fallback)
  // Persists to DB via POST /api/marks. Server enforces teacher-class isolation.
  const saveSingleStudentAllSubjectMarks = async (studentId, updatedSubjects, teacherRemarks, term = '1st Term') => {
    const std = students.find(s => s.id === studentId);
    const classSection = std?.classSection;
    if (!classSection) {
      addToast('Error', 'Cannot save marks: student has no assigned class.', 'warning');
      return { success: false, error: 'No class assignment.' };
    }
    try {
      const res = await saveMarksApi({ studentId, classSection, term, subjects: updatedSubjects, teacherRemarks: teacherRemarks || '' });
      const persisted = res?.mark || res?.data || res;
      setMarks(prev => {
        const idx = prev.findIndex(m => String(m.studentId) === String(studentId) && m.term === term);
        const base = { studentId, studentName: std?.name || '', classSection, rollNo: std?.rollNo || '', term, subjects: updatedSubjects, teacherRemarks: teacherRemarks || '', markedBy: persisted?.markedBy || currentUser?.name || '' };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = base; return copy; }
        return [base, ...prev];
      });
      addToast('Marks Saved', 'Results saved to database for ' + (std?.name || 'student') + '.', 'success');
      return { success: true, data: persisted };
    } catch (err) {
      console.error('[SAVE MARKS ERROR]:', err);
      addToast('Save Failed', err.message || 'Failed to persist marks.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Lecture Attendance Register Engine
  const toggleLectureStatus = (studentId, lectureIndex) => {
    setLectureRegister(prev => prev.map(item => {
      if (item.studentId === studentId) {
        const copyLectures = [...item.lectures];
        const current = copyLectures[lectureIndex]?.status || 'A';
        copyLectures[lectureIndex] = { ...copyLectures[lectureIndex], status: current === 'P' ? 'A' : 'P' };
        return { ...item, lectures: copyLectures };
      }
      return item;
    }));
  };

  // Admit Cards Shared CRUD (Admin and Teacher)
    const addAdmitCard = async (data) => {
    try {
      const res = await createAdmitCardApi({
        studentId: data.studentId, studentName: data.studentName, rollNo: data.rollNo, regNo: data.regNo,
        classSection: data.classSection, examCenter: data.examCenter, term: data.term
      });
      const persisted = res?.admitCard || res?.data || res;
      setAdmitCards(prev => [persisted, ...prev]);
      addToast('Admit Card Generated', 'Hall ticket saved to database for ' + (data.studentName || 'student') + '.', 'success');
      return { success: true, data: persisted };
    } catch (err) {
      console.error('[ADD ADMIT CARD ERROR]:', err);
      addToast('Admit Card Failed', err.message || 'Failed to save admit card.', 'warning');
      return { success: false, error: err.message };
    }
  };

  const updateAdmitCard = async (id, data) => {
    try {
      await updateAdmitCardApiRequest(id, data);
      setAdmitCards(prev => prev.map(a => String(a.id) === String(id) ? { ...a, ...data } : a));
      addToast('Admit Card Updated', 'Hall ticket details saved to database.', 'success');
    } catch (err) {
      console.error('[UPDATE ADMIT CARD ERROR]:', err);
      addToast('Admit Card Update Failed', err.message || 'Failed to update admit card.', 'warning');
    }
  };

  const deleteAdmitCard = async (id) => {
    try {
      await deleteAdmitCardApiRequest(id);
      setAdmitCards(prev => prev.filter(a => String(a.id) !== String(id)));
      addToast('Admit Card Deleted', 'Hall ticket removed from database.', 'warning');
    } catch (err) {
      console.error('[DELETE ADMIT CARD ERROR]:', err);
      addToast('Admit Card Delete Failed', err.message || 'Failed to delete admit card.', 'warning');
    }
  };

  const broadcastReminder = (title, content, priority = 'Normal') => {
    const newRem = {
      id: `rem_${Date.now()}`,
      title,
      content,
      sender: `${currentUser?.name || 'School Admin'} (${currentUser?.role === 'admin' ? 'School Admin' : 'Admin'})`,
      date: new Date().toISOString().split('T')[0],
      priority
    };
    setReminders(prev => [newRem, ...prev]);
    addToast('Broadcast Sent', 'Published to all assigned faculty dashboards.', 'success');
  };

  // Universal Profile Update (Persisted to DB)
  const updateProfileInfo = async (updatedProfileData, optionalAvatar) => {
    if (!currentUser) return { success: false, error: 'No user logged in' };

    let payload = {};
    if (typeof updatedProfileData === 'string') {
      payload = { name: updatedProfileData, avatar: optionalAvatar };
    } else if (updatedProfileData && typeof updatedProfileData === 'object') {
      payload = updatedProfileData;
    }

    const nameToUpdate = payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || currentUser.name;
    const avatarToUpdate = payload.avatar || payload.avatar_url || payload.schoolLogoUrl || null;

    // Forward the optional profile details to the existing PUT /auth/profile
    // endpoint so they persist in the database (previously these were dropped
    // and reverted on refresh).
    const profileExtras = {};
    if (payload.phone !== undefined) profileExtras.phone = payload.phone;
    if (payload.dob !== undefined) profileExtras.dob = payload.dob;
    if (payload.designation !== undefined) profileExtras.designation = payload.designation;
    if (payload.socialLinks !== undefined) profileExtras.socialLinks = payload.socialLinks;

    try {
      const res = await updateProfileApi(nameToUpdate, avatarToUpdate, profileExtras);
      const dbUser = res.user || {};
      const updatedUser = {
        ...currentUser,
        ...payload,
        name: dbUser.name || nameToUpdate,
        avatar: dbUser.avatar_url || dbUser.avatar || avatarToUpdate || currentUser.avatar,
        avatar_url: dbUser.avatar_url || avatarToUpdate || currentUser.avatar_url,
        email: currentUser.email // IMMUTABLE
      };
      setCurrentUser(updatedUser);
      safeStoreUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      addToast('Profile Updated', 'Profile updated successfully', 'success');
      return { success: true, user: updatedUser };
    } catch (err) {
      console.error('[PROFILE PERSISTENCE ERROR]:', err);
      addToast('Profile Update Failed', err.message || 'Failed to update profile in database.', 'warning');
      return { success: false, error: err.message };
    }
  };


  const resetPasswordSimple = async (newPass, currentPass = '') => {
    if (!newPass) return { success: false, error: 'New password required.' };
    try {
      await updatePasswordApi(currentPass, newPass);
      addToast('Password Updated', 'Your password has been changed successfully in the database.', 'success');
      return { success: true };
    } catch (err) {
      console.error('[PASSWORD UPDATE ERROR]:', err);
      addToast('Password Update Error', err.message || 'Failed to update password in database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // ====================
  // BRANDING — single source of truth for school identity.
  // currentSchoolInfo is derived from AppContext data, which is hydrated from
  // /auth/me (server data always wins over localStorage).
  // ====================
  const currentSchoolInfo = useMemo(() => {
    const cs = currentSchool;
    return {
      id: cs?.id ?? currentUser?.school_id ?? currentUser?.schoolId ?? null,
      name: cs?.name || currentUser?.school_name || currentUser?.schoolName || '',
      logoUrl:
        cs?.logoUrl || cs?.logo_url ||
        currentUser?.school_logo_url || currentUser?.schoolLogoUrl || '',
      address: cs?.address || currentUser?.school_address || ''
    };
  }, [currentSchool, currentUser]);

  // Force a fresh /auth/me round-trip so branding updates made by the Super
  // Admin appear without a full page reload.
  const refreshBranding = useCallback(async () => {
    try {
      const res = await fetchMeApi();
      const me = res?.user || res?.data || res;
      if (me?.id) {
        setCurrentUser(me);
        safeStoreUser(me);
      }
    } catch (_) { /* network error — keep current branding */ }
  }, []);

  // Persist branding changes to the DB and update every consumer instantly.
  const updateSchoolBranding = useCallback(async (schoolId, payload) => {
    try {
      const res = await updateSchoolBrandingApi(schoolId, payload);
      if (res?.school) setSchools(prev => prev.map(s => (String(s.id) === String(schoolId) ? { ...s, ...res.school } : s)));
      else if (res?.success) {
        const schoolsRes = await fetchSchoolsApi();
        if (Array.isArray(schoolsRes?.data)) setSchools(schoolsRes.data);
      }
      await refreshBranding();
      addToast('Branding Updated', 'School name and logo saved.', 'success');
      return { success: true };
    } catch (err) {
      console.error('[BRANDING UPDATE ERROR]:', err);
      addToast('Branding Update Failed', err.message || 'Could not save school branding.', 'warning');
      return { success: false, error: err.message };
    }
  }, [addToast, refreshBranding]);

  // Export newly added functions via provider value
  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentUser,
        loginUser,
        logout,
        currentSchoolInfo,
        refreshBranding,
        updateSchoolBranding,
        lockedModal,
        setLockedModal,
        users,
        schools,
        currentSchool,
        branding,
        schoolClasses,
        myClasses,
        isTeacher,
        isAdmin,
        isSuperAdmin,
        students,
        marks,
        chalans,
        reminders,
        lectureRegister,
        admitCards,
        activities,
        addToast,
        toggleSchoolLockout,
        addSchoolAdmin,
        updateSchoolAdmin,
        deleteSchoolAdmin,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addStudent,
        updateStudent,
        deactivateStudent,
        deleteStudent,
        createFeeChalan,
        deleteFeeChalan,
        updateFeeStatus,
        updateFeeChalan,
        updateActivity,
        deleteActivity,
        autoGenerateMonthlyChalans,
        saveSingleStudentAllSubjectMarks,
        toggleLectureStatus,
        addAdmitCard,
        updateAdmitCard,
        deleteAdmitCard,
        broadcastReminder,
        updateProfileInfo,
        resetPasswordSimple,
        resetAdminPassword,
        createActivity,
        updateStudentMarksForActivity,
        // Attendance admin helpers (flat DB-shaped records are the single store)
        attendance: attendance || [],
        refreshAttendance,
        adminUpdateAttendanceRecord,
        adminDeleteAttendance,
        adminRecordClassAttendance,
        // Teacher attendance (calendar-based)
        saveTeacherAttendance,
        getAttendanceForDate,
        // Attendance History (server-paginated)
        attendanceHistory,
        attendanceHistoryLoading,
        attendanceHistoryError,
        loadAttendanceHistory,
        clearAttendanceHistoryForClass,
        // Broadcast System
        broadcastNotes,
        createBroadcastNote,
        deleteBroadcastNote,
        markNoteAsRead
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
