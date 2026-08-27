import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from './Modal';

export default function CreateActivityModal({ isOpen, onClose }) {
  const { createActivity, currentUser } = useApp();
  const assignedSubjects = currentUser?.assignedSubjects || [];
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [term, setTerm] = useState('1st Term');
  const [classSection, setClassSection] = useState(
    currentUser?.assignedClasses?.[0] || ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !subject || !classSection) return;
    createActivity({ name, subject, maxMarks, term, classSection });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Activity" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Activity Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white"
            required
          >
            <option value="">Select Subject</option>
            {(assignedSubjects || []).map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Max Marks</label>
          <input
            type="number"
            min={1}
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value))}
            className="w-full py-2 px-3 rounded-xl border border-slate-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Term</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="1st Term">1st Term</option>
            <option value="2nd Term">2nd Term</option>
            <option value="3rd Term">3rd Term</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Class Section</label>
          <input
            type="text"
            value={classSection}
            onChange={(e) => setClassSection(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition min-h-[44px]"
        >
          Create Activity
        </button>
      </form>
    </Modal>
  );
}
