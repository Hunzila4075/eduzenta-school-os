import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import EduzentaLogo from '../common/EduzentaLogo';
import {
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  Users,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  Ticket,
  Bell,
  User,
  Key,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function AppSidebar() {
  const { currentView, setCurrentView, currentUser, logout, schools } = useApp();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!currentUser) return null;

  const roleStr = String(currentUser?.role || '').toLowerCase();
  const isSuperAdmin = roleStr === 'superadmin' || roleStr === 'super_admin';
  const isAdmin = roleStr === 'admin';
  const isTeacher = roleStr === 'teacher';

  const currentSchool = schools.find(s => s.id === currentUser.schoolId);
  const schoolLogo = currentSchool?.logoUrl || currentUser.schoolLogoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80";

  let navItems = [];

  if (isSuperAdmin) {
    navItems = [
      { id: 'superadmin-dash', label: 'Platform Overview', icon: LayoutDashboard },
      { id: 'superadmin-admins', label: 'School Admin Control', icon: ShieldCheck },
      { id: 'superadmin-profile', label: 'Update My Profile', icon: User },
    ];
  } else if (isAdmin) {
    navItems = [
      { id: 'admin-dash', label: 'School Overview', icon: LayoutDashboard },
      { id: 'admin-teachers', label: 'Faculty Management', icon: UserCheck },
      { id: 'admin-students', label: 'Student Database', icon: Users },
      { id: 'admin-attendance', label: 'Attendance Overrides', icon: CalendarCheck },
      { id: 'admin-fees', label: 'Fee Chalan Engine', icon: CreditCard },
      { id: 'admin-results', label: 'Result Cards (Bulk PDF)', icon: FileCheck2 },
      { id: 'admin-admit', label: 'Admit Card Generator', icon: Ticket },
      { id: 'admin-reminders', label: 'Broadcast Notes', icon: Bell },
      { id: 'admin-profile', label: 'Update Profile', icon: User },
      { id: 'admin-password', label: 'Change Password', icon: Key },
    ];
  } else if (isTeacher) {
    navItems = [
      { id: 'teacher-dash', label: 'Faculty Dashboard', icon: LayoutDashboard },
      { id: 'teacher-attendance', label: 'Lecture Register (Log)', icon: CalendarCheck },
      { id: 'teacher-marks', label: 'Marks Grid (All Subjects)', icon: FileCheck2 },
      { id: 'teacher-students', label: 'Enrol Student', icon: Users },
      { id: 'teacher-admit', label: 'Class Admit Cards', icon: Ticket },
      { id: 'teacher-profile', label: 'Update Profile', icon: User },
      { id: 'teacher-password', label: 'Change Password', icon: Key },
    ];
  }

  const handleNavClick = (id) => {
    setCurrentView(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Top Mobile Header Bar (< 768px) */}
      <div className="md:hidden sticky top-0 z-50 w-full bg-[#0B132B] border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center z-50 cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            {isMobileOpen ? <X className="w-6 h-6 text-purple-400" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
          <EduzentaLogo variant="dark" className="h-7" />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-950/80 px-2 py-1 rounded-md border border-purple-800/60">
            {isSuperAdmin ? 'Super Admin' : isAdmin ? 'School Admin' : 'Faculty'}
          </span>
          <img
            src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-purple-400/40"
          />
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B132B] text-slate-300 flex flex-col border-r border-slate-800/80 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 font-sans select-none shrink-0 h-[100dvh] ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <EduzentaLogo variant="dark" className="h-8" />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic School Branding Card */}
        <div className="mx-3 my-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
          <img
            src={schoolLogo}
            alt={currentUser.schoolName || 'School Logo'}
            className="w-9 h-9 rounded-lg object-cover border border-purple-400/40 bg-white p-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-400">
              {isSuperAdmin ? 'Super Admin HQ' : isAdmin ? 'School Admin' : 'Faculty Member'}
            </p>
            <p className="text-xs font-bold text-white truncate leading-snug">
              {currentUser.schoolName || 'Eduzenta Platform'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#5A3193] to-[#4C2A7B] text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </button>
            );
          })}
        </nav>

        {/* Footer User Profile & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-300 text-xs font-bold transition-colors border border-slate-700/60 min-h-[44px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[10px] font-medium text-slate-400/90 tracking-wide">
              Eduzenta — Developed by <span className="font-bold text-purple-400">Hunzila Khan</span>
            </p>
            <div className="flex items-center justify-center gap-2 text-[9px] font-semibold text-slate-400">
              <a href="mailto:eduzentawithkhan@gmail.com" className="hover:text-purple-300 transition-colors truncate">
                eduzentawithkhan@gmail.com
              </a>
              <span>•</span>
              <a href="tel:+923330935652" className="hover:text-purple-300 transition-colors font-mono">
                +92 333 0935652
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
