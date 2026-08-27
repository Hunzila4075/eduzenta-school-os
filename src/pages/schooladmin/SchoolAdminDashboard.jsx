import React from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import {
  Users,
  UserCheck,
  CreditCard,
  CalendarCheck,
  Bell,
  FileCheck2,
  Ticket,
  Plus
} from 'lucide-react';

export default function SchoolAdminDashboard() {
  const {
    currentUser,
    students,
    users,
    chalans,
    reminders,
    attendance,
    setCurrentView
  } = useApp();

  const teachersCount = users.filter(u => u.role === 'teacher').length;
  const activeStudentsCount = students.filter(s => s.status === 'Active').length;
  const totalPaidFees = chalans
    .filter(c => c.status === 'Paid')
    .reduce((acc, c) => acc + c.totalAmount, 0);
  const pendingFeesCount = chalans.filter(c => c.status !== 'Paid').length;

  const recentReminders = reminders.slice(0, 3);

  const studentColumns = [
    {
      label: 'Student Name & ID',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.id} | Roll: {row.rollNo}</div>
        </div>
      )
    },
    { label: 'Class & Section', accessor: 'classSection' },
    { label: 'Guardian', accessor: 'guardianName font-semibold' },
    { label: 'Attendance', accessor: 'attendanceDays', render: (row) => <span className="font-bold">{row.attendanceDays} / {row.totalWorkingDays} Days</span> },
    {
      label: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
          row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {currentUser?.schoolName || 'School Dashboard'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Welcome back, {currentUser?.name}. Manage faculty, students, fee chalans, and printable academic records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentView('admin-fees')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Fee Chalan Engine</span>
            </button>

            <button
              onClick={() => setCurrentView('admin-results')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Result Cards PDF</span>
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Active Students"
            value={activeStudentsCount}
            icon={Users}
            trend="Enrolled Database"
            color="blue"
          />
          <StatCard
            title="Assigned Teachers"
            value={teachersCount}
            icon={UserCheck}
            trend="Active Faculty"
            color="purple"
          />
          <StatCard
            title="Fee Collections (Paid)"
            value={`$${totalPaidFees.toLocaleString()}`}
            icon={CreditCard}
            trend="Chalan Revenue"
            color="emerald"
          />
          <StatCard
            title="Unpaid / Pending Chalans"
            value={pendingFeesCount}
            icon={CalendarCheck}
            trend="Requires Followup"
            color={pendingFeesCount > 0 ? "amber" : "blue"}
          />
        </div>

        {/* Broadcast Reminders Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 rounded-2xl border border-slate-800 text-white mb-8 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider">Active Broadcast Notes to Teachers</h3>
            </div>
            <button
              onClick={() => setCurrentView('admin-reminders')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors"
            >
              + Create Broadcast Note
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReminders.map(rem => (
              <div key={rem.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                <div className="flex items-center justify-between font-bold text-white mb-1">
                  <span>{rem.title}</span>
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800">{rem.priority}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">{rem.content}</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">{rem.sender} • {rem.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Students Overview Table */}
        <DataTable
          title="Recent Enrolled Students"
          subtitle="Full access to student database"
          columns={studentColumns}
          data={students}
          searchPlaceholder="Search by name, ID, class..."
        />
      </main>
    </div>
  );
}
