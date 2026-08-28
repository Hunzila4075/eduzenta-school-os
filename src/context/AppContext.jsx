import React, { createContext, useContext, useState } from 'react';
import {
  MOCK_USERS,
  MOCK_SCHOOLS,
  MOCK_STUDENTS,
  MOCK_MARKS,
  MOCK_CHALANS,
  MOCK_REMINDERS,
  MOCK_LECTURE_REGISTER
} from '../utils/initialData';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [lockedModal, setLockedModal] = useState({ open: false, email: '', message: '' });

  // Core Data States
  const [users, setUsers] = useState(MOCK_USERS);
  const [schools, setSchools] = useState(MOCK_SCHOOLS);
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [marks, setMarks] = useState(MOCK_MARKS);
  const [chalans, setChalans] = useState(MOCK_CHALANS);
  const [attendance, setAttendance] = useState([]);
  const [attendanceOverrides, setAttendanceOverrides] = useState([]);
  // New Activities state for marks entry workflow
  const [activities, setActivities] = useState([]);

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
  // Student CRUD enhancements
  // ====================

  const deleteStudent = (studentId) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      addToast('Permission Denied', 'Only admins can delete student profiles.', 'warning');
      return;
    }
    setStudents(prev => prev.filter(s => s.id !== studentId));
    addToast('Student Removed', 'Student profile deleted.', 'warning');
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

  // Unified QOBE Login Handler
  const loginUser = (email, password) => {
    if (!email || !email.trim()) {
      return { success: false, error: 'User Name cannot be blank.' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    let user = users.find(u => u.email.toLowerCase() === trimmedEmail);

    // Fallback for Super Admin
    if (!user && (trimmedEmail === 'developerwithkhan804@gmail.com' || trimmedEmail === 'superadmin@eduzenta.com')) {
      user = {
        id: "usr_superadmin",
        name: "Eduzenta Super Admin",
        email: trimmedEmail,
        role: "superadmin",
        schoolId: null,
        schoolName: "Eduzenta Corporate HQ",
        locked: false
      };
    }

    if (!user) {
      return { success: false, error: 'Invalid Credentials. Please check assigned email and password.' };
    }

    if (user.locked) {
      setLockedModal({
        open: true,
        email: user.email,
        message: 'ACCESS BLOCKED: Pending Payment Required. Please contact system administrator.'
      });
      return { success: false, locked: true };
    }

    if (user.schoolId) {
      const sch = schools.find(s => s.id === user.schoolId);
      if (sch && sch.status.includes('Locked')) {
        setLockedModal({
          open: true,
          email: user.email,
          message: `ACCESS BLOCKED: ${sch.name} is currently suspended due to Pending Payment. Please contact system administrator.`
        });
        return { success: false, locked: true };
      }
    }

    const token = user.token || `jwt_token_${Date.now()}`;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('eduzenta_token', token);
    localStorage.setItem('eduzenta_user', JSON.stringify(user));

    setCurrentUser(user);
    addToast('Authentication Success', `Automated security confirmation sent to ${user.email}`, 'success');

    const roleStr = String(user.role || '').toLowerCase();
    if (roleStr === 'superadmin' || roleStr === 'super_admin') {
      setCurrentView('superadmin-dash');
    } else if (roleStr === 'admin') {
      setCurrentView('admin-dash');
    } else if (roleStr === 'teacher') {
      setCurrentView('teacher-dash');
    }

    return { success: true };
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

  // Onboard School Admin with Local File Upload Logo
  const addSchoolAdmin = (data) => {
    const newSchoolId = `sch_${Date.now()}`;
    const newUserId = `usr_admin_${Date.now()}`;
    const defaultLogo = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80";

    const logoUrl = data.schoolLogoUrl || defaultLogo;

    const newSchool = {
      id: newSchoolId,
      name: data.schoolName,
      logoUrl: logoUrl,
      adminEmail: data.email,
      adminName: `${data.firstName} ${data.lastName}`,
      city: data.city || 'Knowledge City',
      address: data.address || '123 Education Boulevard',
      studentsCount: 0,
      teachersCount: 0,
      status: 'Active',
      monthlyRevenue: 1500,
      createdAt: new Date().toISOString().split('T')[0],
      ipLogs: ['192.168.1.100 (New Session)']
    };

    const newUser = {
      id: newUserId,
      firstName: data.firstName,
      middleName: data.middleName || '',
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      email: data.email, // IMMUTABLE
      phone: data.phone || '+1 (555) 000-0000',
      dob: data.dob || '1985-01-01',
      designation: 'School Administrator',
      role: 'admin',
      schoolId: newSchoolId,
      schoolName: data.schoolName,
      schoolLogoUrl: logoUrl,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
      locked: false
    };

    setSchools(prev => [...prev, newSchool]);
    setUsers(prev => [...prev, newUser]);
    addToast('School Admin Onboarded', `Logo & Branding bound to ${data.schoolName}.`, 'success');
  };

  const updateSchoolAdmin = (userId, updatedFields) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedFields, email: u.email } : u));
    addToast('Account Updated', 'School Admin profile updated.', 'success');
  };

  const deleteSchoolAdmin = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (userToDelete?.schoolId) {
      setSchools(prev => prev.filter(s => s.id !== userToDelete.schoolId));
    }
    addToast('Account Removed', 'School Admin removed.', 'warning');
  };

  // Teacher CRUD
  const addTeacher = (teacherData) => {
    const sch = schools.find(s => s.id === currentUser?.schoolId) || schools[0];
    const newTeacher = {
      id: `usr_teacher_${Date.now()}`,
      firstName: teacherData.firstName || teacherData.name.split(' ')[0],
      middleName: teacherData.middleName || '',
      lastName: teacherData.lastName || teacherData.name.split(' ')[1] || '',
      name: teacherData.name,
      email: teacherData.email,
      phone: teacherData.phone || '+1 (555) 000-0000',
      dob: teacherData.dob || '1990-01-01',
      designation: teacherData.designation || 'Lecturer',
      role: 'teacher',
      schoolId: sch.id,
      schoolName: sch.name,
      schoolLogoUrl: sch.logoUrl,
      assignedClasses: teacherData.assignedClasses || ['Class 10-A'],
      assignedSubjects: teacherData.assignedSubjects || ['Physics'],
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=250&q=80',
      locked: false
    };

    setUsers(prev => [...prev, newTeacher]);
    addToast('Faculty Added', `Credentials assigned to ${teacherData.email}`, 'success');
  };

  const updateTeacher = (teacherId, updatedData) => {
    setUsers(prev => prev.map(u => u.id === teacherId ? { ...u, ...updatedData, email: u.email } : u));
    addToast('Teacher Updated', 'Faculty details saved.', 'success');
  };

  const deleteTeacher = (teacherId) => {
    setUsers(prev => prev.filter(u => u.id !== teacherId));
    addToast('Teacher Removed', 'Faculty account deleted.', 'warning');
  };

  // Student CRUD
  const addStudent = (studentData) => {
    const newId = `SCH-2025-${1000 + students.length + 1}`;
    const newStudent = {
      id: newId,
      rollNo: `${1000 + students.length + 1}`,
      regNo: `REG-${1000 + students.length + 1}-X`,
      name: studentData.name,
      classSection: studentData.classSection,
      guardianName: studentData.guardianName,
      dob: studentData.dob || '2009-05-15',
      gender: studentData.gender || 'Male',
      phone: studentData.phone || '+1 (555) 000-0000',
      address: studentData.address || 'Knowledge City',
      photo: studentData.photo || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=250&q=80',
      status: 'Active',
      attendanceDays: 13,
      totalWorkingDays: 16
    };

    setStudents(prev => [...prev, newStudent]);
    addToast('Student Enrolled', `${studentData.name} added (ID: ${newId})`, 'success');
  };

  const updateStudent = (id, data) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    addToast('Student Updated', 'Record saved.', 'success');
  };

  const deactivateStudent = (id) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Deactivated' : 'Active' } : s));

    addToast('Status Toggled', 'Student active status updated.', 'info');
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

  // Universal Profile Update (Immutable Email)
  const updateProfileInfo = (updatedProfileData) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      ...updatedProfileData,
      email: currentUser.email // IMMUTABLE
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    addToast('Profile Updated', 'Your profile details have been saved.', 'success');
  };

  const resetPasswordSimple = (newPass) => {
    addToast('Password Updated', 'Your password has been changed successfully.', 'success');
    return true;
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
