import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { User, ShieldCheck, Key, Mail, Lock, Camera, CheckCircle2, Sparkles } from 'lucide-react';

export default function UniversalProfile() {
  const { currentUser, updateProfileInfo, resetPasswordWithOtp } = useApp();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  // Profile fields
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');

  // Password reset fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileInfo(name, avatar);
    } catch (err) {
      console.error('[UNIVERSAL PROFILE ERROR]:', err);
    } finally {
      setIsSaving(false);
    }
  };


  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }
    const success = resetPasswordWithOtp(currentPassword, newPassword, otpCode);
    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Universal Profile & Security System</h1>
            <p className="text-xs text-slate-500 font-medium">Standardized account settings and OTP password security across all Eduzenta roles.</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Password & OTP Security</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' ? (
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500 shadow-md">
                  <img
                    src={avatar || currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{currentUser?.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{currentUser?.email}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                    Role: {currentUser?.role}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Profile Image URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={e => setAvatar(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Email (Read Only)</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-2">OTP Confirmed Password Reset</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              To update your account password, enter your current password, your new password, and the 6-digit email confirmation OTP code sent to your inbox.
            </p>

            <form onSubmit={handleSecuritySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email OTP Confirmation Code</label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code (Use demo code: 123456)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono tracking-widest focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Reset Password & Verify OTP</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
