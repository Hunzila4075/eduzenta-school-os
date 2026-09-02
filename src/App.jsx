import React, { Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import ToastAlert from './components/common/ToastAlert';
import LockedAccountModal from './components/common/LockedAccountModal';
import ErrorBoundary from './components/common/ErrorBoundary';

// Route-level code splitting — each page becomes its own chunk, so the initial
// bundle no longer carries jspdf / xlsx / html2canvas (only PDF/export pages load them).
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const UnifiedLoginPage = lazy(() => import('./pages/auth/UnifiedLoginPage'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const AdminManagement = lazy(() => import('./pages/superadmin/AdminManagement'));
const SuperAdminProfile = lazy(() => import('./pages/superadmin/SuperAdminProfile'));
const SchoolAdminDashboard = lazy(() => import('./pages/schooladmin/SchoolAdminDashboard'));
const TeacherManagement = lazy(() => import('./pages/schooladmin/TeacherManagement'));
const StudentDatabase = lazy(() => import('./pages/schooladmin/StudentDatabase'));
const AttendanceManagement = lazy(() => import('./pages/schooladmin/AttendanceManagement'));
const AttendanceOverride = lazy(() => import('./pages/schooladmin/AttendanceOverride'));
const FeeManagement = lazy(() => import('./pages/schooladmin/FeeManagement'));
const ExamResultManagement = lazy(() => import('./pages/schooladmin/ExamResultManagement'));
const AdmitCardGenerator = lazy(() => import('./pages/schooladmin/AdmitCardGenerator'));
const RemindersEngine = lazy(() => import('./pages/schooladmin/RemindersEngine'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const MarksUpload = lazy(() => import('./pages/teacher/MarksUpload'));
const StudentEnrollment = lazy(() => import('./pages/teacher/StudentEnrollment'));
const TeacherAdmitCards = lazy(() => import('./pages/teacher/TeacherAdmitCards'));
const AttendanceHistory = lazy(() => import('./pages/shared/AttendanceHistory'));
const UserProfileEdit = lazy(() => import('./pages/profile/UserProfileEdit'));
const UserChangePassword = lazy(() => import('./pages/profile/UserChangePassword'));

export default function App() {
  const { currentView } = useApp();

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
      case 'admin-attendance-history':
        return <AttendanceHistory />;
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
      case 'teacher-attendance-history':
        return <AttendanceHistory />;
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
    // Light neutral wrapper — the app shell must stay light so the translucent
    // navbar / light pages never sit on a dark canvas (old: bg-slate-950, which
    // caused a black flash and washed-out navbar/button contrast).
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <ToastAlert />
      <LockedAccountModal />
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5A3193]" />
            </div>
          }
        >
          {renderView()}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
