import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { handleLocalFileUpload } from '../../utils/fileUpload';
import { ShieldCheck, Plus, Edit3, Trash2, Globe, Image, Upload } from 'lucide-react';

export default function AdminManagement() {
  const {
    users,
    schools,
    addSchoolAdmin,
    updateSchoolAdmin,
    deleteSchoolAdmin
  } = useApp();

  const adminUsers = users.filter(u => u.role === 'admin');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Form Fields as per specs
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Knowledge City');

  const resetForm = () => {
    setSchoolName('');
    setSchoolLogoUrl('https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setCity('Knowledge City');
    setEditingUserId(null);
  };

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64Data = await handleLocalFileUpload(file);
        if (base64Data) {
          setSchoolLogoUrl(base64Data);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    addSchoolAdmin({
      schoolName,
      schoolLogoUrl,
      firstName,
      lastName,
      email,
      password: password || 'school123',
      phone,
      city
    });
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditOpen = (user) => {
    setEditingUserId(user.id);
    setFirstName(user.firstName || user.name.split(' ')[0]);
    setLastName(user.lastName || user.name.split(' ')[1] || '');
    setEmail(user.email);
    setSchoolName(user.schoolName);
    const sch = schools.find(s => s.id === user.schoolId);
    setSchoolLogoUrl(sch?.logoUrl || user.schoolLogoUrl || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateSchoolAdmin(editingUserId, {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      schoolName,
      schoolLogoUrl
    });
    setIsEditModalOpen(false);
    resetForm();
  };

  const columns = [
    {
      label: 'School Branding',
      accessor: 'schoolName',
      render: (row) => {
        const sch = schools.find(s => s.id === row.schoolId);
        const logo = sch?.logoUrl || row.schoolLogoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80";
        return (
          <div className="flex items-center gap-3">
            <img src={logo} alt={row.schoolName} className="w-9 h-9 rounded-lg object-cover border border-slate-300 p-0.5 bg-white shrink-0 shadow-xs" />
            <div>
              <div className="font-extrabold text-slate-900">{row.schoolName}</div>
              <div className="text-[10px] text-[#5A3193] font-bold uppercase tracking-wider">Dynamic Logo Bound</div>
            </div>
          </div>
        );
      }
    },
    {
      label: 'Admin Account & Email',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.email}</div>
        </div>
      )
    },
    {
      label: 'IP Session Logs',
      accessor: 'schoolId',
      render: (row) => {
        const sch = schools.find(s => s.id === row.schoolId);
        const logs = sch?.ipLogs || ['192.168.1.45 (Current Session)'];
        return (
          <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#5A3193] shrink-0" />
            <span>{logs[0]}</span>
          </div>
        );
      }
    },
    {
      label: 'Status',
      accessor: 'locked',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
          row.locked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {row.locked ? 'Locked' : 'Active'}
        </span>
      )
    },
    {
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditOpen(row)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteSchoolAdmin(row.id)}
            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">School Admin Onboarding & Branding</h1>
            <p className="text-xs text-slate-500 font-medium">Onboard new school accounts with local School Logo upload for dynamic document injection.</p>
          </div>

          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl qobe-btn-primary text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New School Admin</span>
          </button>
        </div>

        <DataTable
          title="Onboarded School Accounts"
          subtitle="School name, logo, admin credentials, and session logs"
          columns={columns}
          data={adminUsers}
          searchPlaceholder="Search school, admin, email..."
        />

        {/* Onboarding Modal with Direct Local File Picker */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Onboard New School Admin & Set Dynamic Branding"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-school-name" className="block text-xs font-bold text-slate-700 mb-1">School Name <span className="text-rose-600">*</span></label>
                <input
                  id="admin-school-name"
                  name="schoolName"
                  type="text"
                  required
                  autoComplete="organization"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g. ST. JUDE ACADEMY"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="admin-school-city" className="block text-xs font-bold text-slate-700 mb-1">City / Location</label>
                <input
                  id="admin-school-city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Knowledge City"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* DIRECT LOCAL FILE PICKER FOR SCHOOL LOGO */}
            <div>
              <label htmlFor="admin-school-logo" className="block text-xs font-bold text-slate-700 mb-1">
                Upload School Logo Image (Local File Picker Only) <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center gap-3 border border-slate-300 p-3 rounded-xl bg-slate-50">
                <img
                  src={schoolLogoUrl}
                  alt="School Logo Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-purple-400 p-0.5 bg-white shrink-0 shadow-xs"
                />
                <div className="flex-1">
                  <input
                    id="admin-school-logo"
                    name="schoolLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#5A3193] file:text-white hover:file:bg-[#4C2A7B] cursor-pointer"
                  />
                  <span className="text-[10px] text-purple-700 font-semibold mt-1 block">
                    ✓ Direct local file upload. Logo dynamically binds to Result Cards, Fee Chalans, and Admit Cards.
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-first-name" className="block text-xs font-bold text-slate-700 mb-1">Admin First Name <span className="text-rose-600">*</span></label>
                <input
                  id="admin-first-name"
                  name="adminFirstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Dr. Eleanor"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="admin-last-name" className="block text-xs font-bold text-slate-700 mb-1">Admin Last Name <span className="text-rose-600">*</span></label>
                <input
                  id="admin-last-name"
                  name="adminLastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Vance"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-bold text-slate-700 mb-1">Assigned Email <span className="text-rose-600">*</span></label>
                <input
                  id="admin-email"
                  name="adminEmail"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@stjude.edu"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="admin-phone" className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  id="admin-phone"
                  name="adminPhone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-1122"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
              <input
                id="admin-password"
                name="adminPassword"
                type="text"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Default: school123"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl qobe-btn-primary text-xs font-bold shadow-sm"
              >
                Onboard School &amp; Bind Logo
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Update School Branding & Admin"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="edit-school-name" className="block text-xs font-bold text-slate-700 mb-1">School Name</label>
              <input
                id="edit-school-name"
                name="schoolName"
                type="text"
                required
                autoComplete="organization"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label htmlFor="edit-school-logo" className="block text-xs font-bold text-slate-700 mb-1">Upload New School Logo (Local File)</label>
              <div className="flex items-center gap-3 border border-slate-300 p-2.5 rounded-xl bg-slate-50">
                <img
                  src={schoolLogoUrl}
                  alt="School Logo"
                  className="w-10 h-10 rounded-lg object-cover border border-purple-400 p-0.5 bg-white shrink-0"
                />
                <input
                  id="edit-school-logo"
                  name="schoolLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#5A3193] file:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-admin-first-name" className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                <input
                  id="edit-admin-first-name"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="edit-admin-last-name" className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  id="edit-admin-last-name"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-admin-email" className="block text-xs font-bold text-slate-700 mb-1">Assigned Email (Immutable)</label>
              <input
                id="edit-admin-email"
                name="email"
                type="text"
                disabled
                autoComplete="email"
                value={email}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl qobe-btn-primary text-xs font-bold"
              >
                Save Branding &amp; Info
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
