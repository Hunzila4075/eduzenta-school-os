import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportActivityToExcel } from '../../utils/excelExport';
import Modal from './Modal';
import { Edit3, Trash2, Save, Download } from 'lucide-react';

export default function ActivityOutcomeModal({ isOpen, onClose, activityId }) {
  const { activities, students, marks, updateStudentMarksForActivity, updateActivity, deleteActivity } = useApp();
  const activity = activities.find((a) => a.id === activityId);

  const [studentMarks, setStudentMarks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editMeta, setEditMeta] = useState({ name: '', subject: '', maxMarks: 100 });

  useEffect(() => {
    if (!activity) return;
    setEditMeta({ name: activity.name || '', subject: activity.subject || '', maxMarks: activity.maxMarks || 100 });
    // Build list of students in the activity's classSection
    const classStudents = students.filter(
      (s) => s.classSection === activity.classSection
    );
    const activeClassStudents = classStudents.length > 0 ? classStudents : students;

    const marksArray = activeClassStudents.map((student) => {
      const existing = marks.find(
        (m) => m.studentId === student.id && m.term === activity.term
      );
      const subjectEntry = existing?.subjects?.find(
        (sub) => sub.name === activity.subject
      );
      return {
        studentId: student.id,
        studentName: student.name,
        obtainedMarks: subjectEntry?.obtainedMarks ?? 0,
        remarks: subjectEntry?.remarks ?? ''
      };
    });
    setStudentMarks(marksArray);
  }, [activity, students, marks]);

  const handleChange = (index, field, value) => {
    setStudentMarks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveMarks = () => {
    const marksArray = studentMarks.map((s) => ({
      studentId: s.studentId,
      obtainedMarks: Number(s.obtainedMarks),
      remarks: s.remarks
    }));
    updateStudentMarksForActivity(activityId, marksArray);
    onClose();
  };

  const handleUpdateActivityMeta = (e) => {
    e.preventDefault();
    updateActivity(activityId, {
      name: editMeta.name,
      subject: editMeta.subject,
      maxMarks: Number(editMeta.maxMarks)
    });
    setIsEditing(false);
  };

  const handleDeleteActivity = () => {
    if (window.confirm(`Are you sure you want to delete activity "${activity.name}"?`)) {
      deleteActivity(activityId);
      onClose();
    }
  };

  if (!activity) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Activity: ${activity.name}`} size="lg">
      <div className="space-y-4">
        {/* Metadata Header & Inline Edit */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          {isEditing ? (
            <form onSubmit={handleUpdateActivityMeta} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Activity Name</label>
                  <input
                    type="text"
                    value={editMeta.name}
                    onChange={(e) => setEditMeta(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editMeta.subject}
                    onChange={(e) => setEditMeta(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Max Marks</label>
                  <input
                    type="number"
                    value={editMeta.maxMarks}
                    onChange={(e) => setEditMeta(prev => ({ ...prev, maxMarks: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  Save Metadata
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-slate-900 text-sm">{activity.name}</span>
                <div className="text-slate-500 font-medium mt-0.5">
                  Subject: <strong className="text-slate-800">{activity.subject}</strong> | Class: <strong className="text-slate-800">{activity.classSection}</strong> | Term: <strong className="text-slate-800">{activity.term}</strong> | Max Marks: <strong className="text-slate-800">{activity.maxMarks}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Activity</span>
                </button>
                <button
                  onClick={handleDeleteActivity}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 font-bold hover:bg-rose-100 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Activity</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Marks Table */}
        <div className="overflow-x-auto max-h-[50vh] rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="p-3 border border-slate-800">Student Name</th>
                <th className="p-3 border border-slate-800 text-center w-36">Obtained Marks</th>
                <th className="p-3 border border-slate-800 w-48">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {studentMarks.map((s, idx) => (
                <tr key={s.studentId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-3 font-extrabold text-slate-900 border border-slate-200">{s.studentName}</td>
                  <td className="p-2 border border-slate-200 text-center">
                    <input
                      type="number"
                      min={0}
                      max={activity.maxMarks}
                      value={s.obtainedMarks}
                      onChange={(e) => handleChange(idx, 'obtainedMarks', e.target.value)}
                      className="w-full text-center py-1 rounded border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </td>
                  <td className="p-2 border border-slate-200">
                    <input
                      type="text"
                      value={s.remarks}
                      onChange={(e) => handleChange(idx, 'remarks', e.target.value)}
                      className="w-full py-1 px-2 rounded border border-slate-300 text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveMarks}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition shadow-sm flex items-center gap-1.5 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Marks</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportActivityToExcel(activityId, activities, students, marks);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
