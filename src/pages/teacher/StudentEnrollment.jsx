import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { UserPlus, Save, CheckCircle2 } from 'lucide-react';

export default function StudentEnrollment() {
  const { currentUser, addStudent, myClasses } = useApp();
  // rollNo is REQUIRED by the backend — collected explicitly below.

  const assignedClasses = Array.isArray(myClasses) && myClasses.length ? myClasses : [];
  
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [regNo, setRegNo] = useState('');
  const [classSection, setClassSection] = useState(assignedClasses[0] || '');
  const [guardianName, setGuardianName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [isEnrolling, setIsEnrolling] = useState(false);

  // myClasses hydrates asynchronously after mount — always resolve a class
  // that is truly inside the teacher's current assignment scope, never a
  // stale or blank value.
  const effectiveClass = assignedClasses.includes(classSection) ? classSection : (assignedClasses[0] || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !guardianName.trim() || !rollNo.trim() || !effectiveClass) return;

    setIsEnrolling(true);
    const result = await addStudent({
      name,
      rollNo: rollNo.trim(),
      regNo: regNo.trim() || null,
      classSection: effectiveClass,
      guardianName,
      dob,
      gender: 'Male',
      phone,
      address
    });
    setIsEnrolling(false);

    // Only clear the form when the student actually persisted in the DB.
    if (result?.success) {
      setName('');
      setRollNo('');
      setRegNo('');
      setGuardianName('');
      setDob('');
      setPhone('');
      setAddress('');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quick Student Enrollment</h1>
            <p className="text-xs text-slate-500 font-medium">Add new students directly into your assigned classes.</p>
          </div>
        </div>

        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {assignedClasses.length === 0 ? (
                  <div className="px-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold">
                    No classes assigned yet - contact your administrator.
                  </div>
                ) : (
                  <select
                    value={effectiveClass}
                    onChange={e => setClassSection(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {assignedClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registration No (optional)</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="e.g. REG-2026-012"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              disabled={isEnrolling || assignedClasses.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isEnrolling ? 'Enrolling Student...' : 'Enrol Student in Roster'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
