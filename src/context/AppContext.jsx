import React, { createContext, useContext, useState } from 'react';
import {
  MOCK_MARKS,
  MOCK_CHALANS,
  MOCK_REMINDERS,
  MOCK_LECTURE_REGISTER
} from '../utils/initialData';
import {
  loginUser as loginUserApi,
  fetchMe as fetchMeApi,
  fetchUsers as fetchUsersApi,
  fetchSchools as fetchSchoolsApi,
  fetchStudents as fetchStudentsApi,
  createUser as createUserApi,
  addStudent as addStudentApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  deleteStudent as deleteStudentApi,
  updateProfile as updateProfileApi,
  updatePassword as updatePasswordApi
} from '../services/api';

// Safe localStorage helper — strips large base64 avatar before storing
function safeStoreUser(user) {
  if (!user) return;
  const lightweight = { ...user };
  // Remove base64 blobs — avatar_url in DB is fetched fresh on login
  if (lightweight.avatar && String(lightweight.avatar).startsWith('data:')) {
    delete lightweight.avatar;
  }
  if (lightweight.avatar_url && String(lightweight.avatar_url).startsWith('data:')) {
    delete lightweight.avatar_url;
  }
  try {
    localStorage.setItem('user', JSON.stringify(lightweight));
    localStorage.setItem('eduzenta_user', JSON.stringify(lightweight));
  } catch (e) {
    // If still too large, store only essential fields
    const minimal = { id: user.id, name: user.name, email: user.email, role: user.role, school_id: user.school_id };
    try {
      localStorage.setItem('user', JSON.stringify(minimal));
      localStorage.setItem('eduzenta_user', JSON.stringify(minimal));
    } catch (_) { /* ignore */ }
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

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [lockedModal, setLockedModal] = useState({ open: false, email: '', message: '' });

  // Core Data States — start EMPTY; populated from MySQL on mount
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState(MOCK_MARKS);
  const [chalans, setChalans] = useState(MOCK_CHALANS);
  const [attendance, setAttendance] = useState([]);

  // Sanitize localStorage on first render to remove old base64 blobs
  React.useEffect(() => { sanitizeLocalStorage(); }, []);
  const [attendanceOverrides, setAttendanceOverrides] = useState([]);
  const [activities, setActivities] = useState([]);

  // Database Re-Hydration on Mount / Refresh
  React.useEffect(() => {
    async function loadDatabaseState() {
      const savedToken = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');
      if (savedToken) {
        // 1. Re-hydrate live user profile from MySQL
        try {
          const meRes = await fetchMeApi();
          if (meRes?.user) {
            const userWithAvatar = {
              ...meRes.user,
              avatar: meRes.user.avatar_url || meRes.user.avatar || null
            };
            setCurrentUser(prev => ({ ...(prev || {}), ...userWithAvatar }));
            safeStoreUser(userWithAvatar);
          }
        } catch (err) {
          // Token invalid — clear it
          if (err.message && err.message.includes('expired')) {
            localStorage.removeItem('token');
            localStorage.removeItem('eduzenta_token');
          }
          console.warn('[DB HYDRATION] fetchMe failed:', err.message);
        }

        // 2. Hydrate users list from MySQL DB
        try {
          const usersRes = await fetchUsersApi();
          if (usersRes?.users && Array.isArray(usersRes.users)) {
            const mappedUsers = usersRes.users.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: String(u.role || '').toLowerCase(),
              schoolId: u.school_id,
              school_id: u.school_id,
              schoolName: u.school_name || 'Eduzenta School',
              avatar: u.avatar_url || u.avatar || null,
              avatar_url: u.avatar_url || u.avatar || null,
              isActive: Boolean(u.is_active),
              created_at: u.created_at
            }));
            setUsers(mappedUsers);
          }
        } catch (err) {
          console.warn('[DB HYDRATION] fetchUsers failed:', err.message);
        }

        // 3. Hydrate schools list from MySQL DB (If Super Admin)
        try {
          const schoolsRes = await fetchSchoolsApi();
          if (schoolsRes?.schools && Array.isArray(schoolsRes.schools)) {
            const mappedSchools = schoolsRes.schools.map(s => ({
              id: s.id,
              name: s.name,
              status: s.status || 'Active',
              adminEmail: s.admin_email || 'No Admin Assigned',
              adminName: s.admin_name || 'Unassigned',
              monthlyRevenue: 1500,
              studentsCount: 0,
              teachersCount: 0,
              createdAt: s.created_at
            }));
            setSchools(mappedSchools);
          }
        } catch (err) {
          // Expected 403 for non-SuperAdmin users — ignore silently
        }


        // 4. Hydrate students list from MySQL DB
        try {
          const studentsRes = await fetchStudentsApi();
          if (studentsRes?.data && Array.isArray(studentsRes.data)) {
            const mappedStudents = studentsRes.data.map(st => ({
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
            }));
            setStudents(mappedStudents);
          }
        } catch (err) {
          console.warn('[DB HYDRATION] fetchStudents failed:', err.message);
        }
      }
    }

    loadDatabaseState();
  }, []);

  // Communication & Broadcast Notes State (Super Admin -> School Admins)
  const [broadcastNotes, setBroadcastNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('eduzenta_broadcast_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'note_01',
        title: 'Q3 System Policy & Mandatory Audit',
        description: 'All School Administrators must verify student fee chalans, sync final marks, and ensure attendance records are locked before the term deadline.',
        imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        targetSchoolId: 'all',
        targetSchoolName: 'All Registered Schools',
        sender: 'Alex Vance (Super Admin HQ)',
        createdAt: '2026-08-27T10:00:00.000Z',
        isReadBy: []
      }
    ];
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('eduzenta_broadcast_notes', JSON.stringify(broadcastNotes));
    } catch (e) {
      console.error(e);
    }
  }, [broadcastNotes]);

  // Create a new activity (subject/assessment) for a class/term
  const createActivity = (activity) => {
    const newActivity = {
      id: `act_${Date.now()}`,
      name: activity.name,
      subject: activity.subject,
      maxMarks: activity.maxMarks || 100,
      term: activity.term,
      classSection: activity.classSection,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [...prev, newActivity]);
    addToast('Activity Created', `${newActivity.name} added for ${newActivity.classSection}.`, 'success');
    return newActivity;
  };

  // Update marks for multiple students for a specific activity
  const updateStudentMarksForActivity = (activityId, marksArray) => {
    // marksArray: [{ studentId, obtainedMarks, remarks }]
    marksArray.forEach(({ studentId, obtainedMarks, remarks }) => {
      // Find existing mark entry for this student & term
      const existing = marks.find(m => m.studentId === studentId && m.term === activities.find(a => a.id === activityId)?.term);
      const subjectEntry = {
        name: activities.find(a => a.id === activityId)?.subject || 'Subject',
        maxMarks: activities.find(a => a.id === activityId)?.maxMarks || 100,
        obtainedMarks,
        remarks
      };
      if (existing) {
        // Update or add subject within existing entry
        const existingSubIdx = existing.subjects.findIndex(s => s.name === subjectEntry.name);
        if (existingSubIdx >= 0) {
          const updatedSubjects = [...existing.subjects];
          updatedSubjects[existingSubIdx] = { ...updatedSubjects[existingSubIdx], obtainedMarks, remarks };
          const updatedMarkObj = { ...existing, subjects: updatedSubjects };
          setMarks(prev => prev.map(m => m === existing ? updatedMarkObj : m));
        } else {
          const updatedMarkObj = { ...existing, subjects: [...existing.subjects, subjectEntry] };
          setMarks(prev => prev.map(m => m === existing ? updatedMarkObj : m));
        }
      } else {
        // Create new mark record for student
        const newMarkObj = {
          studentId,
          studentName: students.find(s => s.id === studentId)?.name || 'Student',
          classSection: activities.find(a => a.id === activityId)?.classSection || '',
          rollNo: students.find(s => s.id === studentId)?.rollNo || '',
          term: activities.find(a => a.id === activityId)?.term || '1st Term',
          subjects: [subjectEntry],
          overallRank: 1,
          promotionStatus: 'PROMOTED TO CLASS 11',
          teacherRemarks: ''
        };
        setMarks(prev => [newMarkObj, ...prev]);
      }
    });
    addToast('Activity Marks Updated', `Marks saved for activity ${activityId}.`, 'success');
  };
  const [reminders, setReminders] = useState(MOCK_REMINDERS);
  const [lectureRegister, setLectureRegister] = useState(MOCK_LECTURE_REGISTER);

  // Admit Cards State (Shared CRUD for Admin and Teacher)
  const [admitCards, setAdmitCards] = useState([
  {
    id: "adm_01",
    studentId: "SCH-2025-1001",
    studentName: "Aiden Vance",
    rollNo: "1001",
    regNo: "REG-1001-A",
    classSection: "Class 10-A",
    examCenter: "Main Campus Block B (Hall A)",
    term: "1st Term",
    status: "Ready"
  },
  {
    id: "adm_02",
    studentId: "SCH-2025-1002",
    studentName: "Sophia Martinez",
    rollNo: "1002",
    regNo: "REG-1002-B",
    classSection: "Class 10-A",
    examCenter: "Main Campus Block B (Hall A)",
    term: "1st Term",
    status: "Ready"
  }
]);

  // ====================
  // Attendance Management (Admin Override)
  // ====================

  const adminUpdateAttendanceRecord = (attendanceId, studentId, newStatus) => {
    // Ensure only admins can perform this action
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update attendance records.', 'warning');
      return;
    }
    setAttendance(prev =>
      prev.map(att =>
        att.id === attendanceId
          ? {
              ...att,
              records: att.records.map(rec =>
                rec.studentId === studentId ? { ...rec, status: newStatus } : rec
              )
            }
          : att
      )
    );
    addToast('Attendance Updated', `Student attendance set to ${newStatus}.`, 'success');
  };

  const adminDeleteAttendance = (attendanceId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete attendance records.', 'warning');
      return;
    }
    setAttendance(prev => prev.filter(att => att.id !== attendanceId));
    addToast('Attendance Deleted', 'Record removed.', 'warning');
  };

  const adminRecordClassAttendance = (classSection, date, recordsArray) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can record class attendance.', 'warning');
      return;
    }

    setAttendance(prev => {
      const existingIdx = prev.findIndex(a => a.classSection === classSection && a.date === date);
      const entryObj = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `att_${Date.now()}`,
        classSection,
        date,
        isLockedByTeacher: true,
        recordedBy: `${currentUser.name} (Admin)`,
        records: recordsArray // [{ studentId, studentName, status }]
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = entryObj;
        return copy;
      }
      return [entryObj, ...prev];
    });

    addToast('Attendance Saved', `Attendance for ${classSection} on ${date} saved successfully.`, 'success');
  };

  // Teacher attendance save: saves/updates a dated attendance record for a class
  const saveTeacherAttendance = (classSection, date, recordsArray, lock = false) => {
    if (!currentUser) return;
    setAttendance(prev => {
      const safeArr = Array.isArray(prev) ? prev : [];
      const existingIdx = safeArr.findIndex(
        a => a.classSection === classSection && a.date === date
      );
      const entryObj = {
        id: existingIdx >= 0 ? safeArr[existingIdx].id : `att_${Date.now()}`,
        classSection,
        date,
        isLockedByTeacher: lock,
        recordedBy: `${currentUser.name || 'Teacher'} (Teacher)`,
        records: recordsArray // [{ studentId, studentName, status }]
      };
      if (existingIdx >= 0) {
        const copy = [...safeArr];
        copy[existingIdx] = entryObj;
        return copy;
      }
      return [entryObj, ...safeArr];
    });
    addToast(
      lock ? 'Attendance Submitted & Locked' : 'Attendance Saved',
      `${classSection} attendance on ${date} has been ${lock ? 'locked' : 'saved'}.`,
      'success'
    );
  };

  // Teacher attendance load: returns records for a specific class+date from attendance state
  const getAttendanceForDate = (classSection, date) => {
    const safeArr = Array.isArray(attendance) ? attendance : [];
    return safeArr.find(a => a.classSection === classSection && a.date === date) || null;
  };

  const updateAttendanceOverride = (attendanceId, studentId, newStatus) => {
    adminUpdateAttendanceRecord(attendanceId, studentId, newStatus);
    setAttendanceOverrides(prev =>
      (prev || []).map(att =>
        att.id === attendanceId
          ? {
              ...att,
              records: (att.records || []).map(rec =>
                rec.studentId === studentId ? { ...rec, status: newStatus } : rec
              )
            }
          : att
      )
    );
  };

  const deleteAttendanceOverride = (attendanceId) => {
    adminDeleteAttendance(attendanceId);
    setAttendanceOverrides(prev => (prev || []).filter(att => att.id !== attendanceId));
  };


  // ====================
  // Chalans management permission guards
  // ====================

  const createFeeChalan = (data) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can create fee chalans.', 'warning');
      return;
    }
    const tuition = parseFloat(data.tuitionFee || 0);
    const development = parseFloat(data.developmentFee || 0);
    const exam = parseFloat(data.examFee || 0);
    const library = parseFloat(data.libraryFee || 0);
    const computer = parseFloat(data.computerFee || 0);
    const activity = parseFloat(data.activityFee || 0);
    const prev = parseFloat(data.prevBalance || 0);
    const late = parseFloat(data.lateFee || 0);
    const disc = parseFloat(data.discounts || 0);
    const totalAmount = tuition + development + exam + library + computer + activity + prev + late - disc;
    const chalanId = `CHL-2025-${String(Date.now()).slice(-4)}`;
    const newChalan = {
      chalanId,
      studentId: data.studentId,
      studentName: data.studentName,
      rollNo: data.rollNo || '1001',
      regNo: data.regNo || 'REG-1001-A',
      classSection: data.classSection,
      session: data.session || '2024-2025',
      term: data.term || '1st Term',
      monthYear: data.monthYear || 'August 2025',
      tuitionFee: tuition,
      developmentFee: development,
      examFee: exam,
      libraryFee: library,
      computerFee: computer,
      activityFee: activity,
      prevBalance: prev,
      lateFee: late,
      discounts: disc,
      totalAmount,
      dueDate: data.dueDate || '2025-08-10',
      status: data.status || 'Unpaid',
      issuedDate: new Date().toISOString().split('T')[0]
    };
    setChalans(prev => [newChalan, ...prev]);
    addToast('Chalan Created', `Fee Chalan ${chalanId} generated for ${data.studentName}.`, 'success');
  };

  const deleteFeeChalan = (chalanId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete fee chalans.', 'warning');
      return;
    }
    setChalans(prev => prev.filter(c => c.chalanId !== chalanId));
    addToast('Chalan Deleted', `Chalan ${chalanId} deleted.`, 'warning');
  };

  const updateFeeStatus = (chalanId, newStatus) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update fee status.', 'warning');
      return;
    }
    setChalans(prev =>
      prev.map(c => (c.chalanId === chalanId ? { ...c, status: newStatus } : c))
    );
    addToast('Status Updated', `Chalan ${chalanId} set to "${newStatus}".`, 'info');
  };

  const updateFeeChalan = (chalanId, updatedData) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can update fee chalans.', 'warning');
      return;
    }
    setChalans(prev =>
      prev.map(c => {
        if (c.chalanId === chalanId) {
          const merged = { ...c, ...updatedData };
          const tuition = parseFloat(merged.tuitionFee || 0);
          const development = parseFloat(merged.developmentFee || 0);
          const exam = parseFloat(merged.examFee || 0);
          const library = parseFloat(merged.libraryFee || 0);
          const computer = parseFloat(merged.computerFee || 0);
          const activity = parseFloat(merged.activityFee || 0);
          const prevBal = parseFloat(merged.prevBalance || 0);
          const late = parseFloat(merged.lateFee || 0);
          const disc = parseFloat(merged.discounts || 0);
          merged.totalAmount = tuition + development + exam + library + computer + activity + prevBal + late - disc;
          return merged;
        }
        return c;
      })
    );
    addToast('Fee Slip Updated', `Chalan ${chalanId} updated successfully.`, 'success');
  };

  const updateActivity = (activityId, updatedFields) => {
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...updatedFields } : a));
    addToast('Activity Updated', 'Activity metadata updated successfully.', 'success');
  };

  const deleteActivity = (activityId) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
    addToast('Activity Deleted', 'Activity removed successfully.', 'warning');
  };

  const createBroadcastNote = (noteData) => {
    const newNote = {
      id: `note_${Date.now()}`,
      title: noteData.title,
      description: noteData.description,
      imageUrl: noteData.imageUrl || '',
      videoUrl: noteData.videoUrl || '',
      targetSchoolId: noteData.targetSchoolId || 'all',
      targetSchoolName: noteData.targetSchoolName || 'All Registered Schools',
      sender: `${currentUser?.name || 'Super Admin'} (Super Admin HQ)`,
      createdAt: new Date().toISOString(),
      isReadBy: []
    };
    setBroadcastNotes(prev => [newNote, ...prev]);
    addToast('Broadcast Note Sent', `Directive "${newNote.title}" published to school admins.`, 'success');
  };

  const deleteBroadcastNote = (noteId) => {
    setBroadcastNotes(prev => prev.filter(n => n.id !== noteId));
    addToast('Directive Deleted', 'Broadcast note removed.', 'warning');
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

    
  

  // Toast Notification Queue
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Session login helper after successful backend API verification
  const loginWithSession = (user, token) => {
    if (!user || !token) {
      return { success: false, error: 'Invalid authentication session response.' };
    }

    localStorage.setItem('token', token);
    localStorage.setItem('eduzenta_token', token);
    safeStoreUser(user);

    setCurrentUser(user);
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
      return { success: false, error: err.message || 'Invalid email or password.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('eduzenta_token');
    localStorage.removeItem('eduzenta_user');
    setCurrentUser(null);
    setCurrentView('landing');
    addToast('Logged Out', 'You have been safely signed out of Eduzenta.', 'info');
  };

  // Super Admin actions
  const toggleSchoolLockout = (schoolId) => {
    setSchools(prev => prev.map(s => {
      if (s.id === schoolId) {
        const isCurrentlyLocked = s.status.includes('Locked');
        const newStatus = isCurrentlyLocked ? 'Active' : 'Locked - Pending Payment';

        setUsers(uPrev => uPrev.map(u => {
          if (u.schoolId === schoolId || u.email === s.adminEmail) {
            return { ...u, locked: !isCurrentlyLocked };
          }
          return u;
        }));

        addToast(
          'Lock status updated',
          `${s.name} status set to "${newStatus}".`,
          isCurrentlyLocked ? 'success' : 'warning'
        );

        return { ...s, status: newStatus };
      }
      return s;
    }));
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
        const res = await updateUserApi(numericId, {
          name: cleanName,
          school_name: updatedFields.schoolName
        });
        if (res?.user) {
          setUsers(prev => prev.map(u => (u.id === userId || u.id === numericId) ? { ...u, ...updatedFields, name: res.user.name } : u));
          if (res.user.school_name) {
            setSchools(prev => prev.map(s => (s.id === res.user.school_id) ? { ...s, name: res.user.school_name } : s));
          }
        }
      } else {
        setUsers(prev => prev.map(u => (u.id === userId) ? { ...u, ...updatedFields, email: u.email } : u));
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
        await deleteUserApi(numericId);
      }
      const userToDelete = users.find(u => u.id === userId || u.id === numericId);
      setUsers(prev => prev.filter(u => u.id !== userId && u.id !== numericId));
      if (userToDelete?.schoolId) {
        setSchools(prev => prev.filter(s => s.id !== userToDelete.schoolId));
      }
      addToast('Account Removed', 'School Admin deleted from database.', 'warning');
      return { success: true };
    } catch (err) {
      console.error('[DELETE SCHOOL ADMIN ERROR]:', err);
      addToast('Deletion Failed', err.message || 'Failed to delete admin from database.', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Teacher CRUD — Teachers are stored in MySQL users table with role=teacher
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
        const newTeacher = {
          id: res.user.id,  // Real DB numeric id
          name: res.user.name,
          email: res.user.email,
          role: 'teacher',
          schoolId: res.user.school_id,
          assignedClasses: teacherData.assignedClasses || ['Class 10-A'],
          assignedSubjects: teacherData.assignedSubjects || ['Physics'],
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

  const updateTeacher = (teacherId, updatedData) => {
    setUsers(prev => prev.map(u => u.id === teacherId ? { ...u, ...updatedData, email: u.email } : u));
    addToast('Teacher Updated', 'Faculty details saved.', 'success');
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
    try {
      const res = await addStudentApi({
        rollNo: studentData.rollNo || String(Date.now()).slice(-4),
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

  const updateStudent = (id, data) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    addToast('Student Updated', 'Record saved.', 'success');
  };

  const deactivateStudent = (id) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Deactivated' : 'Active' } : s));

    addToast('Status Toggled', 'Student active status updated.', 'info');
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

  const autoGenerateMonthlyChalans = (monthYear, dueDate, term = '1st Term', customFeeData = {}) => {
    const currentSchoolStudents = students.filter(s => s.schoolId === currentUser?.schoolId);
    const newGenerated = currentSchoolStudents.map((std) => ({
      chalanId: `CHL-2025-${monthYear.slice(0, 3).toUpperCase()}-${std.id.slice(-4)}`,
      studentId: std.id,
      studentName: std.name,
      rollNo: std.rollNo,
      regNo: std.regNo || 'REG-1001-A',
      classSection: std.classSection,
      session: '2024-2025',
      term,
      monthYear,
      tuitionFee: 8000,
      developmentFee: 1500,
      examFee: 1000,
      libraryFee: 500,
      computerFee: 500,
      activityFee: 500,
      prevBalance: 0,
      lateFee: 0,
      discounts: 0,
      totalAmount: 12000,
      dueDate,
      status: 'Unpaid',
      issuedDate: new Date().toISOString().split('T')[0]
    }));

    setChalans(prev => [...newGenerated, ...prev]);
    addToast('Bulk Generation', `Generated ${newGenerated.length} chalans for ${monthYear}.`, 'success');
  };

  // Single Student All-Subject Marks Grid Engine (3 Terms Support)
  const saveSingleStudentAllSubjectMarks = (studentId, updatedSubjects, teacherRemarks, term = '1st Term') => {
    setMarks(prev => {
      const idx = prev.findIndex(m => m.studentId === studentId);
      const std = students.find(s => s.id === studentId);

      const totalMax = updatedSubjects.reduce((a, s) => a + (s.maxMarks || 100), 0);
      const totalObtained = updatedSubjects.reduce((a, s) => a + (s.obtainedMarks || 0), 0);
      const pct = (totalObtained / totalMax) * 100;

      let promotionStatus = "PROMOTED TO CLASS 11";
      if (pct < 50) promotionStatus = "NOT PROMOTED";

      const markObj = {
        studentId,
        studentName: std?.name || "Student",
        classSection: std?.classSection || "Class 10-A",
        rollNo: std?.rollNo || "1001",
        term,
        subjects: updatedSubjects,
        overallRank: 1,
        promotionStatus,
        teacherRemarks: teacherRemarks || "Evaluation completed across all assigned subjects."
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = markObj;
        return copy;
      }
      return [markObj, ...prev];
    });

    addToast('Marks Grid Saved', `Saved all-subject marks grid for Student ID: ${studentId}`, 'success');
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
  const addAdmitCard = (data) => {
    const newCard = {
      id: `adm_${Date.now()}`,
      studentId: data.studentId,
      studentName: data.studentName,
      rollNo: data.rollNo,
      regNo: data.regNo || 'REG-1001-A',
      classSection: data.classSection,
      examCenter: data.examCenter || 'Main Campus Block B (Hall A)',
      term: data.term || '1st Term',
      status: 'Ready'
    };
    setAdmitCards(prev => [...prev, newCard]);
    addToast('Admit Card Generated', `Hall ticket created for ${data.studentName}.`, 'success');
  };

  const updateAdmitCard = (id, data) => {
    setAdmitCards(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    addToast('Admit Card Updated', 'Hall ticket details saved.', 'success');
  };

  const deleteAdmitCard = (id) => {
    setAdmitCards(prev => prev.filter(a => a.id !== id));
    addToast('Admit Card Deleted', 'Hall ticket removed.', 'warning');
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

    try {
      const res = await updateProfileApi(nameToUpdate, avatarToUpdate);
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

  // Export newly added functions via provider value
  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentUser,
        loginUser,
        logout,
        lockedModal,
        setLockedModal,
        users,
        schools,
        students,
        marks,
        chalans,
        reminders,
        lectureRegister,
        admitCards,
        activities,
        toasts,
        addToast,
        removeToast,
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
        createActivity,
        updateStudentMarksForActivity,
        // Attendance admin helpers & overrides
        attendance: attendance || [],
        attendanceOverrides: attendanceOverrides || [],
        updateAttendanceOverride,
        deleteAttendanceOverride,
        adminUpdateAttendanceRecord,
        adminDeleteAttendance,
        adminRecordClassAttendance,
        // Teacher attendance (calendar-based)
        saveTeacherAttendance,
        getAttendanceForDate,
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
