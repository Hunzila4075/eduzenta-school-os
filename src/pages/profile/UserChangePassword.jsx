import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { Key, CheckCircle2 } from 'lucide-react';

export default function UserChangePassword() {
  const { currentUser, resetPasswordSimple } = useApp();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      alert("Password and Confirm Password do not match.");
      return;
    }
    resetPasswordSimple(password);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Change Password</h1>
            <p className="text-xs text-slate-500 font-medium">Update your security credentials for {currentUser?.name}.</p>
          </div>
        </div>

        <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">User Full Name</label>
              <input
                type="text"
                disabled
                value={currentUser?.name || ''}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password <span className="text-rose-600">*</span></label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password <span className="text-rose-600">*</span></label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl qobe-btn-green text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Update</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
