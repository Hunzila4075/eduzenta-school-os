import React from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import StatCard from '../../components/common/StatCard';
import { BookOpen, Users, CalendarCheck, Bell, ShieldLock, FileCheck2, ArrowRight } from 'lucide-react';

export default function TeacherDashboard() {
  const { currentUser, currentSchool, reminders, students, setCurrentView, myClasses } = useApp();

  const assignedClasses = Array.isArray(myClasses) && myClasses.length ? myClasses : [];
  const assignedSubjects = currentUser?.assignedSubjects || [];
  // BRANDING — the faculty panel shows the same server-hydrated school identity
  // (currentSchool ↔ /auth/me) that feeds every PDF document.
  const schoolDisplayName = currentSchool?.name || currentUser?.schoolName || currentUser?.school_name || '';
  const schoolLogo = currentSchool?.logoUrl || currentSchool?.logo_url || currentUser?.schoolLogoUrl || currentUser?.school_logo_url || '';

  const myStudentsCount = students.filter(s => assignedClasses.includes(s.classSection)).length;

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt={schoolDisplayName} className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white p-0.5 shrink-0" />
              ) : null}
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{schoolDisplayName || 'Faculty Dashboard'}</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">Welcome back, {currentUser?.name}. Review assigned classes, daily attendance, and broadcast notices.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('teacher-attendance')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Mark Today's Attendance</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            title="Assigned Class Groups"
            value={assignedClasses.length}
            icon={BookOpen}
            trend={assignedClasses.join(', ')}
            color="blue"
          />
          <StatCard
            title="My Assigned Students"
            value={myStudentsCount}
            icon={Users}
            trend="Active Roster"
            color="purple"
          />
          <StatCard
            title="Assigned Subjects"
            value={assignedSubjects.length}
            icon={FileCheck2}
            trend={assignedSubjects.join(', ')}
            color="emerald"
          />
        </div>

        {/* Broadcast Notes from School Admin */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white mb-8 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider">Official Announcements from School Admin</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map(rem => (
              <div key={rem.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between font-bold text-white mb-1.5 text-xs">
                  <span>{rem.title}</span>
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 font-mono">
                    {rem.priority}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{rem.content}</p>
                <div className="mt-3 text-[10px] text-slate-400 font-mono flex justify-between border-t border-slate-700/60 pt-2">
                  <span>{rem.sender}</span>
                  <span>{rem.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => setCurrentView('teacher-attendance')}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Mark Attendance</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Record daily student attendance. Note: Submissions lock immediately for faculty.
            </p>
          </div>

          <div
            onClick={() => setCurrentView('teacher-marks')}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-purple-500 cursor-pointer transition-all hover:shadow-md group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Upload Marks</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Input mid-term, final exam, and assignment marks per subject.
            </p>
          </div>

          <div
            onClick={() => setCurrentView('teacher-students')}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-500 cursor-pointer transition-all hover:shadow-md group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Enrol Students</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Quickly add new student profiles directly to your assigned classes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
