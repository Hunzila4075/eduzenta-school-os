import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Plus, Edit3, Trash2 } from 'lucide-react';

export default function TeacherManagement() {
  const {
    users,
    addTeacher,
    updateTeacher,
    deleteTeacher
  } = useApp();

  const teachers = users.filter(u => String(u.role || '').toLowerCase() === 'teacher');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Assigned Classes is a free-text field: the admin types any class names,
  // comma separated. Parsed to an array only at submit time.
  const [assignedClasses, setAssignedClasses] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState('');

  const parseClassList = (text) =>
    String(text || '').split(',').map(s => s.trim()).filter(Boolean);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setAssignedClasses('');
    setAssignedSubjects('');
    setEditingTeacherId(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const result = await addTeacher({
      name,
      email,
      password: password || 'teacher123',
      assignedClasses: parseClassList(assignedClasses),
      assignedSubjects: assignedSubjects.split(',').map(s => s.trim()).filter(Boolean)
    });
    if (result?.success !== false) {
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleEditOpen = (teacher) => {
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setEmail(teacher.email);
    // Pre-fill exactly the classes persisted in teacher_class_assignments
    setAssignedClasses(Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses.filter(Boolean).join(', ') : '');
    setAssignedSubjects(teacher.assignedSubjects ? teacher.assignedSubjects.join(', ') : '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    // Removal works: sending the new (possibly smaller) set REPLACES assignments
    updateTeacher(editingTeacherId, {
      name,
      email,
      assignedClasses: parseClassList(assignedClasses),
      assignedSubjects: assignedSubjects.split(',').map(s => s.trim()).filter(Boolean)
    });
    setIsEditModalOpen(false);
    resetForm();
  };

  const columns = [
    {
      label: 'Teacher Name & Email',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-full object-cover border border-slate-300" />
          <div>
            <div className="font-extrabold text-slate-900">{row.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      label: 'Assigned Classes',
      accessor: 'assignedClasses',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.assignedClasses || []).length === 0 ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
              No classes assigned
            </span>
          ) : (
            row.assignedClasses.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                {c}
              </span>
            ))
          )}
        </div>
      )
    },
    {
      label: 'Assigned Subjects',
      accessor: 'assignedSubjects',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.assignedSubjects || []).length === 0 ? (
            <span className="text-[10px] text-slate-400">—</span>
          ) : (
            row.assignedSubjects.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                {s}
              </span>
            ))
          )}
        </div>
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
            onClick={() => deleteTeacher(row.id)}
            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3 py-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty & Teacher Management</h1>
            <p className="text-xs text-slate-500 font-medium">Assign emails, temporary passwords, classes, and subject responsibilities</p>
          </div>

          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Faculty Member</span>
          </button>
        </div>

        <DataTable
          title="Active School Teachers & Faculty"
          subtitle="Full CRUD operations and assigned subject mapping"
          columns={columns}
          data={teachers}
          searchPlaceholder="Search teacher name, email, class, subject..."
        />

        {/* Add Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Create New Teacher Account"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="teacher-name" className="block text-xs font-bold text-slate-700 mb-1">Teacher Full Name</label>
              <input
                id="teacher-name"
                name="teacherName"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Ms. Ayesha Khan"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="teacher-email" className="block text-xs font-bold text-slate-700 mb-1">Assigned Email</label>
              <input
                id="teacher-email"
                name="teacherEmail"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. teacher@excellence.edu"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="teacher-password" className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
              <input
                id="teacher-password"
                name="teacherPassword"
                type="text"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Default: teacher123"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label htmlFor="teacher-classes" className="block text-xs font-bold text-slate-700 mb-1">Assigned Classes</label>
              <p className="text-[11px] text-slate-500 mb-1">Enter class names (comma separated)</p>
              <input
                id="teacher-classes"
                name="assignedClasses"
                type="text"
                autoComplete="off"
                value={assignedClasses}
                onChange={e => setAssignedClasses(e.target.value)}
                placeholder="e.g. Class 8-C, Class 9-A, Class 10-B"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">You can assign any class manually. Separate multiple classes with commas.</p>
            </div>
            <div>
              <label htmlFor="teacher-subjects" className="block text-xs font-bold text-slate-700 mb-1">Assigned Subjects (Comma separated)</label>
              <input
                id="teacher-subjects"
                name="assignedSubjects"
                type="text"
                autoComplete="off"
                value={assignedSubjects}
                onChange={e => setAssignedSubjects(e.target.value)}
                placeholder="Subjects this teacher teaches (comma separated)"
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
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Create Faculty Account
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Update Faculty Details"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="edit-teacher-name" className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                id="edit-teacher-name"
                name="teacherName"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-teacher-email" className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                id="edit-teacher-email"
                name="teacherEmail"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-teacher-classes" className="block text-xs font-bold text-slate-700 mb-1">Assigned Classes</label>
              <p className="text-[11px] text-slate-500 mb-1">Enter class names (comma separated)</p>
              <input
                id="edit-teacher-classes"
                name="assignedClasses"
                type="text"
                autoComplete="off"
                value={assignedClasses}
                onChange={e => setAssignedClasses(e.target.value)}
                placeholder="e.g. Class 8-C, Class 9-A, Class 10-B"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">You can assign any class manually. Separate multiple classes with commas. Remove a class by deleting it from the list.</p>
            </div>
            <div>
              <label htmlFor="edit-teacher-subjects" className="block text-xs font-bold text-slate-700 mb-1">Assigned Subjects</label>
              <input
                id="edit-teacher-subjects"
                name="assignedSubjects"
                type="text"
                autoComplete="off"
                value={assignedSubjects}
                onChange={e => setAssignedSubjects(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
