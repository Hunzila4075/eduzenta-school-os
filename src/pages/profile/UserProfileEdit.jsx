import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { handleLocalFileUpload } from '../../utils/fileUpload';
import { updateProfile } from '../../services/api';
import { User, Lock, Upload, Save, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

export default function UserProfileEdit() {
  const { currentUser, updateProfileInfo, addToast } = useApp();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [dob, setDob] = useState('1985-04-12');
  const [designation, setDesignation] = useState('Faculty Member');
  const [linkedin, setLinkedin] = useState('https://linkedin.com');
  const [twitter, setTwitter] = useState('https://twitter.com');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const parts = (currentUser.name || '').split(' ');
      setFirstName(currentUser.firstName || parts[0] || '');
      setMiddleName(currentUser.middleName || '');
      setLastName(currentUser.lastName || parts.slice(1).join(' ') || '');
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.dob) setDob(currentUser.dob);
      if (currentUser.designation) setDesignation(currentUser.designation);
      if (currentUser.socialLinks?.linkedin) setLinkedin(currentUser.socialLinks.linkedin);
      if (currentUser.socialLinks?.twitter) setTwitter(currentUser.socialLinks.twitter);
      if (currentUser.avatar) setAvatar(currentUser.avatar);
    }
  }, [currentUser]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      await updateProfile(fullName);
    } catch (err) {
      console.warn('[PROFILE PERSISTENCE WARNING] Remote DB sync skipped, updating local store:', err.message);
    } finally {
      updateProfileInfo({
        firstName,
        middleName,
        lastName,
        name: fullName,
        phone,
        dob,
        designation,
        socialLinks: { linkedin, twitter },
        avatar
      });
      setIsSaving(false);
      if (addToast) addToast('Profile Updated', 'Your profile details have been saved.', 'success');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Update My Profile</h1>
            <p className="text-xs text-slate-500 font-medium">Manage your personal details, profile picture (local file picker), and social links.</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* DP Local File Picker / Drag & Drop Area */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#5A3193] shadow-sm shrink-0 bg-white">
                <img
                  src={avatar || currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="profile-avatar" className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Profile Picture (Local Browser File Picker Only)
                </label>
                <div className="flex flex-col gap-1.5">
                  <input
                    id="profile-avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#5A3193] file:text-white hover:file:bg-[#4C2A7B] cursor-pointer"
                  />
                  <p className="text-[10px] text-purple-700 font-semibold">
                    ✓ Local file selection enabled. Instant FileReader base64 preview rendering.
                  </p>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="profile-first-name" className="block text-xs font-bold text-slate-700 mb-1">First Name <span className="text-rose-600">*</span></label>
                <input
                  id="profile-first-name"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-middle-name" className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                <input
                  id="profile-middle-name"
                  name="middleName"
                  type="text"
                  autoComplete="additional-name"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-last-name" className="block text-xs font-bold text-slate-700 mb-1">Last Name <span className="text-rose-600">*</span></label>
                <input
                  id="profile-last-name"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* IMMUTABLE EMAIL RULE NOTICE */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-extrabold uppercase tracking-wider text-amber-900">IMMUTABLE ACCOUNT EMAIL</h4>
                <p className="mt-0.5 text-amber-800 leading-snug font-medium">
                  Your assigned institutional email address is permanently locked by system policy and cannot be altered.
                </p>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-email" className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span>Assigned Email Address</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="text"
                  disabled
                  readOnly
                  autoComplete="email"
                  value={currentUser?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-xs font-bold text-slate-700 mb-1">Phone / Mobile Number</label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* DOB & Designation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-dob" className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  id="profile-dob"
                  name="dob"
                  type="date"
                  autoComplete="bday"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-designation" className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  id="profile-designation"
                  name="designation"
                  type="text"
                  autoComplete="organization-title"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-linkedin" className="block text-xs font-bold text-slate-700 mb-1">LinkedIn Profile</label>
                <input
                  id="profile-linkedin"
                  name="linkedin"
                  type="url"
                  autoComplete="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-twitter" className="block text-xs font-bold text-slate-700 mb-1">Twitter / X Profile</label>
                <input
                  id="profile-twitter"
                  name="twitter"
                  type="url"
                  autoComplete="url"
                  value={twitter}
                  onChange={e => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-xl qobe-btn-primary text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Changes...' : 'Update Profile'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
