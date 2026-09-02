import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { fetchStudents as apiFetchStudents, addStudent as apiAddStudent } from '../../services/api';
import { Users, UserPlus, Edit3, Power, Search, Filter, Trash2, Loader2, AlertCircle, WifiOff } from 'lucide-react';

export default function StudentDatabase() {
  const {
    students: contextStudents,
    currentUser,
    schoolClasses,
    addStudent,
    updateStudent,
    deactivateStudent,
    deleteStudent,
    addToast
  } = useApp();


  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // API State
  const [apiStudents, setApiStudents] = useState(null); // null = not loaded yet
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);

  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [regNo, setRegNo] = useState('');
  const [classSection, setClassSection] = useState('');

  // Auto-select first class when schoolClasses loads asynchronously
  useEffect(() => {
    if (schoolClasses && schoolClasses.length > 0 && !classSection) {
      setClassSection(schoolClasses[0]);
    }
  }, [schoolClasses, classSection]);
  const [guardianName, setGuardianName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Merge API data with context data â€” API takes priority when available
  const students = apiStudents !== null ? apiStudents : contextStudents;

  // Load students from API on mount
  useEffect(() => {
    loadStudentsFromApi();
  }, []);

  const loadStudentsFromApi = async () => {
    setIsApiLoading(true);
    setApiError(null);
    try {
      const response = await apiFetchStudents();
      if (response?.success && Array.isArray(response.data)) {
        setApiStudents(response.data);
        setIsApiConnected(!response.isMock);
      }
    } catch (err) {
      setApiError('Backend API offline â€” using local data.');
      setIsApiConnected(false);
    } finally {
      setIsApiLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setRollNo('');
    setRegNo('');
    setClassSection('');
    setGuardianName('');
    setDob('');
    setGender('Male');
    setPhone('');
    setAddress('');
    setEditingStudentId(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const studentData = { name, classSection, guardianName, dob, gender, phone, address };

    try {
      // Save via API to MySQL database
      const response = await apiAddStudent({
        rollNo: rollNo.trim(),
        regNo: regNo.trim() || null,
        name,
        classSection,
        gender,
        phone,
        guardianName
      });
      if (response?.success && response.data) {
        // Optimistically prepend the DB-returned row â€” skips a full students refetch
        setApiStudents(prev => (prev === null ? [response.data] : [response.data, ...prev]));
        addToast('Student Enrolled', `${name} has been added to the database.`, 'success');
      } else {
        throw new Error(response?.error || 'Failed to enroll student.');
      }
    } catch (err) {
      console.error('[STUDENT ADD ERROR]:', err);
      addToast('Enrollment Failed', err.message || 'Failed to add student to database.', 'warning');
    } finally {
      setIsSaving(false);
    }

    setIsAddModalOpen(false);
    resetForm();
  };


  const handleEditOpen = (std) => {
    setEditingStudentId(std.id);
    setName(std.name);
    setRollNo(std.rollNo || '');
    setRegNo(std.regNo || '');
    setClassSection(std.classSection);
    setGuardianName(std.guardianName);
    setDob(std.dob);
    setGender(std.gender || 'Male');
    setPhone(std.phone);
    setAddress(std.address);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateStudent(editingStudentId, { name, rollNo: rollNo.trim(), regNo: regNo.trim() || null, classSection, guardianName, dob, gender, phone, address });
    // Optimistically update API list too
    if (apiStudents !== null) {
      setApiStudents(prev => prev.map(s =>
        s.id === editingStudentId ? { ...s, name, rollNo: rollNo.trim(), regNo: regNo.trim() || null, classSection, guardianName, gender, phone } : s
      ));
    }
    setIsEditModalOpen(false);
    resetForm();
  };

  const handleDelete = (student) => {
    if (window.confirm(`Are you sure you want to delete student "${student.name}" (${student.id})?`)) {
      deleteStudent(student.id);
      if (apiStudents !== null) {
        setApiStudents(prev => prev.filter(s => s.id !== student.id));
      }
    }
  };

  const columns = [
    {
      label: 'Student Name & ID',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">ID: {row.id} | Roll: {row.rollNo}</div>
        </div>
      )
    },
    { label: 'Class & Section', accessor: 'classSection' },
    { label: 'Guardian Name', accessor: 'guardianName' },
    { label: 'Contact Phone', accessor: 'phone font-mono' },
    {
      label: 'Attendance Ratio',
      accessor: 'attendanceDays',
      render: (row) => (
        <span className="font-bold text-slate-800">
          {row.attendanceDays ?? '--'} / {row.totalWorkingDays ?? '--'} Days
          {row.attendanceDays && row.totalWorkingDays
            ? ` (${((row.attendanceDays / row.totalWorkingDays) * 100).toFixed(1)}%)`
            : ''}
        </span>
      )
    },
    {
      label: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
          row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {row.status}
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
            title="Edit Student"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deactivateStudent(row.id)}
            title="Toggle Status (Active / Deactivate)"
            className={`p-1.5 rounded-lg border transition-colors ${
              row.status === 'Active' ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          {/* Admin Restricted Delete Action */}
          {isAdmin && (
            <button
              onClick={() => handleDelete(row)}
              title="Delete Student Record (Admin Exclusive)"
              aria-label={`Delete student ${row.name}`}
              className="p-1.5 rounded-lg border border-rose-200 bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Full Student Database</h1>
            <p className="text-xs text-slate-500 font-medium">Add, edit, filter, and deactivate student profiles across the entire school</p>
          </div>

          <div className="flex items-center gap-3">
            {/* API Connection Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
              isApiLoading ? 'bg-amber-50 text-amber-700 border-amber-200' :
              isApiConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isApiLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Syncingâ€¦</>
                : isApiConnected
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> MySQL Live</>
                  : <><WifiOff className="w-3 h-3" /> Local Mode</>
              }
            </div>

            <button
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enrol New Student</span>
            </button>
          </div>
        </div>

        {/* API Error Banner */}
        {apiError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
            <button onClick={loadStudentsFromApi} className="ml-auto text-amber-800 font-bold hover:underline">Retry</button>
          </div>
        )}

        <DataTable
          title="School Student Records"
          subtitle="Multi-field search by Student Name, ID, Roll Number, Guardian, or Class"
          columns={columns}
          data={students}
          filterKey="classSection"
          filterOptions={Array.isArray(schoolClasses) && schoolClasses.length > 0 ? schoolClasses : undefined}
          searchPlaceholder="Search Name, ID, Roll No, Guardian..."
        />

        {/* Add Student Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Enrol New Student Profile"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-student-name" className="block text-xs font-bold text-slate-700 mb-1">Student Full Name</label>
                <input
                  id="add-student-name"
                  name="studentName"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Student full name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="add-student-class" className="block text-xs font-bold text-slate-700 mb-1">Class & Section</label>
                <select
                  id="add-student-class"
                  name="classSection"
                  value={classSection}
                  onChange={e => setClassSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="" disabled hidden>{(schoolClasses || []).length === 0 ? 'Loading classes...' : '-- Select Class --'}</option>
                  {(schoolClasses || []).map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-student-roll" className="block text-xs font-bold text-slate-700 mb-1">Roll Number *</label>
                <input
                  id="add-student-roll"
                  name="rollNo"
                  type="text"
                  required
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label htmlFor="add-student-reg" className="block text-xs font-bold text-slate-700 mb-1">Registration No (optional)</label>
                <input
                  id="add-student-reg"
                  name="regNo"
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="e.g. REG-2026-012"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-student-guardian" className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                <input
                  id="add-student-guardian"
                  name="guardianName"
                  type="text"
                  required
                  autoComplete="name"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="Guardian full name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="add-student-dob" className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  id="add-student-dob"
                  name="dob"
                  type="date"
                  autoComplete="bday"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-student-gender" className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  id="add-student-gender"
                  name="gender"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-student-phone" className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  id="add-student-phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-student-address" className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
              <input
                id="add-student-address"
                name="address"
                type="text"
                autoComplete="street-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter address"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                disabled={isSaving || !classSection}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save & Enrol Student
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Student Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Update Student Profile"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-student-name" className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                <input
                  id="edit-student-name"
                  name="studentName"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-student-class" className="block text-xs font-bold text-slate-700 mb-1">Class & Section</label>
                <select
                  id="edit-student-class"
                  name="classSection"
                  value={classSection}
                  onChange={e => setClassSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                >
                  {(schoolClasses || []).map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-student-roll" className="block text-xs font-bold text-slate-700 mb-1">Roll Number</label>
                <input
                  id="edit-student-roll"
                  name="rollNo"
                  type="text"
                  required
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label htmlFor="edit-student-reg" className="block text-xs font-bold text-slate-700 mb-1">Registration No</label>
                <input
                  id="edit-student-reg"
                  name="regNo"
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-student-guardian" className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                <input
                  id="edit-student-guardian"
                  name="guardianName"
                  type="text"
                  required
                  autoComplete="name"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-student-phone" className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  id="edit-student-phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
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
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Update Profile
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
