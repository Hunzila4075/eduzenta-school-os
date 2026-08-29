import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import ToastAlert from './components/common/ToastAlert';
import LockedAccountModal from './components/common/LockedAccountModal';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LandingPage from './pages/landing/LandingPage';
import UnifiedLoginPage from './pages/auth/UnifiedLoginPage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminManagement from './pages/superadmin/AdminManagement';
import SuperAdminProfile from './pages/superadmin/SuperAdminProfile';
import SchoolAdminDashboard from './pages/schooladmin/SchoolAdminDashboard';
import TeacherManagement from './pages/schooladmin/TeacherManagement';
import StudentDatabase from './pages/schooladmin/StudentDatabase';
import AttendanceManagement from './pages/schooladmin/AttendanceManagement';
import AttendanceOverride from './pages/schooladmin/AttendanceOverride';
import FeeManagement from './pages/schooladmin/FeeManagement';
import ExamResultManagement from './pages/schooladmin/ExamResultManagement';
import AdmitCardGenerator from './pages/schooladmin/AdmitCardGenerator';
import RemindersEngine from './pages/schooladmin/RemindersEngine';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import MarksUpload from './pages/teacher/MarksUpload';
import StudentEnrollment from './pages/teacher/StudentEnrollment';
import TeacherAdmitCards from './pages/teacher/TeacherAdmitCards';
import UserProfileEdit from './pages/profile/UserProfileEdit';
import UserChangePassword from './pages/profile/UserChangePassword';

export default function App() {
  const { currentView, currentUser, setCurrentUser, setCurrentView } = useApp();

  // Persistent Hydration on App Mount — preserve exact subpage route if already authenticated
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('user') || localStorage.getItem('eduzenta_user');
      const savedToken = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');
      const savedView = localStorage.getItem('eduzenta_current_view');

      if (savedUserStr && savedToken && !currentUser) {
        const user = JSON.parse(savedUserStr);
        setCurrentUser(user);
        if (savedView && savedView !== 'landing' && savedView !== 'login') {
          setCurrentView(savedView);
        } else {
          const role = String(user.role || '').toLowerCase();
          if (role === 'superadmin' || role === 'super_admin') {
            setCurrentView('superadmin-dash');
          } else if (role === 'admin') {
            setCurrentView('admin-dash');
          } else if (role === 'teacher') {
            setCurrentView('teacher-dash');
          }
        }
      }
    } catch (err) {
      console.warn('[APP HYDRATION WARNING] Failed to parse saved session:', err);
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage />;
      case 'login':
        return <UnifiedLoginPage />;

      // Super Admin
      case 'superadmin-dash':
        return <SuperAdminDashboard />;
      case 'superadmin-admins':
        return <AdminManagement />;
      case 'superadmin-profile':
        return <SuperAdminProfile />;

      // School Admin
      case 'admin-dash':
        return <SchoolAdminDashboard />;
      case 'admin-teachers':
        return <TeacherManagement />;
      case 'admin-students':
        return <StudentDatabase />;
      case 'admin-attendance':
        return <AttendanceOverride />;
      case 'admin-fees':
        return <FeeManagement />;
      case 'admin-results':
        return <ExamResultManagement />;
      case 'admin-admit':
        return <AdmitCardGenerator />;
      case 'admin-reminders':
        return <RemindersEngine />;
      case 'admin-profile':
        return <UserProfileEdit />;
      case 'admin-password':
        return <UserChangePassword />;

      // Teacher
      case 'teacher-dash':
        return <TeacherDashboard />;
      case 'teacher-attendance':
        return <TeacherAttendance />;
      case 'teacher-marks':
        return <MarksUpload />;
      case 'teacher-students':
        return <StudentEnrollment />;
      case 'teacher-admit':
        return <TeacherAdmitCards />;
      case 'teacher-profile':
        return <UserProfileEdit />;
      case 'teacher-password':
        return <UserChangePassword />;

      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-900">
      <ToastAlert />
      <LockedAccountModal />
      <ErrorBoundary>
        {renderView()}
      </ErrorBoundary>
    </div>
  );
}
