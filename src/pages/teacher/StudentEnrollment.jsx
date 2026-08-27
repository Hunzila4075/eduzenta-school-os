import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { UserPlus, Save, CheckCircle2 } from 'lucide-react';

export default function StudentEnrollment() {
  const { currentUser, addStudent } = useApp();

  const assignedClasses = currentUser?.assignedClasses || ['Class 10-A', 'Class 9-B'];
  
  const [name, setName] = useState('');
  const [classSection, setClassSection] = useState(assignedClasses[0] || 'Class 10-A');
  const [guardianName, setGuardianName] = useState('');
  const [dob, setDob] = useState('2009-06-15');
  const [phone, setPhone] = useState('+1 (555) 000-1122');
  const [address, setAddress] = useState('Knowledge City');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !guardianName.trim()) return;

    addStudent({
      name,
      classSection,
      guardianName,
      dob,
      gender: 'Male',
      phone,
      address
    });

    setName('');
    setGuardianName('');
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quick Student Enrollment</h1>
            <p className="text-xs text-slate-500 font-medium">Add new students directly into your assigned classes.</p>
          </div>
        </div>

        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Class</label>
                <select
                  value={classSection}
                  onChange={e => setClassSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {assignedClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                <input
                  type="text"
                  required
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="e.g. Robert Lin"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enrol Student in Roster</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
