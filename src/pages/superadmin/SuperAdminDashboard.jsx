import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import {
  School,
  ShieldCheck,
  DollarSign,
  Activity,
  Lock,
  Unlock,
  Plus,
  AlertTriangle,
  FileText,
  Megaphone,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Send,
  Eye,
  Loader2,
  WifiOff
} from 'lucide-react';
import { fetchBroadcasts as apiFetchBroadcasts, createBroadcast as apiCreateBroadcast } from '../../services/api';

export default function SuperAdminDashboard() {
  const {
    schools,
    users,
    toggleSchoolLockout,
    setCurrentView,
    broadcastNotes,
    createBroadcastNote,
    deleteBroadcastNote
  } = useApp();

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // API state for broadcasts
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [broadcastApiError, setBroadcastApiError] = useState(null);
  const [apiBroadcasts, setApiBroadcasts] = useState(null); // null = not loaded

  // Broadcast Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [targetSchoolId, setTargetSchoolId] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Use API broadcasts if available, otherwise fall back to context state
  const displayedBroadcasts = apiBroadcasts !== null ? apiBroadcasts : (broadcastNotes || []);

  // Load broadcasts from API on mount
  useEffect(() => {
    const loadBroadcasts = async () => {
      setIsBroadcastLoading(true);
      try {
        const response = await apiFetchBroadcasts('all');
        if (response?.success && Array.isArray(response.data)) {
          setApiBroadcasts(response.data);
          setIsApiConnected(!response.isMock);
        }
      } catch (_) {
        setIsApiConnected(false);
      } finally {
        setIsBroadcastLoading(false);
      }
    };
    loadBroadcasts();
  }, []);

  const totalActiveSchools = schools.filter(s => String(s.status || '').toLowerCase() === 'active').length;
  const totalLockedSchools = schools.filter(s => String(s.status || '').toLowerCase().includes('locked')).length;
  const totalAdmins = users.filter(u => {
    const r = String(u.role || '').toLowerCase();
    return r === 'admin' || r === 'school_admin' || r === 'school-admin';
  }).length;
  const totalRevenue = schools.reduce((acc, s) => acc + (Number(s.monthlyRevenue) || Number(s.monthly_revenue) || 1500), 0);


  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const targetSchool = schools.find(s => s.id === targetSchoolId);
    const targetName = targetSchoolId === 'all' ? 'All Registered Schools' : (targetSchool?.name || 'Selected School');

    // Save to AppContext (local state + localStorage)
    createBroadcastNote({
      title: noteTitle,
      description: noteDescription,
      imageUrl,
      videoUrl,
      targetSchoolId,
      targetSchoolName: targetName
    });

    // Also try to persist to MySQL via API
    setIsSendingBroadcast(true);
    setBroadcastApiError(null);
    try {
      const response = await apiCreateBroadcast({
        title: noteTitle,
        description: noteDescription,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        targetSchoolId,
        sender: 'Super Admin'
      });
      if (response?.success && response.data) {
        setIsApiConnected(!response.isMock);
        // Prepend new broadcast to API list
        setApiBroadcasts(prev => prev !== null ? [response.data, ...prev] : null);
      }
    } catch (_) {
      setBroadcastApiError('Saved locally — API sync failed.');
    } finally {
      setIsSendingBroadcast(false);
    }

    setNoteTitle('');
    setNoteDescription('');
    setImageUrl('');
    setVideoUrl('');
    setTargetSchoolId('all');
    setIsNoteModalOpen(false);
  };

  const columns = [
    {
      label: 'School Name & Admin',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500">{row.adminName} ({row.adminEmail})</div>
        </div>
      )
    },
    { label: 'City', accessor: 'city' },
    { label: 'Students', accessor: 'studentsCount' },
    { label: 'Teachers', accessor: 'teachersCount' },
    {
      label: 'Monthly Revenue',
      accessor: 'monthlyRevenue',
      render: (row) => <span className="font-extrabold text-emerald-700">${row.monthlyRevenue}/mo</span>
    },
    {
      label: 'Payment / Account Lock Status',
      accessor: 'status',
      render: (row) => {
        const isLocked = row.status.includes('Locked');
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isLocked
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {row.status}
            </span>
          </div>
        );
      }
    },
    {
      label: 'Super Admin Lock Action',
      sortable: false,
      render: (row) => {
        const isLocked = row.status.includes('Locked');
        return (
          <button
            onClick={() => toggleSchoolLockout(row.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs min-h-[44px] ${
              isLocked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Unlock Access' : 'Lock (Pending Payment)'}</span>
          </button>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin SaaS Control Panel</h1>
            <p className="text-xs text-slate-500 font-medium">Global platform oversight, broadcast directives, and account lockout management</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all min-h-[44px]"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Note / Directive</span>
            </button>

            <button
              onClick={() => setCurrentView('superadmin-admins')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create School Admin</span>
            </button>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Active Schools"
            value={totalActiveSchools}
            icon={School}
            trend="+12% this month"
            color="blue"
          />
          <StatCard
            title="Assigned School Admins"
            value={totalAdmins}
            icon={ShieldCheck}
            trend="Active SaaS Licenses"
            color="purple"
          />
          <StatCard
            title="Platform Monthly Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend="Recurring Subscriptions"
            color="emerald"
          />
          <StatCard
            title="Broadcast Directives"
            value={displayedBroadcasts.length}
            icon={Megaphone}
            trend="Active Notes Sent"
            color="amber"
          />
        </div>

        {/* Broadcast Directives Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-600" />
                Active Super Admin Broadcast Directives
              </h3>
              <p className="text-xs text-slate-500 font-medium">Notes and multimedia announcements published to School Admins</p>
            </div>
          <div className="flex items-center gap-3">
            {/* API Connection Status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
              isBroadcastLoading ? 'bg-amber-50 text-amber-700 border-amber-200' :
              isApiConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isBroadcastLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Syncing…</>
                : isApiConnected
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> MySQL Live</>
                  : <><WifiOff className="w-3 h-3" /> Local Mode</>
              }
            </div>
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Announcement</span>
            </button>
          </div>
          </div>

          {broadcastApiError && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{broadcastApiError}</span>
            </div>
          )}

          {(!displayedBroadcasts || displayedBroadcasts.length === 0) ? (
            isBroadcastLoading
              ? <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
              : <p className="text-xs text-slate-400 italic py-4 text-center">No active broadcast notes sent yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedBroadcasts.map(note => (
                <div key={note.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{note.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                        {note.targetSchoolName || 'All Schools'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{note.description}</p>

                    {/* Media Attachments Preview */}
                    {note.imageUrl && (
                      <img src={note.imageUrl} alt="Attached Media" className="mt-3 rounded-lg max-h-36 w-full object-cover border border-slate-200" />
                    )}

                    {note.videoUrl && (
                      <div className="mt-3">
                        <video src={note.videoUrl} controls className="rounded-lg max-h-36 w-full object-cover bg-black" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-200">
                    <span>Sent: {new Date(note.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => deleteBroadcastNote(note.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Note</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schools & Account Lock Engine Table */}
        <DataTable
          title="School Subscriptions & Account Lockout Engine"
          subtitle="Manage active licenses or lock specific school accounts due to pending payments."
          columns={columns}
          data={schools}
          searchPlaceholder="Search school name, admin, city..."
        />

        {/* Create Broadcast Note Modal */}
        <Modal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          title="Create & Broadcast Directive Note to School Admins"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Announcement Title</label>
              <input
                type="text"
                required
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="e.g. Q3 Compliance & Audit Deadline"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target School Recipient</label>
              <select
                value={targetSchoolId}
                onChange={e => setTargetSchoolId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold bg-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All School Administrators (Global Broadcast)</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.adminEmail})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Directive Description / Content</label>
              <textarea
                required
                rows={4}
                value={noteDescription}
                onChange={e => setNoteDescription(e.target.value)}
                placeholder="Detailed instructions or policy notes for school administrators..."
                className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  Image Attachment (File / Camera)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full p-2 text-[11px] rounded-xl border border-slate-300 bg-slate-50 cursor-pointer"
                />
                {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 h-20 rounded border object-cover" />}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <VideoIcon className="w-3.5 h-3.5 text-purple-600" />
                  Video Attachment URL / Link
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://... MP4 link or video URL"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingBroadcast}
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md flex items-center gap-1.5 min-h-[44px] disabled:opacity-60"
              >
                {isSendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Broadcast Note</span>
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
