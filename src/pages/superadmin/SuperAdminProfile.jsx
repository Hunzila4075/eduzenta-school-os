import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { handleLocalFileUpload } from '../../utils/fileUpload';
import { User, Key, Camera, Upload, Save, ShieldCheck, Loader2 } from 'lucide-react';


export default function SuperAdminProfile() {
  const { currentUser, updateProfileInfo, resetPasswordSimple } = useApp();

  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [middleName, setMiddleName] = useState(currentUser?.middleName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [designation, setDesignation] = useState(currentUser?.designation || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');

  // Re-sync form fields when the live profile hydrates from /auth/me after a
  // page refresh (the fetch resolves AFTER the initial useState values are set).
  useEffect(() => {
    if (!currentUser) return;
    const parts = (currentUser.name || '').split(' ');
    setFirstName(currentUser.firstName || parts[0] || '');
    setMiddleName(currentUser.middleName || '');
    setLastName(currentUser.lastName || parts.slice(1).join(' ') || '');
    if (currentUser.phone) setPhone(currentUser.phone);
    if (currentUser.designation) setDesignation(currentUser.designation);
    if (currentUser.avatar) setAvatar(currentUser.avatar);
  }, [currentUser]);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64Data = await handleLocalFileUpload(file);
        if (base64Data) {
          setAvatar(base64Data);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileInfo({
        firstName,
        middleName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
        designation,
        avatar
      });
    } catch (err) {
      console.error('[SUPERADMIN PROFILE SUBMIT ERROR]:', err);
    } finally {
      setIsSaving(false);
    }
  };


  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }
    const res = await resetPasswordSimple(newPassword);
    if (res?.success) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Profile & Security</h1>
            <p className="text-xs text-slate-500 font-medium">Update your developer credentials, profile picture (local file picker), and password.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#5A3193]" />
              Personal Information & Avatar
            </h3>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <img
                  src={avatar || currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#5A3193] shadow-sm shrink-0 bg-white"
                />
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Profile Picture (Local Browser File Picker)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#5A3193] file:text-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={e => setMiddleName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Email (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl qobe-btn-primary text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Saving Profile Information...' : 'Save Profile Information'}</span>
              </button>

            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              Update Account Password
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User Full Name</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.name || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl qobe-btn-green text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
